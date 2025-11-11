import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { 
  updatePlanCatalogFunction,
  saveCurrentPlanFunction,
  saveUsageDataFunction,
} from '../api/resource';

/**
 * Define the data schema for the memory bank system
 * This includes DynamoDB tables for:
 * - User Preferences
 * - Usage Patterns
 * - Recommendation History
 * - Feedback
 */
const schema = a.schema({
  /**
   * User Preferences
   * Stores user preferences for personalized recommendations
   */
  UserPreferences: a
    .model({
      userId: a.id().required(),
      costSavingsPriority: a.string().required(), // 'high' | 'medium' | 'low'
      flexibilityPreference: a.integer().required(), // Contract length tolerance in months
      renewableEnergyPreference: a.integer().required(), // Percentage desired (0-100)
      supplierRatingPreference: a.float().required(), // Minimum rating threshold (0-5)
      contractTypePreference: a.string(), // 'fixed' | 'variable' | 'indexed' | 'hybrid' | null
      earlyTerminationFeeTolerance: a.integer().required(), // Maximum acceptable fee
      maxMonthlyCost: a.float(), // Optional budget constraint
      maxAnnualCost: a.float(), // Optional budget constraint
      sustainabilityGoals: a.string().array(), // Array of sustainability goals
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner(), // Users can only access their own preferences
    ]),

  /**
   * Usage Patterns
   * Tracks user's energy usage patterns for seasonal analysis
   */
  UsagePattern: a
    .model({
      userId: a.id().required(),
      patternId: a.id().required(),
      averageMonthlyKwh: a.float().required(),
      peakMonth: a.string().required(),
      peakMonthKwh: a.float().required(),
      seasonalVariation: a.float().required(),
      usageTrend: a.string().required(), // 'increasing' | 'decreasing' | 'stable'
      peakUsageMonths: a.string().array().required(),
      lowUsageMonths: a.string().array().required(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner(), // Users can only access their own patterns
    ]),

  /**
   * Recommendation History
   * Maintains history of recommendations shown to users
   */
  RecommendationHistory: a
    .model({
      userId: a.id().required(),
      recommendationId: a.id().required(),
      planId: a.string().required(),
      rank: a.integer().required(),
      projectedSavings: a.float().required(),
      explanation: a.string().required(),
      selected: a.boolean().required(),
      createdAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner(), // Users can only access their own history
    ]),

  /**
   * Feedback
   * Stores user feedback on recommendations
   */
  Feedback: a
    .model({
      userId: a.id().required(),
      feedbackId: a.id().required(),
      recommendationId: a.string().required(),
      rating: a.integer().required(), // 1-5 stars
      accuracyRating: a.integer(), // 1-5 stars (optional)
      clarityRating: a.integer(), // 1-5 stars (optional)
      overallSatisfaction: a.integer(), // 1-5 stars (optional)
      comments: a.string(), // Optional comments
      createdAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner(), // Users can only access their own feedback
    ]),

  /**
   * Energy Plans
   * Stores energy plans from various suppliers
   * Public data - readable by all authenticated users
   */
  EnergyPlan: a
    .model({
      planId: a.string().required(), // Custom plan ID (not the primary key)
      supplierName: a.string().required(),
      planName: a.string().required(),
      ratePerKwh: a.float().required(),
      contractType: a.string().required(), // 'fixed' | 'variable' | 'indexed' | 'hybrid'
      contractLengthMonths: a.integer(), // Optional contract length
      renewablePercentage: a.integer(), // Optional renewable energy percentage
      earlyTerminationFee: a.float(), // Optional early termination fee
      supplierRating: a.float(), // Optional supplier rating (0-5)
      state: a.string().required(), // State code (e.g., 'CA', 'TX')
      utilityTerritory: a.string(), // Optional utility territory
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read', 'create', 'update', 'delete']), // Authenticated users can read and modify
    ]),

  /**
   * Current Plan
   * Stores user's current energy plan information
   */
  CurrentPlan: a
    .model({
      userId: a.id().required(),
      supplierName: a.string().required(),
      planName: a.string(),
      contractStartDate: a.string(),
      contractEndDate: a.string(),
      earlyTerminationFee: a.float(),
      contractType: a.string(), // 'fixed' | 'variable' | 'indexed' | 'hybrid'
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner(), // Users can only access their own current plan
    ]),

  /**
   * Customer Usage Data
   * Stores user's energy usage data with billing information
   */
  CustomerUsageData: a
    .model({
      userId: a.id().required(),
      usageDataId: a.id().required(),
      usagePoints: a.json().required(), // Array of UsageDataPoint
      totalAnnualKwh: a.float(),
      averageMonthlyKwh: a.float(),
      peakMonthKwh: a.float(),
      peakMonth: a.string(),
      billingInfo: a.json(), // Billing information including current plan
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner(), // Users can only access their own usage data
    ]),

  /**
   * User Profile
   * Stores user profile information including state and usage data preferences
   */
  UserProfile: a
    .model({
      userId: a.id().required(),
      state: a.string(), // State code (e.g., 'CA', 'TX')
      address: a.json(), // Address information
      useCustomAverages: a.boolean(), // Whether user wants to use custom averages instead of calculated
      customAverageKwh: a.float(), // Custom average monthly kWh
      customAverageCost: a.float(), // Custom average monthly cost
      createdAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner(), // Users can only access their own profile
    ]),
})
  .authorization((allow) => [
    allow.resource(updatePlanCatalogFunction).to(['query', 'mutate']), // Function can query and mutate all models
    allow.resource(saveCurrentPlanFunction).to(['query', 'mutate']), // Function can query and mutate all models
    allow.resource(saveUsageDataFunction).to(['query', 'mutate']), // Function can query and mutate all models
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

