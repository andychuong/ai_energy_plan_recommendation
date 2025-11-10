# Memory Bank System Architecture

## Overview

The Memory Bank System stores and retrieves user data, preferences, usage patterns, and recommendation history to improve recommendations over time and provide personalized experiences.

## Purpose

- Store user preferences for personalized recommendations
- Track usage patterns for seasonal analysis
- Maintain recommendation history for learning
- Store feedback and ratings for continuous improvement
- Enable personalization across sessions

## Data Models

### User Preferences

```typescript
interface UserPreferences {
  userId: string;
  costSavingsPriority: 'high' | 'medium' | 'low';
  flexibilityPreference: number; // Contract length tolerance in months
  renewableEnergyPreference: number; // Percentage desired (0-100)
  supplierRatingPreference: number; // Minimum rating threshold (0-5)
  contractTypePreference: 'fixed' | 'variable' | 'indexed' | 'hybrid' | null;
  earlyTerminationFeeTolerance: number; // Maximum acceptable fee
  budgetConstraints?: {
    maxMonthlyCost?: number;
    maxAnnualCost?: number;
  };
  sustainabilityGoals?: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Usage Patterns

```typescript
interface UsagePattern {
  userId: string;
  patternId: string;
  patternData: {
    averageMonthlyKwh: number;
    peakMonth: string;
    peakMonthKwh: number;
    seasonalVariation: number;
    usageTrend: 'increasing' | 'decreasing' | 'stable';
    peakUsageMonths: string[];
    lowUsageMonths: string[];
  };
  createdAt: string;
  updatedAt: string;
}
```

### Recommendation History

```typescript
interface RecommendationHistory {
  userId: string;
  recommendationId: string;
  planId: string;
  rank: number;
  projectedSavings: number;
  explanation: string;
  selected: boolean;
  createdAt: string;
}
```

### Feedback and Ratings

```typescript
interface Feedback {
  userId: string;
  feedbackId: string;
  recommendationId: string;
  rating: number; // 1-5 stars
  accuracyRating?: number; // 1-5 stars
  clarityRating?: number; // 1-5 stars
  overallSatisfaction?: number; // 1-5 stars
  comments?: string;
  createdAt: string;
}
```

## Database Schema (DynamoDB)

### UserPreferences Table

**Partition Key**: `userId` (String)

**Attributes**:
- `preferences` (Map)
  - `costSavingsPriority` (String)
  - `flexibilityPreference` (Number)
  - `renewableEnergyPreference` (Number)
  - `supplierRatingPreference` (Number)
  - `contractTypePreference` (String)
  - `earlyTerminationFeeTolerance` (Number)
  - `budgetConstraints` (Map, optional)
  - `sustainabilityGoals` (List, optional)
- `createdAt` (String, ISO 8601)
- `updatedAt` (String, ISO 8601)

**GSI**: None required (single item per user)

### UsagePatterns Table

**Partition Key**: `userId` (String)  
**Sort Key**: `patternId` (String)

**Attributes**:
- `patternData` (Map)
  - `averageMonthlyKwh` (Number)
  - `peakMonth` (String)
  - `peakMonthKwh` (Number)
  - `seasonalVariation` (Number)
  - `usageTrend` (String)
  - `peakUsageMonths` (List)
  - `lowUsageMonths` (List)
- `createdAt` (String, ISO 8601)
- `updatedAt` (String, ISO 8601)

**GSI**: `userId-createdAt-index` (for retrieving latest pattern)

### RecommendationHistory Table

**Partition Key**: `userId` (String)  
**Sort Key**: `recommendationId` (String)

**Attributes**:
- `planId` (String)
- `rank` (Number)
- `projectedSavings` (Number)
- `explanation` (String)
- `selected` (Boolean)
- `createdAt` (String, ISO 8601)

**GSI**: `userId-createdAt-index` (for retrieving recent recommendations)

### Feedback Table

**Partition Key**: `userId` (String)  
**Sort Key**: `feedbackId` (String)

**Attributes**:
- `recommendationId` (String)
- `rating` (Number)
- `accuracyRating` (Number, optional)
- `clarityRating` (Number, optional)
- `overallSatisfaction` (Number, optional)
- `comments` (String, optional)
- `createdAt` (String, ISO 8601)

**GSI**: `userId-createdAt-index` (for retrieving recent feedback)

## API Endpoints

### Preferences Endpoints

**POST /api/memory/preferences**
- Save or update user preferences
- Request body: `UserPreferences`
- Response: `UserPreferences`

**GET /api/memory/preferences/:userId**
- Retrieve user preferences
- Response: `UserPreferences | null`

**PUT /api/memory/preferences/:userId**
- Update user preferences
- Request body: Partial `UserPreferences`
- Response: `UserPreferences`

### Usage Patterns Endpoints

**POST /api/memory/patterns**
- Save usage pattern
- Request body: `UsagePattern`
- Response: `UsagePattern`

**GET /api/memory/patterns/:userId**
- Retrieve all usage patterns for user
- Response: `UsagePattern[]`

**GET /api/memory/patterns/:userId/latest**
- Retrieve latest usage pattern
- Response: `UsagePattern | null`

### Recommendation History Endpoints

**POST /api/memory/recommendations**
- Save recommendation history
- Request body: `RecommendationHistory`
- Response: `RecommendationHistory`

**GET /api/memory/recommendations/:userId**
- Retrieve recommendation history
- Query params: `limit`, `offset`
- Response: `RecommendationHistory[]`

**GET /api/memory/recommendations/:userId/:recommendationId**
- Retrieve specific recommendation
- Response: `RecommendationHistory | null`

### Feedback Endpoints

**POST /api/memory/feedback**
- Save feedback
- Request body: `Feedback`
- Response: `Feedback`

**GET /api/memory/feedback/:userId**
- Retrieve feedback for user
- Query params: `limit`, `offset`
- Response: `Feedback[]`

**GET /api/memory/feedback/:userId/:recommendationId**
- Retrieve feedback for specific recommendation
- Response: `Feedback[]`

## Service Layer

### MemoryBankService

```typescript
class MemoryBankService {
  // Preferences
  async savePreferences(userId: string, preferences: UserPreferences): Promise<UserPreferences>
  async getPreferences(userId: string): Promise<UserPreferences | null>
  async updatePreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences>
  
  // Usage Patterns
  async saveUsagePattern(userId: string, pattern: UsagePattern): Promise<UsagePattern>
  async getUsagePatterns(userId: string): Promise<UsagePattern[]>
  async getLatestUsagePattern(userId: string): Promise<UsagePattern | null>
  
  // Recommendation History
  async saveRecommendation(userId: string, recommendation: RecommendationHistory): Promise<RecommendationHistory>
  async getRecommendationHistory(userId: string, limit?: number, offset?: number): Promise<RecommendationHistory[]>
  async getRecommendation(userId: string, recommendationId: string): Promise<RecommendationHistory | null>
  
  // Feedback
  async saveFeedback(userId: string, feedback: Feedback): Promise<Feedback>
  async getFeedback(userId: string, limit?: number, offset?: number): Promise<Feedback[]>
  async getFeedbackForRecommendation(userId: string, recommendationId: string): Promise<Feedback[]>
  
  // Analytics
  async analyzeUserPatterns(userId: string): Promise<UsagePatternAnalysis>
  async getUserRecommendationStats(userId: string): Promise<RecommendationStats>
}
```

## Integration Points

### Frontend Integration

1. **Save Preferences**: When user updates preferences in UI
2. **Retrieve Preferences**: When user logs in or navigates to preferences page
3. **Save Recommendation History**: When recommendations are generated
4. **Save Feedback**: When user submits ratings or feedback
5. **Retrieve History**: When displaying user's recommendation history

### Backend Integration

1. **Recommendation Generation**: Use stored preferences for ranking
2. **Seasonal Analysis**: Use usage patterns for seasonal recommendations
3. **Personalization**: Use recommendation history to avoid duplicates
4. **Continuous Improvement**: Use feedback to improve future recommendations
5. **Analytics**: Use all data for user insights and system improvements

### Recommendation Engine Integration

1. **Preference-Based Ranking**: Retrieve preferences and use for plan ranking
2. **Pattern-Based Analysis**: Use usage patterns for seasonal recommendations
3. **History-Based Filtering**: Avoid recommending plans user has already seen
4. **Feedback-Based Learning**: Adjust recommendations based on past feedback

## Implementation Plan

### Phase 1: Database Setup
- [ ] Create DynamoDB tables
- [ ] Set up GSI indexes
- [ ] Configure IAM permissions
- [ ] Set up table policies

### Phase 2: Service Layer
- [ ] Implement MemoryBankService
- [ ] Create data access layer
- [ ] Implement error handling
- [ ] Add logging

### Phase 3: API Endpoints
- [ ] Create Lambda functions for each endpoint
- [ ] Set up API Gateway routes
- [ ] Implement authentication
- [ ] Add request validation

### Phase 4: Frontend Integration
- [ ] Create memory bank hooks
- [ ] Integrate with preference forms
- [ ] Integrate with recommendation display
- [ ] Integrate with feedback forms

### Phase 5: Backend Integration
- [ ] Integrate with recommendation engine
- [ ] Use preferences for ranking
- [ ] Use patterns for seasonal analysis
- [ ] Use history for filtering

## Caching Strategy

- **Preferences**: Cache in memory for active user sessions
- **Usage Patterns**: Cache latest pattern for active users
- **Recommendation History**: Cache recent recommendations (last 10)
- **Feedback**: No caching (always fresh data)

## Security Considerations

- All endpoints require authentication
- User can only access their own data
- Data encrypted at rest (DynamoDB encryption)
- Data encrypted in transit (HTTPS)
- Audit logging for all operations

## Performance Considerations

- Use DynamoDB on-demand capacity
- Implement connection pooling
- Use batch operations where possible
- Optimize query patterns
- Monitor and optimize hot partitions

## Monitoring

- Track API response times
- Monitor DynamoDB read/write capacity
- Track error rates
- Monitor cache hit rates
- Track user engagement metrics

---

**Version**: 1.0  
**Last Updated**: 2025

