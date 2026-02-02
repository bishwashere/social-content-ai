"use client";
import CalendarView from "./_components/calendar-view";

export default function DashboardPage() {
  return (
    <main className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto py-8 px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
      <CalendarView />
    </main>
  );
}
