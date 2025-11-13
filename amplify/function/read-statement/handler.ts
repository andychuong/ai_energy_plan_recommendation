import type { Handler } from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import OpenAI from 'openai';

/**
 * AI Statement Reader Lambda Function
 *
 * Reads and extracts data from energy bill statements using AI
 * Supports PDF, images (PNG, JPG), CSV, and text formats
 * Uses OpenRouter AI with GPT-4 Vision for image/PDF processing
 * Uses GPT-4 Turbo for text/CSV processing
 * 
 * Follows AI bill analyzer best practices:
 * - Uses AI for all file formats (including CSV) for intelligent extraction
 * - Handles various bill formats and structures
 * - Extracts structured data from unstructured sources
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
    'HTTP-Referer': 'https://sparksave.app',
  },
});

interface ReadStatementEvent {
  userId: string;
  statementData: {
    // Base64 encoded file content
    content: string;
    // File type: 'pdf' | 'image' | 'text' | 'csv'
    fileType: 'pdf' | 'image' | 'text' | 'csv';
    // MIME type: 'application/pdf' | 'image/png' | 'image/jpeg' | 'text/plain' | 'text/csv'
    mimeType: string;
    // Optional: filename for reference
    filename?: string;
  };
}

interface ReadStatementResponse {
  success: boolean;
  extractedData?: {
    customerInfo: {
      customerId?: string;
      accountNumber?: string;
      address?: {
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
    billingPeriod: {
      start: string; // ISO 8601
      end: string; // ISO 8601
    };
    usageDataPoints: Array<{
      timestamp: string; // ISO 8601
      kwh: number;
      cost?: number;
      periodStart?: string; // ISO 8601
      periodEnd?: string; // ISO 8601
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
        planId?: string;
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
  body: ReadStatementResponse
): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

export const handler: Handler<
  ReadStatementEvent | { requestContext?: any; httpMethod?: string; body?: string; routeKey?: string; rawPath?: string; headers?: any },
  ReadStatementResponse | { statusCode: number; headers: Record<string, string>; body: string }
> = async (event) => {
  // Check if this is an HTTP request (Function URL) vs direct invocation
  const isHttpRequest = !!(event as any).routeKey || !!(event as any).requestContext || !!(event as any).rawPath;
  const isDirectInvocation = !!(event as ReadStatementEvent).userId && !isHttpRequest;

  // Handle OPTIONS preflight request
  if (isHttpRequest && !isDirectInvocation) {
    const httpMethod = (event as any).requestContext?.http?.method || 
                       (event as any).requestContext?.httpMethod ||
                       (event as any).httpMethod ||
                       ((event as any).headers?.['x-amzn-http-method'] || '').toUpperCase();
    
    if (httpMethod === 'OPTIONS' || httpMethod === 'options') {
      console.log('[read-statement] OPTIONS request detected');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      };
    }
  }

  // Parse Function URL HTTP request
  let requestData: ReadStatementEvent;
  if (isHttpRequest && (event as any).body) {
    try {
      const body = typeof (event as any).body === 'string' 
        ? JSON.parse((event as any).body) 
        : (event as any).body;
      requestData = body as ReadStatementEvent;
    } catch (error) {
      console.error('[read-statement] Error parsing request body:', error);
      return createResponse(400, {
        success: false,
        error: 'Invalid request body',
      });
    }
  } else {
    // Direct invocation
    requestData = event as ReadStatementEvent;
  }

  try {
    const { userId, statementData } = requestData;
    const { content, fileType, mimeType } = statementData;

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Prepare prompt based on file type
    let prompt: string;
    let messages: Array<
      | { role: 'system'; content: string }
      | {
          role: 'user';
          content:
            | string
            | Array<
                | { type: 'text'; text: string }
                | { type: 'image_url'; image_url: { url: string } }
              >;
        }
    >;

    if (fileType === 'image' || fileType === 'pdf') {
      // Use GPT-4 Vision for image/PDF processing
      const imageUrl = `data:${mimeType};base64,${content}`;

      prompt = `You are an expert at reading energy bill statements. Extract all relevant information from this energy bill and return it in the standardized JSON format.

Extract the following information:
1. Customer information (account number, address)
2. Utility/Supplier name
3. Billing period (start and end dates)
4. Usage data (kWh consumption, costs, dates)
5. Current plan details (supplier name, rate per kWh)
6. Calculate aggregated statistics (total kWh, total cost, average monthly, peak month)

Return ONLY valid JSON matching this exact schema:
{
  "customerInfo": {
    "customerId": "string (optional)",
    "accountNumber": "string (optional)",
    "address": {
      "street": "string (optional)",
      "city": "string (optional)",
      "state": "string (optional)",
      "zipCode": "string (optional)"
    }
  },
  "utilityInfo": {
    "utilityName": "string (required)",
    "utilityId": "string (optional)"
  },
  "billingPeriod": {
    "start": "ISO 8601 datetime (required)",
    "end": "ISO 8601 datetime (required)"
  },
  "usageDataPoints": [
    {
      "timestamp": "ISO 8601 datetime (required)",
      "kwh": "number (required)",
      "cost": "number (optional)",
      "periodStart": "ISO 8601 datetime (optional)",
      "periodEnd": "ISO 8601 datetime (optional)"
    }
  ],
  "aggregatedStats": {
    "totalKwh": "number (required)",
    "totalCost": "number (required)",
    "averageMonthlyKwh": "number (required)",
    "averageMonthlyCost": "number (required)",
    "peakMonth": "string (required)",
    "peakMonthKwh": "number (required)"
  },
  "billingInfo": {
    "currentPlan": {
      "supplierName": "string (required)",
      "ratePerKwh": "number (required)"
    },
    "billingPeriod": {
      "start": "ISO 8601 datetime (required)",
      "end": "ISO 8601 datetime (required)"
    }
  }
}

Important:
- Convert all dates to ISO 8601 format
- Ensure all numbers are actual numbers, not strings
- If information is missing, use null or omit the field
- Calculate aggregated stats from usage data points
- Return ONLY the JSON object, no additional text`;

      messages = [
        {
          role: 'system',
          content:
            'You are an expert at extracting structured data from energy bill statements. Return only valid JSON.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text' as const,
              text: prompt,
            },
            {
              type: 'image_url' as const,
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ];
    } else {
      // Use GPT-4 for text/CSV processing
      const fileContent = Buffer.from(content, 'base64').toString('utf-8');
      const isCSV = fileType === 'csv' || mimeType === 'text/csv';
      
      prompt = `You are an expert at reading energy bill statements. Extract all relevant information from this energy bill ${isCSV ? 'CSV data' : 'text'} and return it in the standardized JSON format.

${isCSV ? 'CSV Data' : 'Energy Bill Text'}:
${fileContent}

Extract the following information:
1. Customer information (account number, address)
2. Utility/Supplier name
3. Billing period (start and end dates)
4. Usage data (kWh consumption, costs, dates)
5. Current plan details (supplier name, rate per kWh)
6. Calculate aggregated statistics (total kWh, total cost, average monthly, peak month)

Return ONLY valid JSON matching this exact schema:
{
  "customerInfo": {
    "customerId": "string (optional)",
    "accountNumber": "string (optional)",
    "address": {
      "street": "string (optional)",
      "city": "string (optional)",
      "state": "string (optional)",
      "zipCode": "string (optional)"
    }
  },
  "utilityInfo": {
    "utilityName": "string (required)",
    "utilityId": "string (optional)"
  },
  "billingPeriod": {
    "start": "ISO 8601 datetime (required)",
    "end": "ISO 8601 datetime (required)"
  },
  "usageDataPoints": [
    {
      "timestamp": "ISO 8601 datetime (required)",
      "kwh": "number (required)",
      "cost": "number (optional)",
      "periodStart": "ISO 8601 datetime (optional)",
      "periodEnd": "ISO 8601 datetime (optional)"
    }
  ],
  "aggregatedStats": {
    "totalKwh": "number (required)",
    "averageMonthlyKwh": "number (required)",
    "averageMonthlyCost": "number (required)",
    "peakMonth": "string (required)",
    "peakMonthKwh": "number (required)"
  },
  "billingInfo": {
    "currentPlan": {
      "supplierName": "string (required)",
      "ratePerKwh": "number (required)"
    },
    "billingPeriod": {
      "start": "ISO 8601 datetime (required)",
      "end": "ISO 8601 datetime (required)"
    }
  }
}

Important:
- Convert all dates to ISO 8601 format
- Ensure all numbers are actual numbers, not strings
- If information is missing, use null or omit the field
- Calculate aggregated stats from usage data points
- Return ONLY the JSON object, no additional text`;

      messages = [
        {
          role: 'system',
          content:
            'You are an expert at extracting structured data from energy bill statements. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ];
    }

    // Call OpenRouter API
    const model =
      fileType === 'image' || fileType === 'pdf'
        ? 'openai/gpt-4o' // GPT-4 Vision for images/PDFs
        : 'openai/gpt-4-turbo'; // GPT-4 Turbo for text/CSV

    const response = await openrouter.chat.completions.create({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for consistent extraction
    });

    // Parse extracted data
    const extractedData = JSON.parse(
      response.choices[0].message.content || '{}'
    );

    // Validate and normalize the extracted data
    if (!extractedData.utilityInfo?.utilityName) {
      throw new Error('Failed to extract utility name from statement');
    }

    // Ensure required fields are present
    const normalizedData = {
      customerInfo: {
        customerId: extractedData.customerInfo?.customerId || userId,
        accountNumber: extractedData.customerInfo?.accountNumber,
        address: extractedData.customerInfo?.address || {},
      },
      utilityInfo: {
        utilityName: extractedData.utilityInfo.utilityName,
        utilityId: extractedData.utilityInfo?.utilityId,
      },
      billingPeriod: extractedData.billingPeriod || {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
      usageDataPoints: extractedData.usageDataPoints || [],
      aggregatedStats: extractedData.aggregatedStats || {
        totalKwh: 0,
        totalCost: 0,
        averageMonthlyKwh: 0,
        averageMonthlyCost: 0,
        peakMonth: 'January',
        peakMonthKwh: 0,
      },
      billingInfo: extractedData.billingInfo,
    };

    const response: ReadStatementResponse = {
      success: true,
      extractedData: normalizedData,
    };

    // Return HTTP response if called via Function URL
    if (isHttpRequest) {
      return createResponse(200, response);
    }

    // Return direct invocation response
    return response;
  } catch (error) {
    console.error('Error reading statement:', error);
    const errorResponse: ReadStatementResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    // Return HTTP error response if called via Function URL
    if (isHttpRequest) {
      return createResponse(500, errorResponse);
    }

    // Return direct invocation error response
    return errorResponse;
  }
};

