# Video Generation & Display Flow

## Overview
This document explains how videos are generated and where they appear after processing.

## Video Generation Paths

### 1. Campaign Planner Flow (Project-based)
**User Journey:**
1. User navigates to a project
2. Opens Campaign Planner
3. Clicks on a specific day's video icon (dashed outline)
4. Creates video with context: `projectId`, `campaignPlannerId`, `day`
5. After generation, redirects back to campaign planner
6. Video icon changes from dashed outline to solid when ready
7. Clicking the solid icon opens the video in a new tab

**Route:** `/project/[id]/video?campaignId=X&day=Y`

**Display Location:** Campaign planner day card (inline)

---

### 2. Quick Video Maker Flow (Standalone)
**User Journey:**
1. User clicks "Quick Video Maker" card on dashboard OR
2. User clicks "Video Maker" tab in sidebar
3. Creates video WITHOUT project context (no `projectId`, `campaignPlannerId`, or `day`)
4. After generation, redirects to "My Videos" page
5. Video appears in "My Videos" with processing status
6. When ready, user can view/download from "My Videos"

**Routes:**
- Creation: `/project/video-maker`
- Display: `/project/my-videos`

**Display Location:** My Videos page (dedicated gallery)

---

## Video Status Flow

### Processing States
1. **No Data** → Shows create button (dashed outline in campaigns)
2. **Pending** → Processing in queue (shows "Processing" badge in My Videos)
3. **Completed** → Ready to view (shows "Completed" badge, download buttons)

### Backend Processing
1. Video uploaded to S3 in `rendering/[folderId]/` folder
2. Metadata files created (txt.txt, metadata.txt)
3. External service processes video
4. Output saved as `output.mp4` in same folder
5. Status updated to "completed" in database

---

## My Videos Page Features

### Display
- Grid layout of all user's videos (both campaign and standalone)
- Video preview with hover-to-play
- Status badges (Processing / Completed)
- Creation date
- Hook text as title

### Actions (when completed)
- **View**: Opens video in new tab
- **Download**: Downloads video file

### Empty State
- Friendly message encouraging first video creation
- Direct link to Video Maker

---

## Database Schema

```prisma
model UploadedVideo {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  userId            String   @db.ObjectId
  projectId         String?  @db.ObjectId       // Optional for standalone videos
  campaignPlannerId String?  @db.ObjectId       // Optional for standalone videos
  folderId          String                       // S3 folder identifier
  text              String                       // Hook text
  day               Int?                         // Optional for standalone videos
  status            String   @default("pending") // "pending" | "completed"
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## Navigation

### Sidebar Links
1. **Video Maker** (purple gradient) → `/project/video-maker`
   - Quick video creation without project setup
   
2. **My Videos** (gray) → `/project/my-videos`
   - View all generated videos
   - Download completed videos

### Dashboard Card
- **Quick Video Maker** (prominent gradient card)
  - Immediately visible to new users
  - Direct access to video creation

---

## API Hooks

### Video Creation
```typescript
useGenerateVideo()
// Returns mutation with smart redirect:
// - If projectId + campaignPlannerId exist → router.back() (campaign flow)
// - Otherwise → router.push("/project/my-videos") (standalone flow)
```

### Video Retrieval

**For Campaign Videos:**
```typescript
useQueryUploadedVideoUrl(projectId, campaignId, day)
// Returns: "no-data" | "pending" | signed_url
```

**For All User Videos:**
```typescript
useQueryAllUploadedVideos()
// Returns: Array of videos with status, URLs, metadata
```

---

## User Experience

### First-Time User
1. Signs up → Sees dashboard with Quick Video Maker card
2. Clicks card → Video Maker page
3. Creates video → Redirects to My Videos
4. Sees video with "Processing" status
5. Returns later → Status changed to "Completed"
6. Views or downloads video

### Campaign User
1. Creates project and campaign
2. Clicks video icon on specific day
3. Creates video → Returns to campaign planner
4. Icon changes when video ready
5. Clicks icon → Opens video
6. Can also find video in "My Videos" page

---

## Key Benefits

✅ **Discovery**: Video feature visible immediately on dashboard  
✅ **Flexibility**: Create videos with or without project context  
✅ **Central Hub**: All videos in one place ("My Videos")  
✅ **Status Tracking**: Clear processing states  
✅ **Easy Access**: Multiple entry points (dashboard, sidebar, campaigns)  
✅ **Context-Aware**: Smart redirects based on creation context

