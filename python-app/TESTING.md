# Testing Guide

## Overview

This guide helps you test the complete Blog News flow end-to-end without calling real APIs.

## Prerequisites

1. Database is running and accessible
2. Root `.env` file has `DATABASE_URL` configured
3. Python dependencies installed: `pip install -r requirements.txt`

## Step 1: Set Up Test Data

Create test scheduled posts in the database:

```bash
cd python-app
python test_setup.py
```

This will:
- Create a test campaign (or use existing)
- Create 2 scheduled posts:
  - Post 1: Scheduled for 1 minute from now
  - Post 2: Scheduled for 2 minutes from now
- Create CampaignChat entries for days 1 and 2

## Step 2: Enable Test Mode

Add to your root `.env` file:

```env
TEST_MODE=true
```

This will:
- Use mock Reddit/HackerNews posts (no real API calls)
- Use mock Gemini AI blog generation (no real API calls)

## Step 3: Test Python App (Steps 1 & 2)

### Option A: Run Once (Manual)

```bash
cd python-app
python main.py
```

### Option B: Run as Cron (Recommended for Testing)

Create a test cron that runs every minute:

```bash
# Edit crontab
crontab -e

# Add this line (runs every minute)
* * * * * cd /path/to/social-content-ai && /path/to/python/bin/python python-app/main.py >> /tmp/blog-news-test.log 2>&1
```

**Important:** Use absolute paths in cron!

To test immediately:
```bash
# Run the cron command manually
cd /path/to/social-content-ai && python python-app/main.py
```

## Step 4: Verify Steps 1 & 2

Check the database:

```python
# In Python shell or script
from pymongo import MongoClient
client = MongoClient("your-database-url")
db = client["your-database"]
post = db["ScheduledPost"].find_one({"meta.type": "blog-news"})

# Check Step 1
print("Step 1 completed:", post["meta"].get("step1Completed"))
print("Article:", post["meta"].get("article", {}).get("title"))

# Check Step 2
print("Step 2 completed:", post["meta"].get("step2Completed"))
print("Blog:", post["meta"].get("blog", {}).get("title"))
```

Or check CampaignChat:

```python
chat = db["CampaignChat"].find_one({"plannerId": post["meta"]["campaignId"], "day": 1})
print("Blog in chat:", chat["contents"].get("blog", {}).get("title"))
```

## Step 5: Test Next.js Steps 3 & 4

Once Steps 1 & 2 are complete, test Steps 3 & 4 via API:

### Test Step 3 (Send Webhook)

```bash
# Get the post ID from database or logs
POST_ID="your-post-id-here"

curl -X POST http://localhost:3000/api/blog/step-3-send-webhook \
  -H "Content-Type: application/json" \
  -d "{\"postId\": \"$POST_ID\"}"
```

### Test Step 4 (Finalize)

```bash
curl -X POST http://localhost:3000/api/blog/step-4-finalize \
  -H "Content-Type: application/json" \
  -d "{\"postId\": \"$POST_ID\"}"
```

### Or Use the Cron Endpoint

The Next.js cron (`GET /api/post`) will automatically pick up posts where `step2Completed = true`:

```bash
curl http://localhost:3000/api/post
```

## Step 6: Verify Complete Flow

Check the database:

```python
post = db["ScheduledPost"].find_one({"meta.type": "blog-news"})

# All steps should be complete
print("Step 1:", post["meta"].get("step1Completed"))
print("Step 2:", post["meta"].get("step2Completed"))
print("Step 3:", post["meta"].get("step3Completed"))
print("Step 4:", post["meta"].get("step4Completed"))
print("Status:", post["status"])

# Check platform posts were created
platform_posts = db["ScheduledPost"].find({
    "meta.source": "blog-news",
    "meta.blogNewsPostId": str(post["_id"])
})
print("Platform posts:", list(platform_posts))
```

## Troubleshooting

### Python app not finding posts

- Check `date <= now` - posts must be scheduled in the past
- Check `status = "pending"` or `"processing"`
- Check `step1Completed = false`

### Steps 3 & 4 not triggering

- Verify `step2Completed = true` in database
- Check Next.js cron is running
- Check logs for errors

### Mock data not working

- Verify `TEST_MODE=true` in `.env`
- Check Python app is reading from root `.env`
- Restart Python app after changing `.env`

## Clean Up Test Data

```python
# Remove test posts
db["ScheduledPost"].delete_many({"meta.campaignId": "test-campaign-id"})
db["CampaignChat"].delete_many({"plannerId": "test-campaign-id"})
db["CampaignPlanner"].delete_one({"_id": "test-campaign-id"})
```

## Production Mode

When ready for production:

1. Remove `TEST_MODE=true` from `.env`
2. Implement real Olive Drift API calls in `main.py`
3. Real Gemini API will be used automatically
4. Set up proper cron scheduling
