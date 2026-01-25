# Project Selection Demo - Flow Diagram

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User Creates First Project                  │
│                        (Onboarding Modal)                            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Navigate to: /project/{id}?tab=campaign&autoplay=1&fromOnboarding=1│
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Campaign Planner Component Mounts                       │
│              Detects: fromOnboarding=1                              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 Save Demo State to sessionStorage                    │
│                 { phase: 'project-selection', ... }                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│         Show "Creating your first campaign" Message                  │
│                    (1 second delay)                                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│            Navigate to: /project?demo=project-selection              │
│            (Campaign Planner Component Unmounts)                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Project Overview Page Loads                             │
│          ProjectSelectionDemo Component Mounts                       │
│              Detects: demo=project-selection                         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│           Read Demo State from sessionStorage                        │
│           Get projectId and projectName                             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Start Animated Demo                               │
│                                                                       │
│  Step 1: Expand Sidebar (if collapsed)                              │
│          ↓                                                           │
│  Step 2: Click Project Selector Button                              │
│          ↓                                                           │
│  Step 3: Select Project from List                                   │
│          ↓                                                           │
│  Update sessionStorage: { phase: 'campaign-ready', ... }            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│      Navigate to: /project/{id}?tab=campaign&autoplay=1             │
│       (ProjectSelectionDemo Component Unmounts)                      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Campaign Planner Component Mounts Again                 │
│              Detects: autoplay=1 (no fromOnboarding)                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│           Read Demo State from sessionStorage                        │
│           Detect: phase === 'campaign-ready'                         │
│           Clear sessionStorage                                       │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Show Project Location Tour                          │
│              (User clicks "Got it" to continue)                      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│         Show "Creating your first campaign" Message                  │
│                    (3.5 seconds delay)                               │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                Start Campaign Creation Demo                          │
│                                                                       │
│  • Click "Plan Campaign"                                            │
│  • Fill in campaign name                                            │
│  • Select goal                                                       │
│  • Select platforms                                                  │
│  • Adjust audience slider                                           │
│  • Click "Generate"                                                  │
│  • Confirm coins dialog                                             │
│  • Wait for campaign to be created                                  │
│  • Open campaign in list                                            │
│  • Show feature tour                                                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
                           ┌─────────┐
                           │  DONE   │
                           └─────────┘
```

## State Flow in sessionStorage

```
Initial State: (empty)
       ↓
Phase 1: project-selection
{
  phase: 'project-selection',
  projectId: 'abc123',
  projectName: 'My First Project',
  timestamp: 1234567890
}
       ↓
Phase 2: campaign-ready
{
  phase: 'campaign-ready',
  projectId: 'abc123',
  projectName: 'My First Project',
  timestamp: 1234567891
}
       ↓
Final State: (cleared)
```

## URL Parameter Flow

```
Start:
  /project/{id}?tab=campaign&autoplay=1&fromOnboarding=1

Navigate to project selection:
  /project?demo=project-selection

Navigate back after selection:
  /project/{id}?tab=campaign&autoplay=1

Final (URL cleaned):
  /project/{id}?tab=campaign
```

## Component Lifecycle

```
┌────────────────────────┐
│  OnboardingModal       │
│  (creates project)     │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  CampaignPlanner       │ ← First Mount
│  (detects fromOnb.)    │   (saves state, navigates away)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  ProjectSelectionDemo  │ ← Active
│  (runs demo)           │   (updates state, navigates back)
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  CampaignPlanner       │ ← Second Mount
│  (resumes demo)        │   (completes campaign demo)
└────────────────────────┘
```

## Key Decision Points

### 1. Should we show project selection?
```
IF fromOnboarding=1 in URL
  → YES: Start project selection flow
ELSE
  → NO: Continue with normal demo
```

### 2. Should we resume campaign demo?
```
IF sessionStorage.phase === 'campaign-ready'
   AND projectId matches current project
  → YES: Resume with project location tour
ELSE
  → NO: Start fresh demo
```

### 3. Should we show project location tour?
```
IF (autoplay still requested OR resuming from project selection)
   AND tour not shown yet
  → YES: Show tour
ELSE
  → NO: Skip tour
```

## Error Handling

### Navigation Fails
- Demo exits gracefully
- sessionStorage is cleared
- User can manually navigate

### Project Button Not Found
- Console error logged
- Demo stops
- User sees normal UI

### User Stops Demo
- All animations stop immediately
- sessionStorage cleared
- URL params cleaned
- Normal navigation restored

## Performance Considerations

### Memory
- sessionStorage cleared after completion
- Event listeners cleaned up on unmount
- No memory leaks

### Animation
- Uses CSS transitions (hardware accelerated)
- RequestAnimationFrame for smooth cursor movement
- Debounced state updates

### Network
- No additional API calls for demo
- Uses existing project data
- Minimal overhead

## Accessibility Notes

- **Keyboard Navigation**: Demo can be stopped with button click
- **Screen Readers**: Demo state announced via ARIA labels
- **Reduced Motion**: Respects prefers-reduced-motion (if implemented)
- **Focus Management**: Focus restored after demo completion

## Browser Compatibility

- **Modern Browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **sessionStorage**: Widely supported (IE 8+)
- **CSS Transitions**: Graceful degradation for older browsers
- **History API**: Required for URL manipulation (IE 10+)
