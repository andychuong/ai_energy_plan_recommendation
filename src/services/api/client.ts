/**
 * API Client
 * 
 * This is the real API client that connects to the backend.
 * Uses Amplify Data API for DynamoDB operations and Lambda functions for recommendations.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { mockApi } from '../mock/mockApi';
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

/**
 * Check if we should use mock data
 * Set VITE_USE_MOCK_API=true in .env for development
 */
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

/**
 * Initialize Amplify Data client
 * Uses Cognito User Pool authentication
 */
const dataClient = generateClient<Schema>({
  authMode: 'userPool',
});

/**
 * API Client Class
 */
class ApiClient {
  /**
   * Get energy plans
   */
  async getEnergyPlans(state: string): Promise<EnergyPlan[]> {
    if (USE_MOCK_API) {
      return mockApi.getEnergyPlans(state);
    }
    // TODO: Implement real API call
    // const response = await fetch(`/api/plans?state=${state}`);
    // return response.json();
    throw new Error('Real API not implemented yet');
  }

  /**
   * Get customer usage data
   */
  async getUsageData(userId: string): Promise<CustomerUsageData> {
    if (USE_MOCK_API) {
      return mockApi.getUsageData(userId);
    }
    // TODO: Implement real API call
    throw new Error('Real API not implemented yet');
  }

  /**
   * Generate recommendations
   * Calls Lambda function via function URL or API Gateway
   */
  async generateRecommendations(
    userId: string,
    usageData: CustomerUsageData
  ): Promise<Recommendation[]> {
    if (USE_MOCK_API) {
      return mockApi.generateRecommendations(userId, usageData);
    }

    try {
      // Get user preferences and available plans
      const [preferences] = await Promise.all([
        this.getUserPreferences(userId),
        // Plans will be fetched when needed
        // this.getEnergyPlans('CA'), // TODO: Get state from user profile
      ]);

      if (!preferences) {
        throw new Error('User preferences not found. Please set preferences first.');
      }

      // TODO: Use Amplify's invokeFunction when function URLs are configured
      // For now, use mock data until function access is configured
      // See LAMBDA_FUNCTION_ACCESS.md for options to expose functions
      console.warn('Function URL not yet available, using mock data');
      return mockApi.generateRecommendations(userId, usageData);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    if (USE_MOCK_API) {
      return mockApi.getUserPreferences(userId);
    }

    try {
      const result = await dataClient.models.UserPreferences.get({
        id: userId,
      });

      if (!result.data) {
        return null;
      }

      // Map from Amplify model to shared type
      return {
        userId: result.data.userId,
        costSavingsPriority: result.data.costSavingsPriority as 'high' | 'medium' | 'low',
        flexibilityPreference: result.data.flexibilityPreference,
        renewableEnergyPreference: result.data.renewableEnergyPreference,
        supplierRatingPreference: result.data.supplierRatingPreference,
        contractTypePreference: result.data.contractTypePreference as 'fixed' | 'variable' | 'indexed' | 'hybrid' | null,
        earlyTerminationFeeTolerance: result.data.earlyTerminationFeeTolerance,
        budgetConstraints: result.data.maxMonthlyCost || result.data.maxAnnualCost
          ? {
              maxMonthlyCost: result.data.maxMonthlyCost || undefined,
              maxAnnualCost: result.data.maxAnnualCost || undefined,
            }
          : undefined,
        sustainabilityGoals: result.data.sustainabilityGoals?.filter((s): s is string => s !== null) || undefined,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  /**
   * Create/update user preferences
   */
  async createUserPreferences(
    request: CreateUserPreferencesRequest
  ): Promise<UserPreferences> {
    if (USE_MOCK_API) {
      return mockApi.createUserPreferences(request);
    }

    try {
      const now = new Date().toISOString();
      const result = await dataClient.models.UserPreferences.create({
        userId: request.userId,
        costSavingsPriority: request.preferences.costSavingsPriority,
        flexibilityPreference: request.preferences.flexibilityPreference,
        renewableEnergyPreference: request.preferences.renewableEnergyPreference,
        supplierRatingPreference: request.preferences.supplierRatingPreference,
        contractTypePreference: request.preferences.contractTypePreference || null,
        earlyTerminationFeeTolerance: request.preferences.earlyTerminationFeeTolerance,
        maxMonthlyCost: request.preferences.budgetConstraints?.maxMonthlyCost,
        maxAnnualCost: request.preferences.budgetConstraints?.maxAnnualCost,
        sustainabilityGoals: request.preferences.sustainabilityGoals,
        createdAt: now,
        updatedAt: now,
      });

      if (!result.data) {
        throw new Error('Failed to create user preferences');
      }

      // Map from Amplify model to shared type
      return {
        userId: result.data.userId,
        costSavingsPriority: result.data.costSavingsPriority as 'high' | 'medium' | 'low',
        flexibilityPreference: result.data.flexibilityPreference,
        renewableEnergyPreference: result.data.renewableEnergyPreference,
        supplierRatingPreference: result.data.supplierRatingPreference,
        contractTypePreference: result.data.contractTypePreference as 'fixed' | 'variable' | 'indexed' | 'hybrid' | null,
        earlyTerminationFeeTolerance: result.data.earlyTerminationFeeTolerance,
        budgetConstraints: result.data.maxMonthlyCost || result.data.maxAnnualCost
          ? {
              maxMonthlyCost: result.data.maxMonthlyCost || undefined,
              maxAnnualCost: result.data.maxAnnualCost || undefined,
            }
          : undefined,
        sustainabilityGoals: result.data.sustainabilityGoals?.filter((s): s is string => s !== null) || undefined,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      };
    } catch (error) {
      console.error('Error creating user preferences:', error);
      throw error;
    }
  }

  /**
   * Get usage patterns
   */
  async getUsagePatterns(userId: string): Promise<UsagePattern[]> {
    if (USE_MOCK_API) {
      return mockApi.getUsagePatterns(userId);
    }

    try {
      const result = await dataClient.models.UsagePattern.list({
        filter: {
          userId: { eq: userId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      if (!result.data) {
        return [];
      }

      // Map from Amplify models to shared types
      return result.data.map((pattern) => ({
        userId: pattern.userId,
        patternId: pattern.patternId,
        patternData: {
          averageMonthlyKwh: pattern.averageMonthlyKwh,
          peakMonth: pattern.peakMonth,
          peakMonthKwh: pattern.peakMonthKwh,
          seasonalVariation: pattern.seasonalVariation,
          usageTrend: pattern.usageTrend as 'increasing' | 'decreasing' | 'stable',
          peakUsageMonths: pattern.peakUsageMonths?.filter((m): m is string => m !== null) || [],
          lowUsageMonths: pattern.lowUsageMonths?.filter((m): m is string => m !== null) || [],
        },
        createdAt: pattern.createdAt,
        updatedAt: pattern.updatedAt,
      }));
    } catch (error) {
      console.error('Error fetching usage patterns:', error);
      throw error;
    }
  }

  /**
   * Create usage pattern
   */
  async createUsagePattern(
    request: CreateUsagePatternRequest
  ): Promise<UsagePattern> {
    if (USE_MOCK_API) {
      return mockApi.createUsagePattern(request);
    }

    try {
      const now = new Date().toISOString();
      const patternId = `pattern-${Date.now()}`;
      const result = await dataClient.models.UsagePattern.create({
        userId: request.userId,
        patternId,
        averageMonthlyKwh: request.patternData.averageMonthlyKwh,
        peakMonth: request.patternData.peakMonth,
        peakMonthKwh: request.patternData.peakMonthKwh,
        seasonalVariation: request.patternData.seasonalVariation,
        usageTrend: request.patternData.usageTrend,
        peakUsageMonths: request.patternData.peakUsageMonths,
        lowUsageMonths: request.patternData.lowUsageMonths,
        createdAt: now,
        updatedAt: now,
      });

      if (!result.data) {
        throw new Error('Failed to create usage pattern');
      }

      // Map from Amplify model to shared type
      return {
        userId: result.data.userId,
        patternId: result.data.patternId,
        patternData: {
          averageMonthlyKwh: result.data.averageMonthlyKwh,
          peakMonth: result.data.peakMonth,
          peakMonthKwh: result.data.peakMonthKwh,
          seasonalVariation: result.data.seasonalVariation,
          usageTrend: result.data.usageTrend as 'increasing' | 'decreasing' | 'stable',
          peakUsageMonths: result.data.peakUsageMonths?.filter((m): m is string => m !== null) || [],
          lowUsageMonths: result.data.lowUsageMonths?.filter((m): m is string => m !== null) || [],
        },
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      };
    } catch (error) {
      console.error('Error creating usage pattern:', error);
      throw error;
    }
  }

  /**
   * Get recommendation history
   */
  async getRecommendationHistory(userId: string) {
    if (USE_MOCK_API) {
      return mockApi.getRecommendationHistory(userId);
    }

    try {
      const result = await dataClient.models.RecommendationHistory.list({
        filter: {
          userId: { eq: userId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      if (!result.data) {
        return [];
      }

      return result.data.map((history) => ({
        userId: history.userId,
        recommendationId: history.recommendationId,
        planId: history.planId,
        rank: history.rank,
        projectedSavings: history.projectedSavings,
        explanation: history.explanation,
        selected: history.selected,
        createdAt: history.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching recommendation history:', error);
      throw error;
    }
  }

  /**
   * Create recommendation history entry
   */
  async createRecommendationHistory(
    request: CreateRecommendationHistoryRequest
  ) {
    if (USE_MOCK_API) {
      return mockApi.createRecommendationHistory(request);
    }

    try {
      const now = new Date().toISOString();
      const result = await dataClient.models.RecommendationHistory.create({
        userId: request.userId,
        recommendationId: request.recommendationId,
        planId: request.planId,
        rank: request.rank,
        projectedSavings: request.projectedSavings,
        explanation: request.explanation,
        selected: request.selected || false,
        createdAt: now,
      });

      if (!result.data) {
        throw new Error('Failed to create recommendation history');
      }

      return {
        userId: result.data.userId,
        recommendationId: result.data.recommendationId,
        planId: result.data.planId,
        rank: result.data.rank,
        projectedSavings: result.data.projectedSavings,
        explanation: result.data.explanation,
        selected: result.data.selected,
        createdAt: result.data.createdAt,
      };
    } catch (error) {
      console.error('Error creating recommendation history:', error);
      throw error;
    }
  }

  /**
   * Get feedback
   */
  async getFeedback(userId: string) {
    if (USE_MOCK_API) {
      return mockApi.getFeedback(userId);
    }

    try {
      const result = await dataClient.models.Feedback.list({
        filter: {
          userId: { eq: userId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      if (!result.data) {
        return [];
      }

      return result.data.map((feedback) => ({
        userId: feedback.userId,
        feedbackId: feedback.feedbackId,
        recommendationId: feedback.recommendationId,
        rating: feedback.rating,
        accuracyRating: feedback.accuracyRating || undefined,
        clarityRating: feedback.clarityRating || undefined,
        overallSatisfaction: feedback.overallSatisfaction || undefined,
        comments: feedback.comments || undefined,
        createdAt: feedback.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }
  }

  /**
   * Create feedback
   */
  async createFeedback(request: CreateFeedbackRequest) {
    if (USE_MOCK_API) {
      return mockApi.createFeedback(request);
    }

    try {
      const now = new Date().toISOString();
      const feedbackId = `feedback-${Date.now()}`;
      const result = await dataClient.models.Feedback.create({
        userId: request.userId,
        feedbackId,
        recommendationId: request.recommendationId,
        rating: request.rating,
        accuracyRating: request.accuracyRating,
        clarityRating: request.clarityRating,
        overallSatisfaction: request.overallSatisfaction,
        comments: request.comments,
        createdAt: now,
      });

      if (!result.data) {
        throw new Error('Failed to create feedback');
      }

      return {
        userId: result.data.userId,
        feedbackId: result.data.feedbackId,
        recommendationId: result.data.recommendationId,
        rating: result.data.rating,
        accuracyRating: result.data.accuracyRating || undefined,
        clarityRating: result.data.clarityRating || undefined,
        overallSatisfaction: result.data.overallSatisfaction || undefined,
        comments: result.data.comments || undefined,
        createdAt: result.data.createdAt,
      };
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }
  }
}

/**
 * Export singleton instance
 */
export const apiClient = new ApiClient();

