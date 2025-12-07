# Python App Deployment Guide

## Overview

This guide helps you deploy the Python Blog News worker on your live server. The Python app handles Steps 1 & 2 (fetch article, generate blog), while Next.js handles Steps 3 & 4.

## Prerequisites

- Server with Python 3.8+ installed
- MongoDB database access (same as Next.js)
- Root `.env` file with required variables
- Cron access (for scheduling)

## Step 1: Clone/Update Repository

```bash
# If not already cloned
git clone <your-repo-url>
cd social-content-ai

# Or if already cloned, pull latest
git pull origin main
```

## Step 2: Set Up Python Environment

```bash
cd python-app

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Step 3: Configure Environment Variables

The Python app reads from the **root `.env` file** (same as Next.js).

Ensure your root `.env` file has:

```env
# Database (required)
DATABASE_URL=mongodb://your-connection-string

# Gemini AI (required for Step 2)
GEMINI_API_KEY=your-primary-key
GEMINI_API_KEY_1=backup-key-1  # Optional
GEMINI_API_KEY_2=backup-key-2  # Optional

# Olive Drift API (required for Step 1)
OLIVE_DRIFT_API_KEY=your-key
OLIVE_DRIFT_API_URL=https://api.olivedrift.com

# Retry Configuration (optional)
MAX_RETRIES=3
RETRY_DELAY_SECONDS=60

# Logging (optional)
LOG_LEVEL=INFO
LOG_FILE=logs/blog-news-worker.log

# Test Mode (set to false for production)
TEST_MODE=false
```

## Step 4: Test the Setup

```bash
# Activate virtual environment
cd python-app
source venv/bin/activate

# Test database connection
python -c "from main import Database; import os; from dotenv import load_dotenv; load_dotenv(); db = Database(os.getenv('DATABASE_URL')); print('✅ Database connected')"

# Test with a single post (if you have one)
python main.py --post-id <post-id>

# Or run normally (will process pending posts)
python main.py
```

## Step 5: Set Up Cron Job

### Option A: Using Crontab (Recommended)

```bash
# Edit crontab
crontab -e

# Add this line (runs every 5 minutes)
# Replace /path/to with your actual paths
*/5 * * * * cd /path/to/social-content-ai && /path/to/social-content-ai/python-app/venv/bin/python python-app/main.py >> /var/log/blog-news-worker.log 2>&1
```

**Important**: Use absolute paths in cron!

To find your paths:
```bash
# Get project path
pwd  # e.g., /home/user/social-content-ai

# Get Python path
which python3  # e.g., /usr/bin/python3
# Or use venv path:
/path/to/social-content-ai/python-app/venv/bin/python
```

### Option B: Using Systemd Service (Alternative)

Create `/etc/systemd/system/blog-news-worker.service`:

```ini
[Unit]
Description=Blog News Python Worker
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/social-content-ai
Environment="PATH=/path/to/social-content-ai/python-app/venv/bin:/usr/bin"
ExecStart=/path/to/social-content-ai/python-app/venv/bin/python python-app/main.py
Restart=on-failure
RestartSec=60
StandardOutput=append:/var/log/blog-news-worker.log
StandardError=append:/var/log/blog-news-worker.log

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable blog-news-worker
sudo systemctl start blog-news-worker

# Check status
sudo systemctl status blog-news-worker

# View logs
sudo journalctl -u blog-news-worker -f
```

### Option C: Using Supervisor (Alternative)

Create `/etc/supervisor/conf.d/blog-news-worker.conf`:

```ini
[program:blog-news-worker]
command=/path/to/social-content-ai/python-app/venv/bin/python /path/to/social-content-ai/python-app/main.py
directory=/path/to/social-content-ai
user=your-user
autostart=true
autorestart=true
stderr_logfile=/var/log/blog-news-worker.err.log
stdout_logfile=/var/log/blog-news-worker.out.log
```

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start blog-news-worker
```

## Step 6: Set Up Logging Directory

```bash
# Create logs directory
mkdir -p /path/to/social-content-ai/python-app/logs

# Set permissions
chmod 755 /path/to/social-content-ai/python-app/logs
```

## Step 7: Verify It's Working

### Check Cron is Running

```bash
# Check cron logs
tail -f /var/log/blog-news-worker.log

# Or check system logs
grep CRON /var/log/syslog | tail -20
```

### Check Database

```bash
# Use the status check script
cd python-app
source venv/bin/activate
python check_status.py
```

### Monitor Processing

```bash
# Watch logs in real-time
tail -f /var/log/blog-news-worker.log

# Or if using systemd
sudo journalctl -u blog-news-worker -f
```

## Step 8: Implement Real Olive Drift API

**Important**: The current code has placeholder functions for Olive Drift API. You need to implement them:

Edit `python-app/main.py` and implement:

1. `ArticleFetcher.fetch_reddit_posts()` - Replace placeholder with real API call
2. `ArticleFetcher.fetch_hackernews_posts()` - Replace placeholder with real API call

See `IMPLEMENTATION_NOTES.md` for details.

## Step 9: Production Checklist

- [ ] Python virtual environment created
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file configured with all required variables
- [ ] `TEST_MODE=false` in `.env` (or removed)
- [ ] Real Olive Drift API calls implemented
- [ ] Cron job set up and tested
- [ ] Logs directory created
- [ ] Logs are being written
- [ ] Database connection working
- [ ] Test run successful (`python main.py`)
- [ ] Monitoring set up (logs, alerts)

## Troubleshooting

### Python app not running

```bash
# Check if cron is running
ps aux | grep cron

# Check cron logs
grep CRON /var/log/syslog

# Test manually
cd /path/to/social-content-ai/python-app
source venv/bin/activate
python main.py
```

### Database connection errors

```bash
# Test connection
python -c "from pymongo import MongoClient; import os; from dotenv import load_dotenv; load_dotenv(); client = MongoClient(os.getenv('DATABASE_URL')); print('Connected:', client.server_info())"
```

### Permission errors

```bash
# Ensure user has permissions
chmod +x python-app/main.py
chmod -R 755 python-app/
```

### Import errors

```bash
# Reinstall dependencies
cd python-app
source venv/bin/activate
pip install -r requirements.txt --force-reinstall
```

### Posts not being processed

```bash
# Check if posts exist and are ready
python check_status.py

# Check date/time - posts must have date <= now
# Verify status is "pending" or "processing"
# Verify step1Completed is false
```

## Monitoring

### Check Status Regularly

```bash
# Run status check
cd python-app
source venv/bin/activate
python check_status.py
```

### Check Logs

```bash
# View recent logs
tail -100 /var/log/blog-news-worker.log

# Search for errors
grep ERROR /var/log/blog-news-worker.log

# Search for specific post
grep "6935bf26f90a9c334f77b93b" /var/log/blog-news-worker.log
```

### Check Cron Execution

```bash
# Verify cron is running the job
grep "blog-news-worker" /var/log/syslog | tail -20
```

## Next Steps

1. ✅ Deploy Python app
2. ✅ Set up cron job
3. ✅ Monitor logs for first few runs
4. ✅ Verify posts are being processed
5. ✅ Check Next.js is picking up Step 2 completions
6. ✅ Monitor for errors and adjust as needed

## Support

If you encounter issues:
1. Check logs: `/var/log/blog-news-worker.log`
2. Run status check: `python check_status.py`
3. Test manually: `python main.py --post-id <id>`
4. Verify environment: Check `.env` file has all required variables
