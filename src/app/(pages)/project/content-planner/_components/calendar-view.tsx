"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format, startOfWeek, addDays, subWeeks, endOfWeek, addWeeks, isSameDay, startOfMonth, endOfMonth, isToday } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGetAllProjects, useGetAllScheduledPosts } from "@/backend-apis/projects/hooks";
import { PLATFORMS } from "../../[id]/_components/campaign-planner";
import { Badge } from "@/components/ui/badge";
import { Filter, Check } from "lucide-react";
import { usePathname } from "next/navigation";

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

// Unified Calendar View Component - supports Focus (3 weeks), Week, and Month views
function UnifiedCalendarView({ 
  date, 
  events, 
  onNavigate,
  viewType
}: { 
  date: Date; 
  events: MyEvent[];
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  viewType: 'focus' | 'week' | 'month';
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate weeks based on view type
  const weeks = useMemo(() => {
    const currentWeekStart = startOfWeek(date, { weekStartsOn: 0 });
    
    if (viewType === 'focus') {
      // 3 weeks: previous, current, next
      const prevWeekStart = subWeeks(currentWeekStart, 1);
      const nextWeekStart = addWeeks(currentWeekStart, 1);
      return [
        { start: prevWeekStart, isCurrent: false },
        { start: currentWeekStart, isCurrent: true },
        { start: nextWeekStart, isCurrent: false },
      ];
    } else if (viewType === 'week') {
      // Just the current week
      return [{ start: currentWeekStart, isCurrent: true }];
    } else {
      // Month view - show all weeks of the month
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const lastWeekEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      
      const weeksInMonth = [];
      let weekStart = firstWeekStart;
      const todayWeekStart = startOfWeek(today, { weekStartsOn: 0 });
      
      while (weekStart <= lastWeekEnd) {
        weeksInMonth.push({ 
          start: weekStart, 
          isCurrent: weekStart.getTime() === todayWeekStart.getTime() 
        });
        weekStart = addWeeks(weekStart, 1);
      }
      return weeksInMonth;
    }
  }, [date, viewType]);
  
  // Get events for a specific date
  const getEventsForDate = (targetDate: Date) => {
    const targetStart = new Date(targetDate);
    targetStart.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === targetStart.getTime();
    });
  };
  
  // Format header label based on view type
  const headerLabel = useMemo(() => {
    const tomorrow = addDays(today, 1);
    
    // Get scheduled times for a specific date
    const getScheduledTimes = (targetDate: Date) => {
      const targetDateNormalized = new Date(targetDate);
      targetDateNormalized.setHours(0, 0, 0, 0);
      
      const dayEvents = events.filter(event => {
        if (event.type !== 'scheduled') return false;
        const eventDate = new Date(event.start);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === targetDateNormalized.getTime();
      });
      
      const times = dayEvents
        .map(event => {
          const eventDate = new Date(event.start);
          return format(eventDate, "h:mm a");
        })
        .filter((time, index, arr) => arr.indexOf(time) === index)
        .sort();
      
      return times;
    };
    
    // Normalize dates for comparison
    const todayNormalized = new Date(today);
    todayNormalized.setHours(0, 0, 0, 0);
    const tomorrowNormalized = new Date(tomorrow);
    tomorrowNormalized.setHours(0, 0, 0, 0);
    
    // For week and focus views, check if the week includes today or tomorrow
    if (viewType === 'week' || viewType === 'focus') {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(0, 0, 0, 0);
      
      const todayDateOnly = new Date(todayNormalized);
      todayDateOnly.setHours(0, 0, 0, 0);
      const tomorrowDateOnly = new Date(tomorrowNormalized);
      tomorrowDateOnly.setHours(0, 0, 0, 0);
      
      const weekIncludesToday = todayDateOnly >= weekStart && todayDateOnly <= weekEnd;
      const weekIncludesTomorrow = tomorrowDateOnly >= weekStart && tomorrowDateOnly <= weekEnd;
      
      // Show today's times if week includes today
      if (weekIncludesToday) {
        const todayTimes = getScheduledTimes(today);
        return todayTimes.length > 0 
          ? `Today • ${todayTimes.join(", ")}`
          : "Today";
      }
      
      // Show tomorrow's times if week includes tomorrow but not today
      if (weekIncludesTomorrow && !weekIncludesToday) {
        const tomorrowTimes = getScheduledTimes(tomorrow);
        return tomorrowTimes.length > 0 
          ? `Tomorrow • ${tomorrowTimes.join(", ")}`
          : "Tomorrow";
      }
    }
    
    // For month view, check if today or tomorrow is in the current month
    if (viewType === 'month') {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      monthStart.setHours(0, 0, 0, 0);
      monthEnd.setHours(0, 0, 0, 0);
      
      const todayDateOnly = new Date(todayNormalized);
      todayDateOnly.setHours(0, 0, 0, 0);
      const tomorrowDateOnly = new Date(tomorrowNormalized);
      tomorrowDateOnly.setHours(0, 0, 0, 0);
      
      const todayInMonth = todayDateOnly >= monthStart && todayDateOnly <= monthEnd;
      const tomorrowInMonth = tomorrowDateOnly >= monthStart && tomorrowDateOnly <= monthEnd;
      
      if (todayInMonth) {
        const todayTimes = getScheduledTimes(today);
        return todayTimes.length > 0 
          ? `Today • ${todayTimes.join(", ")}`
          : "Today";
      }
      
      if (tomorrowInMonth && !todayInMonth) {
        const tomorrowTimes = getScheduledTimes(tomorrow);
        return tomorrowTimes.length > 0 
          ? `Tomorrow • ${tomorrowTimes.join(", ")}`
          : "Tomorrow";
      }
    }
    
    // Default behavior for other dates
    if (viewType === 'focus') {
      const currentWeekStart = startOfWeek(date, { weekStartsOn: 0 });
      const startRange = subWeeks(currentWeekStart, 1);
      const endRange = endOfWeek(addWeeks(currentWeekStart, 1), { weekStartsOn: 0 });
      return `${format(startRange, "MMM d")} - ${format(endRange, "MMM d, yyyy")}`;
    } else if (viewType === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    } else {
      return format(date, "MMMM yyyy");
    }
  }, [date, viewType, events, today]);
  
  // Check if a date is in the current month (for month view)
  const isInCurrentMonth = (checkDate: Date) => {
    return checkDate.getMonth() === date.getMonth();
  };
  
  // Calculate min height based on view
  const cellMinHeight = viewType === 'month' ? 'min-h-[100px]' : 'min-h-[120px]';
  const maxEventsToShow = viewType === 'month' ? 2 : 3;
  
  return (
    <div className="unified-calendar-view">
      {/* Custom Toolbar */}
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
        <span className="text-xl md:text-2xl font-bold dark:text-gray-100">{headerLabel}</span>
      </div>
      
      {/* Calendar Grid */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-[hsl(215,44%,22%)] border-b border-gray-200 dark:border-gray-700">
          {dayNames.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Week Rows */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
            {Array.from({ length: 7 }).map((_, dayIndex) => {
              const dayDate = addDays(week.start, dayIndex);
              const isToday = isSameDay(dayDate, today);
              const dayEvents = getEventsForDate(dayDate);
              const isCurrentWeek = week.isCurrent;
              const inCurrentMonth = viewType === 'month' ? isInCurrentMonth(dayDate) : true;
              
              return (
                <div
                  key={dayIndex}
                  className={`${cellMinHeight} p-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
                    isToday 
                      ? 'bg-blue-50 dark:bg-[hsl(215,44%,18%)]' 
                      : !inCurrentMonth
                        ? 'bg-gray-100 dark:bg-[hsl(240,11%,8%)]'
                        : isCurrentWeek 
                          ? 'bg-white dark:bg-[hsl(240,11%,13%)]' 
                          : 'bg-gray-50 dark:bg-[hsl(240,11%,11%)]'
                  }`}
                >
                  {/* Date Number */}
                  <div className={`text-sm mb-1 ${
                    isToday 
                      ? 'font-bold text-blue-600 dark:text-blue-400' 
                      : !inCurrentMonth
                        ? 'text-gray-400 dark:text-gray-600'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isToday ? 'bg-blue-500 text-white' : ''
                    }`}>
                      {format(dayDate, 'd')}
                    </span>
                    {(dayIndex === 0 || dayDate.getDate() === 1) && (
                      <span className="ml-1 text-xs text-gray-400">
                        {format(dayDate, 'MMM')}
                      </span>
                    )}
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, maxEventsToShow).map((event, eventIndex) => (
                      <EventInfo key={eventIndex} event={event} />
                    ))}
                    {dayEvents.length > maxEventsToShow && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                        +{dayEvents.length - maxEventsToShow} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarView() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("focus");
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);

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
          // Exclude webhook posts - they're internal triggers, not standalone events
          if (post.platform === "webhook") {
            return;
          }

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
      // Create a set of scheduled campaign keys to avoid duplicates
      const scheduledCampaignKeys = new Set<string>();
      map.forEach((event) => {
        if (event.type === 'scheduled' && event.campaignName && event.day) {
          const campaignKey = `campaign-${event.projectName}-${event.campaignName}-${event.day}`;
          scheduledCampaignKeys.add(campaignKey);
        }
      });

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
              const campaignKey = `campaign-${project.name}-${planner.name || 'Campaign'}-${chat.day}`;
              
              // Only add if not already scheduled as a post
              if (scheduledCampaignKeys.has(campaignKey)) {
                return;
              }

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

  // Reset to today when navigating back to calendar page
  useEffect(() => {
    const isCalendarPage = pathname === "/project/content-planner";
    const wasNotCalendarPage = previousPathnameRef.current && previousPathnameRef.current !== "/project/content-planner";
    
    // If we navigated from a different page to the calendar page, reset to today
    if (isCalendarPage && wasNotCalendarPage) {
      setDate(new Date());
    }
    
    // Update the previous pathname
    previousPathnameRef.current = pathname;
  }, [pathname]);

  // Reset to today when page becomes visible again (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && pathname === "/project/content-planner") {
        setDate(new Date());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [pathname]);

  // Calculate active filter count
  const activeFilterCount = [showScheduled, showTracking, showPlanned].filter(Boolean).length;

  // Calculate visible events count based on current view type
  const visibleEventsCount = useMemo(() => {
    if (!events.length) return 0;

    let startDate: Date;
    let endDate: Date;

    if (view === 'focus') {
      // Focus view: 3 weeks (previous, current, next)
      const currentWeekStart = startOfWeek(date, { weekStartsOn: 0 });
      startDate = subWeeks(currentWeekStart, 1);
      endDate = endOfWeek(addWeeks(currentWeekStart, 1), { weekStartsOn: 0 });
    } else if (view === 'week') {
      // Week view: just the current week
      startDate = startOfWeek(date, { weekStartsOn: 0 });
      endDate = endOfWeek(date, { weekStartsOn: 0 });
    } else {
      // Month view: all weeks in the current month
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
      // Extend to include partial weeks at the start and end
      const firstWeekStart = startOfWeek(startDate, { weekStartsOn: 0 });
      const lastWeekEnd = endOfWeek(endDate, { weekStartsOn: 0 });
      startDate = firstWeekStart;
      endDate = lastWeekEnd;
    }

    // Set time to start/end of day for accurate comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Count events that fall within the visible date range
    return events.filter(event => {
      const eventDate = new Date(event.start);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= startDate && eventDate <= endDate;
    }).length;
  }, [events, date, view]);

  return (
    <div className="w-full mt-5 pb-8 px-2">
      <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Filter Button with Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-[hsl(240,11%,18%)] dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[hsl(240,11%,25%)] transition border border-gray-200 dark:border-gray-700">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <div className="space-y-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Show Events
                </div>
                
                {/* Scheduled Posts Filter */}
                <button
                  onClick={() => { 
                    setShowScheduled(!showScheduled); 
                    localStorage.setItem('calendar-showScheduled', JSON.stringify(!showScheduled)); 
                  }}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-[hsl(240,11%,18%)] transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Scheduled Posts
                    </span>
                    <span className="text-xs text-gray-400">
                      {scheduledPosts.data ? `(${scheduledPosts.data.length})` : ''}
                    </span>
                  </div>
                  {showScheduled && <Check className="w-4 h-4 text-blue-500" />}
                </button>
                
                {/* Manual Entry Filter */}
                <button
                  onClick={() => { 
                    setShowTracking(!showTracking); 
                    localStorage.setItem('calendar-showTracking', JSON.stringify(!showTracking)); 
                  }}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-[hsl(240,11%,18%)] transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Manual Entry
                    </span>
                    <span className="text-xs text-gray-400">
                      {projects.data ? `(${manualEntryCount})` : ''}
                    </span>
                  </div>
                  {showTracking && <Check className="w-4 h-4 text-blue-500" />}
                </button>
                
                {/* Campaign Plans Filter */}
                <button
                  onClick={() => { 
                    setShowPlanned(!showPlanned); 
                    localStorage.setItem('calendar-showPlanned', JSON.stringify(!showPlanned)); 
                  }}
                  className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-[hsl(240,11%,18%)] transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Campaign Plans
                    </span>
                    <span className="text-xs text-gray-400">
                      {projects.data ? `(${campaignPlansCount})` : ''}
                    </span>
                  </div>
                  {showPlanned && <Check className="w-4 h-4 text-blue-500" />}
                </button>
                
                {/* Future Only - nested under Campaign Plans */}
                {showPlanned && (
                  <button
                    onClick={() => { 
                      setShowFuturePlansOnly(!showFuturePlansOnly); 
                      localStorage.setItem('calendar-showFuturePlansOnly', JSON.stringify(!showFuturePlansOnly)); 
                    }}
                    className="w-full flex items-center justify-between px-2 py-2 pl-8 rounded-md hover:bg-gray-100 dark:hover:bg-[hsl(240,11%,18%)] transition"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Future plans only
                    </span>
                    {showFuturePlansOnly && <Check className="w-4 h-4 text-blue-500" />}
                  </button>
                )}
                
                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                
                {/* Legend */}
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status Legend
                </div>
                <div className="flex flex-wrap gap-1.5 px-2 py-1">
                  <Badge variant="secondary" className="text-xs">Pending</Badge>
                  <Badge variant="default" className="text-xs">Success</Badge>
                  <Badge variant="destructive" className="text-xs">Failed</Badge>
                  <Badge variant="secondary" className="text-xs bg-purple-500 text-white">Planned</Badge>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Event count */}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {visibleEventsCount} events
          </span>
        </div>
        
        {/* View Toggle Buttons */}
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
      <UnifiedCalendarView
        date={date}
        events={events}
        viewType={view as 'focus' | 'week' | 'month'}
        onNavigate={(action) => {
          if (action === 'TODAY') {
            setDate(new Date());
          } else if (action === 'PREV') {
            if (view === 'month') {
              setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1));
            } else {
              setDate(subWeeks(date, 1));
            }
          } else if (action === 'NEXT') {
            if (view === 'month') {
              setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
            } else {
              setDate(addWeeks(date, 1));
            }
          }
        }}
      />
    </div>
  );
}