import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement, Effect, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnUserPool } from 'aws-cdk-lib/aws-cognito';
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import {
  normalizeDataFunction,
  generateRecommendationsFunction,
  updatePlanCatalogFunction,
  processUsageDataFunction,
  readStatementFunction,
  autoConfirmUserFunction,
  saveCurrentPlanFunction,
  saveUsageDataFunction,
} from './api/resource';

export const backend = defineBackend({
  auth,
  data,
  normalizeDataFunction,
  generateRecommendationsFunction,
  updatePlanCatalogFunction,
  processUsageDataFunction,
  readStatementFunction,
  autoConfirmUserFunction,
  saveCurrentPlanFunction,
  saveUsageDataFunction,
});

// Disable all verification - remove email from auto-verified attributes
const userPool = backend.auth.resources.userPool;
const cfnUserPool = userPool.node.defaultChild as CfnUserPool;
cfnUserPool.autoVerifiedAttributes = []; // Empty array disables email verification
cfnUserPool.userAttributeUpdateSettings = {
  attributesRequireVerificationBeforeUpdate: [], // Don't require verification to update email
};
// Attach Pre Sign-Up Lambda trigger to auto-confirm users
// This automatically confirms users and marks email as verified, bypassing verification prompts
cfnUserPool.lambdaConfig = {
  preSignUp: backend.autoConfirmUserFunction.resources.lambda.functionArn,
};
// Grant permission for Cognito to invoke the Lambda function
backend.autoConfirmUserFunction.resources.lambda.addPermission('CognitoInvoke', {
  principal: new ServicePrincipal('cognito-idp.amazonaws.com'),
  sourceArn: cfnUserPool.attrArn,
});
// Note: We don't override accountRecoverySetting because Cognito requires at least one recovery mechanism.
// The Pre Sign-Up trigger automatically confirms users, bypassing verification prompts.

// Grant DynamoDB permissions to the updatePlanCatalogFunction
// This allows the function to directly access DynamoDB tables for the EnergyPlan model
// The table name pattern is: EnergyPlan-{ApiId}-NONE
// We'll grant permissions to all tables matching this pattern using a wildcard
backend.updatePlanCatalogFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:DeleteItem',
      'dynamodb:Query',
      'dynamodb:Scan',
    ],
    resources: [
      'arn:aws:dynamodb:*:*:table/EnergyPlan-*-NONE',
      'arn:aws:dynamodb:*:*:table/EnergyPlan-*-NONE/*',
    ],
  })
);

// Grant DynamoDB permissions to save functions
backend.saveCurrentPlanFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:Query',
    ],
    resources: [
      'arn:aws:dynamodb:*:*:table/*-CurrentPlan-*',
      'arn:aws:dynamodb:*:*:table/*-CurrentPlan-*/*',
    ],
  })
);

backend.saveUsageDataFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:Query',
    ],
    resources: [
      'arn:aws:dynamodb:*:*:table/*-CustomerUsageData-*',
      'arn:aws:dynamodb:*:*:table/*-CustomerUsageData-*/*',
    ],
  })
);

// Grant DynamoDB permissions to generateRecommendationsFunction
// This allows the function to read UsagePattern and RecommendationHistory tables
// and write to RecommendationHistory table
backend.generateRecommendationsFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:Query',
      'dynamodb:Scan',
    ],
    resources: [
      'arn:aws:dynamodb:*:*:table/*-UsagePattern-*',
      'arn:aws:dynamodb:*:*:table/*-UsagePattern-*/*',
      'arn:aws:dynamodb:*:*:table/*-RecommendationHistory-*',
      'arn:aws:dynamodb:*:*:table/*-RecommendationHistory-*/*',
    ],
  })
);

// Note: The table name is constructed dynamically in the handler function
// from the AMPLIFY_DATA_GRAPHQL_ENDPOINT environment variable
// Pattern: EnergyPlan-{ApiId}-NONE
// This avoids hardcoding the table name and makes it work across different deployments

// Add Function URLs to Lambda functions and expose them in custom outputs
// Create Function URLs for functions that need to be called from the frontend
// Using NONE auth type - CORS is handled in Lambda function handlers
// Note: Functions should validate Cognito tokens in their handlers for security
const generateRecommendationsUrl = backend.generateRecommendationsFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

const readStatementUrl = backend.readStatementFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

const saveCurrentPlanUrl = backend.saveCurrentPlanFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

const saveUsageDataUrl = backend.saveUsageDataFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

const updatePlanCatalogUrl = backend.updatePlanCatalogFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});

// Add custom outputs to expose function URLs in amplify_outputs.json
// Amplify Gen 2 will automatically include these in outputs.custom
backend.addOutput({
  custom: {
    generateRecommendationsFunction: {
      url: generateRecommendationsUrl.url,
    },
    readStatementFunction: {
      url: readStatementUrl.url,
    },
    saveCurrentPlanFunction: {
      url: saveCurrentPlanUrl.url,
    },
    saveUsageDataFunction: {
      url: saveUsageDataUrl.url,
    },
    updatePlanCatalogFunction: {
      url: updatePlanCatalogUrl.url,
    },
  },
});

