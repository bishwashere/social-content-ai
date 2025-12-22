#!/usr/bin/env python3
"""Check for Step 3 errors in the database and help analyze logs"""
import os
import sys
from dotenv import load_dotenv
from datetime import datetime
from pymongo import MongoClient
from urllib.parse import urlparse

load_dotenv()

database_url = os.getenv('DATABASE_URL')
parsed = urlparse(database_url)
db_name = parsed.path[1:] if parsed.path else 'social-content-ai'

client = MongoClient(database_url)
db = client[db_name]
scheduled_posts = db["scheduled-posts"]

print("=" * 70)
print("CHECKING FOR STEP 3 ERRORS")
print("=" * 70)

# Find the post
post = scheduled_posts.find_one({
    "platform": "webhook",
    "meta.type": "blog-news",
    "status": "processing",
    "date": datetime(2025, 12, 21, 16, 0, 0)
})

if not post:
    print("Post not found!")
    sys.exit(1)

meta = post.get("meta", {})
post_id = str(post['_id'])

print(f"\nPost ID: {post_id}")
print(f"Status: {post.get('status')}")
print(f"Error field: {post.get('error')}")

print(f"\nStep Status:")
print(f"  Step 1 completed: {meta.get('step1Completed')}")
print(f"  Step 2 completed: {meta.get('step2Completed')}")
print(f"  Step 3 completed: {meta.get('step3Completed')}")
print(f"  Step 4 completed: {meta.get('step4Completed')}")

print(f"\nStep 3 Details:")
print(f"  step3InProgress: {meta.get('step3InProgress')}")
print(f"  step3StartedAt: {meta.get('step3StartedAt')}")
print(f"  step3CompletedAt: {meta.get('step3CompletedAt')}")
print(f"  step3Error: {meta.get('step3Error')}")
print(f"  step3Skipped: {meta.get('step3Skipped')}")
print(f"  webhookSent: {meta.get('webhookSent')}")
print(f"  articleUrl: {meta.get('articleUrl')}")

print(f"\nStep 2 Details (for context):")
print(f"  step2CompletedAt: {meta.get('step2CompletedAt')}")
print(f"  step2Error: {meta.get('step2Error')}")

# Check timestamps
step2_at = meta.get('step2CompletedAt')
step3_started = meta.get('step3StartedAt')
step3_at = meta.get('step3CompletedAt')

if step2_at:
    step2_time = datetime.fromisoformat(step2_at.replace('Z', '+00:00'))
    print(f"\nTimeline:")
    print(f"  Step 2 completed: {step2_time}")
    
    if step3_started:
        step3_start_time = datetime.fromisoformat(step3_started.replace('Z', '+00:00'))
        time_to_step3 = (step3_start_time - step2_time).total_seconds()
        print(f"  Step 3 started: {step3_start_time} ({time_to_step3:.1f}s after Step 2)")
    
    if step3_at:
        step3_time = datetime.fromisoformat(step3_at.replace('Z', '+00:00'))
        if step2_at:
            time_to_complete = (step3_time - step2_time).total_seconds()
            print(f"  Step 3 completed: {step3_time} ({time_to_complete:.1f}s after Step 2)")
    else:
        now = datetime.utcnow()
        if step2_at:
            time_since_step2 = (now - step2_time).total_seconds() / 60
            print(f"  Step 3 NOT completed (waited {time_since_step2:.1f} minutes since Step 2)")

# Check for errors
has_error = bool(meta.get('step3Error')) or bool(post.get('error'))
if has_error:
    print(f"\n❌ ERRORS FOUND:")
    if meta.get('step3Error'):
        print(f"  Step 3 error: {meta.get('step3Error')}")
    if post.get('error'):
        print(f"  Post error: {post.get('error')}")
else:
    print(f"\n✅ No Step 3 errors found in database")

# What to check in logs
print(f"\n" + "=" * 70)
print("WHAT TO CHECK IN LOGS")
print("=" * 70)

print(f"\n1. Search for Step 3 logs for this post ID:")
print(f"   grep -i 'step 3' /root/crontab/logs/nextpostai_api.log | grep {post_id[:12]}")
print(f"   OR")
print(f"   grep -i '{post_id[:12]}' /root/crontab/logs/nextpostai_api.log | grep -i 'step 3'")

print(f"\n2. Search for webhook errors:")
print(f"   grep -i 'webhook' /root/crontab/logs/nextpostai_api.log | grep -i 'error'")

print(f"\n3. Search for Step 3 failures:")
print(f"   grep -i 'step 3' /root/crontab/logs/nextpostai_api.log | grep -i 'fail\\|error'")

print(f"\n4. Check if Step 3 was triggered:")
print(f"   grep -i 'Triggering Step 3' /root/crontab/logs/nextpostai_api.log")

print(f"\n5. Check for async fetch errors:")
print(f"   grep -i 'Failed to trigger Step 3' /root/crontab/logs/nextpostai_api.log")

print(f"\n6. Check Next.js application logs (if available):")
print(f"   - Vercel logs (if deployed there)")
print(f"   - Server logs at /var/log/nextjs/ or similar")
print(f"   - Docker logs if using containers")

print(f"\n7. Check the full log around the time Step 2 completed:")
if step2_at:
    step2_time = datetime.fromisoformat(step2_at.replace('Z', '+00:00'))
    # Convert to EST for log search
    print(f"   Step 2 completed at: {step2_at}")
    print(f"   Search logs around that time")

print(f"\n" + "=" * 70)
print("ANALYSIS")
print("=" * 70)

if meta.get('step3Error'):
    print(f"\n❌ Step 3 has an error recorded: {meta.get('step3Error')}")
    print(f"   This means Step 3 was attempted but failed.")
elif meta.get('step3InProgress'):
    print(f"\n⚠️  Step 3 is marked as 'in progress'")
    print(f"   This might mean it got stuck during processing.")
    print(f"   Check if the process crashed or timed out.")
elif not meta.get('step3Completed') and meta.get('step2Completed'):
    print(f"\n⚠️  Step 2 is done but Step 3 never started")
    print(f"   This means the Next.js cron job didn't trigger Step 3.")
    print(f"   Possible reasons:")
    print(f"   1. Cron job query didn't find the post")
    print(f"   2. Cron job failed before processing")
    print(f"   3. Async fetch to Step 3 endpoint failed silently")
    print(f"   4. Step 3 endpoint returned error but wasn't logged")
else:
    print(f"\n✅ Step 3 appears to be in normal state")

client.close()

