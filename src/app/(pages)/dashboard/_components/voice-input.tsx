"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import Cookie from "js-cookie";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";

interface AudioBar {
  id: number;
  amplitude: number;
  x: number;
}

interface VoiceInputProps {
  onSubmit?: (text: string) => void;
  className?: string;
}

export function VoiceInput({ onSubmit, className }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [audioBars, setAudioBars] = useState<AudioBar[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const waveformBufferRef = useRef<AudioBar[]>([]);
  const lastBarTimeRef = useRef<number>(0);
  const nextBarIdRef = useRef<number>(0);
  const containerWidthRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const transcribeAudio = useCallback(
    async (audioBlob: Blob): Promise<string> => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.data?.text || data.text || "";
      } else if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "Rate limit exceeded for transcriptions"
        );
      }
      return "";
    },
    []
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Set up audio analysis for time-domain waveform visualization
      const audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start animation loop for time-domain waveform
      const bufferLength = analyser.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      isRecordingRef.current = true;
      waveformBufferRef.current = [];
      nextBarIdRef.current = 0;
      lastBarTimeRef.current = Date.now();
      setAudioBars([]);

      // Fixed configuration
      const scrollSpeedPixelsPerSecond = 96;
      const barsPerSecond = 15;
      const barInterval = 1000 / barsPerSecond;
      const barWidth = 3;
      let lastFrameTime = performance.now();

      const getContainerWidth = () => {
        return containerWidthRef.current || 600;
      };

      function updateWaveform() {
        if (!analyserRef.current || !isRecordingRef.current) {
          return;
        }

        const currentTime = performance.now();
        const deltaTime = (currentTime - lastFrameTime) / 1000;
        lastFrameTime = currentTime;

        const scrollDelta = scrollSpeedPixelsPerSecond * deltaTime;

        analyserRef.current.getByteTimeDomainData(dataArray);

        // Calculate current audio amplitude using RMS
        const startSample = Math.floor(bufferLength * 0.3);
        const endSample = Math.floor(bufferLength * 0.7);
        let sumSquares = 0;
        let count = 0;

        for (let i = startSample; i < endSample; i += 5) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
          count++;
        }

        const rms = Math.sqrt(sumSquares / count);
        let amplitude = rms;

        // Noise gate: Filter out constant hum and low-level noise
        const noiseGateThreshold = 0.04;
        const voiceThreshold = 0.03;

        if (amplitude < noiseGateThreshold) {
          amplitude = 0;
        } else if (amplitude >= voiceThreshold) {
          amplitude = amplitude * 0.6;
        } else {
          amplitude = (amplitude - noiseGateThreshold) * 0.5;
        }

        const normalizedAmplitude = Math.abs(amplitude);

        const now = Date.now();
        const containerWidth = getContainerWidth();

        // Move all existing bars left
        waveformBufferRef.current = waveformBufferRef.current.map((bar) => ({
          ...bar,
          x: bar.x - scrollDelta,
        }));

        // Remove bars that have exited
        waveformBufferRef.current = waveformBufferRef.current.filter(
          (bar) => bar.x > -barWidth
        );

        // Add new bar at right edge
        if (now - lastBarTimeRef.current >= barInterval) {
          const newBar: AudioBar = {
            id: nextBarIdRef.current++,
            amplitude: normalizedAmplitude,
            x: containerWidth,
          };
          waveformBufferRef.current.push(newBar);
          lastBarTimeRef.current = now;
        }

        setAudioBars([...waveformBufferRef.current]);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      }

      updateWaveform();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio analysis
        isRecordingRef.current = false;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
          await audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        setAudioBars([]);
        waveformBufferRef.current = [];
        nextBarIdRef.current = 0;

        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(audioBlob);
          setInputText(text);
        } catch (error) {
          console.error("Transcription error:", error);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setInputText("");
      isRecordingRef.current = true;
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      setAudioBars([]);
      waveformBufferRef.current = [];
      nextBarIdRef.current = 0;
    }
  }, [isRecording]);

  const handleSubmit = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    onSubmit?.(text);
    setInputText("");
  }, [inputText, onSubmit]);

  return (
    <div className={cn("w-full", className)}>
      {/* Voice Input Area */}
      <form
        className="relative flex items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {/* Mic Button */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
          className={cn(
            "relative flex-shrink-0 p-3 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isRecording
              ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 dark:shadow-violet-500/30"
              : "bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 shadow-md hover:shadow-lg",
            isTranscribing && "opacity-50 cursor-not-allowed"
          )}
          title={isRecording ? "Stop recording" : "Start voice input"}
        >
          {isTranscribing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isRecording ? (
            <Square className="w-5 h-5 fill-current" />
          ) : (
            <Mic className="w-5 h-5" />
          )}

          {/* Subtle ring when recording */}
          {isRecording && (
            <span className="absolute -inset-1 rounded-full bg-violet-500/20 dark:bg-violet-400/20" />
          )}
        </button>

        {/* Input / Waveform Area */}
        <div
          className={cn(
            "relative flex-1 h-14 rounded-xl border overflow-hidden transition-all duration-300",
            isRecording
              ? "border-violet-500/50 bg-violet-500/5 dark:border-violet-400/50 dark:bg-violet-500/10"
              : "border-border bg-card/50 focus-within:border-violet-500/50 dark:focus-within:border-violet-400/50"
          )}
          ref={(el) => {
            if (el) {
              containerWidthRef.current = el.offsetWidth - 32;
            }
          }}
        >
          {/* Waveform Visualization - shown when recording */}
          {isRecording && (
            <div className="absolute inset-0 px-4 flex items-center">
              <div
                className="w-full h-full relative overflow-hidden"
                style={{ width: "100%" }}
              >
                {audioBars.map((bar) => {
                  const barHeight = Math.max(bar.amplitude * 324, 2);
                  const halfHeight = barHeight / 2;

                  return (
                    <div
                      key={bar.id}
                      className="absolute rounded-full bg-violet-500 dark:bg-violet-400"
                      style={{
                        height: `${barHeight}px`,
                        width: "3px",
                        minWidth: "3px",
                        maxWidth: "3px",
                        left: `${bar.x}px`,
                        top: `calc(50% - ${halfHeight}px)`,
                        minHeight: "2px",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Listening overlay text */}
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400 opacity-60">
                Listening...
              </span>
            </div>
          )}

          {/* Transcribing overlay */}
          {isTranscribing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transcribing...</span>
              </div>
            </div>
          )}

          {/* Text Input - shown when not recording and not transcribing */}
          {!isRecording && !isTranscribing && (
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="What would you like to do today?"
              className="w-full h-full px-4 pr-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          )}
        </div>

        {/* Send Button - shown when there's text and not recording */}
        {!isRecording && !isTranscribing && inputText.trim() && (
          <button
            type="submit"
            className="flex-shrink-0 p-3 rounded-full bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </form>
    </div>
  );
}
