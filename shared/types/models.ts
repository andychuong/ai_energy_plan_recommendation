/**
 * Shared data models
 */

export interface UserPreferences {
  userId: string;
  costSavingsPriority: 'high' | 'medium' | 'low';
  flexibilityPreference: number;
  renewableEnergyPreference: number;
  supplierRatingPreference: number;
  contractTypePreference: 'fixed' | 'variable' | 'indexed' | 'hybrid' | null;
  earlyTerminationFeeTolerance: number;
  budgetConstraints?: {
    maxMonthlyCost?: number;
    maxAnnualCost?: number;
  };
  sustainabilityGoals?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UsageDataPoint {
  timestamp: string;
  kwh: number;
  cost?: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface UsageData {
  userId: string;
  usagePoints: UsageDataPoint[];
  totalAnnualKwh?: number;
  averageMonthlyKwh?: number;
  peakMonthKwh?: number;
  peakMonth?: string;
}

export interface EnergyPlan {
  planId: string;
  supplierName: string;
  planName: string;
  ratePerKwh: number;
  contractType: 'fixed' | 'variable' | 'indexed' | 'hybrid';
  contractLengthMonths?: number;
  earlyTerminationFee?: number;
  renewablePercentage?: number;
  supplierRating?: number;
  state?: string;
  utilityTerritory?: string;
}

export interface Recommendation {
  recommendationId: string;
  planId: string;
  rank: number;
  projectedSavings: number;
  explanation: string;
  riskFlags?: string[];
  createdAt: string;
}

export interface CurrentPlan {
  supplierName: string;
  planName: string;
  ratePerKwh: number;
  contractEndDate?: string;
  earlyTerminationFee?: number;
  contractType: 'fixed' | 'variable' | 'indexed' | 'hybrid';
  renewablePercentage?: number;
}

