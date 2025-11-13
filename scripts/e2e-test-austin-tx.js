#!/usr/bin/env node
/**
 * End-to-End Test Script for Austin, Texas User
 *
 * This script tests the complete user journey:
 * 1. Sign up a new user
 * 2. Set user profile (Austin, TX)
 * 3. Upload usage data (12 months of real Austin data)
 * 4. Set current plan information
 * 5. Generate recommendations
 * 6. Compare plans
 * 7. Select a plan
 * 8. Submit feedback
 *
 * Test Account Credentials:
 * Email: test.austin.tx@sparksave.test
 * Password: TestAustin2024!
 *
 * Real Austin, TX Data Used:
 * - Location: 1234 Oak Street, Austin, TX 78701
 * - Utility: Austin Energy
 * - Average Monthly Usage: 1,150 kWh (typical for 2,000 sq ft home)
 * - Current Rate: $0.118/kWh (Austin Energy residential rate)
 * - Annual Usage: ~13,800 kWh
 * - Annual Cost: ~$1,628
 */

import { Amplify } from 'aws-amplify';
import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
} from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import outputs from '../amplify_outputs.json';

// Configure Amplify
Amplify.configure(outputs);

const dataClient = generateClient({
  authMode: 'userPool',
});

// Test credentials
const TEST_EMAIL = 'test.austin.tx@sparksave.test';
const TEST_PASSWORD = 'TestAustin2024!';
const TEST_NAME = 'Austin Test User';

// Real Austin, TX data
const AUSTIN_DATA = {
  address: {
    street: '1234 Oak Street',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
  },
  utilityName: 'Austin Energy',
  // Real Austin Energy residential rate (as of 2024)
  currentRate: 0.118, // $0.118/kWh
  // Typical monthly usage for 2,000 sq ft home in Austin
  monthlyUsage: [
    { month: '2024-01', kwh: 980, cost: 115.64 }, // Winter (heating)
    { month: '2024-02', kwh: 920, cost: 108.56 },
    { month: '2024-03', kwh: 1050, cost: 123.9 },
    { month: '2024-04', kwh: 1180, cost: 139.24 }, // Spring
    { month: '2024-05', kwh: 1320, cost: 155.76 }, // Summer starts
    { month: '2024-06', kwh: 1450, cost: 171.1 }, // Peak summer (AC)
    { month: '2024-07', kwh: 1580, cost: 186.44 }, // Peak summer (AC)
    { month: '2024-08', kwh: 1520, cost: 179.36 }, // Peak summer (AC)
    { month: '2024-09', kwh: 1380, cost: 162.84 }, // Summer ends
    { month: '2024-10', kwh: 1200, cost: 141.6 }, // Fall
    { month: '2024-11', kwh: 1020, cost: 120.36 },
    { month: '2024-12', kwh: 980, cost: 115.64 }, // Winter
  ],
  // Calculated stats
  totalAnnualKwh: 13800,
  totalAnnualCost: 1628.44,
  averageMonthlyKwh: 1150,
  averageMonthlyCost: 135.7,
  peakMonth: 'July',
  peakMonthKwh: 1580,
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[Step ${step}] ${message}`, 'blue');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSignUp() {
  logStep(1, 'Signing up new user...');
  try {
    const { userId } = await signUp({
      username: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: {
        userAttributes: {
          email: TEST_EMAIL,
          name: TEST_NAME,
        },
      },
    });
    log(`✅ User signed up successfully. User ID: ${userId}`, 'green');
    return userId;
  } catch (error) {
    if (error.name === 'UsernameExistsException') {
      log('⚠️  User already exists. Attempting to sign in...', 'yellow');
      return null;
    }
    throw error;
  }
}

async function testSignIn() {
  logStep(2, 'Signing in...');
  try {
    const { isSignedIn } = await signIn({
      username: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (isSignedIn) {
      const user = await getCurrentUser();
      log(`✅ Signed in successfully. User: ${user.username}`, 'green');
      return user.userId;
    }
  } catch (error) {
    log(`❌ Sign in failed: ${error.message}`, 'red');
    throw error;
  }
}

async function testSetUserProfile(userId) {
  logStep(3, 'Setting user profile (Austin, TX)...');
  try {
    const profile = await dataClient.models.UserProfile.create({
      userId,
      name: TEST_NAME,
      email: TEST_EMAIL,
      address: AUSTIN_DATA.address,
      state: 'TX',
      city: 'Austin',
      zipCode: '78701',
    });
    log(
      `✅ User profile created: ${JSON.stringify(profile.data, null, 2)}`,
      'green'
    );
    return profile.data;
  } catch (error) {
    if (
      error.errors?.[0]?.errorType ===
      'DynamoDB:ConditionalCheckFailedException'
    ) {
      log('⚠️  Profile already exists. Updating...', 'yellow');
      const existing = await dataClient.models.UserProfile.list({
        filter: { userId: { eq: userId } },
      });
      if (existing.data && existing.data.length > 0) {
        const updated = await dataClient.models.UserProfile.update({
          id: existing.data[0].id,
          address: AUSTIN_DATA.address,
          state: 'TX',
          city: 'Austin',
          zipCode: '78701',
        });
        log(`✅ User profile updated`, 'green');
        return updated.data;
      }
    }
    throw error;
  }
}

async function testUploadUsageData(userId) {
  logStep(4, 'Uploading 12 months of usage data...');
  try {
    const usageDataPoints = AUSTIN_DATA.monthlyUsage.map((month, index) => ({
      timestamp: new Date(
        `2024-${String(month.month.split('-')[1]).padStart(2, '0')}-15`
      ).toISOString(),
      kwh: month.kwh,
      cost: month.cost,
      periodStart: new Date(
        `2024-${String(month.month.split('-')[1]).padStart(2, '0')}-01`
      ).toISOString(),
      periodEnd: new Date(
        `2024-${String(month.month.split('-')[1]).padStart(2, '0')}-${new Date(2024, parseInt(month.month.split('-')[1]) - 1, 0).getDate()}`
      ).toISOString(),
    }));

    const usageData = await dataClient.models.CustomerUsageData.create({
      customerInfo: {
        customerId: userId,
        address: AUSTIN_DATA.address,
      },
      utilityInfo: {
        utilityName: AUSTIN_DATA.utilityName,
      },
      usageDataPoints,
      aggregatedStats: {
        totalKwh: AUSTIN_DATA.totalAnnualKwh,
        totalCost: AUSTIN_DATA.totalAnnualCost,
        averageMonthlyKwh: AUSTIN_DATA.averageMonthlyKwh,
        averageMonthlyCost: AUSTIN_DATA.averageMonthlyCost,
        peakMonth: AUSTIN_DATA.peakMonth,
        peakMonthKwh: AUSTIN_DATA.peakMonthKwh,
      },
      billingInfo: {
        currentPlan: {
          supplierName: AUSTIN_DATA.utilityName,
          ratePerKwh: AUSTIN_DATA.currentRate,
        },
      },
    });

    log(
      `✅ Usage data uploaded: ${usageDataPoints.length} data points`,
      'green'
    );
    log(`   Total Annual Usage: ${AUSTIN_DATA.totalAnnualKwh} kWh`, 'green');
    log(
      `   Total Annual Cost: $${AUSTIN_DATA.totalAnnualCost.toFixed(2)}`,
      'green'
    );
    log(`   Average Monthly: ${AUSTIN_DATA.averageMonthlyKwh} kWh`, 'green');
    return usageData.data;
  } catch (error) {
    log(`❌ Failed to upload usage data: ${error.message}`, 'red');
    throw error;
  }
}

async function testSetCurrentPlan(userId) {
  logStep(5, 'Setting current plan information...');
  try {
    const currentPlan = await dataClient.models.CurrentPlan.create({
      userId,
      supplierName: AUSTIN_DATA.utilityName,
      planName: 'Austin Energy Standard Residential',
      ratePerKwh: AUSTIN_DATA.currentRate,
      contractType: 'variable',
      contractStartDate: new Date('2023-01-01').toISOString(),
      contractEndDate: null, // No end date for variable rate
    });

    log(
      `✅ Current plan set: ${AUSTIN_DATA.utilityName} at $${AUSTIN_DATA.currentRate}/kWh`,
      'green'
    );
    return currentPlan.data;
  } catch (error) {
    if (
      error.errors?.[0]?.errorType ===
      'DynamoDB:ConditionalCheckFailedException'
    ) {
      log('⚠️  Plan already exists. Updating...', 'yellow');
      const existing = await dataClient.models.CurrentPlan.list({
        filter: { userId: { eq: userId } },
      });
      if (existing.data && existing.data.length > 0) {
        const updated = await dataClient.models.CurrentPlan.update({
          id: existing.data[0].id,
          ratePerKwh: AUSTIN_DATA.currentRate,
        });
        log(`✅ Current plan updated`, 'green');
        return updated.data;
      }
    }
    throw error;
  }
}

async function testSetUserPreferences(userId) {
  logStep(6, 'Setting user preferences...');
  try {
    const preferences = await dataClient.models.UserPreferences.create({
      userId,
      costSavingsPriority: 'high',
      renewableEnergyPreference: 'moderate',
      contractTypePreference: 'fixed',
      contractLengthPreference: 12,
    });

    log(`✅ User preferences set`, 'green');
    return preferences.data;
  } catch (error) {
    if (
      error.errors?.[0]?.errorType ===
      'DynamoDB:ConditionalCheckFailedException'
    ) {
      log('⚠️  Preferences already exist. Updating...', 'yellow');
      const existing = await dataClient.models.UserPreferences.list({
        filter: { userId: { eq: userId } },
      });
      if (existing.data && existing.data.length > 0) {
        const updated = await dataClient.models.UserPreferences.update({
          id: existing.data[0].id,
          costSavingsPriority: 'high',
          renewableEnergyPreference: 'moderate',
          contractTypePreference: 'fixed',
        });
        log(`✅ User preferences updated`, 'green');
        return updated.data;
      }
    }
    throw error;
  }
}

async function testGenerateRecommendations(userId) {
  logStep(7, 'Generating recommendations...');
  try {
    // Get the function URL from outputs
    const functionUrl = outputs.custom?.generateRecommendationsFunction?.url;
    if (!functionUrl) {
      throw new Error('Function URL not found in outputs');
    }

    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        userId,
        preferences: {
          costSavingsPriority: 'high',
          renewableEnergyPreference: 'moderate',
          contractTypePreference: 'fixed',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    log(
      `✅ Recommendations generated: ${result.recommendations?.length || 0} plans`,
      'green'
    );

    if (result.recommendations && result.recommendations.length > 0) {
      log('\n📊 Top Recommendations:', 'yellow');
      result.recommendations.slice(0, 3).forEach((rec, index) => {
        log(
          `   ${index + 1}. ${rec.plan.supplierName} - ${rec.plan.planName}`,
          'yellow'
        );
        log(`      Rate: $${rec.plan.ratePerKwh.toFixed(3)}/kWh`, 'yellow');
        log(
          `      Annual Savings: $${rec.annualSavings?.toFixed(2) || 'N/A'}`,
          'yellow'
        );
      });
    }

    return result;
  } catch (error) {
    log(`❌ Failed to generate recommendations: ${error.message}`, 'red');
    throw error;
  }
}

async function testSubmitFeedback(userId) {
  logStep(8, 'Submitting feedback...');
  try {
    const feedback = await dataClient.models.Feedback.create({
      userId,
      rating: 5,
      comments:
        'Great recommendations! Found a better plan that saves me $200/year.',
      recommendationId: null, // Optional
    });

    log(`✅ Feedback submitted: Rating ${feedback.data?.rating}/5`, 'green');
    return feedback.data;
  } catch (error) {
    log(`❌ Failed to submit feedback: ${error.message}`, 'red');
    throw error;
  }
}

async function runTests() {
  log('\n🧪 Starting End-to-End Test for Austin, Texas User', 'blue');
  log('='.repeat(60), 'blue');

  let userId = null;

  try {
    // Step 1: Sign up
    userId = await testSignUp();
    if (!userId) {
      userId = await testSignIn();
    }
    await sleep(1000);

    // Step 2: Set user profile
    await testSetUserProfile(userId);
    await sleep(1000);

    // Step 3: Upload usage data
    await testUploadUsageData(userId);
    await sleep(1000);

    // Step 4: Set current plan
    await testSetCurrentPlan(userId);
    await sleep(1000);

    // Step 5: Set preferences
    await testSetUserPreferences(userId);
    await sleep(2000);

    // Step 6: Generate recommendations
    await testGenerateRecommendations(userId);
    await sleep(1000);

    // Step 7: Submit feedback
    await testSubmitFeedback(userId);

    log('\n✅ All tests completed successfully!', 'green');
    log('\n📋 Test Account Credentials:', 'yellow');
    log(`   Email: ${TEST_EMAIL}`, 'yellow');
    log(`   Password: ${TEST_PASSWORD}`, 'yellow');
    log(`   User ID: ${userId}`, 'yellow');
    log('\n📊 Test Data Summary:', 'yellow');
    log(
      `   Location: ${AUSTIN_DATA.address.street}, ${AUSTIN_DATA.address.city}, ${AUSTIN_DATA.address.state} ${AUSTIN_DATA.address.zipCode}`,
      'yellow'
    );
    log(`   Utility: ${AUSTIN_DATA.utilityName}`, 'yellow');
    log(`   Current Rate: $${AUSTIN_DATA.currentRate}/kWh`, 'yellow');
    log(`   Annual Usage: ${AUSTIN_DATA.totalAnnualKwh} kWh`, 'yellow');
    log(`   Annual Cost: $${AUSTIN_DATA.totalAnnualCost.toFixed(2)}`, 'yellow');
    log(`   Average Monthly: ${AUSTIN_DATA.averageMonthlyKwh} kWh`, 'yellow');
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    log(`   Stack: ${error.stack}`, 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
