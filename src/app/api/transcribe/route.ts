import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/transcribe
 * Transcribes audio using OpenAI Whisper API
 */
export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return sendNextResponse({
        status: 500,
        message: "OpenAI API key not configured",
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return sendNextResponse({
        status: 400,
        message: "No audio file provided",
      });
    }

    // Forward the audio file to OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile, "recording.webm");
    whisperFormData.append("model", "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: whisperFormData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Whisper API error:", errorData);
      return sendNextResponse({
        status: 500,
        message: "Failed to transcribe audio",
        error: errorData,
      });
    }

    const transcription = await response.json();

    return sendNextResponse({
      status: 200,
      message: "Transcription successful",
      data: { text: transcription.text },
    });
  })
);
