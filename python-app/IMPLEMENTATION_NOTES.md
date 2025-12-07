# Implementation Notes

## TODO: Complete These Implementations

### 1. Olive Drift API Integration

The `ArticleFetcher` class has placeholder methods that need to be implemented:

- `fetch_reddit_posts(topics, limit)` - Replace with actual Olive Drift API call
- `fetch_hackernews_posts(topics, limit)` - Replace with actual Olive Drift API call

**Current placeholder:**
```python
def fetch_reddit_posts(self, topics: List[str], limit: int = 3) -> List[Dict[str, Any]]:
    # TODO: Implement actual Olive Drift API call
    logger.warning("fetch_reddit_posts: Placeholder implementation - needs actual API call")
    return []
```

**Expected implementation:**
```python
def fetch_reddit_posts(self, topics: List[str], limit: int = 3) -> List[Dict[str, Any]]:
    """Fetch Reddit posts via Olive Drift API"""
    headers = {
        "Authorization": f"Bearer {self.api_key}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(
        f"{self.api_url}/reddit/posts",
        json={"topics": topics, "limit": limit},
        headers=headers,
        timeout=10
    )
    response.raise_for_status()
    return response.json().get("posts", [])
```

### 2. Database Connection String

The `DATABASE_URL` environment variable should be in MongoDB connection string format:

```
mongodb://username:password@host:port/database_name?authSource=admin
```

Or for local development:
```
mongodb://localhost:27017/social-content-ai
```

### 3. MongoDB Query Syntax

The current implementation uses MongoDB query syntax. If you're using Prisma with MongoDB, you may need to adjust the queries to match Prisma's MongoDB adapter syntax.

**Note**: The `updateMany` operations for atomic claims may need adjustment based on your Prisma MongoDB setup.

### 4. Error Handling

Consider adding:
- Retry logic with exponential backoff
- Dead letter queue for permanently failed posts
- Alerting/monitoring for error states

### 5. Logging

The current logging writes to both console and file. Consider:
- Structured logging (JSON format)
- Log rotation
- Integration with logging services (e.g., Datadog, CloudWatch)

### 6. Testing

Add unit tests for:
- Database operations
- Article fetching
- Blog generation
- State machine transitions

### 7. Monitoring

Add metrics for:
- Posts processed per run
- Step 1/2 success/failure rates
- Average processing time per step
- Retry counts

### 8. Deployment

For production deployment:
- Use a process manager (e.g., systemd, supervisor)
- Set up proper cron scheduling
- Configure log rotation
- Add health checks
- Set up alerts for failures

## Running the Python App

### Development

```bash
cd python-app
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python main.py
```

### Production (Cron)

```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * cd /path/to/python-app && /path/to/venv/bin/python main.py >> /var/log/blog-news-worker.log 2>&1
```

### Debug Single Post

```bash
python main.py --post-id <post-id>
```

## Integration with Next.js

The Python app and Next.js app work independently:

1. **Python app** (cron): Processes Steps 1 & 2
   - Finds posts where `step1Completed = false`
   - Processes them and sets `step2Completed = true`

2. **Next.js app** (cron): Processes Steps 3 & 4
   - Finds posts where `step2Completed = true` and `step3Completed = false`
   - Processes Step 3, then Step 4

Both apps read/write to the same database, using the state machine flags to coordinate.

## State Machine Validation

To validate the state machine is working correctly:

1. Check database for posts in each state
2. Verify no posts are stuck in `stepXInProgress = true` for > 30 minutes
3. Monitor error rates and retry counts
4. Verify forward-only transitions (no backwards state changes)

## Troubleshooting

### Posts stuck in `processing`

- Check if Python app is running
- Check if Next.js cron is running
- Verify database connectivity
- Check for `stepXInProgress = true` flags that weren't cleared

### Posts in `error` state

- Check `stepXError` field for error message
- Check `stepXRetryCount` to see if max retries exceeded
- Manually reset if needed (set `status = "pending"`, clear error fields)

### Duplicate processing

- Verify atomic claim operations are working
- Check for race conditions in cron scheduling
- Ensure only one Python worker and one Next.js cron instance running
