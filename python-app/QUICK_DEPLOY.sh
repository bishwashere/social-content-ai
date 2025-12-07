#!/bin/bash
# Quick Deployment Script for Python Blog News Worker
# Run this on your live server

set -e

echo "🚀 Blog News Python Worker - Quick Deployment"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get project directory
PROJECT_DIR=$(pwd)
if [[ ! -f "package.json" ]]; then
    echo -e "${RED}❌ Error: Must run from project root directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Project directory: $PROJECT_DIR${NC}"

# Step 1: Create virtual environment
echo ""
echo "📦 Step 1: Setting up Python virtual environment..."
cd python-app

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${YELLOW}⏭️  Virtual environment already exists${NC}"
fi

# Step 2: Install dependencies
echo ""
echo "📦 Step 2: Installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 3: Check .env file
echo ""
echo "🔐 Step 3: Checking environment variables..."
cd ..

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found in root directory${NC}"
    echo "Please create .env file with required variables"
    exit 1
fi

# Check required variables
REQUIRED_VARS=("DATABASE_URL" "GEMINI_API_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing required variables: ${MISSING_VARS[*]}${NC}"
    echo "Please add them to .env file"
else
    echo -e "${GREEN}✅ Required environment variables found${NC}"
fi

# Step 4: Test database connection
echo ""
echo "🔌 Step 4: Testing database connection..."
cd python-app
source venv/bin/activate

python -c "
from main import Database
import os
from dotenv import load_dotenv
load_dotenv(dotenv_path='../.env')
try:
    db = Database(os.getenv('DATABASE_URL'))
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
" || exit 1

# Step 5: Create logs directory
echo ""
echo "📝 Step 5: Setting up logs directory..."
mkdir -p logs
chmod 755 logs
echo -e "${GREEN}✅ Logs directory created${NC}"

# Step 6: Test run
echo ""
echo "🧪 Step 6: Running test (dry run)..."
python main.py --help > /dev/null 2>&1 && echo -e "${GREEN}✅ Python app is executable${NC}" || echo -e "${YELLOW}⚠️  Could not test execution${NC}"

# Step 7: Generate cron command
echo ""
echo "⏰ Step 7: Cron setup"
echo "===================="
PYTHON_PATH="$PROJECT_DIR/python-app/venv/bin/python"
MAIN_SCRIPT="$PROJECT_DIR/python-app/main.py"
LOG_FILE="/var/log/blog-news-worker.log"

echo ""
echo "Add this to your crontab (crontab -e):"
echo ""
echo -e "${GREEN}*/5 * * * * cd $PROJECT_DIR && $PYTHON_PATH $MAIN_SCRIPT >> $LOG_FILE 2>&1${NC}"
echo ""
echo "Or for testing (every minute):"
echo -e "${GREEN}* * * * * cd $PROJECT_DIR && $PYTHON_PATH $MAIN_SCRIPT >> $LOG_FILE 2>&1${NC}"

# Step 8: Summary
echo ""
echo "✅ Deployment setup complete!"
echo ""
echo "Next steps:"
echo "1. Ensure TEST_MODE=false in .env (or remove it)"
echo "2. Implement real Olive Drift API calls in main.py"
echo "3. Set up cron job using the command above"
echo "4. Monitor logs: tail -f $LOG_FILE"
echo "5. Check status: cd python-app && source venv/bin/activate && python check_status.py"
