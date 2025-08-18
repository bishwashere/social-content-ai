"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  ToolbarProps,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGetAllProjects, useGetProjectsSummary } from "@/backend-apis/projects/hooks";
import { enUS } from 'date-fns/locale/en-US'
import { PLATFORMS } from "../../[id]/_components/campaing-planner";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

type MyEvent = { title: string; start: Date; end: Date, platforms?: string[] }

function EventInfo({ event }: { event: MyEvent }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) {
    // Mobile: Popover (click to open)
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="text-white text-xs rounded cursor-pointer truncate flex gap-2 items-center">
            {event.title.length > 4 ? event.title.slice(0, 4) + ".." : event.title}
            <div className="flex gap-1">
              {event.platforms?.map((p: string) => (
                <div className="bg-white p-0.5 rounded-sm" key={p}>
                  {PLATFORMS.find(platform => platform.key === p)?.icon}
                </div>
              ))}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-fit">
          <p className="text-sm font-medium">{event.title}</p>
          <p className="text-sm">({event.platforms?.join(', ')})</p>
          {/* <p className="text-xs">{event.start.toDateString()}</p> */}
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop: Tooltip (hover)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="text-white text-xs p-1 rounded cursor-pointer truncate flex gap-2 items-center">
          {event.title.length > 4 ? event.title.slice(0, 4) + ".." : event.title}
          <div className="flex gap-1">
            {event.platforms?.map((p: string) => (
              <div className="bg-white p-0.5 rounded-sm" key={p}>
                {PLATFORMS.find(platform => platform.key === p)?.icon}
              </div>
            ))}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm font-medium">{event.title}</p>
        <p className="text-sm">({event.platforms?.join(", ")})</p>
        {/* <p className="text-xs">{event.start.toDateString()}</p> */}
      </TooltipContent>
    </Tooltip>
  );
}


// Custom Toolbar
function CustomToolbar({ label, onNavigate, date }: ToolbarProps<MyEvent>) {
  const formattedLabel = format(date, "MMMM yyyy");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 bg-white shadow-md rounded-md mb-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onNavigate("TODAY")}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
        >
          Today
        </button>
        <button
          onClick={() => onNavigate("PREV")}
          className="px-3 py-1 bg-gray-100 text-sm rounded hover:bg-gray-200 transition"
        >
          ← Prev
        </button>
        <button
          onClick={() => onNavigate("NEXT")}
          className="px-3 py-1 bg-gray-100 text-sm rounded hover:bg-gray-200 transition"
        >
          Next →
        </button>
      </div>
      <span className="text-xl md:text-2xl font-bold">{formattedLabel}</span>
    </div>
  );
}

// // Custom Weekly Event Component
// function WeeklyEventInfo({ event }: { event: MyEvent }) {
//   return (
//     <Tooltip>
//       <TooltipTrigger asChild>
//         <div className="text-white text-xs sm:p-1 rounded cursor-pointer truncate flex gap-2 items-center">
//           {event.title.length > 4 ? event.title.slice(0, 4) + ".." : event.title}
//           <div className="flex gap-1">
//             {event.platforms?.map((p: string) => (
//               <div className="bg-white p-0.5 rounded-sm" key={p}>
//                 {PLATFORMS.find(platform => platform.key === p)?.icon}
//               </div>
//             ))}
//           </div>
//         </div>
//       </TooltipTrigger>
//       <TooltipContent>
//         <p className="text-sm font-medium">{event.title}</p>
//         <p className="text-sm">({event.platforms?.join(", ")})</p>
//       </TooltipContent>
//     </Tooltip>
//   );
// }

export default function CalendarView() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [calendarHeight, setCalendarHeight] = useState(1050);
  const projects = useGetAllProjects();

  const events = useMemo(() => {
    const map = new Map<string, { title: string; date: Date; platforms: string[] }>();

    projects.data?.forEach(project => {
      (project.projectTrackings || []).forEach(tracking => {
        const dayKey = format(new Date(tracking.date), "yyyy-MM-dd");
        const key = `${project.name}-${dayKey}`;
        if (!map.has(key)) {
          map.set(key, {
            title: project.name,
            date: new Date(tracking.date),
            platforms: [],
          });
        }
        map.get(key)!.platforms.push(tracking.platform);
      });
    });

    return Array.from(map.values()).map(item => ({
      title: item.title,
      start: item.date,
      end: item.date,
      platforms: item.platforms, // array of platforms
      allDay: true,
    }));
  }, [projects.data]);


  // Responsive height for mobile
  useEffect(() => {
    const handleResize = () => {
      setCalendarHeight(window.innerWidth < 768 ? 450 : 950);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="w-full mt-5 pb-8 px-2">
      <div className="mb-4 flex justify-end">
        <div className="flex gap-2">
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1 text-sm rounded transition ${view === "month" ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            Month
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1 text-sm rounded transition ${view === "week" ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            Week
          </button>
        </div>
      </div>
      {
        //@ts-expect-error:........
        <BigCalendar<MyEvent>
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={date}
          onNavigate={(newDate) => setDate(newDate)}
          view={view}
          onView={setView}
          components={{
            toolbar: CustomToolbar,
            // event: view === "month" ? EventInfo : WeeklyEventInfo,
            event: EventInfo,
            timeGutterHeader: () => null,
            timeGutterCell: () => null
          }}
          views={["month", "week"]}
          // style={{ height: "auto" }}
          formats={{
            timeGutterFormat: () => "",
            dayRangeHeaderFormat: ({ start, end }) =>
              `${format(start, "MMM d")} - ${format(end, "MMM d")}`
          }}
          showAllEvents
          className="hide-time-gutter"
        />
      }
    </div>
  );
}