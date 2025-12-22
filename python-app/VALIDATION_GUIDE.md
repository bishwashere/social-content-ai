# Query Validation Guide

## What the Validation Script Does

The `validate_query.py` script tests whether the updated query in `main.py` can correctly find posts that are stuck at Step 2.

## Expected Post State

Based on your description:
- **Platform**: `webhook`
- **Status**: `processing`
- **Scheduled For**: Dec 21, 11:00 AM
- **Step 1**: ✅ Completed (shown in UI)
- **Step 2**: ❌ Not completed (shown in UI)
- **Step 3**: ❌ Not completed
- **Step 4**: ❌ Not completed

## What the Query Should Find

The query in `find_pending_posts()` should find posts where:
1. `platform = "webhook"`
2. `meta.type = "blog-news"`
3. `status IN ["pending", "processing"]`
4. **AND** one of:
   - **Option A**: Needs Step 1 (`step1Completed != true`)
   - **Option B**: Needs Step 2 (`step1Completed = true AND step2Completed != true`)

## Running the Validation

On your server:

```bash
cd ~/social-content-ai
source python-app/venv/bin/activate
python3 python-app/validate_query.py
```

## Expected Output

### ✅ Success Case:
```
✅ Found 1 posts matching exact criteria
✅ Query found 1 posts
✅ SUCCESS: All 1 exact matches found by query!
✅ VALIDATION PASSED: Query successfully finds all stuck posts!
```

### ❌ Failure Case:
If the query doesn't find the post, the script will show:
- Why the post doesn't match
- What conditions are failing
- Suggestions for fixing

## Common Issues

1. **Date hasn't passed**: If the scheduled date is in the future, the query won't find it (by design)
2. **Step 2 in progress**: If `step2InProgress = true`, the query skips it (to avoid race conditions)
3. **Status mismatch**: If status is not "pending" or "processing", it won't be found

## Next Steps After Validation

1. If validation passes: The cron job should start processing stuck posts automatically
2. If validation fails: Check the output for specific reasons and we can adjust the query

