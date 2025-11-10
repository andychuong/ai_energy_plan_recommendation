/**
 * API contract types
 * 
 * These types define the API contracts between frontend and backend
 */

import type { UserPreferences, UsageData, Recommendation, CurrentPlan } from './models';

// Request types
export interface RecommendationRequest {
  userId: string;
  usageData: UsageData;
  preferences: UserPreferences;
  currentPlan?: CurrentPlan;
}

export interface UsageDataUploadRequest {
  userId: string;
  usageData: UsageData;
  source: 'file' | 'api' | 'manual';
}

export interface PreferencesUpdateRequest {
  userId: string;
  preferences: Partial<UserPreferences>;
}

// Response types
export interface RecommendationResponse {
  recommendations: Recommendation[];
  projectedSavings: number;
  explanation: string;
  confidence: number;
  dataQuality: 'actual' | 'estimated' | 'projected';
}

export interface UsageDataValidationResponse {
  isValid: boolean;
  has12Months: boolean;
  hasCompleteData: boolean;
  warnings: string[];
  errors: string[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

