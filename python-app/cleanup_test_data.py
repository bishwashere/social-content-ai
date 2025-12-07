#!/usr/bin/env python3
"""
Cleanup Test Data Script
Removes test campaigns, scheduled posts, and related data from the database.
"""

import os
import sys
from dotenv import load_dotenv
import pathlib
import pymongo
from pymongo import MongoClient

# Load environment variables from root .env
root_dir = pathlib.Path(__file__).parent.parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def cleanup_test_data(delete_campaign: bool = False):
    """Remove test data from database"""
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
    campaign_planners = db["campaign-planners"]
    campaign_chats = db["project-chats"]
    
    print(f"📊 Connected to database: {db_name}\n")
    
    # Find test campaign
    test_campaign = campaign_planners.find_one({"name": "Test Blog News Campaign"})
    
    if not test_campaign:
        print("ℹ️  No test campaign found (name: 'Test Blog News Campaign')")
        print("   Checking for any blog-news scheduled posts...\n")
        
        # Try to find any blog-news posts that might be test data
        blog_news_posts = scheduled_posts.find({
            "meta.type": "blog-news",
            "platform": "webhook"
        })
        
        blog_news_count = scheduled_posts.count_documents({
            "meta.type": "blog-news",
            "platform": "webhook"
        })
        
        if blog_news_count > 0:
            print(f"⚠️  Found {blog_news_count} blog-news posts without matching campaign")
            print("   These might be test data. Use --force-all to delete them.")
            print("   Or specify a campaign ID to delete specific posts.\n")
        else:
            print("✅ No test data found to clean up.\n")
        
        return
    
    campaign_id = test_campaign["_id"]
    campaign_id_str = str(campaign_id)
    
    print(f"🔍 Found test campaign: {campaign_id_str}")
    print(f"   Name: {test_campaign.get('name', 'N/A')}\n")
    
    # Find and delete scheduled posts for this campaign
    posts_query = {
        "meta.type": "blog-news",
        "meta.campaignId": campaign_id_str,
        "platform": "webhook"
    }
    
    posts_count = scheduled_posts.count_documents(posts_query)
    print(f"📝 Found {posts_count} scheduled posts for this campaign")
    
    if posts_count > 0:
        result = scheduled_posts.delete_many(posts_query)
        print(f"✅ Deleted {result.deleted_count} scheduled posts\n")
    else:
        print("   No scheduled posts to delete\n")
    
    # Find and delete campaign chats
    chats_query = {
        "plannerId": campaign_id_str
    }
    
    chats_count = campaign_chats.count_documents(chats_query)
    print(f"💬 Found {chats_count} campaign chats for this campaign")
    
    if chats_count > 0:
        result = campaign_chats.delete_many(chats_query)
        print(f"✅ Deleted {result.deleted_count} campaign chats\n")
    else:
        print("   No campaign chats to delete\n")
    
    # Optionally delete the campaign itself
    if delete_campaign:
        campaign_planners.delete_one({"_id": campaign_id})
        print(f"✅ Deleted test campaign: {campaign_id_str}\n")
    else:
        print(f"ℹ️  Campaign kept (use --delete-campaign to remove it)\n")
    
    print("✅ Test data cleanup complete!")

def cleanup_all_blog_news():
    """Remove ALL blog-news posts (use with caution!)"""
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
    
    query = {
        "meta.type": "blog-news",
        "platform": "webhook"
    }
    
    count = scheduled_posts.count_documents(query)
    print(f"⚠️  WARNING: This will delete ALL {count} blog-news posts!")
    
    if count > 0:
        result = scheduled_posts.delete_many(query)
        print(f"✅ Deleted {result.deleted_count} blog-news posts")
    else:
        print("✅ No blog-news posts found")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Cleanup test data from database")
    parser.add_argument(
        "--delete-campaign",
        action="store_true",
        help="Also delete the test campaign (not just posts/chats)"
    )
    parser.add_argument(
        "--force-all",
        action="store_true",
        help="Delete ALL blog-news posts (use with extreme caution!)"
    )
    
    args = parser.parse_args()
    
    if args.force_all:
        print("⚠️  FORCE MODE: Deleting ALL blog-news posts\n")
        response = input("Are you sure? Type 'yes' to confirm: ")
        if response.lower() == "yes":
            cleanup_all_blog_news()
        else:
            print("❌ Cancelled")
            sys.exit(0)
    else:
        cleanup_test_data(delete_campaign=args.delete_campaign)
