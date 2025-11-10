import { defineFunction } from '@aws-amplify/backend';

/**
 * API Functions
 * 
 * Lambda functions for:
 * - Data normalization
 * - Recommendation generation
 * - Plan catalog updates
 * - Usage data processing
 * - AI statement reader (PDF/image/text extraction)
 */

/**
 * Data Normalization Function
 * Normalizes energy usage data from various APIs to common format
 * Uses OpenRouter AI with GPT-3.5-turbo for cost efficiency
 */
export const normalizeDataFunction = defineFunction({
  name: 'normalize-data',
  entry: '../function/normalize-data/handler.ts',
  environment: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  },
});

/**
 * Recommendation Generation Function
 * Generates personalized energy plan recommendations
 * Uses OpenRouter AI with GPT-4-turbo for better reasoning
 */
export const generateRecommendationsFunction = defineFunction({
  name: 'generate-recommendations',
  entry: '../function/generate-recommendations/handler.ts',
  environment: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  },
});

/**
 * Plan Catalog Update Function
 * Updates the energy plan catalog from various APIs
 */
export const updatePlanCatalogFunction = defineFunction({
  name: 'update-plan-catalog',
  entry: '../function/update-plan-catalog/handler.ts',
  environment: {
    EIA_API_KEY: process.env.EIA_API_KEY || '',
    OPENEI_API_KEY: process.env.OPENEI_API_KEY || '',
  },
});

/**
 * Usage Data Processing Function
 * Processes and stores usage data
 */
export const processUsageDataFunction = defineFunction({
  name: 'process-usage-data',
  entry: '../function/process-usage-data/handler.ts',
});

/**
 * AI Statement Reader Function
 * Reads and extracts data from energy bill statements using AI
 * Supports PDF, images (PNG, JPG), and text formats
 * Uses OpenRouter AI with GPT-4 Vision for image/PDF processing
 */
export const readStatementFunction = defineFunction({
  name: 'read-statement',
  entry: '../function/read-statement/handler.ts',
  environment: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  },
});

