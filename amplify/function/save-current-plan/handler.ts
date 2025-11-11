import type { Handler } from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

/**
 * Save Current Plan Lambda Function
 * 
 * Saves user's current energy plan information
 */

const client = generateClient<Schema>({
  authMode: 'iam',
});

interface SaveCurrentPlanEvent {
  userId: string;
  currentPlan: {
    supplierName: string;
    planName?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    earlyTerminationFee?: number;
    contractType?: string;
  };
}

interface SaveCurrentPlanResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const handler: Handler<SaveCurrentPlanEvent, SaveCurrentPlanResponse> = async (event) => {
  try {
    const { userId, currentPlan } = event;

    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    if (!currentPlan.supplierName) {
      return {
        success: false,
        error: 'Supplier name is required',
      };
    }

    // Check if current plan exists for this user
    const existingPlans = await client.models.CurrentPlan.list({
      filter: { userId: { eq: userId } },
    });

    const now = new Date().toISOString();

    if (existingPlans.data && existingPlans.data.length > 0) {
      // Update existing plan
      const existingPlan = existingPlans.data[0];
      await client.models.CurrentPlan.update({
        id: existingPlan.id,
        supplierName: currentPlan.supplierName,
        planName: currentPlan.planName || null,
        contractStartDate: currentPlan.contractStartDate || null,
        contractEndDate: currentPlan.contractEndDate || null,
        earlyTerminationFee: currentPlan.earlyTerminationFee || null,
        contractType: currentPlan.contractType || null,
        updatedAt: now,
      });
    } else {
      // Create new plan
      await client.models.CurrentPlan.create({
        userId,
        supplierName: currentPlan.supplierName,
        planName: currentPlan.planName || null,
        contractStartDate: currentPlan.contractStartDate || null,
        contractEndDate: currentPlan.contractEndDate || null,
        earlyTerminationFee: currentPlan.earlyTerminationFee || null,
        contractType: currentPlan.contractType || null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      message: 'Current plan saved successfully',
    };
  } catch (error) {
    console.error('Error saving current plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save current plan',
    };
  }
};

