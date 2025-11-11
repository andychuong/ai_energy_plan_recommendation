import type { Handler } from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

/**
 * Usage Data Processing Lambda Function
 * 
 * Processes and stores usage data:
 * - Validates usage data
 * - Calculates usage patterns
 * - Stores in memory bank
 * - Updates usage patterns
 */

const client = generateClient<Schema>({
  authMode: 'iam',
});

interface ProcessUsageDataEvent {
  userId: string;
  usageData: {
    usageDataPoints: Array<{
      timestamp: string;
      kwh: number;
      cost?: number;
    }>;
    aggregatedStats: {
      totalKwh: number;
      totalCost: number;
      averageMonthlyKwh: number;
      averageMonthlyCost: number;
      peakMonth: string;
      peakMonthKwh: number;
    };
  };
}

interface ProcessUsageDataResponse {
  success: boolean;
  patternId?: string;
  error?: string;
}

/**
 * Calculate seasonal variation coefficient
 * Returns a value between 0 and 1, where 0 = no variation, 1 = high variation
 */
function calculateSeasonalVariation(monthlyUsage: number[]): number {
  if (monthlyUsage.length === 0) return 0;

  const mean = monthlyUsage.reduce((sum, val) => sum + val, 0) / monthlyUsage.length;
  if (mean === 0) return 0;

  const variance =
    monthlyUsage.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    monthlyUsage.length;
  const standardDeviation = Math.sqrt(variance);

  // Coefficient of variation (normalized by mean)
  const coefficientOfVariation = standardDeviation / mean;

  // Normalize to 0-1 range (cap at 1.0 for very high variation)
  return Math.min(coefficientOfVariation, 1.0);
}

/**
 * Determine usage trend: increasing, decreasing, or stable
 */
function calculateUsageTrend(
  usageDataPoints: Array<{ timestamp: string; kwh: number }>
): 'increasing' | 'decreasing' | 'stable' {
  if (usageDataPoints.length < 2) return 'stable';

  // Sort by timestamp
  const sorted = [...usageDataPoints].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Split into first half and second half
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const firstHalfAvg =
    firstHalf.reduce((sum, point) => sum + point.kwh, 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((sum, point) => sum + point.kwh, 0) / secondHalf.length;

  const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  // Threshold: 5% change to be considered a trend
  if (changePercent > 5) return 'increasing';
  if (changePercent < -5) return 'decreasing';
  return 'stable';
}

/**
 * Group usage data points by month and calculate monthly totals
 */
function groupByMonth(
  usageDataPoints: Array<{ timestamp: string; kwh: number }>
): Map<string, number> {
  const monthlyTotals = new Map<string, number>();

  for (const point of usageDataPoints) {
    const date = new Date(point.timestamp);
    const monthKey = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const current = monthlyTotals.get(monthKey) || 0;
    monthlyTotals.set(monthKey, current + point.kwh);
  }

  return monthlyTotals;
}

/**
 * Identify peak and low usage months
 */
function identifyPeakAndLowMonths(
  monthlyTotals: Map<string, number>
): { peakMonths: string[]; lowMonths: string[] } {
  if (monthlyTotals.size === 0) {
    return { peakMonths: [], lowMonths: [] };
  }

  const entries = Array.from(monthlyTotals.entries());
  const sorted = entries.sort((a, b) => b[1] - a[1]); // Sort by usage descending

  const average = entries.reduce((sum, [, kwh]) => sum + kwh, 0) / entries.length;

  // Peak months: top 25% or above average + 20%
  const peakThreshold = average * 1.2;
  const peakCount = Math.max(1, Math.ceil(entries.length * 0.25));
  const peakMonths = sorted
    .slice(0, peakCount)
    .filter(([, kwh]) => kwh >= peakThreshold)
    .map(([month]) => month);

  // Low months: bottom 25% or below average - 20%
  const lowThreshold = average * 0.8;
  const lowCount = Math.max(1, Math.ceil(entries.length * 0.25));
  const lowMonths = sorted
    .slice(-lowCount)
    .filter(([, kwh]) => kwh <= lowThreshold)
    .map(([month]) => month);

  return { peakMonths, lowMonths };
}

export const handler: Handler<
  ProcessUsageDataEvent,
  ProcessUsageDataResponse
> = async (event) => {
  try {
    const { userId, usageData } = event;

    // 1. Validate usage data
    if (!usageData.usageDataPoints || usageData.usageDataPoints.length === 0) {
      return {
        success: false,
        error: 'No usage data points provided',
      };
    }

    // 2. Calculate usage patterns
    const monthlyTotals = groupByMonth(usageData.usageDataPoints);
    const monthlyUsageValues = Array.from(monthlyTotals.values());

    // Calculate seasonal variation
    const seasonalVariation = calculateSeasonalVariation(monthlyUsageValues);

    // Calculate usage trend
    const usageTrend = calculateUsageTrend(usageData.usageDataPoints);

    // Identify peak and low months
    const { peakMonths, lowMonths } = identifyPeakAndLowMonths(monthlyTotals);

    // Generate pattern ID
    const patternId = `pattern-${userId}-${Date.now()}`;

    // 3. Check if pattern already exists for this user
    const existingPatterns = await client.models.UsagePattern.list({
      filter: {
        userId: { eq: userId },
      },
    });

    const now = new Date().toISOString();
    const patternData = {
      userId,
      patternId,
      averageMonthlyKwh: usageData.aggregatedStats.averageMonthlyKwh,
      peakMonth: usageData.aggregatedStats.peakMonth,
      peakMonthKwh: usageData.aggregatedStats.peakMonthKwh,
      seasonalVariation,
      usageTrend,
      peakUsageMonths: peakMonths.length > 0 ? peakMonths : [usageData.aggregatedStats.peakMonth],
      lowUsageMonths: lowMonths.length > 0 ? lowMonths : [],
      updatedAt: now,
    };

    // 4. Update existing pattern or create new one
    if (existingPatterns.data && existingPatterns.data.length > 0) {
      // Update the most recent pattern
      const latestPattern = existingPatterns.data[0];
      await client.models.UsagePattern.update({
        id: latestPattern.id,
        ...patternData,
      });
    } else {
      // Create new pattern
      await client.models.UsagePattern.create({
        ...patternData,
        createdAt: now,
      });
    }

    return {
      success: true,
      patternId,
    };
  } catch (error) {
    console.error('Error processing usage data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

