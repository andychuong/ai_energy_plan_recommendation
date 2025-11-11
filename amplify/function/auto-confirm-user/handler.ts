import type { PreSignUpTriggerHandler } from 'aws-lambda';

/**
 * Pre Sign-Up Lambda Trigger
 * Automatically confirms users and marks their email as verified
 * This bypasses the verification step during sign-up
 */
export const handler: PreSignUpTriggerHandler = async (event) => {
  // Auto-confirm the user
  event.response.autoConfirmUser = true;
  
  // Mark email as verified
  if (event.request.userAttributes.email) {
    event.response.autoVerifyEmail = true;
  }

  return event;
};

