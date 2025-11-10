# Backend Setup - Phase 1

## Overview

This document outlines the backend setup for parallel development. The backend includes:
- DynamoDB tables for memory bank
- Lambda functions for data processing
- API endpoints for frontend integration

## What's Been Created

### 1. DynamoDB Tables (Memory Bank)

**File**: `amplify/data/resource.ts`

Tables created:
- **UserPreferences** - Stores user preferences for personalized recommendations
- **UsagePattern** - Tracks user's energy usage patterns for seasonal analysis
- **RecommendationHistory** - Maintains history of recommendations shown to users
- **Feedback** - Stores user feedback on recommendations

All tables use:
- Owner-based authorization (users can only access their own data)
- User Pool authentication
- Automatic timestamps (createdAt, updatedAt)

### 2. Lambda Functions

**File**: `amplify/api/resource.ts`

Functions created:
- **normalize-data** - Normalizes energy usage data from various APIs
- **generate-recommendations** - Generates personalized energy plan recommendations
- **update-plan-catalog** - Updates the energy plan catalog from various APIs
- **process-usage-data** - Processes and stores usage data

### 3. Function Handlers

Each function has a handler file:
- `amplify/function/normalize-data/handler.ts`
- `amplify/function/generate-recommendations/handler.ts`
- `amplify/function/update-plan-catalog/handler.ts`
- `amplify/function/process-usage-data/handler.ts`

## Next Steps

### Step 1: Deploy Backend

1. **Make sure sandbox is running**:
   ```bash
   npx ampx sandbox
   ```

2. **The sandbox will automatically**:
   - Create DynamoDB tables
   - Deploy Lambda functions
   - Set up IAM roles and permissions
   - Generate API endpoints

### Step 2: Implement Function Logic

Each function handler has TODO comments for implementation:

1. **normalize-data**:
   - Parse raw data based on source
   - Map to common schema
   - Use OpenAI for complex normalization
   - Validate normalized data

2. **generate-recommendations**:
   - Fetch user preferences from memory bank
   - Fetch usage patterns from memory bank
   - Calculate recommendations
   - Use OpenAI for explanation generation
   - Store in recommendation history

3. **update-plan-catalog**:
   - Fetch plans from EIA, OpenEI, WattBuy APIs
   - Normalize plan data
   - Store in DynamoDB Plans table

4. **process-usage-data**:
   - Validate usage data
   - Calculate usage patterns
   - Store in UsagePattern table

### Step 3: Set Up Environment Variables

Set secrets for API keys:

```bash
# OpenAI API key
npx ampx sandbox secret set OPENAI_API_KEY

# Energy API keys
npx ampx sandbox secret set EIA_API_KEY
npx ampx sandbox secret set OPENEI_API_KEY
```

### Step 4: Test Functions

Test each function:

1. **Use AWS Console** to test Lambda functions
2. **Use API Gateway** to test API endpoints
3. **Use DynamoDB Console** to verify data storage

## Database Schema

### UserPreferences Table

- **Partition Key**: `userId` (String)
- **Attributes**:
  - `costSavingsPriority` (String)
  - `flexibilityPreference` (Number)
  - `renewableEnergyPreference` (Number)
  - `supplierRatingPreference` (Number)
  - `contractTypePreference` (String)
  - `earlyTerminationFeeTolerance` (Number)
  - `maxMonthlyCost` (Number, optional)
  - `maxAnnualCost` (Number, optional)
  - `sustainabilityGoals` (String Array, optional)
  - `createdAt` (DateTime)
  - `updatedAt` (DateTime)

### UsagePattern Table

- **Partition Key**: `userId` (String)
- **Sort Key**: `patternId` (String)
- **Attributes**:
  - `averageMonthlyKwh` (Number)
  - `peakMonth` (String)
  - `peakMonthKwh` (Number)
  - `seasonalVariation` (Number)
  - `usageTrend` (String)
  - `peakUsageMonths` (String Array)
  - `lowUsageMonths` (String Array)
  - `createdAt` (DateTime)
  - `updatedAt` (DateTime)

### RecommendationHistory Table

- **Partition Key**: `userId` (String)
- **Sort Key**: `recommendationId` (String)
- **Attributes**:
  - `planId` (String)
  - `rank` (Number)
  - `projectedSavings` (Number)
  - `explanation` (String)
  - `selected` (Boolean)
  - `createdAt` (DateTime)

### Feedback Table

- **Partition Key**: `userId` (String)
- **Sort Key**: `feedbackId` (String)
- **Attributes**:
  - `recommendationId` (String)
  - `rating` (Number)
  - `accuracyRating` (Number, optional)
  - `clarityRating` (Number, optional)
  - `overallSatisfaction` (Number, optional)
  - `comments` (String, optional)
  - `createdAt` (DateTime)

## API Integration

### Frontend Integration

The frontend can use the generated API client:

```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

const client = generateClient<Schema>({
  authMode: 'userPool',
});

// Example: Get user preferences
const { data } = await client.models.UserPreferences.get({
  userId: 'user-123',
});
```

### Lambda Function Invocation

Functions can be invoked via API Gateway or directly:

```typescript
// Example: Invoke normalize-data function
const response = await fetch('/api/normalize-data', {
  method: 'POST',
  body: JSON.stringify({
    rawData: {...},
    source: 'eia',
    userId: 'user-123',
  }),
});
```

## Testing

### Local Testing

1. **Test Lambda functions locally**:
   ```bash
   # Use AWS SAM or local Lambda runtime
   ```

2. **Test DynamoDB locally**:
   ```bash
   # Use DynamoDB Local
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

### Sandbox Testing

1. **Deploy to sandbox**:
   ```bash
   npx ampx sandbox
   ```

2. **Test via API Gateway**:
   - Use Postman or Insomnia
   - Test with authenticated requests

## Troubleshooting

### Issue: Tables not created

**Solution**: Make sure sandbox is running and check CloudFormation stack

### Issue: Functions not deploying

**Solution**: Check function handler paths and dependencies

### Issue: Authorization errors

**Solution**: Verify IAM roles and permissions are set correctly

## Next: Implement Function Logic

Each function has placeholder implementations. Next steps:

1. Implement data normalization logic
2. Implement recommendation generation
3. Implement plan catalog updates
4. Implement usage data processing

---

**Version**: 1.0  
**Last Updated**: November 2025

