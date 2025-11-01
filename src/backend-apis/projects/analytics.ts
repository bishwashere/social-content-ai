import { ScheduledPost, CampaignChat, CampaignPlanner, PlatformPost, ProjectTracking } from "@prisma/client";
import { addDays, isBefore, startOfMonth, eachDayOfInterval, startOfDay, subDays } from "date-fns";

/**
 * Cadence = posting frequency/consistency based purely on platform data
 * Compares current week's posting frequency to previous week
 * Rewards consistent or improving posting patterns
 * 100% = posting at same or better rate than previous week
 */
export function calculateCadence(
    platformPosts: PlatformPost[],
    previousPeriodPosts: PlatformPost[]
): number {
    const endDate = startOfDay(new Date()); // today 00:00
    const startDate = startOfDay(subDays(endDate, 7)); // 7 days before today 00:00

    // Count posts in current week
    const postsThisWeek = platformPosts.filter(post => {
        const postDate = startOfDay(new Date(post.date));
        return postDate >= startDate && postDate <= endDate;
    }).length;

    // Count posts in previous week (for comparison)
    const postsPreviousWeek = previousPeriodPosts.length;

    // Calculate average posts per day
    const daysInCurrentWeek = 7;
    const daysInPreviousWeek = 7;
    
    const avgPostsPerDayThisWeek = postsThisWeek / daysInCurrentWeek;
    const avgPostsPerDayPreviousWeek = postsPreviousWeek > 0 
        ? postsPreviousWeek / daysInPreviousWeek 
        : 0;

    // If no previous posts, base score on current posting frequency
    // 1 post/day = 100%, 0.5 post/day = 50%, etc.
    if (postsPreviousWeek === 0) {
        // Normalize: 2 posts/day = 100%, scale down from there
        return Math.min(100, (avgPostsPerDayThisWeek / 2) * 100);
    }

    // Compare current week to previous week
    // If posting at same or better rate = 100%
    // If posting at 50% rate = 50%
    const ratio = avgPostsPerDayThisWeek / avgPostsPerDayPreviousWeek;
    
    // Cap at 100% (posting more doesn't give >100%)
    // Minimum 0% (but could be negative if ratio is very low, so clamp to 0-100)
    return Math.min(100, Math.max(0, ratio * 100));
}

/**
 * On-time = % posts published within ±2h of schedule
 */
export function calculateOnTime(posts: ScheduledPost[]): number {
    const successfulPosts = posts.filter(p => p.status === "success");

    if (successfulPosts.length === 0) return 0;

    const onTimeCount = successfulPosts.filter(post => {
        if (!post.processedAt) return false;
        const diff = Math.abs(post.processedAt.getTime() - post.date.getTime());
        return diff <= 2 * 60 * 60 * 1000; // 2h
    }).length;

    return (onTimeCount / successfulPosts.length) * 100;
}

/**
 * Coverage = % of connected platforms that had ≥1 post in last 7 days
 * Based purely on platform data - measures how many platforms are actively being used
 */
export function calculateCoverage(
    platformPosts: PlatformPost[],
    totalConnectedPlatforms: number
): number {
    if (totalConnectedPlatforms === 0) return 0;

    const todayStart = startOfDay(new Date()); // today 00:00
    const last7d = startOfDay(subDays(todayStart, 7)); // 7 days before today 00:00

    // Count unique platforms that have actual posts in last 7 days
    const postedPlatforms = new Set<string>();
    platformPosts.forEach(post => {
        const postDate = startOfDay(new Date(post.date));
        if (postDate >= last7d && postDate <= todayStart) {
            const platform = post.oauthProvider?.platform || '';
            if (platform) {
                postedPlatforms.add(platform);
            }
        }
    });

    return (postedPlatforms.size / totalConnectedPlatforms) * 100;
}


/**
 * Consistency = streak days / 30 days (normalized to 100)
 * Based on actual posting consistency from PlatformPost
 */
export function calculateConsistency(streak: number): number {
    // Normalize streak to 0-100 scale (30 days = 100%)
    return Math.min(100, (streak / 30) * 100);
}

/**
 * Success Rate = successful_scheduled_posts / total_scheduled_posts
 * Measures reliability of scheduled posting system
 */
export function calculateSuccessRate(posts: ScheduledPost[]): number {
    if (posts.length === 0) return 0;
    
    const successfulPosts = posts.filter(p => p.status === "success").length;
    return (successfulPosts / posts.length) * 100;
}

/**
 * Platform Diversity = active_platforms / total_connected_platforms
 * Rewards using multiple platforms
 */
export function calculatePlatformDiversity(
    platformPosts: PlatformPost[],
    totalConnectedPlatforms: number
): number {
    if (totalConnectedPlatforms === 0) return 0;
    
    // Count unique platforms that have posts
    const activePlatforms = new Set(
        platformPosts.map(p => p.oauthProvider?.platform).filter(Boolean)
    ).size;
    
    return (activePlatforms / totalConnectedPlatforms) * 100;
}

/**
 * PlanProgress = completed_campaign_tasks / due_tasks
 */
export function calculatePlanProgress(
    planners: (CampaignPlanner & { chats: CampaignChat[] })[]
): number {
    if (planners.length === 0) return 0;

    let totalProgress = 0;

    planners.forEach(planner => {
        if (!planner.startDate || planner.chats.length === 0) {
            totalProgress += 0;
            return;
        }

        const today = new Date();

        // Count how many chats should have been passed by today
        const passedChats = planner.chats.filter(chat => {
            const chatDate = addDays(planner.startDate!, chat.day - 1);
            return isBefore(chatDate, today) || chatDate.toDateString() === today.toDateString();
        }).length;

        const progress = (passedChats / planner.chats.length) * 100;
        totalProgress += progress;
    });

    // Average across all planners
    return totalProgress / planners.length;
}

/**
 * Enhanced Engagement with trend analysis
 * Compares current period to previous period to reward improvement
 */
export function calculateEngagement(
    posts: PlatformPost[],
    previousPeriodPosts: PlatformPost[]
): number {
    const engagementRates: number[] = [];
    for (const post of posts) {
        // Only count posts that have impressions data available
        // Don't penalize for missing data - only use what's available
        if (!post.impressions || post.impressions === 0) continue;
        
        const engagements = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
        const rate = engagements / post.impressions;
        engagementRates.push(rate);
    }

    if (engagementRates.length === 0) return 0;

    const avgEngagement = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
    
    // Calculate previous period engagement for trend analysis
    const previousEngagementRates: number[] = [];
    for (const post of previousPeriodPosts) {
        if (!post.impressions || post.impressions === 0) continue;
        const engagements = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
        const rate = engagements / post.impressions;
        previousEngagementRates.push(rate);
    }
    
    let engagementScore = Number((avgEngagement * 100).toFixed(2));
    
    // Apply trend bonus/penalty: +10% if improving, -5% if declining
    if (previousEngagementRates.length > 0) {
        const previousAvg = previousEngagementRates.reduce((a, b) => a + b, 0) / previousEngagementRates.length;
        const previousEngagement = previousAvg * 100;
        
        if (engagementScore > previousEngagement) {
            // Engagement is improving - apply bonus (capped at 100)
            const improvement = Math.min(10, engagementScore * 0.1);
            engagementScore = Math.min(100, engagementScore + improvement);
        } else if (engagementScore < previousEngagement) {
            // Engagement is declining - apply penalty (minimum 0)
            const decline = engagementScore * 0.05;
            engagementScore = Math.max(0, engagementScore - decline);
        }
    }
    
    return engagementScore;
}

export function calculateThisWeekPostSummaries(
    trackings: ProjectTracking[],
    posts: PlatformPost[]
) {
    // Use PlatformPost count instead of ProjectTracking count for consistency with left panel analytics
    // PlatformPost represents actual published posts from platform APIs, which is the source of truth
    
    // Note: noPosts calculation removed since we're using PlatformPost (actual published posts)
    // instead of tracking entries. Missing days aren't as meaningful when counting actual posts.
    const missing: Date[] = [];

    // Only sum impressions/uniqueImpressions from posts that have the data available
    // Don't penalize for missing data - only use what's available
    const impressions = posts
        .filter(post => post.impressions != null && post.impressions > 0)
        .reduce((sum, post) => sum + (post.impressions || 0), 0);
    
    const uniqueImpressions = posts
        .filter(post => post.uniqueImpressions != null && post.uniqueImpressions > 0)
        .reduce((sum, post) => sum + (post.uniqueImpressions || 0), 0);

    return {
        posts: posts.length, // Changed from trackings.length to posts.length - using PlatformPost count
        noPosts: missing.length,
        likes: posts.reduce((sum, post) => sum + (post.likes || 0), 0),
        impressions: impressions,
        uniqueImpressions: uniqueImpressions,
        er: calculateEngagement(posts, []) // Previous period posts empty for this context
    }
}

/**
 * Calculate streak based on actual published posts (PlatformPost) instead of tickMarks
 * This gives accurate posting activity based on real data from platform APIs
 * Counts all posts in the period, regardless of campaign status (active or ended)
 * 
 * For streak: counts ANY post from ANY platform - just needs at least 1 post on that day
 * Uses rolling 30 days (not calendar month) to capture recent activity across month boundaries
 * 
 * Streak is "strict forgiving": Only broken if TWO consecutive days have no posts.
 * A single day gap is forgiven - the streak continues.
 */
export function calculateGapsandPostsDaysThisMonth(
    platformPosts: PlatformPost[],
    type: '1MONTH' | '1WEEK'
) {
    const today = startOfDay(new Date());
    // Use rolling days instead of calendar month/week boundaries
    // "1MONTH" = last 30 days (not current calendar month)
    // "1WEEK" = last 7 days (not this week vs last week)
    const firstDay = type === '1MONTH' ? startOfDay(subDays(today, 30)) : startOfDay(subDays(today, 7));

    // Collect unique days where posts were actually published (from PlatformPost)
    // This includes all posts, even from ended campaigns, as long as they were posted in the period
    // ANY post from ANY platform counts - we just need at least 1 post on that day
    const postedDays = new Set<string>();

    for (const post of platformPosts) {
        const postDate = startOfDay(new Date(post.date));
        if (postDate >= firstDay && postDate <= today) {
            // Add the day to postedDays - one post per day is enough for streak
            postedDays.add(postDate.toDateString());
        }
    }

    // Calculate streak: consecutive days with posts, going backwards from yesterday
    // Today is "forgiven" - we start counting from yesterday since today hasn't ended yet
    // Streak is only broken if TWO consecutive days have no posts
    // A single day gap is forgiven and doesn't break the streak
    let streak = 0;
    let currentDate = subDays(today, 1); // Start from yesterday (today is forgiven)
    let consecutive = true;
    let consecutiveGaps = 0; // Track consecutive days with no posts

    // Debug: Log posted days for troubleshooting
    const postedDaysArray = Array.from(postedDays).sort().reverse();
    console.log(`🔍 Streak Calculation Debug:`, {
        today: today.toDateString(),
        startingFrom: currentDate.toDateString(),
        firstDay: firstDay.toDateString(),
        totalPostsFound: postedDays.size,
        postedDays: postedDaysArray.slice(0, 10), // First 10 for debugging
        platformPostsCount: platformPosts.length,
    });

    // Go backwards day by day (starting from yesterday)
    while (currentDate >= firstDay && consecutive) {
        const dateString = currentDate.toDateString();
        
        if (postedDays.has(dateString)) {
            // Found a post - reset gap counter and increment streak
            consecutiveGaps = 0;
            streak++;
            currentDate = subDays(currentDate, 1);
        } else {
            // No post on this day
            consecutiveGaps++;
            
            if (consecutiveGaps >= 2) {
                // Two consecutive days with no posts - streak is broken
                console.log(`🔍 Streak broken at ${dateString}, consecutiveGaps: ${consecutiveGaps}, streak so far: ${streak}`);
                consecutive = false;
            } else {
                // Only one day gap - forgive it and continue
                console.log(`🔍 Forgiving gap at ${dateString}, consecutiveGaps: ${consecutiveGaps}`);
                currentDate = subDays(currentDate, 1);
            }
        }
    }

    console.log(`🔍 Final streak: ${streak}, consecutiveGaps when stopped: ${consecutiveGaps}`);
    
    // Count all unique days with posts for gap calculation
    const daysPosted = postedDays.size;
    
    // total days in this period (till today)
    const totalDays = eachDayOfInterval({ start: firstDay, end: today }).length;
    
    const gapDays = totalDays - daysPosted;

    return { daysPosted: streak, gapDays };
}

