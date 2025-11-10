import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

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
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

