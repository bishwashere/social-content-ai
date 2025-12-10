import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getAllIdeas } from "@/lib/blogs"
import { BookOpen } from "lucide-react"
import { IdeaCard } from "@/components/idea-card"
import { IdeasHeader } from "./_components/ideas-header"
import Footer from "@/components/footer"

// Force dynamic rendering to always fetch fresh data from database
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function IdeasPage() {
  const ideas = await getAllIdeas()

  return (
    <div className="min-h-screen bg-background">
      {/* Header similar to /project */}
      <IdeasHeader />

      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Page Title */}
        <header className="mb-6 md:mb-12">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3 md:mb-4">Ideas to Help You Grow</h1>
            <p className="text-base md:text-xl text-muted-foreground leading-relaxed">
              Practical articles, guides, and ideas to help you market your product with confidence.
            </p>
          </div>
        </header>

        {/* Ideas Grid */}
        {ideas.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-6">No published ideas yet. Create your first idea from the admin panel!</p>
              <Button asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {ideas.map((idea, index) => (
                <div
                  key={idea.slug}
                  className={index === 0 ? "md:col-span-2 lg:col-span-2" : ""}
                >
                  <IdeaCard idea={idea} featured={index === 0} />
                </div>
              ))}
            </div>

            <div className="text-center mt-8 md:mt-16">
              <p className="text-muted-foreground">
                Showing {ideas.length} {ideas.length === 1 ? "post" : "posts"}
              </p>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
