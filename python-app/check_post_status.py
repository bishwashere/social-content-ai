#!/usr/bin/env python3
"""Check the actual status of the post"""
import os
from dotenv import load_dotenv
from datetime import datetime
from pymongo import MongoClient
from urllib.parse import urlparse
from bson import ObjectId

load_dotenv()

database_url = os.getenv('DATABASE_URL')
parsed = urlparse(database_url)
db_name = parsed.path[1:] if parsed.path else 'social-content-ai'

client = MongoClient(database_url)
db = client[db_name]
scheduled_posts = db["scheduled-posts"]

post_id = ObjectId("6935eb293226eb6d2780665a")
post = scheduled_posts.find_one({"_id": post_id})

if post:
    print("=" * 70)
    print("POST STATUS CHECK")
    print("=" * 70)
    print(f"\nPost ID: {str(post['_id'])}")
    print(f"Status: {post.get('status')}")
    print(f"Error: {post.get('error')}")
    print(f"UpdatedAt: {post.get('updatedAt')}")
    
    now = datetime.utcnow()
    updated_at = post.get('updatedAt')
    if updated_at:
        stuck_duration = (now - updated_at).total_seconds() / 60
        print(f"Minutes stuck: {stuck_duration:.2f}")
        
        if stuck_duration > 30:
            print(f"\n⚠️  Post has been stuck for {stuck_duration:.2f} minutes (>30 minutes)")
            print(f"   According to Next.js code, it should be marked as 'failed'")
            if post.get('status') != 'failed':
                print(f"   ❌ But status is still '{post.get('status')}' - updatePostStatus may have failed!")
            else:
                print(f"   ✅ Status is 'failed' as expected")
    
    meta = post.get("meta", {})
    print(f"\nStep Status:")
    print(f"  Step 1: {meta.get('step1Completed')}")
    print(f"  Step 2: {meta.get('step2Completed')}")
    print(f"  Step 3: {meta.get('step3Completed')}")
    
    # Check what lastStepCompleted would be
    last_step = "none"
    if meta.get('step4CompletedAt'):
        last_step = "step4"
    elif meta.get('step3CompletedAt'):
        last_step = "step3"
    elif meta.get('step2CompletedAt'):
        last_step = "step2"
    elif meta.get('step1CompletedAt'):
        last_step = "step1"
    
    print(f"\nLast completed step: {last_step}")
    
    if last_step == "step2" and not meta.get('step3Completed'):
        print(f"\n✅ Should retry Step 3")
        print(f"   But stuck recovery marks it as failed if stuck >30 min")
        print(f"   This is the bug - it should retry, not mark as failed!")

client.close()
