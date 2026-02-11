# Automatic Revalidation When Publishing Ideas

## Overview
When an idea/article is published (status changes from "draft" to "published"), the system now automatically revalidates all relevant pages and sitemaps to ensure the new content appears immediately.

## What Gets Revalidated

### 1. **Sitemaps** (Automatic)
- `/sitemap.xml` - Main sitemap
- `/ideas-sitemap.xml` - Ideas-specific sitemap
- Both sitemaps use `getAllIdeas()` which queries the database, so they automatically include new published articles

### 2. **Page Routes** (On-Demand Revalidation)
When an article is published, the following paths are revalidated:

- `/ideas` - Ideas listing page
- `/ideas/[slug]` - Individual article page (both old and new slug if changed)
- `/get` - Homepage that displays recent ideas
- `/` - Root homepage (if it shows ideas)

### 3. **Static Generation**
- The `/ideas/[slug]` page uses `generateStaticParams()` for static generation
- When a new article is published, `revalidatePath()` triggers on-demand revalidation
- The page will be regenerated on the next request

## Implementation Details

### API Routes Updated

1. **POST `/api/ideas`** - Creating new ideas
   - Revalidates paths when `status === "published"`

2. **PUT `/api/ideas/[id]`** - Updating ideas
   - Revalidates paths when:
     - Status changes to "published"
     - Slug changes (revalidates both old and new slug)
     - Published article is updated

3. **DELETE `/api/ideas/[id]`** - Deleting ideas
   - Revalidates paths if the deleted idea was published

### Revalidation Logic

```typescript
// Revalidate when article is published
if (status === "published" || wasPublished) {
  revalidatePath("/ideas");
  revalidatePath(`/ideas/${slug}`);
  revalidatePath("/ideas-sitemap.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/get");
  revalidatePath("/");
}
```

## How It Works

1. **User publishes an article** via admin panel
2. **API route updates database** with `status: "published"`
3. **`revalidatePath()` is called** for all relevant paths
4. **Next.js invalidates cached pages** for those paths
5. **On next request**, pages are regenerated with fresh data from database
6. **Sitemaps are regenerated** automatically (they query database directly)

## Testing

To verify revalidation works:

1. Create a draft article
2. Publish it (change status to "published")
3. Check `/ideas` - should show new article
4. Check `/ideas/[slug]` - should be accessible
5. Check `/ideas-sitemap.xml` - should include new article
6. Check `/sitemap.xml` - should reference updated ideas sitemap
7. Check homepage - should show in recent ideas if applicable

## Notes

- Revalidation happens **automatically** - no manual steps required
- Pages are regenerated **on-demand** when first accessed after revalidation
- Sitemaps are **always fresh** since they query the database directly
- Old slug pages are revalidated when slug changes to ensure 404s are handled correctly
