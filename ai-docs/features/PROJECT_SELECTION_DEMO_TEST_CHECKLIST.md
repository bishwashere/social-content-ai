# Testing Checklist: Project Selection Demo

## Prerequisites
- [ ] Dev server is running (`pnpm dev`)
- [ ] Database is accessible
- [ ] User account with zero projects (for clean test)

## Test Scenarios

### Scenario 1: First-Time User Experience
**Steps:**
1. [ ] Create a new user account or clear all projects from test account
2. [ ] Log in to the application
3. [ ] Onboarding modal should appear automatically
4. [ ] Create first project through the modal
5. [ ] Observe the full demo sequence:
   - [ ] "Creating your first campaign" message appears
   - [ ] Page navigates to `/project` (home page)
   - [ ] Project selection demo starts automatically
   - [ ] Sidebar expands (if it was collapsed)
   - [ ] Animated cursor moves to project selector button
   - [ ] Project selector opens
   - [ ] Animated cursor selects the newly created project
   - [ ] Page navigates to project detail page
   - [ ] Project location tour appears
   - [ ] After closing tour, "Creating your first campaign" message appears again
   - [ ] Campaign creation demo continues as normal

**Expected Results:**
- [ ] All transitions are smooth
- [ ] No console errors
- [ ] "Stop demo" button is visible throughout
- [ ] Demo can be stopped at any point
- [ ] sessionStorage is cleared after completion

### Scenario 2: Demo Interruption
**Steps:**
1. [ ] Start the demo as in Scenario 1
2. [ ] Click "Stop demo" button during project selection phase
3. [ ] Verify demo stops immediately
4. [ ] Check that sessionStorage is cleared
5. [ ] Manually navigate to project detail page
6. [ ] Verify no auto-demos start

**Expected Results:**
- [ ] Demo stops cleanly
- [ ] No orphaned state in sessionStorage
- [ ] User can navigate normally after stopping

### Scenario 3: Sidebar Initially Collapsed
**Steps:**
1. [ ] Collapse the sidebar before creating first project
2. [ ] Create first project
3. [ ] Watch demo sequence
4. [ ] Verify sidebar expansion is animated

**Expected Results:**
- [ ] Sidebar expands smoothly
- [ ] Demo continues after expansion
- [ ] No layout shifts or jumps

### Scenario 4: Multiple Projects in List
**Steps:**
1. [ ] Create 2-3 projects first
2. [ ] Delete demo flag from database to trigger demo again
3. [ ] Navigate to project with autoplay
4. [ ] Verify correct project is selected in demo

**Expected Results:**
- [ ] Demo selects the current project, not the first in list
- [ ] Project selector shows all projects
- [ ] Selection is accurate

### Scenario 5: Mobile View
**Steps:**
1. [ ] Resize browser to mobile width (< 768px)
2. [ ] Start demo sequence
3. [ ] Verify all elements are visible
4. [ ] Check that demo works on small screens

**Expected Results:**
- [ ] Demo overlay is responsive
- [ ] Cursor and highlights are visible
- [ ] Labels don't overflow
- [ ] Stop button is accessible

### Scenario 6: Returning User
**Steps:**
1. [ ] Log in with account that has already seen demo
2. [ ] Create a new project
3. [ ] Verify NO demo starts automatically

**Expected Results:**
- [ ] Direct navigation to project page
- [ ] No demo animations
- [ ] Normal user flow

## Edge Cases

### Edge Case 1: Fast Navigation
- [ ] Try to navigate away during demo
- [ ] Verify demo state is handled correctly
- [ ] Check for race conditions

### Edge Case 2: Browser Back Button
- [ ] Start demo
- [ ] Press browser back button during demo
- [ ] Verify demo cancels and state is cleaned

### Edge Case 3: Page Reload
- [ ] Start demo
- [ ] Reload page during project selection
- [ ] Verify demo doesn't restart
- [ ] Check sessionStorage is cleared on page unload

## Performance Checks
- [ ] Demo animations are smooth (60fps)
- [ ] No memory leaks after demo completion
- [ ] No excessive re-renders
- [ ] Page loads quickly after demo

## Accessibility Checks
- [ ] Demo can be stopped with keyboard (ESC key if implemented)
- [ ] Screen reader announces demo status
- [ ] High contrast mode works with demo overlay
- [ ] No focus traps during demo

## Browser Compatibility
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Console Checks
Look for these log messages in correct order:
1. `[DEMO] Coming from onboarding, navigating to project selection`
2. `[PROJECT-DEMO] Starting project selection demo`
3. `[PROJECT-DEMO] Project selector found`
4. Demo completion and navigation back to project
5. `[DEMO] Project location tour completed`
6. Campaign demo starts

## Known Issues / Notes
- Document any issues found during testing
- Note any performance concerns
- List any UX improvements needed

## Sign-off
- [ ] All critical tests passed
- [ ] No blocking bugs found
- [ ] Ready for production
- Tested by: _______________
- Date: _______________
