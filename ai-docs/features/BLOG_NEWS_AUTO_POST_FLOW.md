# Blog News Auto-Post Flow - Complete Guide

## Overview

The Blog News auto-post system uses a **4-step pipeline** to automatically generate blog posts from Reddit/HackerNews articles and publish them to social media platforms. The system is triggered by a cron job that runs periodically.

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SCHEDULING (Initial Setup)                                   │
│    scheduleCampaignTasks() creates ScheduledPost records        │
│    with platform="webhook" and meta.type="blog-news"            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. CRON TRIGGER                                                  │
│    GET /api/post (runs periodically via cron)                   │
│    - Finds pending posts where date <= now + 1 hour            │
│    - Filters Blog News posts (platform="webhook")               │
│    - Triggers Step 1 for each Blog News post                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Fetch Article                                           │
│ POST /api/blog/step-1-fetch-article                             │
│                                                                  │
│ What it does:                                                   │
│ 1. Validates post exists and has blog-news metadata             │
│ 2. Fetches article from Reddit/HackerNews (with duplicate      │
│    detection) using fetchArticleForTopics()                     │
│ 3. Stores article in post.meta.article                          │
│ 4. Sets meta.step1Completed = true                              │
│ 5. Triggers Step 2 (asynchronously)                             │
│                                                                  │
│ APIs/Functions Used:                                            │
│ - fetchArticleForTopics() from blog-news.ts                    │
│   → Calls fetchRedditPosts() or fetchHackerNewsPosts()         │
│   → Checks for duplicates using getUsedArticleIds()             │
│                                                                  │
│ Timeout: 9 seconds                                              │
│ Stores: post.meta.article, post.meta.step1Completed             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Generate Blog                                            │
│ POST /api/blog/step-2-generate                                  │
│                                                                  │
│ What it does:                                                   │
│ 1. PRECONDITION: Checks meta.step1Completed && meta.article    │
│    - If missing, retries Step 1 (or marks failed if >5min)     │
│ 2. Validates user has 3 coins (requiredCoins = 3)               │
│ 3. Generates blog using Gemini AI with angles                   │
│ 4. Deducts 3 coins from user                                    │
│ 5. Stores blog in CampaignChat.contents.blog                   │
│ 6. Stores blog in post.meta.blog                                │
│ 7. Sets meta.step2Completed = true                              │
│ 8. Triggers Step 3 (asynchronously)                             │
│                                                                  │
│ APIs/Functions Used:                                            │
│ - generateBlogFromArticle() from blog-news.ts                  │
│   → Uses GoogleGenerativeAI (Gemini 2.0 Flash)                 │
│   → Handles API key rotation (GEMINI_API_KEY, _1, _2)           │
│   → Manages exhausted keys via GeminiApiKeyState table         │
│                                                                  │
│ Timeout: 9 seconds                                              │
│ Stores: CampaignChat.contents.blog, post.meta.blog,              │
│          post.meta.step2Completed                               │
│ Deducts: 3 coins from user.remainingChatGenerations            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Send Webhook                                             │
│ POST /api/blog/step-3-send-webhook                              │
│                                                                  │
│ What it does:                                                   │
│ 1. PRECONDITION: Checks meta.step2Completed && meta.blog       │
│    - If missing, retries Step 2 (or marks failed if >10min)    │
│ 2. Sends blog to webhook URL (from metadata)                    │
│ 3. Extracts articleUrl from webhook response                    │
│ 4. Updates CampaignChat.contents.blog with:                     │
│    - articleUrl (from webhook response)                         │
│    - webhookSent (true/false)                                   │
│    - webhookUrl                                                 │
│ 5. Stores articleUrl in post.meta.articleUrl                    │
│ 6. Sets meta.step3Completed = true                              │
│ 7. Triggers Step 4 (asynchronously)                              │
│                                                                  │
│ APIs/Functions Used:                                           │
│ - sendBlogToWebhook() from blog-news.ts                        │
│   → Makes axios.post() to webhook URL                           │
│   → Sends: { day, blog: { title, content, tags }, timestamp }  │
│   → Extracts articleUrl from response.data.data.articleUrl      │
│                                                                  │
│ Timeout: 9 seconds                                              │
│ Stores: CampaignChat.contents.blog.articleUrl,                 │
│          CampaignChat.contents.blog.webhookSent,               │
│          post.meta.articleUrl, post.meta.step3Completed         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Finalize - Create Platform Posts                        │
│ POST /api/blog/step-4-finalize                                   │
│                                                                  │
│ What it does:                                                   │
│ 1. PRECONDITION: Checks meta.step3Completed && meta.articleUrl │
│    - If missing, retries Step 3 (or marks failed if >5min)      │
│ 2. IDEMPOTENCY: Checks if platform posts already exist          │
│    - If yes, skips creation and marks as success                │
│ 3. Generates social excerpt from blog content                   │
│ 4. Creates ScheduledPost records for each platform:            │
│    - Twitter, Facebook, LinkedIn, Threads, Reddit, etc.        │
│    - Content: excerpt + "Read more: {articleUrl}"               │
│    - Scheduled for: post.date + 1 minute                        │
│ 5. Sets meta.step4Completed = true                              │
│ 6. Marks original Blog News post as "success"                   │
│                                                                  │
│ APIs/Functions Used:                                           │
│ - generateSocialExcerpt() from blog-news.ts                     │
│   → Creates 1-2 line excerpt from blog title + content         │
│ - schedulePost() from schedule-post.ts                         │
│   → Creates ScheduledPost for each platform                    │
│   → Links via meta.blogNewsPostId = original postId             │
│                                                                  │
│ Timeout: 9 seconds                                              │
│ Creates: Multiple ScheduledPost records (one per platform)      │
│ Stores: post.meta.step4Completed, post.status = "success"      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. PLATFORM POSTS PROCESSING                                    │
│    The platform posts created in Step 4 are processed          │
│    by the same /api/post cron job when their date arrives       │
│    - They are posted to Twitter, Facebook, LinkedIn, etc.       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Step-by-Step Details

### **Initial Scheduling** (One-time setup)

**Function**: `scheduleCampaignTasks()` in `campaign-planner/index.ts`

**What happens**:
- Creates `ScheduledPost` records for each day in the campaign
- Each post has:
  - `platform: "webhook"` (special identifier)
  - `status: "pending"`
  - `meta.type: "blog-news"`
  - `meta.campaignId`, `meta.day`, `meta.topics`, `meta.angles`, `meta.webhook`, `meta.platforms`
  - `date`: Calculated as `campaign.startDate + (day - 1) days` at the specified `autoPostTime`

---

### **Cron Trigger** (Periodic)

**Endpoint**: `GET /api/post` (runs via cron job)

**What happens**:
1. Finds all `ScheduledPost` records where:
   - `status = "pending"`
   - `date <= now + 1 hour`
2. Filters Blog News posts: `platform = "webhook"` OR `meta.type = "blog-news"`
3. For each Blog News post:
   - Checks idempotency (skips if blog already exists)
   - Updates status to `"processing"`
   - Triggers Step 1 by calling `/api/blog/step-1-fetch-article`

**Stuck Recovery**:
- Also checks for posts stuck in `"processing"` for >10 minutes
- Retries the appropriate step based on last completed step
- Marks as failed if stuck >30 minutes

---

### **Step 1: Fetch Article**

**Endpoint**: `POST /api/blog/step-1-fetch-article`

**Request Body**:
```json
{
  "postId": "scheduled-post-id"
}
```

**Process**:
1. Validates post exists and has `meta.type === "blog-news"`
2. Calls `fetchArticleForTopics(meta.topics, meta.campaignId)`:
   - Fetches 3 articles per topic from Reddit (via `fetchRedditPosts()`)
   - Shuffles articles randomly
   - Checks duplicates using `getUsedArticleIds()` (checks URLs and IDs)
   - If no Reddit articles, tries HackerNews (via `fetchHackerNewsPosts()`)
   - Returns first non-duplicate article
3. Stores article in `post.meta.article`:
   ```json
   {
     "title": "...",
     "content": "...",
     "source": "reddit" | "hackernews",
     "url": "...",
     "articleId": "..."
   }
   ```
4. Sets `post.meta.step1Completed = true`
5. Triggers Step 2 (async fetch to `/api/blog/step-2-generate`)

**Timeout**: 9 seconds

**Error Handling**:
- If article fetch fails → marks post as `"failed"`
- If timeout → marks post as `"failed"`

---

### **Step 2: Generate Blog**

**Endpoint**: `POST /api/blog/step-2-generate`

**Request Body**:
```json
{
  "postId": "scheduled-post-id"
}
```

**Precondition Check**:
- Verifies `meta.step1Completed && meta.article`
- If missing:
  - If Step 1 started >5 minutes ago → marks as failed
  - Otherwise → retries Step 1

**Process**:
1. Gets campaign and user
2. Checks user has 3 coins (`remainingChatGenerations >= 3`)
3. Calls `generateBlogFromArticle(article.title, article.content, meta.angles)`:
   - Uses Google Generative AI (Gemini 2.0 Flash)
   - Handles API key rotation (tries GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2)
   - Manages exhausted keys via `GeminiApiKeyState` table
   - Generates MDX-formatted blog with angles
   - Returns: `{ title, content, tags }`
4. Deducts 3 coins from user
5. Stores blog in `CampaignChat.contents.blog`:
   ```json
   {
     "blog": {
       "title": "...",
       "content": "...",
       "tags": [...],
       "sourceArticle": { ... },
       "generatedAt": "..."
     }
   }
   ```
6. Updates `CampaignChat.status = "GENERATED"`
7. Stores blog in `post.meta.blog`
8. Sets `post.meta.step2Completed = true`
9. Triggers Step 3 (async fetch to `/api/blog/step-3-send-webhook`)

**Timeout**: 9 seconds

**Error Handling**:
- If insufficient coins → marks as failed with `meta.insufficientCoins = true`
- If blog generation fails → marks as failed
- If timeout → marks as failed

---

### **Step 3: Send Webhook**

**Endpoint**: `POST /api/blog/step-3-send-webhook`

**Request Body**:
```json
{
  "postId": "scheduled-post-id"
}
```

**Precondition Check**:
- Verifies `meta.step2Completed && meta.blog`
- If missing:
  - If Step 2 started >10 minutes ago → marks as failed
  - Otherwise → retries Step 2

**Process**:
1. Gets webhook URL from `meta.webhook`
2. If no webhook URL → skips webhook, sets `meta.step3Skipped = true`, triggers Step 4
3. Calls `sendBlogToWebhook(webhookUrl, blog, meta.day)`:
   - Makes `axios.post()` to webhook URL
   - Sends payload:
     ```json
     {
       "day": 1,
       "blog": {
         "title": "...",
         "content": "...",
         "tags": [...]
       },
       "timestamp": "..."
     }
     ```
   - Extracts `articleUrl` from response: `response.data.data.articleUrl` or `response.data.articleUrl`
4. Updates `CampaignChat.contents.blog`:
   ```json
   {
     "blog": {
       ...existing blog...,
       "articleUrl": "...",
       "webhookSent": true/false,
       "webhookUrl": "..."
     }
   }
   ```
5. Stores `articleUrl` in `post.meta.articleUrl`
6. Sets `post.meta.step3Completed = true`
7. Triggers Step 4 (async fetch to `/api/blog/step-4-finalize`)

**Timeout**: 9 seconds

**Error Handling**:
- If webhook fails → continues (doesn't fail the process)
- If timeout → continues (doesn't fail the process)
- Webhook failure is logged but doesn't stop the flow

---

### **Step 4: Finalize - Create Platform Posts**

**Endpoint**: `POST /api/blog/step-4-finalize`

**Request Body**:
```json
{
  "postId": "scheduled-post-id"
}
```

**Precondition Check**:
- Verifies `meta.step3Completed && meta.blog`
- If missing:
  - If Step 3 started >5 minutes ago → marks as failed
  - Otherwise → retries Step 3

**Idempotency Check**:
- Checks if platform posts already exist for this `postId` or `campaignId/day/articleUrl`
- If yes → skips creation, marks as success

**Process**:
1. Gets `articleUrl` from `meta.articleUrl`
2. If no `articleUrl` → skips platform posts, marks as success
3. Gets platforms from `meta.platforms` (e.g., `["twitter", "facebook", "linkedin"]`)
4. Calls `generateSocialExcerpt(blog.title, blog.content)`:
   - Creates 1-2 line excerpt from blog
   - Returns: `"{title}\n\n{excerpt}"`
5. For each platform:
   - Creates social content: `"{excerpt}\n\nRead more: {articleUrl}"`
   - Calls `schedulePost()` to create `ScheduledPost`:
     - `platform`: platform name (e.g., "twitter")
     - `content`: social content
     - `date`: `originalPost.date + 1 minute`
     - `meta.blogNewsPostId`: original post ID
     - `meta.articleUrl`: article URL
     - `meta.source`: "blog-news"
6. Sets `post.meta.step4Completed = true`
7. Marks original post as `status = "success"`

**Timeout**: 9 seconds

**Error Handling**:
- If platform post creation fails for some platforms → continues with others
- Partial success is allowed (some platforms succeed, some fail)

---

## 🔑 Key APIs and Functions

### **Backend Functions** (`blog-news.ts`)

1. **`fetchArticleForTopics(topics, campaignId)`**
   - Fetches articles from Reddit/HackerNews
   - Implements duplicate detection
   - Returns: `{ title, content, source, url, articleId }`

2. **`generateBlogFromArticle(articleTitle, articleContent, angles)`**
   - Uses Gemini AI to generate blog
   - Handles API key rotation
   - Returns: `{ title, content, tags }`

3. **`sendBlogToWebhook(webhook, blog, day)`**
   - Sends blog to webhook URL
   - Returns: `{ success, responseData }`

4. **`generateSocialExcerpt(blogTitle, blogContent)`**
   - Creates social media excerpt
   - Returns: `"{title}\n\n{excerpt}"`

### **API Endpoints**

1. **`GET /api/post`** - Cron trigger
   - Finds pending posts
   - Triggers Step 1 for Blog News posts

2. **`POST /api/blog/step-1-fetch-article`** - Step 1
   - Fetches article
   - Triggers Step 2

3. **`POST /api/blog/step-2-generate`** - Step 2
   - Generates blog
   - Triggers Step 3

4. **`POST /api/blog/step-3-send-webhook`** - Step 3
   - Sends webhook
   - Triggers Step 4

5. **`POST /api/blog/step-4-finalize`** - Step 4
   - Creates platform posts
   - Marks as success

### **Database Tables**

1. **`ScheduledPost`**
   - Stores Blog News posts (`platform="webhook"`, `meta.type="blog-news"`)
   - Stores platform posts created in Step 4
   - Tracks status: `pending` → `processing` → `success`/`failed`

2. **`CampaignChat`**
   - Stores generated blog in `contents.blog`
   - Status: `GENERATED` after Step 2

3. **`GeminiApiKeyState`**
   - Tracks API key exhaustion
   - Manages retry logic

4. **`User`**
   - Tracks `remainingChatGenerations` (coins)
   - Deducted by 3 in Step 2

---

## 🛡️ Safety Features

### **Idempotency**
- Each step checks if already completed (`meta.stepXCompleted`)
- Step 4 checks for existing platform posts before creating

### **Precondition Checks**
- Step 2 verifies Step 1 completed
- Step 3 verifies Step 2 completed
- Step 4 verifies Step 3 completed
- Retries previous step if missing (with timeout)

### **Stuck Recovery**
- Cron job detects posts stuck in `"processing"` for >10 minutes
- Retries appropriate step based on last completed step
- Marks as failed if stuck >30 minutes

### **Error Handling**
- Each step has timeout (9 seconds)
- Errors are logged and stored in `post.error`
- Failed posts are marked with `status = "failed"`

### **Duplicate Detection**
- Step 1 checks for duplicate articles using URLs and IDs
- Tracks used articles per campaign

---

## 📊 Data Flow

### **Metadata Flow** (stored in `ScheduledPost.meta`)

```json
{
  "type": "blog-news",
  "campaignId": "...",
  "day": 1,
  "topics": ["AI", "Technology"],
  "angles": ["Economic", "Ethical"],
  "webhook": "https://...",
  "platforms": ["twitter", "facebook"],
  
  // Step 1 output
  "article": { "title": "...", "content": "...", "source": "...", "url": "...", "articleId": "..." },
  "step1Completed": true,
  "step1CompletedAt": "...",
  
  // Step 2 output
  "blog": { "title": "...", "content": "...", "tags": [...] },
  "step2Completed": true,
  "step2CompletedAt": "...",
  
  // Step 3 output
  "articleUrl": "https://...",
  "webhookSent": true,
  "step3Completed": true,
  "step3CompletedAt": "...",
  
  // Step 4 output
  "step4Completed": true,
  "step4CompletedAt": "...",
  "platformPosts": [...]
}
```

### **Blog Storage** (stored in `CampaignChat.contents`)

```json
{
  "blog": {
    "title": "...",
    "content": "...",
    "tags": [...],
    "sourceArticle": {
      "title": "...",
      "content": "...",
      "source": "reddit",
      "url": "...",
      "articleId": "..."
    },
    "generatedAt": "...",
    "articleUrl": "https://...",
    "webhookSent": true,
    "webhookUrl": "https://..."
  }
}
```

---

## ⚙️ Configuration

### **Environment Variables**
- `GEMINI_API_KEY` - Primary Gemini API key
- `GEMINI_API_KEY_1` - Backup Gemini API key 1
- `GEMINI_API_KEY_2` - Backup Gemini API key 2
- `NEXT_PUBLIC_APP_URL` - Base URL for step triggers (or `VERCEL_URL`)

### **Campaign Metadata** (stored in `CampaignPlanner.blogNewsMetadata`)
```json
{
  "topics": ["AI", "Technology"],
  "angles": ["Economic", "Ethical"],
  "webhook": "https://...",
  "platforms": ["twitter", "facebook"]
}
```

---

## 🔍 Monitoring & Debugging

### **Status Tracking**
- `ScheduledPost.status`: `pending` → `processing` → `success`/`failed`
- `CampaignChat.status`: `GENERATED` (after Step 2)

### **Logging**
- Each step logs: `[Step X] 🚀 Starting...`, `[Step X] ✅ Completed...`
- Errors logged with context: postId, campaignId, day
- Webhook responses logged for debugging

### **Common Issues**

1. **Step 1 fails**: No articles found for topics → Check topics, Reddit/HN API
2. **Step 2 fails**: Insufficient coins → User needs 3 coins
3. **Step 2 fails**: API key exhausted → Check `GeminiApiKeyState` table
4. **Step 3 fails**: Webhook timeout → Check webhook URL, network
5. **Step 4 fails**: No articleUrl → Webhook didn't return articleUrl

---

## 🎯 Summary

The Blog News auto-post system:
1. **Schedules** posts when campaign is created
2. **Triggers** via cron job (`GET /api/post`)
3. **Fetches** article (Step 1)
4. **Generates** blog with AI (Step 2)
5. **Sends** to webhook (Step 3)
6. **Creates** platform posts (Step 4)
7. **Posts** to social media (via same cron job)

Each step is **idempotent**, has **precondition checks**, and includes **error handling** and **timeout protection**.
