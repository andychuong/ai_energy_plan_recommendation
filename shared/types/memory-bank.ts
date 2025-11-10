/**
 * Memory Bank Data Models
 * 
 * These types define the data structures for the memory bank system,
 * which stores user preferences, usage patterns, recommendation history,
 * and feedback to improve recommendations over time.
 */

/**
 * User Preferences
 * Stores user preferences for personalized recommendations
 */
export interface UserPreferences {
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

/**
 * Usage Patterns
 * Tracks user's energy usage patterns for seasonal analysis
 */
export interface UsagePattern {
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

/**
 * Recommendation History
 * Maintains history of recommendations shown to users
 */
export interface RecommendationHistory {
  userId: string;
  recommendationId: string;
  planId: string;
  rank: number;
  projectedSavings: number;
  explanation: string;
  selected: boolean;
  createdAt: string;
}

/**
 * Feedback and Ratings
 * Stores user feedback on recommendations
 */
export interface Feedback {
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

/**
 * Memory Bank Response Types
 */
export interface MemoryBankResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create/Update User Preferences Request
 */
export interface CreateUserPreferencesRequest {
  userId: string;
  preferences: Omit<UserPreferences, 'userId' | 'createdAt' | 'updatedAt'>;
}

/**
 * Get User Preferences Response
 */
export interface GetUserPreferencesResponse {
  preferences: UserPreferences | null;
}

/**
 * Create Usage Pattern Request
 */
export interface CreateUsagePatternRequest {
  userId: string;
  patternData: UsagePattern['patternData'];
}

/**
 * Get Usage Patterns Response
 */
export interface GetUsagePatternsResponse {
  patterns: UsagePattern[];
}

/**
 * Create Recommendation History Request
 */
export interface CreateRecommendationHistoryRequest {
  userId: string;
  recommendationId: string;
  planId: string;
  rank: number;
  projectedSavings: number;
  explanation: string;
  selected?: boolean;
}

/**
 * Get Recommendation History Response
 */
export interface GetRecommendationHistoryResponse {
  history: RecommendationHistory[];
}

/**
 * Create Feedback Request
 */
export interface CreateFeedbackRequest {
  userId: string;
  recommendationId: string;
  rating: number;
  accuracyRating?: number;
  clarityRating?: number;
  overallSatisfaction?: number;
  comments?: string;
}

/**
 * Get Feedback Response
 */
export interface GetFeedbackResponse {
  feedback: Feedback[];
}

