# Normalize Data Function

## Overview

This Lambda function normalizes energy usage data from various APIs to a common format using OpenRouter AI.

## Model Used

- **OpenRouter**: `openai/gpt-3.5-turbo`
- **Why**: Cost-efficient for structured data extraction
- **Cost**: ~$0.001 per request

## Environment Variables

- `OPENROUTER_API_KEY` - OpenRouter API key (set via Amplify secrets)

## Usage

```typescript
const event = {
  rawData: {...}, // Raw API response
  source: 'eia' | 'openei' | 'wattbuy' | 'green_button' | 'public_grid' | 'pge' | 'quantiv' | 'palmetto',
  userId: 'user-123'
};

const response = await handler(event);
```

## Response

```typescript
{
  success: boolean;
  normalizedData?: {
    customerInfo: {...};
    utilityInfo: {...};
    usageDataPoints: [...];
    aggregatedStats: {...};
  };
  error?: string;
}
```

## Setup

See `OPENROUTER_SETUP.md` for instructions on setting the API key.

