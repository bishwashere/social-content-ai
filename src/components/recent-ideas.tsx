import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getRecentIdeas } from "@/lib/blogs"
import { ArrowRight, BookOpen } from "lucide-react"
import { MinimalIdeaCard } from "./minimal-idea.card"

export async function RecentIdeas() {
  const recentIdeas = await getRecentIdeas(3)
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Insights & Ideas</h2>
        </div>

        {recentIdeas.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-6">
                Add some MDX files to content/ideas/ to get started!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {recentIdeas.map((idea) => (
              <MinimalIdeaCard key={idea.slug} idea={idea} />
            ))}
          </div>
        )}

        {recentIdeas.length > 0 && (
          <div className="text-center mt-12">
            <Button asChild variant="outline" size="lg">
              <Link href="/ideas">
                See all
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
