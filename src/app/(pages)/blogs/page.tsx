import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BlogCard } from "@/components/blog-card"
import { getAllBlogs } from "@/lib/blogs"
import { ArrowLeft, BookOpen } from "lucide-react"

export default async function BlogsPage() {
  const blogs = await getAllBlogs()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-12">
          <Button asChild variant="ghost" className="mb-6 -ml-4">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>

          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">All Blog Posts</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Browse through all our articles, tutorials, and thoughts.
            </p>
          </div>
        </header>

        {/* Blog Posts Grid */}
        {blogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-6">Add some markdown files to /contents/blogs/ to get started!</p>
              <Button asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => (
                <BlogCard key={blog.slug} blog={blog} />
              ))}
            </div>

            <div className="text-center mt-16">
              <p className="text-muted-foreground">
                Showing {blogs.length} {blogs.length === 1 ? "post" : "posts"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
