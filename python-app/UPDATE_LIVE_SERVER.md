# Update Live Server - Quick Steps

## The Code Now Uses Real API Calls! ✅

The latest code (just pushed) implements real Olive Drift API calls. You need to:

### 1. Pull Latest Code on Live Server

```bash
cd ~/social-content-ai
git pull origin main
```

### 2. Update .env File

**Important**: The environment variable names must match Next.js exactly (no underscores):

```env
# ✅ CORRECT (matches Next.js)
OLIVEDRIFT_API_KEY=your-key-here
OLIVEDRIFT_BASE_URL=https://api.olivedrift.com

# ❌ WRONG (old names - won't work)
OLIVE_DRIFT_API_KEY=...
OLIVE_DRIFT_API_URL=...
```

### 3. Ensure TEST_MODE is Off

```env
# For production, either:
TEST_MODE=false

# Or remove TEST_MODE line entirely
```

### 4. Restart Python App

The cron will pick up changes automatically, or restart manually:

```bash
# Test it works
cd ~/social-content-ai/python-app
source venv/bin/activate
python main.py
```

### 5. Verify It's Using Real API

Check logs - you should see:
```
[INFO] Fetched X Reddit posts for topics: [...]
```

Instead of:
```
[WARNING] fetch_reddit_posts: Placeholder implementation...
```

## What Changed

- ✅ **Real API calls implemented** - No more placeholders
- ✅ **Matches Next.js exactly** - Same endpoints, same format
- ✅ **Proper error handling** - Will log API errors clearly

## If You Still See Warnings

1. **Check you pulled latest code**: `git log -1` should show commit `936e143`
2. **Check .env variables**: Must be `OLIVEDRIFT_API_KEY` and `OLIVEDRIFT_BASE_URL` (no underscores)
3. **Check TEST_MODE**: Should be `false` or not set
4. **Restart Python**: The cron will use new code on next run

## Quick Verification

```bash
# Check code has real implementation
grep -A 5 "def fetch_reddit_posts" python-app/main.py
# Should show: requests.post(f"{self.base_url}/api/getRedditPosts"...

# Check env vars
grep OLIVEDRIFT ~/social-content-ai/.env
# Should show: OLIVEDRIFT_API_KEY and OLIVEDRIFT_BASE_URL
```
