import { Card } from "@/components/ui/card"
import { Activity, Flame, CalendarX, FileText, BarChart2, Users, Clock } from "lucide-react"

type ProjectPulseProps = {
    daysPosted: number;
    gapDays: number;
    pulse: number;
    components: {
        cadence: number;
        onTime: number;
        engagement: number;
        consistency: number;
        successRate: number;
        coverage: number;
        platformDiversity: number;
        planProgress: number;
    };
    thiwWeekPostSummaries: {
        posts: number;
        noPosts: number;
        likes: number;
        impressions: number;
        uniqueImpressions: number;
        er: number;
    };
}

export default function ProjectPulseMetrics({ projectPulse }: { projectPulse: ProjectPulseProps }) {
    const metrics = [
        { label: "Pulse", value: `${projectPulse.pulse.toFixed(0)}%`, icon: Activity, color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30" },
        { label: "Streak", value: `${projectPulse.daysPosted} days`, icon: Flame, color: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30" },
        { label: "Posts(Week)", value: projectPulse.thiwWeekPostSummaries.posts, icon: FileText, color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30" },
        { label: "No Posts", value: `${projectPulse.thiwWeekPostSummaries.noPosts} days`, icon: CalendarX, color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30" },
        { label: "Impression", value: projectPulse.thiwWeekPostSummaries.impressions, icon: BarChart2, color: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30" },
        { label: "Uniq. Imp.", value: projectPulse.thiwWeekPostSummaries.uniqueImpressions, icon: Users, color: "text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/30" },
        { label: "Eng. Rate", value: `${projectPulse.thiwWeekPostSummaries.er.toFixed(0)}%`, icon: Activity, color: "text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30" },
        { label: "Cadence", value: Math.ceil(projectPulse.components.cadence), icon: Clock, color: "text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30" },
    ]

    return (
        <div className="grid grid-cols-4 xl:grid-cols-8 gap-1 xl:gap-3 w-full">
            {metrics.map(({ label, value, icon: Icon, color }) => (
                <Card
                    key={label}
                    className="flex flex-row items-center gap-1 p-1 sm:p-2 rounded-xl shadow-sm hover:shadow-md transition bg-white dark:bg-muted"
                >
                    <div className={`p-1.5 rounded-full ${color}`}>
                        <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-gray-500 dark:text-muted-foreground">{label}</span>
                        <span className="text-[10px] sm:text-xs font-semibold dark:text-foreground">{value}</span>
                    </div>
                </Card>
            ))}
        </div>
    )
}
