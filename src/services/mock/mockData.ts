/**
 * Mock Data for Frontend Development
 *
 * This file contains mock data generators for development.
 * Switch to real API when backend is ready.
 */

import type {
  EnergyPlan,
  CustomerUsageData,
  Recommendation,
  UserPreferences,
  UsagePattern,
} from 'shared/types';

/**
 * Generate mock energy plans
 */
export function generateMockPlans(): EnergyPlan[] {
  return [
    {
      planId: 'plan-1',
      supplierName: 'Green Energy Co',
      planName: 'Green Saver Plus',
      ratePerKwh: 0.12,
      contractType: 'fixed',
      contractLengthMonths: 12,
      renewablePercentage: 100,
      earlyTerminationFee: 0,
      state: 'CA',
    },
    {
      planId: 'plan-2',
      supplierName: 'Budget Power',
      planName: 'Budget Basic',
      ratePerKwh: 0.1,
      contractType: 'fixed',
      contractLengthMonths: 24,
      renewablePercentage: 0,
      earlyTerminationFee: 150,
      state: 'CA',
    },
    {
      planId: 'plan-3',
      supplierName: 'Eco Power Solutions',
      planName: 'Eco Flex',
      ratePerKwh: 0.11,
      contractType: 'variable',
      contractLengthMonths: 0,
      renewablePercentage: 50,
      earlyTerminationFee: 0,
      state: 'CA',
    },
  ];
}

/**
 * Generate mock usage data
 */
export function generateMockUsageData(): CustomerUsageData {
  return {
    customerInfo: {
      customerId: 'customer-1',
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
      },
    },
    utilityInfo: {
      utilityName: 'PG&E',
      utilityId: 'pge-123',
    },
    usageDataPoints: Array.from({ length: 12 }, (_, i) => {
      const now = new Date();
      const date = new Date(now.getFullYear(), i, 1);
      return {
        timestamp: date.toISOString(),
        kwh: 500 + Math.random() * 200,
        cost: (500 + Math.random() * 200) * 0.12,
      };
    }),
    aggregatedStats: {
      totalKwh: 7200,
      totalCost: 864,
      averageMonthlyKwh: 600,
      averageMonthlyCost: 72,
      peakMonth: 'July',
      peakMonthKwh: 850,
    },
    billingInfo: {
      currentPlan: {
        planId: 'current-plan',
        supplierName: 'Current Supplier',
        ratePerKwh: 0.13,
      },
      billingPeriod: {
        start: new Date(new Date().getFullYear(), 0, 1)
          .toISOString()
          .split('T')[0],
        end: new Date(new Date().getFullYear(), 11, 31)
          .toISOString()
          .split('T')[0],
      },
    },
  };
}

/**
 * Generate mock recommendations
 */
export function generateMockRecommendations(): Recommendation[] {
  const now = new Date().toISOString();
  return [
    {
      recommendationId: 'rec-1',
      planId: 'plan-1',
      rank: 1,
      projectedSavings: 120,
      explanation:
        'Best match for your usage pattern with 100% renewable energy',
      riskFlags: [],
      createdAt: now,
    },
    {
      recommendationId: 'rec-2',
      planId: 'plan-2',
      rank: 2,
      projectedSavings: 180,
      explanation: 'Lowest cost option, but no renewable energy',
      riskFlags: ['high_termination_fee'],
      createdAt: now,
    },
    {
      recommendationId: 'rec-3',
      planId: 'plan-3',
      rank: 3,
      projectedSavings: 60,
      explanation: 'Flexible contract with 50% renewable energy',
      riskFlags: ['variable_rate'],
      createdAt: now,
    },
  ];
}

/**
 * Generate mock user preferences
 */
export function generateMockUserPreferences(): UserPreferences {
  return {
    userId: 'user-1',
    costSavingsPriority: 'high',
    flexibilityPreference: 12,
    renewableEnergyPreference: 50,
    supplierRatingPreference: 3.5,
    contractTypePreference: 'fixed',
    earlyTerminationFeeTolerance: 100,
    budgetConstraints: {
      maxMonthlyCost: 100,
    },
    sustainabilityGoals: ['reduce_carbon_footprint'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generate mock usage pattern
 */
export function generateMockUsagePattern(): UsagePattern {
  return {
    userId: 'user-1',
    patternId: 'pattern-1',
    patternData: {
      averageMonthlyKwh: 600,
      peakMonth: 'July',
      peakMonthKwh: 850,
      seasonalVariation: 0.3,
      usageTrend: 'stable',
      peakUsageMonths: ['July', 'August'],
      lowUsageMonths: ['January', 'February'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
