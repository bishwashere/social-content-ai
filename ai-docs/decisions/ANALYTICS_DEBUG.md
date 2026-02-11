# Analytics Debug Guide

## Issue: No Analytics Data Showing

### What I've Added

1. **Debug Endpoint**: `/api/debug-analytics?email=bishwashere@gmail.com`
   - Shows complete database state for the user
   - Lists all projects, OAuth providers, mappings, and posts
   - Accessible when logged in

2. **Enhanced Logging**: Added console.log statements in metrics functions to track:
   - User ID and Project ID being queried
   - Number of OAuth providers found
   - Number of providers linked to project
   - Number of posts found

3. **Better Error Handling**: 
   - Fixed bug where accessing `projectOauthProvider[0]` when array is empty
   - Added proper error messages when no providers are linked
   - Frontend now displays error messages instead of empty data

### Common Issues to Check

1. **No OAuth Providers Connected**
   - Check: Settings → Connected Accounts
   - Solution: Connect social media accounts

2. **OAuth Providers Not Linked to Project**
   - Check: Project page → Should show "Connect Facebook/LinkedIn" alerts
   - Solution: Link accounts to the project

3. **No Posts in Database**
   - Check: Even if accounts are linked, posts need to be fetched from platform APIs
   - Solution: Visit analytics page - it will automatically fetch historical posts on first visit

4. **Project Not Selected**
   - Check: Analytics page should show project cards at top
   - Solution: Click on a project card to select it

### How to Debug

1. **Check Browser Console**
   - Open DevTools → Console
   - Look for `[getAllPlatformMetrics]` or `[getFacebookMetrics]` logs
   - These show what's being queried and what's found

2. **Check Network Tab**
   - Open DevTools → Network
   - Look for requests to `/api/*/metrics` or similar
   - Check response for error messages

3. **Use Debug Endpoint** (when logged in)
   ```
   GET /api/debug-analytics?email=bishwashere@gmail.com
   ```
   This returns complete database state

### Expected Flow

1. User connects OAuth provider (Facebook, LinkedIn, etc.)
2. Provider is auto-linked to matching projects (by name)
3. User visits analytics page
4. System checks for existing posts in database
5. If no posts, fetches from platform API
6. Saves posts to database
7. Displays analytics

### Database Checks

Run these queries to check data:

```javascript
// Check user
db.users.findOne({ email: "bishwashere@gmail.com" })

// Check OAuth providers
db["oauth-providers"].find({ userId: ObjectId("...") })

// Check project mappings
db["project-to-oauth-providers"].find({ 
  oauthProviderId: ObjectId("...") 
})

// Check platform posts
db["platform-posts"].find({ 
  oauthProviderId: ObjectId("...") 
})
```

### Next Steps

1. Visit `/project/analytics` and check browser console
2. Look for error messages in the UI (now properly displayed)
3. Check if project is selected (should see project cards)
4. Verify accounts are linked to the selected project
5. Check if posts exist or need to be fetched from API

