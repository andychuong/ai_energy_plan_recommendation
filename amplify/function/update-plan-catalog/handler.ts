import type { Handler } from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

/**
 * Plan Catalog Update Lambda Function
 *
 * Updates the energy plan catalog from various APIs:
 * - EIA API: Average electricity rates by state
 * - OpenEI API: Utility rate data
 * - Generates realistic plans based on market rates
 */

// Generate client for DynamoDB access
const client = generateClient<Schema>({
  authMode: 'iam',
});

interface UpdatePlanCatalogEvent {
  sources?: string[]; // ['eia', 'openei']
  states?: string[]; // State codes to update (e.g., ['CA', 'TX'])
}

interface UpdatePlanCatalogResponse {
  success: boolean;
  plansUpdated?: number;
  error?: string;
}


/**
 * Fetch average electricity rates from EIA API
 * EIA API provides average retail electricity prices by state
 * Uses EIA API v2 for retail sales data
 */
async function fetchEIARates(state: string): Promise<number | null> {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    console.warn('EIA_API_KEY not configured, skipping EIA data');
    return null;
  }

  try {
    // EIA API v2 endpoint for average retail electricity prices by state
    // Get most recent monthly average price
    const stateCode = state.toUpperCase();
    
    // Try EIA API v2 retail sales endpoint
    const url = `https://api.eia.gov/v2/electricity/retail-sales/data/?api_key=${apiKey}&frequency=monthly&data[0]=price&facets[stateid][]=${stateCode}&sort[0][column]=period&sort[0][direction]=desc&length=1`;

    const response = await fetch(url);
    if (!response.ok) {
      // If v2 fails, try v1 series API as fallback
      console.warn(`EIA API v2 failed, trying v1 fallback for ${state}`);
      return await fetchEIAv1Rates(state, apiKey);
    }

    const data = (await response.json()) as {
      response?: {
        data?: Array<{
          period: string;
          price: number;
          stateid: string;
        }>;
      };
    };

    if (data.response?.data && data.response.data.length > 0) {
      // Get the most recent price (in cents per kWh, convert to dollars)
      const price = data.response.data[0].price;
      if (price && price > 0) {
        return price / 100; // Convert cents to dollars
      }
    }

    // Fallback to v1 API
    return await fetchEIAv1Rates(state, apiKey);
  } catch (error) {
    console.error(`Error fetching EIA rates for ${state}:`, error);
    // Try v1 API as fallback
    return await fetchEIAv1Rates(state, process.env.EIA_API_KEY || '');
  }
}

/**
 * Fallback to EIA API v1 for rates
 */
async function fetchEIAv1Rates(state: string, apiKey: string): Promise<number | null> {
  if (!apiKey) return null;

  try {
    // EIA API v1 series endpoint
    // Series ID: ELEC.PRICE.{STATE}-ALL.A (average price, all sectors)
    const stateCode = state.toUpperCase();
    const seriesId = `ELEC.PRICE.${stateCode}-ALL.A`;
    const url = `https://api.eia.gov/v2/seriesid/${seriesId}/?api_key=${apiKey}&out=json`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      series?: Array<{
        data?: Array<[string, number | null]>;
      }>;
    };

    if (data.series && data.series.length > 0 && data.series[0].data) {
      // Get the most recent non-null value
      const values = data.series[0].data
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([, value]) => value as number);

      if (values.length > 0) {
        // Get average of last 3 months for stability
        const recentValues = values.slice(-3);
        const avgPrice = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
        return avgPrice / 100; // Convert cents to dollars
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching EIA v1 rates for ${state}:`, error);
    return null;
  }
}

/**
 * Fetch utility rate data from OpenEI
 * OpenEI provides utility rate data including time-of-use rates
 */
async function fetchOpenEIRates(state: string): Promise<number | null> {
  const apiKey = process.env.OPENEI_API_KEY;
  if (!apiKey) {
    console.warn('OPENEI_API_KEY not configured, skipping OpenEI data');
    return null;
  }

  try {
    // OpenEI Utility Rates API
    // Note: OpenEI API structure may vary, this is a general approach
    const url = `https://api.openei.org/utility_rates?version=7&format=json&api_key=${apiKey}&state=${state}&limit=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenEI API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      items?: Array<{
        rate: number;
        label: string;
      }>;
    };

    if (data.items && data.items.length > 0) {
      // Get average rate from available data
      const rates = data.items.map(item => item.rate).filter(r => r > 0);
      if (rates.length > 0) {
        const avgRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
        return avgRate;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching OpenEI rates for ${state}:`, error);
    return null;
  }
}

/**
 * Generate realistic energy plans based on market rates
 * Creates variations of plans with different contract types, renewable percentages, etc.
 */
function generatePlansFromRate(
  baseRate: number,
  state: string,
  supplierIndex: number
): Array<{
  planId: string;
  supplierName: string;
  planName: string;
  ratePerKwh: number;
  contractType: 'fixed' | 'variable' | 'indexed' | 'hybrid';
  contractLengthMonths?: number;
  renewablePercentage?: number;
  earlyTerminationFee?: number;
  supplierRating?: number;
  state: string;
}> {
  const suppliers = [
    'Green Energy Co',
    'Budget Power',
    'Eco Power Solutions',
    'Reliable Energy',
    'Smart Energy',
    'Clean Power Co',
    'Value Energy',
    'Premium Power',
  ];

  const supplierName = suppliers[supplierIndex % suppliers.length];
  const plans: Array<{
    planId: string;
    supplierName: string;
    planName: string;
    ratePerKwh: number;
    contractType: 'fixed' | 'variable' | 'indexed' | 'hybrid';
    contractLengthMonths?: number;
    renewablePercentage?: number;
    earlyTerminationFee?: number;
    supplierRating?: number;
    state: string;
  }> = [];

  // Generate 3-4 plans per supplier with variations
  const variations = [
    {
      planName: 'Fixed Rate 12 Month',
      contractType: 'fixed' as const,
      contractLengthMonths: 12,
      ratePerKwh: baseRate * (0.95 + Math.random() * 0.1), // ±5% variation
      renewablePercentage: Math.random() > 0.5 ? 100 : 0,
      earlyTerminationFee: Math.random() > 0.5 ? 0 : 50 + Math.random() * 100,
      supplierRating: 3.5 + Math.random() * 1.5,
    },
    {
      planName: 'Fixed Rate 24 Month',
      contractType: 'fixed' as const,
      contractLengthMonths: 24,
      ratePerKwh: baseRate * (0.9 + Math.random() * 0.1), // Slightly lower for longer term
      renewablePercentage: Math.random() > 0.5 ? 50 : 0,
      earlyTerminationFee: 100 + Math.random() * 150,
      supplierRating: 3.5 + Math.random() * 1.5,
    },
    {
      planName: 'Variable Rate',
      contractType: 'variable' as const,
      contractLengthMonths: 0,
      ratePerKwh: baseRate * (0.85 + Math.random() * 0.15), // More variation
      renewablePercentage: Math.random() > 0.5 ? 25 : 0,
      earlyTerminationFee: 0,
      supplierRating: 3 + Math.random() * 2,
    },
    {
      planName: 'Green Energy Plus',
      contractType: 'fixed' as const,
      contractLengthMonths: 12,
      ratePerKwh: baseRate * (1.05 + Math.random() * 0.1), // Premium for green
      renewablePercentage: 100,
      earlyTerminationFee: 0,
      supplierRating: 4 + Math.random() * 1,
    },
  ];

  variations.forEach((variation, index) => {
    plans.push({
      planId: `plan-${state}-${supplierIndex}-${index}-${Date.now()}`,
      supplierName,
      planName: `${supplierName} ${variation.planName}`,
      ratePerKwh: Math.round(variation.ratePerKwh * 1000) / 1000, // Round to 3 decimals
      contractType: variation.contractType,
      contractLengthMonths: variation.contractLengthMonths,
      renewablePercentage: variation.renewablePercentage,
      earlyTerminationFee: Math.round(variation.earlyTerminationFee || 0),
      supplierRating: Math.round(variation.supplierRating * 10) / 10,
      state,
    });
  });

  return plans;
}

/**
 * Store plans in DynamoDB
 */
async function storePlans(plans: Array<{
  planId: string;
  supplierName: string;
  planName: string;
  ratePerKwh: number;
  contractType: 'fixed' | 'variable' | 'indexed' | 'hybrid';
  contractLengthMonths?: number;
  renewablePercentage?: number;
  earlyTerminationFee?: number;
  supplierRating?: number;
  state: string;
}>): Promise<number> {
  let stored = 0;
  const now = new Date().toISOString();

  for (const plan of plans) {
    try {
      // Check if plan already exists by querying with planId
      // Note: Amplify uses 'id' as primary key, but we store planId as a field
      const existingPlans = await client.models.EnergyPlan.list({
        filter: {
          planId: { eq: plan.planId },
        },
      });

      const planData = {
        planId: plan.planId,
        supplierName: plan.supplierName,
        planName: plan.planName,
        ratePerKwh: plan.ratePerKwh,
        contractType: plan.contractType,
        contractLengthMonths: plan.contractLengthMonths,
        renewablePercentage: plan.renewablePercentage,
        earlyTerminationFee: plan.earlyTerminationFee,
        supplierRating: plan.supplierRating,
        state: plan.state,
        updatedAt: now,
      };

      const existing = existingPlans.data?.[0];

      if (!existing) {
        // Create new plan
        await client.models.EnergyPlan.create({
          ...planData,
          createdAt: now,
        });
        stored++;
      } else {
        // Update existing plan (use the id from existing plan)
        await client.models.EnergyPlan.update({
          id: existing.id,
          ...planData,
          createdAt: existing.createdAt || now,
        });
        stored++;
      }
    } catch (error) {
      console.error(`Error storing plan ${plan.planId}:`, error);
      // Continue with next plan even if one fails
    }
  }

  return stored;
}

export const handler: Handler<
  UpdatePlanCatalogEvent,
  UpdatePlanCatalogResponse
> = async (event) => {
  try {
    const { sources = ['eia', 'openei'], states = ['CA', 'TX', 'NY', 'FL'] } = event;

    let totalPlansStored = 0;

    // Process each state
    for (const state of states) {
      let baseRate: number | null = null;

      // Try to get rate from EIA first
      if (sources.includes('eia')) {
        baseRate = await fetchEIARates(state);
      }

      // Fallback to OpenEI if EIA didn't work
      if (!baseRate && sources.includes('openei')) {
        baseRate = await fetchOpenEIRates(state);
      }

      // If we still don't have a rate, use state average defaults
      if (!baseRate) {
        const stateAverages: Record<string, number> = {
          CA: 0.22, // California average
          TX: 0.12, // Texas average
          NY: 0.18, // New York average
          FL: 0.12, // Florida average
          IL: 0.12, // Illinois average
          PA: 0.14, // Pennsylvania average
          OH: 0.12, // Ohio average
          GA: 0.11, // Georgia average
        };
        baseRate = stateAverages[state.toUpperCase()] || 0.13; // Default to $0.13/kWh
        console.warn(`Using default rate for ${state}: $${baseRate}/kWh`);
      }

      // Generate plans for this state
      // Generate plans from 3-4 different suppliers
      const numSuppliers = 3 + Math.floor(Math.random() * 2); // 3-4 suppliers
      const allPlans: Array<{
        planId: string;
        supplierName: string;
        planName: string;
        ratePerKwh: number;
        contractType: 'fixed' | 'variable' | 'indexed' | 'hybrid';
        contractLengthMonths?: number;
        renewablePercentage?: number;
        earlyTerminationFee?: number;
        supplierRating?: number;
        state: string;
      }> = [];

      for (let i = 0; i < numSuppliers; i++) {
        const supplierPlans = generatePlansFromRate(baseRate, state, i);
        allPlans.push(...supplierPlans);
      }

      // Store plans in DynamoDB
      const stored = await storePlans(allPlans);
      totalPlansStored += stored;

      // eslint-disable-next-line no-console
      console.log(
        `Generated ${allPlans.length} plans for ${state}, stored ${stored}`
      );
    }

    return {
      success: true,
      plansUpdated: totalPlansStored,
    };
  } catch (error) {
    console.error('Error updating plan catalog:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
