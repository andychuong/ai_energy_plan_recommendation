# Next Steps - Frontend/Backend Integration

**Status**: Frontend complete, Backend deploying, Ready for integration

## Current State

### ✅ Completed
- Frontend: All components, pages, hooks, charts built
- Backend: Structure complete, Lambda functions defined, DynamoDB tables configured
- OpenRouter API key: Set ✅
- Amplify Sandbox: Deploying...

### 🔄 In Progress
- Backend deployment (waiting for sandbox to complete)

## Next Steps

### Step 1: Wait for Backend Deployment ⏳

**Action**: Monitor sandbox deployment
- Check sandbox logs for completion
- Verify all resources deployed successfully
- Confirm `amplify_outputs.json` is generated/updated

**Expected Output**:
- DynamoDB tables created
- Lambda functions deployed
- API endpoints available
- `amplify_outputs.json` updated with data API configuration

### Step 2: Update Frontend API Client 🔌

**File**: `src/services/api/client.ts`

**Changes Needed**:
1. Replace mock API calls with real Amplify Data API calls
2. Use `generateClient` from `aws-amplify/data` for DynamoDB operations
3. Connect to Lambda functions via API Gateway or direct invocation
4. Update environment variable check (remove `VITE_USE_MOCK_API` or set to `false`)

**Example**:
```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import outputs from '../../../amplify_outputs.json';

const client = generateClient<Schema>({
  authMode: 'userPool',
});

// Replace mock calls with real API
async getUserPreferences(userId: string) {
  const result = await client.models.UserPreferences.get({ id: userId });
  return result.data;
}
```

### Step 3: Connect to Amplify Data API 📊

**Files to Update**:
- `src/services/api/client.ts` - Main API client
- `src/hooks/useUserPreferences.ts` - Preferences hook
- `src/hooks/useUsageData.ts` - Usage data hook
- `src/hooks/useRecommendations.ts` - Recommendations hook

**Operations to Implement**:
1. **User Preferences**:
   - `getUserPreferences(userId)` → `client.models.UserPreferences.get({ id: userId })`
   - `createUserPreferences(data)` → `client.models.UserPreferences.create(data)`
   - `updateUserPreferences(userId, data)` → `client.models.UserPreferences.update({ id: userId, ...data })`

2. **Usage Patterns**:
   - `getUsagePatterns(userId)` → `client.models.UsagePattern.list({ filter: { userId: { eq: userId } } })`
   - `createUsagePattern(data)` → `client.models.UsagePattern.create(data)`

3. **Recommendation History**:
   - `getRecommendationHistory(userId)` → `client.models.RecommendationHistory.list({ filter: { userId: { eq: userId } } })`
   - `createRecommendationHistory(data)` → `client.models.RecommendationHistory.create(data)`

4. **Feedback**:
   - `getFeedback(userId)` → `client.models.Feedback.list({ filter: { userId: { eq: userId } } })`
   - `createFeedback(data)` → `client.models.Feedback.create(data)`

### Step 4: Connect to Lambda Functions ⚡

**Functions to Connect**:
1. **normalize-data**: For processing uploaded usage data
2. **generate-recommendations**: For generating plan recommendations
3. **process-usage-data**: For storing usage patterns

**Implementation Options**:

**Option A: Direct Lambda Invocation** (if functions are exposed)
```typescript
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

async function generateRecommendations(data: any) {
  const command = new InvokeCommand({
    FunctionName: 'generate-recommendations',
    Payload: JSON.stringify(data),
  });
  const response = await lambda.send(command);
  return JSON.parse(new TextDecoder().decode(response.Payload));
}
```

**Option B: API Gateway** (if functions are exposed via API)
```typescript
async function generateRecommendations(data: any) {
  const response = await fetch('/api/generate-recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

**Option C: Amplify Function URLs** (if configured)
```typescript
// Use Amplify's function URL if configured
const response = await fetch(`${functionUrl}/generate-recommendations`, {
  method: 'POST',
  body: JSON.stringify(data),
});
```

### Step 5: Implement S3 File Upload 📁

**For Usage Data Upload**:
1. Configure S3 bucket in Amplify
2. Use Amplify Storage for file uploads
3. Process uploaded files (CSV, JSON, XML)
4. Call `normalize-data` function with file data

**Example**:
```typescript
import { uploadData } from 'aws-amplify/storage';

async function uploadUsageData(file: File, userId: string) {
  // Upload to S3
  const result = await uploadData({
    key: `usage-data/${userId}/${file.name}`,
    data: file,
  }).result;
  
  // Process file
  const fileData = await readFile(file);
  const normalized = await normalizeData(fileData, userId);
  
  return normalized;
}
```

### Step 6: Update Environment Variables 🔧

**File**: `.env` or `.env.local`

**Variables to Set**:
```bash
# Remove or set to false to use real API
VITE_USE_MOCK_API=false

# API endpoints (if using API Gateway)
VITE_API_URL=https://your-api-gateway-url.amazonaws.com

# Function URLs (if using function URLs)
VITE_NORMALIZE_DATA_URL=https://your-function-url.lambda-url.us-east-1.on.aws
VITE_GENERATE_RECOMMENDATIONS_URL=https://your-function-url.lambda-url.us-east-1.on.aws
```

### Step 7: Test Integration 🧪

**Test Scenarios**:
1. **Authentication Flow**:
   - Sign in with Google OAuth
   - Verify user session
   - Check protected routes

2. **User Preferences**:
   - Create preferences
   - Update preferences
   - Retrieve preferences

3. **Usage Data**:
   - Upload usage data file
   - Process and normalize data
   - Store usage patterns

4. **Recommendations**:
   - Generate recommendations
   - Display recommendations
   - Store recommendation history

5. **Feedback**:
   - Submit feedback
   - Retrieve feedback history

### Step 8: Error Handling & Edge Cases 🛡️

**Implement**:
1. Network error handling
2. Authentication error handling
3. Data validation errors
4. Loading states
5. Error boundaries
6. Retry logic for failed requests

## Integration Checklist

### Backend Ready ✅
- [x] DynamoDB tables defined
- [x] Lambda functions created
- [x] OpenRouter API key set
- [ ] Backend deployment complete
- [ ] API endpoints accessible

### Frontend Ready ✅
- [x] All components built
- [x] Hooks created
- [x] API client structure ready
- [ ] API client connected to backend
- [ ] Mock data disabled

### Integration Tasks
- [ ] Update API client to use Amplify Data
- [ ] Connect Lambda functions
- [ ] Implement S3 file upload
- [ ] Update environment variables
- [ ] Test authentication flow
- [ ] Test data operations
- [ ] Test recommendation generation
- [ ] Test error handling

## Priority Order

1. **Wait for backend deployment** ⏳
2. **Update API client** (use Amplify Data for DynamoDB) 🔌
3. **Test basic operations** (preferences, usage patterns) 🧪
4. **Connect Lambda functions** (recommendations) ⚡
5. **Implement file upload** (S3) 📁
6. **End-to-end testing** ✅

## Quick Start After Deployment

Once sandbox deployment completes:

1. **Check `amplify_outputs.json`** - Verify data API configuration
2. **Update `src/services/api/client.ts`** - Replace mock with real API
3. **Test in browser** - Sign in, create preferences, test flow
4. **Monitor CloudWatch** - Check Lambda function logs
5. **Test recommendations** - Generate and display recommendations

---

**Version**: 1.0  
**Last Updated**: 2025

