import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import { IdeaPost } from "@/lib/blogs"

interface IdeaCardProps {
  idea: IdeaPost
  featured?: boolean
}

export function IdeaCard({ idea, featured = false }: IdeaCardProps) {
  const cardClass = featured
    ? "group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-muted/30 via-muted/20 to-muted/10 shadow-md"
    : "group hover:shadow-lg transition-all duration-300"

  // Calculate reading time (approximate)
  const wordCount = idea.content.split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200)

  return (
    <Link href={`/ideas/${idea.slug}`} className="block h-full">
      <Card className={`${cardClass} w-full h-full cursor-pointer overflow-hidden`}>
        {idea.thumbnail && (
          <div className={`relative overflow-hidden ${featured ? "h-64" : "h-48"}`}>
            <Image
              src={idea.thumbnail || "/placeholder.svg"}
              alt={idea.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}
        <CardHeader className={featured ? "p-6" : "p-4"}>
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(idea.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
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
            className={`line-clamp-2 group-hover:text-primary transition-colors ${featured ? "text-2xl" : "text-xl"}`}
          >
            {idea.title}
          </CardTitle>

          <CardDescription className={`${featured ? "line-clamp-4 text-base" : "line-clamp-3 text-sm"}`}>
            {idea.summary}
          </CardDescription>
        </CardHeader>

        <CardContent className={featured ? "px-6 pb-6" : "px-4 pb-4"}>
          <div className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors group">
            Read more
            <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
