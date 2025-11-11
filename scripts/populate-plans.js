/**
 * Script to populate energy plans in DynamoDB
 * Calls the updatePlanCatalog Lambda function handler directly
 */

import { handler } from '../amplify/function/update-plan-catalog/handler.ts';

async function populatePlans() {
  console.log('🚀 Starting plan catalog population...\n');

  // States to populate
  const states = ['CA', 'TX', 'NY', 'FL', 'IL', 'PA', 'OH', 'GA'];

  console.log(`Populating plans for states: ${states.join(', ')}\n`);

  try {
    const result = await handler({
      sources: ['eia', 'openei'],
      states,
    });

    if (result.success) {
      console.log(`\n✅ Success!`);
      console.log(`   Plans updated: ${result.plansUpdated || 0}`);
      console.log(`\n🎉 Energy plans have been populated!`);
    } else {
      console.error(`\n❌ Error: ${result.error || 'Unknown error'}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Failed to populate plans:`, error);
    process.exit(1);
  }
}

populatePlans();
