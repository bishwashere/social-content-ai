#!/usr/bin/env python3
"""Validate that the query can find posts stuck at Step 2"""
from main import Database
import os
from dotenv import load_dotenv
from datetime import datetime
import sys

load_dotenv()
db = Database(os.getenv('DATABASE_URL'))
now = datetime.utcnow()

print("=" * 70)
print("VALIDATING QUERY FOR STUCK POSTS (Step 1 done, Step 2 not done)")
print("=" * 70)

# First, find the specific post the user mentioned
print("\n🔍 Step 1: Finding posts matching your description...")
print("   - platform: webhook")
print("   - status: processing")
print("   - Scheduled for Dec 21, 11:00 AM")
print("   - step1Completed: true")
print("   - step2Completed: false")

# Find posts matching the exact criteria
target_date = datetime(2025, 12, 21, 11, 0, 0)  # Dec 21, 11:00 AM

exact_matches = list(db.scheduled_posts.find({
    "platform": "webhook",
    "status": "processing",
    "meta.type": "blog-news",
    "meta.step1Completed": True,
    "$or": [
        {"meta.step2Completed": {"$ne": True}},
        {"meta.step2Completed": {"$exists": False}}
    ]
}))

print(f"\n✅ Found {len(exact_matches)} posts matching exact criteria:")
for i, post in enumerate(exact_matches, 1):
    meta = post.get("meta", {})
    post_date = post.get("date")
    print(f"\n  {i}. Post ID: {post['_id']}")
    print(f"     Status: {post.get('status')}")
    print(f"     Date: {post_date}")
    print(f"     Step 1 completed: {meta.get('step1Completed', False)}")
    print(f"     Step 2 completed: {meta.get('step2Completed', False)}")
    print(f"     Step 2 in progress: {meta.get('step2InProgress', False)}")
    print(f"     Has article: {bool(meta.get('article'))}")
    print(f"     Campaign: {meta.get('campaignName', 'N/A')}")
    print(f"     Day: {meta.get('day', 'N/A')}")

if len(exact_matches) == 0:
    print("\n⚠️  No posts found matching exact criteria. Checking all processing posts...")
    all_processing = list(db.scheduled_posts.find({
        "platform": "webhook",
        "status": "processing",
        "meta.type": "blog-news"
    }))
    print(f"\n   Found {len(all_processing)} total processing blog-news posts:")
    for post in all_processing:
        meta = post.get("meta", {})
        print(f"   - ID: {post['_id'][:20]}... | Step1: {meta.get('step1Completed')} | Step2: {meta.get('step2Completed')} | Date: {post.get('date')}")

# Now test the actual query from main.py
print("\n" + "=" * 70)
print("🔍 Step 2: Testing the actual query from find_pending_posts()")
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

found = list(db.scheduled_posts.find(query))
print(f"\n✅ Query found {len(found)} posts")

if len(found) > 0:
    print("\n📋 Posts found by query:")
    for i, post in enumerate(found, 1):
        meta = post.get("meta", {})
        post_date = post.get("date")
        step1_done = meta.get("step1Completed", False)
        step2_done = meta.get("step2Completed", False)
        
        print(f"\n  {i}. Post ID: {post['_id']}")
        print(f"     Status: {post.get('status')}")
        print(f"     Date: {post_date}")
        print(f"     Step 1 completed: {step1_done}")
        print(f"     Step 2 completed: {step2_done}")
        print(f"     Step 2 in progress: {meta.get('step2InProgress', False)}")
        print(f"     Has article: {bool(meta.get('article'))}")
        
        # Determine which condition matched
        if step1_done and not step2_done:
            print(f"     ✅ Matches: Step 2 needed (Step 1 done, Step 2 not done)")
        elif not step1_done:
            print(f"     ✅ Matches: Step 1 needed")
        else:
            print(f"     ⚠️  Unexpected state")

# Check if exact matches are found by the query
print("\n" + "=" * 70)
print("🔍 Step 3: Verifying exact matches are found by query")
print("=" * 70)

if len(exact_matches) > 0:
    found_ids = {post["_id"] for post in found}
    exact_ids = {post["_id"] for post in exact_matches}
    
    missing = exact_ids - found_ids
    if missing:
        print(f"\n❌ PROBLEM: {len(missing)} exact matches NOT found by query!")
        for post_id in missing:
            post = next((p for p in exact_matches if p["_id"] == post_id), None)
            if post:
                meta = post.get("meta", {})
                post_date = post.get("date")
                print(f"\n   Missing Post ID: {post_id}")
                print(f"   Status: {post.get('status')}")
                print(f"   Date: {post_date} (passed: {post_date <= now if post_date else 'N/A'})")
                print(f"   Step 1: {meta.get('step1Completed')}")
                print(f"   Step 2: {meta.get('step2Completed')}")
                print(f"   Step 2 in progress: {meta.get('step2InProgress')}")
                
                # Test individual conditions
                print(f"\n   Testing why it's not found:")
                if post.get("status") not in ["pending", "processing"]:
                    print(f"   ❌ Status '{post.get('status')}' not in ['pending', 'processing']")
                if post_date and post_date > now:
                    print(f"   ❌ Date {post_date} is in the future (now: {now})")
                if meta.get("step2InProgress"):
                    print(f"   ❌ Step 2 is in progress")
    else:
        print(f"\n✅ SUCCESS: All {len(exact_matches)} exact matches found by query!")
else:
    print("\n⚠️  No exact matches to verify")

# Summary
print("\n" + "=" * 70)
print("📊 SUMMARY")
print("=" * 70)
print(f"Exact matches (step1 done, step2 not done): {len(exact_matches)}")
print(f"Query results: {len(found)}")
if len(exact_matches) > 0 and len(found) > 0:
    found_exact = len([p for p in found if p["_id"] in {e["_id"] for e in exact_matches}])
    print(f"Exact matches found by query: {found_exact}/{len(exact_matches)}")
    if found_exact == len(exact_matches):
        print("\n✅ VALIDATION PASSED: Query successfully finds all stuck posts!")
    else:
        print(f"\n❌ VALIDATION FAILED: Query missing {len(exact_matches) - found_exact} stuck posts")
elif len(exact_matches) == 0:
    print("\n⚠️  No stuck posts found in database to validate against")
else:
    print("\n❌ Query found no posts")

