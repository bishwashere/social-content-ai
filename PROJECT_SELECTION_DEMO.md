# Project Selection Demo Feature

## Overview
Enhanced the onboarding demo to show users how to navigate the project selector before starting the campaign creation demo.

## Changes Made

### 1. Modified `/project/page.tsx`
- Added `fromOnboarding=1` parameter when redirecting to project after creation
- Imported and integrated `ProjectSelectionDemo` component

### 2. Created `/components/common/project-selection-demo.tsx`
- New component that handles the project selection demonstration on the `/project` page
- Shows animated cursor and highlights as it:
  1. Expands the sidebar (if collapsed)
  2. Clicks on the project selector button
  3. Selects the newly created project from the list
  4. Navigates to the project detail page

### 3. Modified `/project/_components/project-sidebar.tsx`
- Added data attributes to project items:
  - `data-project-item="true"`
  - `data-project-id={project.id}`
  - `data-project-name={project.name}`
- These attributes make it easier for the demo to reliably find and click on the correct project

### 4. Modified `/project/[id]/_components/campaing-planner.tsx`
- Updated demo logic to detect `fromOnboarding=1` parameter
- Uses `sessionStorage` to maintain demo state across navigation:
  - Phase 1: `project-selection` - triggers demo on `/project` page
  - Phase 2: `campaign-ready` - resumes campaign demo after project selection
- Navigation flow:
  1. User creates first project → navigates to `/project/{id}?tab=campaign&autoplay=1&fromOnboarding=1`
  2. Campaign planner detects `fromOnboarding=1`, saves state, navigates to `/project?demo=project-selection`
  3. `ProjectSelectionDemo` runs on `/project` page
  4. After project selection, navigates back to `/project/{id}?tab=campaign&autoplay=1`
  5. Campaign planner detects resumed state and continues with campaign demo

## Demo Flow

### New User Experience:
1. **Onboarding Modal** - User creates their first project
2. **"Creating your first campaign" message** - Brief loading message
3. **Navigate to /project page** - Return to project overview
4. **Project Selection Demo**:
   - "Let's select your project"
   - Sidebar expands (if collapsed)
   - Click on project selector button
   - Click on the project from the list
5. **Project Location Tour** - Shows where projects are located in the sidebar
6. **"Creating your first campaign" message** - Pre-campaign demo message
7. **Campaign Creation Demo** - Original demo continues as before

## Technical Details

### State Management
- Uses `sessionStorage` to persist demo state across page navigations
- State object structure:
  ```typescript
  {
    phase: 'project-selection' | 'campaign-ready',
    projectId: string,
    projectName: string,
    timestamp: number
  }
  ```

### Demo Coordination
- `fromOnboarding=1` URL parameter triggers the extended demo flow
- `demo=project-selection` URL parameter activates the project selection demo
- State is cleared after successful completion or when user stops the demo

### User Controls
- "Stop demo" button available at all times during the demo
- Pressing stop clears sessionStorage and cancels all pending animations
- Demo can be cancelled by clicking anywhere outside interactive elements

## Benefits

1. **Better Onboarding** - Users understand where to find and switch between projects
2. **Visual Learning** - Animated cursor shows exactly where to click
3. **Contextual Tour** - Project location tour appears right after selection
4. **Seamless Flow** - Smooth transitions between different demo phases
5. **No Confusion** - Users won't wonder how they got to the project page

## Testing Recommendations

1. Test with a completely new user (zero projects)
2. Verify sidebar expansion works on mobile and desktop
3. Test with sidebar initially collapsed vs expanded
4. Verify demo can be stopped at any point
5. Test with multiple projects in the list
6. Verify sessionStorage is properly cleared after completion
