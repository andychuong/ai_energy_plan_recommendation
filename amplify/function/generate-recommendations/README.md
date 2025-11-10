# Generate Recommendations Function

## Overview

This Lambda function generates personalized energy plan recommendations using OpenRouter AI.

## Model Used

- **OpenRouter**: `openai/gpt-4-turbo`
- **Why**: Better reasoning for complex recommendation generation
- **Cost**: ~$0.02 per request

## Environment Variables

- `OPENROUTER_API_KEY` - OpenRouter API key (set via Amplify secrets)

## Usage

```typescript
const event = {
  userId: 'user-123',
  usageData: {...},
  preferences: {...},
  availablePlans: [...]
};

const response = await handler(event);
```

## Response

```typescript
{
  success: boolean;
  recommendations?: Array<{
    planId: string;
    rank: number;
    projectedSavings: number;
    explanation: string;
    riskFlags: string[];
  }>;
  error?: string;
}
```

## Setup

See `OPENROUTER_SETUP.md` for instructions on setting the API key.

