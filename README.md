# NextPost AI: plan and publish social media posts with AI help

NextPost AI helps creators and small businesses plan social media content, draft posts with AI, schedule them across Facebook, Instagram, LinkedIn, X, Threads, Reddit, and TikTok, and see how the posts perform.

It is a full product: user accounts, campaign planning, a library of post ideas and templates, analytics, and subscription billing. The front end is a Next.js web app; the back end uses a MongoDB database through Prisma, Gemini for the AI features, and Stripe for payments. The technical documentation follows below.

---

# social-content-ai

The primary web application for **NextPost AI** — an AI-powered social media content platform. Built with Next.js 14 (App Router), it lets users plan multi-day content campaigns, generate platform-specific posts with Google Gemini AI, schedule and auto-publish to seven social networks, and analyze post performance.

Extended documentation lives in [`ai-docs/`](./ai-docs/), grouped by architecture, features, and decisions.

---

## Features

### Content Creation & Campaigns
- **AI Campaign Planner** — Define a goal, target audience, start date, and platform list; Gemini generates a full multi-day content plan with one post per platform per day.
- **Campaign Chat** — Day-by-day AI chat interface that generates tailored post copy, refines drafts, and persists all versions.
- **Blog/News Auto-Post** — 4-step pipeline that fetches a relevant article from Reddit or HackerNews, uses Gemini to transform it into platform copy, optionally sends it to a webhook, then publishes automatically.
- **Quick Generate / Project Chat** — Free-form AI chat attached to a project for one-off post creation outside of campaigns.
- **Templates Library** — Curated and community post templates categorized as TIP, CASE_STUDY, STORY, HOW_TO, QUESTION, OPINION, LIST, BEHIND_THE_SCENES, HUMOR with `{{placeholder}}` substitution.
- **Ideas CMS** — Editorial idea system backed by MDX content; ideas have slugs, tags, thumbnails, and draft/published status.

### Social Media Publishing
- **Scheduled Posts** — Schedule posts with optional media (image or video) to any connected platform; a background process polls the queue and publishes at the right time.
- **Multi-platform support** — Facebook (Pages), Instagram (Business), LinkedIn, Twitter/X, Threads, Reddit, TikTok.
- **Content Wall** — Public profile page displaying a user's AI-generated highlights.

### Analytics & Intelligence
- **Project Analytics** — Aggregated engagement metrics across all campaigns; surfaces recommended posting time, best platform, and AI-generated campaign suggestions.
- **Campaign Analytics** — Per-campaign breakdown by platform with engagement rate, best posting hour, and content pattern insights.
- **Project Pulse** — Composite engagement health score (computed by `nextpostai-pulse-service`) showing posting consistency and weekly activity.

### Brand Intelligence
- **Brand Discovery** — Structured intake form that captures product features, testimonials, competitive differentiators, and buyer questions; used to ground AI-generated content.
- **Persona Discovery** — AI generates detailed buyer personas (demographics, psychographics, goals, pain points, messaging angles) from product and customer input.
- **Ad Creative Generator** — Generates ad copy (headline, primary text, image description) for multiple angles and creates an image via Gemini, stored in Cloudflare R2.

### Video
- **Video Upload & Maker** — Upload MP4 files to Cloudflare R2; a quick video maker creates short clips tied to campaign days.

### Platform & Account Management
- **OAuth Integrations** — Connect Facebook/Instagram (single OAuth flow, shared token), LinkedIn, Twitter/X, Threads, Reddit, and TikTok accounts. Tokens stored encrypted in MongoDB.
- **Project Folders** — Group projects into color-coded folders.
- **Team / Invited Users** — Invite users to a project by role.

### Growth & Monetization
- **Stripe Billing** — Subscription plans with trial management, upgrade flow, and webhook processing.
- **Referral Program** — Unique referral codes for partners; click and signup attribution tracked separately.
- **Email Notifications** — Transactional emails rendered with React Email, delivered via Nodemailer; aggregate + per-user click tracking.
- **In-app Notifications** — Persistent notification feed for publish successes/failures and campaign events.
- **Newsletter Subscription** — Landing-page email capture.
- **Feature Requests** — Users can submit product feedback.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2 (App Router, React 18) |
| Language | TypeScript 5 |
| Auth | NextAuth v5 beta (`@auth/prisma-adapter`) |
| Database | MongoDB Atlas via Prisma 6 |
| ORM | Prisma (`prisma-client-js`) |
| AI | Google Gemini (`@google/generative-ai`) |
| Media storage | Cloudflare R2 (accessed via `@aws-sdk/client-s3` S3-compatible API) |
| Payments | Stripe |
| Email | Nodemailer + `@react-email/components` |
| UI | Tailwind CSS + Radix UI + Lucide Icons + shadcn/ui |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts + Chart.js |
| Calendar | react-big-calendar |
| Image gen | Satori + `@resvg/resvg-js` (OG images) |
| Styling extras | Framer Motion (motion), Embla Carousel, Sonner toasts |

---

## Project Structure

```
social-content-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (landing)/          # Marketing / landing pages
│   │   ├── (pages)/            # Authenticated app pages
│   │   │   ├── admin/          # Internal admin panel
│   │   │   ├── dashboard/      # User dashboard
│   │   │   │   ├── analytics/
│   │   │   │   ├── billing/
│   │   │   │   ├── content-planner/
│   │   │   │   ├── create-post/
│   │   │   │   ├── my-videos/
│   │   │   │   ├── notifications/
│   │   │   │   ├── settings/
│   │   │   │   ├── templates/
│   │   │   │   └── video-maker/
│   │   │   ├── project/[id]/   # Per-project pages
│   │   │   │   ├── ads/        # Ad creative generator
│   │   │   │   ├── campaign/   # Campaign planner
│   │   │   │   ├── chat/       # Quick generate chat
│   │   │   │   ├── personas/   # Persona discovery
│   │   │   │   └── video/      # Project video tools
│   │   │   └── projects/       # Project list
│   │   ├── api/                # REST API routes (see below)
│   │   ├── blogs/              # Public blog listing
│   │   ├── ideas/              # Public ideas listing
│   │   └── [username]/         # Public user/wall page
│   ├── components/             # Shared React components
│   ├── lib/                    # Core utilities and integrations
│   │   ├── auth.ts             # NextAuth config
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── s3.ts               # Cloudflare R2 / S3 client
│   │   ├── ai.ts               # Gemini AI helpers
│   │   ├── stripe.ts           # Stripe client
│   │   ├── mail.ts             # Nodemailer setup
│   │   └── prompt.ts           # Prompt construction utilities
│   ├── backend-apis/           # Platform API integrations
│   ├── server-actions/         # Next.js Server Actions
│   └── constants/              # App-wide constants
├── prisma/
│   └── schema.prisma           # MongoDB schema (all models)
├── scripts/                    # One-off admin scripts (seed, migrate, etc.)
├── ai-docs/                    # Extended technical documentation
└── public/                     # Static assets
```

---

## API Routes

All routes live under `src/app/api/`.

### Authentication
| Route | Description |
|-------|-------------|
| `GET/POST /api/auth/[...nextauth]` | NextAuth handler (Google, Twitter, Facebook, Reddit, TikTok OAuth) |
| `GET/POST /api/instagram-login/auth` | Instagram OAuth initiation and callback |
| `GET/POST /api/linkedin-login/auth` | LinkedIn OAuth initiation and callback |
| `GET /api/check-oauth-providers` | Check which platforms are connected for a project |

### Projects & Campaigns
| Route | Description |
|-------|-------------|
| `GET/POST /api/projects` | List / create projects |
| `GET/POST /api/campaign-planner` | List / create campaign planners |
| `GET/POST /api/campaigns` | Campaign management |
| `GET/POST /api/chat` | Project AI chat session |
| `GET/POST /api/dashboard-chat` | Dashboard-level AI chat (proxied to `nextpostai-api`) |

### Publishing
| Route | Description |
|-------|-------------|
| `GET/POST/DELETE /api/scheduled-posts` | Manage the scheduled post queue |
| `POST /api/post` | Direct / immediate post publishing |
| `GET/POST /api/pending-tasks` | Poll for in-flight publishing tasks |

### Blog/News Auto-Post Pipeline
| Route | Description |
|-------|-------------|
| `POST /api/blog/step-1-fetch-article` | Fetch article from Reddit/HackerNews |
| `POST /api/blog/step-2-generate` | Generate platform copy with Gemini |
| `POST /api/blog/step-3-send-webhook` | Send to optional campaign webhook |
| `POST /api/blog/step-4-finalize` | Mark post ready and update campaign |
| `GET /api/blog/session` | Retrieve Blog/News session state |
| `GET /api/blogs` | List published blog/news entries |

### Content Intelligence
| Route | Description |
|-------|-------------|
| `GET/POST /api/brand-discovery` | Brand discovery intake and retrieval |
| `GET/POST /api/ad-creative` | Ad creative generation and image creation |
| `GET/POST /api/ad-creative/generate-image` | Gemini image generation for ad creatives |
| `GET/POST /api/persona-discovery` | Persona discovery intake and results |
| `GET/POST /api/templates` | Template library CRUD |
| `GET /api/trending` | Trending topics from Reddit/HackerNews |
| `GET /api/hackernews` | HackerNews top stories |

### Analytics
| Route | Description |
|-------|-------------|
| `GET /api/debug-analytics` | Analytics aggregation endpoint |
| `GET /api/recent-activity` | Recent posting activity for dashboard |
| `GET /api/your-today` | Today's scheduled / completed posts summary |

### User & Account
| Route | Description |
|-------|-------------|
| `GET/PATCH /api/user/settings` | User settings read/update |
| `POST /api/user/dashboard-intro-shown` | Mark dashboard intro as seen |
| `GET/POST /api/user/news-preferences` | News topic preferences |
| `GET /api/check-get-started-status` | Onboarding completion check |

### Payments & Subscriptions
| Route | Description |
|-------|-------------|
| `GET /api/payment/subscriptions` | Fetch active subscription |
| `POST /api/payment/upgrade-trial` | Upgrade from trial |
| `POST /api/payment/stripe-webhook` | Stripe event webhook handler |

### Platform-specific
| Route | Description |
|-------|-------------|
| `GET/POST /api/instagram/auth` | Instagram graph API token exchange |
| `GET/POST /api/threads` | Threads publishing API |
| `POST /api/transcribe` | Audio transcription (for video captions) |

### Growth
| Route | Description |
|-------|-------------|
| `GET/POST /api/referral` | Referral partner operations |
| `GET/POST /api/newsletter-subscribe` | Newsletter email capture |
| `POST /api/feature-requests` | Feature request submission |
| `GET /api/ideas` | Public ideas feed |

### Admin (protected)
| Route | Description |
|-------|-------------|
| `GET/POST /api/video-admin/*` | Video management admin panel |
| `GET/POST /api/landing` | Landing page admin content |

---

## Environment Variables

Copy these into a `.env.local` file at the root of `social-content-ai/`.

### Database
```env
DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
```

### Authentication
```env
NEXTAUTH_SECRET=<random 32-byte secret>
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=<random secret for internal JWTs>
AUTH_GOOGLE_ID=<Google OAuth Client ID>
AUTH_GOOGLE_SECRET=<Google OAuth Client Secret>
AUTH_FACEBOOK_ID=<Facebook App ID>
AUTH_FACEBOOK_SECRET=<Facebook App Secret>
AUTH_TWITTER_ID=<Twitter/X App Key>
AUTH_TWITTER_SECRET=<Twitter/X App Secret>
AUTH_REDDIT_ID=<Reddit App Client ID>
AUTH_REDDIT_SECRET=<Reddit App Secret>
AUTH_INSTAGRAM_ID=<Instagram App ID (Facebook Developer)>
AUTH_INSTAGRAM_SECRET=<Instagram App Secret>
AUTH_LINKEDIN_ID=<LinkedIn App Client ID>
AUTH_LINKEDIN_SECRET=<LinkedIn App Secret>
AUTH_THREADS_ID=<Threads App ID (Meta)>
AUTH_THREADS_SECRET=<Threads App Secret>
TIKTOK_CLIENT_ID=<TikTok App Client Key>
TIKTOK_CLIENT_SECRET=<TikTok App Client Secret>
TWITTER_CLIENT_ID=<Twitter/X Client ID (OAuth 2.0)>
TWITTER_CLIENT_SECRET=<Twitter/X Client Secret (OAuth 2.0)>
```

### AI
```env
GEMINI_API_KEY=<Google Gemini API key>
GEMINI_API_KEY_1=<Second Gemini key for rotation (optional)>
GEMINI_API_KEY_2=<Third Gemini key for rotation (optional)>
OPENAI_API_KEY=<OpenAI key (used for certain features)>
```

### Media Storage (Cloudflare R2 — S3-compatible)
```env
CLOUDFLARE_R2_BUCKET=<R2 bucket name>
CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY=<R2 Access Key ID>
CLOUDFLARE_R2_SECRET_KEY=<R2 Secret Access Key>
```

### Payments
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Email
```env
EMAIL=notifications@yourdomain.com
EMAIL_PASSWORD=<SMTP app password>
```

### Public URLs
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_PRODUCTION_URL=https://nextpostai.com
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_API_BASE_URL=https://api.nextpostai.com
```

### External Integrations
```env
OLIVEDRIFT_BASE_URL=<OliveDrift email service URL>
OLIVEDRIFT_API_KEY=<OliveDrift API key>
TRAXN_WORKFLOW_SIGNUP_INBOUND_WEBHOOK_URL=<webhook for new signups>
TRAXN_WORKFLOW_ABANDON_INBOUND_WEBHOOK_URL=<webhook for abandoned onboarding>
PLATFORM_OWNER_REF=<platform owner referral code>
```

### Admin Credentials
```env
REFERRAL_SUPER_ADMIN_USERNAME=<admin user>
REFERRAL_SUPER_ADMIN_PASSWORD=<admin password>
VIDEO_ADMIN_USERNAME=<video admin user>
VIDEO_ADMIN_PASSWORD=<video admin password>
IDEAS_ADMIN_USERNAME=<ideas CMS admin user>
IDEAS_ADMIN_PASSWORD=<ideas CMS admin password>
```

---

## Database Schema Summary

The Prisma schema (`prisma/schema.prisma`) targets MongoDB. All models use `@db.ObjectId` for IDs.

### Core models

| Model | Collection | Key fields |
|-------|-----------|-----------|
| `User` | `users` | `email`, `remainingChatGenerations` (credit balance), `guidedTourEnabled`, onboarding flags |
| `Projects` | `projects` | `name`, `url`, `description`, `platformUrls` (JSON map of platform → profile URL) |
| `CampaignPlanner` | `campaign-planners` | `goal`, `targetAudience`, `platforms[]`, `startDate`, `autoPostEnabled`, `autoPostTime`, `blogNewsMetadata` |
| `CampaignChat` | *(embedded in planner)* | `day` (Int), `contents` (JSON: platform → generated text), `media` (JSON: platform → R2 key), `status` (PENDING/GENERATED) |
| `OauthProvider` | `oauth-providers` | `platform` (enum), `accessToken`, `refreshToken`, `expiresAt`, `pageId`, `pageName`, `pageFollowers` |
| `ScheduledPost` | `scheduled-posts` | `platform`, `content`, `date`, `status` (pending/published/failed), `media` (R2 key), `meta` (JSON) |
| `Subscription` | `subscriptions` | `status`, `startedAt`, `endsAt`, `subscriptionIdFromStripe` |

### Analytics models

| Model | Collection | Key fields |
|-------|-----------|-----------|
| `PlatformPost` | *(default)* | `postId`, `likes`, `comments`, `shares`, `impressions`, `oauthProviderId` |
| `PostInsights` | `post-insights` | Reaction breakdown, `postReach`, `engagedUsers`, `postClicks`, `negativeFeedback` |
| `CampaignAnalytics` | `campaign-analytics` | `totalPosts`, `avgEngagementRate`, `bestPostingHour`, `bestDayOfWeek`, `bestPlatform`, `platformMetrics` (JSON), `contentPatterns` (JSON) |
| `ProjectAnalytics` | `project-analytics` | `avgEngagementRate`, `recommendedTime`, `recommendedPlatforms[]`, `campaignSuggestions` (JSON), `engagementTrend` |
| `ProjectPulse` | `project-pulse` | `pulse` (Float 0–100), `components` (JSON), `daysPosted`, `gapDays` |

### Brand / persona models

| Model | Collection | Key fields |
|-------|-----------|-----------|
| `BrandDiscovery` | `brand-discoveries` | `brandName`, `features[]`, `testimonials[]`, `competitors[]`, `jobsToBeDone[]`, `emotionalBenefits[]` |
| `AdCreative` | `ad-creatives` | `angle`, `headline`, `primaryText`, `imageDescription`, `imageKey` (R2), `platform`, `status` |
| `PersonaDiscovery` | `persona-discoveries` | `productName`, `ageGroups[]`, `discoveryChannels[]`, `customerGoals[]` |
| `PersonaResult` | `persona-results` | `personaName`, `tagline`, `demographics`, `values[]`, `painPoints[]`, `messagingAngles[]`, `dayInTheLife` |

### Content models

| Model | Collection | Key fields |
|-------|-----------|-----------|
| `Template` | `templates` | `title`, `category` (enum), `content` (with `{{placeholders}}`), `impressions` |
| `Idea` | `ideas` | `slug`, `title`, `summary`, `content` (MDX), `tags[]`, `status` (draft/published), `publishedAt` |
| `GeminiApiKeyState` | `gemini-api-key-states` | `keyName`, `exhausted`, `retryAfter` — enables transparent key rotation |

### Engagement & growth models

| Model | Collection | Key fields |
|-------|-----------|-----------|
| `ReferralPartner` | `referral-partners` | `code` (unique URL slug), `username`, hashed `password` |
| `ReferralClick` | `referral-clicks` | `referralPartnerId`, `ipAddress`, `userAgent` |
| `ReferralSignup` | `referral-signups` | `referralPartnerId`, `userId` (unique — one signup per user) |
| `Notification` | `notifications` | `type`, `sourceId` (idempotency key), `message`, `platform`, `timestamp` |
| `EmailLog` | `email-logs` | `template`, `subject`, `trigger` (auto/manual/test) |
| `EmailLinkClick` | `email-link-clicks` | `template`, `clickCount` (aggregate per template) |
| `EmailUserClick` | `email-user-clicks` | `userId`, `template`, `clickCount` (per-user attribution) |
| `NewsletterSubscription` | `newsletter-subscriptions` | `email`, `source` |

---

## Development

```bash
# Install dependencies
pnpm install

# Set up the database (push schema to MongoDB)
pnpm db:push

# Start the dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Useful scripts

```bash
# Seed content templates
pnpm seed:templates

# Set all users to 100 tokens
pnpm tokens:set-all-100

# Ensure minimum 100 tokens for all users
pnpm tokens:ensure-min-100

# Backfill campaign days (after schema changes)
pnpm campaign:backfill

# Backfill notifications
pnpm notifications:backfill

# Generate ideas admin credentials
pnpm generate:ideas-admin

# Test Facebook API integration
pnpm test:facebook
```
