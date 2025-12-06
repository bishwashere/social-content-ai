"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Trash2 } from "lucide-react"
import { IdeaPost } from "@/lib/blogs"
import { useEffect, useState } from "react"
import Cookies from "js-cookie"
import { IDEAS_ADMIN_TOKEN_COOKIE_NAME } from "@/constants/common"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface IdeaCardProps {
  idea: IdeaPost
  featured?: boolean
}

export function IdeaCard({ idea, featured = false }: IdeaCardProps) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check if admin is logged in
  useEffect(() => {
    const checkAdminAuth = async () => {
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || 
                   (typeof window !== 'undefined' ? localStorage.getItem("nextpostai_ideas_admin_token") : null) || 
                   ""
      
      if (!token) {
        setIsAdmin(false)
        setIsCheckingAuth(false)
        return
      }

      try {
        const response = await fetch("/api/ideas/admin/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        
        const result = await response.json()
        if (response.ok && result.data?.authenticated) {
          setIsAdmin(true)
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
        console.error("Error checking admin auth:", error)
        setIsAdmin(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAdminAuth()
  }, [])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || 
                   (typeof window !== 'undefined' ? localStorage.getItem("nextpostai_ideas_admin_token") : null) || 
                   ""

      const response = await fetch(`/api/ideas/${idea.slug}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to delete idea")
      }

      toast.success("Idea deleted successfully")
      setShowDeleteDialog(false)
      // Refresh the page to show updated list
      router.refresh()
    } catch (error) {
      console.error("Error deleting idea:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete idea")
    } finally {
      setIsDeleting(false)
    }
  }

  const cardClass = featured
    ? "group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-muted/30 via-muted/20 to-muted/10 shadow-md"
    : "group hover:shadow-lg transition-all duration-300"

  // Calculate reading time (approximate)
  const wordCount = idea.content.split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200)

  return (
    <>
      <div className="relative h-full">
        <Link href={`/ideas/${idea.slug}`} className="block h-full">
          <Card className={`${cardClass} w-full h-full cursor-pointer overflow-hidden`}>
            {idea.thumbnail && (
              <div className={`relative overflow-hidden ${featured ? "h-48 md:h-64" : "h-40 md:h-48"}`}>
                <Image
                  src={idea.thumbnail || "/placeholder.svg"}
                  alt={idea.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            )}
            <CardHeader className={featured ? "p-3 md:p-6" : "p-3 md:p-4"}>
              <div className="flex items-center gap-4 mb-2 md:mb-3 flex-wrap">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(idea.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  <Clock className="w-3 h-3" />
                  {readingTime} min read
                </Badge>
                {idea.tags && idea.tags.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {idea.tags[0]}
                  </Badge>
                )}
              </div>

              <CardTitle
                className={`line-clamp-2 group-hover:text-primary transition-colors ${featured ? "text-lg md:text-2xl" : "text-lg md:text-xl"}`}
              >
                {idea.title}
              </CardTitle>

              <CardDescription className={`${featured ? "line-clamp-4 text-sm md:text-base" : "line-clamp-3 text-xs md:text-sm"} mt-1 md:mt-2`}>
                {idea.summary}
              </CardDescription>
            </CardHeader>

            <CardContent className={featured ? "px-3 pb-3 md:px-6 md:pb-6" : "px-3 pb-3 md:px-4 md:pb-4"}>
              <div className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors group text-sm md:text-base">
                Read more
                <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        {/* Delete button - only show when admin is logged in */}
        {!isCheckingAuth && isAdmin && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 z-10 shadow-lg"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowDeleteDialog(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Idea</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{idea.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
