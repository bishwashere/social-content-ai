#!/usr/bin/env python3
"""
Check webhook URL stored in database for a campaign
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
import pymongo
from pymongo import MongoClient
from bson import ObjectId

# Load environment variables
load_dotenv()

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not configured")
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
campaign_planners = db["campaign-planners"]
scheduled_posts = db["scheduled-posts"]

# Get campaign ID from command line or use the one from logs
campaign_id_str = sys.argv[1] if len(sys.argv) > 1 else "6935e49476fede7a700ba5d4"

print(f"\n🔍 Checking webhook URL for campaignId={campaign_id_str}\n")

# Convert campaign_id to ObjectId
try:
    campaign_id_obj = ObjectId(campaign_id_str) if isinstance(campaign_id_str, str) else campaign_id_str
except Exception as e:
    print(f"ERROR: Invalid campaign_id format: {campaign_id_str} - {e}")
    sys.exit(1)

# 1. Check webhook URL in campaign metadata
print("1️⃣ Checking webhook URL in CampaignPlanner.blogNewsMetadata...")
campaign = campaign_planners.find_one({"_id": campaign_id_obj})

if not campaign:
    print(f"❌ Campaign not found: {campaign_id_str}")
    sys.exit(1)

print(f"✅ Campaign found: {campaign.get('name', 'Unnamed')}")
blog_news_metadata = campaign.get('blogNewsMetadata', {})
if isinstance(blog_news_metadata, dict):
    webhook_in_campaign = blog_news_metadata.get('webhook', '')
    print(f"   Webhook URL in campaign metadata: \"{webhook_in_campaign}\"")
    print(f"   Webhook URL length: {len(webhook_in_campaign)}")
    if webhook_in_campaign:
        print(f"   Contains '/ideas': {'/ideas' in webhook_in_campaign}")
        print(f"   Contains '/receive': {'/receive' in webhook_in_campaign}")
else:
    print(f"   blogNewsMetadata is not a dict: {type(blog_news_metadata)}")
    print(f"   Value: {blog_news_metadata}")

# 2. Check webhook URL in ScheduledPost meta
print(f"\n2️⃣ Checking webhook URL in ScheduledPost.meta...")
scheduled_post = scheduled_posts.find_one({
    "platform": "webhook",
    "meta.type": "blog-news",
    "meta.campaignId": campaign_id_str,
})

if scheduled_post:
    print(f"✅ ScheduledPost found: {scheduled_post.get('_id')}")
    meta = scheduled_post.get('meta', {})
    webhook_in_post = meta.get('webhook', '')
    print(f"   Webhook URL in post meta: \"{webhook_in_post}\"")
    print(f"   Webhook URL length: {len(webhook_in_post)}")
    if webhook_in_post:
        print(f"   Contains '/ideas': {'/ideas' in webhook_in_post}")
        print(f"   Contains '/receive': {'/receive' in webhook_in_post}")
    
    # Compare
    if webhook_in_campaign and webhook_in_post:
        if webhook_in_campaign == webhook_in_post:
            print(f"   ✅ Webhook URLs match between campaign and post")
        else:
            print(f"   ⚠️  Webhook URLs DO NOT MATCH!")
            print(f"      Campaign: \"{webhook_in_campaign}\"")
            print(f"      Post:     \"{webhook_in_post}\"")
else:
    print(f"❌ ScheduledPost not found")

# 3. Check all scheduled posts for this campaign
print(f"\n3️⃣ Checking all scheduled posts for this campaign...")
all_posts = list(scheduled_posts.find({
    "platform": "webhook",
    "meta.type": "blog-news",
    "meta.campaignId": campaign_id_str,
}))

print(f"   Found {len(all_posts)} scheduled posts")
for i, post in enumerate(all_posts, 1):
    meta = post.get('meta', {})
    webhook = meta.get('webhook', '')
    day = meta.get('day', 'N/A')
    print(f"   Post {i} (day {day}): \"{webhook}\"")

print("\n")
