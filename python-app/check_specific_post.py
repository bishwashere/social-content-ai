#!/usr/bin/env python3
"""Check the specific post scheduled for Dec 21, 11:00 AM"""
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
print("CHECKING POST SCHEDULED FOR DEC 21, 11:00 AM")
print("=" * 70)

# Find posts scheduled for Dec 21, 11:00 AM (in different timezones)
# Dec 21, 11:00 AM could be in different timezones
# Let's check all posts on Dec 21

dec_21_start = datetime(2025, 12, 21, 0, 0, 0)
dec_21_end = datetime(2025, 12, 21, 23, 59, 59)

print(f"\n📊 Finding posts on Dec 21, 2025...")
posts_dec_21 = list(scheduled_posts.find({
    "platform": "webhook",
    "meta.type": "blog-news",
    "date": {
        "$gte": dec_21_start,
        "$lte": dec_21_end
    }
}))

print(f"Found {len(posts_dec_21)} posts on Dec 21\n")

if len(posts_dec_21) == 0:
    print("⚠️  No posts found for Dec 21. Checking all processing posts...")
    all_processing = list(scheduled_posts.find({
        "platform": "webhook",
        "meta.type": "blog-news",
        "status": "processing"
    }))
    print(f"Found {len(all_processing)} processing posts:")
    for post in all_processing:
        post_date = post.get("date")
        meta = post.get("meta", {})
        print(f"  - Date: {post_date} | Step1: {meta.get('step1Completed')} | Step2: {meta.get('step2Completed')}")
    sys.exit(0)

# Check each post
for i, post in enumerate(posts_dec_21, 1):
    meta = post.get("meta", {})
    post_id = str(post['_id'])
    post_date = post.get("date")
    
    # Check if it's around 11:00 AM (could be 11:00 in different timezones)
    hour = post_date.hour if post_date else None
    
    print(f"Post {i}: {post_id[:20]}...")
    print(f"  Date: {post_date}")
    print(f"  Hour: {hour}:{post_date.minute:02d}" if post_date else "N/A")
    print(f"  Status: {post.get('status')}")
    print(f"  Step 1 completed: {meta.get('step1Completed', False)}")
    print(f"  Step 2 completed: {meta.get('step2Completed', False)}")
    print(f"  Step 3 completed: {meta.get('step3Completed', False)}")
    print(f"  Step 4 completed: {meta.get('step4Completed', False)}")
    print(f"  Step 1 in progress: {meta.get('step1InProgress', False)}")
    print(f"  Step 2 in progress: {meta.get('step2InProgress', False)}")
    print(f"  Has article: {bool(meta.get('article'))}")
    print(f"  Has blog: {bool(meta.get('blog'))}")
    
    # Show exact values and types
    print(f"\n  Exact meta values:")
    print(f"    step1Completed: {repr(meta.get('step1Completed'))} (type: {type(meta.get('step1Completed'))})")
    print(f"    step2Completed: {repr(meta.get('step2Completed'))} (type: {type(meta.get('step2Completed'))})")
    print(f"    step1CompletedAt: {meta.get('step1CompletedAt')}")
    print(f"    step2CompletedAt: {meta.get('step2CompletedAt')}")
    
    # Check if it matches the description
    is_11am = hour == 11 or (hour == 16 and post_date.minute == 0)  # Could be UTC
    is_processing = post.get('status') == 'processing'
    step1_done = meta.get('step1Completed', False)
    step2_not_done = not meta.get('step2Completed', False)
    
    if is_processing and step1_done and step2_not_done:
        print(f"\n  ⚠️  THIS IS THE STUCK POST!")
        print(f"  Matches description: processing, step1 done, step2 not done")
        
        # Test if query finds it
        print(f"\n  Testing if query finds this post...")
        now = datetime.utcnow()
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
        
        # Test with this specific post ID
        test_query = {**query, "_id": post['_id']}
        found = scheduled_posts.find_one(test_query)
        
        if found:
            print(f"  ✅ Query WOULD find this post!")
        else:
            print(f"  ❌ Query would NOT find this post!")
            print(f"  Checking why...")
            
            # Check each condition
            if post.get('status') not in ['pending', 'processing']:
                print(f"    - Status '{post.get('status')}' not in ['pending', 'processing']")
            if post_date and post_date > now:
                print(f"    - Date {post_date} is in future (now: {now})")
            if meta.get('step2InProgress'):
                print(f"    - step2InProgress = True (excluded)")
            if not meta.get('step1Completed'):
                print(f"    - step1Completed != True")
            if meta.get('step2Completed'):
                print(f"    - step2Completed = True (shouldn't match)")
    
    print()

client.close()

