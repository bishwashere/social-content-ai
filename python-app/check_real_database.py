#!/usr/bin/env python3
"""
Standalone script to check the real database state.
Doesn't require main.py imports - uses pymongo directly.
"""
import os
import sys
from dotenv import load_dotenv
from datetime import datetime
from pymongo import MongoClient
from urllib.parse import urlparse

load_dotenv()

# Connect to database
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("❌ DATABASE_URL not found in .env")
    sys.exit(1)

parsed = urlparse(database_url)
db_name = parsed.path[1:] if parsed.path else 'social-content-ai'

client = MongoClient(database_url)
db = client[db_name]
scheduled_posts = db["scheduled-posts"]

now = datetime.utcnow()

print("=" * 70)
print("CHECKING REAL DATABASE STATE")
print("=" * 70)

# Step 1: Find ALL processing webhook blog-news posts
print("\n📊 Step 1: Finding ALL processing webhook blog-news posts...")
all_processing = list(scheduled_posts.find({
    "platform": "webhook",
    "meta.type": "blog-news",
    "status": "processing"
}))

print(f"Found {len(all_processing)} processing posts\n")

if len(all_processing) == 0:
    print("⚠️  No processing posts found. Checking all statuses...")
    all_posts = list(scheduled_posts.find({
        "platform": "webhook",
        "meta.type": "blog-news"
    }))
    statuses = {}
    for post in all_posts:
        status = post.get("status", "unknown")
        statuses[status] = statuses.get(status, 0) + 1
    print(f"Total webhook blog-news posts: {len(all_posts)}")
    print(f"Status breakdown: {statuses}")
    sys.exit(0)

# Step 2: Check each processing post
print("📋 Step 2: Checking state of each processing post:")
stuck_posts = []

for i, post in enumerate(all_processing, 1):
    meta = post.get("meta", {})
    post_id = str(post['_id'])
    post_date = post.get("date")
    
    step1_done = meta.get("step1Completed", False)
    step2_done = meta.get("step2Completed", False)
    step1_progress = meta.get("step1InProgress", False)
    step2_progress = meta.get("step2InProgress", False)
    has_article = bool(meta.get("article"))
    
    print(f"\n  Post {i}: {post_id[:20]}...")
    print(f"    Date: {post_date}")
    print(f"    Date passed: {post_date <= now if post_date else 'N/A'}")
    print(f"    Step 1 completed: {step1_done}")
    print(f"    Step 2 completed: {step2_done}")
    print(f"    Step 1 in progress: {step1_progress}")
    print(f"    Step 2 in progress: {step2_progress}")
    print(f"    Has article: {has_article}")
    
    # Check if stuck
    is_stuck = step1_done and not step2_done
    if is_stuck:
        stuck_posts.append({
            "post_id": post_id,
            "post": post,
            "post_date": post_date,
            "step2_progress": step2_progress,
            "has_article": has_article
        })
        print(f"    ⚠️  STUCK: Step 1 done but Step 2 not done")

print(f"\n📊 Found {len(stuck_posts)} stuck posts")

# Step 3: Test the ACTUAL query
print("\n" + "=" * 70)
print("📋 Step 3: Testing ACTUAL query from find_pending_posts()")
print("=" * 70)

query = {
    "platform": "webhook",
    "meta.type": "blog-news",
    "status": {
        "$in": ["pending", "processing"]
    },
    "$and": [
        {
            "$or": [
                {
                    "$and": [
                        {
                            "$or": [
                                {"meta.step1Completed": {"$ne": True}},
                                {"meta.step1Completed": {"$exists": False}}
                            ]
                        },
                        {
                            "$or": [
                                {"meta.step1InProgress": {"$ne": True}},
                                {"meta.step1InProgress": {"$exists": False}}
                            ]
                        },
                        {
                            "$or": [
                                {"meta.step1Error": None},
                                {"meta.step1Error": {"$exists": False}}
                            ]
                        }
                    ]
                },
                {
                    "$and": [
                        {"meta.step1Completed": True},
                        {
                            "$or": [
                                {"meta.step2Completed": {"$ne": True}},
                                {"meta.step2Completed": {"$exists": False}}
                            ]
                        },
                        {
                            "$or": [
                                {"meta.step2InProgress": {"$ne": True}},
                                {"meta.step2InProgress": {"$exists": False}}
                            ]
                        },
                        {
                            "$or": [
                                {"meta.step2Error": None},
                                {"meta.step2Error": {"$exists": False}}
                            ]
                        }
                    ]
                }
            ]
        }
    ],
    "date": {"$lte": now},
}

found_by_query = list(scheduled_posts.find(query))
print(f"Query found: {len(found_by_query)} posts\n")

# Step 4: Compare results
print("=" * 70)
print("📊 COMPARISON RESULTS")
print("=" * 70)

found_ids = {str(p['_id']) for p in found_by_query}
stuck_ids = {s["post_id"] for s in stuck_posts}

# Filter stuck posts that should be found
should_be_found = []
for stuck in stuck_posts:
    if stuck['step2_progress']:
        continue  # Excluded by query
    if stuck['post_date'] and stuck['post_date'] > now:
        continue  # Future date
    should_be_found.append(stuck)

print(f"\nStuck posts: {len(stuck_posts)}")
print(f"Stuck posts (should be found): {len(should_be_found)}")
print(f"Posts found by query: {len(found_by_query)}")

if len(should_be_found) > 0:
    print(f"\n📋 Stuck posts that SHOULD be found:")
    for stuck in should_be_found:
        is_found = stuck['post_id'] in found_ids
        status = "✅ FOUND" if is_found else "❌ NOT FOUND"
        print(f"  {status}: {stuck['post_id'][:20]}...")
        if not is_found:
            print(f"     ⚠️  This is a BUG - query should find this post!")

missing = [s for s in should_be_found if s['post_id'] not in found_ids]

print("\n" + "=" * 70)
print("📊 FINAL VERIFICATION")
print("=" * 70)

if len(missing) == 0 and len(should_be_found) > 0:
    print(f"\n✅ SUCCESS! All {len(should_be_found)} stuck posts are found by query!")
    print(f"   The fix IS WORKING!")
    print(f"   These posts will be processed on next Python app run.")
elif len(should_be_found) == 0:
    if len(stuck_posts) > 0:
        print(f"\n⚠️  Found {len(stuck_posts)} stuck posts but they're excluded:")
        for stuck in stuck_posts:
            if stuck['step2_progress']:
                print(f"   - {stuck['post_id'][:20]}... has step2InProgress=True")
            if stuck['post_date'] and stuck['post_date'] > now:
                print(f"   - {stuck['post_id'][:20]}... has future date")
    else:
        print(f"\n✅ No stuck posts found - all processing posts are in good state!")
else:
    print(f"\n❌ PROBLEM: {len(missing)} stuck posts NOT found by query!")
    print(f"   The fix is NOT working for these posts.")

print(f"\nSummary:")
print(f"  Processing posts: {len(all_processing)}")
print(f"  Stuck posts: {len(stuck_posts)}")
print(f"  Should be found: {len(should_be_found)}")
print(f"  Actually found: {len(found_by_query)}")
print(f"  Missing: {len(missing)}")

client.close()

