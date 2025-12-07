#!/bin/bash
# Test Flow Script
# Runs the complete test flow

echo "🧪 Blog News Test Flow"
echo "======================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo -e "${RED}❌ .env file not found in root directory${NC}"
    exit 1
fi

# Check if TEST_MODE is set
if ! grep -q "TEST_MODE=true" ../.env; then
    echo -e "${YELLOW}⚠️  TEST_MODE not set in .env. Adding it...${NC}"
    echo "" >> ../.env
    echo "# Test mode - set to false for production" >> ../.env
    echo "TEST_MODE=true" >> ../.env
fi

echo -e "${GREEN}✅ Environment configured${NC}"

# Step 1: Setup test data
echo ""
echo "📊 Step 1: Setting up test data..."
python test_setup.py

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to setup test data${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Test data setup complete${NC}"

# Step 2: Wait for scheduled time
echo ""
echo "⏳ Waiting 65 seconds for posts to be ready..."
sleep 65

# Step 3: Run Python app
echo ""
echo "🐍 Step 2: Running Python app (Steps 1 & 2)..."
python main.py

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Python app failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Python app completed${NC}"

# Step 4: Get post ID from database (simplified - you may need to adjust)
echo ""
echo "📝 Step 3: Testing Next.js Steps 3 & 4..."
echo -e "${YELLOW}⚠️  You need to manually get the post ID and test Steps 3 & 4${NC}"
echo ""
echo "To test Steps 3 & 4, run:"
echo "  curl -X POST http://localhost:3000/api/blog/step-3-send-webhook \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"postId\": \"YOUR_POST_ID\"}'"
echo ""
echo "Or use the cron endpoint:"
echo "  curl http://localhost:3000/api/post"

echo ""
echo -e "${GREEN}✅ Test flow complete!${NC}"
