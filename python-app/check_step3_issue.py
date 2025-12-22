#!/usr/bin/env python3
"""Check why Step 3 (webhook) hasn't been triggered"""
import os
import sys
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pymongo import MongoClient
from urllib.parse import urlparse

load_dotenv()

database_url = os.getenv('DATABASE_URL')
parsed = urlparse(database_url)
db_name = parsed.path[1:] if parsed.path else 'social-content-ai'

client = MongoClient(database_url)
db = client[db_name]
scheduled_posts = db["scheduled-posts"]

now = datetime.utcnow()
ten_minutes_ago = now - timedelta(minutes=10)

print("=" * 70)
print("CHECKING WHY STEP 3 (WEBHOOK) HASN'T BEEN TRIGGERED")
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
updated_at = post.get("updatedAt")

print(f"\nPost Details:")
print(f"  ID: {str(post['_id'])[:20]}...")
print(f"  Date: {post.get('date')}")
print(f"  Status: {post.get('status')}")
print(f"  UpdatedAt: {updated_at}")

if updated_at:
    time_diff = (now - updated_at).total_seconds() / 60
    print(f"  Minutes since update: {time_diff:.2f}")
    print(f"  Updated recently (>=10 min ago): {updated_at >= ten_minutes_ago}")
    print(f"  Is stuck (<=10 min ago): {updated_at <= ten_minutes_ago}")

print(f"\nStep Status:")
print(f"  Step 1 completed: {meta.get('step1Completed')}")
print(f"  Step 2 completed: {meta.get('step2Completed')}")
print(f"  Step 3 completed: {meta.get('step3Completed')}")
print(f"  Step 4 completed: {meta.get('step4Completed')}")
print(f"  Step 3 in progress: {meta.get('step3InProgress')}")

print(f"\nStep 2 completed at: {meta.get('step2CompletedAt')}")

# Check if it would match the Next.js query
is_past_due = post.get('date') <= now
is_recent = updated_at and updated_at >= ten_minutes_ago if updated_at else False
is_stuck_query = updated_at and updated_at <= ten_minutes_ago if updated_at else False

print(f"\n" + "=" * 70)
print("NEXT.JS CRON QUERY CHECK")
print("=" * 70)

print(f"\nQuery conditions:")
print(f"  Date passed (date <= now): {is_past_due}")
print(f"  Updated recently (updatedAt >= 10 min ago): {is_recent}")
print(f"  Is stuck (updatedAt <= 10 min ago): {is_stuck_query}")
print(f"  Would be found: {is_past_due and (is_recent or is_stuck_query)}")

if is_past_due and (is_recent or is_stuck_query):
    print(f"\n✅ Post SHOULD be found by Next.js cron query")
    
    # Check Step 3 trigger condition
    step2_done = meta.get('step2Completed')
    step3_done = meta.get('step3Completed')
    step3_in_progress = meta.get('step3InProgress')
    
    print(f"\nStep 3 trigger conditions:")
    print(f"  step2Completed = true: {step2_done}")
    print(f"  step3Completed = false: {not step3_done}")
    print(f"  step3InProgress = false: {not step3_in_progress}")
    
    if step2_done and not step3_done and not step3_in_progress:
        print(f"\n✅ Post SHOULD trigger Step 3!")
        print(f"   But it hasn't been triggered yet.")
        print(f"   Possible reasons:")
        print(f"   1. Next.js cron job hasn't run yet")
        print(f"   2. Cron job failed silently")
        print(f"   3. Step 3 endpoint is failing")
        print(f"   4. Network issue with async fetch")
    else:
        print(f"\n⚠️  Step 3 condition not met:")
        if not step2_done:
            print(f"   - step2Completed is not true")
        if step3_done:
            print(f"   - step3Completed is already true")
        if step3_in_progress:
            print(f"   - step3InProgress is true (already in progress)")
else:
    print(f"\n❌ Post would NOT be found by Next.js cron query!")
    print(f"   This is why Step 3 hasn't been triggered!")
    print(f"\n   Issue:")
    if not is_past_due:
        print(f"   - Date hasn't passed yet")
    if not is_recent and not is_stuck_query:
        print(f"   - updatedAt doesn't match recent or stuck criteria")
        if updated_at:
            print(f"     updatedAt: {updated_at}")
            print(f"     10 min ago: {ten_minutes_ago}")
            print(f"     Difference: {(updated_at - ten_minutes_ago).total_seconds() / 60:.2f} minutes")

client.close()

