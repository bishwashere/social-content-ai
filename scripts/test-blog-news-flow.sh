#!/bin/bash
# Simple End-to-End Test for Blog News Flow
# Tests actual Python cron and Next.js cron execution

set -e

echo "🚀 Starting Blog News Flow Test"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

test_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASSED:${NC} $1"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED:${NC} $1"
        ((FAILED++))
        return 1
    fi
}

# Test 1: Check if Python app can connect to DB
echo "🧪 Test 1: Python DB Connection"
cd python-app
python3 -c "
from main import Database
import os
from dotenv import load_dotenv
load_dotenv()
db = Database(os.getenv('DATABASE_URL', ''))
print('Connected to database:', db.db.name)
" 2>&1
test_result "Python DB Connection"

# Test 2: Run Python cron (Steps 1 & 2)
echo ""
echo "🧪 Test 2: Run Python Cron (Steps 1 & 2)"
python3 main.py 2>&1 | tail -20
test_result "Python Cron Execution"

# Test 3: Check if posts were processed
echo ""
echo "🧪 Test 3: Check Python Processing Results"
python3 -c "
from main import Database
import os
from dotenv import load_dotenv
load_dotenv()
db = Database(os.getenv('DATABASE_URL', ''))
posts = list(db.scheduled_posts.find({'meta.type': 'blog-news'}))
step1_completed = [p for p in posts if p.get('meta', {}).get('step1Completed')]
step2_completed = [p for p in posts if p.get('meta', {}).get('step2Completed')]
with_blog = [p for p in step2_completed if p.get('meta', {}).get('blog')]
print(f'Total blog-news posts: {len(posts)}')
print(f'Step 1 completed: {len(step1_completed)}')
print(f'Step 2 completed: {len(step2_completed)}')
print(f'With blog in meta: {len(with_blog)}')
if len(step2_completed) == 0:
    exit(1)
" 2>&1
test_result "Python Processing Results"

# Test 4: Check CampaignChat updates
echo ""
echo "🧪 Test 4: Check CampaignChat Updates"
python3 -c "
from main import Database
import os
from dotenv import load_dotenv
load_dotenv()
db = Database(os.getenv('DATABASE_URL', ''))
chats = list(db.campaign_chats.find({}))
chats_with_blog = [c for c in chats if c.get('contents', {}).get('blog')]
print(f'Total CampaignChats: {len(chats)}')
print(f'Chats with blog: {len(chats_with_blog)}')
if len(chats_with_blog) == 0:
    print('WARNING: No CampaignChat entries have blog content')
    exit(1)
" 2>&1
test_result "CampaignChat Updates"

# Test 5: Run Next.js cron (Steps 3 & 4)
echo ""
echo "🧪 Test 5: Run Next.js Cron (Steps 3 & 4)"
cd ..
curl -s http://localhost:3000/api/post 2>&1 | head -50
test_result "Next.js Cron Execution"

# Test 6: Check Next.js processing results
echo ""
echo "🧪 Test 6: Check Next.js Processing Results"
cd python-app
python3 -c "
from main import Database
import os
from dotenv import load_dotenv
load_dotenv()
db = Database(os.getenv('DATABASE_URL', ''))
posts = list(db.scheduled_posts.find({'meta.type': 'blog-news'}))
step3_completed = [p for p in posts if p.get('meta', {}).get('step3Completed')]
step4_completed = [p for p in posts if p.get('meta', {}).get('step4Completed')]
webhook_sent = [p for p in posts if p.get('meta', {}).get('webhookSent')]
has_article_url = [p for p in posts if p.get('meta', {}).get('articleUrl')]
print(f'Total blog-news posts: {len(posts)}')
print(f'Step 3 completed: {len(step3_completed)}')
print(f'Step 4 completed: {len(step4_completed)}')
print(f'Webhook sent: {len(webhook_sent)}')
print(f'Has article URL: {len(has_article_url)}')
" 2>&1
test_result "Next.js Processing Results"

# Test 7: Check duplicate detection
echo ""
echo "🧪 Test 7: Check Duplicate Detection"
python3 -c "
from main import Database
import os
from dotenv import load_dotenv
load_dotenv()
db = Database(os.getenv('DATABASE_URL', ''))
posts = list(db.scheduled_posts.find({'meta.type': 'blog-news'}))
article_ids = [p.get('meta', {}).get('articleId') for p in posts if p.get('meta', {}).get('articleId')]
unique_ids = set(article_ids)
print(f'Posts with articleId: {len(article_ids)}')
print(f'Unique articleIds: {len(unique_ids)}')
if len(article_ids) > len(unique_ids):
    print('WARNING: Duplicate articleIds detected!')
    exit(1)
" 2>&1
test_result "Duplicate Detection"

# Test 8: Check exhausted keys
echo ""
echo "🧪 Test 8: Check Exhausted Keys Tracking"
python3 -c "
from main import Database
import os
from dotenv import load_dotenv
load_dotenv()
db = Database(os.getenv('DATABASE_URL', ''))
exhausted = list(db.gemini_key_states.find({'exhausted': True}))
print(f'Exhausted keys tracked: {len(exhausted)}')
for key in exhausted[:3]:
    print(f'  - {key.get(\"keyName\")}: exhausted at {key.get(\"exhaustedAt\")}')
" 2>&1
test_result "Exhausted Keys Tracking"

# Test 9: Check step status flags
echo ""
echo "🧪 Test 9: Check Step Status Flags"
python3 -c "
from main import Database
import os
from dotenv import load_dotenv
load_dotenv()
db = Database(os.getenv('DATABASE_URL', ''))
posts = list(db.scheduled_posts.find({'meta.type': 'blog-news'}))[:5]
print(f'Checking {len(posts)} posts:')
for p in posts:
    meta = p.get('meta', {})
    print(f'  Post {str(p[\"_id\"])[:8]}:')
    print(f'    Step1: completed={meta.get(\"step1Completed\")}, inProgress={meta.get(\"step1InProgress\")}')
    print(f'    Step2: completed={meta.get(\"step2Completed\")}, inProgress={meta.get(\"step2InProgress\")}')
    print(f'    Step3: completed={meta.get(\"step3Completed\")}, inProgress={meta.get(\"step3InProgress\")}')
    print(f'    Step4: completed={meta.get(\"step4Completed\")}, inProgress={meta.get(\"step4InProgress\")}')
" 2>&1
test_result "Step Status Flags"

# Test 10: Check webhook/published link conditional display
echo ""
echo "🧪 Test 10: Check Webhook/Published Link Conditional Display"
python3 -c "
from main import Database
import os
from dotenv import load_dotenv
load_dotenv()
db = Database(os.getenv('DATABASE_URL', ''))
posts = list(db.scheduled_posts.find({'meta.type': 'blog-news'}))
all_complete = [p for p in posts if all([
    p.get('meta', {}).get('step1Completed'),
    p.get('meta', {}).get('step2Completed'),
    p.get('meta', {}).get('step3Completed'),
    p.get('meta', {}).get('step4Completed')
])]
invalid = [p for p in posts if (p.get('meta', {}).get('webhookSent') or p.get('meta', {}).get('articleUrl')) and not all([
    p.get('meta', {}).get('step1Completed'),
    p.get('meta', {}).get('step2Completed'),
    p.get('meta', {}).get('step3Completed'),
    p.get('meta', {}).get('step4Completed')
])]
print(f'Total posts: {len(posts)}')
print(f'All steps complete: {len(all_complete)}')
print(f'Invalid state (webhook/URL without all steps): {len(invalid)}')
if len(invalid) > 0:
    print('ERROR: Found posts with webhook/URL but not all steps complete!')
    exit(1)
" 2>&1
test_result "Webhook/Published Link Conditional Display"

# Summary
echo ""
echo "============================================================"
echo "📊 Test Results Summary:"
echo "   ✅ Passed: $PASSED"
echo "   ❌ Failed: $FAILED"
echo "   📈 Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review above.${NC}"
    exit 1
fi
