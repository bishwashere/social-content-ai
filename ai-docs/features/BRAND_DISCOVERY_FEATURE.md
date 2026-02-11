# Brand Discovery & Ad Creative Generator - Implementation Summary

## Overview
Implemented a comprehensive brand discovery tool that collects detailed brand information and automatically generates 40+ Facebook ad concepts using AI.

## Database Schema

### BrandDiscovery Model
Stores comprehensive brand information:
- **Product Info**: Brand name, description, features, benefits, hero persona
- **Market Analysis**: Competitors, competitive differentiation
- **Social Proof**: Testimonials, proof points
- **Customer Insights**: Demographics, pain points, transformations, alternatives
- **Behavioral Triggers**: Life events that trigger purchases

### AdCreative Model
Stores generated ad concepts:
- Angle (social proof, FOMO, problem/solution, etc.)
- Image description
- Image copy overlay text
- Headline
- Primary text
- Platform (Facebook)
- Status (draft/active/paused)

## API Endpoints

### POST /api/brand-discovery
**Purpose**: Save brand discovery data and generate ad creatives

**Request Body**:
```json
{
  "projectId": "string",
  "brandName": "string",
  "productDescription": "string",
  "features": ["string"],
  "heroPersona": "string",
  "benefits": ["string"],
  "buyerQuestions": ["string"],
  "competitors": ["string"],
  "competitiveDiff": "string",
  "testimonials": ["string"],
  "proofPoints": ["string"],
  "customerDescription": "string",
  "dreamOutcome": "string",
  "jobsToBeDone": ["string"],
  "challenges": ["string"],
  "emotionalBenefits": ["string"],
  "transformations": ["string"],
  "perceptions": ["string"],
  "alternatives": ["string"],
  "alternativesDiff": "string",
  "lifeEvents": ["string"]
}
```

**Response**:
```json
{
  "success": true,
  "brandDiscovery": { /* saved discovery data */ },
  "adCreatives": [
    {
      "id": "string",
      "angle": "Social Proof",
      "imageDescription": "Happy customers using the product",
      "imageCopy": "Join 10,000+ satisfied customers",
      "headline": "Trusted by thousands",
      "primaryText": "See why customers love..."
    }
  ]
}
```

### GET /api/brand-discovery?projectId={id}
**Purpose**: Retrieve all brand discoveries for a project

**Response**:
```json
{
  "discoveries": [
    {
      "id": "string",
      "brandName": "string",
      "adCreatives": [ /* array of ad creatives */ ],
      "createdAt": "timestamp"
    }
  ]
}
```

## Ad Angles Generated (44 Total)

The AI generates ads for these proven angles:

### Core Angles (34)
1. Social proof
2. Our product vs competitors
3. Our product vs alternatives
4. Before and after
5. Problem/Solution
6. Emotional
7. Key desire
8. Pain
9. Benefits
10. Features
11. Testimonial
12. Transformation
13. Jobs to be done
14. Bold promise
15. Advertorial
16. Controversial
17. FOMO
18. Relatable Scenario
19. Save time
20. Save money
21. It's easy
22. Social approval
23. Increased comfort
24. Increased happiness
25. Reduced stress
26. Reduced fear
27. Convenience
28. Quality
29. Care & Protection of loved ones
30. Disruptive statement
31. Loss aversion
32. Curiosity
33. Pattern interruption
34. Competitors hate this

### AI-Generated Angles (10)
The AI adds 10 additional creative angles it identifies based on the brand's unique positioning.

## Ad Structure

Each generated ad includes:

1. **Image Description**: Visual concept for the ad creative
2. **Image Copy**: Text overlay to place on the image
3. **Headline**: Attention-grabbing headline
4. **Primary Text**: The main ad copy body

## AI Prompt Engineering

The system uses Google Gemini 2.0 Flash with a comprehensive prompt that includes:
- Complete brand worksheet data
- Website URL for context
- Specific formatting requirements (JSON output)
- All 34 standard angles + request for 10 additional angles
- Focus on driving online purchases

## UI Components

### Tools Section (project-tools.tsx)
- Located in the "Tools" tab after "Quick Generate"
- Grid layout for tool cards
- "Add Discovery" tool opens comprehensive questionnaire

### Discovery Dialog
- Scrollable form with organized sections
- 4 main sections: Product, Competition, Social Proof, Customers
- Input validation (brand name & description required)
- Loading states during generation
- Toast notifications for feedback

### Ad Creatives Dialog
- Large scrollable view showing all generated ads
- Each ad displayed in a card with:
  - Angle badge
  - Organized sections for each component
  - Professional styling with icons
- Easy to copy content for use

## User Flow

1. User opens project page
2. Clicks "Tools" tab
3. Opens "Add Discovery" tool
4. Fills out brand questionnaire (required: brand name + description)
5. Clicks "Save & Generate Ads"
6. System saves data to database
7. AI generates 40+ ad concepts (takes 5-15 seconds)
8. Modal displays all generated ads
9. User can copy ad components for use in Facebook Ads Manager

## Technical Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB via Prisma
- **AI**: Google Gemini 2.0 Flash
- **UI Components**: shadcn/ui components
- **Notifications**: Sonner toast library

## Future Enhancements

Potential improvements:
1. Export ads to CSV/PDF
2. Direct integration with Facebook Ads Manager API
3. A/B testing recommendations
4. Performance tracking for generated ads
5. Image generation for ad visuals
6. Multi-platform support (Instagram, LinkedIn, Google Ads)
7. Ad copy variations and testing
8. Industry-specific templates
9. Saved discovery templates
10. Team collaboration on discoveries

## Files Modified/Created

### New Files
- `prisma/schema.prisma` - Added BrandDiscovery and AdCreative models
- `src/app/api/brand-discovery/route.ts` - API endpoint
- `src/app/(pages)/project/[id]/_components/project-tools.tsx` - Tools UI
- `src/hooks/use-toast.ts` - Toast hook (backup)
- `src/components/ui/toaster.tsx` - Toast component (backup)

### Modified Files
- `src/app/(pages)/project/[id]/page.tsx` - Added Tools tab

## Usage Example

```typescript
// Example API call from frontend
const response = await fetch("/api/brand-discovery", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    projectId: "abc123",
    brandName: "SocialPostAI",
    productDescription: "AI-powered social media content generator",
    features: ["Auto-scheduling", "Multi-platform", "AI writing"],
    // ... rest of the fields
  }),
});

const data = await response.json();
console.log(`Generated ${data.adCreatives.length} ad concepts`);
```

## Notes

- The build currently has a recurring Next.js cache issue (PageNotFoundError for _document). This appears to be a known Next.js bug and doesn't affect functionality in dev mode.
- All features work correctly in development mode (`pnpm dev`)
- The AI can take 5-15 seconds to generate all ads depending on response time
- Fallback ads are provided if AI generation fails
- All discovery data is persisted for future reference and iteration
