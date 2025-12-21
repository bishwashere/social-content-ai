#!/usr/bin/env python3
"""
Blog News Python Worker
Handles Step 1 (Fetch Article) and Step 2 (Generate Blog) for Blog News auto-post system.

State Machine:
- pending → processing (Step 1) → processing (Step 2) → ready_for_step3
- Any step can transition to error state on failure
"""

import os
import sys
import json
import logging
import argparse
import random
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
import pymongo
from pymongo import MongoClient
from bson import ObjectId
import requests
import google.generativeai as genai
from dateutil import parser as date_parser

# Load environment variables
load_dotenv()

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
log_format = "[%(asctime)s] [%(levelname)s] %(message)s"
logging.basicConfig(
    level=getattr(logging, log_level),
    format=log_format,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(
            os.getenv("LOG_FILE", "logs/blog-news-worker.log"),
            mode="a"
        ) if os.getenv("LOG_FILE") else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEYS = [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_1"),
    os.getenv("GEMINI_API_KEY_2"),
]
GEMINI_API_KEYS = [key for key in GEMINI_API_KEYS if key]  # Filter None values
OLIVEDRIFT_API_KEY = os.getenv("OLIVEDRIFT_API_KEY")  # Match Next.js env var name
OLIVEDRIFT_BASE_URL = os.getenv("OLIVEDRIFT_BASE_URL")  # Match Next.js env var name
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
RETRY_DELAY_SECONDS = int(os.getenv("RETRY_DELAY_SECONDS", "60"))

# Test mode - set TEST_MODE=true to use mock APIs
TEST_MODE = os.getenv("TEST_MODE", "false").lower() == "true"

# Constants
STEP1_MAX_RETRIES = MAX_RETRIES
STEP2_MAX_RETRIES = MAX_RETRIES


class Database:
    """Database connection and operations"""
    
    def __init__(self, database_url: str):
        self.client = MongoClient(database_url)
        # Extract database name from URL or use default
        # Format: mongodb://host:port/database_name
        if "/" in database_url:
            parts = database_url.split("/")
            if len(parts) > 3:
                db_name = parts[-1].split("?")[0]
            else:
                db_name = "social-content-ai"
        else:
            db_name = "social-content-ai"
        
        self.db = self.client[db_name]
        self.scheduled_posts = self.db["scheduled-posts"]  # From Prisma @@map
        self.campaign_chats = self.db["CampaignChat"]  # CampaignChat collection (no @@map, Prisma uses PascalCase: CampaignChat)
        self.campaign_planners = self.db["campaign-planners"]  # From Prisma @@map
        self.gemini_key_states = self.db["gemini-api-key-states"]  # For tracking exhausted API keys
        logger.info(f"Connected to database: {db_name}")
    
    def find_pending_posts(self) -> List[Dict[str, Any]]:
        """
        Find posts ready for Step 1 & 2 processing.
        
        Criteria:
        - status = "pending" OR "processing" (not "error", "success", or "posted")
        - meta.type = "blog-news"
        - Needs Step 1: (step1Completed != true AND step1InProgress != true)
        - OR Needs Step 2: (step1Completed == true AND step2Completed != true AND step2InProgress != true)
        - date <= now (scheduled time has passed)
        - No terminal error state
        """
        now = datetime.utcnow()
        
        query = {
            "platform": "webhook",
            "meta.type": "blog-news",
            "$or": [
                {"status": "pending"},
                {"status": "processing"}
            ],
            "$and": [
                {
                    # Posts that need Step 1 OR Step 2
                    "$or": [
                        # Need Step 1: step1Completed != true AND step1InProgress != true
                        {
                            "$and": [
                                {
                                    "$or": [
                                        {"meta.step1Completed": {"$ne": True}},
                                        {"meta.step1Completed": {"$exists": False}}
                                    ]
                                },
                                {
                                    "$or": [
                                        {"meta.step1InProgress": {"$ne": True}},
                                        {"meta.step1InProgress": {"$exists": False}}
                                    ]
                                },
                                {
                                    "$or": [
                                        {"meta.step1Error": None},
                                        {"meta.step1Error": {"$exists": False}}
                                    ]
                                }
                            ]
                        },
                        # Need Step 2: step1Completed == true AND step2Completed != true AND step2InProgress != true
                        {
                            "$and": [
                                {"meta.step1Completed": True},
                                {
                                    "$or": [
                                        {"meta.step2Completed": {"$ne": True}},
                                        {"meta.step2Completed": {"$exists": False}}
                                    ]
                                },
                                {
                                    "$or": [
                                        {"meta.step2InProgress": {"$ne": True}},
                                        {"meta.step2InProgress": {"$exists": False}}
                                    ]
                                },
                                {
                                    "$or": [
                                        {"meta.step2Error": None},
                                        {"meta.step2Error": {"$exists": False}}
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "status": {"$ne": "error"},  # Skip terminal error states
            "date": {"$lte": now},
        }
        
        posts = list(self.scheduled_posts.find(query))
        logger.info(f"Found {len(posts)} pending posts for Step 1 & 2")
        return posts
    
    def claim_post_for_step1(self, post_id: str) -> bool:
        """
        Atomically claim a post for Step 1 processing.
        Returns True if successfully claimed, False if already claimed.
        """
        result = self.scheduled_posts.update_one(
            {
                "_id": post_id,
                "$and": [
                    {
                        "$or": [
                            {"meta.step1InProgress": {"$ne": True}},
                            {"meta.step1InProgress": {"$exists": False}}
                        ]
                    },
                    {
                        "$or": [
                            {"meta.step1Completed": {"$ne": True}},
                            {"meta.step1Completed": {"$exists": False}}
                        ]
                    }
                ]
            },
            {
                "$set": {
                    "meta.step1InProgress": True,
                    "status": "processing",
                    "meta.step1StartedAt": datetime.utcnow().isoformat(),
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0
    
    def claim_post_for_step2(self, post_id: str) -> bool:
        """
        Atomically claim a post for Step 2 processing.
        Returns True if successfully claimed, False if already claimed.
        """
        result = self.scheduled_posts.update_one(
            {
                "_id": post_id,
                "meta.step1Completed": True,
                "$and": [
                    {
                        "$or": [
                            {"meta.step2InProgress": {"$ne": True}},
                            {"meta.step2InProgress": {"$exists": False}}
                        ]
                    },
                    {
                        "$or": [
                            {"meta.step2Completed": {"$ne": True}},
                            {"meta.step2Completed": {"$exists": False}}
                        ]
                    }
                ]
            },
            {
                "$set": {
                    "meta.step2InProgress": True,
                    "meta.step2StartedAt": datetime.utcnow().isoformat(),
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0
    
    def mark_step1_complete(self, post_id: str, article: Dict[str, Any]):
        """Mark Step 1 as complete and store article data"""
        self.scheduled_posts.update_one(
            {"_id": post_id},
            {
                "$set": {
                    "meta.article": article,
                    "meta.step1Completed": True,
                    "meta.step1CompletedAt": datetime.utcnow().isoformat(),
                    "meta.step1InProgress": False,
                    "meta.step1Error": None,
                    "updatedAt": datetime.utcnow()
                },
                "$unset": {
                    "meta.step1RetryCount": ""
                }
            }
        )
        logger.info(f"Post {post_id}: Step 1 completed")
    
    def mark_step1_error(self, post_id: str, error: str, retry_count: int):
        """Mark Step 1 as failed with error"""
        update_data = {
            "meta.step1Error": error,
            "meta.step1RetryCount": retry_count,
            "meta.step1InProgress": False,
        }
        
        # If max retries exceeded, mark as terminal error
        if retry_count >= STEP1_MAX_RETRIES:
            update_data["status"] = "error"
            logger.error(f"Post {post_id}: Step 1 failed permanently after {retry_count} retries")
        else:
            logger.warning(f"Post {post_id}: Step 1 failed (retry {retry_count}/{STEP1_MAX_RETRIES})")
        
        update_data["updatedAt"] = datetime.utcnow()
        self.scheduled_posts.update_one(
            {"_id": post_id},
            {"$set": update_data}
        )
    
    def mark_step2_complete(self, post_id: str, blog: Dict[str, Any], campaign_id: str, day: int):
        """Mark Step 2 as complete and store blog data"""
        # Update ScheduledPost
        self.scheduled_posts.update_one(
            {"_id": post_id},
            {
                "$set": {
                    "meta.blog": blog,
                    "meta.step2Completed": True,
                    "meta.step2CompletedAt": datetime.utcnow().isoformat(),
                    "meta.step2InProgress": False,
                    "meta.step2Error": None,
                    "updatedAt": datetime.utcnow()
                },
                "$unset": {
                    "meta.step2RetryCount": ""
                }
            }
        )
        
        # Update CampaignChat - Match Next.js approach: find campaign first, then get chat
        # Convert campaign_id to ObjectId if it's a string
        try:
            campaign_id_obj = ObjectId(campaign_id) if isinstance(campaign_id, str) else campaign_id
        except Exception:
            logger.error(f"Invalid campaign_id format: {campaign_id}")
            campaign_id_obj = campaign_id  # Fallback to original value
        
        # Ensure day is an integer (not string)
        day_int = int(day) if isinstance(day, str) else day
        
        # Find campaign first (matching Next.js approach)
        campaign = self.campaign_planners.find_one({"_id": campaign_id_obj})
        
        if not campaign:
            logger.error(f"Campaign not found: {campaign_id}")
            logger.warning(f"Blog saved to post.meta but CampaignChat won't be updated. Campaign {campaign_id} doesn't exist.")
        else:
            # Find chat for this day (matching Next.js approach)
            chat = self.campaign_chats.find_one({
                "plannerId": campaign_id_obj,
                "day": day_int
            })
            
            if not chat:
                # Create CampaignChat if it doesn't exist (this is the whole point of the steps)
                logger.info(f"CampaignChat not found for campaignId={campaign_id}, day={day_int}. Creating it...")
                
                try:
                    new_chat = {
                        "plannerId": campaign_id_obj,
                        "day": day_int,
                        "title": None,
                        "prompt": "",
                        "completed": False,
                        "contents": {
                            "blog": blog
                        },
                        "tickMark": {},
                        "status": "GENERATED",
                        "createdAt": datetime.utcnow(),
                        "updatedAt": datetime.utcnow()
                    }
                    
                    result = self.campaign_chats.insert_one(new_chat)
                    chat_id = result.inserted_id
                    logger.info(f"✅ Created CampaignChat {chat_id} for campaignId={campaign_id}, day={day_int} with blog")
                except Exception as e:
                    logger.error(f"Failed to create CampaignChat for campaignId={campaign_id}, day={day_int}: {e}")
                    logger.warning(f"Blog saved to post.meta but CampaignChat creation failed")
            else:
                chat_id = chat.get("_id")
                logger.info(f"Found CampaignChat {chat_id} for campaignId={campaign_id}, day={day_int}, updating with blog...")
                
                # Update chat using chat ID (matching Next.js approach - more reliable)
                result = self.campaign_chats.update_one(
                    {"_id": chat_id},
                    {
                        "$set": {
                            "contents.blog": blog,
                            "status": "GENERATED",
                            "updatedAt": datetime.utcnow()
                        }
                    }
                )
                
                if result.matched_count == 0:
                    logger.error(f"Failed to update CampaignChat (matched_count=0) even though it exists!")
                else:
                    logger.info(f"✅ Updated CampaignChat {chat_id} for campaignId={campaign_id}, day={day_int}")
        
        logger.info(f"Post {post_id}: Step 2 completed")
    
    def mark_step2_error(self, post_id: str, error: str, retry_count: int):
        """Mark Step 2 as failed with error"""
        update_data = {
            "meta.step2Error": error,
            "meta.step2RetryCount": retry_count,
            "meta.step2InProgress": False,
        }
        
        # If max retries exceeded, mark as terminal error
        if retry_count >= STEP2_MAX_RETRIES:
            update_data["status"] = "error"
            logger.error(f"Post {post_id}: Step 2 failed permanently after {retry_count} retries")
        else:
            logger.warning(f"Post {post_id}: Step 2 failed (retry {retry_count}/{STEP2_MAX_RETRIES})")
        
        update_data["updatedAt"] = datetime.utcnow()
        self.scheduled_posts.update_one(
            {"_id": post_id},
            {"$set": update_data}
        )
    
    def mark_key_as_exhausted(self, key_name: str, error_message: str, retry_delay_seconds: int):
        """
        Mark a Gemini API key as exhausted in the database.
        Matches the Next.js implementation.
        """
        try:
            now = datetime.utcnow()
            retry_after = now + timedelta(seconds=retry_delay_seconds)
            
            self.gemini_key_states.update_one(
                {"keyName": key_name},
                {
                    "$set": {
                        "keyName": key_name,
                        "exhausted": True,
                        "exhaustedAt": now,
                        "retryAfter": retry_after,
                        "lastError": error_message[:500] if len(error_message) > 500 else error_message,  # Limit error message length
                        "lastErrorStatus": 429,  # Rate limit status
                        "updatedAt": now
                    }
                },
                upsert=True  # Create if doesn't exist
            )
            
            logger.info(f"🔴 Marked {key_name} as exhausted. Retry after: {retry_after.isoformat()}")
        except Exception as e:
            logger.warning(f"Failed to mark key {key_name} as exhausted in database: {e}")


def shuffle_array(array: List[Any]) -> List[Any]:
    """
    Shuffle array in place using Fisher-Yates algorithm.
    Returns a shuffled copy (doesn't mutate original).
    """
    shuffled = array.copy()
    for i in range(len(shuffled) - 1, 0, -1):
        j = random.randint(0, i)
        shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
    return shuffled


def is_article_duplicate(
    post_url: str,
    post_id: str,
    source: str,
    used_ids: set
) -> bool:
    """
    Check if an article is a duplicate based on used IDs.
    Matches the original Next.js implementation.
    """
    # Check by URL (primary check)
    if post_url and post_url in used_ids:
        return True
    
    # Check by articleId with source prefix
    if post_id and f"{source}:{post_id}" in used_ids:
        return True
    
    # Additional checks for Reddit
    if source == "reddit" and post_url:
        # Extract Reddit post ID from URL: /r/subreddit/comments/POST_ID/...
        reddit_match = re.search(r'/r/\w+/comments/(\w+)', post_url)
        if reddit_match and f"reddit:{reddit_match.group(1)}" in used_ids:
            return True
        
        # Also try to extract from permalink if URL doesn't match
        permalink_match = re.search(r'/comments/(\w+)', post_url)
        if permalink_match and not reddit_match and f"reddit:{permalink_match.group(1)}" in used_ids:
            return True
    
    # Additional checks for HackerNews
    if source == "hackernews" and post_url:
        # Extract HN post ID from URL: item?id=123456
        hn_match = re.search(r'item\?id=(\d+)', post_url)
        if hn_match and f"hackernews:{hn_match.group(1)}" in used_ids:
            return True
    
    return False


class ArticleFetcher:
    """Fetches articles from Reddit/HackerNews via Olive Drift API"""
    
    def __init__(self, api_key: str, base_url: str, test_mode: bool = False):
        self.api_key = api_key
        self.base_url = base_url
        self.test_mode = test_mode
    
    def fetch_reddit_posts(self, topics: List[str], limit: int = 3) -> List[Dict[str, Any]]:
        """Fetch Reddit posts for given topics via Olive Drift API"""
        if self.test_mode:
            # Mock data for testing
            logger.info("TEST_MODE: Using mock Reddit posts")
            return [
                {
                    "id": f"test_reddit_{i}",
                    "title": f"Test Reddit Post {i} about {topics[0] if topics else 'AI'}",
                    "selftext": f"This is a test Reddit post content about {topics[0] if topics else 'AI'}. It contains some interesting information for testing purposes.",
                    "url": f"https://reddit.com/r/test/comments/test_reddit_{i}/test_post/",
                    "permalink": f"/r/test/comments/test_reddit_{i}/test_post/"
                }
                for i in range(limit)
            ]
        
        if not self.base_url or not self.api_key:
            raise ValueError("OLIVEDRIFT_BASE_URL and OLIVEDRIFT_API_KEY must be configured")
        
        # Use popular subreddits for better results (matching Next.js implementation)
        popular_subreddits = [
            "technology",
            "programming",
            "startups",
            "investing",
            "cryptocurrency",
            "stocks",
            "artificial",
            "MachineLearning",
            "webdev",
            "entrepreneur",
            "business",
            "finance",
        ]
        
        try:
            response = requests.post(
                f"{self.base_url}/api/getRedditPosts",
                json={
                    "keywords": topics,
                    "maxPosts": limit,
                    "subreddits": popular_subreddits,  # Required field
                    "timeFilter": "week",  # Get recent posts
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            
            response.raise_for_status()
            data = response.json()
            
            if not data.get("success"):
                raise ValueError(data.get("message", "Failed to fetch Reddit posts"))
            
            # Transform Olive Drift response to our format (matching Next.js)
            posts = []
            for post in data.get("posts", []):
                posts.append({
                    "id": post.get("id") or post.get("name") or "",
                    "title": post.get("title") or "",
                    "selftext": post.get("selftext") or "",
                    "author": post.get("author") or "",
                    "score": post.get("score") or 0,
                    "num_comments": post.get("num_comments") or 0,
                    "created_utc": post.get("created_utc") or (int(datetime.now().timestamp())),
                    "permalink": post.get("permalink") or "",
                    "url": post.get("url") or (f"https://reddit.com{post.get('permalink', '')}"),
                    "subreddit": post.get("subreddit") or "",
                })
            
            logger.info(f"Fetched {len(posts)} Reddit posts for topics: {topics}")
            return posts
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching Reddit posts: {e}")
            raise
        except Exception as e:
            logger.error(f"Error processing Reddit posts response: {e}")
            raise
    
    def fetch_hackernews_posts(self, topics: List[str], limit: int = 3) -> List[Dict[str, Any]]:
        """Fetch HackerNews posts for given topics via Olive Drift API"""
        if self.test_mode:
            # Mock data for testing
            logger.info("TEST_MODE: Using mock HackerNews posts")
            return [
                {
                    "id": 1000000 + i,
                    "title": f"Test HN Post {i} about {topics[0] if topics else 'Technology'}",
                    "text": f"This is a test HackerNews post content about {topics[0] if topics else 'Technology'}. It contains some interesting information for testing purposes.",
                    "permalink": f"https://news.ycombinator.com/item?id={1000000 + i}"
                }
                for i in range(limit)
            ]
        
        if not self.base_url or not self.api_key:
            raise ValueError("OLIVEDRIFT_BASE_URL and OLIVEDRIFT_API_KEY must be configured")
        
        try:
            response = requests.post(
                f"{self.base_url}/api/getHackerNewsPosts",
                json={
                    "keywords": topics,
                    "maxPosts": limit,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            
            response.raise_for_status()
            data = response.json()
            
            if not data.get("success"):
                raise ValueError(data.get("message", "Failed to fetch HackerNews posts"))
            
            # Transform Olive Drift response to our format (matching Next.js)
            posts = []
            for post in data.get("posts", []):
                posts.append({
                    "id": post.get("id"),
                    "title": post.get("title") or "",
                    "text": post.get("selftext") or "",
                    "author": post.get("author") or "",
                    "score": post.get("score") or 0,
                    "num_comments": post.get("num_comments") or 0,
                    "created_utc": post.get("created_utc") or (int(datetime.now().timestamp())),
                    "permalink": post.get("permalink") or "",
                })
            
            logger.info(f"Fetched {len(posts)} HackerNews posts for topics: {topics}")
            return posts
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching HackerNews posts: {e}")
            raise
        except Exception as e:
            logger.error(f"Error processing HackerNews posts response: {e}")
            raise
    
    def get_used_article_ids(self, campaign_id: str, db: Database) -> set:
        """
        Get used article IDs/URLs for a campaign to avoid duplicates.
        Matches the original Next.js implementation exactly.
        """
        used_ids = set()
        
        # Get all chats for this campaign
        # Convert campaign_id to ObjectId if it's a string
        try:
            planner_id_obj = ObjectId(campaign_id) if isinstance(campaign_id, str) else campaign_id
        except Exception:
            logger.warning(f"Invalid campaign_id format in get_used_article_ids: {campaign_id}")
            planner_id_obj = campaign_id  # Fallback to original value
        
        chats = db.campaign_chats.find({"plannerId": planner_id_obj})
        
        for chat in chats:
            contents = chat.get("contents", {})
            blog = contents.get("blog", {})
            source_article = blog.get("sourceArticle", {})
            
            if source_article:
                # Use URL as the primary unique identifier (most reliable)
                if source_article.get("url"):
                    used_ids.add(source_article["url"])
                
                # Also store articleId if available (for additional duplicate detection)
                if source_article.get("articleId"):
                    source = source_article.get("source", "unknown")
                    used_ids.add(f"{source}:{source_article['articleId']}")
                
                # Fallback: Extract IDs from URLs for additional matching
                source = source_article.get("source", "")
                url = source_article.get("url", "")
                
                if source == "reddit" and url:
                    # Extract Reddit post ID from URL
                    reddit_match = re.search(r'/r/\w+/comments/(\w+)', url)
                    if reddit_match:
                        used_ids.add(f"reddit:{reddit_match.group(1)}")
                    
                    # Also try to extract from permalink if URL doesn't match
                    permalink_match = re.search(r'/comments/(\w+)', url)
                    if permalink_match and not reddit_match:
                        used_ids.add(f"reddit:{permalink_match.group(1)}")
                
                elif source == "hackernews" and url:
                    # Extract HN post ID from URL
                    hn_match = re.search(r'item\?id=(\d+)', url)
                    if hn_match:
                        used_ids.add(f"hackernews:{hn_match.group(1)}")
        
        logger.info(f"Found {len(used_ids)} used article identifiers for campaign {campaign_id}")
        if len(used_ids) > 0:
            # Log first 10 for debugging
            sample_ids = list(used_ids)[:10]
            logger.info(f"Used IDs sample: {sample_ids}")
        
        return used_ids
    
    def fetch_article_for_topics(
        self,
        topics: List[str],
        campaign_id: str,
        db: Database
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch a non-duplicate article for given topics.
        Fetches multiple articles at once (3 per topic), shuffles them randomly,
        then picks the first non-duplicate.
        Matches the original Next.js implementation exactly.
        """
        used_ids = self.get_used_article_ids(campaign_id, db)
        articles_per_topic = 3  # Fetch 3 articles per topic for better duplicate detection
        
        # Try Reddit first - fetch multiple posts for all topics
        all_reddit_posts: List[Dict[str, Any]] = []
        for topic in topics:
            try:
                posts = self.fetch_reddit_posts([topic], articles_per_topic)
                all_reddit_posts.extend(posts)
            except Exception as e:
                logger.warning(f"Error fetching Reddit posts for topic '{topic}': {e}")
        
        # Shuffle articles randomly before checking duplicates to avoid deterministic selection
        shuffled_reddit_posts = shuffle_array(all_reddit_posts)
        
        # Filter out duplicates and find first valid article from shuffled array
        for post in shuffled_reddit_posts:
            post_url = post.get("url") or post.get("permalink", "")
            post_id = post.get("id", "")
            
            # Normalize URL to match what we store (absolute URL)
            final_url = post_url
            if post_url and not post_url.startswith("http"):
                final_url = f"https://reddit.com{post_url}"
            
            # Check if this article is a duplicate (use final_url for checking to match stored format)
            is_duplicate = is_article_duplicate(final_url, post_id, "reddit", used_ids)
            if not is_duplicate:
                logger.info(f"Found non-duplicate Reddit article: {post.get('title', 'Untitled')[:50]} (ID: {post_id}, URL: {final_url[:50]}...)")
                return {
                    "title": post.get("title", "Untitled"),
                    "content": post.get("selftext") or post.get("title", ""),
                    "source": "reddit",
                    "url": final_url,
                    "articleId": post_id
                }
            else:
                logger.info(f"Skipping duplicate Reddit article: {post.get('title', 'Untitled')[:50]} (ID: {post_id}, URL: {final_url[:50]}...)")
        
        # Try HackerNews if Reddit didn't yield results - fetch multiple posts for all topics
        all_hn_posts: List[Dict[str, Any]] = []
        for topic in topics:
            try:
                posts = self.fetch_hackernews_posts([topic], articles_per_topic)
                all_hn_posts.extend(posts)
            except Exception as e:
                logger.warning(f"Error fetching HackerNews posts for topic '{topic}': {e}")
        
        # Shuffle articles randomly before checking duplicates to avoid deterministic selection
        shuffled_hn_posts = shuffle_array(all_hn_posts)
        
        # Filter out duplicates and find first valid article from shuffled array
        for post in shuffled_hn_posts:
            post_id = str(post.get("id", ""))
            # Normalize URL to match what we store (absolute URL)
            post_url = post.get("permalink") or f"https://news.ycombinator.com/item?id={post.get('id')}"
            
            # Check if this article is a duplicate (use normalized post_url for checking)
            is_duplicate = is_article_duplicate(post_url, post_id, "hackernews", used_ids)
            if not is_duplicate:
                logger.info(f"Found non-duplicate HackerNews article: {post.get('title', 'Untitled')[:50]} (ID: {post_id})")
                return {
                    "title": post.get("title", "Untitled"),
                    "content": post.get("text") or post.get("title", ""),
                    "source": "hackernews",
                    "url": post_url,
                    "articleId": post_id
                }
            else:
                logger.info(f"Skipping duplicate HackerNews article: {post.get('title', 'Untitled')[:50]} (ID: {post_id})")
        
        logger.warning(f"No non-duplicate articles found for topics: {topics}")
        return None


class BlogGenerator:
    """Generates blog content using Google Gemini AI"""
    
    def __init__(self, api_keys: List[str], test_mode: bool = False, db: Optional[Database] = None):
        self.api_keys = api_keys
        self.current_key_index = 0
        self.test_mode = test_mode
        self.db = db  # Store database reference for marking exhausted keys
    
    def get_prioritized_api_keys(self) -> List[Dict[str, Any]]:
        """
        Get API keys prioritized by exhaustion status.
        Returns list of {key, keyName, keyIndex} dicts in priority order:
        1. Never exhausted (highest priority)
        2. Exhausted but retry time passed (medium priority - will be reset)
        3. Still exhausted (lowest priority - will be skipped)
        """
        if not self.db:
            # If no db, return all keys in order
            return [
                {
                    "key": key,
                    "keyName": f"GEMINI_API_KEY_{i}" if i > 0 else "GEMINI_API_KEY",
                    "keyIndex": i
                }
                for i, key in enumerate(self.api_keys) if key
            ]
        
        now = datetime.utcnow()
        all_keys = [
            {
                "key": key,
                "keyName": f"GEMINI_API_KEY_{i}" if i > 0 else "GEMINI_API_KEY",
                "keyIndex": i
            }
            for i, key in enumerate(self.api_keys) if key
        ]
        
        # Get key states from database
        key_states = {}
        for key_info in all_keys:
            state = self.db.gemini_key_states.find_one({"keyName": key_info["keyName"]})
            if state:
                key_states[key_info["keyName"]] = state
        
        # Separate keys into three categories
        never_exhausted_keys = []
        reset_keys = []
        exhausted_keys = []
        
        for key_info in all_keys:
            state = key_states.get(key_info["keyName"])
            
            if not state:
                # Key has no state record - never exhausted, highest priority
                never_exhausted_keys.append(key_info)
            elif not state.get("exhausted"):
                # Key is not exhausted - never exhausted, highest priority
                never_exhausted_keys.append(key_info)
            else:
                # Key is exhausted - check if retry time has passed
                retry_after = state.get("retryAfter")
                if retry_after:
                    try:
                        retry_after_dt = date_parser.parse(retry_after) if isinstance(retry_after, str) else retry_after
                        if retry_after_dt <= now:
                            # Retry time has passed - reset it and use as medium priority
                            self.db.gemini_key_states.update_one(
                                {"keyName": key_info["keyName"]},
                                {
                                    "$set": {
                                        "exhausted": False,
                                        "exhaustedAt": None,
                                        "retryAfter": None,
                                        "lastError": None,
                                        "lastErrorStatus": None,
                                        "updatedAt": now
                                    }
                                }
                            )
                            logger.info(f"🟢 Reset {key_info['keyName']} - retry time passed")
                            reset_keys.append(key_info)
                        else:
                            # Still exhausted - lowest priority
                            exhausted_keys.append(key_info)
                    except Exception as e:
                        logger.warning(f"Error parsing retryAfter for {key_info['keyName']}: {e}")
                        exhausted_keys.append(key_info)
                else:
                    # Exhausted but no retry time - treat as still exhausted
                    exhausted_keys.append(key_info)
        
        # Return: never exhausted first, then reset keys, then still exhausted
        return never_exhausted_keys + reset_keys + exhausted_keys
    
    def get_api_key(self) -> Optional[str]:
        """Get current API key (supports rotation)"""
        if not self.api_keys:
            return None
        return self.api_keys[self.current_key_index % len(self.api_keys)]
    
    def generate_blog_from_article(
        self,
        article_title: str,
        article_content: str,
        angles: List[str],
        tried_key_indices: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Generate blog from article using Gemini AI.
        Returns blog dict with title, content, tags.
        """
        if tried_key_indices is None:
            tried_key_indices = []
        
        if self.test_mode:
            # Mock blog generation for testing
            logger.info("TEST_MODE: Using mock blog generation")
            angles_formatted = ", ".join(angles)
            return {
                "title": f"Test Blog: {article_title}",
                "content": f"""# Test Blog: {article_title}

> **Quick Take:** This is a test blog post generated from the article "{article_title}". It covers the angles: {angles_formatted}.

## Introduction

This is a test blog post generated for testing purposes. The original article was about: {article_title}.

## {angles[0] if angles else "Test Angle"}

This section covers the {angles[0] if angles else "test"} angle of the topic.

## Conclusion

This concludes the test blog post.
""",
                "tags": ["test", "ai", "technology"] + angles[:2] if angles else ["test"]
            }
        
        # Get prioritized API keys (skips exhausted keys that haven't passed retry time)
        prioritized_keys = self.get_prioritized_api_keys()
        
        # Filter out keys we've already tried
        available_keys = [k for k in prioritized_keys if k["keyIndex"] not in tried_key_indices]
        
        if not available_keys:
            error_msg = f"All {len(self.api_keys)} API keys exhausted or already tried. Last error: Quota exceeded"
            logger.error(error_msg)
            raise Exception(error_msg)
        
        # Use the first available key (highest priority)
        key_info = available_keys[0]
        api_key = key_info["key"]
        key_name = key_info["keyName"]
        current_key_index = key_info["keyIndex"]
        
        tried_key_indices.append(current_key_index)
        
        logger.info(f"🔑 Using {key_name} (key {current_key_index + 1}/{len(self.api_keys)})")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("models/gemini-2.0-flash-001")
        
        # Format angles for prompt
        angles_formatted = "\n".join([f"- {angle}" for angle in angles])
        
        prompt = f"""You are an expert content writer. Write a comprehensive MDX-formatted blog post using multiple perspectives based on the article below. You MUST follow all formatting rules because the output will be parsed programmatically.

Article Title: {article_title}

Article Content:

{article_content}

Primary Topic Angles To Cover (write full sections for each):

{angles_formatted}

REQUIREMENTS:

1. Create an engaging blog title (max 80 characters).

2. Write a detailed blog post (900-1300 words) with the following structure:

   - Start with a "Quick Take" summary block at the very top using MDX blockquote format (> **Quick Take:** ...). This should be a concise 1-2 sentence summary that captures the essence of the article and key angles.

   - A compelling introduction that hooks the reader

   - Multiple clearly separated angle sections. For EACH angle above, create its OWN section using an MDX H2 heading (##) that contains the full angle text. Example: "## Economic Reality Angle: Job Displacement & Value Creation"

   - Provide analysis, reasoning, and examples in each angle section

   - Use lists or bullet points when useful

   - A concluding section that unifies all perspectives into a clear takeaway

3. Write in valid MDX only (no code blocks, no backticks).

4. Escape ALL double quotes in the "content" value.

5. Generate 3-5 relevant tags dynamically based on the article content. Tags should reflect key themes, topics, technologies, industries, or concepts mentioned in the article (e.g., AI, ethics, environment, economics, technology, innovation, etc.). Make tags specific and relevant to the article content.

6. Output MUST be strictly raw JSON ONLY, following this structure exactly:

{{
  "title": "Blog Title Here",
  "content": "MDX formatted article with escaped quotes. Use \\n for line breaks.",
  "tags": ["tag1","tag2","tag3"]
}}

ADDITIONAL RULES:

- Output exactly ONE JSON object.
- No explanations.
- No text outside the JSON.
- No additional fields or keys beyond title, content, and tags.
- No trailing commas.
- No unescaped line breaks; use \\n inside JSON string values.
- No smart quotes; use standard ASCII quotes only."""
        
        try:
            logger.info(f"Generating blog - Article: {article_title[:50]}...")
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Parse JSON from response
            json_match = None
            if "{" in response_text and "}" in response_text:
                json_start = response_text.find("{")
                json_end = response_text.rfind("}") + 1
                json_match = response_text[json_start:json_end]
            
            if json_match:
                parsed = json.loads(json_match)
            else:
                parsed = json.loads(response_text)
            
            # Validate and clean
            title = parsed.get("title", article_title)
            content = parsed.get("content", f"# {title}\n\n{article_content}")
            tags = parsed.get("tags", [])
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",")]
            tags = tags[:5]  # Limit to 5 tags
            
            logger.info(f"Blog generated successfully - Title: {title[:50]}...")
            return {
                "title": title,
                "content": content,
                "tags": tags
            }
        
        except Exception as e:
            error_str = str(e)
            logger.error(f"Error generating blog with API key {current_key_index + 1}: {error_str}")
            
            # Check if it's a quota/rate limit error (429)
            is_quota_error = "429" in error_str or "quota" in error_str.lower() or "rate limit" in error_str.lower()
            
            if is_quota_error:
                logger.warning(f"API key {current_key_index + 1} exhausted (quota/rate limit)")
                
                # Extract retry delay from error message if available
                retry_delay_seconds = None
                retry_match = re.search(r"Please retry in ([\d.]+)s", error_str)
                if retry_match:
                    retry_delay_seconds = int(float(retry_match.group(1))) + 60  # Add 60s buffer
                else:
                    retry_delay_seconds = 24 * 60 * 60  # Default: 24 hours
                
                # Mark key as exhausted in database (if db is available)
                try:
                    # key_name was already set when we selected the key
                    if self.db:
                        self.db.mark_key_as_exhausted(key_name, error_str, retry_delay_seconds)
                except Exception as db_error:
                    logger.warning(f"Failed to mark key as exhausted in database: {db_error}")
            
            # Try next available API key if not all tried
            prioritized_keys = self.get_prioritized_api_keys()
            available_keys = [k for k in prioritized_keys if k["keyIndex"] not in tried_key_indices]
            
            if available_keys:
                logger.info(f"Retrying with next available API key ({len(available_keys)} keys remaining)")
                return self.generate_blog_from_article(article_title, article_content, angles, tried_key_indices)
            
            # All keys exhausted - raise with descriptive error
            error_msg = f"All {len(self.api_keys)} API keys exhausted. Last error: {error_str}"
            logger.error(error_msg)
            raise Exception(error_msg)


def process_step1(post: Dict[str, Any], db: Database, article_fetcher: ArticleFetcher) -> bool:
    """
    Process Step 1: Fetch article.
    Returns True if successful, False otherwise.
    """
    post_id = post["_id"]
    meta = post.get("meta", {})
    topics = meta.get("topics", [])
    campaign_id = meta.get("campaignId")
    
    logger.info(f"Post {post_id}: Starting Step 1 - Fetching article for topics: {topics}")
    
    try:
        article = article_fetcher.fetch_article_for_topics(topics, campaign_id, db)
        
        if not article:
            error_msg = f"No articles found for topics: {topics}"
            retry_count = meta.get("step1RetryCount", 0) + 1
            db.mark_step1_error(post_id, error_msg, retry_count)
            return False
        
        # Store article and mark complete
        db.mark_step1_complete(post_id, article)
        logger.info(f"Post {post_id}: Step 1 completed - Article: {article['title'][:50]}...")
        return True
    
    except Exception as e:
        error_msg = str(e)
        retry_count = meta.get("step1RetryCount", 0) + 1
        db.mark_step1_error(post_id, error_msg, retry_count)
        logger.error(f"Post {post_id}: Step 1 failed - {error_msg}")
        return False


def process_step2(post: Dict[str, Any], db: Database, blog_generator: BlogGenerator) -> bool:
    """
    Process Step 2: Generate blog.
    Returns True if successful, False otherwise.
    """
    post_id = post["_id"]
    meta = post.get("meta", {})
    article = meta.get("article")
    angles = meta.get("angles", [])
    campaign_id = meta.get("campaignId")
    day = meta.get("day")
    
    if not article:
        error_msg = "Article data missing - Step 1 must complete first"
        retry_count = meta.get("step2RetryCount", 0) + 1
        db.mark_step2_error(post_id, error_msg, retry_count)
        return False
    
    logger.info(f"Post {post_id}: Starting Step 2 - Generating blog with {len(angles)} angles")
    
    try:
        blog = blog_generator.generate_blog_from_article(
            article["title"],
            article["content"],
            angles
        )
        
        # Add source article info
        blog["sourceArticle"] = article
        blog["generatedAt"] = datetime.utcnow().isoformat()
        
        # Store blog and mark complete
        db.mark_step2_complete(post_id, blog, campaign_id, day)
        logger.info(f"Post {post_id}: Step 2 completed - Blog: {blog['title'][:50]}...")
        return True
    
    except Exception as e:
        error_msg = str(e)
        retry_count = meta.get("step2RetryCount", 0) + 1
        db.mark_step2_error(post_id, error_msg, retry_count)
        logger.error(f"Post {post_id}: Step 2 failed - {error_msg}")
        return False


def process_post(post: Dict[str, Any], db: Database, article_fetcher: ArticleFetcher, blog_generator: BlogGenerator):
    """Process a single post through Steps 1 & 2"""
    post_id = post["_id"]
    meta = post.get("meta", {})
    
    logger.info(f"Processing post {post_id}")
    
    # Step 1: Fetch article
    if not meta.get("step1Completed"):
        # Claim post for Step 1
        if not db.claim_post_for_step1(post_id):
            logger.warning(f"Post {post_id}: Could not claim for Step 1 (may be in progress)")
            return
        
        success = process_step1(post, db, article_fetcher)
        if not success:
            return  # Error already logged and stored
        
        # Re-fetch post to get updated meta
        post = db.scheduled_posts.find_one({"_id": post_id})
        if not post:
            logger.error(f"Post {post_id}: Not found after Step 1")
            return
        meta = post.get("meta", {})
    
    # Step 2: Generate blog
    if not meta.get("step2Completed"):
        # Claim post for Step 2
        if not db.claim_post_for_step2(post_id):
            logger.warning(f"Post {post_id}: Could not claim for Step 2 (may be in progress)")
            return
        
        process_step2(post, db, blog_generator)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Blog News Python Worker - Steps 1 & 2")
    parser.add_argument("--post-id", help="Process a specific post ID (for debugging)")
    args = parser.parse_args()
    
    # Validate configuration
    if not DATABASE_URL:
        logger.error("DATABASE_URL not configured")
        sys.exit(1)
    
    if not GEMINI_API_KEYS:
        logger.error("No GEMINI_API_KEY configured")
        sys.exit(1)
    
    if not TEST_MODE:
        if not OLIVEDRIFT_API_KEY:
            logger.error("OLIVEDRIFT_API_KEY not configured (required for production)")
            sys.exit(1)
        if not OLIVEDRIFT_BASE_URL:
            logger.error("OLIVEDRIFT_BASE_URL not configured (required for production)")
            sys.exit(1)
    
    # Initialize components
    db = Database(DATABASE_URL)
    article_fetcher = ArticleFetcher(OLIVEDRIFT_API_KEY, OLIVEDRIFT_BASE_URL, TEST_MODE)
    blog_generator = BlogGenerator(GEMINI_API_KEYS, TEST_MODE, db)  # Pass db for marking exhausted keys
    
    if args.post_id:
        # Process single post
        post = db.scheduled_posts.find_one({"_id": args.post_id})
        if not post:
            logger.error(f"Post {args.post_id} not found")
            sys.exit(1)
        
        process_post(post, db, article_fetcher, blog_generator)
    else:
        # Process all pending posts
        pending_posts = db.find_pending_posts()
        
        if not pending_posts:
            logger.info("No pending posts to process")
            return
        
        logger.info(f"Processing {len(pending_posts)} posts")
        
        for post in pending_posts:
            try:
                process_post(post, db, article_fetcher, blog_generator)
            except Exception as e:
                logger.error(f"Error processing post {post.get('_id')}: {e}", exc_info=True)
        
        logger.info("Processing complete")


if __name__ == "__main__":
    main()
