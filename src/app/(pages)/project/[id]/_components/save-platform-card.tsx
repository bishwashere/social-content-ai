import { useTrackProject } from "@/backend-apis/projects/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "sonner";

type Props = {
  platform: "facebook" | "x" | "linkedin" | "threads" | "reddit";
  projectId: string;
  timelineDay: number;
};

export const SavePlatformCard = ({ platform, projectId }: Props) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isCalenderOpen, setIsCalenderOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const trackProject = useTrackProject();
  const popoverRef = useRef<HTMLDivElement>(null);

  // 🔐 Detect outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
        setIsCalenderOpen(false);
      }
    };

    if (isPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPopoverOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      <Button variant="ghost" size="icon" onClick={() => setIsPopoverOpen(!isPopoverOpen)}>
        <Calendar />
      </Button>

      {isPopoverOpen && (
        <div className="absolute top-full -left-16 mt-2 w-48 p-4 rounded border bg-white shadow z-[9999999]">
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <DatePicker
                selected={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  setIsCalenderOpen(false);
                }}

                open={isCalenderOpen}
                onFocus={() => setIsCalenderOpen(true)}
                onClickOutside={() => setIsCalenderOpen(false)}
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
                      const res = await trackProject.mutateAsync({
                        projectId,
                        platform,
                        date: selectedDate.toISOString(),
                        url: inputValue,
                      });
                      setSelectedDate(null);
                      setInputValue("");
                      setIsPopoverOpen(false); // Close after save
                      if (res) {
                        toast.success("Saved!")
                      }
                    } catch {
                      // handle error
                    }
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
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter URL "
              className="border rounded px-2 py-1 text-xs w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
