# AI Statement Reader Function

## Overview

This Lambda function reads and extracts data from energy bill statements using AI. It supports PDF, images (PNG, JPG), and text formats.

## Model Used

- **OpenRouter**: `openai/gpt-4o` (for images/PDFs) or `openai/gpt-4-turbo` (for text)
- **Why**: GPT-4 Vision can read images and PDFs, GPT-4 Turbo is cost-effective for text
- **Cost**: ~$0.01-0.05 per request (depending on file size)

## Environment Variables

- `OPENROUTER_API_KEY` - OpenRouter API key (set via Amplify secrets)

## Supported Formats

- **PDF**: `application/pdf`
- **Images**: `image/png`, `image/jpeg`, `image/jpg`
- **Text**: `text/plain`
- **CSV**: `text/csv` - AI intelligently parses CSV files and extracts structured data

## Usage

```typescript
const event = {
  userId: 'user-123',
  statementData: {
    content: 'base64-encoded-file-content',
    fileType: 'pdf' | 'image' | 'text' | 'csv',
    mimeType: 'application/pdf' | 'image/png' | 'text/plain' | 'text/csv',
    filename: 'bill.pdf' // optional
  }
};

const response = await handler(event);
```

## Response

```typescript
{
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
```

## Setup

See `OPENROUTER_SETUP.md` for instructions on setting the API key.

## Features

- ✅ Extracts customer information (account number, address)
- ✅ Extracts utility/supplier information
- ✅ Extracts billing period dates
- ✅ Extracts usage data points (kWh, costs, dates)
- ✅ Extracts current plan details (supplier, rate)
- ✅ Calculates aggregated statistics
- ✅ Supports multiple file formats (PDF, images, text)
- ✅ Uses AI for intelligent extraction
- ✅ Returns standardized data format

