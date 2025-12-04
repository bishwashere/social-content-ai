import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import type { IdeaPost } from "@/lib/blogs"

interface MinimalIdeaCardProps {
  idea: IdeaPost
}

export function MinimalIdeaCard({ idea }: MinimalIdeaCardProps) {
  // Calculate reading time (approximate)
  const wordCount = idea.content.split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200)

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <Link href={`/ideas/${idea.slug}`}>
        <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl">📝</div>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              {new Date(idea.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Clock className="w-3 h-3" />
              {readingTime} min
            </Badge>
          </div>

          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {idea.title}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-3">{idea.summary}</p>
        </CardContent>
      </Link>
    </Card>
  )
}
