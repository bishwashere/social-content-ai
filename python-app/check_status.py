#!/usr/bin/env python3
"""
Quick Status Check Script
Shows the status of Blog News posts in the database.
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
import pymongo
from pymongo import MongoClient

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def check_status():
    """Check status of Blog News posts"""
    if not DATABASE_URL:
        print("❌ DATABASE_URL not configured")
        sys.exit(1)
    
    # Connect to database
    client = MongoClient(DATABASE_URL)
    if "/" in DATABASE_URL:
        parts = DATABASE_URL.split("/")
        if len(parts) > 3:
            db_name = parts[-1].split("?")[0]
        else:
            db_name = "social-content-ai"
    else:
        db_name = "social-content-ai"
    
    db = client[db_name]
    scheduled_posts = db["scheduled-posts"]  # From Prisma @@map
    
    # Find all Blog News posts
    posts = list(scheduled_posts.find({
        "platform": "webhook",
        "meta.type": "blog-news"
    }).sort("date", 1))
    
    if not posts:
        print("📭 No Blog News posts found")
        return
    
    print(f"📊 Found {len(posts)} Blog News posts\n")
    print("=" * 80)
    
    for i, post in enumerate(posts, 1):
        meta = post.get("meta", {})
        post_date = post.get("date")
        if isinstance(post_date, datetime):
            date_str = post_date.strftime("%Y-%m-%d %H:%M:%S")
        else:
            date_str = str(post_date)
        
        print(f"\n📝 Post {i}: {post['_id']}")
        print(f"   Date: {date_str}")
        print(f"   Status: {post.get('status', 'unknown')}")
        print(f"   Campaign: {meta.get('campaignId', 'N/A')}")
        print(f"   Day: {meta.get('day', 'N/A')}")
        
        # Step statuses
        print(f"\n   Steps:")
        print(f"   ├─ Step 1 (Fetch Article): {'✅' if meta.get('step1Completed') else '⏳'} {meta.get('step1InProgress', False) and '🔄' or ''}")
        if meta.get('step1Completed'):
            article = meta.get('article', {})
            print(f"   │  └─ Article: {article.get('title', 'N/A')[:50]}...")
        
        print(f"   ├─ Step 2 (Generate Blog): {'✅' if meta.get('step2Completed') else '⏳'} {meta.get('step2InProgress', False) and '🔄' or ''}")
        if meta.get('step2Completed'):
            blog = meta.get('blog', {})
            print(f"   │  └─ Blog: {blog.get('title', 'N/A')[:50]}...")
        
        print(f"   ├─ Step 3 (Send Webhook): {'✅' if meta.get('step3Completed') else '⏳'} {meta.get('step3InProgress', False) and '🔄' or ''}")
        if meta.get('step3Completed'):
            print(f"   │  └─ Article URL: {meta.get('articleUrl', 'N/A')[:50]}...")
        
        print(f"   └─ Step 4 (Finalize): {'✅' if meta.get('step4Completed') else '⏳'} {meta.get('step4InProgress', False) and '🔄' or ''}")
        
        # Errors
        if meta.get('step1Error'):
            print(f"   ⚠️  Step 1 Error: {meta.get('step1Error')[:50]}...")
        if meta.get('step2Error'):
            print(f"   ⚠️  Step 2 Error: {meta.get('step2Error')[:50]}...")
        if meta.get('step3Error'):
            print(f"   ⚠️  Step 3 Error: {meta.get('step3Error')[:50]}...")
        if meta.get('step4Error'):
            print(f"   ⚠️  Step 4 Error: {meta.get('step4Error')[:50]}...")
        
        print("-" * 80)
    
    print("\n✅ Status check complete")

if __name__ == "__main__":
    check_status()
