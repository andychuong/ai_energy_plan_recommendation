# Expose Lambda Functions for Frontend

## Overview

Lambda functions need to be exposed so the frontend can call them. In Amplify Gen 2, we can use Function URLs or API Gateway.

## Current Setup

Functions are defined with Function URLs enabled:
- `normalize-data` - Function URL enabled
- `generate-recommendations` - Function URL enabled

## After Deployment

Once the sandbox redeploys, function URLs will be available in `amplify_outputs.json`:

```json
{
  "normalizeDataFunction": {
    "url": "https://xxx.lambda-url.us-east-1.on.aws"
  },
  "generateRecommendationsFunction": {
    "url": "https://xxx.lambda-url.us-east-1.on.aws"
  }
}
```

## Update Frontend

### Step 1: Update API Client

After deployment, update `src/services/api/client.ts` to use function URLs from `amplify_outputs.json`:

```typescript
import outputs from '../../amplify_outputs.json';

// Get function URLs
const generateRecommendationsUrl = outputs.generateRecommendationsFunction?.url;
const normalizeDataUrl = outputs.normalizeDataFunction?.url;
```

### Step 2: Update Environment Variables

Add function URLs to `.env` (optional, if not using outputs directly):

```bash
VITE_GENERATE_RECOMMENDATIONS_URL=https://xxx.lambda-url.us-east-1.on.aws
VITE_NORMALIZE_DATA_URL=https://xxx.lambda-url.us-east-1.on.aws
```

### Step 3: Test Function Calls

Test the function calls:
1. Sign in to the app
2. Upload usage data
3. Set preferences
4. Generate recommendations
5. Verify Lambda function is called

## Alternative: API Gateway

If Function URLs don't work, we can create a REST API:

```typescript
import { defineApi } from '@aws-amplify/backend';

export const api = defineApi({
  routes: {
    '/recommendations': {
      path: '/recommendations',
      method: 'POST',
      handler: generateRecommendationsFunction,
    },
    '/normalize': {
      path: '/normalize',
      method: 'POST',
      handler: normalizeDataFunction,
    },
  },
});
```

## Next Steps

1. **Wait for sandbox to redeploy** with Function URLs
2. **Check `amplify_outputs.json`** for function URLs
3. **Update API client** to use function URLs
4. **Test recommendation generation**

---

**Version**: 1.0  
**Last Updated**: November 2025

