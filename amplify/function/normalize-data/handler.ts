import type { Handler } from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import OpenAI from 'openai';

/**
 * Data Normalization Lambda Function
 * 
 * Normalizes energy usage data from various APIs to common format
 * Uses OpenRouter AI with GPT-3.5-turbo for cost efficiency
 */

// Client will be used when implementing data storage
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _client = generateClient<Schema>({
  authMode: 'iam',
});

// Initialize OpenRouter client
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'https://sparksave.app', // Optional: for analytics
  },
});

interface NormalizeDataEvent {
  rawData: unknown;
  source: string; // 'eia' | 'openei' | 'wattbuy' | 'green_button' | 'public_grid' | 'pge' | 'quantiv' | 'palmetto'
  userId: string;
}

interface NormalizeDataResponse {
  success: boolean;
  normalizedData?: {
    customerInfo: {
      customerId: string;
      address: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
      };
    };
    utilityInfo: {
      utilityName: string;
      utilityId?: string;
    };
    usageDataPoints: Array<{
      timestamp: string;
      kwh: number;
      cost?: number;
      periodStart?: string;
      periodEnd?: string;
    }>;
    aggregatedStats: {
      totalKwh: number;
      totalCost: number;
      averageMonthlyKwh: number;
      averageMonthlyCost: number;
      peakMonth: string;
      peakMonthKwh: number;
    };
    billingInfo?: {
      currentPlan?: {
        planId: string;
        supplierName: string;
        ratePerKwh: number;
      };
      billingPeriod?: {
        start: string;
        end: string;
      };
    };
  };
  error?: string;
}

export const handler: Handler<NormalizeDataEvent, NormalizeDataResponse> = async (
  event
) => {
  try {
    const { rawData, source, userId } = event;

    // TODO: Implement normalization logic
    // 1. Parse raw data based on source
    // 2. Map to common schema
    // 3. Use OpenRouter AI (GPT-3.5-turbo) for complex normalization if needed
    // 4. Validate normalized data
    // 5. Return normalized data

    // Example: Use OpenRouter for normalization
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const prompt = `Convert the following energy usage API response to the standardized format.
        
API Response:
${JSON.stringify(rawData, null, 2)}

Source: ${source}

Instructions:
1. Extract all available fields
2. Map field names to standard schema
3. Convert date/time formats to ISO 8601
4. Normalize units (kWh, $, kW)
5. Return valid JSON only matching the target schema

Target Schema:
{
  "customerInfo": {
    "customerId": "string",
    "address": {
      "street": "string (optional)",
      "city": "string (optional)",
      "state": "string (optional)",
      "zipCode": "string (optional)"
    }
  },
  "utilityInfo": {
    "utilityName": "string",
    "utilityId": "string (optional)"
  },
  "usageDataPoints": [
    {
      "timestamp": "ISO 8601 datetime",
      "kwh": "number",
      "cost": "number (optional)",
      "periodStart": "ISO 8601 datetime (optional)",
      "periodEnd": "ISO 8601 datetime (optional)"
    }
  ],
  "aggregatedStats": {
    "totalKwh": "number",
    "totalCost": "number",
    "averageMonthlyKwh": "number",
    "averageMonthlyCost": "number",
    "peakMonth": "string",
    "peakMonthKwh": "number"
  }
}`;

        const response = await openrouter.chat.completions.create({
          model: 'openai/gpt-3.5-turbo', // Use cheaper model for normalization
          messages: [
            {
              role: 'system',
              content:
                'You are a data normalization expert. Convert energy usage API responses to standardized format. Return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1, // Low temperature for consistent output
        });

        const normalizedData = JSON.parse(
          response.choices[0].message.content || '{}'
        );

        return {
          success: true,
          normalizedData,
        };
      } catch (error) {
        console.error('OpenRouter normalization error:', error);
        // Fall through to placeholder implementation
      }
    }

    // Placeholder implementation (fallback)
    return {
      success: true,
      normalizedData: {
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
          peakMonth: 'January',
          peakMonthKwh: 0,
        },
      },
    };
  } catch (error) {
    console.error('Error normalizing data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

