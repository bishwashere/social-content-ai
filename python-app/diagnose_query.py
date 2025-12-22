#!/usr/bin/env python3
"""Simple diagnostic to see what's in the database and why query isn't matching"""
from main import Database
import os
import sys
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()
db = Database(os.getenv('DATABASE_URL'))
now = datetime.utcnow()

print("=" * 70)
print("DIAGNOSING QUERY ISSUE")
print("=" * 70)

# Step 1: Find ALL webhook blog-news posts
print("\n📊 Step 1: Finding ALL webhook blog-news posts...")
all_posts = list(db.scheduled_posts.find({
    "platform": "webhook",
    "meta.type": "blog-news"
}))

print(f"Found {len(all_posts)} total webhook blog-news posts")

if len(all_posts) == 0:
    print("\n❌ No webhook blog-news posts found in database!")
    print("   This might mean:")
    print("   - Posts haven't been created yet")
    print("   - Posts are stored with different platform/meta.type values")
    sys.exit(0)

# Step 2: Show status breakdown
print("\n📈 Step 2: Status breakdown:")
status_breakdown = {}
for post in all_posts:
    status = post.get("status", "unknown")
    status_breakdown[status] = status_breakdown.get(status, 0) + 1
for status, count in status_breakdown.items():
    print(f"   {status}: {count}")

# Step 3: Find processing posts
print("\n🔍 Step 3: Finding processing posts...")
processing_posts = [p for p in all_posts if p.get("status") == "processing"]
print(f"Found {len(processing_posts)} processing posts")

if len(processing_posts) == 0:
    print("\n⚠️  No processing posts found!")
    print("   Showing all posts with their status:")
    for post in all_posts[:5]:  # Show first 5
        meta = post.get("meta", {})
        post_id_str = str(post['_id'])
        print(f"   - ID: {post_id_str[:20]}... | Status: {post.get('status')} | Step1: {meta.get('step1Completed')} | Step2: {meta.get('step2Completed')}")

# Step 4: Check step completion for processing posts
print("\n🔍 Step 4: Checking step completion for processing posts...")
for i, post in enumerate(processing_posts, 1):
    meta = post.get("meta", {})
    post_date = post.get("date")
    step1 = meta.get("step1Completed", False)
    step2 = meta.get("step2Completed", False)
    step1_progress = meta.get("step1InProgress", False)
    step2_progress = meta.get("step2InProgress", False)
    
    post_id_str = str(post['_id'])
    print(f"\n  Post {i}: {post_id_str[:20]}...")
    print(f"    Status: {post.get('status')}")
    print(f"    Date: {post_date} (passed: {post_date <= now if post_date else 'N/A'})")
    print(f"    Step 1 completed: {step1}")
    print(f"    Step 2 completed: {step2}")
    print(f"    Step 1 in progress: {step1_progress}")
    print(f"    Step 2 in progress: {step2_progress}")
    print(f"    Has article: {bool(meta.get('article'))}")
    
    # Check if it should match the query
    should_match = False
    reasons = []
    
    if post_date and post_date > now:
        reasons.append("❌ Date is in the future")
    else:
        reasons.append("✅ Date has passed")
    
    # Check Step 2 condition
    if step1 and not step2 and not step2_progress:
        should_match = True
        reasons.append("✅ Matches Step 2 condition (step1 done, step2 not done, not in progress)")
    elif not step1 and not step1_progress:
        should_match = True
        reasons.append("✅ Matches Step 1 condition (step1 not done, not in progress)")
    else:
        if step1 and step2:
            reasons.append("❌ Both steps completed (shouldn't match)")
        if step2_progress:
            reasons.append("❌ Step 2 in progress (skipped by query)")
        if step1_progress:
            reasons.append("❌ Step 1 in progress (skipped by query)")
    
    print(f"    Should match query: {should_match}")
    for reason in reasons:
        print(f"      {reason}")

# Step 5: Test the actual query
print("\n" + "=" * 70)
print("🔍 Step 5: Testing actual query from find_pending_posts()")
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
    print("\nPosts found by query:")
    for i, post in enumerate(found, 1):
        meta = post.get("meta", {})
        post_id_str = str(post['_id'])
        print(f"  {i}. ID: {post_id_str[:20]}... | Step1: {meta.get('step1Completed')} | Step2: {meta.get('step2Completed')}")
else:
    print("\n❌ Query found 0 posts!")
    print("\nLet's test simpler queries to see where it breaks...")
    
    # Test 1: Just platform and type
    test1 = list(db.scheduled_posts.find({
        "platform": "webhook",
        "meta.type": "blog-news"
    }))
    print(f"\n  Test 1 (platform + type): {len(test1)} posts")
    
    # Test 2: Add status
    test2 = list(db.scheduled_posts.find({
        "platform": "webhook",
        "meta.type": "blog-news",
        "status": {"$in": ["pending", "processing"]}
    }))
    print(f"  Test 2 (+ status): {len(test2)} posts")
    
    # Test 3: Add date
    test3 = list(db.scheduled_posts.find({
        "platform": "webhook",
        "meta.type": "blog-news",
        "status": {"$in": ["pending", "processing"]},
        "date": {"$lte": now}
    }))
    print(f"  Test 3 (+ date): {len(test3)} posts")
    
    # Test 4: Just Step 2 condition
    test4 = list(db.scheduled_posts.find({
        "platform": "webhook",
        "meta.type": "blog-news",
        "status": {"$in": ["pending", "processing"]},
        "date": {"$lte": now},
        "meta.step1Completed": True,
        "$or": [
            {"meta.step2Completed": {"$ne": True}},
            {"meta.step2Completed": {"$exists": False}}
        ]
    }))
    print(f"  Test 4 (+ Step 2 condition): {len(test4)} posts")
    
    if len(test4) > 0:
        print("\n  ✅ Step 2 condition works! Issue might be with $and/$or structure")
        for post in test4:
            meta = post.get("meta", {})
            step2_progress = meta.get("step2InProgress", False)
            post_id_str = str(post['_id'])
            print(f"    - ID: {post_id_str[:20]}... | Step2 in progress: {step2_progress}")
            if step2_progress:
                print(f"      ⚠️  This post has step2InProgress=true, so it's excluded by query")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"Total webhook blog-news posts: {len(all_posts)}")
print(f"Processing posts: {len(processing_posts)}")
print(f"Query results: {len(found)}")
print(f"\nIf query found 0 but processing posts exist, check:")
print(f"  1. Are step1Completed/step2Completed values actually True/False (not strings)?")
print(f"  2. Is step2InProgress set to True (which would exclude them)?")
print(f"  3. Are dates in the future?")

