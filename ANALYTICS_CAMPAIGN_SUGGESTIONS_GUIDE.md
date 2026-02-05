# Analytics & AI Campaign Suggestions - Implementation Guide

## 🎯 What We Built

A complete analytics and AI-powered campaign suggestion system that:

1. **Campaign Analytics** - Analyzes individual campaign performance
2. **Project Analytics** - Aggregates data across all campaigns  
3. **AI Campaign Suggestions** - Generates new campaign ideas based on performance data
4. **Incremental Analysis** - Calculates analytics on-demand, not just after campaign completion

---

## 📊 Database Changes

### New Tables Added:

#### **CampaignAnalytics**
Stores analytics for individual campaigns:
- Total posts, likes, comments, shares, impressions
- Average engagement rate
- Best posting hour, day of week, platform
- Platform-specific metrics breakdown

#### **ProjectAnalytics**
Stores aggregated analytics across all campaigns:
- Total posts and campaigns
- Average engagement rate
- Recommended posting time and platforms
- Engagement trend (improving/stable/declining)
- **AI-generated campaign suggestions**

---

## 🔧 Backend Functions

### `/src/backend-apis/analytics/calculator.ts`

**Main Functions:**

1. **`calculateCampaignAnalytics(campaignId)`**
   - Analyzes all scheduled + platform posts for a campaign
   - Calculates engagement metrics
   - Finds best posting times, days, platforms
   - Saves to `CampaignAnalytics` table

2. **`calculateProjectAnalytics(projectId)`**
   - Aggregates data from last 30 days
   - Analyzes trends (improving/declining/stable)
   - Generates AI campaign suggestions
   - Saves to `ProjectAnalytics` table

**Helper Functions:**
- `findBestPostingHour()` - Hour with highest engagement
- `findBestDayOfWeek()` - Day with highest engagement  
- `findBestPlatform()` - Platform with highest engagement
- `calculatePlatformBreakdown()` - Metrics per platform
- `generateCampaignSuggestions()` - AI-powered suggestions

---

## 🌐 API Endpoints

### Campaign Analytics:

**POST** `/api/campaigns/[id]/analyze`
- Triggers analytics calculation for a campaign
- Returns calculated analytics object

**GET** `/api/campaigns/[id]/analytics`
- Fetches most recent analytics for a campaign
- Returns 404 if no analytics exist

### Project Analytics:

**POST** `/api/projects/[id]/analyze`
- Triggers project-level analytics calculation
- Generates AI campaign suggestions
- Returns analytics with suggestions

**GET** `/api/projects/[id]/analytics`
- Fetches most recent project analytics
- Returns 404 if no analytics exist

---

## 🎨 UI Components

### 1. **CampaignAnalyticsSummary**
Location: `/src/app/(pages)/project/[id]/_components/campaign-analytics-summary.tsx`

**Features:**
- Shows campaign performance metrics
- Displays best performers (time, day, platform)
- Platform breakdown with individual metrics
- "Calculate/Refresh Analytics" button

**Where Used:** Inside each campaign (when expanded)

### 2. **ProjectAnalyticsDashboard**
Location: `/src/app/(pages)/project/[id]/_components/project-analytics-dashboard.tsx`

**Features:**
- Project overview (total posts, campaigns, engagement)
- Trend indicator (improving/stable/declining)
- Recommendations (best time, top platforms)
- **AI Campaign Suggestions** with expandable cards
  - Campaign name, goal, target audience
  - Why it will work (data-driven reasoning)
  - Suggested platforms, time, duration
  - Content ideas

**Where Used:** Top of campaign planner page

---

## 🧪 How to Test

### Step 1: View the UI

1. Navigate to any project page: `/project/[id]?tab=campaign`
2. You'll see the **Project Analytics Dashboard** at the top
3. Click "Generate Campaign Ideas" button
4. Wait for AI to analyze and generate suggestions

### Step 2: Test Campaign Analytics

1. Expand any campaign in the list
2. Scroll to see the **Campaign Analytics Summary**
3. Click "Calculate Analytics" button
4. View metrics, best performers, platform breakdown

### Step 3: Manual API Testing

```bash
# Calculate campaign analytics
curl -X POST http://localhost:3000/api/campaigns/YOUR_CAMPAIGN_ID/analyze

# Get campaign analytics
curl http://localhost:3000/api/campaigns/YOUR_CAMPAIGN_ID/analytics

# Calculate project analytics (generates AI suggestions)
curl -X POST http://localhost:3000/api/projects/YOUR_PROJECT_ID/analyze

# Get project analytics
curl http://localhost:3000/api/projects/YOUR_PROJECT_ID/analytics
```

---

## 🤖 AI Campaign Suggestions

### How It Works:

1. System analyzes last 30 days of posts
2. Calculates:
   - Best posting times
   - Top performing platforms
   - Engagement trends
3. Feeds this data to AI with prompt:
   - Project name and description
   - Performance insights
   - Previous campaigns
4. AI generates 3 creative campaign ideas as JSON
5. Each suggestion includes:
   - Name, goal, target audience
   - Data-driven reasoning ("why this will work")
   - Recommended platforms and timing
   - Specific content ideas

### Example AI Response:

```json
[
  {
    "name": "Customer Success Stories - Weekly Series",
    "goal": "Build trust through social proof",
    "targetAudience": "Potential customers in consideration phase",
    "why": "Your Q&A posts get 2.5x engagement at 2pm. Stories format will amplify this.",
    "suggestedPlatforms": ["linkedin", "twitter"],
    "suggestedTime": "14:00",
    "duration": "4 weeks",
    "contentIdeas": [
      "Day 1: How Customer X increased productivity by 40%",
      "Day 2: Behind-the-scenes interview",
      "Day 3: Key metrics and results"
    ]
  }
]
```

---

## 📈 Analytics Calculation Flow

```
User clicks "Generate Campaign Ideas"
           ↓
POST /api/projects/[id]/analyze
           ↓
calculateProjectAnalytics()
           ↓
1. Fetch platform posts (last 30 days)
2. Calculate metrics (engagement, trends)
3. Find best times/platforms
4. Call AI with performance data
5. AI generates 3 campaign ideas
6. Save to ProjectAnalytics table
           ↓
Return analytics + suggestions to UI
           ↓
Display in expandable cards
```

---

## 💡 Key Features

### ✅ On-Demand Calculation
- No waiting for campaign completion
- Calculate analytics anytime
- Analyze last N posts incrementally

### ✅ Smart Insights
- Best posting hour (0-23)
- Best day of week (Sunday-Saturday)
- Top performing platform
- Engagement trend detection

### ✅ Platform Breakdown
- Individual metrics per platform
- Engagement rate comparison
- Posts, likes, comments, shares, impressions

### ✅ AI-Powered Suggestions
- Data-driven campaign ideas
- Creative and specific
- Includes "why this will work" reasoning
- Actionable content suggestions

---

## 🔮 Future Enhancements

1. **Auto-trigger analytics** after N posts
2. **A/B testing** suggestions
3. **Content pattern analysis** (questions vs statements, length optimization)
4. **Automated insights** ("Your engagement dropped 15% this week")
5. **Campaign templates** created from suggestions
6. **One-click campaign creation** from AI ideas

---

## 🐛 Troubleshooting

### "No analytics available"
- Click "Calculate Analytics" button
- Ensure campaign has published posts with platform data
- Check that OAuth providers are connected

### "AI suggestions not showing"
- Ensure you have posts in last 30 days
- Check AI API keys (GEMINI_API_KEY)
- Look at server logs for AI errors

### "Analytics calculation failed"
- Check that campaign has `meta.campaignId` in scheduled posts
- Verify platform posts exist for scheduled posts
- Check database connection

---

## 📝 Files Changed/Added

### Database:
- `prisma/schema.prisma` - Added CampaignAnalytics, ProjectAnalytics tables

### Backend:
- `src/backend-apis/analytics/calculator.ts` - NEW (core logic)
- `src/app/api/campaigns/[id]/analyze/route.ts` - NEW
- `src/app/api/campaigns/[id]/analytics/route.ts` - NEW
- `src/app/api/projects/[id]/analyze/route.ts` - NEW  
- `src/app/api/projects/[id]/analytics/route.ts` - NEW

### Frontend:
- `src/app/(pages)/project/[id]/_components/campaign-analytics-summary.tsx` - NEW
- `src/app/(pages)/project/[id]/_components/project-analytics-dashboard.tsx` - NEW
- `src/app/(pages)/project/[id]/page.tsx` - MODIFIED (added ProjectAnalyticsDashboard)
- `src/app/(pages)/project/[id]/_components/campaign-planner.tsx` - MODIFIED (added CampaignAnalyticsSummary)

---

## 🎉 Success!

You now have a complete analytics and AI suggestion system that can:
- ✅ Analyze campaign performance on-demand
- ✅ Identify best practices (times, platforms, content)
- ✅ Generate creative campaign ideas based on data
- ✅ Provide actionable insights for improvement

**Next:** Test it with real campaigns and data! 🚀
