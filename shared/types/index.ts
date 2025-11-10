/**
 * Shared TypeScript types for frontend and backend
 * 
 * This file contains types that are used by both frontend and backend
 * to ensure type safety across the application.
 */

// Re-export all shared types
export * from './models';
export * from './api';
// Export memory-bank types (excluding UserPreferences which is in models)
export type {
  UsagePattern,
  RecommendationHistory,
  Feedback,
  MemoryBankResponse,
  CreateUserPreferencesRequest,
  GetUserPreferencesResponse,
  CreateUsagePatternRequest,
  GetUsagePatternsResponse,
  CreateRecommendationHistoryRequest,
  GetRecommendationHistoryResponse,
  CreateFeedbackRequest,
  GetFeedbackResponse,
} from './memory-bank';

