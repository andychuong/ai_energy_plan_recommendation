/**
 * API Client
 *
 * This is the real API client that connects to the backend.
 * Uses Amplify Data API for DynamoDB operations and Lambda functions for recommendations.
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { mockApi } from '../mock/mockApi';
import outputs from '../../../amplify_outputs.json';
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
  async getEnergyPlans(state?: string): Promise<EnergyPlan[]> {
    // If no state provided, try to get from user profile
    let targetState = state;
    if (!targetState && !USE_MOCK_API) {
      // Try to get from current user's profile
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        const userId = session.userSub;
        if (userId) {
          const profile = await this.getUserProfile(userId);
          targetState = profile?.state || 'CA'; // Default to CA if no profile
        } else {
          targetState = 'CA'; // Default fallback
        }
      } catch {
        targetState = 'CA'; // Default fallback
      }
    } else if (!targetState) {
      targetState = 'CA'; // Mock API default
    }

    if (USE_MOCK_API) {
      return mockApi.getEnergyPlans(targetState);
    }

    try {
      // Query DynamoDB for plans by state
      const plans = await dataClient.models.EnergyPlan.list({
        filter: {
          state: { eq: targetState },
        },
      });

      if (plans.data && plans.data.length > 0) {
        // Convert to EnergyPlan format
        return plans.data.map(plan => ({
          planId: plan.planId,
          supplierName: plan.supplierName,
          planName: plan.planName,
          ratePerKwh: plan.ratePerKwh,
          contractType: plan.contractType as
            | 'fixed'
            | 'variable'
            | 'indexed'
            | 'hybrid',
          contractLengthMonths: plan.contractLengthMonths || undefined,
          renewablePercentage: plan.renewablePercentage || undefined,
          earlyTerminationFee: plan.earlyTerminationFee || undefined,
          supplierRating: plan.supplierRating || undefined,
          state: plan.state,
          utilityTerritory: plan.utilityTerritory || undefined,
        }));
      }

      // If no plans found, trigger catalog update and return mock data as fallback
      console.warn(
        `No plans found for ${targetState}, triggering catalog update. Using mock data as fallback.`
      );

      // Trigger catalog update in background (don't wait)
      this.updatePlanCatalog([targetState]).catch(err => {
        console.error('Error updating plan catalog:', err);
      });

      return mockApi.getEnergyPlans(targetState);
    } catch (error) {
      console.error('Error fetching energy plans:', error);
      // Fallback to mock data on error
      return mockApi.getEnergyPlans(targetState);
    }
  }

  /**
   * Update plan catalog for specific states
   */
  async updatePlanCatalog(states: string[]): Promise<void> {
    if (USE_MOCK_API) {
      return;
    }

    try {
      // Invoke Lambda function to update catalog
      const functionUrl = (
        outputs as { custom?: { [key: string]: { url?: string } } }
      ).custom?.updatePlanCatalogFunction?.url;

      if (!functionUrl) {
        console.warn(
          'Function URL not available in outputs. Deploy backend to get function URLs.'
        );
        return;
      }

      // Get current user's auth token for the request
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          sources: ['eia', 'openei'],
          states,
        }),
      });
    } catch (error) {
      console.error('Error updating plan catalog:', error);
    }
  }

  /**
   * Get customer usage data
   */
  async getUsageData(userId: string): Promise<CustomerUsageData> {
    if (USE_MOCK_API) {
      return mockApi.getUsageData(userId);
    }

    try {
      // Get user profile to check for custom averages
      const profile = await this.getUserProfile(userId);
      const useCustomAverages = profile?.useCustomAverages || false;
      const customAverageKwh = profile?.customAverageKwh;
      const customAverageCost = profile?.customAverageCost;
      console.log('[getUsageData] User profile:', { 
        useCustomAverages, 
        customAverageKwh, 
        customAverageCost,
        useCustomAveragesType: typeof useCustomAverages,
        customAverageKwhType: typeof customAverageKwh,
        customAverageKwhValue: customAverageKwh,
        conditionCheck: useCustomAverages && customAverageKwh,
      });

      // Get the most recent usage data for the user
      const result = await dataClient.models.CustomerUsageData.list({
        filter: { userId: { eq: userId } },
      });

      if (result.data && result.data.length > 0) {
        // Sort by createdAt descending and get the most recent
        const sorted = result.data.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const latest = sorted[0];

        // Convert to CustomerUsageData format
        const usagePoints = (latest.usagePoints as any) || [];
        const billingInfo = (latest.billingInfo as any) || {};

        // If user wants to use custom averages, use those instead of calculated values
        let averageMonthlyKwh: number;
        let averageMonthlyCost: number;
        let totalKwh: number;
        let totalCost: number;

        console.log('[getUsageData] Checking custom averages condition:', { 
          useCustomAverages, 
          customAverageKwh, 
          condition: useCustomAverages && customAverageKwh 
        });

        if (useCustomAverages && customAverageKwh) {
          // Use custom averages
          console.log('[getUsageData] Using custom averages:', { customAverageKwh, customAverageCost });
          averageMonthlyKwh = customAverageKwh;
          averageMonthlyCost = customAverageCost || 0;
          totalKwh = averageMonthlyKwh * 12;
          totalCost = averageMonthlyCost * 12;
        } else {
          console.log('[getUsageData] NOT using custom averages, using calculated values');
          // Use calculated averages from usage data
          averageMonthlyKwh = latest.averageMonthlyKwh || 0;
          totalKwh = latest.totalAnnualKwh || 0;

          // Calculate totalCost and averageMonthlyCost from usage points if available
          if (usagePoints.length > 0) {
            totalCost = usagePoints.reduce((sum: number, point: any) => sum + (point.cost || 0), 0);
            averageMonthlyCost = totalCost / usagePoints.length;
          } else {
            // Fallback to stored values or calculate from annual kWh if we have a rate
            const annualKwh = totalKwh;
            const ratePerKwh = billingInfo.currentPlan?.ratePerKwh;
            if (ratePerKwh && annualKwh > 0) {
              totalCost = annualKwh * ratePerKwh;
              averageMonthlyCost = totalCost / 12;
            } else {
              totalCost = 0;
              averageMonthlyCost = 0;
            }
          }
        }

        const result = {
          customerInfo: {
            customerId: userId,
            address: {},
          },
          utilityInfo: {
            utilityName: billingInfo.currentPlan?.supplierName || 'Unknown',
          },
          usageDataPoints: usagePoints,
          aggregatedStats: {
            totalKwh,
            totalCost,
            averageMonthlyKwh,
            averageMonthlyCost,
            peakMonth: latest.peakMonth || 'Unknown',
            peakMonthKwh: latest.peakMonthKwh || 0,
          },
          billingInfo: billingInfo,
        };
        
        console.log('[getUsageData] Returning result with aggregatedStats:', result.aggregatedStats);
        return result;
      }

      // No usage data found - check if user wants to use custom averages
      if (useCustomAverages && customAverageKwh) {
        console.log('[getUsageData] No usage data, but using custom averages:', { customAverageKwh, customAverageCost });
        const averageMonthlyKwh = customAverageKwh;
        const averageMonthlyCost = customAverageCost || 0;
        const totalKwh = averageMonthlyKwh * 12;
        const totalCost = averageMonthlyCost * 12;
        
        // Generate usage points from custom averages
        const usagePoints: any[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
          usagePoints.push({
            timestamp: date.toISOString(),
            kwh: averageMonthlyKwh,
            cost: averageMonthlyCost || undefined,
          });
        }
        
        const result = {
          customerInfo: {
            customerId: userId,
            address: {},
          },
          utilityInfo: {
            utilityName: 'Unknown',
          },
          usageDataPoints: usagePoints,
          aggregatedStats: {
            totalKwh,
            totalCost,
            averageMonthlyKwh,
            averageMonthlyCost,
            peakMonth: 'Average',
            peakMonthKwh: averageMonthlyKwh,
          },
        };
        
        console.log('[getUsageData] Returning result with custom averages (no usage data):', result.aggregatedStats);
        return result;
      }
      
      // No data found and no custom averages, return empty structure
      return {
        customerInfo: {
          customerId: userId,
          address: {},
        },
        utilityInfo: {
          utilityName: 'Unknown',
        },
        usageDataPoints: [],
        aggregatedStats: {
          totalKwh: 0,
          totalCost: 0,
          averageMonthlyKwh: 0,
          averageMonthlyCost: 0,
          peakMonth: 'Unknown',
          peakMonthKwh: 0,
        },
      };
    } catch (error) {
      console.error('Error fetching usage data:', error);
      // Fallback to mock data on error
      return mockApi.getUsageData(userId);
    }
  }

  /**
   * Read energy bill statement using AI
   * Supports PDF, images (PNG, JPG), and text formats
   */
  async readStatement(userId: string, file: File): Promise<CustomerUsageData> {
    if (USE_MOCK_API) {
      // For mock, return mock data
      return mockApi.getUsageData(userId);
    }

    try {
      // Convert file to base64
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix if present
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Determine file type
      const fileType =
        file.type === 'application/pdf'
          ? 'pdf'
          : file.type.startsWith('image/')
            ? 'image'
            : file.type === 'text/csv' || file.name.endsWith('.csv')
              ? 'csv'
              : 'text';

      // Invoke Lambda function
      const functionUrl = (
        outputs as { custom?: { [key: string]: { url?: string } } }
      ).custom?.readStatementFunction?.url;

      if (!functionUrl) {
        console.warn(
          'Function URL not available in outputs, using mock data. Deploy backend to get function URLs.'
        );
        return mockApi.getUsageData(userId);
      }

      // Get current user's auth token for the request
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          userId,
          statementData: {
            content: base64Content,
            fileType,
            mimeType: file.type,
            filename: file.name,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Function call failed: ${response.statusText}`);
      }

      // Parse response
      const result = (await response.json()) as {
        success: boolean;
        extractedData?: CustomerUsageData;
        error?: string;
      };

      if (!result.success || !result.extractedData) {
        throw new Error(result.error || 'Failed to read statement');
      }

      return result.extractedData;
    } catch (error) {
      console.error('Error reading statement:', error);
      // Fallback to mock data if function call fails
      console.warn('Falling back to mock data due to function error');
      return mockApi.getUsageData(userId);
    }
  }

  /**
   * Generate recommendations
   * Calls Lambda function via Amplify's invokeFunction
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
      // Get user profile for state
      const profile = await this.getUserProfile(userId);
      const state = profile?.state || 'CA';

      const [preferences, plans] = await Promise.all([
        this.getUserPreferences(userId),
        this.getEnergyPlans(state),
      ]);

      if (!preferences) {
        throw new Error(
          'User preferences not found. Please set preferences first.'
        );
      }

      // Invoke Lambda function
      // In Amplify Gen 2, functions are accessed through outputs.custom
      // For now, we'll use fetch to call the function URL if available
      // Otherwise, fall back to mock data
      let functionUrl = (
        outputs as { custom?: { [key: string]: { url?: string } } }
      ).custom?.generateRecommendationsFunction?.url;

      // If not in custom, try to construct from function resource (for development)
      if (!functionUrl) {
        // Try to get from the function resource directly if available
        // This is a fallback for when outputs.custom hasn't been populated yet
        console.warn(
          'Function URL not available in outputs.custom, checking if sandbox is still deploying...'
        );
        // For now, fall back to mock data until sandbox finishes deploying
        return mockApi.generateRecommendations(userId, usageData);
      }

      // Get current user's auth token for the request
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          userId,
          usageData: {
            usageDataPoints: usageData.usageDataPoints,
            aggregatedStats: usageData.aggregatedStats,
          },
          preferences: {
            costSavingsPriority: preferences.costSavingsPriority,
            flexibilityPreference: preferences.flexibilityPreference,
            renewableEnergyPreference: preferences.renewableEnergyPreference,
            supplierRatingPreference: preferences.supplierRatingPreference,
            contractTypePreference: preferences.contractTypePreference,
            earlyTerminationFeeTolerance:
              preferences.earlyTerminationFeeTolerance,
            budgetConstraints: preferences.budgetConstraints,
          },
          availablePlans: plans.map(plan => ({
            planId: plan.planId,
            supplierName: plan.supplierName,
            planName: plan.planName,
            ratePerKwh: plan.ratePerKwh,
            contractType: plan.contractType,
            contractLength: plan.contractLengthMonths,
            renewablePercentage: plan.renewablePercentage,
            earlyTerminationFee: plan.earlyTerminationFee,
            supplierRating: plan.supplierRating,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Function call failed: ${response.statusText} - ${errorText}`);
      }

      // Parse response - Lambda Function URL returns the body directly as JSON
      const result = await response.json();

      if (!result.success || !result.recommendations) {
        throw new Error(result.error || 'Failed to generate recommendations');
      }

      // Map to Recommendation format with required fields
      const now = new Date().toISOString();
      return result.recommendations.map(rec => ({
        recommendationId: `rec-${Date.now()}-${rec.rank}`,
        planId: rec.planId,
        rank: rec.rank,
        projectedSavings: rec.projectedSavings,
        explanation: rec.explanation,
        riskFlags: rec.riskFlags,
        createdAt: now,
      }));
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Fallback to mock data if function call fails
      console.warn('Falling back to mock data due to function error');
      return mockApi.generateRecommendations(userId, usageData);
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
      // UserPreferences uses userId as a field, not as the id
      const result = await dataClient.models.UserPreferences.list({
        filter: { userId: { eq: userId } },
      });

      if (!result.data || result.data.length === 0) {
        console.log('[getUserPreferences] No preferences found for userId:', userId);
        return null;
      }

      // Get the most recent preferences (should only be one, but just in case)
      const preferences = result.data[0];

      // Map from Amplify model to shared type
      console.log('[getUserPreferences] Found preferences:', {
        userId: preferences.userId,
        costSavingsPriority: preferences.costSavingsPriority,
      });
      return {
        userId: preferences.userId,
        costSavingsPriority: preferences.costSavingsPriority as
          | 'high'
          | 'medium'
          | 'low',
        flexibilityPreference: preferences.flexibilityPreference,
        renewableEnergyPreference: preferences.renewableEnergyPreference,
        supplierRatingPreference: preferences.supplierRatingPreference,
        contractTypePreference: preferences.contractTypePreference as
          | 'fixed'
          | 'variable'
          | 'indexed'
          | 'hybrid'
          | null,
        earlyTerminationFeeTolerance: preferences.earlyTerminationFeeTolerance,
        budgetConstraints:
          preferences.maxMonthlyCost || preferences.maxAnnualCost
            ? {
                maxMonthlyCost: preferences.maxMonthlyCost || undefined,
                maxAnnualCost: preferences.maxAnnualCost || undefined,
              }
            : undefined,
        sustainabilityGoals:
          preferences.sustainabilityGoals?.filter(
            (s): s is string => s !== null
          ) || undefined,
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt,
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
        renewableEnergyPreference:
          request.preferences.renewableEnergyPreference,
        supplierRatingPreference: request.preferences.supplierRatingPreference,
        contractTypePreference:
          request.preferences.contractTypePreference || null,
        earlyTerminationFeeTolerance:
          request.preferences.earlyTerminationFeeTolerance,
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
        costSavingsPriority: result.data.costSavingsPriority as
          | 'high'
          | 'medium'
          | 'low',
        flexibilityPreference: result.data.flexibilityPreference,
        renewableEnergyPreference: result.data.renewableEnergyPreference,
        supplierRatingPreference: result.data.supplierRatingPreference,
        contractTypePreference: result.data.contractTypePreference as
          | 'fixed'
          | 'variable'
          | 'indexed'
          | 'hybrid'
          | null,
        earlyTerminationFeeTolerance: result.data.earlyTerminationFeeTolerance,
        budgetConstraints:
          result.data.maxMonthlyCost || result.data.maxAnnualCost
            ? {
                maxMonthlyCost: result.data.maxMonthlyCost || undefined,
                maxAnnualCost: result.data.maxAnnualCost || undefined,
              }
            : undefined,
        sustainabilityGoals:
          result.data.sustainabilityGoals?.filter(
            (s): s is string => s !== null
          ) || undefined,
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
      return result.data.map(pattern => ({
        userId: pattern.userId,
        patternId: pattern.patternId,
        patternData: {
          averageMonthlyKwh: pattern.averageMonthlyKwh,
          peakMonth: pattern.peakMonth,
          peakMonthKwh: pattern.peakMonthKwh,
          seasonalVariation: pattern.seasonalVariation,
          usageTrend: pattern.usageTrend as
            | 'increasing'
            | 'decreasing'
            | 'stable',
          peakUsageMonths:
            pattern.peakUsageMonths?.filter((m): m is string => m !== null) ||
            [],
          lowUsageMonths:
            pattern.lowUsageMonths?.filter((m): m is string => m !== null) ||
            [],
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
          usageTrend: result.data.usageTrend as
            | 'increasing'
            | 'decreasing'
            | 'stable',
          peakUsageMonths:
            result.data.peakUsageMonths?.filter(
              (m): m is string => m !== null
            ) || [],
          lowUsageMonths:
            result.data.lowUsageMonths?.filter(
              (m): m is string => m !== null
            ) || [],
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

      return result.data.map(history => ({
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

      return result.data.map(feedback => ({
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

  /**
   * Save current plan
   */
  async saveCurrentPlan(userId: string, currentPlan: {
    supplierName: string;
    planName?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    earlyTerminationFee?: number;
    contractType?: string;
  }): Promise<void> {
    if (USE_MOCK_API) {
      return Promise.resolve();
    }

    try {
      const functionUrl = (
        outputs as { custom?: { [key: string]: { url?: string } } }
      ).custom?.saveCurrentPlanFunction?.url;

      if (!functionUrl) {
        // Fallback to direct data client
        const existing = await dataClient.models.CurrentPlan.list({
          filter: { userId: { eq: userId } },
        });

        const now = new Date().toISOString();
        if (existing.data && existing.data.length > 0) {
          await dataClient.models.CurrentPlan.update({
            id: existing.data[0].id,
            supplierName: currentPlan.supplierName,
            planName: currentPlan.planName || null,
            contractStartDate: currentPlan.contractStartDate || null,
            contractEndDate: currentPlan.contractEndDate || null,
            earlyTerminationFee: currentPlan.earlyTerminationFee || null,
            contractType: currentPlan.contractType || null,
            updatedAt: now,
          });
        } else {
          await dataClient.models.CurrentPlan.create({
            userId,
            supplierName: currentPlan.supplierName,
            planName: currentPlan.planName || null,
            contractStartDate: currentPlan.contractStartDate || null,
            contractEndDate: currentPlan.contractEndDate || null,
            earlyTerminationFee: currentPlan.earlyTerminationFee || null,
            contractType: currentPlan.contractType || null,
            createdAt: now,
            updatedAt: now,
          });
        }
        return;
      }

      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ userId, currentPlan }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save current plan: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save current plan');
      }
    } catch (error) {
      console.error('Error saving current plan:', error);
      throw error;
    }
  }

  /**
   * Save usage data
   */
  async saveUsageData(userId: string, usageData: {
    usagePoints: Array<{ timestamp: string; kwh: number; cost?: number }>;
    totalAnnualKwh?: number;
    averageMonthlyKwh?: number;
    peakMonthKwh?: number;
    peakMonth?: string;
    billingInfo?: {
      currentPlan?: {
        supplierName?: string;
        planName?: string;
        contractStartDate?: string;
        contractEndDate?: string;
        earlyTerminationFee?: number;
        contractType?: string;
      };
    };
  }): Promise<void> {
    if (USE_MOCK_API) {
      return Promise.resolve();
    }

    try {
      const functionUrl = (
        outputs as { custom?: { [key: string]: { url?: string } } }
      ).custom?.saveUsageDataFunction?.url;

      if (!functionUrl) {
        // Fallback to direct data client - update existing or create new
        const now = new Date().toISOString();
        
        // Check if there's existing usage data for this user
        const existingData = await dataClient.models.CustomerUsageData.list({
          filter: { userId: { eq: userId } },
        });

        if (existingData.data && existingData.data.length > 0) {
          // Get the most recent record
          const sorted = existingData.data.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const latest = sorted[0];

          // Merge usage points: combine existing and new, removing duplicates by timestamp
          const existingPoints = (latest.usagePoints as any) || [];
          const newPoints = usageData.usagePoints;
          
          // Create a map of existing points by timestamp (month/year)
          const pointsMap = new Map<string, { timestamp: string; kwh: number; cost?: number }>();
          existingPoints.forEach((point: { timestamp: string; kwh: number; cost?: number }) => {
            const date = new Date(point.timestamp);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            pointsMap.set(key, point);
          });

          // Overwrite with new points (they take precedence)
          newPoints.forEach((point: { timestamp: string; kwh: number; cost?: number }) => {
            const date = new Date(point.timestamp);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            pointsMap.set(key, point);
          });

          // Convert map back to array and sort by timestamp
          const mergedPoints = Array.from(pointsMap.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Update the existing record
          await dataClient.models.CustomerUsageData.update({
            id: latest.id,
            usagePoints: mergedPoints as any,
            totalAnnualKwh: usageData.totalAnnualKwh || latest.totalAnnualKwh || null,
            averageMonthlyKwh: usageData.averageMonthlyKwh || latest.averageMonthlyKwh || null,
            peakMonthKwh: usageData.peakMonthKwh || latest.peakMonthKwh || null,
            peakMonth: usageData.peakMonth || latest.peakMonth || null,
            billingInfo: usageData.billingInfo as any || latest.billingInfo || null,
            updatedAt: now,
          });
        } else {
          // No existing data, create a new record
          const usageDataId = `usage-${userId}-${Date.now()}`;
          await dataClient.models.CustomerUsageData.create({
            userId,
            usageDataId,
            usagePoints: usageData.usagePoints as any,
            totalAnnualKwh: usageData.totalAnnualKwh || null,
            averageMonthlyKwh: usageData.averageMonthlyKwh || null,
            peakMonthKwh: usageData.peakMonthKwh || null,
            peakMonth: usageData.peakMonth || null,
            billingInfo: usageData.billingInfo as any || null,
            createdAt: now,
            updatedAt: now,
          });
        }
        return;
      }

      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ userId, usageData }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save usage data: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save usage data');
      }
    } catch (error) {
      console.error('Error saving usage data:', error);
      throw error;
    }
  }

  /**
   * Get current plan
   */
  async getCurrentPlan(userId: string): Promise<{
    supplierName: string;
    planName?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    earlyTerminationFee?: number;
    contractType?: string;
  } | null> {
    if (USE_MOCK_API) {
      return null;
    }

    try {
      const result = await dataClient.models.CurrentPlan.list({
        filter: { userId: { eq: userId } },
      });

      if (result.data && result.data.length > 0) {
        const plan = result.data[0];
        return {
          supplierName: plan.supplierName,
          planName: plan.planName || undefined,
          contractStartDate: plan.contractStartDate || undefined,
          contractEndDate: plan.contractEndDate || undefined,
          earlyTerminationFee: plan.earlyTerminationFee || undefined,
          contractType: plan.contractType || undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching current plan:', error);
      return null;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<{ 
    state?: string; 
    address?: any;
    useCustomAverages?: boolean;
    customAverageKwh?: number;
    customAverageCost?: number;
  } | null> {
    if (USE_MOCK_API) {
      return { state: 'CA' };
    }

    try {
      const result = await dataClient.models.UserProfile.list({
        filter: { userId: { eq: userId } },
      });

      if (result.data && result.data.length > 0) {
        const profile = result.data[0];
        return {
          state: profile.state || undefined,
          address: profile.address || undefined,
          useCustomAverages: profile.useCustomAverages ?? undefined,
          customAverageKwh: profile.customAverageKwh ?? undefined,
          customAverageCost: profile.customAverageCost ?? undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Save user profile
   */
  async saveUserProfile(userId: string, profile: { 
    state?: string; 
    address?: any;
    useCustomAverages?: boolean;
    customAverageKwh?: number;
    customAverageCost?: number;
  }): Promise<void> {
    if (USE_MOCK_API) {
      return Promise.resolve();
    }

    try {
      const existing = await dataClient.models.UserProfile.list({
        filter: { userId: { eq: userId } },
      });

      const now = new Date().toISOString();
      if (existing.data && existing.data.length > 0) {
        await dataClient.models.UserProfile.update({
          id: existing.data[0].id,
          state: profile.state !== undefined ? (profile.state || null) : undefined,
          address: profile.address !== undefined ? (profile.address || null) : undefined,
          useCustomAverages: profile.useCustomAverages !== undefined ? profile.useCustomAverages : undefined,
          customAverageKwh: profile.customAverageKwh !== undefined ? (profile.customAverageKwh || null) : undefined,
          customAverageCost: profile.customAverageCost !== undefined ? (profile.customAverageCost || null) : undefined,
          updatedAt: now,
        });
        console.log('[saveUserProfile] Updated user profile with custom averages:', { 
          useCustomAverages: profile.useCustomAverages, 
          customAverageKwh: profile.customAverageKwh, 
          customAverageCost: profile.customAverageCost 
        });
      } else {
        await dataClient.models.UserProfile.create({
          userId,
          state: profile.state || null,
          address: profile.address || null,
          useCustomAverages: profile.useCustomAverages ?? null,
          customAverageKwh: profile.customAverageKwh || null,
          customAverageCost: profile.customAverageCost || null,
          createdAt: now,
          updatedAt: now,
        });
        console.log('[saveUserProfile] Created new user profile with custom averages:', { 
          useCustomAverages: profile.useCustomAverages, 
          customAverageKwh: profile.customAverageKwh, 
          customAverageCost: profile.customAverageCost 
        });
      }
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }
}

/**
 * Export singleton instance
 */
export const apiClient = new ApiClient();
