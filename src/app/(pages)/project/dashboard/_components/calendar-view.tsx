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

type MyEvent = { title: string; start: Date; end: Date, platform?: string }

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
                    <div className="text-white text-xs p-1 rounded cursor-pointer truncate w-fit">
                        {event.title}
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-fit">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-sm">({event.platform})</p>
                    {/* <p className="text-xs">{event.start.toDateString()}</p> */}
                </PopoverContent>
            </Popover>
        );
    }

    // Desktop: Tooltip (hover)
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="text-white text-xs p-1 rounded cursor-pointer truncate">
                    {event.title}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-sm">({event.platform})</p>
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

export default function CalendarView() {
    const [date, setDate] = useState(new Date());
    const [calendarHeight, setCalendarHeight] = useState(650);
    const projects = useGetAllProjects();

    const events = useMemo(() =>
        projects.data?.flatMap(project =>
            (project.projectTrackings || []).map(tracking => ({
                title: project.name,
                start: new Date(tracking.date),
                end: new Date(tracking.date),
                platform: tracking.platform,
            }))
        ) || []
        , [projects.data]);

    // Responsive height for mobile
    useEffect(() => {
        const handleResize = () => {
            setCalendarHeight(window.innerWidth < 768 ? 450 : 650);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className="w-full mt-5 pb-8 px-2">
            <BigCalendar<MyEvent>
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                date={date}
                onNavigate={(newDate) => setDate(newDate)}
                components={{
                    toolbar: CustomToolbar,
                    event: EventInfo,
                }}
                views={["month"]}
                style={{ height: calendarHeight }}
            />
        </div>
    );
}
