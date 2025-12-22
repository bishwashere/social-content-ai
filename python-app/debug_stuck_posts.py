#!/usr/bin/env python3
"""Debug script to check why stuck posts aren't being found"""
from main import Database
import os
from dotenv import load_dotenv
from datetime import datetime
import json

load_dotenv()
db = Database(os.getenv('DATABASE_URL'))
now = datetime.utcnow()

print("=" * 60)
print("DEBUGGING STUCK POSTS")
print("=" * 60)

# First, find ALL blog-news posts
all_blog_news = list(db.scheduled_posts.find({
    "platform": "webhook",
    "meta.type": "blog-news"
}))

print(f"\n📊 Total Blog News posts: {len(all_blog_news)}")

# Check status distribution
statuses = {}
for post in all_blog_news:
    status = post.get("status", "unknown")
    statuses[status] = statuses.get(status, 0) + 1
print(f"\n📈 Status distribution: {statuses}")

# Find stuck posts (step1 done, step2 not done)
stuck_posts = []
for post in all_blog_news:
    meta = post.get("meta", {})
    step1_done = meta.get("step1Completed", False)
    step2_done = meta.get("step2Completed", False)
    status = post.get("status")
    post_date = post.get("date")
    
    if step1_done and not step2_done and status in ["pending", "processing"]:
        stuck_posts.append({
            "id": post["_id"],
            "status": status,
            "date": post_date.isoformat() if post_date else None,
            "step1Completed": step1_done,
            "step2Completed": step2_done,
            "step1InProgress": meta.get("step1InProgress", False),
            "step2InProgress": meta.get("step2InProgress", False),
            "has_article": bool(meta.get("article")),
            "date_passed": post_date <= now if post_date else False
        })

print(f"\n🔍 Found {len(stuck_posts)} stuck posts (step1 done, step2 not done):")
for i, post in enumerate(stuck_posts, 1):
    print(f"\n  {i}. Post ID: {post['id'][:20]}...")
    print(f"     Status: {post['status']}")
    print(f"     Date: {post['date']} (passed: {post['date_passed']})")
    print(f"     Step 1 done: {post['step1Completed']}")
    print(f"     Step 2 done: {post['step2Completed']}")
    print(f"     Step 1 in progress: {post['step1InProgress']}")
    print(f"     Step 2 in progress: {post['step2InProgress']}")
    print(f"     Has article: {post['has_article']}")

# Now test the actual query
print("\n" + "=" * 60)
print("TESTING ACTUAL QUERY")
print("=" * 60)

query = {
    "platform": "webhook",
    "meta.type": "blog-news",
    "$or": [
        {"status": "pending"},
        {"status": "processing"}
    ],
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
    "status": {"$ne": "error"},
    "date": {"$lte": now},
}

found = list(db.scheduled_posts.find(query))
print(f"\n✅ Query found {len(found)} posts")

if len(found) != len(stuck_posts):
    print(f"\n⚠️  MISMATCH: Query found {len(found)} but manual check found {len(stuck_posts)}")
    print("\nChecking why...")
    
    # Check each stuck post against query
    for stuck in stuck_posts:
        test_query = {
            "_id": stuck["id"],
            **query
        }
        matches = db.scheduled_posts.find_one(test_query)
        if not matches:
            print(f"\n❌ Post {stuck['id'][:20]}... doesn't match query!")
            print(f"   Reasons it might not match:")
            if stuck["status"] not in ["pending", "processing"]:
                print(f"   - Status is '{stuck['status']}' (not pending/processing)")
            if not stuck["date_passed"]:
                print(f"   - Date hasn't passed yet")
            if stuck["step2InProgress"]:
                print(f"   - Step 2 is in progress")
else:
    print("\n✅ Query matches manual check!")

