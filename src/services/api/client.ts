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
  UsageDataPoint,
  CreateUserPreferencesRequest,
  CreateUsagePatternRequest,
  CreateRecommendationHistoryRequest,
  CreateFeedbackRequest,
} from 'shared/types';

/**
 * Check if we should use mock data
 * Set VITE_USE_MOCK_API=true in .env for development
 * In Jest tests, use process.env.VITE_USE_MOCK_API (set before importing this module)
 *
 * Note: In Jest, import.meta is not available, so we check process.env first.
 * In Vite, import.meta.env is available and will be used if process.env is not set.
 *
 * The jest-transform.js file replaces import.meta.env with process.env before compilation.
 */
// Check process.env first (for Jest tests and Node.js)
// The transform will replace import.meta.env with process.env before TypeScript compilation
const USE_MOCK_API =
  (typeof process !== 'undefined' &&
    process.env?.VITE_USE_MOCK_API === 'true') ||
  // This will be transformed to process.env by jest-transform.js in test environment
  import.meta?.env?.VITE_USE_MOCK_API === 'true';

/**
 * Initialize Amplify Data client
 * Uses Cognito User Pool authentication
 * Lazy initialization to ensure Amplify is configured first
 */
let dataClient: ReturnType<typeof generateClient<Schema>> | null = null;

const getDataClient = () => {
  if (!dataClient) {
    // Ensure Amplify is configured
    try {
      dataClient = generateClient<Schema>({
        authMode: 'userPool',
      });
    } catch (error) {
      console.error('Failed to initialize Amplify Data client:', error);
      throw new Error(
        'Amplify has not been configured. Please call Amplify.configure() before using this service.'
      );
    }
  }
  return dataClient;
};

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
      const plans = await getDataClient().models.EnergyPlan.list({
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

      // Get the most recent usage data for the user
      const result = await getDataClient().models.CustomerUsageData.list({
        filter: { userId: { eq: userId } },
      });

      if (result.data && result.data.length > 0) {
        // Sort by createdAt descending and get the most recent
        const sorted = result.data.sort(
          (a: { createdAt: string }, b: { createdAt: string }) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const latest = sorted[0];

        // Convert to CustomerUsageData format
        // usagePoints is stored as a JSON string (AWSJSON type), so we need to parse it
        let usagePoints: UsageDataPoint[] = [];
        if (latest.usagePoints) {
          if (typeof latest.usagePoints === 'string') {
            // Parse JSON string back to array
            try {
              usagePoints = JSON.parse(latest.usagePoints) as UsageDataPoint[];
            } catch (e) {
              console.error(
                '[getUsageData] Failed to parse usagePoints JSON:',
                e
              );
              usagePoints = [];
            }
          } else if (Array.isArray(latest.usagePoints)) {
            // Already an array (shouldn't happen with AWSJSON, but handle it)
            usagePoints = latest.usagePoints as UsageDataPoint[];
          }
        }
        const billingInfo: Record<string, unknown> =
          (latest.billingInfo as Record<string, unknown>) || {};

        // If user wants to use custom averages, use those instead of calculated values
        let averageMonthlyKwh: number;
        let averageMonthlyCost: number;
        let totalKwh: number;
        let totalCost: number;

        if (useCustomAverages && customAverageKwh) {
          // Use custom averages
          averageMonthlyKwh = customAverageKwh;
          averageMonthlyCost = customAverageCost || 0;
          totalKwh = averageMonthlyKwh * 12;
          totalCost = averageMonthlyCost * 12;
        } else {
          // Use calculated averages from usage data
          averageMonthlyKwh = latest.averageMonthlyKwh ?? 0;
          totalKwh = latest.totalAnnualKwh ?? 0;

          // Calculate totalCost and averageMonthlyCost from usage points if available
          if (usagePoints.length > 0) {
            totalCost = usagePoints.reduce(
              (sum: number, point: UsageDataPoint) => sum + (point.cost || 0),
              0
            );
            averageMonthlyCost = totalCost / usagePoints.length;
          } else {
            // Fallback to stored values or calculate from annual kWh if we have a rate
            const annualKwh = totalKwh;
            const currentPlan = billingInfo.currentPlan as
              | { ratePerKwh?: number }
              | undefined;
            const ratePerKwh = currentPlan?.ratePerKwh;
            if (ratePerKwh && annualKwh > 0) {
              totalCost = annualKwh * ratePerKwh;
              averageMonthlyCost = totalCost / 12;
            } else {
              totalCost = 0;
              averageMonthlyCost = 0;
            }
          }
        }

        const usageDataResult: CustomerUsageData = {
          customerInfo: {
            customerId: userId,
            address: {},
          },
          utilityInfo: {
            utilityName:
              (billingInfo.currentPlan as { supplierName?: string })
                ?.supplierName || 'Unknown',
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
          billingInfo: billingInfo as CustomerUsageData['billingInfo'],
        };

        return usageDataResult;
      }

      // No usage data found - check if user wants to use custom averages
      if (useCustomAverages && customAverageKwh) {
        const averageMonthlyKwh = customAverageKwh;
        const averageMonthlyCost = customAverageCost || 0;
        const totalKwh = averageMonthlyKwh * 12;
        const totalCost = averageMonthlyCost * 12;

        // Generate usage points from custom averages
        const usagePoints: UsageDataPoint[] = [];
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

      // Parse response (whether success or error)
      const result = (await response.json()) as {
        success: boolean;
        extractedData?: CustomerUsageData;
        error?: string;
      };

      if (!response.ok || !result.success || !result.extractedData) {
        const errorMsg =
          result.error || `Function call failed: ${response.statusText}`;
        console.error('[readStatement] Lambda function error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
          result,
        });
        throw new Error(errorMsg);
      }

      return result.extractedData;
    } catch (error) {
      console.error('Error reading statement:', error);
      // Don't fallback to mock data - throw the error so the UI can handle it
      throw error;
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
      const functionUrl = (
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
        throw new Error(
          `Function call failed: ${response.statusText} - ${errorText}`
        );
      }

      // Parse response - Lambda Function URL returns the body directly as JSON
      const result = await response.json();

      if (!result.success || !result.recommendations) {
        throw new Error(result.error || 'Failed to generate recommendations');
      }

      // Map to Recommendation format with required fields
      const now = new Date().toISOString();
      return result.recommendations.map(
        (rec: {
          planId: string;
          rank: number;
          projectedSavings: number;
          explanation: string;
        }) => ({
          recommendationId: `rec-${Date.now()}-${rec.rank}`,
          planId: rec.planId,
          rank: rec.rank,
          projectedSavings: rec.projectedSavings,
          explanation: rec.explanation,
          createdAt: now,
        })
      );
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
      const result = await getDataClient().models.UserPreferences.list({
        filter: { userId: { eq: userId } },
      });

      if (!result.data || result.data.length === 0) {
        return null;
      }

      // Get the most recent preferences (should only be one, but just in case)
      const preferences = result.data[0];

      // Map from Amplify model to shared type
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

      // Check if preferences already exist
      const existing = await getDataClient().models.UserPreferences.list({
        filter: { userId: { eq: request.userId } },
      });

      let result;
      if (existing.data && existing.data.length > 0) {
        // Update existing preferences
        const existingPrefs = existing.data[0];
        result = await getDataClient().models.UserPreferences.update({
          id: existingPrefs.id,
          costSavingsPriority: request.preferences.costSavingsPriority,
          flexibilityPreference: request.preferences.flexibilityPreference,
          renewableEnergyPreference:
            request.preferences.renewableEnergyPreference,
          supplierRatingPreference:
            request.preferences.supplierRatingPreference,
          contractTypePreference:
            request.preferences.contractTypePreference || null,
          earlyTerminationFeeTolerance:
            request.preferences.earlyTerminationFeeTolerance,
          maxMonthlyCost: request.preferences.budgetConstraints?.maxMonthlyCost,
          maxAnnualCost: request.preferences.budgetConstraints?.maxAnnualCost,
          sustainabilityGoals: request.preferences.sustainabilityGoals,
          updatedAt: now,
          // Keep original createdAt
          createdAt: existingPrefs.createdAt,
        });
      } else {
        // Create new preferences
        result = await getDataClient().models.UserPreferences.create({
          userId: request.userId,
          costSavingsPriority: request.preferences.costSavingsPriority,
          flexibilityPreference: request.preferences.flexibilityPreference,
          renewableEnergyPreference:
            request.preferences.renewableEnergyPreference,
          supplierRatingPreference:
            request.preferences.supplierRatingPreference,
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
      }

      if (!result.data) {
        throw new Error('Failed to create/update user preferences');
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
      console.error('Error creating/updating user preferences:', error);
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
      const result = await getDataClient().models.UsagePattern.list({
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
      const result = await getDataClient().models.UsagePattern.create({
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
      const result = await getDataClient().models.RecommendationHistory.list({
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
      const result = await getDataClient().models.RecommendationHistory.create({
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
      const result = await getDataClient().models.Feedback.list({
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
   * Get customer satisfaction data for a plan
   * Aggregates feedback ratings for all recommendations of a given plan
   */
  async getPlanSatisfaction(planId: string): Promise<{
    averageRating: number;
    reviewCount: number;
  } | null> {
    if (USE_MOCK_API) {
      // Return mock satisfaction data
      return {
        averageRating: 4.2,
        reviewCount: 15,
      };
    }

    try {
      // Get all recommendation history entries for this plan
      const recommendationHistory =
        await getDataClient().models.RecommendationHistory.list({
          filter: {
            planId: { eq: planId },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });

      if (
        !recommendationHistory.data ||
        recommendationHistory.data.length === 0
      ) {
        return null;
      }

      // Get all recommendation IDs
      const recommendationIds = recommendationHistory.data.map(
        rec => rec.recommendationId
      );

      // Get all feedback for these recommendations
      // Note: We need to query feedback for each recommendationId
      // Since Amplify doesn't support "IN" queries easily, we'll fetch all feedback
      // and filter client-side (for now - could be optimized later)
      const allFeedback = await getDataClient().models.Feedback.list({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      if (!allFeedback.data) {
        return null;
      }

      // Filter feedback for our recommendation IDs and aggregate
      const relevantFeedback = allFeedback.data.filter(fb =>
        recommendationIds.includes(fb.recommendationId)
      );

      if (relevantFeedback.length === 0) {
        return null;
      }

      // Calculate average rating (use overallSatisfaction if available, otherwise rating)
      const ratings = relevantFeedback.map(
        fb => fb.overallSatisfaction || fb.rating
      );
      const averageRating =
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

      return {
        averageRating,
        reviewCount: relevantFeedback.length,
      };
    } catch (error) {
      console.error('Error fetching plan satisfaction:', error);
      // Don't throw - return null so UI can handle gracefully
      return null;
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
      const result = await getDataClient().models.Feedback.create({
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
  async saveCurrentPlan(
    userId: string,
    currentPlan: {
      supplierName: string;
      planName?: string;
      contractStartDate?: string;
      contractEndDate?: string;
      earlyTerminationFee?: number;
      contractType?: string;
    }
  ): Promise<void> {
    if (USE_MOCK_API) {
      return Promise.resolve();
    }

    try {
      // Use Amplify Data API directly to avoid CORS issues with Lambda function URLs
      const existing = await getDataClient().models.CurrentPlan.list({
        filter: { userId: { eq: userId } },
      });

      const now = new Date().toISOString();
      if (existing.data && existing.data.length > 0) {
        // Update existing plan
        await getDataClient().models.CurrentPlan.update({
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
        // Create new plan
        await getDataClient().models.CurrentPlan.create({
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
    } catch (error) {
      console.error('Error saving current plan:', error);
      throw error;
    }
  }

  /**
   * Save usage data
   */
  async saveUsageData(
    userId: string,
    usageData: {
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
    }
  ): Promise<void> {
    if (USE_MOCK_API) {
      return Promise.resolve();
    }

    try {
      // Use Amplify Data API directly to avoid CORS issues with Lambda function URLs
      const now = new Date().toISOString();

      // Check if there's existing usage data for this user
      const existingData = await getDataClient().models.CustomerUsageData.list({
        filter: { userId: { eq: userId } },
      });

      if (existingData.data && existingData.data.length > 0) {
        // Get the most recent record
        const sorted = existingData.data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const latest = sorted[0];

        // Merge usage points: combine existing and new, removing duplicates by timestamp
        // Parse existing points from JSON string (AWSJSON type)
        let existingPoints: UsageDataPoint[] = [];
        if (latest.usagePoints) {
          if (typeof latest.usagePoints === 'string') {
            try {
              existingPoints = JSON.parse(
                latest.usagePoints
              ) as UsageDataPoint[];
            } catch (e) {
              console.error(
                '[saveUsageData] Failed to parse existing usagePoints JSON:',
                e
              );
              existingPoints = [];
            }
          } else if (Array.isArray(latest.usagePoints)) {
            existingPoints = latest.usagePoints as UsageDataPoint[];
          }
        }
        const newPoints = usageData.usagePoints;

        // Create a map of existing points by timestamp (month/year)
        // Extract month/year directly from ISO string to avoid timezone issues
        const getMonthYearKey = (timestamp: string): string => {
          // Parse ISO string directly: YYYY-MM-DDTHH:mm:ss.sssZ
          const match = timestamp.match(/^(\d{4})-(\d{2})-/);
          if (match) {
            const year = match[1];
            const month = parseInt(match[2], 10) - 1; // Convert to 0-indexed
            return `${year}-${month}`;
          }
          // Fallback to Date parsing if format is different
          const date = new Date(timestamp);
          return `${date.getFullYear()}-${date.getMonth()}`;
        };

        const pointsMap = new Map<
          string,
          { timestamp: string; kwh: number; cost?: number }
        >();
        existingPoints.forEach(
          (point: { timestamp: string; kwh: number; cost?: number }) => {
            const key = getMonthYearKey(point.timestamp);
            pointsMap.set(key, point);
          }
        );

        // Overwrite with new points (they take precedence)
        newPoints.forEach(
          (point: { timestamp: string; kwh: number; cost?: number }) => {
            const key = getMonthYearKey(point.timestamp);
            pointsMap.set(key, point);
          }
        );

        // Convert map back to array and sort by timestamp
        const mergedPoints = Array.from(pointsMap.values()).sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Ensure usagePoints is a plain array for JSON field
        const mergedPointsData = mergedPoints.map(point => {
          const plainPoint: Record<string, unknown> = {
            timestamp: point.timestamp,
            kwh: point.kwh,
          };
          // Only include cost if it's defined
          if (point.cost !== undefined && point.cost !== null) {
            plainPoint.cost = point.cost;
          }
          return plainPoint;
        });

        // AWSJSON scalar type requires a JSON string
        const mergedPointsJson = JSON.stringify(mergedPointsData);

        // Update the existing record
        await getDataClient().models.CustomerUsageData.update({
          id: latest.id,
          usagePoints: mergedPointsJson, // AWSJSON expects a JSON string
          totalAnnualKwh:
            usageData.totalAnnualKwh || latest.totalAnnualKwh || null,
          averageMonthlyKwh:
            usageData.averageMonthlyKwh || latest.averageMonthlyKwh || null,
          peakMonthKwh: usageData.peakMonthKwh || latest.peakMonthKwh || null,
          peakMonth: usageData.peakMonth || latest.peakMonth || null,
          billingInfo:
            (usageData.billingInfo as Record<string, unknown>) ||
            latest.billingInfo ||
            null,
          updatedAt: now,
        });
      } else {
        // No existing data, create a new record
        const usageDataId = `usage-${userId}-${Date.now()}`;
        // Ensure usagePoints is a plain array with only the required fields
        // AWSJSON type in GraphQL expects a JSON string, not a JavaScript object
        const usagePointsData = usageData.usagePoints.map(point => {
          const plainPoint: Record<string, unknown> = {
            timestamp: point.timestamp,
            kwh: point.kwh,
          };
          // Only include cost if it's defined
          if (point.cost !== undefined && point.cost !== null) {
            plainPoint.cost = point.cost;
          }
          return plainPoint;
        });

        // AWSJSON scalar type requires a JSON string
        const usagePointsJson = JSON.stringify(usagePointsData);

        const createData = {
          userId,
          usageDataId,
          usagePoints: usagePointsJson, // AWSJSON expects a JSON string
          totalAnnualKwh: usageData.totalAnnualKwh || null,
          averageMonthlyKwh: usageData.averageMonthlyKwh || null,
          peakMonthKwh: usageData.peakMonthKwh || null,
          peakMonth: usageData.peakMonth || null,
          billingInfo:
            (usageData.billingInfo as Record<string, unknown>) || null,
          createdAt: now,
          updatedAt: now,
        };
        const createResult =
          await getDataClient().models.CustomerUsageData.create(createData);

        if (createResult.errors && createResult.errors.length > 0) {
          throw new Error(
            `Failed to create usage data: ${JSON.stringify(createResult.errors)}`
          );
        }

        if (!createResult.data) {
          throw new Error('Failed to create usage data: No data returned');
        }
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
      const result = await getDataClient().models.CurrentPlan.list({
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
    address?: Record<string, unknown>;
    useCustomAverages?: boolean;
    customAverageKwh?: number;
    customAverageCost?: number;
  } | null> {
    if (USE_MOCK_API) {
      return { state: 'CA' };
    }

    try {
      const result = await getDataClient().models.UserProfile.list({
        filter: { userId: { eq: userId } },
      });

      if (result.data && result.data.length > 0) {
        const profile = result.data[0];
        return {
          state: profile.state || undefined,
          address:
            (profile.address as Record<string, unknown> | undefined) ||
            undefined,
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
  async saveUserProfile(
    userId: string,
    profile: {
      state?: string;
      address?: Record<string, unknown>;
      useCustomAverages?: boolean;
      customAverageKwh?: number;
      customAverageCost?: number;
    }
  ): Promise<void> {
    if (USE_MOCK_API) {
      return Promise.resolve();
    }

    try {
      const existing = await getDataClient().models.UserProfile.list({
        filter: { userId: { eq: userId } },
      });

      const now = new Date().toISOString();
      if (existing.data && existing.data.length > 0) {
        await getDataClient().models.UserProfile.update({
          id: existing.data[0].id,
          state:
            profile.state !== undefined ? profile.state || null : undefined,
          address:
            profile.address !== undefined ? profile.address || null : undefined,
          useCustomAverages:
            profile.useCustomAverages !== undefined
              ? profile.useCustomAverages
              : undefined,
          customAverageKwh:
            profile.customAverageKwh !== undefined
              ? profile.customAverageKwh || null
              : undefined,
          customAverageCost:
            profile.customAverageCost !== undefined
              ? profile.customAverageCost || null
              : undefined,
          updatedAt: now,
        });
      } else {
        await getDataClient().models.UserProfile.create({
          userId,
          state: profile.state || null,
          address: profile.address || null,
          useCustomAverages: profile.useCustomAverages ?? null,
          customAverageKwh: profile.customAverageKwh || null,
          customAverageCost: profile.customAverageCost || null,
          createdAt: now,
          updatedAt: now,
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
