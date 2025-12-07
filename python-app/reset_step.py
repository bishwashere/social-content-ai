#!/usr/bin/env python3
"""Reset step flags for testing"""
import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
client = MongoClient(DATABASE_URL)
db_name = DATABASE_URL.split("/")[-1].split("?")[0] if "/" in DATABASE_URL else "social-content-ai"
db = client[db_name]

post_id = sys.argv[1] if len(sys.argv) > 1 else "6935bf26f90a9c334f77b93b"
step = sys.argv[2] if len(sys.argv) > 2 else "step3"

result = db["scheduled-posts"].update_one(
    {"_id": ObjectId(post_id)},
    {"$unset": {f"meta.{step}InProgress": "", f"meta.{step}StartedAt": ""}}
)

print(f"✅ Reset {step}InProgress flag, modified: {result.modified_count}")
