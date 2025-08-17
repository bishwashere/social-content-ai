"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import React from 'react'
import { All } from "./all"
import { Facebook } from "./facebook"
import { Linkedin } from "./linkedin"
import { Threads } from "./threads"

const AnalyticsTabs = () => {
  return (
    <Tabs defaultValue="all" className="p-3 sm:p-8">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="Facebook">Facebook</TabsTrigger>
        <TabsTrigger value="Linkedin">Linkedin</TabsTrigger>
        <TabsTrigger value="Threads">Threads</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <All />
      </TabsContent>
      <TabsContent value="Facebook">
        <Facebook />
      </TabsContent>
      <TabsContent value="Linkedin">
        <Linkedin />
      </TabsContent>
      <TabsContent value="Threads">
        <Threads />
      </TabsContent>
    </Tabs>
  )
}

export { AnalyticsTabs }