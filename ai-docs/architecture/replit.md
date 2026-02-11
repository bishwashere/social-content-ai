# NextPostAI - AI Social Media Content Generator

## Overview

NextPostAI is a comprehensive social media content management platform that leverages AI to generate, schedule, and track posts across multiple platforms (Facebook, Instagram, X/Twitter, LinkedIn, Reddit, Threads). The application features project-based organization, campaign planning, collaborative workflows, subscription management via Stripe, and detailed analytics tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 15 (App Router with React Server Components)
- **Rationale**: Provides excellent SEO capabilities, server-side rendering, and modern React features
- **UI Components**: shadcn/ui (Radix UI primitives) with Tailwind CSS for consistent, accessible design
- **State Management**: TanStack Query (React Query) for server state and caching
- **Authentication UI**: NextAuth.js client hooks with Google OAuth integration
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom design tokens, framer-motion for animations

**Key Design Patterns**:
- Server Actions for data mutations ("use server" functions)
- Custom hooks pattern for API interactions (useQuery, useMutation)
- Provider pattern for global state (SessionProvider, PricingModalProvider, TooltipManagerProvider)
- Middleware composition pattern for request validation and authentication

### Backend Architecture

**API Structure**: Next.js API Routes (App Router `/app/api`)
- **Middleware System**: Custom composable middleware with `applyMiddleware` utility
  - Request validation via Zod schemas
  - JWT-based authentication validation
  - Error boundary wrapping with `catchApiAsyncError`
- **Response Pattern**: Standardized JSON responses via `sendNextResponse`

**Authentication & Authorization**:
- NextAuth.js for OAuth flows (Google, Facebook, Twitter, Reddit, LinkedIn, Threads)
- JWT tokens stored in HTTP-only cookies for session management
- Role-based access control (Admin, Editor, Viewer) for project collaboration
- OAuth token refresh logic for third-party platforms (Reddit, Twitter, etc.)

**AI Integration**:
- Google Gemini AI (generative-ai SDK) for content generation
- Multi-platform content generation with character limit awareness
- Custom prompts per platform (PIER style for LinkedIn, conversational for Threads, etc.)
- Retry mechanism with multiple API keys for reliability

**Scheduling System**:
- Cron-based scheduler for posting to social platforms
- Status tracking (pending, processing, success, failed)
- OAuth provider mapping to projects for automated posting
- Token refresh handling before posting

### Data Storage

**Database**: MongoDB via Prisma ORM
- **Rationale**: Chosen for flexible schema with JSON fields for dynamic content storage
- **Key Models**:
  - `User`: User accounts with OAuth credentials
  - `Projects`: Content projects with platform URLs and descriptions
  - `ProjectChat`: AI-generated content variations per platform
  - `CampaignPlanner` & `CampaignChat`: Multi-day campaign scheduling
  - `ScheduledPost`: Queue for automated posting
  - `OauthProvider`: Third-party platform credentials with refresh tokens
  - `Subscription`: Stripe subscription status and credit tracking
  - `ProjectFolder` & `ProjectFolderItem`: Project organization
  - `Wall`: Shareable content showcase

**File Storage**: AWS S3-compatible (Cloudflare R2)
- Used for media assets (images, videos)
- Presigned URLs for secure temporary access

### External Dependencies

**Payment Processing**:
- Stripe for subscription management and one-time coin purchases
- Webhook handling for subscription lifecycle events
- Trial period management (7 days)
- Credit-based system for content generation limits

**Social Media APIs**:
- Reddit API: OAuth2 flow with permanent access tokens, subreddit moderation checks
- Facebook Graph API: Page management, post insights, engagement metrics
- Twitter API v2: OAuth 2.0 with PKCE, token refresh mechanism
- LinkedIn API: Share API for posting, analytics integration
- Threads API: Meta's Threads platform integration
- **Token Management**: Automatic refresh before expiration, stored in database

**Email Service**:
- Nodemailer with Gmail SMTP
- React Email for templated emails (welcome, notifications)

**Analytics & Monitoring**:
- Google Analytics via Next.js third-party integration
- Custom metrics aggregation from social platforms
- Campaign performance tracking (cadence, on-time delivery, engagement)

**Development Tools**:
- TypeScript for type safety
- ESLint with Next.js and TypeScript rules
- Prisma for database schema management and migrations
- Zod for runtime validation

**Content Delivery**:
- Video caching service using Cache API for performance
- Cheerio for web scraping (extracting website descriptions)
- Axios for HTTP requests with interceptors

**Key Architectural Decisions**:
- Serverless-first approach using Next.js API routes
- Client-side caching with TanStack Query to reduce API calls
- JSON fields in database for flexible content storage across platforms
- Middleware composition for clean separation of concerns
- Server actions for secure data mutations from client components
- Multi-API key rotation for AI service reliability