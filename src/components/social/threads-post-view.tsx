"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScheduledPost } from "@prisma/client"
import { Heart, MessageCircle, Repeat2, Send, MoreHorizontal, Volume2, VolumeX } from "lucide-react"
import { useState } from "react"
import EditableContent from "./editable-content"
import { ViewMedia } from "./view-media"

type Props = {
  post: ScheduledPost;
  viewContentEdit: string[];
  setViewContentEdit: React.Dispatch<React.SetStateAction<string[]>>
}

export function ThreadsPost({ post, viewContentEdit, setViewContentEdit }: Props) {
  const [isLiked, setIsLiked] = useState(false)

  return (
    <div className="bg-white text-black p-4 border rounded-md shadow-md border-gray-200 w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src="https://randomuser.me/api/portraits/women/60.jpg" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Your Name</span>
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-gray-400 text-sm">22h</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="mb-3 space-y-3">
        <EditableContent id={post.id} media={post.media} content={post.content} viewContentEdit={viewContentEdit} setViewContentEdit={setViewContentEdit} />

        <ViewMedia post={post} showMedia={!viewContentEdit.includes(post.id)} />
      </div>

      {/* Engagement Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center gap-2 p-0 h-auto ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-500"
              }`}
            onClick={() => setIsLiked(!isLiked)}
          >
            <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            <span className="text-sm">72</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 p-0 h-auto text-gray-400 hover:text-white"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">3</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 p-0 h-auto text-gray-400 hover:text-white"
          >
            <Repeat2 className="w-5 h-5" />
            <span className="text-sm">1</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 p-0 h-auto text-gray-400 hover:text-white"
          >
            <Send className="w-5 h-5" />
            <span className="text-sm">24</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
