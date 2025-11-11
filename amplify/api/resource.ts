import { defineFunction } from '@aws-amplify/backend';
import { secret } from '@aws-amplify/backend';

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
    OPENROUTER_API_KEY: secret('OPENROUTER_API_KEY'),
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
    OPENROUTER_API_KEY: secret('OPENROUTER_API_KEY'),
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
    // EIA and OpenEI API keys - set via Parameter Store secrets
    // For sandbox: npx ampx sandbox secret set EIA_API_KEY
    // For production: Set in Parameter Store as /amplify/{app-name}/main/EIA_API_KEY
    // The handler gracefully handles missing keys by falling back to default rates
    EIA_API_KEY: secret('EIA_API_KEY'),
    OPENEI_API_KEY: secret('OPENEI_API_KEY'),
    // Table name will be set dynamically by backend.ts from the data resource
    // This allows the table name to be determined at deployment time
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
    OPENROUTER_API_KEY: secret('OPENROUTER_API_KEY'),
  },
});

/**
 * Auto Confirm User Function
 * Pre Sign-Up Lambda trigger that automatically confirms users
 * and marks their email as verified to bypass verification steps
 * Assigned to auth stack to avoid circular dependency
 */
export const autoConfirmUserFunction = defineFunction({
  name: 'auto-confirm-user',
  entry: '../function/auto-confirm-user/handler.ts',
  resourceGroupName: 'auth', // Assign to auth stack since it's an auth trigger
});

/**
 * Save Current Plan Function
 * Saves user's current energy plan information
 */
export const saveCurrentPlanFunction = defineFunction({
  name: 'save-current-plan',
  entry: '../function/save-current-plan/handler.ts',
});

/**
 * Save Usage Data Function
 * Saves user's energy usage data
 */
export const saveUsageDataFunction = defineFunction({
  name: 'save-usage-data',
  entry: '../function/save-usage-data/handler.ts',
});

