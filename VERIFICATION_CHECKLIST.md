# Verification Checklist for New Article Publishing

## ✅ Database (MongoDB) Verification

### 1. Article Status
- [x] Article must have `status: "published"` (not "draft")
- [x] Article must have `publishedAt` date set (not null)
- [x] Article must have valid `slug` (unique, URL-friendly)
- [x] Article must have `title`, `content`, `summary` fields populated

### 2. Database Query Logic
**Location**: `src/lib/blogs.ts`

- ✅ `getAllIdeas()` - Filters: `status: "published"`, Orders by: `publishedAt: "desc"`
- ✅ `getIdeaBySlug()` - Filters: `slug` AND `status: "published"`
- ✅ `getAllIdeaSlugs()` - Filters: `status: "published"`

**All queries correctly filter for published articles only.**

## ✅ Sitemap Verification

### 1. Ideas Sitemap (`/ideas-sitemap.xml`)
**Location**: `src/app/ideas-sitemap.ts`

- ✅ Uses `getAllIdeas()` which queries database directly
- ✅ Includes all published articles automatically
- ✅ Generates URL: `https://nextpostai.com/ideas/{slug}`
- ✅ Sets `lastModified` from `publishedAt` date
- ✅ Priority: 0.6, ChangeFrequency: "weekly"

### 2. Main Sitemap (`/sitemap.xml`)
**Location**: `src/app/sitemap.ts`

- ✅ References `/ideas-sitemap.xml`
- ✅ Includes `/ideas` page
- ✅ Listed in `robots.txt`

### 3. Robots.txt
**Location**: `src/app/robots.ts`

- ✅ References both sitemaps:
  - `https://nextpostai.com/sitemap.xml`
  - `https://nextpostai.com/ideas-sitemap.xml`

## ✅ Page Rendering Configuration

### 1. Ideas List Page (`/ideas`)
**Location**: `src/app/(pages)/ideas/page.tsx`

- ✅ **Dynamic Rendering**: `export const dynamic = 'force-dynamic'`
- ✅ **No Cache**: `export const revalidate = 0`
- ✅ Uses `getAllIdeas()` which queries database directly
- ✅ Will always show fresh data from MongoDB

### 2. Individual Article Page (`/ideas/[slug]`)
**Location**: `src/app/(pages)/ideas/[slug]/page.tsx`

- ✅ **Dynamic Rendering**: `export const dynamic = 'force-dynamic'`
- ✅ **No Cache**: `export const revalidate = 0`
- ✅ Uses `getIdeaBySlug()` which queries database directly
- ✅ Has `generateStaticParams()` for build-time optimization
- ✅ Will always show fresh data from MongoDB

### 3. Homepage (`/get`)
**Location**: `src/app/get/page.tsx`

- ✅ **Dynamic Rendering**: `export const dynamic = 'force-dynamic'`
- ✅ **No Cache**: `export const revalidate = 0`
- ✅ Uses `getRecentIdeas()` which calls `getAllIdeas()`
- ✅ Will always show fresh data from MongoDB

## ✅ Automatic Revalidation

### 1. When Creating New Article
**Location**: `src/app/api/ideas/route.ts` (POST)

- ✅ Revalidates when `status === "published"`
- ✅ Revalidates paths:
  - `/ideas`
  - `/ideas/{slug}`
  - `/ideas-sitemap.xml`
  - `/sitemap.xml`
  - `/get`
  - `/`

### 2. When Updating Article
**Location**: `src/app/api/ideas/[id]/route.ts` (PUT)

- ✅ Revalidates when status changes to "published"
- ✅ Revalidates when published article is updated
- ✅ Revalidates when slug changes (both old and new)
- ✅ Revalidates all same paths as creation

### 3. When Deleting Article
**Location**: `src/app/api/ideas/[id]/route.ts` (DELETE)

- ✅ Revalidates if deleted article was published
- ✅ Revalidates all same paths

## ⚠️ Potential Issues Found

### Issue 1: PUT Route Revalidation Logic
**Current Logic**: Only revalidates if `isNowPublished || (wasPublished && slugChanged)`

**Problem**: If a published article is updated (content, title, etc.) but stays published and slug doesn't change, it won't revalidate.

**Fix Needed**: Should also revalidate when `wasPublished && isNowPublished` (article stays published but is updated).

### Issue 2: Static Generation vs Dynamic
- ✅ **FIXED**: All pages now use `dynamic = 'force-dynamic'` and `revalidate = 0`
- ✅ Pages will always fetch fresh data from database

## ✅ Summary

### What Works:
1. ✅ Database queries correctly filter for published articles
2. ✅ Sitemaps query database directly (always fresh)
3. ✅ All pages use dynamic rendering (no static cache)
4. ✅ Revalidation triggers on publish/update/delete
5. ✅ Robots.txt correctly references sitemaps

### What Needs Fix:
1. ⚠️ PUT route should revalidate when published article is updated (even if status/slug unchanged)
