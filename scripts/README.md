# Test Scripts

## Set all users to 100 tokens

Tokens in this app are stored on the user record as `remainingChatGenerations`.

### Usage

```bash
# Set EVERY user to exactly 100 tokens
pnpm tokens:set-all-100

# Only top-up users below 100 tokens (won't reduce anyone above 100)
pnpm tokens:ensure-min-100
```

## Facebook API Test Script

The `test-facebook-api.ts` script is designed to:

1. **Fetch Facebook OAuth providers** from your database
2. **Test Facebook API connections** using stored access tokens
3. **Fetch and analyze Facebook post data** to see what's available
4. **Compare what we're currently storing** vs. what data Facebook provides

### Usage

```bash
# Test all Facebook providers
pnpm test:facebook

# Test a specific provider by ID
pnpm test:facebook <providerId>
```

### What It Does

1. **Connects to Database**: Uses Prisma to fetch all Facebook OAuth providers
2. **Validates Tokens**: Tests if stored access tokens are still valid
3. **Fetches Page Info**: Gets basic page information (name, followers, etc.)
4. **Fetches Posts**: Retrieves posts with extended fields to see all available data
5. **Analyzes Data**: Compares what we store vs. what's available from Facebook API

### Output

The script provides:
- ✅ Provider information (ID, page name, associated projects)
- ✅ Access token validity status
- ✅ Page information (followers, category, etc.)
- ✅ Post data analysis showing:
  - Currently stored fields
  - Available but not stored fields
  - Available insights/metrics

### Currently Stored Data

- Post ID
- Message/content
- Date/created time
- Shares count
- Total likes (reactions)
- Comments count
- Impressions
- Unique impressions

### Additional Available Data (Not Currently Stored)

- Post type (photo, video, link, status)
- Story text
- Permalink URL
- Full picture URL
- Link (for link posts)
- Reaction breakdowns (like, love, wow, haha, sorry, anger)
- Media attachments
- Post reach
- Engaged users
- Post clicks
- Negative feedback
- Story adds/removes

### Environment Variables

Make sure these are set in your `.env` or `.env.local`:

- `DATABASE_URL` - MongoDB connection string (required)
- `AUTH_FACEBOOK_ID` - Facebook App ID (optional, for token operations)
- `AUTH_FACEBOOK_SECRET` - Facebook App Secret (optional, for token operations)

### Example Output

```
================================================================================
Testing Provider: My Facebook Page
================================================================================
Provider ID: 507f1f77bcf86cd799439011
Page ID: 123456789
User: John Doe (john@example.com)
Projects: 2
  - Project A (507f191e810c19729de860ea)
  - Project B (507f191e810c19729de860eb)
Posts in DB: 15

--- Testing Access Token ---
✅ Access token is valid

--- Page Information ---
{
  "id": "123456789",
  "name": "My Facebook Page",
  "category": "Business",
  "followers_count": 1250,
  ...
}

--- Fetching Posts (Extended Fields) ---
✅ Fetched 5 post(s)

--- Post 1: 123456789_987654321 ---
{
  "Currently Stored": {
    "postId": "123456789_987654321",
    "message": "Check out our latest update!",
    ...
  },
  "Available but Not Stored": {
    "type": "photo",
    "permalink_url": "https://facebook.com/...",
    ...
  },
  "Available Insights": {
    "post_engaged_users": 450,
    "post_clicks": 120,
    ...
  }
}
```

