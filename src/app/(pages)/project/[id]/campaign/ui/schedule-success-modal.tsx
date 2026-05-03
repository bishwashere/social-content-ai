"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PLATFORM_LABELS, PLATFORM_ICONS, type PlatformId } from "@/constants/platforms";
import Image from "next/image";
import { CheckCircle2, Calendar, BarChart2, Coins } from "lucide-react";
import Link from "next/link";

export type ScheduleSuccessData = {
  campaignName: string;
  campaignId: string;
  projectId: string;
  platforms: string[];
  startDate: Date | string;
  autoPostTime: string; // "HH:mm"
  timezone: string;
  scheduledCount: number;
  totalDays: number;
  isBlogNews?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  data: ScheduleSuccessData;
};

function formatTime(time: string, timezone: string): string {
  const [h, m] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
}

function formatStartDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getTzAbbr(timezone: string): string {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZoneName: "short", timeZone: timezone })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? timezone
    );
  } catch {
    return timezone;
  }
}

export function ScheduleSuccessModal({ open, onClose, data }: Props) {
  const {
    campaignName,
    projectId,
    platforms,
    startDate,
    autoPostTime,
    timezone,
    scheduledCount,
    totalDays,
    isBlogNews,
  } = data;

  const creditsPerDay = platforms.length;
  const formattedTime = formatTime(autoPostTime, timezone);
  const tzAbbr = getTzAbbr(timezone);
  const formattedDate = formatStartDate(startDate);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Green header band */}
        <div className="bg-green-500 px-6 py-8 text-center text-white">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-white/90" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold">Campaign Scheduled!</h2>
          <p className="mt-1 text-sm text-white/80">
            {isBlogNews
              ? "Your Blog News tasks are queued and ready to run."
              : `${scheduledCount} post${scheduledCount !== 1 ? "s" : ""} locked in and ready to go.`}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Campaign name */}
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Campaign</p>
            <p className="mt-0.5 font-semibold text-base truncate">{campaignName}</p>
          </div>

          <div className="h-px bg-border" />

          {/* Schedule row */}
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Starting {formattedDate}</p>
              <p className="text-sm text-muted-foreground">
                Posting daily at {formattedTime} {tzAbbr} · {totalDays} day{totalDays !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Platforms row */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 shrink-0">
              {platforms.map((p) => {
                const icon = PLATFORM_ICONS[p as PlatformId];
                const label = PLATFORM_LABELS[p as PlatformId] ?? p;
                if (!icon) return null;
                return (
                  <Image
                    key={p}
                    src={icon}
                    alt={label}
                    width={18}
                    height={18}
                    title={label}
                    className="rounded-sm"
                  />
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              {platforms
                .map((p) => PLATFORM_LABELS[p as PlatformId] ?? p)
                .join(", ")}
            </p>
          </div>

          {/* Credits / day */}
          <div className="flex items-center gap-3">
            <Coins className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{creditsPerDay} credit{creditsPerDay !== 1 ? "s" : ""}/day</span>
              {" "}· {creditsPerDay} platform{creditsPerDay !== 1 ? "s" : ""} × 1 post each
            </p>
          </div>

          {/* Analytics link */}
          <div className="flex items-center gap-3">
            <BarChart2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Analytics will appear in{" "}
              <Link
                href={`/project/${projectId}?tab=analytics`}
                className="text-primary underline underline-offset-2 hover:opacity-80"
                onClick={onClose}
              >
                your analytics tab
              </Link>{" "}
              after posts go live.
            </p>
          </div>

          <div className="h-px bg-border" />

          <Button className="w-full" onClick={onClose}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
