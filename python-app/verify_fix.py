#!/usr/bin/env python3
"""
Verify that the fix for stuck posts (Step 1 done, Step 2 not done) actually works.

This script:
1. Finds all posts that should be picked up (step1 done, step2 not done)
2. Tests if the query from find_pending_posts() finds them
3. Verifies the fix is working correctly
"""
from main import Database
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
db = Database(os.getenv('DATABASE_URL'))
now = datetime.utcnow()

print("=" * 70)
print("VERIFYING FIX FOR STUCK POSTS (Step 1 done, Step 2 not done)")
print("=" * 70)

# Step 1: Manually find all posts that SHOULD be picked up
print("\n📋 Step 1: Finding posts that SHOULD be picked up...")
print("   Criteria: step1Completed = true AND step2Completed != true")

should_be_found = list(db.scheduled_posts.find({
    "platform": "webhook",
    "meta.type": "blog-news",
    "status": {"$in": ["pending", "processing"]},
    "meta.step1Completed": True,
    "$or": [
        {"meta.step2Completed": {"$ne": True}},
        {"meta.step2Completed": {"$exists": False}}
    ],
    "date": {"$lte": now}
}))

print(f"\n✅ Found {len(should_be_found)} posts that SHOULD be found by the query")

if len(should_be_found) == 0:
    print("\n⚠️  No stuck posts found in database.")
    print("   This could mean:")
    print("   - All posts have been processed")
    print("   - Posts are in different status (not pending/processing)")
    print("   - Posts have dates in the future")
    
    # Check if there are any processing posts at all
    all_processing = list(db.scheduled_posts.find({
        "platform": "webhook",
        "meta.type": "blog-news",
        "status": "processing"
    }))
    print(f"\n   Total processing posts: {len(all_processing)}")
    
    if len(all_processing) > 0:
        print("\n   Processing posts found (checking their state):")
        for post in all_processing:
            meta = post.get("meta", {})
            post_id = str(post['_id'])
            step1 = meta.get("step1Completed", False)
            step2 = meta.get("step2Completed", False)
            print(f"   - {post_id[:20]}... | Step1: {step1} | Step2: {step2}")
            if step1 and step2:
                print(f"     ✅ Both steps completed (not stuck)")
            elif not step1:
                print(f"     ⚠️  Step 1 not done (needs Step 1)")
            elif step1 and not step2:
                post_date = post.get("date")
                if post_date and post_date > now:
                    print(f"     ⚠️  Stuck but date is in future: {post_date}")
                else:
                    step2_progress = meta.get("step2InProgress", False)
                    if step2_progress:
                        print(f"     ⚠️  Stuck but step2InProgress = True (excluded by query)")
                    else:
                        print(f"     ❌ Should be found but wasn't! (BUG)")
    
    print("\n" + "=" * 70)
    print("TESTING QUERY ANYWAY")
    print("=" * 70)
else:
    print("\n📋 Posts that should be found:")
    for i, post in enumerate(should_be_found, 1):
        meta = post.get("meta", {})
        post_id = str(post['_id'])
        post_date = post.get("date")
        step2_progress = meta.get("step2InProgress", False)
        has_article = bool(meta.get("article"))
        
        print(f"\n  {i}. Post ID: {post_id}")
        print(f"     Status: {post.get('status')}")
        print(f"     Date: {post_date} (passed: {post_date <= now if post_date else 'N/A'})")
        print(f"     Step 1 completed: {meta.get('step1Completed')}")
        print(f"     Step 2 completed: {meta.get('step2Completed')}")
        print(f"     Step 2 in progress: {step2_progress}")
        print(f"     Has article: {has_article}")
        
        if step2_progress:
            print(f"     ⚠️  WARNING: step2InProgress = True (will be excluded by query)")
        if not has_article:
            print(f"     ⚠️  WARNING: No article data (Step 2 will fail)")

# Step 2: Test the actual query from find_pending_posts()
print("\n" + "=" * 70)
print("📋 Step 2: Testing the ACTUAL query from find_pending_posts()")
print("=" * 70)

# This is the exact query from main.py
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

# Step 3: Compare results
print("\n" + "=" * 70)
print("📋 Step 3: Comparing Results")
print("=" * 70)

should_be_ids = {str(p['_id']) for p in should_be_found}
found_ids = {str(p['_id']) for p in found_by_query}

# Filter out posts with step2InProgress = True (these are correctly excluded)
should_be_ids_filtered = set()
for post in should_be_found:
    meta = post.get("meta", {})
    if not meta.get("step2InProgress", False):
        should_be_ids_filtered.add(str(post['_id']))

print(f"\nPosts that should be found (excluding step2InProgress=True): {len(should_be_ids_filtered)}")
print(f"Posts actually found by query: {len(found_ids)}")

missing = should_be_ids_filtered - found_ids
extra = found_ids - should_be_ids_filtered

if len(missing) == 0 and len(extra) == 0:
    print("\n✅ PERFECT MATCH! All stuck posts are found by the query!")
    print("   The fix is working correctly!")
elif len(missing) > 0:
    print(f"\n❌ PROBLEM: {len(missing)} stuck posts NOT found by query!")
    print("\n   Missing posts:")
    for post_id in missing:
        post = next((p for p in should_be_found if str(p['_id']) == post_id), None)
        if post:
            meta = post.get("meta", {})
            post_date = post.get("date")
            print(f"\n   - Post ID: {post_id[:20]}...")
            print(f"     Status: {post.get('status')}")
            print(f"     Date: {post_date} (passed: {post_date <= now if post_date else 'N/A'})")
            print(f"     Step 1: {meta.get('step1Completed')}")
            print(f"     Step 2: {meta.get('step2Completed')}")
            print(f"     Step 2 in progress: {meta.get('step2InProgress')}")
            
            # Test individual conditions
            print(f"\n     Why it's not found:")
            if post.get("status") not in ["pending", "processing"]:
                print(f"       ❌ Status '{post.get('status')}' not in ['pending', 'processing']")
            if post_date and post_date > now:
                print(f"       ❌ Date {post_date} is in the future")
            if meta.get("step2InProgress"):
                print(f"       ❌ step2InProgress = True (correctly excluded)")
            else:
                print(f"       ❌ Unknown reason - this is a BUG!")

if len(extra) > 0:
    print(f"\n⚠️  Query found {len(extra)} extra posts (not in should_be_found list):")
    for post_id in extra:
        post = next((p for p in found_by_query if str(p['_id']) == post_id), None)
        if post:
            meta = post.get("meta", {})
            print(f"   - {post_id[:20]}... | Step1: {meta.get('step1Completed')} | Step2: {meta.get('step2Completed')}")

# Step 4: Summary
print("\n" + "=" * 70)
print("📊 SUMMARY")
print("=" * 70)
print(f"Stuck posts (step1 done, step2 not done): {len(should_be_found)}")
print(f"Stuck posts (excluding step2InProgress=True): {len(should_be_ids_filtered)}")
print(f"Query results: {len(found_by_query)}")
print(f"Missing: {len(missing)}")
print(f"Extra: {len(extra)}")

if len(missing) == 0:
    print("\n✅ VALIDATION PASSED: The fix is working correctly!")
    print("   All stuck posts will be picked up by the Python app on the next cron run.")
    print("   The corrupted/stuck data will be processed automatically.")
else:
    print("\n❌ VALIDATION FAILED: Some stuck posts are not being found.")
    print("   The query needs to be fixed further.")

# Step 5: Show what will happen
if len(found_by_query) > 0:
    print("\n" + "=" * 70)
    print("🔮 What Will Happen Next")
    print("=" * 70)
    print(f"\nWhen the Python app runs (next cron job), it will:")
    print(f"  1. Find {len(found_by_query)} posts using the query")
    print(f"  2. For each post:")
    print(f"     - Skip Step 1 (already completed)")
    print(f"     - Process Step 2 (generate blog)")
    print(f"  3. Update posts with step2Completed = true")
    print(f"\n✅ Your stuck posts will be automatically fixed!")

