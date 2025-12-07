#!/usr/bin/env python3
"""
Check CampaignChat existence for a specific campaign and day
Uses the same query logic as main.py
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

# Connect to database (same as main.py)
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
# Try different possible collection names for CampaignChat
# Prisma default naming: CampaignChat -> CampaignChat (PascalCase) or campaign-chats (kebab-case)
possible_collections = ["CampaignChat", "campaign-chats", "CampaignChats"]
campaign_chats = None
for coll_name in possible_collections:
    if coll_name in db.list_collection_names():
        campaign_chats = db[coll_name]
        print(f"✅ Found CampaignChat collection: {coll_name}")
        break

if campaign_chats is None:
    # Default to CampaignChat (Prisma default for models without @@map)
    campaign_chats = db["CampaignChat"]
    print(f"⚠️  Using default collection name: CampaignChat")

scheduled_posts = db["scheduled-posts"]

# List all collections to see what exists
print(f"\n📋 Available collections in database:")
for coll in sorted(db.list_collection_names()):
    count = db[coll].count_documents({})
    print(f"   - {coll}: {count} documents")
print()

# Get campaign ID and day from command line or use the one from logs
campaign_id_str = sys.argv[1] if len(sys.argv) > 1 else "6935e49476fede7a700ba5d4"
day = int(sys.argv[2]) if len(sys.argv) > 2 else 1

print(f"\n🔍 Checking CampaignChat for campaignId={campaign_id_str}, day={day}\n")

# Convert campaign_id to ObjectId (same as Python code)
try:
    campaign_id_obj = ObjectId(campaign_id_str) if isinstance(campaign_id_str, str) else campaign_id_str
except Exception as e:
    print(f"ERROR: Invalid campaign_id format: {campaign_id_str} - {e}")
    sys.exit(1)

# 1. Check if campaign exists (same query as Python)
print("1️⃣ Checking if campaign exists...")
campaign = campaign_planners.find_one({"_id": campaign_id_obj})

if not campaign:
    print(f"❌ Campaign not found: {campaign_id_str}")
    sys.exit(1)
else:
    print(f"✅ Campaign found: {campaign.get('name', 'Unnamed')}")
    print(f"   Goal: {campaign.get('goal', 'N/A')}")
    print(f"   Start Date: {campaign.get('startDate', 'N/A')}")

# 2. Check all chats for this campaign (try multiple query variations)
print(f"\n2️⃣ Checking all chats for campaign {campaign_id_str}...")

# Try with ObjectId
all_chats_objid = list(campaign_chats.find({"plannerId": campaign_id_obj}))
print(f"   Query with ObjectId: Found {len(all_chats_objid)} chats")

# Try with string
all_chats_str = list(campaign_chats.find({"plannerId": campaign_id_str}))
print(f"   Query with string: Found {len(all_chats_str)} chats")

# Try without filter to see all chats
all_chats_all = list(campaign_chats.find({}).limit(10))
print(f"   Total chats in collection (sample): {len(all_chats_all)}")
if all_chats_all:
    print(f"   Sample chat plannerId type: {type(all_chats_all[0].get('plannerId'))}")
    print(f"   Sample chat plannerId value: {all_chats_all[0].get('plannerId')}")

# Use the one that found results
all_chats = all_chats_objid if all_chats_objid else all_chats_str
print(f"   Using result: Found {len(all_chats)} chats total")
if all_chats:
    days = [c.get('day') for c in all_chats]
    planner_ids = [str(c.get('plannerId')) for c in all_chats]
    print(f"   Days: {days}")
    print(f"   PlannerIds: {planner_ids[:3]}...")  # Show first 3
else:
    print("   Days: []")

# 3. Check specific chat for day (try multiple query variations)
print(f"\n3️⃣ Checking for chat with day={day}...")

# Try with ObjectId and int day
chat1 = campaign_chats.find_one({
    "plannerId": campaign_id_obj,
    "day": day
})
print(f"   Query 1 (ObjectId, int day): {'Found' if chat1 else 'Not found'}")

# Try with string and int day
chat2 = campaign_chats.find_one({
    "plannerId": campaign_id_str,
    "day": day
})
print(f"   Query 2 (string, int day): {'Found' if chat2 else 'Not found'}")

# Try with ObjectId and string day
chat3 = campaign_chats.find_one({
    "plannerId": campaign_id_obj,
    "day": str(day)
})
print(f"   Query 3 (ObjectId, string day): {'Found' if chat3 else 'Not found'}")

# Try finding any chat with this day regardless of plannerId
any_chat_day = campaign_chats.find_one({"day": day})
if any_chat_day:
    print(f"   Found chat with day={day} but different plannerId: {any_chat_day.get('plannerId')}")

# Use the first one that found results
chat = chat1 or chat2 or chat3

if not chat:
    print(f"❌ CampaignChat not found for campaignId={campaign_id_str}, day={day}")
    print(f"   This matches the Python warning!")
else:
    print(f"✅ CampaignChat found: {chat.get('_id')}")
    print(f"   Status: {chat.get('status', 'N/A')}")
    contents = chat.get('contents', {})
    blog = contents.get('blog', {})
    if blog:
        print(f"   Blog exists: {blog.get('title', 'N/A')[:50]}...")
    else:
        print(f"   Blog: Not set")

# 4. Check scheduled post
print(f"\n4️⃣ Checking scheduled post for this campaign and day...")
scheduled_post = scheduled_posts.find_one({
    "platform": "webhook",
    "meta.type": "blog-news",
    "meta.campaignId": campaign_id_str,
    "meta.day": day
})

if scheduled_post:
    print(f"✅ ScheduledPost found: {scheduled_post.get('_id')}")
    meta = scheduled_post.get('meta', {})
    blog = meta.get('blog', {})
    if blog:
        print(f"   Blog in meta: {blog.get('title', 'N/A')[:50]}...")
        print(f"   Step 2 completed: {meta.get('step2Completed', False)}")
    else:
        print(f"   Blog in meta: Not set")
    print(f"   Status: {scheduled_post.get('status', 'N/A')}")
    print(f"   Date: {scheduled_post.get('date', 'N/A')}")
else:
    print(f"❌ ScheduledPost not found")

# 5. Summary
print(f"\n📊 Summary:")
print(f"   Campaign exists: ✅")
print(f"   Total chats: {len(all_chats)}")
print(f"   Chat for day {day}: {'✅' if chat else '❌'}")
print(f"   ScheduledPost exists: {'✅' if scheduled_post else '❌'}")

if not chat and scheduled_post:
    print(f"\n⚠️  ISSUE: ScheduledPost exists but CampaignChat doesn't!")
    print(f"   The blog is saved in ScheduledPost.meta.blog, which the UI can read.")
    print(f"   However, CampaignChat.contents.blog is not updated, which might cause issues.")
    print(f"\n   Possible causes:")
    print(f"   1. Campaign was created without chats (Blog News campaigns don't auto-create chats)")
    print(f"   2. Chat was deleted after scheduled post was created")
    print(f"   3. Chat was never created for this day")

print("\n")
