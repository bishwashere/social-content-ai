#!/usr/bin/env python3
"""
Actually query the database and verify the fix works with REAL data.
This shows the actual state of posts and whether the query finds them.
"""
from main import Database
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
db = Database(os.getenv('DATABASE_URL'))
now = datetime.utcnow()

print("=" * 70)
print("VERIFYING FIX WITH REAL DATABASE DATA")
print("=" * 70)

# Step 1: Find ALL processing webhook blog-news posts
print("\n📊 Step 1: Finding ALL processing webhook blog-news posts in database...")
all_processing = list(db.scheduled_posts.find({
    "platform": "webhook",
    "meta.type": "blog-news",
    "status": "processing"
}))

print(f"Found {len(all_processing)} processing posts")

if len(all_processing) == 0:
    print("\n⚠️  No processing posts found. Checking all statuses...")
    all_posts = list(db.scheduled_posts.find({
        "platform": "webhook",
        "meta.type": "blog-news"
    }))
    statuses = {}
    for post in all_posts:
        status = post.get("status", "unknown")
        statuses[status] = statuses.get(status, 0) + 1
    print(f"Total webhook blog-news posts: {len(all_posts)}")
    print(f"Status breakdown: {statuses}")
    exit(0)

# Step 2: Check each processing post's state
print("\n📋 Step 2: Checking state of each processing post...")
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
    print(f"    Date: {post_date} (passed: {post_date <= now if post_date else 'N/A'})")
    print(f"    Step 1 completed: {step1_done}")
    print(f"    Step 2 completed: {step2_done}")
    print(f"    Step 1 in progress: {step1_progress}")
    print(f"    Step 2 in progress: {step2_progress}")
    print(f"    Has article: {has_article}")
    
    # Determine if it's stuck
    is_stuck = step1_done and not step2_done
    if is_stuck:
        stuck_posts.append({
            "post": post,
            "post_id": post_id,
            "post_date": post_date,
            "step2_progress": step2_progress,
            "has_article": has_article
        })
        print(f"    ⚠️  STUCK: Step 1 done but Step 2 not done")
    else:
        if step1_done and step2_done:
            print(f"    ✅ Both steps completed")
        elif not step1_done:
            print(f"    ⏳ Needs Step 1")

print(f"\n📊 Found {len(stuck_posts)} stuck posts (step1 done, step2 not done)")

# Step 3: Test the ACTUAL query from main.py
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

found_by_query = list(db.scheduled_posts.find(query))
print(f"\n✅ Query found {len(found_by_query)} posts")

# Step 4: Compare - which stuck posts are found?
print("\n" + "=" * 70)
print("📋 Step 4: Comparing Results")
print("=" * 70)

found_ids = {str(p['_id']) for p in found_by_query}
stuck_ids = {s["post_id"] for s in stuck_posts}

# Filter stuck posts that should be found (exclude step2InProgress=True)
should_be_found = [s for s in stuck_posts if not s["step2_progress"] and (s["post_date"] and s["post_date"] <= now)]

print(f"\nStuck posts: {len(stuck_posts)}")
print(f"Stuck posts (excluding step2InProgress=True and future dates): {len(should_be_found)}")
print(f"Posts found by query: {len(found_by_query)}")

if len(should_be_found) > 0:
    print(f"\n📋 Stuck posts that SHOULD be found:")
    for stuck in should_be_found:
        print(f"  - {stuck['post_id'][:20]}...")
        print(f"    Date passed: {stuck['post_date'] <= now if stuck['post_date'] else 'N/A'}")
        print(f"    Step 2 in progress: {stuck['step2_progress']}")
        print(f"    Has article: {stuck['has_article']}")
        
        is_found = stuck['post_id'] in found_ids
        if is_found:
            print(f"    ✅ FOUND by query!")
        else:
            print(f"    ❌ NOT FOUND by query - BUG!")

# Check which found posts are stuck
found_stuck = [p for p in found_by_query if str(p['_id']) in stuck_ids]
print(f"\n📋 Posts found by query that are stuck: {len(found_stuck)}")

if len(found_by_query) > 0:
    print(f"\n📋 All posts found by query:")
    for post in found_by_query:
        meta = post.get("meta", {})
        post_id = str(post['_id'])
        step1 = meta.get("step1Completed", False)
        step2 = meta.get("step2Completed", False)
        
        is_stuck = step1 and not step2
        status_icon = "⚠️" if is_stuck else "✅"
        
        print(f"  {status_icon} {post_id[:20]}... | Step1: {step1} | Step2: {step2}")
        if is_stuck:
            print(f"     → This stuck post WILL BE PROCESSED by Python app!")

# Step 5: Final verification
print("\n" + "=" * 70)
print("📊 FINAL VERIFICATION")
print("=" * 70)

missing = [s for s in should_be_found if s['post_id'] not in found_ids]

if len(missing) == 0 and len(should_be_found) > 0:
    print(f"\n✅ SUCCESS! All {len(should_be_found)} stuck posts are found by the query!")
    print(f"   The fix is working correctly!")
    print(f"   These posts will be processed on the next Python app cron run.")
elif len(should_be_found) == 0:
    print(f"\n⚠️  No stuck posts found (or all are excluded by step2InProgress/date)")
    if len(stuck_posts) > 0:
        print(f"   Found {len(stuck_posts)} stuck posts but they're excluded because:")
        for stuck in stuck_posts:
            if stuck['step2_progress']:
                print(f"   - {stuck['post_id'][:20]}... has step2InProgress=True")
            if stuck['post_date'] and stuck['post_date'] > now:
                print(f"   - {stuck['post_id'][:20]}... has future date")
else:
    print(f"\n❌ PROBLEM: {len(missing)} stuck posts NOT found by query!")
    print(f"   The fix is NOT working correctly for these posts:")
    for stuck in missing:
        print(f"   - {stuck['post_id'][:20]}...")

print(f"\n📊 Summary:")
print(f"   Processing posts in DB: {len(all_processing)}")
print(f"   Stuck posts (step1 done, step2 not): {len(stuck_posts)}")
print(f"   Stuck posts that should be found: {len(should_be_found)}")
print(f"   Posts found by query: {len(found_by_query)}")
print(f"   Missing: {len(missing)}")

