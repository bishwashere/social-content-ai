# Quick Test Guide

## Fast Testing Steps

### 1. Enable Test Mode

Add to root `.env`:
```env
TEST_MODE=true
```

### 2. Setup Test Data

```bash
cd python-app
python test_setup.py
```

This creates posts scheduled for 1-2 minutes from now.

### 3. Wait & Run Python App

Wait 65 seconds, then:

```bash
python main.py
```

Or set up a cron to run every minute:
```bash
* * * * * cd /path/to/social-content-ai && python python-app/main.py
```

### 4. Check Status

```bash
python check_status.py
```

### 5. Test Steps 3 & 4

Once Step 2 is complete, test via Next.js:

```bash
# Get post ID from check_status.py output, then:
curl -X POST http://localhost:3000/api/blog/step-3-send-webhook \
  -H "Content-Type: application/json" \
  -d '{"postId": "YOUR_POST_ID"}'

curl -X POST http://localhost:3000/api/blog/step-4-finalize \
  -H "Content-Type: application/json" \
  -d '{"postId": "YOUR_POST_ID"}'
```

Or use the cron endpoint:
```bash
curl http://localhost:3000/api/post
```

## All-in-One Test Script

```bash
cd python-app
./test_flow.sh
```

This runs everything automatically (except Steps 3 & 4 which need manual API calls).
