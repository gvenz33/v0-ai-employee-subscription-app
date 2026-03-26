# AI Employee Automation System

This document explains how to set up and use the automation features for your AI employees.

## Overview

The automation system provides three ways to trigger AI tasks:

1. **Manual Submission** - Users submit tasks from the dashboard
2. **Webhook Triggers** - External services call your API to create tasks
3. **Cron Processing** - Background worker processes pending tasks every 5 minutes

## Environment Variables

Add these to your Vercel project:

```env
# Required for cron job authentication
CRON_SECRET=your-random-secret-here

# Required for webhook processing (service role bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## How It Works

### 1. Task Submission Flow

```
User/Webhook → Create Task (status: pending) → Cron Job Picks Up → 
AI Processes → Update Task (status: completed) → User Views Result
```

### 2. Task Statuses

| Status | Description |
|--------|-------------|
| `pending` | Task created, waiting to be processed |
| `processing` | Cron job has picked up the task |
| `completed` | AI has finished and result is available |
| `failed` | An error occurred during processing |

### 3. Priority Levels

- `high` - Processed first (not yet implemented, for future use)
- `normal` - Default priority
- `low` - Processed last (not yet implemented, for future use)

## Webhook API

### Endpoint

```
POST /api/webhooks/trigger
```

### Authentication

Include your API key in the Authorization header:

```
Authorization: Bearer ak_your_api_key_here
```

### Request Body

```json
{
  "ai_employee_id": "content-creator",
  "title": "Write blog post",
  "prompt": "Write a 500-word blog post about AI trends in 2024",
  "priority": "normal",
  "source": "zapier",
  "metadata": {
    "custom_field": "any additional data"
  }
}
```

### Available AI Employees

| ID | Name | Description |
|----|------|-------------|
| `sasha` | Sasha | General AI assistant |
| `content-creator` | Content Creator | Creates blog posts, social media content |
| `data-analyst` | Data Analyst | Analyzes data and provides insights |
| `customer-support` | Customer Support | Handles support queries |
| `sales-assistant` | Sales Assistant | Helps with sales tasks |
| `research-analyst` | Research Analyst | Conducts research |
| `code-assistant` | Code Assistant | Helps with coding tasks |
| `marketing-strategist` | Marketing Strategist | Develops marketing strategies |

### Response

Success (201):
```json
{
  "success": true,
  "task": {
    "id": "uuid",
    "status": "pending",
    "message": "Task queued for processing"
  }
}
```

Error (4xx/5xx):
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Integration Examples

### Zapier

1. Create a new Zap
2. Add your trigger (e.g., "New Email in Gmail")
3. Add action: "Webhooks by Zapier" → "POST"
4. Configure:
   - URL: `https://your-domain.com/api/webhooks/trigger`
   - Payload Type: JSON
   - Data: Map your fields to the request body
   - Headers: `Authorization: Bearer YOUR_API_KEY`

### Make (Integromat)

1. Create new scenario
2. Add your trigger module
3. Add HTTP module → "Make a request"
4. Configure:
   - URL: `https://your-domain.com/api/webhooks/trigger`
   - Method: POST
   - Body type: Raw (JSON)
   - Headers: Authorization = Bearer YOUR_API_KEY

### n8n

1. Create new workflow
2. Add trigger node
3. Add HTTP Request node
4. Configure:
   - Method: POST
   - URL: Your webhook URL
   - Authentication: Header Auth
   - Header Name: Authorization
   - Header Value: Bearer YOUR_API_KEY
   - Body: JSON

### JavaScript/Node.js

```javascript
const response = await fetch('https://your-domain.com/api/webhooks/trigger', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    ai_employee_id: 'content-creator',
    title: 'Generate product description',
    prompt: 'Write a compelling product description for...',
    priority: 'high',
    source: 'my-app'
  })
});

const result = await response.json();
console.log(result);
```

### Python

```python
import requests

response = requests.post(
    'https://your-domain.com/api/webhooks/trigger',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    json={
        'ai_employee_id': 'content-creator',
        'title': 'Generate product description',
        'prompt': 'Write a compelling product description for...',
        'priority': 'high',
        'source': 'python-script'
    }
)

print(response.json())
```

### cURL

```bash
curl -X POST "https://your-domain.com/api/webhooks/trigger" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "ai_employee_id": "content-creator",
    "title": "Write blog post",
    "prompt": "Write about AI trends",
    "priority": "normal"
  }'
```

## Cron Job Setup

The cron job runs every 5 minutes and processes up to 10 pending tasks per run.

### Vercel Configuration

The `vercel.json` file configures the cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-tasks",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Manual Trigger (Testing)

You can manually trigger the cron endpoint for testing:

```bash
curl "https://your-domain.com/api/cron/process-tasks" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Task Limits

Tasks are counted against the user's monthly quota:

| Tier | Monthly Tasks |
|------|---------------|
| Starter | 100 |
| Pro | 1,000 |
| Enterprise | Unlimited |

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `INVALID_API_KEY` | Missing or invalid API key | Generate a new key from dashboard |
| `TASK_LIMIT_EXCEEDED` | Monthly quota reached | Upgrade subscription tier |
| `INVALID_EMPLOYEE` | Unknown AI employee ID | Use a valid employee ID from the list |
| `MISSING_REQUIRED_FIELDS` | Missing title or prompt | Include all required fields |

## Monitoring

View task status and results from the dashboard:

1. Go to Dashboard → Task Queue
2. See pending, processing, completed, and failed tasks
3. Click "View" on any task to see full details and results
4. Tasks auto-refresh every 5 seconds

## Security Best Practices

1. **Keep API keys secret** - Never expose in client-side code
2. **Rotate keys regularly** - Regenerate from dashboard if compromised
3. **Use HTTPS only** - All requests must use HTTPS
4. **Validate webhook sources** - Use the `source` field to track origins
5. **Monitor usage** - Check analytics for unusual activity
