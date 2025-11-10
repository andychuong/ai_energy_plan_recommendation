/**
 * Mock API Client
 * 
 * This mock API client can be used for frontend development
 * before the backend is ready. Switch to real API when ready.
 */

import type {
  EnergyPlan,
  CustomerUsageData,
  Recommendation,
  UserPreferences,
  UsagePattern,
  CreateUserPreferencesRequest,
  CreateUsagePatternRequest,
  CreateRecommendationHistoryRequest,
  CreateFeedbackRequest,
} from 'shared/types';
import {
  generateMockPlans,
  generateMockUsageData,
  generateMockRecommendations,
  generateMockUserPreferences,
  generateMockUsagePattern,
} from './mockData';

/**
 * Mock API delay to simulate network latency
 */
const MOCK_DELAY = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock API Client
 */
export class MockApiClient {
  /**
   * Get energy plans
   */
  async getEnergyPlans(_state: string): Promise<EnergyPlan[]> {
    await delay(MOCK_DELAY);
    return generateMockPlans();
  }

  /**
   * Get customer usage data
   */
  async getUsageData(_userId: string): Promise<CustomerUsageData> {
    await delay(MOCK_DELAY);
    return generateMockUsageData();
  }

  /**
   * Generate recommendations
   */
  async generateRecommendations(
    _userId: string,
    _usageData: CustomerUsageData
  ): Promise<Recommendation[]> {
    await delay(MOCK_DELAY * 2); // Simulate longer processing time
    return generateMockRecommendations();
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(_userId: string): Promise<UserPreferences | null> {
    await delay(MOCK_DELAY);
    return generateMockUserPreferences();
  }

  /**
   * Create/update user preferences
   */
  async createUserPreferences(
    request: CreateUserPreferencesRequest
  ): Promise<UserPreferences> {
    await delay(MOCK_DELAY);
    return {
      ...request.preferences,
      userId: request.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get usage patterns
   */
  async getUsagePatterns(_userId: string): Promise<UsagePattern[]> {
    await delay(MOCK_DELAY);
    return [generateMockUsagePattern()];
  }

  /**
   * Create usage pattern
   */
  async createUsagePattern(
    request: CreateUsagePatternRequest
  ): Promise<UsagePattern> {
    await delay(MOCK_DELAY);
    return {
      userId: request.userId,
      patternId: `pattern-${Date.now()}`,
      patternData: request.patternData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get recommendation history
   */
  async getRecommendationHistory(_userId: string) {
    await delay(MOCK_DELAY);
    return [];
  }

  /**
   * Create recommendation history entry
   */
  async createRecommendationHistory(
    request: CreateRecommendationHistoryRequest
  ) {
    await delay(MOCK_DELAY);
    return {
      ...request,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get feedback
   */
  async getFeedback(_userId: string) {
    await delay(MOCK_DELAY);
    return [];
  }

  /**
   * Create feedback
   */
  async createFeedback(request: CreateFeedbackRequest) {
    await delay(MOCK_DELAY);
    return {
      ...request,
      feedbackId: `feedback-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Export singleton instance
 */
export const mockApi = new MockApiClient();

