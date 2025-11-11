/**
 * Script to check if energy plans were created
 */

import { Amplify } from 'aws-amplify';
import { readFileSync } from 'fs';
import { generateClient } from 'aws-amplify/data';

const outputs = JSON.parse(readFileSync('./amplify_outputs.json', 'utf-8'));

// Configure Amplify
Amplify.configure(outputs);

// Generate data client
const client = generateClient({
  authMode: 'iam',
});

async function checkPlans() {
  console.log('🔍 Checking energy plans in DynamoDB...\n');

  const states = ['CA', 'TX', 'NY', 'FL', 'IL', 'PA', 'OH', 'GA'];

  for (const state of states) {
    try {
      const plans = await client.models.EnergyPlan.list({
        filter: {
          state: { eq: state },
        },
        limit: 10,
      });

      const count = plans.data?.length || 0;
      if (count > 0) {
        console.log(`✅ ${state}: ${count} plans found`);
        if (plans.data && plans.data.length > 0) {
          const sample = plans.data[0];
          console.log(
            `   Sample: ${sample.planName} by ${sample.supplierName} - $${sample.ratePerKwh}/kWh`
          );
        }
      } else {
        console.log(`⚠️  ${state}: No plans found`);
      }
    } catch (error) {
      console.log(
        `❌ ${state}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Get total count
  try {
    const allPlans = await client.models.EnergyPlan.list({ limit: 1000 });
    const total = allPlans.data?.length || 0;
    console.log(`\n📊 Total plans in database: ${total}`);
  } catch (error) {
    console.log(
      `\n❌ Error getting total count: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

checkPlans()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
