// /dashboard/PlatformCard.tsx
"use client";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useGetTrackedProjects, useTrackProject } from "@/backend-apis/projects/hooks";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PlatformCardProps {
  projectId: string;
  isEditing: boolean;
  platform: string;
}

export function PlatformCard({
  isEditing, projectId,
  platform
}: PlatformCardProps) {
  const getDateColor = (dateString: string) => {
    const date = new Date(dateString);
    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays <= 7) return "bg-green-200 text-green-800";
    if (diffDays <= 30) return "bg-yellow-200 text-yellow-800";
    return "bg-red-200 text-red-800";
  };

  const getPostingFrequency = (dates: { date: string; url?: string }[] = []) => {
    return dates?.filter((entry) => (Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60 * 24) <= 30).length || 0;
  };

  const getTrendIcon = (frequency: number) => {
    return frequency > 4 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const activity = useGetTrackedProjects({ projectId: projectId });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalenderOpen, setIsCalenderOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const trackProject = useTrackProject()

  if (activity.isLoading) return null;



  return (
    <div className="p-3 border rounded-lg shadow-sm bg-white">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold capitalize">{platform}</h3>
        {getTrendIcon(getPostingFrequency((activity.data?.
          filter((entry) => entry.platform === platform)?.
          map((entry) => ({
            date: entry.date,
            url: entry.url
          })) || [])
        )
        )
        }
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {
          activity.data?.
            filter((entry) => entry.platform === platform)
            ?.map((entry, index) => (
              entry.url ? <a
                key={`${entry.date}-${index}`}
                href={entry.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-2 py-1 rounded-full text-xs ${getDateColor(entry.date)} hover:underline`}
              >
                {new Date(entry.date).toDateString()}
              </a> : <button
                key={`${entry.date}-${index}`}
                rel="noopener noreferrer"
                className={`px-2 py-1 rounded-full text-xs ${getDateColor(entry.date)} hover:underline`}
              >
                {new Date(entry.date).toDateString()}
              </button>
            ))}
      </div>

      {isEditing && (
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <DatePicker
              selected={selectedDate}
              onChange={(date) =>
                setSelectedDate(date)
              }
              open={isCalenderOpen}
              onFocus={() =>
                setIsCalenderOpen(true)
              }
              onClickOutside={() =>
                setIsCalenderOpen(false)
              }
              showPopperArrow={true}
              className="border rounded px-2 py-1 text-xs w-24"
              dateFormat="MM/dd/yyyy"
            />
            <Button
              size={"sm"}
              disabled={trackProject.isPending}
              onClick={async () => {
                if (selectedDate) {
                  try {
                    await trackProject.mutateAsync({ projectId, platform, date: selectedDate.toISOString(), url: inputValue })
                    setSelectedDate(null)
                    setInputValue("")
                  } catch { }
                }
              }}
              className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition h-fit"
            >
              Save
            </Button>
          </div>
          <Input
            type="url"
            value={inputValue}
            onChange={(e) =>
              setInputValue(e.target.value)
            }
            placeholder="Enter URL (optional)"
            className="border rounded px-2 py-1 text-xs w-full"
          />
        </div>
      )}
    </div>
  );
}