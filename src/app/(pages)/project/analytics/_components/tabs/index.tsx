"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import React from 'react'
import { All } from "./all"
import { Facebook } from "./facebook"

const AnalyticsTabs = () => {
  return (
    <Tabs defaultValue="all" className="p-8">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="Facebook">Facebook</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <All />
      </TabsContent>
      <TabsContent value="Facebook">
        <Facebook />
      </TabsContent>
    </Tabs>
  )
}

export { AnalyticsTabs }