# Development Guide

This document contains important information for developers and AI assistants working on this codebase.

## TypeScript & Prisma Type Handling

### Handling Prisma Relations in TypeScript

When working with Prisma models that have relations (e.g., `PlatformPost` with `oauthProvider`), TypeScript may not automatically recognize the relation fields if they're not explicitly included in queries.

#### Problem
When querying Prisma models with `include` or `select`, the returned type may not include relation fields by default. For example:

```typescript
// ❌ This will cause TypeScript errors
const posts = await prisma.platformPost.findMany();
posts[0].oauthProvider?.platform // Error: Property 'oauthProvider' does not exist
```

#### Solution: Create Extended Types

**1. Create a Type with Relations**

In `src/backend-apis/projects/analytics.ts`, we've defined `PlatformPostWithProvider`:

```typescript
import { PlatformPost, OauthProvider } from "@prisma/client";

// Type for PlatformPost with oauthProvider relation included
// oauthProvider can be partial (at minimum just platform) or full OauthProvider object
export type PlatformPostWithProvider = PlatformPost & {
    oauthProvider?: {
        platform: OauthProvider['platform'];
        // All other fields optional since we may only have partial data
        id?: string;
        createdAt?: Date;
        // ... other optional fields
    } | null;
};
```

**2. Use the Extended Type in Function Signatures**

```typescript
export function calculateCadence(
    platformPosts: PlatformPostWithProvider[], // ✅ Use extended type
    previousPeriodPosts: PlatformPostWithProvider[]
): number {
    // Now TypeScript knows oauthProvider exists
    const platform = platformPosts[0].oauthProvider?.platform; // ✅ Works!
}
```

**3. Type Assertions When Mapping Data**

When mapping Prisma query results, use type assertions:

```typescript
// When mapping posts with relations
const platformPostsLast7Days: PlatformPostWithProvider[] = oauthProviders.flatMap(
    (projectProvider) => {
        const provider = projectProvider.oauthProvider;
        if (!provider) return [];
        return (provider.pagePosts || []).map(post => ({
            ...post,
            // Ensure oauthProvider relation is set
            oauthProvider: (post.oauthProvider || {
                platform: provider.platform, // Minimum required field
            }) as { platform: typeof provider.platform },
        }));
    }
);
```

#### Key Principles

1. **Export extended types** from analytics/utility files for reuse
2. **Make relation fields optional** since they may not always be included
3. **Use type assertions** when mapping Prisma results to extended types
4. **Define minimum required fields** (e.g., just `platform`) when creating partial relation objects

### Common Patterns

#### Pattern 1: Query with Include
```typescript
const posts = await prisma.platformPost.findMany({
    include: {
        oauthProvider: {
            select: {
                platform: true,
            },
        },
    },
});
// Result type includes oauthProvider
```

#### Pattern 2: Query with Select (nested)
```typescript
const posts = await prisma.oauthProvider.findMany({
    select: {
        pagePosts: {
            include: {
                oauthProvider: {
                    select: {
                        platform: true,
                    },
                },
            },
        },
    },
});
// pagePosts will have oauthProvider relation
```

#### Pattern 3: Manual Type Extension (when query doesn't include relation)
```typescript
// Create extended type
type PostWithPlatform = PlatformPost & {
    oauthProvider?: { platform: OauthPlatform } | null;
};

// Map and assert type
const posts: PostWithPlatform[] = rawPosts.map(post => ({
    ...post,
    oauthProvider: { platform: getPlatformFromSomewhere(post) },
}));
```

### Best Practices

1. **Always use extended types** when passing Prisma models with relations to functions
2. **Export extended types** so they can be reused across files
3. **Use type assertions** (`as`) only when you're certain of the data shape
4. **Keep types flexible** - use optional fields (`?`) for relations that may not always be loaded
5. **Document type assumptions** - if a function requires a relation, document it in JSDoc

### Example: Full Workflow

```typescript
// 1. Define extended type (in analytics.ts or types file)
export type PlatformPostWithProvider = PlatformPost & {
    oauthProvider?: {
        platform: OauthProvider['platform'];
    } | null;
};

// 2. Use in function signatures
export function calculateCoverage(
    platformPosts: PlatformPostWithProvider[],
    totalConnectedPlatforms: number
): number {
    platformPosts.forEach(post => {
        const platform = post.oauthProvider?.platform; // ✅ Type-safe access
        // ...
    });
}

// 3. Map Prisma results with type assertion (in actions.ts)
const posts: PlatformPostWithProvider[] = queryResults.map(post => ({
    ...post,
    oauthProvider: { platform: getPlatform(post) },
}));

// 4. Pass to functions
const coverage = calculateCoverage(posts, totalPlatforms);
```

## Pulse Calculation System

### Overview
The pulse calculation measures overall project health based on actual platform data (no manual inputs).

### Components (All Based on Platform Data)

1. **Cadence (25%)**: Posting frequency consistency
   - Compares current week to previous week
   - Uses `PlatformPost` data only

2. **OnTime (20%)**: Scheduled post timing accuracy
   - Uses `ScheduledPost` with `status = "success"` and `processedAt`

3. **Engagement (20%)**: Content performance with trend
   - Uses `PlatformPost` with impressions data
   - Compares to previous period for trend bonus/penalty

4. **Consistency (15%)**: Posting streak
   - Based on `PlatformPost` from last 30 days
   - "Strict forgiving" - only broken by 2+ consecutive days without posts

5. **Success Rate (10%)**: Scheduled posting reliability
   - `ScheduledPost.success / ScheduledPost.total`

6. **Coverage (5%)**: Platform usage diversity
   - Active platforms / Total connected platforms
   - Based on `PlatformPost` data

7. **Platform Diversity (5%)**: Multi-platform usage
   - Unique platforms with posts / Total connected platforms

### Important Notes

- **NO manual data**: All calculations use `PlatformPost`, `ScheduledPost`, or `OauthProvider` data
- **NO campaign tickMarks**: Manual checkboxes are not used in pulse calculation
- **NO ProjectTracking**: Manual entries are not used (only `PlatformPost` counts)
- **Rolling windows**: Use "today minus X days" instead of calendar month/week boundaries
- **Forgiving streak**: Single day gaps don't break streak (only 2+ consecutive gaps)

## Date Calculations

### Always Use Rolling Windows

- **Week**: `subDays(today, 7)` - NOT `startOfWeek()`
- **Month**: `subDays(today, 30)` - NOT `startOfMonth()`

This ensures calculations work correctly across month boundaries.

### Example
```typescript
import { startOfDay, subDays } from "date-fns";

const today = startOfDay(new Date());
const sevenDaysAgo = startOfDay(subDays(today, 7)); // ✅ Rolling window
// NOT: startOfWeek(today) // ❌ Calendar week boundary
```

## Data Sources

### Primary Data Sources (Use These)

1. **PlatformPost**: Actual published posts from platform APIs
   - Source of truth for post counts, engagement, impressions
   - Always prefer this over manual entries

2. **ScheduledPost**: Scheduled posting queue
   - Use for on-time metrics and success rates
   - Check `status` and `processedAt` fields

3. **OauthProvider**: Connected platform accounts
   - Use for platform counts and diversity calculations

### Avoid These (Manual Data)

1. **CampaignPlanner.tickMark**: Manual checkboxes - not reliable
2. **ProjectTracking**: Manual entries - use `PlatformPost` instead
3. **Campaign dates**: Only use for planning context, not for actual metrics

## Debugging

### Enable Debug Logging

The pulse calculation includes debug logging:

```typescript
console.log(`📊 Project ${projectId} Enhanced Pulse Calculation:`, {
    cadence,
    engagement,
    consistency,
    // ... all components
});
```

Check server logs to see:
- Component values
- Post counts by period
- Platform counts
- Calculation details

### Common Issues

1. **Pulse stuck at 35%**: Likely cached `ProjectPulse` data with old logic
   - Solution: Cache is disabled, recalculates on each request

2. **Streak showing 0**: Posts not in `PlatformPost` table yet
   - Solution: Check if analytics sync job has run to fetch posts from APIs

3. **Type errors with relations**: Missing extended types
   - Solution: Create `PlatformPostWithProvider` type as shown above

