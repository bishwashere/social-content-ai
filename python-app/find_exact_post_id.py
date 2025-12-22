#!/usr/bin/env python3
"""Find the exact post ID for Dec 21, 11:00 AM and check its status"""
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
print("FINDING EXACT POST ID FOR DEC 21, 11:00 AM")
print("=" * 70)

# Find the post scheduled for Dec 21, 11:00 AM EST (16:00 UTC)
post = scheduled_posts.find_one({
    "platform": "webhook",
    "meta.type": "blog-news",
    "status": "processing",
    "date": datetime(2025, 12, 21, 16, 0, 0)
})

if not post:
    print("\n❌ Post not found with exact date/time")
    print("\nSearching for all processing posts on Dec 21...")
    
    # Find all posts on Dec 21
    all_posts = list(scheduled_posts.find({
        "platform": "webhook",
        "meta.type": "blog-news",
        "status": "processing",
        "date": {
            "$gte": datetime(2025, 12, 21, 0, 0, 0),
            "$lt": datetime(2025, 12, 22, 0, 0, 0)
        }
    }))
    
    print(f"\nFound {len(all_posts)} processing posts on Dec 21:")
    for p in all_posts:
        meta = p.get("meta", {})
        print(f"\n  Post ID: {str(p['_id'])}")
        print(f"  Date: {p.get('date')}")
        print(f"  Step 1: {meta.get('step1Completed')}")
        print(f"  Step 2: {meta.get('step2Completed')}")
        print(f"  Step 3: {meta.get('step3Completed')}")
        print(f"  Step 4: {meta.get('step4Completed')}")
    
    if len(all_posts) > 0:
        post = all_posts[0]  # Use first one
        print(f"\n⚠️  Using first post found: {str(post['_id'])}")
    else:
        print("\n❌ No processing posts found on Dec 21")
        client.close()
        sys.exit(1)

if post:
    post_id = str(post['_id'])
    meta = post.get("meta", {})
    
    print(f"\n✅ POST FOUND!")
    print(f"=" * 70)
    print(f"EXACT POST ID: {post_id}")
    print(f"Date: {post.get('date')}")
    print(f"Status: {post.get('status')}")
    print(f"UpdatedAt: {post.get('updatedAt')}")
    
    print(f"\nStep Status:")
    print(f"  Step 1 completed: {meta.get('step1Completed')}")
    print(f"  Step 2 completed: {meta.get('step2Completed')}")
    print(f"  Step 3 completed: {meta.get('step3Completed')}")
    print(f"  Step 4 completed: {meta.get('step4Completed')}")
    
    print(f"\nStep 3 Details:")
    print(f"  step3InProgress: {meta.get('step3InProgress')}")
    print(f"  step3StartedAt: {meta.get('step3StartedAt')}")
    print(f"  step3CompletedAt: {meta.get('step3CompletedAt')}")
    print(f"  step3Error: {meta.get('step3Error')}")
    print(f"  webhookSent: {meta.get('webhookSent')}")
    
    print(f"\n" + "=" * 70)
    print("COMMANDS TO CHECK LOGS")
    print("=" * 70)
    print(f"\n1. Check for this exact post ID in logs:")
    print(f"   grep -ai '{post_id}' /root/crontab/logs/nextpostai_api.log")
    
    print(f"\n2. Check for partial ID (first 12 chars):")
    print(f"   grep -ai '{post_id[:12]}' /root/crontab/logs/nextpostai_api.log")
    
    print(f"\n3. Check logs around Step 2 completion time:")
    if meta.get('step2CompletedAt'):
        step2_time = meta.get('step2CompletedAt')
        print(f"   Step 2 completed at: {step2_time}")
        print(f"   Check logs around that time (convert to EST)")
    
    print(f"\n4. Check for Step 3 trigger messages:")
    print(f"   grep -ai 'Triggering Step 3' /root/crontab/logs/nextpostai_api.log | grep -i '{post_id[:12]}'")
    
    print(f"\n5. Check for any errors:")
    print(f"   grep -ai '{post_id[:12]}' /root/crontab/logs/nextpostai_api.log | grep -i 'error\\|fail'")

client.close()
