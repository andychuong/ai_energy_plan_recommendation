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

// HTTP event structure for Function URL
interface HttpEvent {
  requestContext?: {
    http?: {
      method?: string;
    };
    httpMethod?: string;
  };
  httpMethod?: string;
  body?: string | unknown;
  routeKey?: string;
  rawPath?: string;
  headers?: {
    [key: string]: string | undefined;
  };
}

type HandlerEvent = SaveUsageDataEvent | HttpEvent;

// CORS headers for Function URL responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Helper to create HTTP response
function createResponse(
  statusCode: number,
  body: SaveUsageDataResponse
): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

export const handler: Handler<
  HandlerEvent,
  SaveUsageDataResponse | { statusCode: number; headers: Record<string, string>; body: string }
> = async (event) => {
  // Check if this is an HTTP request (Function URL) vs direct invocation
  const httpEvent = event as HttpEvent;
  const isHttpRequest = !!(httpEvent.routeKey || httpEvent.requestContext || httpEvent.rawPath);
  const isDirectInvocation = !!(event as SaveUsageDataEvent).userId && !isHttpRequest;

  // Handle OPTIONS preflight request
  if (isHttpRequest && !isDirectInvocation) {
    const httpMethod = httpEvent.requestContext?.http?.method || 
                       httpEvent.requestContext?.httpMethod ||
                       httpEvent.httpMethod ||
                       (httpEvent.headers?.['x-amzn-http-method'] || '').toUpperCase();
    
    if (httpMethod === 'OPTIONS' || httpMethod === 'options') {
      // eslint-disable-next-line no-console
      console.log('[save-usage-data] OPTIONS request detected');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      };
    }
  }

  // Parse Function URL HTTP request
  let requestData: SaveUsageDataEvent;
  if (isHttpRequest && httpEvent.body) {
    try {
      const body = typeof httpEvent.body === 'string' 
        ? JSON.parse(httpEvent.body) 
        : httpEvent.body;
      requestData = body as SaveUsageDataEvent;
    } catch (error) {
      console.error('[save-usage-data] Error parsing request body:', error);
      return createResponse(400, {
        success: false,
        error: 'Invalid request body',
      });
    }
  } else {
    // Direct invocation
    requestData = event as SaveUsageDataEvent;
  }
  try {
    const { userId, usageData } = requestData;

    if (!userId) {
      const errorResponse: SaveUsageDataResponse = {
        success: false,
        error: 'User ID is required',
      };
      if (isHttpRequest) {
        return createResponse(400, errorResponse);
      }
      return errorResponse;
    }

    if (!usageData.usagePoints || usageData.usagePoints.length === 0) {
      const errorResponse: SaveUsageDataResponse = {
        success: false,
        error: 'Usage points are required',
      };
      if (isHttpRequest) {
        return createResponse(400, errorResponse);
      }
      return errorResponse;
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

      const response: SaveUsageDataResponse = {
        success: true,
        usageDataId: latest.usageDataId || latest.id,
        message: 'Usage data updated successfully',
      };

      // Return HTTP response if called via Function URL
      if (isHttpRequest) {
        return createResponse(200, response);
      }

      return response;
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

      const response: SaveUsageDataResponse = {
        success: true,
        usageDataId,
        message: 'Usage data saved successfully',
      };

      // Return HTTP response if called via Function URL
      if (isHttpRequest) {
        return createResponse(200, response);
      }

      return response;
    }
  } catch (error) {
    console.error('Error saving usage data:', error);
    const errorResponse: SaveUsageDataResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save usage data',
    };

    // Return HTTP error response if called via Function URL
    if (isHttpRequest) {
      return createResponse(500, errorResponse);
    }

    return errorResponse;
  }
};

