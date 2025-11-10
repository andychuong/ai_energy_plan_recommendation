import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import {
  normalizeDataFunction,
  generateRecommendationsFunction,
  updatePlanCatalogFunction,
  processUsageDataFunction,
  readStatementFunction,
} from './api/resource';

export const backend = defineBackend({
  auth,
  data,
  normalizeDataFunction,
  generateRecommendationsFunction,
  updatePlanCatalogFunction,
  processUsageDataFunction,
  readStatementFunction,
});

// Functions will be accessible via amplify_outputs.json after deployment
// Function URLs will be available as:
// - normalizeDataFunction.url
// - generateRecommendationsFunction.url

