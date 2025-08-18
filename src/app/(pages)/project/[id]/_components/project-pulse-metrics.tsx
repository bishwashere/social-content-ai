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
        coverage: number;
        planProgress: number;
    };
    thiwWeekPostSummaries: {
        posts: number;
        likes: number;
        impressions: number;
        uniqueImpressions: number;
        er: number;
    };
}

export default function ProjectPulseMetrics({ projectPulse }: { projectPulse: ProjectPulseProps }) {
    const metrics = [
        { label: "Pulse", value: `${projectPulse.pulse.toFixed(0)}%`, icon: Activity, color: "text-green-600 bg-green-100" },
        { label: "Streak", value: `${projectPulse.daysPosted} days`, icon: Flame, color: "text-orange-600 bg-orange-100" },
        { label: "No Posts", value: `${projectPulse.gapDays} days`, icon: CalendarX, color: "text-red-600 bg-red-100" },
        { label: "Posts(Week)", value: projectPulse.thiwWeekPostSummaries.posts, icon: FileText, color: "text-blue-600 bg-blue-100" },
        { label: "Impression", value: projectPulse.thiwWeekPostSummaries.impressions, icon: BarChart2, color: "text-purple-600 bg-purple-100" },
        { label: "Uniq. Imp.", value: projectPulse.thiwWeekPostSummaries.uniqueImpressions, icon: Users, color: "text-teal-600 bg-teal-100" },
        { label: "Eng. Rate", value: `${projectPulse.thiwWeekPostSummaries.er.toFixed(0)}%`, icon: Activity, color: "text-indigo-600 bg-indigo-100" },
        { label: "Cadence", value: projectPulse.components.cadence, icon: Clock, color: "text-pink-600 bg-pink-100" },
    ]

    return (
        <div className="grid grid-cols-4 xl:grid-cols-8 gap-1 xl:gap-3 w-full">
            {metrics.map(({ label, value, icon: Icon, color }) => (
                <Card
                    key={label}
                    className="flex flex-row items-center gap-1 p-1 sm:p-2 rounded-xl shadow-sm hover:shadow-md transition bg-white"
                >
                    <div className={`p-1.5 rounded-full ${color}`}>
                        <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-gray-500">{label}</span>
                        <span className="text-[10px] sm:text-xs font-semibold">{value}</span>
                    </div>
                </Card>
            ))}
        </div>
    )
}
