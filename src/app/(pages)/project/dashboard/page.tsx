import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectDashboard from "./_components/project-dashboard";
import CalendarView from "./_components/calendar-view";

export default function DashboardPage() {
  return (
    <main className="flex  max-w-4xl mx-auto items-center justify-center w-full">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><ProjectDashboard /></TabsContent>
        <TabsContent value="calendar"><CalendarView /></TabsContent>
      </Tabs>
    </main>
  );
}
