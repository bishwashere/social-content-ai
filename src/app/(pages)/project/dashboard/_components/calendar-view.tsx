"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  ToolbarProps,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGetAllProjects, useGetProjectsSummary, useGetAllScheduledPosts } from "@/backend-apis/projects/hooks";
import { enUS } from 'date-fns/locale/en-US'
import { PLATFORMS } from "../../[id]/_components/campaing-planner";
import { Badge } from "@/components/ui/badge";

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

type MyEvent = { 
  title: string; 
  start: Date; 
  end: Date; 
  platforms?: string[];
  type: 'tracking' | 'scheduled' | 'planned';
  projectName?: string;
  status?: string;
  content?: string;
  media?: string;
  campaignName?: string;
  day?: number;
}

function EventInfo({ event }: { event: MyEvent }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getEventColor = () => {
    if (event.type === 'scheduled') {
      switch (event.status) {
        case 'pending': return 'bg-blue-500';
        case 'success': return 'bg-green-500';
        case 'failed': return 'bg-red-500';
        case 'processing': return 'bg-yellow-500';
        default: return 'bg-blue-500';
      }
    } else if (event.type === 'planned') {
      return 'bg-purple-500';
    }
    return 'bg-gray-500';
  };

  const getEventIcon = () => {
    if (event.type === 'scheduled') {
      return '📅';
    } else if (event.type === 'planned') {
      return '📋';
    }
    return '📊';
  };

  if (isMobile) {
    // Mobile: Popover (click to open)
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className={`text-white text-xs rounded cursor-pointer truncate flex gap-2 items-center p-1 ${getEventColor()}`}>
            <span>{getEventIcon()}</span>
            {event.title.length > 9 ? `${event.title.slice(0, 9)}..` : event.title}
            <div className="flex gap-1">
              {event.platforms?.map((p: string) => (
                <div className="bg-white p-0.5 rounded-sm" key={p}>
                  {PLATFORMS.find(platform => platform.key === p)?.icon}
                </div>
              ))}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getEventIcon()}</span>
              <div>
                <p className="text-sm font-medium text-white">{event.title}</p>
                {event.projectName && (
                  <p className="text-xs text-white">{event.projectName}</p>
                )}
                {event.campaignName && (
                  <p className="text-xs text-white">Campaign: {event.campaignName}</p>
                )}
                {event.day && (
                  <p className="text-xs text-white">Day {event.day}</p>
                )}
              </div>
            </div>
            {event.type === 'scheduled' && (
              <div className="space-y-1">
                <Badge variant={event.status === 'success' ? 'default' : event.status === 'failed' ? 'destructive' : 'secondary'}>
                  {event.status}
                </Badge>
                {event.content && (
                  <p className="text-xs text-white line-clamp-3">{event.content}</p>
                )}
              </div>
            )}
            {event.type === 'planned' && (
              <div className="space-y-1">
                <Badge variant="secondary">Planned</Badge>
                {event.content && (
                  <p className="text-xs text-white line-clamp-3">{event.content}</p>
                )}
              </div>
            )}
            <p className="text-xs text-white font-medium">
              {event.platforms?.join(', ')}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop: Tooltip (hover)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`text-white text-xs p-1 rounded cursor-pointer truncate flex gap-2 items-center ${getEventColor()}`}>
          <span>{getEventIcon()}</span>
          {event.title.length > 9 ? `${event.title.slice(0, 9)}..` : event.title}
          <div className="flex gap-1">
            {event.platforms?.map((p: string) => (
              <div className="bg-white p-0.5 rounded-sm" key={p}>
                {PLATFORMS.find(platform => platform.key === p)?.icon}
              </div>
            ))}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="w-80">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getEventIcon()}</span>
            <div>
              <p className="text-sm font-medium text-white">{event.title}</p>
              {event.projectName && (
                <p className="text-xs text-white">{event.projectName}</p>
              )}
              {event.campaignName && (
                <p className="text-xs text-white">Campaign: {event.campaignName}</p>
              )}
              {event.day && (
                <p className="text-xs text-white">Day {event.day}</p>
              )}
            </div>
          </div>
          {event.type === 'scheduled' && (
            <div className="space-y-1">
              <Badge variant={event.status === 'success' ? 'default' : event.status === 'failed' ? 'destructive' : 'secondary'}>
                {event.status}
              </Badge>
              {event.content && (
                <p className="text-xs text-white line-clamp-3">{event.content}</p>
              )}
            </div>
          )}
          {event.type === 'planned' && (
            <div className="space-y-1">
              <Badge variant="secondary">Planned</Badge>
              {event.content && (
                <p className="text-xs text-white line-clamp-3">{event.content}</p>
              )}
            </div>
          )}
          <p className="text-xs text-white font-medium">
            {event.platforms?.join(', ')}
          </p>
        </div>
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
  const [view, setView] = useState("month");
  const [calendarHeight, setCalendarHeight] = useState(1050);
  
  // Initialize filter states from localStorage or defaults
  const [showScheduled, setShowScheduled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar-showScheduled');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  
  const [showTracking, setShowTracking] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar-showTracking');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  
  const [showPlanned, setShowPlanned] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar-showPlanned');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [showFuturePlansOnly, setShowFuturePlansOnly] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar-showFuturePlansOnly');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  
  const projects = useGetAllProjects();
  const scheduledPosts = useGetAllScheduledPosts();

  // Save filter states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('calendar-showScheduled', JSON.stringify(showScheduled));
  }, [showScheduled]);

  useEffect(() => {
    localStorage.setItem('calendar-showTracking', JSON.stringify(showTracking));
  }, [showTracking]);

  useEffect(() => {
    localStorage.setItem('calendar-showPlanned', JSON.stringify(showPlanned));
  }, [showPlanned]);

  useEffect(() => {
    localStorage.setItem('calendar-showFuturePlansOnly', JSON.stringify(showFuturePlansOnly));
  }, [showFuturePlansOnly]);

  const events = useMemo(() => {
    const map = new Map<string, MyEvent>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (showTracking) {
      projects.data?.forEach(project => {
        (project.projectTrackings || []).forEach(tracking => {
          const dayKey = format(new Date(tracking.date), "yyyy-MM-dd");
          const key = `${project.name}-${dayKey}-tracking`;
          if (!map.has(key)) {
            map.set(key, {
              title: project.name,
              start: new Date(tracking.date),
              end: new Date(tracking.date),
              platforms: [tracking.platform],
              type: 'tracking',
              projectName: project.name,
            });
          } else {
            map.get(key)!.platforms?.push(tracking.platform);
          }
        });
      });
    }

    if (showScheduled) {
      scheduledPosts.data?.forEach((post: any) => {
        const dayKey = format(new Date(post.date), "yyyy-MM-dd");
        const key = `${post.title}-${dayKey}-scheduled`;
        if (!map.has(key)) {
          map.set(key, {
            title: post.title,
            start: new Date(post.date),
            end: new Date(post.date),
            platforms: [post.platform],
            type: 'scheduled',
            status: post.status,
            content: post.content,
            media: post.media,
          });
        } else {
          map.get(key)!.platforms?.push(post.platform);
        }
      });
    }

    if (showPlanned) {
      projects.data?.forEach(project => {
        (project.campaignPlanners || []).forEach(planner => {
          if (planner.startDate) {
            (planner.chats || []).forEach(chat => {
              // Calculate the actual date for this chat based on startDate + day
              const chatDate = addDays(new Date(planner.startDate!), chat.day - 1);
              
              // Filter out past plans if showFuturePlansOnly is true
              if (showFuturePlansOnly && chatDate < today) {
                return;
              }
              
              const dayKey = format(chatDate, "yyyy-MM-dd");
              const key = `${project.name}-${planner.name || 'Campaign'}-${dayKey}-planned`;
              
              if (!map.has(key)) {
                map.set(key, {
                  title: project.name,
                  start: chatDate,
                  end: chatDate,
                  type: 'planned',
                  projectName: project.name,
                  campaignName: planner.name || 'Campaign',
                  day: chat.day,
                  content: `Day ${chat.day} content`,
                });
              } else {
                // If multiple platforms, merge them
                const existingEvent = map.get(key)!;
                // Note: platforms property removed as it's not available in the current type
              }
            });
          }
        });
      });
    }

    return Array.from(map.values()).map(item => ({
      title: item.title,
      start: item.start,
      end: item.end,
      type: item.type,
      projectName: item.projectName,
      status: item.status,
      content: item.content,
      media: item.media,
      campaignName: item.campaignName,
      day: item.day,
      allDay: true,
    }));
  }, [projects.data, scheduledPosts.data, showTracking, showScheduled, showPlanned, showFuturePlansOnly]);

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
      <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="showScheduled"
              checked={showScheduled}
              onChange={(e) => setShowScheduled(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showScheduled" className="flex items-center gap-2 cursor-pointer">
              <span className="text-lg">📅</span>
              <span className="text-gray-600">Scheduled Posts</span>
            </label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="showTracking"
              checked={showTracking}
              onChange={(e) => setShowTracking(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showTracking" className="flex items-center gap-2 cursor-pointer">
              <span className="text-lg">📊</span>
              <span className="text-gray-600">Project Tracking</span>
            </label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="showPlanned"
              checked={showPlanned}
              onChange={(e) => setShowPlanned(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showPlanned" className="flex items-center gap-2 cursor-pointer">
              <span className="text-lg">📋</span>
              <span className="text-gray-600">Campaign Plans</span>
            </label>
            {showPlanned && (
              <div className="ml-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showFuturePlansOnly"
                  checked={showFuturePlansOnly}
                  onChange={(e) => setShowFuturePlansOnly(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showFuturePlansOnly" className="text-xs text-gray-500 cursor-pointer">
                  Future Only
                </label>
              </div>
            )}
          </div>
        </div>
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
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">Pending</Badge>
        <Badge variant="default" className="text-xs">Success</Badge>
        <Badge variant="destructive" className="text-xs">Failed</Badge>
        <Badge variant="secondary" className="text-xs bg-purple-500 text-white">Planned</Badge>
      </div>
      <div className="text-sm text-gray-600 mb-4">
        Showing {events.length} events
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
            event: EventInfo,
            timeGutterHeader: () => null,
            timeGutterCell: () => null
          }}
          views={["month", "week"]}
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