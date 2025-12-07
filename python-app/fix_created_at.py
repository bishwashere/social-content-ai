#!/usr/bin/env python3
"""Fix createdAt field for posts"""
import os
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
client = MongoClient(DATABASE_URL)
db_name = DATABASE_URL.split("/")[-1].split("?")[0] if "/" in DATABASE_URL else "social-content-ai"
db = client[db_name]

# Fix posts with null createdAt
result = db["scheduled-posts"].update_many(
    {"createdAt": None},
    {"$set": {"createdAt": datetime.utcnow()}}
)

print(f"✅ Fixed {result.modified_count} posts with null createdAt")
