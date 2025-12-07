# Blog News Python Worker

This Python application handles **Step 1** (Fetch Article) and **Step 2** (Generate Blog) for the Blog News auto-post system.

## Overview

- **Step 1**: Fetches articles from Reddit/HackerNews via Olive Drift API
- **Step 2**: Generates blog content using Google Gemini AI

The Next.js application handles Steps 3 & 4 (webhook and platform posts).

## State Machine

```
pending → processing (Step 1) → processing (Step 2) → ready_for_step3
```

### State Transitions

1. **pending**: Initial state, no steps completed
2. **processing**: Step 1 or Step 2 in progress
   - `step1InProgress = true` OR `step2InProgress = true`
3. **processing** (after Step 2): Ready for Next.js to pick up
   - `step1Completed = true`
   - `step2Completed = true`
   - `step3Completed = false`
4. **error**: Terminal error state (requires manual intervention)
   - `step1Error` or `step2Error` set
   - `status = "error"`

### Allowed State Combinations

- `pending` → `step1Completed = false`, `step2Completed = false`
- `processing` (Python work) → `step1InProgress = true` OR `step2InProgress = true`
- `processing` (after Step 2) → `step1Completed = true`, `step2Completed = true`, `step3Completed = false`
- `error` → `step1Error` OR `step2Error` set, `status = "error"`

## Installation

```bash
cd python-app
pip install -r requirements.txt
```

## Configuration

The Python app reads from the **root `.env` file** (same as Next.js).

Add these variables to your root `.env` file:

```env
# Database
DATABASE_URL=mongodb://localhost:27017/your-database

# Gemini AI (for Step 2 - Blog Generation)
GEMINI_API_KEY=your-key-here
GEMINI_API_KEY_1=backup-key-1
GEMINI_API_KEY_2=backup-key-2

# Olive Drift API (for Step 1 - Article Fetching) - Match Next.js env var names exactly
OLIVEDRIFT_API_KEY=your-key-here
OLIVEDRIFT_BASE_URL=https://api.olivedrift.com

# Retry Configuration
MAX_RETRIES=3
RETRY_DELAY_SECONDS=60

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/blog-news-worker.log

# Test Mode (set to true for testing without real API calls)
TEST_MODE=false
```

## Usage

### Run as Cron Job

```bash
# Run every 5 minutes
*/5 * * * * cd /path/to/python-app && python main.py
```

### Run Manually

```bash
python main.py
```

### Process Single Post (for debugging)

```bash
python main.py --post-id <post-id>
```

## Database Schema

The Python app reads/writes to `ScheduledPost` collection:

```json
{
  "_id": "post-id",
  "status": "processing",
  "platform": "webhook",
  "meta": {
    "type": "blog-news",
    "campaignId": "...",
    "day": 1,
    "topics": ["AI", "Technology"],
    "angles": ["Economic", "Ethical"],
    "webhook": "https://...",
    "platforms": ["twitter", "facebook"],
    
    // Step 1 output
    "article": { "title": "...", "content": "...", "source": "...", "url": "...", "articleId": "..." },
    "step1Completed": true,
    "step1CompletedAt": "...",
    "step1InProgress": false,
    "step1Error": null,
    "step1RetryCount": 0,
    
    // Step 2 output
    "blog": { "title": "...", "content": "...", "tags": [...] },
    "step2Completed": true,
    "step2CompletedAt": "...",
    "step2InProgress": false,
    "step2Error": null,
    "step2RetryCount": 0
  }
}
```

## Idempotency & Race Conditions

- Uses `step1InProgress` and `step2InProgress` flags to prevent double-processing
- Atomic updates ensure only one worker can claim a job
- Steps are idempotent: re-running on completed steps is safe

## Error Handling

- Errors are stored in `meta.step1Error` and `meta.step2Error`
- Retry count tracked in `meta.step1RetryCount` and `meta.step2RetryCount`
- Terminal errors set `status = "error"` (requires manual reset)

## Logging

Logs are written to:
- Console (stdout)
- File: `logs/blog-news-worker.log` (if configured)

Log format:
```
[2024-01-01 12:00:00] [INFO] Processing post abc123 - Step 1 started
[2024-01-01 12:00:05] [INFO] Processing post abc123 - Step 1 completed
[2024-01-01 12:00:10] [ERROR] Processing post abc123 - Step 2 failed: API rate limit
```

## Monitoring

Check post status in database:
- `status = "processing"` + `step2Completed = true` → Ready for Next.js
- `status = "error"` → Needs manual intervention
- `step1RetryCount` or `step2RetryCount > 0` → Retries attempted
