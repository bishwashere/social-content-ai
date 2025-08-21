import { ForwardRefExoticComponent, RefAttributes, useEffect, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    TooltipProps,
} from "recharts";
import { differenceInDays, format, subDays } from "date-fns";
import { Activity, BarChart2, Clock, FileText, LucideProps, MousePointerClick, ThumbsUp, Users } from "lucide-react";
import { useGetAllDayProjectPulse } from "@/backend-apis/projects/hooks";

type ProjectAnalyticsGraphProps = {
    label: string;
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
    color: string;
    data: {
        date: Date;
        value: number;
    }[]
}

type ProjectPulse = {
    id: string;
    projectId: string;
    createdAt: Date;
    pulse: number;
    components: {
        cadence: number,
        onTime: number,
        engagement: number,
        coverage: number,
        planProgress: number
    };
    thisWeekPostSummaries: {
        posts: number,
        likes: number,
        impressions: number,
        uniqueImpressions: number,
        er: number,
    };
    daysPosted: number;
    gapDays: number;
}

const ranges = {
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
    "3Y": 1095,
};

function ProjectAnalyticsGraph({ data }: { data: ProjectAnalyticsGraphProps }) {
    const [range, setRange] = useState<keyof typeof ranges>("1M");

    // filter data based on selected range
    const filteredData = data.data.slice(-ranges[range]);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreen = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkScreen(); // Initial check
        window.addEventListener("resize", checkScreen);
        return () => window.removeEventListener("resize", checkScreen);
    }, []);

    const CustomTooltip = ({ active, label, payload }: TooltipProps<number, string>) => {
        if (!active || !payload || payload.length === 0) return null;
        const date = new Date(label);
        const viewDate = format(date, "MMM d, yyyy")
        return (
            <div className="bg-white px-2 py-1 border rounded shadow flex flex-row items-center gap-1">
                <p className="font-bold text-[13px]">{payload[0].value}</p>
                <p className="font-medium text-muted-foreground text-[11px]">{viewDate}</p>
            </div>
        );
    };

    const Icon = data.icon;

    return (
        <div className="w-full h-full p-4 border rounded-2xl bg-white shadow-sm">
            <div className="flex gap-1 items-center">
                <div className={`p-1.5 rounded-full ${data.color}`}>
                    <Icon className="w-3 h-3" />
                </div>
                <p className="text-lg font-medium ml-2 mb-2 sm:mb-0">{data.label}</p>
            </div>
            {/* Range selector */}
            <div className="flex justify-end gap-2 mb-6">
                {Object.keys(ranges).map((r) => (
                    <button
                        key={r}
                        onClick={() => setRange(r as keyof typeof ranges)}
                        className={`px-2 py-1 text-sm rounded ${range === r
                            ? "bg-green-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        {r}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="h-52 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={isMobile ? { left: -30, right: -29 } : { left: 0, right: 0 }}>
                        <defs>
                            <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            tickFormatter={(d) =>
                                range === "1Y" || range === "3Y"
                                    ? format(new Date(d), "MMM yyyy")
                                    : format(new Date(d), "MMM d")
                            }
                            interval={Math.round(filteredData.length / 5)}
                            fontSize={13}
                        />
                        <YAxis fontSize={13} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#22c55e"
                            strokeWidth={2}
                            fill="url(#pulseGradient)"
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}


export default function ProjectAnalytics({ projectId }: { projectId: string }) {
    const { data: projectPulse, isLoading, error } = useGetAllDayProjectPulse(projectId);
    const [metrics, setMetrics] = useState<ProjectAnalyticsGraphProps[]>([]);

    useEffect(() => {
        if (projectPulse && projectPulse.length) {
            const pulses = projectPulse as ProjectPulse[];

            // Group by date (YYYY-MM-DD) and keep the latest createdAt
            const latestByDay = pulses.reduce<Record<string, ProjectPulse>>((acc, curr) => {
                const dayKey = new Date(curr.createdAt).toISOString().split("T")[0]; // YYYY-MM-DD
                if (!acc[dayKey] || new Date(curr.createdAt) > new Date(acc[dayKey].createdAt)) {
                    acc[dayKey] = curr;
                }
                return acc;
            }, {});

            // Step 2: Convert back to sorted array (oldest -> newest)
            let pulseData: ProjectPulse[] = Object.values(latestByDay).sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            console.log(pulseData);

            const pulseStartDate = new Date(pulseData[0].createdAt);
            const pulseEndDate = new Date(pulseData[pulseData.length - 1].createdAt);

            const diffDays = differenceInDays(pulseEndDate, pulseStartDate);

            // Step 3: Pad if less than 30 days
            if (diffDays < 30) {
                const missingDays = 30 - diffDays;
                const padded: ProjectPulse[] = [];
                for (let i = missingDays; i > 0; i--) {
                    padded.push({
                        id: `dummy-${i}`,
                        projectId: pulseData[0].projectId,
                        createdAt: subDays(pulseStartDate, i),
                        pulse: 0,
                        components: { cadence: 0, coverage: 0, engagement: 0, onTime: 0, planProgress: 0 },
                        thisWeekPostSummaries: { posts: 0, er: 0, impressions: 0, likes: 0, uniqueImpressions: 0 },
                        daysPosted: 0,
                        gapDays: 0,
                    });
                }
                pulseData = [...padded, ...pulseData];
            }

            // Step 4: Prepare metrics
            const metricsData = [
                { label: "Pulse", icon: Activity, color: "text-green-600 bg-green-100", data: pulseData.map(metric => ({ date: metric.createdAt, value: metric.pulse })) },
                { label: "Posts", icon: FileText, color: "text-blue-600 bg-blue-100", data: pulseData.map(metric => ({ date: metric.createdAt, value: metric.thisWeekPostSummaries.posts })) },
                { label: "Likes", icon: ThumbsUp, color: "text-green-600 bg-green-100", data: pulseData.map(metric => ({ date: metric.createdAt, value: metric.thisWeekPostSummaries.likes })) },
                { label: "Engagement", icon: MousePointerClick, color: "text-indigo-600 bg-indigo-100", data: pulseData.map(metric => ({ date: metric.createdAt, value: metric.components.engagement })) },
                { label: "Impressions", icon: BarChart2, color: "text-purple-600 bg-purple-100", data: pulseData.map(metric => ({ date: metric.createdAt, value: metric.thisWeekPostSummaries.impressions })) },
                { label: "Unique Impressions", icon: Users, color: "text-teal-600 bg-teal-100", data: pulseData.map(metric => ({ date: metric.createdAt, value: metric.thisWeekPostSummaries.uniqueImpressions })) },
            ];

            setMetrics(metricsData);
        }
    }, [projectPulse]);


    if (isLoading) return (
        <div className="flex flex-col gap-4">
            <div className="w-full h-80 p-4 border rounded-2xl animate-pulse shadow-sm bg-muted-foreground" />
            <div className="w-full h-80 p-4 border rounded-2xl animate-pulse shadow-sm bg-muted-foreground" />
        </div>
    )
    return (
        <div className="flex flex-col w-full gap-5 mt-5">
            {metrics.length ? metrics.map((metric) => {
                return (
                    <ProjectAnalyticsGraph key={metric.label} data={metric} />
                );
            })
                :
                <p className="text-base font-medium text-center">No metrics data found !</p>
            }
        </div>
    )
}
