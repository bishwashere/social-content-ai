# Live Site Setup - Quick Guide

## Prerequisites
- SSH access to your live server
- Python 3.8+ installed
- Same MongoDB database as Next.js

## Quick Setup (5 minutes)

### 1. Pull Latest Code
```bash
cd /path/to/social-content-ai
git pull origin main
```

### 2. Run Quick Deploy Script
```bash
cd python-app
chmod +x QUICK_DEPLOY.sh
../QUICK_DEPLOY.sh
```

Or manually:

### 3. Set Up Python Environment
```bash
cd python-app
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Verify .env File
Ensure root `.env` has:
```env
DATABASE_URL=your-mongodb-connection-string
GEMINI_API_KEY=your-key
GEMINI_API_KEY_1=backup-key-1  # Optional
GEMINI_API_KEY_2=backup-key-2  # Optional
OLIVEDRIFT_API_KEY=your-key
OLIVEDRIFT_BASE_URL=https://api.olivedrift.com
TEST_MODE=false  # Important: false for production
```

### 5. Test Connection
```bash
cd python-app
source venv/bin/activate
python main.py --help
```

### 6. Set Up Cron (Every 5 minutes)
```bash
crontab -e
```

Add this line (replace paths with your actual paths):
```bash
*/5 * * * * cd /path/to/social-content-ai && /path/to/social-content-ai/python-app/venv/bin/python python-app/main.py >> /var/log/blog-news-worker.log 2>&1
```

**Find your paths:**
```bash
# Project path
pwd  # Use this as /path/to/social-content-ai

# Python path
/path/to/social-content-ai/python-app/venv/bin/python
```

### 7. Create Logs Directory
```bash
mkdir -p /var/log
touch /var/log/blog-news-worker.log
chmod 666 /var/log/blog-news-worker.log
```

### 8. Test Run
```bash
cd python-app
source venv/bin/activate
python main.py
```

### 9. Monitor
```bash
# Watch logs
tail -f /var/log/blog-news-worker.log

# Check status
cd python-app
source venv/bin/activate
python check_status.py
```

## Verify It's Working

1. **Check cron is running:**
   ```bash
   grep CRON /var/log/syslog | tail -5
   ```

2. **Check Python app logs:**
   ```bash
   tail -20 /var/log/blog-news-worker.log
   ```

3. **Check database:**
   ```bash
   cd python-app
   source venv/bin/activate
   python check_status.py
   ```

## Important: Implement Real APIs

Before production, edit `python-app/main.py` and implement:
- `ArticleFetcher.fetch_reddit_posts()` - Real Olive Drift API call
- `ArticleFetcher.fetch_hackernews_posts()` - Real Olive Drift API call

See `IMPLEMENTATION_NOTES.md` for details.

## Troubleshooting

**Python app not running?**
```bash
# Test manually
cd python-app
source venv/bin/activate
python main.py

# Check cron
crontab -l
```

**Database errors?**
```bash
# Test connection
python -c "from pymongo import MongoClient; import os; from dotenv import load_dotenv; load_dotenv(); client = MongoClient(os.getenv('DATABASE_URL')); print('Connected')"
```

**No posts processing?**
- Check posts have `date <= now`
- Check `status = "pending"` or `"processing"`
- Check `step1Completed = false`

## That's It!

The Python app will now:
- Run every 5 minutes via cron
- Process Steps 1 & 2 for pending posts
- Next.js will automatically pick up and process Steps 3 & 4

No additional configuration needed - it reads from the same database as Next.js!
