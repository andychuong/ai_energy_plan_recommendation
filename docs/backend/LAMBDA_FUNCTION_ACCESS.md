# Lambda Function Access - Amplify Gen 2

## Current Status

Lambda functions are defined but need to be exposed for frontend access. In Amplify Gen 2, functions are automatically available through the backend, but we need to configure how they're accessed from the frontend.

## Options for Exposing Lambda Functions

### Option 1: Use Amplify's `invokeFunction` (Recommended)

Amplify provides a built-in method to invoke Lambda functions from the frontend:

```typescript
import { invokeFunction } from 'aws-amplify/function';

const response = await invokeFunction({
  name: 'generate-recommendations',
  payload: {
    userId,
    usageData,
    preferences,
    availablePlans,
  },
});
```

**Pros**:
- Built-in Amplify support
- Automatic authentication handling
- Type-safe

**Cons**:
- Requires functions to be properly configured in backend
- May need additional IAM permissions

### Option 2: Function URLs (Manual Configuration)

Configure Function URLs manually in the backend:

```typescript
// In backend.ts, after defineBackend
backend.generateRecommendationsFunction.addFunctionUrl({
  authType: 'AWS_IAM',
  cors: {
    allowOrigins: ['http://localhost:3000'],
    allowMethods: ['POST'],
  },
});
```

**Pros**:
- Direct HTTP access
- Full control over CORS
- Can be accessed from any client

**Cons**:
- Requires manual configuration
- Need to handle authentication manually

### Option 3: API Gateway (Most Flexible)

Create a REST API that routes to Lambda functions:

```typescript
import { defineApi } from '@aws-amplify/backend';

export const api = defineApi({
  routes: {
    '/recommendations': {
      path: '/recommendations',
      method: 'POST',
      handler: generateRecommendationsFunction,
    },
  },
});
```

**Pros**:
- Standard REST API
- Easy to test with tools like Postman
- Can add rate limiting, caching, etc.

**Cons**:
- More complex setup
- Additional AWS resources

## Recommended Approach

For now, we'll use **Option 1** (Amplify's `invokeFunction`) as it's the simplest and most integrated with Amplify Gen 2.

## Implementation Steps

### Step 1: Update API Client

Update `src/services/api/client.ts` to use `invokeFunction`:

```typescript
import { invokeFunction } from 'aws-amplify/function';

async generateRecommendations(userId: string, usageData: CustomerUsageData) {
  const response = await invokeFunction({
    name: 'generate-recommendations',
    payload: {
      userId,
      usageData,
      preferences: await this.getUserPreferences(userId),
      availablePlans: await this.getEnergyPlans('CA'),
    },
  });
  
  return response.data;
}
```

### Step 2: Grant Permissions

Ensure the authenticated user has permission to invoke the function. This is typically handled automatically by Amplify, but verify in the backend configuration.

### Step 3: Test

Test the function invocation:
1. Sign in to the app
2. Upload usage data
3. Set preferences
4. Generate recommendations
5. Verify function is called successfully

## Current Implementation

Currently, the API client falls back to mock data when function URLs are not available. This allows the frontend to work while we configure function access.

## Next Steps

1. **Test with mock data** - Verify frontend works with mock data
2. **Configure function access** - Choose and implement one of the options above
3. **Update API client** - Replace mock fallback with real function invocation
4. **Test end-to-end** - Verify full flow works

---

**Version**: 1.0  
**Last Updated**: 2025

