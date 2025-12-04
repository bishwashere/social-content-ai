import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import { BlogPost } from "@/lib/blogs"

interface BlogCardProps {
  blog: BlogPost
  featured?: boolean
}

export function BlogCard({ blog, featured = false }: BlogCardProps) {
  const cardClass = featured
    ? "group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-background to-muted/20"
    : "group hover:shadow-lg transition-all duration-300"

  return (
    <Card className={cardClass}>
      {blog.thumbnail && (
        <div className={`relative overflow-hidden ${featured ? "h-64" : "h-48"}`}>
          <Image
            src={blog.thumbnail || "/placeholder.svg"}
            alt={blog.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      <CardHeader className={featured ? "p-6" : "p-4"}>
        <div className="flex items-center gap-4 mb-3">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date((blog as any).publishedAt || (blog as any).date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {Math.ceil(blog.content.replace(/<[^>]*>/g, "").split(" ").length / 200)} min read
          </Badge>
        </div>

        <CardTitle
          className={`line-clamp-2 group-hover:text-primary transition-colors ${featured ? "text-2xl" : "text-xl"}`}
        >
          <Link href={`/blogs/${blog.slug}`}>{blog.title}</Link>
        </CardTitle>

        <CardDescription className={`line-clamp-3 ${featured ? "text-base" : "text-sm"}`}>
          {blog.summary}
        </CardDescription>
      </CardHeader>

      <CardContent className={featured ? "px-6 pb-6" : "px-4 pb-4"}>
        <Link
          href={`/blogs/${blog.slug}`}
          className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors group"
        >
          Read more
          <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </CardContent>
    </Card>
  )
}
