#!/usr/bin/env python3
"""Check why post 6935eb293226eb6d2780665a wasn't found by Next.js query"""
import os
import sys
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pymongo import MongoClient
from urllib.parse import urlparse
from bson import ObjectId

load_dotenv()

database_url = os.getenv('DATABASE_URL')
parsed = urlparse(database_url)
db_name = parsed.path[1:] if parsed.path else 'social-content-ai'

client = MongoClient(database_url)
db = client[db_name]
scheduled_posts = db["scheduled-posts"]

post_id = ObjectId("6935eb293226eb6d2780665a")
post = scheduled_posts.find_one({"_id": post_id})

if not post:
    print("Post not found!")
    sys.exit(1)

meta = post.get("meta", {})
now = datetime.utcnow()
ten_minutes_ago = now - timedelta(minutes=10)
one_hour_from_now = now + timedelta(hours=1)

print("=" * 70)
print("CHECKING WHY POST WASN'T FOUND BY NEXT.JS QUERY")
print("=" * 70)

print(f"\nPost ID: {str(post['_id'])}")
print(f"Date: {post.get('date')}")
print(f"Status: {post.get('status')}")
print(f"UpdatedAt: {post.get('updatedAt')}")
print(f"Platform: {post.get('platform')}")

# Check query conditions
is_webhook = post.get('platform') == 'webhook'
is_processing = post.get('status') == 'processing'
is_blog_news = meta.get('type') == 'blog-news'
date_in_range = post.get('date') and post.get('date') <= one_hour_from_now
date_passed = post.get('date') and post.get('date') <= now
updated_recent = post.get('updatedAt') and post.get('updatedAt') >= ten_minutes_ago
updated_stuck = post.get('updatedAt') and post.get('updatedAt') <= ten_minutes_ago

print(f"\nQuery Conditions:")
print(f"  platform = 'webhook': {is_webhook}")
print(f"  status = 'processing': {is_processing}")
print(f"  meta.type = 'blog-news': {is_blog_news}")
print(f"  date <= oneHourFromNow: {date_in_range}")
print(f"  date <= now (past due): {date_passed}")
print(f"  updatedAt >= tenMinutesAgo: {updated_recent}")
print(f"  updatedAt <= tenMinutesAgo: {updated_stuck}")

if post.get('updatedAt'):
    time_diff = (now - post.get('updatedAt')).total_seconds() / 60
    print(f"  Minutes since update: {time_diff:.2f}")

# Simulate the Prisma query
would_match_query = (
    is_webhook and
    is_processing and
    date_in_range and
    (updated_recent or updated_stuck)
)

print(f"\nWould match initial query: {would_match_query}")

if would_match_query:
    # Check filter
    would_pass_filter = is_blog_news and date_passed
    print(f"Would pass filter (blog-news + past due): {would_pass_filter}")
    
    if would_pass_filter:
        print(f"\n✅ Post SHOULD be found by query!")
        print(f"   But it wasn't processed. Checking why...")
        
        # Check if it's in the stuck recovery
        step2_done = meta.get('step2Completed')
        step3_done = meta.get('step3Completed')
        
        print(f"\n   Step 2 done: {step2_done}")
        print(f"   Step 3 done: {step3_done}")
        
        if step2_done and not step3_done:
            print(f"\n   ✅ Post should trigger Step 3!")
            print(f"   But logs show it was never processed.")
            print(f"\n   Possible issues:")
            print(f"   1. Query returned it but processing failed silently")
            print(f"   2. Post was in the array but wasn't iterated")
            print(f"   3. Async fetch to Step 3 endpoint failed")
            print(f"   4. Step 3 endpoint returned error but wasn't logged")
    else:
        print(f"\n❌ Post would be filtered out:")
        if not is_blog_news:
            print(f"   - Not blog-news type")
        if not date_passed:
            print(f"   - Date hasn't passed")
else:
    print(f"\n❌ Post would NOT match initial query:")
    if not is_webhook:
        print(f"   - Platform is not 'webhook'")
    if not is_processing:
        print(f"   - Status is not 'processing'")
    if not date_in_range:
        print(f"   - Date is not in range")
    if not (updated_recent or updated_stuck):
        print(f"   - updatedAt doesn't match criteria")
        if post.get('updatedAt'):
            print(f"     updatedAt: {post.get('updatedAt')}")
            print(f"     10 min ago: {ten_minutes_ago}")
            print(f"     Difference: {(post.get('updatedAt') - ten_minutes_ago).total_seconds() / 60:.2f} minutes")

client.close()

