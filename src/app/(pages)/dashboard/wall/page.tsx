"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SocialFeed from "@/components/common/social-feed";
import TemplatesPage from "../templates/page";

export default function WallPage() {
  const [activeTab, setActiveTab] = useState("for-you");

  return (
    <main className="flex h-full flex-col items-center justify-center w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
        <div className="w-full max-w-7xl 2xl:max-w-[90%] mx-auto px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
          <TabsList className="mb-6">
            <TabsTrigger value="for-you">For You</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="for-you" className="w-full h-full mt-0">
          <SocialFeed />
        </TabsContent>
        <TabsContent value="templates" className="w-full h-full mt-0">
          <TemplatesPage />
        </TabsContent>
      </Tabs>
    </main>
  );
}
