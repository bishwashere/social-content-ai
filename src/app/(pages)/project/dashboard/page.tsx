"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectDashboard from "./_components/project-dashboard";
import CalendarView from "./_components/calendar-view";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [defaultTab, setDefaultTab] = useState<string>();
  useEffect(() => {
    const defaultLocalTab = localStorage.getItem("contentPlannerTab");
    setDefaultTab(defaultLocalTab || "dashboard");
  }, [])

  if (defaultTab)
    return (
      <main className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto py-8 px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard" onClick={() => localStorage.setItem("contentPlannerTab", "dashboard")}>Dashboard</TabsTrigger>
            <TabsTrigger value="calendar" onClick={() => localStorage.setItem("contentPlannerTab", "calendar")}>Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard"><ProjectDashboard /></TabsContent>
          <TabsContent value="calendar"><CalendarView /></TabsContent>
        </Tabs>
      </main>
    );
}
