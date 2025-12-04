import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { getAllIdeas } from "@/lib/blogs"
import { BookOpen } from "lucide-react"
import { IdeaCard } from "@/components/idea-card"

export default async function IdeasPage() {
  const ideas = await getAllIdeas()

  return (
    <div className="min-h-screen bg-background">
      {/* Header similar to /project */}
      <div className="w-full px-4 border-b h-fit relative overflow-hidden flex items-center justify-center">
        <div className="flex h-16 items-center justify-between bg-background w-full md:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <Image
                src="/logo.png"
                width="100"
                height="100"
                alt="NextPostAI"
                className="size-6"
              />
              <span className="font-semibold text-lg">NextPostAI</span>
            </Link>
            <span className="text-muted-foreground mx-2">/</span>
            <span className="text-muted-foreground">Ideas</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <header className="mb-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">All Ideas</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Browse through all our articles, tutorials, and thoughts.
            </p>
          </div>
        </header>

        {/* Ideas Grid */}
        {ideas.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-6">Add some MDX files to content/ideas/ to get started!</p>
              <Button asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {ideas.map((idea, index) => (
                <div
                  key={idea.slug}
                  className={index === 0 ? "md:col-span-2 lg:col-span-2" : ""}
                >
                  <IdeaCard idea={idea} featured={index === 0} />
                </div>
              ))}
            </div>

            <div className="text-center mt-16">
              <p className="text-muted-foreground">
                Showing {ideas.length} {ideas.length === 1 ? "post" : "posts"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
