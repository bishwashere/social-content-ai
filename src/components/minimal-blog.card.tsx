import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import type { BlogPost } from "@/lib/blogs"

interface MinimalBlogCardProps {
  blog: BlogPost
}

export function MinimalBlogCard({ blog }: MinimalBlogCardProps) {
  const readingTime = Math.ceil(blog.content.replace(/<[^>]*>/g, "").split(" ").length / 200)

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <Link href={`/blogs/${blog.slug}`}>
        {/* Thumbnail */}
        {blog.thumbnail && (
          <div className="relative h-48 overflow-hidden">
            <Image
              src={blog.thumbnail || "/placeholder.svg"}
              alt={blog.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        <CardContent className="p-4">
          {/* Meta Information */}
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              {new Date((blog as any).publishedAt || (blog as any).date || new Date()).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Clock className="w-3 h-3" />
              {readingTime} min
            </Badge>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {blog.title}
          </h3>
        </CardContent>
      </Link>
    </Card>
  )
}
