#!/usr/bin/env python3
"""Quick check for why query isn't finding processing posts"""
from main import Database
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
db = Database(os.getenv('DATABASE_URL'))
now = datetime.utcnow()

print("Quick Diagnostic")
print("=" * 50)

# Find the processing post
processing = list(db.scheduled_posts.find({
    "platform": "webhook",
    "meta.type": "blog-news",
    "status": "processing"
}))

print(f"\nFound {len(processing)} processing posts")

for post in processing:
    meta = post.get("meta", {})
    post_id = str(post['_id'])
    post_date = post.get("date")
    
    print(f"\nPost ID: {post_id}")
    print(f"Date: {post_date}")
    print(f"Date passed: {post_date <= now if post_date else 'N/A'}")
    print(f"Step 1 completed: {meta.get('step1Completed')}")
    print(f"Step 2 completed: {meta.get('step2Completed')}")
    print(f"Step 1 in progress: {meta.get('step1InProgress')}")
    print(f"Step 2 in progress: {meta.get('step2InProgress')}")
    print(f"Has article: {bool(meta.get('article'))}")
    
    # Test if it matches Step 2 condition
    step1_done = meta.get("step1Completed") == True
    step2_done = meta.get("step2Completed") == True
    step2_progress = meta.get("step2InProgress") == True
    
    print(f"\nStep 2 condition check:")
    print(f"  step1Completed == True: {step1_done}")
    print(f"  step2Completed != True: {not step2_done}")
    print(f"  step2InProgress != True: {not step2_progress}")
    
    matches_step2 = step1_done and not step2_done and not step2_progress
    print(f"  Matches Step 2 condition: {matches_step2}")
    
    # Test date
    date_ok = post_date and post_date <= now
    print(f"\nDate condition: {date_ok}")
    
    # Overall match
    overall_match = matches_step2 and date_ok
    print(f"\nShould be found by query: {overall_match}")
    
    if not overall_match:
        print("\nReasons it's not matching:")
        if not date_ok:
            print("  ❌ Date hasn't passed")
        if not step1_done:
            print("  ❌ Step 1 not completed")
        if step2_done:
            print("  ❌ Step 2 already completed")
        if step2_progress:
            print("  ❌ Step 2 in progress")

# Now test the actual query
print("\n" + "=" * 50)
print("Testing actual query...")

query = {
    "platform": "webhook",
    "meta.type": "blog-news",
    "status": {"$in": ["pending", "processing"]},
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
                        }
                    ]
                }
            ]
        }
    ],
    "date": {"$lte": now},
}

found = list(db.scheduled_posts.find(query))
print(f"Query found: {len(found)} posts")

if len(found) > 0:
    for post in found:
        meta = post.get("meta", {})
        print(f"  - {str(post['_id'])[:20]}... | Step1: {meta.get('step1Completed')} | Step2: {meta.get('step2Completed')}")

