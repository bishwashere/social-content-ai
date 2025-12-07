#!/usr/bin/env python3
"""
Check the status of a specific post to debug why Next.js isn't processing it.
"""

import os
import sys
from dotenv import load_dotenv
import pathlib
from pymongo import MongoClient
from bson import ObjectId

# Load environment variables from root .env
root_dir = pathlib.Path(__file__).parent.parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def check_post(post_id: str = None):
    """Check post status"""
    if not DATABASE_URL:
        print("❌ DATABASE_URL not configured")
        sys.exit(1)
    
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
    scheduled_posts = db["scheduled-posts"]
    
    if post_id:
        try:
            post = scheduled_posts.find_one({"_id": ObjectId(post_id)})
        except:
            post = scheduled_posts.find_one({"_id": post_id})
    else:
        # Find the most recent blog-news post
        post = scheduled_posts.find_one(
            {"meta.type": "blog-news", "platform": "webhook"},
            sort=[("date", -1)]
        )
    
    if not post:
        print("❌ Post not found")
        sys.exit(1)
    
    print(f"📊 Post ID: {post['_id']}\n")
    print(f"Status: {post.get('status', 'N/A')}")
    print(f"Platform: {post.get('platform', 'N/A')}")
    print(f"Date: {post.get('date', 'N/A')}")
    print(f"UpdatedAt: {post.get('updatedAt', 'N/A')}")
    print(f"CreatedAt: {post.get('createdAt', 'N/A')}\n")
    
    meta = post.get('meta', {})
    print("Meta:")
    print(f"  type: {meta.get('type', 'N/A')}")
    print(f"  step1Completed: {meta.get('step1Completed', False)}")
    print(f"  step2Completed: {meta.get('step2Completed', False)}")
    print(f"  step3Completed: {meta.get('step3Completed', False)}")
    print(f"  step4Completed: {meta.get('step4Completed', False)}")
    print(f"  step1InProgress: {meta.get('step1InProgress', False)}")
    print(f"  step2InProgress: {meta.get('step2InProgress', False)}")
    print(f"  step3InProgress: {meta.get('step3InProgress', False)}")
    print(f"  step4InProgress: {meta.get('step4InProgress', False)}")
    print(f"  has blog: {bool(meta.get('blog'))}")
    print(f"  has article: {bool(meta.get('article'))}")
    
    # Check if it matches Next.js query criteria
    from datetime import datetime
    now = datetime.utcnow()
    post_date = post.get('date')
    
    print("\n🔍 Next.js Query Check:")
    print(f"  platform == 'webhook': {post.get('platform') == 'webhook'}")
    print(f"  status == 'processing': {post.get('status') == 'processing'}")
    print(f"  meta.type == 'blog-news': {meta.get('type') == 'blog-news'}")
    if post_date:
        print(f"  date <= now: {post_date <= now} (post_date: {post_date}, now: {now})")
    print(f"  step2Completed == True: {meta.get('step2Completed') == True}")
    print(f"  has blog: {bool(meta.get('blog'))}")
    
    matches = (
        post.get('platform') == 'webhook' and
        post.get('status') == 'processing' and
        meta.get('type') == 'blog-news' and
        (post_date is None or post_date <= now) and
        meta.get('step2Completed') == True and
        bool(meta.get('blog'))
    )
    
    print(f"\n✅ Matches Next.js query: {matches}")

if __name__ == "__main__":
    post_id = sys.argv[1] if len(sys.argv) > 1 else None
    check_post(post_id)
