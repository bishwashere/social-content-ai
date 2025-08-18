import { ScheduledPost, CampaignChat, CampaignPlanner, PlatformPost, ProjectTracking } from "@prisma/client";
import { addDays, isBefore, startOfMonth, eachDayOfInterval, subWeeks } from "date-fns";

/**
 * Cadence = posted_this_week / planned_this_week (capped 100)
 */
export function calculateCadence(
    planners: (CampaignPlanner & { chats: CampaignChat[] })[]
): number {
    const startDate = subWeeks(new Date(), 1);
    const endDate = new Date();

    let plannedThisWeek = 0;
    let postedThisWeek = 0;

    for (const planner of planners) {
        if (!planner.startDate) continue;

        for (const chat of planner.chats) {
            // derive chatDate = planner.startDate + (day - 1)
            const chatDate = addDays(new Date(planner.startDate), chat.day - 1);

            if (chatDate >= startDate && chatDate <= endDate) {
                // this chat is planned for this week
                plannedThisWeek += planner.platforms.length;

                // count posted tickMarks
                if (chat.tickMark && typeof chat.tickMark === "object") {
                    for (const platform of planner.platforms) {
                        if ((chat.tickMark as Record<string, boolean>)[platform]) {
                            postedThisWeek++;
                        }
                    }
                }
            }
        }
    }

    if (plannedThisWeek === 0) return 100; // no plan
    return Math.min(100, (postedThisWeek / plannedThisWeek) * 100);
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
 * Coverage = % of campaign platforms that had ≥1 post in last 7 days
 */
export function calculateCoverage(planners: (CampaignPlanner & { chats: CampaignChat[] })[]): number {
    const last7d = new Date();
    last7d.setDate(last7d.getDate() - 7);

    const postedPlatforms = new Set<string>();

    planners.forEach(planner => {
        planner.chats.forEach(chat => {
            // skip chats that are not within last 7 days (use startDate+day)
            if (!planner.startDate) return;
            const chatDate = new Date(planner.startDate);
            chatDate.setDate(chatDate.getDate() + (chat.day - 1));

            if (chatDate < last7d) return;

            const tickMarks = chat.tickMark as Record<string, boolean>;
            Object.entries(tickMarks).forEach(([platform, done]) => {
                if (done) {
                    postedPlatforms.add(platform);
                }
            });
        });
    });

    const totalPlatforms = Number(process.env.TOTAL_PLATFORMS) || 6;
    return (postedPlatforms.size / totalPlatforms) * 100;
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

export function calculateEngagement(posts: PlatformPost[]): number {
    const engagementRates: number[] = [];
    for (const post of posts) {
        if (!post.impressions || post.impressions === 0) continue;
        const rate = (post.likes || 0 + post.comments || 0 + (post.shares || 0)) / post.impressions;
        engagementRates.push(rate);
    }

    if (engagementRates.length === 0) return 0;

    const avgEngagement = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
    return Number((avgEngagement * 100).toFixed(2));
}

export function calculateThisWeekPostSummaries(
    trackings: ProjectTracking[],
    posts: PlatformPost[]
) {
    // const d = {
    //     posts: trackings.length,
    //     likes: posts.reduce((sum, post) => sum + (post.likes || 0), 0),
    //     impressions: posts.reduce((sum, post) => sum + (post.impressions || 0), 0),
    //     shares: posts.reduce((sum, post) => sum + (post.shares || 0), 0),
    //     comments: posts.reduce((sum, post) => sum + (post.comments || 0), 0),
    // }
    // console.log("Last 1 week data");
    // console.log(d);
    // console.log("ER (like+comment+share)/impressions : ", (d.likes + d.comments + d.shares) / d.impressions);
    // console.log("Normalized ER (calculation Er per post and then average) : ", calculateEngagement(posts));

    return {
        posts: trackings.length,
        likes: posts.reduce((sum, post) => sum + (post.likes || 0), 0),
        impressions: posts.reduce((sum, post) => sum + (post.impressions || 0), 0),
        uniqueImpressions: posts.reduce((sum, post) => sum + (post.uniqueImpressions || 0), 0),
        er: calculateEngagement(posts)
    }
}

export function calculateGapsandPostsDaysThisMonth(
    planners: (CampaignPlanner & { chats: CampaignChat[] })[],
    type: '1MONTH' | '1WEEK'
) {
    const today = new Date();
    const firstDay = type === '1MONTH' ? startOfMonth(today) : subWeeks(today, 1);

    // Collect unique days where at least one chat has a tickMark true
    const postedDays = new Set<string>();

    for (const planner of planners) {
        for (const chat of planner.chats) {
            const tickMark = chat.tickMark as unknown as Record<string, boolean>;
            if (!tickMark || !Object.values(tickMark).some(Boolean)) {
                continue;
            }

            const chatDate = addDays(planner.startDate!, chat.day - 1);
            if (chatDate >= firstDay && chatDate <= today) {
                postedDays.add(chatDate.toDateString());
            }
        }
    }

    // total days in this month (till today)
    const totalDays = eachDayOfInterval({ start: firstDay, end: today }).length;

    const daysPosted = postedDays.size;
    const gapDays = totalDays - daysPosted;

    return { daysPosted, gapDays };
}

