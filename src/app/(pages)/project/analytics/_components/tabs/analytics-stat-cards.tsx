"use client";

import { MessageCircleMore, MousePointerClick, Send, ThumbsUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type StatCardProps = {
  icon: React.ReactNode;
  iconBgColor: string;
  label: string;
  value: number;
  showBorder?: boolean;
};

const StatCard = ({ icon, iconBgColor, label, value, showBorder = true }: StatCardProps) => (
  <div className={`flex gap-2 px-4 my-2 ${showBorder ? "border-r-2 border-secondary" : ""}`}>
    <div className={`w-fit h-fit rounded-full p-2 ${iconBgColor}`}>
      {icon}
    </div>
    <div className="flex flex-col gap-2">
      <p>{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  </div>
);

type AnalyticsStatCardsProps = {
  totalPosts: number;
  totalLikes: number;
  totalFollowers: number;
  totalImpressions: number;
  totalComments: number;
};

export const AnalyticsStatCards = ({
  totalPosts,
  totalLikes,
  totalFollowers,
  totalImpressions,
  totalComments,
}: AnalyticsStatCardsProps) => {
  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 border-2 border-secondary rounded-xl py-2 md:py-4">
      <StatCard
        icon={<Send className="w-5 h-5 stroke-blue-600" />}
        iconBgColor="bg-blue-100"
        label="Number of Posts"
        value={totalPosts}
      />
      <StatCard
        icon={<ThumbsUp className="w-5 h-5 stroke-green-600" />}
        iconBgColor="bg-green-100"
        label="Total Likes"
        value={totalLikes}
      />
      <StatCard
        icon={<Users className="w-5 h-5 stroke-teal-600" />}
        iconBgColor="bg-teal-100"
        label="Total Followers"
        value={totalFollowers}
      />
      <StatCard
        icon={<MousePointerClick className="w-5 h-5 stroke-purple-600" />}
        iconBgColor="bg-purple-100"
        label="Total Impressions"
        value={totalImpressions}
      />
      <StatCard
        icon={<MessageCircleMore className="w-5 h-5 stroke-pink-500" />}
        iconBgColor="bg-pink-100"
        label="Total Comments"
        value={totalComments}
        showBorder={false}
      />
    </div>
  );
};

export const AnalyticsStatCardsSkeleton = () => (
  <div className="w-full grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 border-2 border-secondary rounded-xl py-2 md:py-4">
    {Array.from({ length: 5 }).map((_, idx) => (
      <div
        key={idx}
        className={`flex gap-2 px-4 my-2 ${idx !== 4 ? "border-r-2 border-secondary" : ""}`}
      >
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-16 h-6" />
        </div>
      </div>
    ))}
  </div>
);
