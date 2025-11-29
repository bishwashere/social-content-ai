"use client"

import React from 'react'
import QuickVideoMaker from './_components/quick-video-maker'

const VideoMakerPage = () => {
  return (
    <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto py-8 px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Quick Video Maker</h1>
        <p className="text-muted-foreground mt-2">
          Create engaging videos in 3 simple steps. No project setup required!
        </p>
      </div>
      <QuickVideoMaker />
    </div>
  )
}

export default VideoMakerPage

