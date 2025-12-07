# Blog News State Machine

## Overview

The Blog News auto-post system uses a state machine to track progress through 4 steps:
- **Step 1**: Fetch Article (Python app)
- **Step 2**: Generate Blog (Python app)
- **Step 3**: Send Webhook (Next.js app)
- **Step 4**: Create Platform Posts (Next.js app)

## State Diagram

```
┌─────────┐
│ pending │  (Initial state)
└────┬────┘
     │
     │ Python app picks up
     ↓
┌─────────────────────┐
│ processing          │  (Step 1 in progress)
│ step1InProgress=true │
└────┬────────────────┘
     │
     │ Step 1 completes
     ↓
┌─────────────────────┐
│ processing          │  (Step 2 in progress)
│ step1Completed=true  │
│ step2InProgress=true │
└────┬────────────────┘
     │
     │ Step 2 completes
     ↓
┌─────────────────────┐
│ processing          │  (Ready for Step 3)
│ step1Completed=true  │
│ step2Completed=true  │
│ step3Completed=false │
└────┬────────────────┘
     │
     │ Next.js cron picks up
     ↓
┌─────────────────────┐
│ processing          │  (Step 3 in progress)
│ step3InProgress=true │
└────┬────────────────┘
     │
     │ Step 3 completes
     ↓
┌─────────────────────┐
│ processing          │  (Ready for Step 4)
│ step3Completed=true  │
│ step4Completed=false │
└────┬────────────────┘
     │
     │ Next.js cron picks up
     ↓
┌─────────────────────┐
│ processing          │  (Step 4 in progress)
│ step4InProgress=true │
└────┬────────────────┘
     │
     │ Step 4 completes
     ↓
┌─────────┐
│ success │  (All steps complete)
└─────────┘

     │
     │ (Any step fails permanently)
     ↓
┌─────────┐
│ error   │  (Terminal error state)
└─────────┘
```

## State Definitions

### `pending`
- **Description**: Initial state when post is created
- **Conditions**:
  - `status = "pending"`
  - `step1Completed = false`
  - `step2Completed = false`
  - `step3Completed = false`
  - `step4Completed = false`
- **Next States**: `processing` (when Python app picks it up)

### `processing` (Step 1)
- **Description**: Python app is fetching article
- **Conditions**:
  - `status = "processing"`
  - `step1InProgress = true`
  - `step1Completed = false`
- **Next States**: 
  - `processing` (Step 2) if Step 1 succeeds
  - `error` if Step 1 fails permanently

### `processing` (Step 2)
- **Description**: Python app is generating blog
- **Conditions**:
  - `status = "processing"`
  - `step1Completed = true`
  - `step2InProgress = true`
  - `step2Completed = false`
- **Next States**:
  - `processing` (Ready for Step 3) if Step 2 succeeds
  - `error` if Step 2 fails permanently

### `processing` (Ready for Step 3)
- **Description**: Steps 1 & 2 complete, waiting for Next.js to process Step 3
- **Conditions**:
  - `status = "processing"`
  - `step1Completed = true`
  - `step2Completed = true`
  - `step3Completed = false`
  - `step3InProgress = false`
- **Next States**: `processing` (Step 3) when Next.js cron picks it up

### `processing` (Step 3)
- **Description**: Next.js app is sending webhook
- **Conditions**:
  - `status = "processing"`
  - `step3InProgress = true`
  - `step3Completed = false`
- **Next States**:
  - `processing` (Ready for Step 4) if Step 3 succeeds
  - `error` if Step 3 fails permanently

### `processing` (Ready for Step 4)
- **Description**: Step 3 complete, waiting for Next.js to process Step 4
- **Conditions**:
  - `status = "processing"`
  - `step3Completed = true`
  - `step4Completed = false`
  - `step4InProgress = false`
- **Next States**: `processing` (Step 4) when Next.js cron picks it up

### `processing` (Step 4)
- **Description**: Next.js app is creating platform posts
- **Conditions**:
  - `status = "processing"`
  - `step4InProgress = true`
  - `step4Completed = false`
- **Next States**:
  - `success` if Step 4 succeeds
  - `error` if Step 4 fails permanently

### `success`
- **Description**: All steps completed successfully
- **Conditions**:
  - `status = "success"`
  - `step1Completed = true`
  - `step2Completed = true`
  - `step3Completed = true`
  - `step4Completed = true`
- **Next States**: None (terminal state)

### `error`
- **Description**: Terminal error state (requires manual intervention)
- **Conditions**:
  - `status = "error"`
  - `stepXError` set (where X is the failed step)
  - `stepXRetryCount >= MAX_RETRIES`
- **Next States**: None (terminal state, requires manual reset)

## State Transitions Rules

### Forward-Only Transitions
- States can only move **forward** in the pipeline
- Never move backwards (e.g., `step2Completed` never becomes `false` once `true`)
- Exception: Manual reset for error states

### Atomic Claims
- Each step uses atomic database operations to claim a post
- Only one worker can claim a post at a time
- Uses `stepXInProgress` flags to prevent race conditions

### Error Handling
- Temporary errors: Increment `stepXRetryCount`, keep `status = "processing"`
- Permanent errors: Set `status = "error"`, set `stepXError`
- Retry logic: Each step can retry up to `MAX_RETRIES` times

## Database Schema

### ScheduledPost.meta Structure

```json
{
  "type": "blog-news",
  "campaignId": "...",
  "day": 1,
  "topics": ["AI"],
  "angles": ["Economic"],
  "webhook": "https://...",
  "platforms": ["twitter"],
  
  // Step 1 state
  "article": {...},
  "step1Completed": true/false,
  "step1CompletedAt": "ISO date",
  "step1InProgress": true/false,
  "step1StartedAt": "ISO date",
  "step1Error": null | "error message",
  "step1RetryCount": 0,
  
  // Step 2 state
  "blog": {...},
  "step2Completed": true/false,
  "step2CompletedAt": "ISO date",
  "step2InProgress": true/false,
  "step2StartedAt": "ISO date",
  "step2Error": null | "error message",
  "step2RetryCount": 0,
  
  // Step 3 state
  "articleUrl": "...",
  "webhookSent": true/false,
  "step3Completed": true/false,
  "step3CompletedAt": "ISO date",
  "step3InProgress": true/false,
  "step3StartedAt": "ISO date",
  "step3Error": null | "error message",
  "step3RetryCount": 0,
  
  // Step 4 state
  "step4Completed": true/false,
  "step4CompletedAt": "ISO date",
  "step4InProgress": true/false,
  "step4StartedAt": "ISO date",
  "step4Error": null | "error message",
  "step4RetryCount": 0,
  "platformPosts": [...]
}
```

## Allowed State Combinations

| Status | step1Completed | step2Completed | step3Completed | step4Completed | Description |
|--------|----------------|----------------|----------------|----------------|-------------|
| pending | false | false | false | false | Initial state |
| processing | false | false | false | false | Step 1 in progress |
| processing | true | false | false | false | Step 2 in progress |
| processing | true | true | false | false | Ready for Step 3 |
| processing | true | true | false | false | Step 3 in progress |
| processing | true | true | true | false | Ready for Step 4 |
| processing | true | true | true | false | Step 4 in progress |
| success | true | true | true | true | All complete |
| error | * | * | * | * | Terminal error |

## Implementation Notes

### Python App (Steps 1 & 2)
- Only processes posts where `step1Completed = false` or `step2Completed = false`
- Uses atomic `claim_post_for_step1()` and `claim_post_for_step2()` operations
- Sets `stepXInProgress = true` before processing
- Sets `stepXInProgress = false` after completion or error

### Next.js App (Steps 3 & 4)
- Only processes posts where previous step is completed
- Uses atomic `updateMany` with conditions to claim posts
- Sets `stepXInProgress = true` before processing
- Sets `stepXInProgress = false` after completion or error
- Triggers next step via cron (not HTTP chain)

### Idempotency
- Each step checks `stepXCompleted` before processing
- Steps are idempotent: safe to re-run if already completed
- Atomic claims prevent double-processing

### Error Recovery
- Retry logic: Each step can retry up to `MAX_RETRIES` times
- Terminal errors: Set `status = "error"` after max retries
- Manual intervention: Error states require manual reset
