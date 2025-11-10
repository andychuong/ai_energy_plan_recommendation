# OpenRouter AI Setup Guide

## Overview

This project uses OpenRouter AI for data normalization and recommendation generation. OpenRouter provides access to multiple AI models (OpenAI, Anthropic, etc.) with better pricing and flexibility.

## Why OpenRouter?

- **30-50% cost savings** compared to direct OpenAI API
- **Model flexibility** - Use different models for different tasks
- **Better for production** - Built-in rate limiting, retries, failover
- **Easy to optimize** - Switch models without code changes

## Model Selection

### Data Normalization
- **Model**: `openai/gpt-3.5-turbo`
- **Why**: Cheaper, fast, sufficient for structured data extraction
- **Cost**: ~$0.001 per request

### Recommendation Generation
- **Model**: `openai/gpt-4-turbo`
- **Why**: Better reasoning, more accurate recommendations
- **Cost**: ~$0.02 per request

## Setup Instructions

### Step 1: Get OpenRouter API Key

1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. Sign up or log in
3. Go to [API Keys](https://openrouter.ai/keys)
4. Create a new API key
5. Copy the API key (starts with `sk-or-v1-...`)

### Step 2: Set Secret in Amplify

Set the OpenRouter API key as an Amplify secret:

```bash
npx ampx sandbox secret set OPENROUTER_API_KEY
```

When prompted, paste your OpenRouter API key and press Enter.

### Step 3: Verify Secret is Set

```bash
npx ampx sandbox secret list
```

You should see:
- `OPENROUTER_API_KEY`

### Step 4: Restart Sandbox

If the sandbox is running, it will automatically detect the new secret. If not, start it:

```bash
npx ampx sandbox
```

The sandbox will:
- Deploy Lambda functions with the new environment variable
- Make the API key available to functions
- Update function configurations

## Configuration

### Environment Variables

The OpenRouter API key is set as an environment variable in Lambda functions:

- **normalize-data**: `OPENROUTER_API_KEY`
- **generate-recommendations**: `OPENROUTER_API_KEY`

### API Client Configuration

The functions use the OpenAI SDK with OpenRouter's base URL:

```typescript
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'https://arbor-ai-energy.com', // Optional: for analytics
  },
});
```

## Usage

### Data Normalization

The `normalize-data` function uses OpenRouter with GPT-3.5-turbo:

```typescript
const response = await openrouter.chat.completions.create({
  model: 'openai/gpt-3.5-turbo',
  messages: [...],
  response_format: { type: 'json_object' },
  temperature: 0.1,
});
```

### Recommendation Generation

The `generate-recommendations` function uses OpenRouter with GPT-4-turbo:

```typescript
const response = await openrouter.chat.completions.create({
  model: 'openai/gpt-4-turbo',
  messages: [...],
  response_format: { type: 'json_object' },
  temperature: 0.3,
});
```

## Cost Optimization

### Current Setup

- **Data Normalization**: GPT-3.5-turbo (~$0.001 per request)
- **Recommendations**: GPT-4-turbo (~$0.02 per request)

### Estimated Costs

For 1000 requests per day:
- Normalization: 1000 × $0.001 = $1/day = $30/month
- Recommendations: 1000 × $0.02 = $20/day = $600/month
- **Total**: ~$630/month

### Cost Savings vs OpenAI Direct

- OpenAI Direct (GPT-4): ~$900/month
- OpenRouter (GPT-4): ~$600/month
- **Savings**: ~$270/month (30% savings)

### Further Optimization

You can optimize costs by:
1. **Caching results** - Cache normalized data and recommendations
2. **Using cheaper models** - Use GPT-3.5 for simple tasks
3. **Batch processing** - Process multiple items in one request
4. **Fallback logic** - Use AI only when manual parsing fails

## Testing

### Test Data Normalization

```bash
# Invoke normalize-data function
aws lambda invoke \
  --function-name normalize-data \
  --payload '{"rawData": {...}, "source": "eia", "userId": "user-123"}' \
  response.json
```

### Test Recommendation Generation

```bash
# Invoke generate-recommendations function
aws lambda invoke \
  --function-name generate-recommendations \
  --payload '{"userId": "user-123", "usageData": {...}, "preferences": {...}, "availablePlans": [...]}' \
  response.json
```

## Troubleshooting

### Issue: "API key not found"

**Solution**: Make sure you set the secret:
```bash
npx ampx sandbox secret set OPENROUTER_API_KEY
```

### Issue: "Invalid API key"

**Solution**: 
- Verify the API key is correct
- Check that the key starts with `sk-or-v1-...`
- Make sure the key is active in OpenRouter dashboard

### Issue: "Rate limit exceeded"

**Solution**:
- OpenRouter has rate limits based on your plan
- Upgrade your plan if needed
- Implement retry logic with exponential backoff

### Issue: "Model not found"

**Solution**:
- Check that the model name is correct: `openai/gpt-3.5-turbo` or `openai/gpt-4-turbo`
- Verify the model is available in OpenRouter
- Check OpenRouter status page

## Monitoring

### OpenRouter Dashboard

1. Go to [OpenRouter Dashboard](https://openrouter.ai/dashboard)
2. View API usage
3. Monitor costs
4. Check rate limits

### AWS CloudWatch

Monitor Lambda function logs:
- Function invocations
- Errors
- Duration
- Cost

## Next Steps

1. **Set the API key** using the instructions above
2. **Test the functions** to verify they work
3. **Monitor costs** in OpenRouter dashboard
4. **Optimize** based on usage patterns

---

**Version**: 1.0  
**Last Updated**: November 2025

