import { useSession } from '@/backend-apis/auth/hooks'
import { useGetFacebookMetrics, useGetTiktokMetrics } from '@/backend-apis/metrics/hooks'
import React, { useEffect, useState } from 'react'
import ViewAnalytics, { ViewAnalyticsProps, ViewAnalyticsSkeleton } from './view-analytics'
import { AnalyticsPlatformsProps } from '.'

const Tiktok = ({ timerange, selectedProject }: AnalyticsPlatformsProps) => {

    const { data: session } = useSession();
    const tiktok = useGetTiktokMetrics(session?.user.id || "", selectedProject);
    const [analytics, setAnalytics] = useState<ViewAnalyticsProps>({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });

    useEffect(() => {
        if (tiktok.data?.data && Array.isArray(tiktok.data.data) && timerange) {
            try {
                const now = new Date();
                const cutoffDate = new Date(now);
                cutoffDate.setDate(now.getDate() - timerange);

                const filteredData = tiktok.data.data.filter((item) => {
                    if (!item || !item.date) return false;
                    try {
                        const postDate = item.date instanceof Date ? item.date : new Date(item.date);
                        return !isNaN(postDate.getTime()) && postDate >= cutoffDate;
                    } catch {
                        return false;
                    }
                });

                // Group posts by day and aggregate metrics
                const postsByDay = new Map<string, {
                  dayKey: string;
                  label: string;
                  totalPosts: number;
                  totalComments: number;
                  totalLikes: number;
                  totalImpressions: number;
                }>();

                filteredData.forEach((d) => {
                  try {
                    const date = d.date instanceof Date ? d.date : new Date(d.date);
                    if (isNaN(date.getTime())) return;
                    
                    const dayKey = date.toISOString().split('T')[0];
                    const label = date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric'
                    });

                    const existing = postsByDay.get(dayKey);
                    if (existing) {
                      existing.totalPosts += 1;
                      existing.totalComments += (d.comments || 0);
                      existing.totalLikes += (d.likes || 0);
                      existing.totalImpressions += (d.impressions || 0);
                    } else {
                      postsByDay.set(dayKey, {
                        dayKey,
                        label,
                        totalPosts: 1,
                        totalComments: d.comments || 0,
                        totalLikes: d.likes || 0,
                        totalImpressions: d.impressions || 0,
                      });
                    }
                  } catch {
                    // Skip invalid dates
                  }
                });

                const chartData = Array.from(postsByDay.values())
                  .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
                  .map(({ dayKey, ...rest }) => rest);

                setAnalytics({
                    totalPosts: filteredData.length,
                    totalComments: filteredData.reduce((sum, d) => sum + (d.comments || 0), 0),
                    totalLikes: filteredData.reduce((sum, d) => sum + (d.likes || 0), 0),
                    totalFollowers: 0,
                    totalImpressions: filteredData.reduce((sum, d) => sum + (d.impressions || 0), 0),
                    chartData,
                });
            } catch (error) {
                console.error("Error processing Tiktok analytics data:", error);
                // Keep default analytics state on error
            }
        } else {
            // Reset to default if no project selected
            setAnalytics({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });
        }
    }, [tiktok.data, timerange]);


    if (tiktok.isLoading) return <ViewAnalyticsSkeleton />

    return (
        <div className='w-full'>
            <ViewAnalytics {...analytics} />
        </div>
    )
}

export { Tiktok }

