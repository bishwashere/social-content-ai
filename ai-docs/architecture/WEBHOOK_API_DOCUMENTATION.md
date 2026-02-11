# Blog News Webhook API Documentation

## Endpoint
Your webhook URL (configured in the Blog News campaign)

## HTTP Method
`POST`

## Headers
```
Content-Type: application/json
```

## Request Timeout
10 seconds

## Payload Structure

The webhook receives a JSON payload with the following structure:

```json
{
  "day": 1,
  "blog": {
    "title": "Article Title Here",
    "content": "MDX formatted article content with proper headings, paragraphs, and lists...",
    "tags": ["tag1", "tag2", "tag3"]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Field Descriptions

### Root Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `day` | `number` | The day number in the campaign (1, 2, 3, etc.) |
| `blog` | `object` | The generated blog content |
| `timestamp` | `string` | ISO 8601 timestamp when the blog was generated |

### Blog Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | The generated blog article title (max 80 characters) |
| `content` | `string` | The full blog article content in MDX format |
| `tags` | `string[]` | Array of 3-5 relevant tags |

## Example Payload

```json
{
  "day": 5,
  "blog": {
    "title": "The Hidden Impact of AI on Startup Culture",
    "content": "# The Hidden Impact of AI on Startup Culture\n\nIn recent years, artificial intelligence has fundamentally transformed how startups operate...\n\n## Key Takeaways\n\n- AI is reshaping startup workflows\n- Early adoption provides competitive advantages\n- Cultural shifts are inevitable",
    "tags": ["AI", "startups", "technology", "innovation"]
  },
  "timestamp": "2024-01-15T14:30:45.123Z"
}
```

## Response Expectations

### Success Response
Your webhook should return an HTTP status code between `200` and `299` (inclusive) for the request to be considered successful.

**Example:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Blog received successfully"
}
```

### Error Handling
- If your webhook returns a status code outside the 200-299 range, it will be marked as failed
- If your webhook doesn't respond within 10 seconds, the request will timeout and be marked as failed
- Network errors will also be marked as failed
- **Note:** Even if the webhook fails, the blog is still saved in the system and can be retried using the "Retry Webhook" button

## Retry Mechanism

If the webhook fails initially:
1. The blog is still saved in the system
2. A "Retry Webhook" button appears in the UI below the blog
3. Users can manually retry sending to the webhook
4. The webhook status is tracked and displayed in the UI

## Content Format

### Blog Content
The `blog.content` field contains MDX (Markdown Extended) formatted text with:
- Headings (`#`, `##`, `###`)
- Paragraphs
- Lists (ordered and unordered)
- Bold and italic text
- Links
- Other standard Markdown syntax

### Tags
Tags are provided as an array of strings, typically 3-5 tags related to the blog content.

## Security Considerations

1. **HTTPS Recommended**: Use HTTPS endpoints for webhook URLs to ensure secure transmission
2. **Authentication**: Consider implementing authentication (API keys, tokens, etc.) in your webhook endpoint
3. **Validation**: Validate the incoming payload structure before processing
4. **Rate Limiting**: Be aware that multiple campaigns or retries may send multiple requests

## Testing

You can test your webhook endpoint using tools like:
- [webhook.site](https://webhook.site) - Temporary webhook testing
- [Postman](https://www.postman.com/) - API testing tool
- [curl](https://curl.se/) - Command-line tool

Example curl command:
```bash
curl -X POST https://your-webhook-url.com/endpoint \
  -H "Content-Type: application/json" \
  -d '{
    "day": 1,
    "blog": {
      "title": "Test Blog Title",
      "content": "# Test Content\n\nThis is a test blog post.",
      "tags": ["test", "example"],
      "sourceArticle": {
        "title": "Test Source",
        "content": "Test source content",
        "source": "reddit",
        "url": "https://example.com",
        "articleId": "test123"
      }
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }'
```

