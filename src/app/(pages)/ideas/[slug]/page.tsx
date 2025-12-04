import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getIdeaBySlug, getAllIdeaSlugs, getAllIdeas } from "@/lib/blogs"
import { ArrowLeft, Calendar, Clock, Share2, ArrowRight } from "lucide-react"
import { MDXRemote } from "next-mdx-remote/rsc"
import { IdeaCard } from "@/components/idea-card"
import { IdeaHeader } from "../_components/idea-header"

interface IdeaPageProps {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  const slugs = await getAllIdeaSlugs()
  return slugs.map((slug) => ({
    slug,
  }))
}

export default async function IdeaPage({ params }: IdeaPageProps) {
  const idea = await getIdeaBySlug(params.slug)

  if (!idea) {
    notFound()
  }

  // Get related posts (exclude current post, show 3 most recent)
  const allIdeas = await getAllIdeas()
  const relatedIdeas = allIdeas
    .filter((i) => i.slug !== idea.slug)
    .slice(0, 3)

  // Calculate reading time from content (approximate)
  // For MDX, we need to count words differently - remove MDX syntax
  const plainText = idea.content.replace(/[#*`\[\](){}]/g, " ").replace(/\s+/g, " ")
  const wordCount = plainText.split(/\s+/).filter(Boolean).length
  const readingTime = Math.ceil(wordCount / 200)

  return (
    <div className="min-h-screen bg-background">
      {/* Header similar to /ideas */}
      <IdeaHeader slug={idea.slug} title={idea.title} />

      <div className="container mx-auto px-4 py-8">
        <article className="max-w-4xl mx-auto">
          {/* Navigation */}
          <Button asChild variant="ghost" className="mb-8 -ml-4">
            <Link href="/ideas">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Posts
            </Link>
          </Button>

          {/* Article Header */}
          <header className="mb-8 dark:bg-muted/50 dark:rounded-lg dark:p-6">
            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(idea.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readingTime} min read
              </Badge>
              {idea.tags && idea.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {idea.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <Button variant="ghost" size="sm" className="ml-auto">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Title */}
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight">{idea.title}</h1>

            {/* Summary */}
            {idea.summary && (
              <p className="text-xl text-muted-foreground leading-relaxed mb-8 border-l-4 border-primary pl-6">
                {idea.summary}
              </p>
            )}

            <Separator className="mb-8" />
          </header>

          {/* Article Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none dark:bg-muted/50 dark:rounded-lg dark:p-6
                       prose-headings:scroll-m-20 prose-headings:tracking-tight 
                       prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6 prose-h1:mt-8
                       prose-h2:text-3xl prose-h2:font-semibold prose-h2:mb-4 prose-h2:mt-8 prose-h2:border-b prose-h2:pb-2
                       prose-h3:text-2xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6
                       prose-h4:text-xl prose-h4:font-medium prose-h4:mb-2 prose-h4:mt-4
                       prose-p:leading-7 prose-p:mb-4
                       prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:underline prose-a:font-medium
                       prose-blockquote:border-l-primary prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-muted-foreground
                       prose-code:relative prose-code:rounded prose-code:bg-muted prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm
                       prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-4 prose-pre:border
                       prose-ul:my-4 prose-ol:my-4 prose-li:my-1
                       prose-table:my-6 prose-th:border prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold
                       prose-td:border prose-td:px-4 prose-td:py-2
                       prose-img:rounded-lg prose-img:shadow-md">
            <MDXRemote source={idea.content} />
          </div>

          {/* Article Footer */}
          <footer className="mt-16 pt-8 border-t">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Published on{" "}
                {new Date(idea.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/ideas">More Posts</Link>
                </Button>
                <Button asChild>
                  <Link href="/">Home</Link>
                </Button>
              </div>
            </div>
          </footer>
        </article>

        {/* Related Posts Section */}
        {relatedIdeas.length > 0 && (
          <section className="mt-16 pt-8 border-t">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Related Posts</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/ideas">
                  View All
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedIdeas.map((relatedIdea) => (
                <IdeaCard key={relatedIdea.slug} idea={relatedIdea} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
