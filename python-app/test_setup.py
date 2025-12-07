#!/usr/bin/env python3
"""
Test Data Setup Script
Creates test scheduled posts in the database for testing the Blog News flow.
"""

import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv
import pymongo
from pymongo import MongoClient

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def setup_test_data():
    """Create test scheduled posts for testing"""
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
    campaign_planners = db["campaign-planners"]  # From Prisma @@map
    projects = db["projects"]  # From Prisma @@map
    
    print(f"📊 Connected to database: {db_name}")
    
    # Get or create a test campaign
    test_campaign = campaign_planners.find_one({"name": "Test Blog News Campaign"})
    
    if not test_campaign:
        # Get first project
        test_project = projects.find_one()
        if not test_project:
            print("❌ No projects found. Please create a project first.")
            sys.exit(1)
        
        # Create test campaign
        test_campaign = {
            "name": "Test Blog News Campaign",
            "goal": "Blog News",
            "projectId": test_project["_id"],
            "startDate": datetime.utcnow(),
            "blogNewsMetadata": {
                "topics": ["AI", "Technology", "Machine Learning"],
                "angles": ["Economic Impact", "Ethical Considerations"],
                "webhook": "https://example.com/webhook",
                "platforms": ["twitter", "facebook", "linkedin"]
            }
        }
        campaign_id = campaign_planners.insert_one(test_campaign).inserted_id
        test_campaign["_id"] = campaign_id
        print(f"✅ Created test campaign: {campaign_id}")
    else:
        print(f"✅ Using existing test campaign: {test_campaign['_id']}")
    
    # Create test scheduled posts
    now = datetime.utcnow()
    
    # Post 1: Schedule for 1 minute from now (for immediate testing)
    post1_date = now + timedelta(minutes=1)
    post1 = {
        "projectId": test_campaign["projectId"],
        "platform": "webhook",
        "content": "",
        "date": post1_date,
        "status": "pending",
        "oauthProviderId": None,
        "meta": {
            "type": "blog-news",
            "campaignId": str(test_campaign["_id"]),
            "day": 1,
            "topics": test_campaign["blogNewsMetadata"]["topics"],
            "angles": test_campaign["blogNewsMetadata"]["angles"],
            "webhook": test_campaign["blogNewsMetadata"]["webhook"],
            "platforms": test_campaign["blogNewsMetadata"]["platforms"]
        }
    }
    
    # Post 2: Schedule for 2 minutes from now
    post2_date = now + timedelta(minutes=2)
    post2 = {
        "projectId": test_campaign["projectId"],
        "platform": "webhook",
        "content": "",
        "date": post2_date,
        "status": "pending",
        "oauthProviderId": None,
        "meta": {
            "type": "blog-news",
            "campaignId": str(test_campaign["_id"]),
            "day": 2,
            "topics": test_campaign["blogNewsMetadata"]["topics"],
            "angles": test_campaign["blogNewsMetadata"]["angles"],
            "webhook": test_campaign["blogNewsMetadata"]["webhook"],
            "platforms": test_campaign["blogNewsMetadata"]["platforms"]
        }
    }
    
    # Check if posts already exist
    existing_post1 = scheduled_posts.find_one({
        "meta.campaignId": str(test_campaign["_id"]),
        "meta.day": 1
    })
    
    existing_post2 = scheduled_posts.find_one({
        "meta.campaignId": str(test_campaign["_id"]),
        "meta.day": 2
    })
    
    if existing_post1:
        print(f"⏭️  Post 1 already exists: {existing_post1['_id']}")
        # Update date to 1 minute from now
        scheduled_posts.update_one(
            {"_id": existing_post1["_id"]},
            {"$set": {"date": post1_date, "status": "pending"}}
        )
        print(f"✅ Updated Post 1 date to: {post1_date}")
    else:
        post1_id = scheduled_posts.insert_one(post1).inserted_id
        print(f"✅ Created Post 1: {post1_id} (scheduled for {post1_date})")
    
    if existing_post2:
        print(f"⏭️  Post 2 already exists: {existing_post2['_id']}")
        # Update date to 2 minutes from now
        scheduled_posts.update_one(
            {"_id": existing_post2["_id"]},
            {"$set": {"date": post2_date, "status": "pending"}}
        )
        print(f"✅ Updated Post 2 date to: {post2_date}")
    else:
        post2_id = scheduled_posts.insert_one(post2).inserted_id
        print(f"✅ Created Post 2: {post2_id} (scheduled for {post2_date})")
    
    # Create CampaignChat entries
    campaign_chats = db["project-chats"]  # From Prisma @@map
    
    for day in [1, 2]:
        chat = campaign_chats.find_one({
            "plannerId": str(test_campaign["_id"]),
            "day": day
        })
        
        if not chat:
            campaign_chats.insert_one({
                "plannerId": str(test_campaign["_id"]),
                "day": day,
                "contents": {},
                "status": "PENDING"
            })
            print(f"✅ Created CampaignChat for day {day}")
        else:
            print(f"⏭️  CampaignChat for day {day} already exists")
    
    print("\n✅ Test data setup complete!")
    print(f"\n📝 Next steps:")
    print(f"1. Wait 1 minute for Post 1 to be ready")
    print(f"2. Run Python app: python main.py")
    print(f"3. After Step 2 completes, test Steps 3 & 4 via Next.js API")

if __name__ == "__main__":
    setup_test_data()
