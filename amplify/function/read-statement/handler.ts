import type { Handler } from 'aws-lambda';
import OpenAI from 'openai';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

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

type HandlerEvent = ReadStatementEvent | HttpEvent;

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

// Initialize Amplify Data client for learning system
let dataClient: ReturnType<typeof generateClient<Schema>> | null = null;

const getDataClient = () => {
  if (!dataClient) {
    dataClient = generateClient<Schema>({
      authMode: 'iam',
    });
  }
  return dataClient;
};

/**
 * Query for similar statement formats to improve accuracy
 */
async function getSimilarFormats(
  utilityName: string,
  fileType: string
): Promise<Array<{
  formatPattern: unknown;
  exampleExtraction: unknown;
  columnMappings?: unknown;
  dateFormats?: string[];
}>> {
  try {
    const client = getDataClient();
    const result = await client.models.StatementFormat.list({
      filter: {
        utilityName: { eq: utilityName },
        fileType: { eq: fileType },
      },
    });

    // Sort by success count and last used, return top 3
    const formats = (result.data || [])
      .sort((a: { successCount: number; lastUsedAt: string }, b: { successCount: number; lastUsedAt: string }) => {
        // Prioritize by success count, then by last used
        if (a.successCount !== b.successCount) {
          return b.successCount - a.successCount;
        }
        return (
          new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
        );
      })
      .slice(0, 3)
      .map((f) => ({
        formatPattern: f.formatPattern,
        exampleExtraction: f.exampleExtraction,
        columnMappings: f.columnMappings,
        dateFormats: f.dateFormats ? (f.dateFormats.filter((d): d is string => d !== null) as string[]) : undefined,
      }));

    return formats;
  } catch (error) {
    console.error('[read-statement] Error querying similar formats:', error);
    return [];
  }
}

/**
 * Store successful extraction pattern for future learning
 */
async function storeFormatPattern(
  utilityName: string,
  fileType: string,
  formatPattern: unknown,
  exampleExtraction: unknown,
  columnMappings?: unknown,
  dateFormats?: string[]
): Promise<void> {
  try {
    const client = getDataClient();
    
    // Check if format already exists
    const existing = await client.models.StatementFormat.list({
      filter: {
        utilityName: { eq: utilityName },
        fileType: { eq: fileType },
      },
    });

    const now = new Date().toISOString();
    const formatId = `format-${utilityName.toLowerCase().replace(/\s+/g, '-')}-${fileType}-${Date.now()}`;

    // Create a hash-like identifier for the format pattern
    const patternHash = JSON.stringify(formatPattern).substring(0, 100);

    // Check if we have a similar format pattern
    const similarFormat = existing.data?.find((f: { formatPattern: unknown }) => {
      const existingPattern = JSON.stringify(f.formatPattern).substring(0, 100);
      return existingPattern === patternHash;
    });

    if (similarFormat) {
      // Update existing format - increment success count
      await client.models.StatementFormat.update({
        id: similarFormat.id,
        successCount: (similarFormat.successCount || 0) + 1,
        lastUsedAt: now,
        updatedAt: now,
        // Update example extraction if this one is more recent
        exampleExtraction: exampleExtraction as string | number | boolean | object | unknown[],
      });
    } else {
      // Create new format pattern
      await client.models.StatementFormat.create({
        formatId,
        utilityName,
        fileType,
        formatPattern: formatPattern as string | number | boolean | object | unknown[],
        exampleExtraction: exampleExtraction as string | number | boolean | object | unknown[],
        columnMappings: columnMappings as string | number | boolean | object | unknown[] | undefined,
        dateFormats: dateFormats || [],
        successCount: 1,
        lastUsedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (error) {
    console.error('[read-statement] Error storing format pattern:', error);
    // Don't throw - learning is optional
  }
}

export const handler: Handler<HandlerEvent, unknown> = async (event) => {
  // Check if this is an HTTP request (Function URL) vs direct invocation
  const httpEvent = event as HttpEvent;
  const isHttpRequest = !!(httpEvent.routeKey || httpEvent.requestContext || httpEvent.rawPath);
  const isDirectInvocation = !!(event as ReadStatementEvent).userId && !isHttpRequest;

  // Handle OPTIONS preflight request
  if (isHttpRequest && !isDirectInvocation) {
    const httpMethod = httpEvent.requestContext?.http?.method || 
                       httpEvent.requestContext?.httpMethod ||
                       httpEvent.httpMethod ||
                       (httpEvent.headers?.['x-amzn-http-method'] || '').toUpperCase();
    
    if (httpMethod === 'OPTIONS' || httpMethod === 'options') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      } as { statusCode: number; headers: Record<string, string>; body: string };
    }
  }

  // Parse Function URL HTTP request
  let requestData: ReadStatementEvent;
  if (isHttpRequest && httpEvent.body) {
    try {
      const body = typeof httpEvent.body === 'string' 
        ? JSON.parse(httpEvent.body) 
        : httpEvent.body;
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
    
    if (!userId) {
      throw new Error('userId is required');
    }
    
    if (!statementData) {
      throw new Error('statementData is required');
    }
    
    const { content, fileType, mimeType } = statementData;
    
    if (!content) {
      throw new Error('statementData.content is required');
    }
    
    if (!fileType) {
      throw new Error('statementData.fileType is required');
    }
    
    if (!mimeType) {
      throw new Error('statementData.mimeType is required');
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.error('[read-statement] OPENROUTER_API_KEY is not set');
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

      prompt = `You are an expert at reading and extracting data from energy bill statements. Analyze this ${fileType === 'pdf' ? 'PDF document' : 'image'} carefully and extract all relevant information.

**CRITICAL INSTRUCTIONS FOR BILL READING:**

1. **Read ALL Text Carefully**:
   - Look for headers, footers, tables, and body text
   - Pay attention to small print and fine details
   - Check both sides if it's a multi-page document (read all pages)
   - Identify section headers like "Account Information", "Usage Summary", "Billing Details"

2. **Customer Information Extraction**:
   - Account Number: Look for labels like "Account #", "Account Number", "Acct #", "Customer ID"
   - Customer Name: Usually at the top, labeled "Customer Name", "Service To", "Bill To"
   - Address: Look for "Service Address", "Billing Address", "Service Location"
   - City, State, ZIP: Usually part of the address block

3. **Utility/Supplier Information**:
   - Company name: Usually prominently displayed at the top
   - Look for logos, letterhead, or company branding
   - May be labeled as "Utility", "Supplier", "Provider", "Energy Company"

4. **Billing Period**:
   - Look for "Billing Period", "Service Period", "Statement Period"
   - Usually formatted as "MM/DD/YYYY to MM/DD/YYYY" or similar
   - May be in a table header or summary section

5. **Usage Data Extraction**:
   - Look for tables with columns like "Date", "kWh", "Usage", "Consumption", "Cost", "Amount"
   - May be in a "Usage History" or "Usage Summary" section
   - Could be daily, weekly, or monthly data
   - Extract ALL data points, not just summaries
   - If multiple months are shown, extract each month separately

6. **Rate Information**:
   - Look for "Rate", "Price per kWh", "$/kWh", "Energy Charge Rate"
   - May be in a rate table or summary section
   - Could be tiered rates (different rates for different usage levels)
   - If tiered, use the average rate or most common rate

7. **Cost Calculation**:
   - If cost is not provided, calculate: cost = kWh × rate
   - Look for "Total Cost", "Amount Due", "Charges"
   - May include taxes, fees, and other charges

8. **Date Format Handling**:
   - Common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, Month DD, YYYY
   - Convert ALL dates to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
   - For monthly data, use the first day of the month at 00:00:00
   - For daily data, use the specific date at 00:00:00

9. **Data Validation**:
   - Ensure kWh values are positive numbers
   - Ensure cost values are positive numbers
   - Verify dates are in chronological order
   - Check that totals match the sum of individual entries

10. **Aggregation**:
    - If data is daily/weekly, aggregate into monthly totals
    - Calculate: total kWh, total cost, average monthly kWh, average monthly cost
    - Identify peak month (highest kWh consumption)

**EXTRACT THE FOLLOWING INFORMATION:**
1. Customer information (account number, address, city, state, zip)
2. Utility/Supplier name (from letterhead, logo, or company name)
3. Billing period (start and end dates)
4. Usage data points (ALL entries from tables, one per row/entry)
5. Current plan details (supplier name, rate per kWh)
6. Aggregated statistics (calculated from usage data points)

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

**CRITICAL REQUIREMENTS:**
- Convert ALL dates to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- Ensure ALL numbers are actual numbers, not strings
- Extract EVERY usage data point from tables - don't skip any rows
- If information is missing, use null or omit the field (but try your best to find it)
- Calculate aggregated stats from ALL usage data points
- For monthly aggregation: group daily/weekly data by month, sum kWh and cost per month
- Return ONLY the JSON object, no markdown, no code blocks, no explanations, no additional text
- Double-check your extraction for accuracy before returning`;

      messages = [
        {
          role: 'system',
          content:
            'You are an expert at extracting structured data from energy bill statements. You excel at reading PDFs and images, identifying tables, parsing dates in various formats, and calculating accurate statistics. You are meticulous and extract every data point. Always return valid JSON only, no markdown, no code blocks, no explanations.',
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
      
      if (isCSV) {
        // Try to get similar formats for this utility/file type
        // Extract utility name from CSV if possible (from headers or filename)
        let detectedUtility = 'Unknown Utility';
        const utilityMatch = fileContent.match(/(?:Utility|Supplier|Provider)[\s:]+([^\n,]+)/i);
        if (utilityMatch) {
          detectedUtility = utilityMatch[1].trim();
        }
        
        const similarFormats = await getSimilarFormats(detectedUtility, 'csv');
        let examplesSection = '';
        
        if (similarFormats.length > 0) {
          examplesSection = `\n\n**LEARNED PATTERNS FROM PREVIOUS SUCCESSFUL EXTRACTIONS:**\n`;
          similarFormats.forEach((format, idx) => {
            examplesSection += `\nExample ${idx + 1}:\n`;
            if (format.columnMappings) {
              examplesSection += `Column Mappings: ${JSON.stringify(format.columnMappings)}\n`;
            }
            if (format.dateFormats && format.dateFormats.length > 0) {
              examplesSection += `Date Formats Used: ${format.dateFormats.join(', ')}\n`;
            }
            if (format.exampleExtraction) {
              const example = format.exampleExtraction as {
                billingPeriod?: { start?: string; end?: string };
                usageDataPoints?: Array<{ timestamp?: string; kwh?: number }>;
              };
              if (example.billingPeriod) {
                examplesSection += `Billing Period Format: ${example.billingPeriod.start} to ${example.billingPeriod.end}\n`;
              }
              if (example.usageDataPoints && example.usageDataPoints.length > 0) {
                examplesSection += `Sample Data Point: ${JSON.stringify(example.usageDataPoints[0])}\n`;
              }
            }
          });
          examplesSection += `\nUse these patterns as guidance, but adapt to the current CSV structure.\n`;
        }
        
        // Enhanced CSV-specific prompt with examples
        prompt = `You are an expert at parsing energy bill CSV files. Extract all relevant information from this CSV data and return it in the standardized JSON format.

CSV Data:
${fileContent}${examplesSection}

**IMPORTANT INSTRUCTIONS FOR CSV PARSING:**

1. **Identify Column Headers**: Look for columns like "Date", "kWh", "Cost", "Account Number", "Customer Name", "Service Address", "City", etc.

2. **Date Parsing (CRITICAL)**: 
   - Common formats: MM/DD/YY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
   - **MM/DD/YY format**: "11/1/24" = November 1, 2024 (NOT October 31st or any other date)
   - **MM/DD/YY format**: "11/30/24" = November 30, 2024 (NOT November 29th or any other date)
   - **DO NOT** subtract days, adjust for timezones, or modify dates - use them exactly as written in the CSV
   - Convert ALL dates to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
   - For monthly data, use the first day of the month at 00:00:00
   - For daily data, use the specific date at 00:00:00
   - **When parsing MM/DD/YY**: Assume 20XX for years 00-99 (e.g., "24" = 2024, "99" = 2099, "00" = 2000)

3. **Data Extraction**:
   - Extract customer info from header rows (Account Number, Customer Name, Address, City)
   - Extract usage data from data rows (Date, kWh, Cost)
   - If kWh or Cost columns have different names (e.g., "Usage", "Consumption", "Amount"), identify them
   - Handle missing values gracefully (use null or 0)

4. **Aggregation**:
   - If data is daily/weekly, aggregate into monthly totals
   - Calculate total kWh, total cost, average monthly kWh, average monthly cost
   - Identify peak month (highest kWh consumption)

5. **Rate Calculation**:
   - If rate per kWh is not provided, calculate it: rate = cost / kWh
   - If multiple rates exist, use the average or most common rate

**Example CSV Structure:**
\`\`\`
Account Num,Customer Name,Service Address,City,State,ZIP,Utility Name,Supplier Name,Plan Name,Rate per kWh,Billing Period,Billing Period,Total kWh,Total Cost
ACC-123456,John Smith,1234 Oak Str,Austin,TX,78701,Austin Energy,Green Mount,Green Mount,0.122,11/1/24,11/30/24,1050,128.1
\`\`\`

**In this example:**
- The CSV has TWO "Billing Period" columns (columns K and L)
- Column K contains "11/1/24" which means November 1, 2024
- Column L contains "11/30/24" which means November 30, 2024
- The billing period should be extracted as: start = "2024-11-01T00:00:00.000Z", end = "2024-11-30T00:00:00.000Z"
- **DO NOT** calculate from other dates or adjust these values

**Expected Output Structure:**
Extract the following information:
1. Customer information (account number, address, city from header)
2. Utility/Supplier name (infer from context or use "Unknown Utility" if not found)
3. **Billing Period (CRITICAL - READ THIS CAREFULLY)**: 
   - **FIRST**: Look for columns named "Billing Period", "Billing Period Start", "Billing Period End", "Service Period", or similar
   - **SECOND**: Look for rows that contain "Billing Period" labels followed by dates
   - **THIRD**: If you find explicit billing period dates in the CSV, USE THOSE EXACT DATES - do NOT calculate or infer
   - **DATE PARSING**: 
     * Dates like "11/1/24" mean November 1, 2024 (MM/DD/YY format)
     * Dates like "11/30/24" mean November 30, 2024 (MM/DD/YY format)
     * Do NOT subtract days or adjust dates - use them exactly as written
     * If you see "11/1/24" to "11/30/24", the billing period is November 1, 2024 to November 30, 2024
   - **ONLY IF NO EXPLICIT BILLING PERIOD FOUND**: Calculate from the actual date range in the usage data
   - **CRITICAL**: The billing period MUST match the month/year shown in the CSV columns/rows, NOT a different month
   - **EXAMPLE**: If CSV shows "Billing Period" columns with "11/1/24" and "11/30/24", the billing period is November 1-30, 2024, NOT October
4. Usage data points (one per row, aggregated by month if daily/weekly)
5. Current plan details (calculate rate per kWh from cost/kWh)
6. Aggregated statistics (total kWh, total cost, average monthly, peak month)

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
- Convert all dates to ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
- Ensure all numbers are actual numbers, not strings
- If information is missing, use null or omit the field
- Calculate aggregated stats from usage data points
- For monthly aggregation: group daily/weekly data by month, sum kWh and cost per month
- Return ONLY the JSON object, no additional text, no markdown, no code blocks`;
      } else {
        // Enhanced text prompt
        prompt = `You are an expert at reading energy bill statements. Extract all relevant information from this energy bill text and return it in the standardized JSON format.

Energy Bill Text:
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
      }

      messages = [
        {
          role: 'system',
          content:
            'You are an expert at extracting structured data from energy bill statements. You excel at parsing CSV files, identifying column headers, handling various date formats, and calculating accurate statistics. Always return valid JSON only, no markdown, no code blocks, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ];
    }

    // Call OpenRouter API with improved settings
    // Use best available models for each file type
    const model =
      fileType === 'image' || fileType === 'pdf'
        ? 'openai/gpt-4o' // GPT-4o has best vision capabilities for images/PDFs
        : 'openai/gpt-4-turbo'; // GPT-4 Turbo for text/CSV

        // Retry logic for better reliability
        let aiResponse;
        let lastError;
        const maxRetries = 2;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            aiResponse = await openrouter.chat.completions.create({
              model,
              messages,
              response_format: { type: 'json_object' },
              temperature: fileType === 'csv' ? 0.2 : (fileType === 'pdf' ? 0.15 : 0.1), // Slightly higher for PDFs to handle variations
              max_tokens: fileType === 'image' || fileType === 'pdf' ? 8000 : 4000, // More tokens for complex PDFs/images
            });
            
            break;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorDetails = error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            } : { error: String(error) };
            
            console.error(`[read-statement] OpenRouter API call failed (attempt ${attempt + 1}/${maxRetries + 1}):`, errorDetails);
            
            lastError = error;
            if (attempt < maxRetries) {
              const delay = 1000 * (attempt + 1);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              // Wrap the error with more context
              throw new Error(`OpenRouter API error: ${errorMessage}`);
            }
          }
        }
        
        if (!aiResponse) {
          throw lastError || new Error('Failed to get AI response after retries');
        }

    // Parse extracted data with better error handling
    let extractedData;
    try {
      const content = aiResponse.choices[0].message.content || '{}';
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('[read-statement] Failed to parse AI response:', parseError);
      console.error('[read-statement] Raw response:', aiResponse.choices[0].message.content);
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Enhanced validation and normalization
    if (!extractedData.utilityInfo?.utilityName) {
      // Try to infer from customer info or use default
      extractedData.utilityInfo = extractedData.utilityInfo || {};
      extractedData.utilityInfo.utilityName = extractedData.utilityInfo.utilityName || 
        extractedData.customerInfo?.address?.city ? 
          `${extractedData.customerInfo.address.city} Energy` : 
          'Unknown Utility';
    }

    // Validate usage data points
    if (!extractedData.usageDataPoints || !Array.isArray(extractedData.usageDataPoints)) {
      extractedData.usageDataPoints = [];
    } else {
      // Validate and clean usage data points
      extractedData.usageDataPoints = extractedData.usageDataPoints
        .filter((point: { timestamp?: string; kwh?: number }) => {
          // Remove invalid points
          if (!point.timestamp || !point.kwh || point.kwh <= 0) {
            return false;
          }
          // Validate timestamp
          try {
            new Date(point.timestamp);
            return true;
          } catch {
            return false;
          }
        })
        .map((point: { timestamp: string; kwh: number; cost?: number }) => {
          // Ensure cost is a number if provided
          if (point.cost !== undefined && point.cost !== null) {
            point.cost = typeof point.cost === 'string' ? parseFloat(point.cost) : point.cost;
          }
          // Ensure kwh is a number
          point.kwh = typeof point.kwh === 'string' ? parseFloat(point.kwh) : point.kwh;
          return point;
        });
      
    }

    // Validate and calculate aggregated stats if missing or incorrect
    if (!extractedData.aggregatedStats || !extractedData.aggregatedStats.totalKwh) {
      // Calculate from usage data points
      const totalKwh = extractedData.usageDataPoints.reduce((sum: number, point: { kwh?: number }) => sum + (point.kwh || 0), 0);
      const totalCost = extractedData.usageDataPoints.reduce((sum: number, point: { cost?: number }) => sum + (point.cost || 0), 0);
      const monthCount = new Set(extractedData.usageDataPoints.map((p: { timestamp?: string }) => {
        if (!p.timestamp) return null;
        const date = new Date(p.timestamp);
        return `${date.getFullYear()}-${date.getMonth()}`;
      }).filter(Boolean)).size || 1;
      
      // Find peak month
      const monthlyTotals = new Map<string, number>();
      extractedData.usageDataPoints.forEach((point: { timestamp?: string; kwh?: number }) => {
        if (!point.timestamp || !point.kwh) return;
        const date = new Date(point.timestamp);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + point.kwh);
      });
      
      let peakMonth = 'January';
      let peakMonthKwh = 0;
      monthlyTotals.forEach((kwh, monthKey) => {
        if (kwh > peakMonthKwh) {
          peakMonthKwh = kwh;
          const [, month] = monthKey.split('-');
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
          peakMonth = monthNames[parseInt(month)] || 'January';
        }
      });

      extractedData.aggregatedStats = {
        totalKwh,
        totalCost,
        averageMonthlyKwh: totalKwh / monthCount,
        averageMonthlyCost: totalCost / monthCount,
        peakMonth,
        peakMonthKwh,
      };
    }

    // Validate and correct billing period if it seems incorrect
    // For CSV files, ALWAYS extract billing period directly from CSV columns (more reliable than AI)
    let correctedBillingPeriod = extractedData.billingPeriod;
    let shouldCorrectTimestamps = false;
    
    if (fileType === 'csv' && content) {
      try {
        const fileContent = Buffer.from(content, 'base64').toString('utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
        const headerLine = lines[0];
        
        // Look for "Billing Period" columns in header
        if (headerLine) {
          // Better CSV parsing that handles quoted values and different separators
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };
          
          const headers = parseCSVLine(headerLine);
          const billingPeriodIndices: number[] = [];
          
          headers.forEach((header, index) => {
            // Match "Billing Period" (case insensitive, with optional spaces)
            const normalizedHeader = header.replace(/^"|"$/g, '').trim();
            if (/billing\s*period/i.test(normalizedHeader)) {
              billingPeriodIndices.push(index);
            }
          });
          
          // If we didn't find "Billing Period" columns, try to find date columns by pattern
          if (billingPeriodIndices.length === 0 && lines.length > 1) {
            const dataLine = lines[1];
            const values = parseCSVLine(dataLine);
            
            // Look for adjacent columns that both contain date patterns (MM/DD/YY)
            for (let i = 0; i < values.length - 1; i++) {
              const value1 = values[i]?.replace(/^"|"$/g, '').trim();
              const value2 = values[i + 1]?.replace(/^"|"$/g, '').trim();
              
              // Check if both look like dates in MM/DD/YY format
              if (value1 && value2 && 
                  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value1) && 
                  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value2)) {
                // Check if these dates are in the same month (likely billing period)
                const date1Match = value1.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
                const date2Match = value2.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
                
                if (date1Match && date2Match) {
                  const month1 = parseInt(date1Match[1], 10);
                  const month2 = parseInt(date2Match[1], 10);
                  // If same month or adjacent months, likely a billing period
                  if (Math.abs(month1 - month2) <= 1) {
                    billingPeriodIndices.push(i, i + 1);
                    break;
                  }
                }
              }
            }
          }
          
          // If we found billing period columns (by name or pattern), extract dates from data rows
          if (billingPeriodIndices.length >= 2 && lines.length > 1) {
            const dataLine = lines[1];
            const values = parseCSVLine(dataLine);
            
            const startDateStr = values[billingPeriodIndices[0]]?.replace(/^"|"$/g, '').trim();
            const endDateStr = values[billingPeriodIndices[1]]?.replace(/^"|"$/g, '').trim();
            
            if (startDateStr && endDateStr) {
              // Parse MM/DD/YY format - extract month/day/year directly, no timezone conversions
              const parseDateToISO = (dateStr: string): string | null => {
                // Try MM/DD/YY or MM/DD/YYYY
                const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
                if (match) {
                  const month = parseInt(match[1], 10); // 1-12
                  const day = parseInt(match[2], 10);
                  let year = parseInt(match[3], 10);
                  
                  // Handle 2-digit years
                  if (year < 100) {
                    year = year < 50 ? 2000 + year : 1900 + year;
                  }
                  
                  // Create ISO string directly: YYYY-MM-DDTHH:mm:ss.sssZ
                  // Use midnight UTC to avoid any timezone issues
                  const monthStr = month.toString().padStart(2, '0');
                  const dayStr = day.toString().padStart(2, '0');
                  const yearStr = year.toString();
                  
                  // Format: YYYY-MM-DDTHH:mm:ss.sssZ (midnight UTC)
                  const isoString = `${yearStr}-${monthStr}-${dayStr}T00:00:00.000Z`;
                  
                  
                  return isoString;
                }
                console.warn('[read-statement] Failed to parse date:', dateStr);
                return null;
              };
              
              const startISO = parseDateToISO(startDateStr);
              const endISO = parseDateToISO(endDateStr);
              
              if (startISO && endISO) {
                // ALWAYS use CSV dates - they're more reliable than AI extraction
                correctedBillingPeriod = {
                  start: startISO,
                  end: endISO,
                };
                shouldCorrectTimestamps = true;
                
              } else {
                console.warn('[read-statement] Failed to parse billing period dates:', {
                  startDateStr,
                  endDateStr,
                  startISO,
                  endISO,
                });
              }
            }
          } else {
            console.warn('[read-statement] Could not find billing period columns:', {
              billingPeriodIndices,
              headerCount: headers.length,
              dataLineCount: lines.length,
            });
          }
        }
      } catch (error) {
        console.error('[read-statement] Error trying to correct billing period from CSV:', error);
      }
    }
    
    // If we corrected the billing period, also correct usage data point timestamps
    // Extract month/year directly from the billing period start date (no timezone conversions)
    let correctedUsagePoints = extractedData.usageDataPoints || [];
    if (shouldCorrectTimestamps && correctedBillingPeriod) {
      // Parse the ISO string directly to get month/year/day
      // Format: YYYY-MM-DDTHH:mm:ss.sssZ
      const startMatch = correctedBillingPeriod.start.match(/^(\d{4})-(\d{2})-(\d{2})/);
      
      if (startMatch) {
        const correctedYear = parseInt(startMatch[1], 10);
        const correctedMonth = parseInt(startMatch[2], 10) - 1; // 0-indexed for Date
        const correctedDay = parseInt(startMatch[3], 10);
        
        if (correctedUsagePoints.length > 0) {
          // Update all usage data points to use the corrected month/year
          // Use the first day of the billing period for all points
          correctedUsagePoints = correctedUsagePoints.map((point: { timestamp: string; kwh: number; cost?: number }) => {
            // Create ISO string directly: YYYY-MM-DDTHH:mm:ss.sssZ
            const monthStr = (correctedMonth + 1).toString().padStart(2, '0');
            const dayStr = correctedDay.toString().padStart(2, '0');
            const yearStr = correctedYear.toString();
            const correctedTimestamp = `${yearStr}-${monthStr}-${dayStr}T00:00:00.000Z`;
            
            return {
              ...point,
              timestamp: correctedTimestamp,
            };
          });
          
        } else if (extractedData.aggregatedStats && extractedData.aggregatedStats.totalKwh > 0) {
          // If no usage points but we have aggregated stats, create a single point for the month
          // Use the start date of the billing period
          const monthStr = (correctedMonth + 1).toString().padStart(2, '0');
          const dayStr = correctedDay.toString().padStart(2, '0');
          const yearStr = correctedYear.toString();
          const correctedTimestamp = `${yearStr}-${monthStr}-${dayStr}T00:00:00.000Z`;
          
          correctedUsagePoints = [{
            timestamp: correctedTimestamp,
            kwh: extractedData.aggregatedStats.totalKwh,
            cost: extractedData.aggregatedStats.totalCost || undefined,
          }];
          
        }
      }
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
      billingPeriod: correctedBillingPeriod || {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
      usageDataPoints: correctedUsagePoints,
      aggregatedStats: extractedData.aggregatedStats || {
        totalKwh: 0,
        totalCost: 0,
        averageMonthlyKwh: 0,
        averageMonthlyCost: 0,
        peakMonth: 'January',
        peakMonthKwh: 0,
      },
      billingInfo: extractedData.billingInfo ? {
        ...extractedData.billingInfo,
        billingPeriod: correctedBillingPeriod || extractedData.billingInfo.billingPeriod,
      } : (correctedBillingPeriod ? {
        currentPlan: extractedData.billingInfo?.currentPlan,
        billingPeriod: correctedBillingPeriod,
      } : extractedData.billingInfo),
    };

    // Store successful extraction pattern for future learning (async, don't wait)
    if (normalizedData.utilityInfo.utilityName && normalizedData.utilityInfo.utilityName !== 'Unknown Utility') {
      // Extract format pattern from CSV if applicable
      if (fileType === 'csv') {
        const fileContent = Buffer.from(content, 'base64').toString('utf-8');
        const lines = fileContent.split('\n').slice(0, 5); // First 5 lines for pattern
        const headers = lines[0]?.split(',').map(h => h.trim()) || [];
        
        // Extract date formats from usage data points
        const dateFormats: string[] = [];
        normalizedData.usageDataPoints.forEach((point: { timestamp?: string }) => {
          if (point.timestamp) {
            const date = new Date(point.timestamp);
            // Detect format pattern
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const year = date.getFullYear();
            // Common patterns
            if (point.timestamp.includes(`${month}/${day}/${year}`)) {
              dateFormats.push('MM/DD/YYYY');
            } else if (point.timestamp.includes(`${year}-${month}-${day}`)) {
              dateFormats.push('YYYY-MM-DD');
            }
          }
        });
        
        storeFormatPattern(
          normalizedData.utilityInfo.utilityName,
          fileType,
          {
            headers,
            sampleRows: lines.slice(1, 3),
            hasHeaderRow: true,
          },
          normalizedData,
          {
            dateColumn: headers.findIndex(h => /date/i.test(h)),
            kwhColumn: headers.findIndex(h => /kwh|usage|consumption/i.test(h)),
            costColumn: headers.findIndex(h => /cost|amount|charge/i.test(h)),
          },
          dateFormats.length > 0 ? [...new Set(dateFormats)] : undefined
        ).catch(err => {
          console.error('[read-statement] Error storing format pattern:', err);
        });
      }
    }

    const readStatementResponse: ReadStatementResponse = {
      success: true,
      extractedData: normalizedData,
    };

    // Return HTTP response if called via Function URL
    if (isHttpRequest) {
      return createResponse(200, readStatementResponse) as { statusCode: number; headers: Record<string, string>; body: string };
    }

    // Return direct invocation response
    return readStatementResponse as ReadStatementResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[read-statement] Error reading statement:', {
      message: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name,
    });
    
    const errorResponse: ReadStatementResponse = {
      success: false,
      error: errorMessage,
    };

    // Return HTTP error response if called via Function URL
    if (isHttpRequest) {
      return createResponse(500, errorResponse) as { statusCode: number; headers: Record<string, string>; body: string };
    }

    // Return direct invocation error response
    return errorResponse as ReadStatementResponse;
  }
};

