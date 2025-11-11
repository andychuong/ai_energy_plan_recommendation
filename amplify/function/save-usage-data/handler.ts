/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Handler } from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

/**
 * Save Usage Data Lambda Function
 * 
 * Saves user's energy usage data
 */

const client = generateClient<Schema>({
  authMode: 'iam',
});

interface UsageDataPoint {
  timestamp: string;
  kwh: number;
  cost?: number;
}

interface SaveUsageDataEvent {
  userId: string;
  usageData: {
    usagePoints: UsageDataPoint[];
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
  };
}

interface SaveUsageDataResponse {
  success: boolean;
  usageDataId?: string;
  message?: string;
  error?: string;
}

export const handler: Handler<SaveUsageDataEvent, SaveUsageDataResponse> = async (event) => {
  try {
    const { userId, usageData } = event;

    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    if (!usageData.usagePoints || usageData.usagePoints.length === 0) {
      return {
        success: false,
        error: 'Usage points are required',
      };
    }

    const now = new Date().toISOString();

    // Check if there's existing usage data for this user
    const existingData = await client.models.CustomerUsageData.list({
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
      const pointsMap = new Map<string, UsageDataPoint>();
      existingPoints.forEach((point: UsageDataPoint) => {
        const date = new Date(point.timestamp);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        pointsMap.set(key, point);
      });

      // Overwrite with new points (they take precedence)
      newPoints.forEach((point: UsageDataPoint) => {
        const date = new Date(point.timestamp);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        pointsMap.set(key, point);
      });

      // Convert map back to array and sort by timestamp
      const mergedPoints = Array.from(pointsMap.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Update the existing record
      await client.models.CustomerUsageData.update({
        id: latest.id,
        usagePoints: mergedPoints as any,
        totalAnnualKwh: usageData.totalAnnualKwh || latest.totalAnnualKwh || null,
        averageMonthlyKwh: usageData.averageMonthlyKwh || latest.averageMonthlyKwh || null,
        peakMonthKwh: usageData.peakMonthKwh || latest.peakMonthKwh || null,
        peakMonth: usageData.peakMonth || latest.peakMonth || null,
        billingInfo: usageData.billingInfo as any || latest.billingInfo || null,
        updatedAt: now,
      });

      return {
        success: true,
        usageDataId: latest.usageDataId || latest.id,
        message: 'Usage data updated successfully',
      };
    } else {
      // No existing data, create a new record
      const usageDataId = `usage-${userId}-${Date.now()}`;
      await client.models.CustomerUsageData.create({
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

      return {
        success: true,
        usageDataId,
        message: 'Usage data saved successfully',
      };
    }
  } catch (error) {
    console.error('Error saving usage data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save usage data',
    };
  }
};

