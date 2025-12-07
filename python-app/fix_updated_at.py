#!/usr/bin/env python3
"""
Fix updatedAt field in scheduled-posts collection.
Sets updatedAt to current time for records where updatedAt is null.
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
import pathlib
import pymongo
from pymongo import MongoClient

# Load environment variables from root .env
root_dir = pathlib.Path(__file__).parent.parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def fix_updated_at():
    """Fix null updatedAt fields in scheduled-posts"""
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
    scheduled_posts = db["scheduled-posts"]
    
    print(f"📊 Connected to database: {db_name}\n")
    
    # Find posts with null updatedAt
    query = {
        "$or": [
            {"updatedAt": None},
            {"updatedAt": {"$exists": False}}
        ]
    }
    
    count = scheduled_posts.count_documents(query)
    print(f"🔍 Found {count} posts with null or missing updatedAt\n")
    
    if count == 0:
        print("✅ No posts need fixing!")
        return
    
    # Update all posts with null updatedAt
    now = datetime.utcnow()
    result = scheduled_posts.update_many(
        query,
        {
            "$set": {
                "updatedAt": now
            }
        }
    )
    
    print(f"✅ Fixed {result.modified_count} posts")
    print(f"   Set updatedAt to: {now.isoformat()}\n")
    
    # Verify
    remaining = scheduled_posts.count_documents(query)
    if remaining == 0:
        print("✅ All posts fixed!")
    else:
        print(f"⚠️  {remaining} posts still have null updatedAt")

if __name__ == "__main__":
    fix_updated_at()
