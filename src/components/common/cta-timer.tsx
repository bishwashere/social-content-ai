"use client";

import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

const TIMER_STORAGE_KEY = "nextpostai_cta_timer_start";
const TIMER_DURATION_MS = 20 * 60 * 1000; // 20 minutes

/** Returns how many ms are left, looping every 20 minutes. */
function getTimeRemaining(): number {
  if (typeof window === "undefined") return TIMER_DURATION_MS;
  const stored = sessionStorage.getItem(TIMER_STORAGE_KEY);
  if (!stored) {
    const now = Date.now();
    sessionStorage.setItem(TIMER_STORAGE_KEY, now.toString());
    return TIMER_DURATION_MS;
  }

  const startTime = parseInt(stored, 10);
  const elapsed = Date.now() - startTime;

  // If timer expired, reset start time for a fresh 20-min cycle
  if (elapsed >= TIMER_DURATION_MS) {
    const now = Date.now();
    sessionStorage.setItem(TIMER_STORAGE_KEY, now.toString());
    return TIMER_DURATION_MS;
  }

  return TIMER_DURATION_MS - elapsed;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

interface CtaTimerProps {
  onClick?: () => void;
}

export function CtaTimer({ onClick }: CtaTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const tick = () => {
      setTimeLeft(getTimeRemaining());
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (timeLeft === null) return null;

  const urgent = timeLeft < 5 * 60 * 1000; // under 5 min

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-mono border whitespace-nowrap cursor-pointer transition-all hover:scale-105 ${
        urgent
          ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
          : "bg-white/5 border-white/15 text-gray-300 hover:bg-white/10 hover:border-white/25"
      }`}
    >
      <Clock className={`w-3 h-3 ${urgent ? "text-red-400" : "text-purple-400"}`} />
      <span>{formatTime(timeLeft)}</span>
    </button>
  );
}
