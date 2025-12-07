"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  ToolbarProps,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, subWeeks, endOfWeek } from "date-fns";
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

// Custom 3-week "Focus" view - create a proper view object
// We'll create this inside the component to access localizer

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
          <div className={`text-white text-[10px] rounded cursor-pointer truncate flex gap-2 items-center p-1 overflow-hidden ${getEventColor()}`}>
            <span>{getEventIcon()}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {event.title}
            </span>
            <div className="flex gap-1 flex-shrink-0">
              {event.platforms?.map((p: string) => (
                <div className="bg-white p-0.5 rounded-sm" key={p}>
                  {PLATFORMS.find(platform => platform.key === p)?.icon}
                </div>
              ))}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-50 bg-primary dark:bg-[hsl(215,44%,22%)]">
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
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {event.title}
          </span>
          <div className="flex gap-1">
            {event.platforms?.map((p: string) => (
              <div className="bg-white p-0.5 rounded-sm" key={p}>
                {PLATFORMS.find(platform => platform.key === p)?.icon}
              </div>
            ))}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="w-80 dark:bg-[hsl(215,44%,22%)]">
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
    <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2 bg-white dark:bg-[hsl(215,44%,22%)] shadow-md rounded-md mb-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onNavigate("TODAY")}
          className="px-3 py-1 bg-gray-100 dark:bg-[hsl(240,11%,18%)] dark:text-gray-200 text-sm rounded hover:bg-gray-200 dark:hover:bg-[hsl(240,11%,25%)] transition"
        >
          Today
        </button>
        <button
          onClick={() => onNavigate("PREV")}
          className="px-3 py-1 bg-gray-100 dark:bg-[hsl(240,11%,18%)] dark:text-gray-200 text-sm rounded hover:bg-gray-200 dark:hover:bg-[hsl(240,11%,25%)] transition"
        >
          ← Prev
        </button>
        <button
          onClick={() => onNavigate("NEXT")}
          className="px-3 py-1 bg-gray-100 dark:bg-[hsl(240,11%,18%)] dark:text-gray-200 text-sm rounded hover:bg-gray-200 dark:hover:bg-[hsl(240,11%,25%)] transition"
        >
          Next →
        </button>
      </div>
      <span className="text-xl md:text-2xl font-bold dark:text-gray-100">{formattedLabel}</span>
    </div>
  );
}

export default function CalendarView() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("focus");
  const [calendarHeight, setCalendarHeight] = useState(1050);

  // Create custom 3-week "Focus" view
  // Calculate the date range for 3 weeks: 1 week before, current week, 1 week after
  const focusViewRange = useMemo(() => {
    if (view !== "focus") return null;

    // Get the start of the current week (Sunday) based on the current date
    const currentWeekStart = startOfWeek(date, { weekStartsOn: 0 });
    // Go back one week for the start
    const start = subWeeks(currentWeekStart, 1);
    // Go forward 2 weeks from start (total 3 weeks: previous, current, next)
    const end = endOfWeek(addDays(start, 20), { weekStartsOn: 0 });

    return { start, end };
  }, [date, view]);

  // Calculate the date to pass to calendar for focus view
  // Use the current date (middle of the 3-week range) so it shows the correct month
  const focusDate = useMemo(() => {
    if (view === "focus") {
      // Return the current date (which is in the middle week) so the month view shows the correct month
      return date;
    }
    return date;
  }, [date, view]);

  // Initialize filter states from localStorage or defaults
  const [showScheduled, setShowScheduled] = useState(true); // Default to true
  const [showTracking, setShowTracking] = useState(true);
  const [showPlanned, setShowPlanned] = useState(true);
  const [showFuturePlansOnly, setShowFuturePlansOnly] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const scheduled = localStorage.getItem('calendar-showScheduled');
      if (scheduled !== null) {
        setShowScheduled(JSON.parse(scheduled));
      }

      const tracking = localStorage.getItem('calendar-showTracking');
      if (tracking !== null) {
        setShowTracking(JSON.parse(tracking));
      }

      const planned = localStorage.getItem('calendar-showPlanned');
      if (planned !== null) {
        setShowPlanned(JSON.parse(planned));
      }

      const futurePlansOnly = localStorage.getItem('calendar-showFuturePlansOnly');
      if (futurePlansOnly !== null) {
        setShowFuturePlansOnly(JSON.parse(futurePlansOnly));
      }
    }
  }, [])

  const projects = useGetAllProjects();
  const scheduledPosts = useGetAllScheduledPosts();

  // Debug: Log scheduled posts query status
  useEffect(() => {
    console.log('🔍 useGetAllScheduledPosts status:', {
      isLoading: scheduledPosts.isLoading,
      isError: scheduledPosts.isError,
      error: scheduledPosts.error,
      hasData: !!scheduledPosts.data,
      dataLength: scheduledPosts.data?.length ?? 0,
      data: scheduledPosts.data,
    });
  }, [scheduledPosts.isLoading, scheduledPosts.data, scheduledPosts.error]);

  // Calculate counts for labels
  const manualEntryCount = useMemo(() => {
    if (!projects.data) return 0;
    return projects.data.reduce((total, project) => {
      return total + (project.projectTrackings?.length || 0);
    }, 0);
  }, [projects.data]);

  const campaignPlansCount = useMemo(() => {
    if (!projects.data) return 0;
    return projects.data.reduce((total, project) => {
      const planners = project.campaignPlanners || [];
      return total + planners.reduce((plannerTotal, planner) => {
        if (!planner.startDate) return plannerTotal;
        const chats = planner.chats || [];
        return plannerTotal + chats.length;
      }, 0);
    }, 0);
  }, [projects.data]);

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
      // Debug: Log scheduled posts data
      console.log('🔍 Debug - showScheduled check:', {
        showScheduled,
        hasData: !!scheduledPosts.data,
        dataLength: scheduledPosts.data?.length ?? 0,
        isLoading: scheduledPosts.isLoading,
        error: scheduledPosts.error,
      });

      if (scheduledPosts.data) {
        console.log('📅 Calendar View - Scheduled Posts Data:', {
          totalPosts: scheduledPosts.data.length,
          showScheduled,
          samplePost: scheduledPosts.data[0],
          quickBillingPosts: scheduledPosts.data.filter((p: any) => p.project?.name?.includes('Quick Billing')),
          allProjects: [...new Set(scheduledPosts.data.map((p: any) => p.project?.name))],
        });
      } else {
        console.warn('⚠️ scheduledPosts.data is null/undefined');
      }

      let processedCount = 0;
      if (!scheduledPosts.data || scheduledPosts.data.length === 0) {
        console.warn('⚠️ No scheduled posts data to process');
      }
      scheduledPosts.data?.forEach((post: any) => {
        try {
          const postDate = new Date(post.date);
          if (isNaN(postDate.getTime())) {
            console.error('❌ Invalid date for post:', post.id, post.date);
            return;
          }
          const dayKey = format(postDate, "yyyy-MM-dd");

          // Generate a title - use campaign name if from campaign, otherwise use content preview or project name
          const meta = post.meta as any;
          let title = '';
          if (meta?.campaignName) {
            title = `${meta.campaignName} - Day ${meta.day || ''}`;
          } else {
            // Use first 50 chars of content or project name + platform
            title = post.content
              ? (post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content)
              : `${post.project?.name || 'Post'} - ${post.platform}`;
          }

          // Use post ID + date as key to ensure uniqueness (multiple posts can be on same date)
          const key = `${post.id}-${dayKey}-scheduled`;
          if (!map.has(key)) {
            map.set(key, {
              title: title,
              start: postDate,
              end: postDate,
              platforms: [post.platform],
              type: 'scheduled',
              status: post.status,
              content: post.content,
              media: post.media,
              projectName: post.project?.name,
              campaignName: meta?.campaignName,
              day: meta?.day,
            });
            processedCount++;
          } else {
            // If same key exists, merge platforms
            const existing = map.get(key)!;
            if (!existing.platforms?.includes(post.platform)) {
              existing.platforms?.push(post.platform);
            }
          }
        } catch (error) {
          console.error('❌ Error processing scheduled post:', post.id, error);
        }
      });
      console.log(`✅ Processed ${processedCount} scheduled posts into events`);
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

    const eventsArray = Array.from(map.values()).map(item => ({
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
      platforms: item.platforms,
      allDay: true,
    }));

    // Debug: Log final events array
    console.log('📊 Calendar View - Final Events Array:', {
      totalEvents: eventsArray.length,
      scheduledEvents: eventsArray.filter(e => e.type === 'scheduled').length,
      sampleEvent: eventsArray[0],
      eventDates: eventsArray.slice(0, 5).map(e => ({ title: e.title, start: e.start.toISOString() }))
    });

    return eventsArray;
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
              onChange={(e) => { setShowScheduled(e.target.checked); localStorage.setItem('calendar-showScheduled', JSON.stringify(e.target.checked)); }}
              className="rounded dark:bg-[hsl(240,11%,18%)] dark:border-gray-600"
            />
            <label htmlFor="showScheduled" className="flex items-center gap-2 cursor-pointer">
              <span className="text-lg">📅</span>
              <span className="text-gray-600 dark:text-gray-300">
                Scheduled Posts{scheduledPosts.data ? ` (${scheduledPosts.data.length})` : ''}
              </span>
            </label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="showTracking"
              checked={showTracking}
              onChange={(e) => { setShowTracking(e.target.checked); localStorage.setItem('calendar-showTracking', JSON.stringify(e.target.checked)); }}
              className="rounded dark:bg-[hsl(240,11%,18%)] dark:border-gray-600"
            />
            <label htmlFor="showTracking" className="flex items-center gap-2 cursor-pointer">
              <span className="text-lg">📊</span>
              <span className="text-gray-600 dark:text-gray-300">
                Manual Entry{projects.data ? ` (${manualEntryCount})` : ''}
              </span>
            </label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="showPlanned"
              checked={showPlanned}
              onChange={(e) => { setShowPlanned(e.target.checked); localStorage.setItem('calendar-showPlanned', JSON.stringify(e.target.checked)); }}
              className="rounded dark:bg-[hsl(240,11%,18%)] dark:border-gray-600"
            />
            <label htmlFor="showPlanned" className="flex items-center gap-2 cursor-pointer">
              <span className="text-lg">📋</span>
              <span className="text-gray-600 dark:text-gray-300">
                Campaign Plans{projects.data ? ` (${campaignPlansCount})` : ''}
              </span>
            </label>
            {showPlanned && (
              <div className="ml-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showFuturePlansOnly"
                  checked={showFuturePlansOnly}
                  onChange={(e) => { setShowFuturePlansOnly(e.target.checked); localStorage.setItem('calendar-showFuturePlansOnly', JSON.stringify(e.target.checked)); }}
                  className="rounded dark:bg-[hsl(240,11%,18%)] dark:border-gray-600"
                />
                <label htmlFor="showFuturePlansOnly" className="text-gray-600 dark:text-gray-300">
                  Future Only
                </label>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("focus")}
            className={`px-3 py-1 text-sm rounded transition ${view === "focus" ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-[hsl(240,11%,18%)] dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[hsl(240,11%,25%)]"}`}
          >
            Focus
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1 text-sm rounded transition ${view === "week" ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-[hsl(240,11%,18%)] dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[hsl(240,11%,25%)]"}`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1 text-sm rounded transition ${view === "month" ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-[hsl(240,11%,18%)] dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[hsl(240,11%,25%)]"}`}
          >
            Month
          </button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">Pending</Badge>
        <Badge variant="default" className="text-xs">Success</Badge>
        <Badge variant="destructive" className="text-xs">Failed</Badge>
        <Badge variant="secondary" className="text-xs bg-purple-500 text-white">Planned</Badge>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Showing {events.length} events
      </div>
      {
        <BigCalendar<MyEvent>
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={view === "focus" ? focusDate : date}
          onNavigate={(newDate) => {
            setDate(newDate);
          }}
          view={(view === "focus" ? "month" : view) as "month" | "week"}
          onView={(newView) => {
            // Only allow switching to week or month from the calendar itself
            if (newView === "week" || newView === "month") {
              setView(newView);
            }
          }}
          components={{
            toolbar: CustomToolbar,
            event: EventInfo,
            timeGutterHeader: () => null,
          }}
          views={["month", "week"]}
          formats={{
            timeGutterFormat: () => "",
            dayRangeHeaderFormat: ({ start, end }) =>
              `${format(start, "MMM d")} - ${format(end, "MMM d")}`
          }}
          showAllEvents
          className={`hide-time-gutter ${view === "focus" ? "focus-view-3weeks" : ""}`}
          min={view === "focus" && focusViewRange ? focusViewRange.start : undefined}
          max={view === "focus" && focusViewRange ? focusViewRange.end : undefined}
        />
      }
    </div>
  );
}