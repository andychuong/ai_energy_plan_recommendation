import type { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import OpenAI from 'openai';

/**
 * Recommendation Generation Lambda Function
 * 
 * Generates personalized energy plan recommendations based on:
 * - User usage data
 * - User preferences
 * - Available energy plans
 * - Historical data from memory bank
 * Uses OpenRouter AI with GPT-4-turbo for better reasoning
 */

// Initialize DynamoDB client
const awsRegion = process.env.AWS_REGION || 'us-east-1';
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: awsRegion,
}));

// Initialize OpenRouter client
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'https://sparksave.app', // Optional: for analytics
  },
});

interface GenerateRecommendationsEvent {
  userId: string;
  usageData: {
    usageDataPoints: Array<{
      timestamp: string;
      kwh: number;
      cost?: number;
    }>;
    aggregatedStats: {
      totalKwh: number;
      totalCost: number;
      averageMonthlyKwh: number;
      averageMonthlyCost: number;
      peakMonth: string;
      peakMonthKwh: number;
    };
  };
  preferences: {
    costSavingsPriority: 'high' | 'medium' | 'low';
    flexibilityPreference: number;
    renewableEnergyPreference: number;
    supplierRatingPreference: number;
    contractTypePreference: 'fixed' | 'variable' | 'indexed' | 'hybrid' | null;
    earlyTerminationFeeTolerance: number;
    budgetConstraints?: {
      maxMonthlyCost?: number;
      maxAnnualCost?: number;
    };
  };
  availablePlans: Array<{
    planId: string;
    supplierName: string;
    planName: string;
    ratePerKwh: number;
    contractType: 'fixed' | 'variable' | 'indexed' | 'hybrid';
    contractLength?: number;
    renewablePercentage?: number;
    earlyTerminationFee?: number;
    monthlyFee?: number;
    supplierRating?: number;
  }>;
}

interface GenerateRecommendationsResponse {
  success: boolean;
  recommendations?: Array<{
    planId: string;
    rank: number;
    projectedSavings: number;
    annualSavings: number;
    monthlySavings: number;
    percentageSavings: number;
    paybackPeriodMonths?: number;
    explanation: string;
    riskFlags: string[];
    riskScore: number; // 0-100, higher = more risk
  }>;
  error?: string;
}

/**
 * Calculate annual cost for a plan
 */
function calculateAnnualCost(
  plan: GenerateRecommendationsEvent['availablePlans'][0],
  annualKwh: number
): number {
  const energyCost = plan.ratePerKwh * annualKwh;
  const monthlyFees = (plan.monthlyFee || 0) * 12;
  return energyCost + monthlyFees;
}

/**
 * Calculate savings compared to current cost
 */
function calculateSavings(
  currentAnnualCost: number,
  planAnnualCost: number
): {
  annualSavings: number;
  monthlySavings: number;
  percentageSavings: number;
} {
  const annualSavings = currentAnnualCost - planAnnualCost;
  const monthlySavings = annualSavings / 12;
  const percentageSavings =
    currentAnnualCost > 0 ? (annualSavings / currentAnnualCost) * 100 : 0;

  return {
    annualSavings,
    monthlySavings,
    percentageSavings,
  };
}

/**
 * Calculate payback period in months
 * Returns undefined if no upfront costs or negative savings
 */
function calculatePaybackPeriod(
  upfrontCosts: number,
  monthlySavings: number
): number | undefined {
  if (upfrontCosts <= 0 || monthlySavings <= 0) {
    return undefined;
  }
  return Math.ceil(upfrontCosts / monthlySavings);
}

/**
 * Assess risk flags and calculate risk score
 */
function assessRisk(
  plan: GenerateRecommendationsEvent['availablePlans'][0],
  preferences: GenerateRecommendationsEvent['preferences'],
  usageData: GenerateRecommendationsEvent['usageData']
): { riskFlags: string[]; riskScore: number } {
  const riskFlags: string[] = [];
  let riskScore = 0;

  // Variable rate risk
  if (plan.contractType === 'variable') {
    riskFlags.push('variable_rate');
    riskScore += 30;
  }

  // High termination fee risk
  if (plan.earlyTerminationFee) {
    const feeRatio = plan.earlyTerminationFee / (usageData.aggregatedStats.averageMonthlyCost * 12);
    if (feeRatio > 0.1) {
      // More than 10% of annual cost
      riskFlags.push('high_termination_fee');
      riskScore += 25;
    } else if (plan.earlyTerminationFee > preferences.earlyTerminationFeeTolerance) {
      riskFlags.push('termination_fee_above_tolerance');
      riskScore += 15;
    }
  }

  // Low supplier rating
  if (plan.supplierRating && plan.supplierRating < preferences.supplierRatingPreference) {
    riskFlags.push('low_supplier_rating');
    riskScore += 20;
  }

  // Contract type mismatch
  if (
    preferences.contractTypePreference &&
    plan.contractType !== preferences.contractTypePreference
  ) {
    riskFlags.push('contract_type_mismatch');
    riskScore += 10;
  }

  // Renewable energy mismatch
  if (
    preferences.renewableEnergyPreference > 0 &&
    (!plan.renewablePercentage || plan.renewablePercentage < preferences.renewableEnergyPreference)
  ) {
    riskFlags.push('renewable_energy_mismatch');
    riskScore += 5;
  }

  // Long contract with high termination fee
  if (plan.contractLength && plan.contractLength > preferences.flexibilityPreference) {
    if (plan.earlyTerminationFee && plan.earlyTerminationFee > 0) {
      riskFlags.push('inflexible_contract');
      riskScore += 15;
    }
  }

  // Cap risk score at 100
  riskScore = Math.min(riskScore, 100);

  return { riskFlags, riskScore };
}

/**
 * Score and rank plans based on multiple factors
 */
function scorePlan(
  plan: GenerateRecommendationsEvent['availablePlans'][0],
  currentAnnualCost: number,
  annualKwh: number,
  preferences: GenerateRecommendationsEvent['preferences'],
  usageData: GenerateRecommendationsEvent['usageData']
): {
  plan: typeof plan;
  score: number;
  savings: ReturnType<typeof calculateSavings>;
  risk: ReturnType<typeof assessRisk>;
  paybackPeriod?: number;
} {
  const planAnnualCost = calculateAnnualCost(plan, annualKwh);
  const savings = calculateSavings(currentAnnualCost, planAnnualCost);
  const risk = assessRisk(plan, preferences, usageData);

  // Calculate upfront costs (termination fee if switching)
  const upfrontCosts = plan.earlyTerminationFee || 0;
  const paybackPeriod = calculatePaybackPeriod(upfrontCosts, savings.monthlySavings);

  // Scoring algorithm with dynamic weights based on costSavingsPriority:
  // - High priority: Savings 60%, Risk -25%, Preferences 15%
  // - Medium priority: Savings 50%, Risk -30%, Preferences 20%
  // - Low priority: Savings 40%, Risk -30%, Preferences 30%
  
  const savingsWeight = preferences.costSavingsPriority === 'high' ? 60 : 
                        preferences.costSavingsPriority === 'medium' ? 50 : 40;
  const riskWeight = preferences.costSavingsPriority === 'high' ? 25 : 30;
  const preferenceWeight = 100 - savingsWeight - riskWeight;
  
  let score = 0;

  // Calculate max potential savings from all plans for normalization
  // Use a dynamic max based on current cost (assume max savings could be up to 50% of current cost)
  const maxPotentialSavings = Math.max(currentAnnualCost * 0.5, 2000); // At least $2000 or 50% of current cost

  // Savings component (0 to savingsWeight points)
  // Handle negative savings (plans that cost more) by giving them 0 points
  // Normalize positive savings to 0-savingsWeight range
  let savingsComponent = 0;
  if (savings.annualSavings > 0) {
    savingsComponent = Math.min(
      (savings.annualSavings / maxPotentialSavings) * savingsWeight,
      savingsWeight
    );
  } else if (savings.annualSavings < 0) {
    // Plans that cost more get penalized (negative component)
    // Cap the penalty at -10 points to avoid overly harsh scoring
    savingsComponent = Math.max((savings.annualSavings / maxPotentialSavings) * 10, -10);
  }
  score += savingsComponent;

  // Risk component (-riskWeight to 0 points)
  const riskComponent = -(risk.riskScore / 100) * riskWeight;
  score += riskComponent;

  // Preference match component (0 to preferenceWeight points)
  let preferenceMatch = 0;
  const pointsPerMatch = preferenceWeight / 4; // Divide points across 4 preference checks
  
  if (preferences.contractTypePreference && plan.contractType === preferences.contractTypePreference) {
    preferenceMatch += pointsPerMatch;
  }
  if (
    plan.renewablePercentage &&
    plan.renewablePercentage >= preferences.renewableEnergyPreference
  ) {
    preferenceMatch += pointsPerMatch;
  }
  if (plan.supplierRating && plan.supplierRating >= preferences.supplierRatingPreference) {
    preferenceMatch += pointsPerMatch;
  }
  if (!plan.earlyTerminationFee || plan.earlyTerminationFee <= preferences.earlyTerminationFeeTolerance) {
    preferenceMatch += pointsPerMatch;
  }
  score += preferenceMatch;

  return {
    plan,
    score,
    savings,
    risk,
    paybackPeriod,
  };
}

/**
 * Get table name for a model
 * Extracts API ID from GraphQL endpoint and constructs table name
 */
function getTableName(modelName: string): string {
  // Get table name from environment variable (set by backend.ts)
  const envVarName = `${modelName.toUpperCase()}_TABLE_NAME`;
  const tableName = process.env[envVarName];
  if (tableName) {
    console.log(`[getTableName] Using table name from environment: ${tableName}`);
    return tableName;
  }
  
  // Fallback: Extract API ID from GraphQL endpoint and construct table name
  // Pattern: {ModelName}-{ApiId}-NONE
  const endpoint = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT || '';
  const apiIdMatch = endpoint.match(/https:\/\/([^.]+)\.appsync-api/);
  const graphqlApiId = apiIdMatch?.[1] || '';
  
  if (graphqlApiId) {
    const constructedTableName = `${modelName}-${graphqlApiId}-NONE`;
    console.log(`[getTableName] Constructed table name from GraphQL endpoint: ${constructedTableName}`);
    return constructedTableName;
  }
  
  // Last resort: throw an error if we can't determine the table name
  throw new Error(
    `Unable to determine table name for ${modelName}. ${envVarName} environment variable is not set and ` +
    'AMPLIFY_DATA_GRAPHQL_ENDPOINT is not available.'
  );
}

// CORS headers for Function URL responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Helper to create HTTP response
function createResponse(
  statusCode: number,
  body: GenerateRecommendationsResponse
): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

export const handler: Handler<
  GenerateRecommendationsEvent | { requestContext?: any; httpMethod?: string; body?: string; routeKey?: string; rawPath?: string; headers?: any },
  GenerateRecommendationsResponse | { statusCode: number; headers: Record<string, string>; body: string }
> = async (event) => {
  // ALWAYS check if this is a direct invocation first
  // Direct invocations have userId and usageData at the top level
  const isDirectInvocation = !!(event as GenerateRecommendationsEvent).userId && 
                             !!(event as GenerateRecommendationsEvent).usageData &&
                             !!(event as GenerateRecommendationsEvent).preferences;
  
  // If it's NOT a direct invocation, it's likely an HTTP request (Function URL)
  // For HTTP requests without proper data, treat as OPTIONS or return CORS headers
  if (!isDirectInvocation) {
    // Check if this is an HTTP request (has routeKey, requestContext, or rawPath)
    // OR if it doesn't have direct invocation data, assume it's HTTP
    const isHttpRequest = !!(event as any).routeKey || 
                         !!(event as any).requestContext || 
                         !!(event as any).rawPath ||
                         !(event as GenerateRecommendationsEvent).userId;
    
    // Check for OPTIONS method
    const httpMethod = (event as any).requestContext?.http?.method || 
                       (event as any).requestContext?.httpMethod ||
                       (event as any).httpMethod ||
                       ((event as any).headers?.['x-amzn-http-method'] || '').toUpperCase();
    
    // Check if body exists and is valid
    const body = (event as any).body;
    const hasValidBody = body && typeof body === 'string' && body.trim().length > 0;
    
    // If it's OPTIONS method OR doesn't have a valid body, treat as OPTIONS preflight
    if (httpMethod === 'OPTIONS' || httpMethod === 'options' || (isHttpRequest && !hasValidBody)) {
      console.log('[generate-recommendations] OPTIONS request detected:', { httpMethod, hasValidBody, isHttpRequest });
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true }),
      };
    }
  }
  
  // Define isHttpRequest for later use
  const isHttpRequest = !!(event as any).routeKey || !!(event as any).requestContext || !!(event as any).rawPath;
  

  // Parse Function URL HTTP request
  let requestData: GenerateRecommendationsEvent;
  if (isHttpRequest && (event as any).body) {
    // Function URL format - parse JSON body
    try {
      requestData = typeof (event as any).body === 'string' 
        ? JSON.parse((event as any).body) 
        : (event as any).body;
    } catch (e) {
      return createResponse(400, {
        success: false,
        error: 'Invalid request body: ' + (e instanceof Error ? e.message : 'Unknown error'),
      });
    }
  } else {
    // Direct invocation format - use event directly
    requestData = event as GenerateRecommendationsEvent;
  }

  try {
    const { userId, usageData, preferences, availablePlans } = requestData;

    // 1. Calculate current annual cost
    // Try to get from aggregatedStats, fallback to calculating from usage points
    let currentAnnualCost = usageData.aggregatedStats.totalCost;
    if (!currentAnnualCost || currentAnnualCost === 0) {
      // Calculate from usage points
      const totalCostFromPoints = usageData.usageDataPoints.reduce(
        (sum, point) => sum + (point.cost || 0),
        0
      );
      if (totalCostFromPoints > 0) {
        // Extrapolate to annual if we have partial data
        const monthsOfData = usageData.usageDataPoints.length;
        currentAnnualCost = (totalCostFromPoints / monthsOfData) * 12;
      } else {
        // Last resort: use average monthly cost * 12
        currentAnnualCost = usageData.aggregatedStats.averageMonthlyCost * 12;
      }
    }

    // Calculate annual kWh
    let annualKwh = usageData.aggregatedStats.totalKwh;
    if (!annualKwh || annualKwh === 0) {
      // Calculate from usage points
      const totalKwhFromPoints = usageData.usageDataPoints.reduce(
        (sum, point) => sum + point.kwh,
        0
      );
      if (totalKwhFromPoints > 0) {
        const monthsOfData = usageData.usageDataPoints.length;
        annualKwh = (totalKwhFromPoints / monthsOfData) * 12;
      } else {
        annualKwh = usageData.aggregatedStats.averageMonthlyKwh * 12;
      }
    }

    // Validate we have valid data
    if (currentAnnualCost <= 0 || annualKwh <= 0) {
      return createResponse(400, {
        success: false,
        error: 'Invalid usage data: missing cost or kWh information. Please add usage data first.',
      });
    }

    // 2. Filter plans based on budget constraints if specified
    let filteredPlans = availablePlans;
    if (preferences.budgetConstraints) {
      filteredPlans = availablePlans.filter(plan => {
        const planAnnualCost = calculateAnnualCost(plan, annualKwh);
        const planMonthlyCost = planAnnualCost / 12;
        
        if (preferences.budgetConstraints?.maxAnnualCost && planAnnualCost > preferences.budgetConstraints.maxAnnualCost) {
          return false;
        }
        if (preferences.budgetConstraints?.maxMonthlyCost && planMonthlyCost > preferences.budgetConstraints.maxMonthlyCost) {
          return false;
        }
        return true;
      });
    }

    if (filteredPlans.length === 0) {
      return createResponse(400, {
        success: false,
        error: 'No plans found that meet your budget constraints. Please adjust your preferences.',
      });
    }

    // 3. Score and rank all plans
    const scoredPlans = filteredPlans.map(plan =>
      scorePlan(plan, currentAnnualCost, annualKwh, preferences, usageData)
    );

    // 4. Sort by score (highest first) and take top 10 for AI analysis
    const topPlans = scoredPlans
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // 5. Fetch historical data from memory bank (optional - gracefully handle failures)
    let usagePatterns: any[] = [];
    let recommendationHistory: any[] = [];
    
    try {
      const usagePatternTableName = getTableName('UsagePattern');
      const recommendationHistoryTableName = getTableName('RecommendationHistory');
      
      // Query UsagePattern by userId (GSI: userId-index or query by partition key)
      // Note: Amplify uses 'userId' as partition key for owner-based access
      const [patternsResult, historyResult] = await Promise.all([
        dynamoClient.send(new QueryCommand({
          TableName: usagePatternTableName,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
        })).catch((err: unknown) => {
          console.warn('[generate-recommendations] Failed to fetch usage patterns:', err);
          return { Items: [] };
        }),
        dynamoClient.send(new QueryCommand({
          TableName: recommendationHistoryTableName,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
          ScanIndexForward: false, // Most recent first
          Limit: 10, // Only need recent history
        })).catch((err: unknown) => {
          console.warn('[generate-recommendations] Failed to fetch recommendation history:', err);
          return { Items: [] };
        }),
      ]);
      
      usagePatterns = patternsResult.Items || [];
      recommendationHistory = historyResult.Items || [];
    } catch (error) {
      console.warn('[generate-recommendations] Error fetching historical data, continuing without it:', error);
      // Continue without historical data - it's optional for recommendations
    }

    // 6. Use AI to generate explanations for top 3 plans
    let recommendations: NonNullable<GenerateRecommendationsResponse['recommendations']> = [];

    if (process.env.OPENROUTER_API_KEY && topPlans.length > 0) {
      try {
        const top3Plans = topPlans.slice(0, 3);

        const prompt = `Generate personalized explanations for these top 3 energy plan recommendations:

User Usage Data:
- Annual Usage: ${annualKwh.toFixed(0)} kWh
- Current Annual Cost: $${currentAnnualCost.toFixed(2)}
- Average Monthly Usage: ${usageData.aggregatedStats.averageMonthlyKwh.toFixed(0)} kWh
- Peak Month: ${usageData.aggregatedStats.peakMonth} (${usageData.aggregatedStats.peakMonthKwh.toFixed(0)} kWh)

User Preferences:
${JSON.stringify(preferences, null, 2)}

Top 3 Plans (already scored and ranked):
${JSON.stringify(
          top3Plans.map((scored, index) => ({
            rank: index + 1,
            planId: scored.plan.planId,
            supplierName: scored.plan.supplierName,
            planName: scored.plan.planName,
            ratePerKwh: scored.plan.ratePerKwh,
            contractType: scored.plan.contractType,
            annualSavings: scored.savings.annualSavings,
            monthlySavings: scored.savings.monthlySavings,
            percentageSavings: scored.savings.percentageSavings,
            paybackPeriodMonths: scored.paybackPeriod,
            riskFlags: scored.risk.riskFlags,
            riskScore: scored.risk.riskScore,
          })),
          null,
          2
        )}

Usage Patterns:
${JSON.stringify(usagePatterns, null, 2)}

Previous Recommendations:
${JSON.stringify(recommendationHistory.slice(0, 5), null, 2)}

Instructions:
1. Generate a clear, personalized explanation for each of the 3 plans
2. Explain why this plan is recommended based on usage patterns and preferences
3. Mention specific savings amounts and percentages
4. Address any risk flags in a balanced way
5. Keep explanations concise (2-3 sentences each)
6. Return valid JSON only

Return format:
{
  "recommendations": [
    {
      "planId": "string",
      "rank": 1,
      "explanation": "Clear, personalized explanation of why this plan is recommended"
    }
  ]
}`;

        const response = await openrouter.chat.completions.create({
          model: 'openai/gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are an energy plan recommendation expert. Generate clear, personalized explanations for energy plan recommendations. Return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
        const aiExplanations = new Map(
          (aiResponse.recommendations || []).map((rec: { planId: string; explanation: string }) => [
            rec.planId,
            rec.explanation,
          ])
        );

        // 7. Combine calculated data with AI explanations
        recommendations = top3Plans.map((scored, index) => {
          const aiExplanation = aiExplanations.get(scored.plan.planId);
          const explanation: string = 
            (typeof aiExplanation === 'string' ? aiExplanation : null) ||
            `This ${scored.plan.contractType} plan from ${scored.plan.supplierName} offers ${scored.savings.percentageSavings.toFixed(1)}% annual savings.`;
          
          return {
            planId: scored.plan.planId,
            rank: index + 1,
            projectedSavings: scored.savings.annualSavings, // Keep for backward compatibility
            annualSavings: scored.savings.annualSavings,
            monthlySavings: scored.savings.monthlySavings,
            percentageSavings: scored.savings.percentageSavings,
            paybackPeriodMonths: scored.paybackPeriod,
            explanation,
            riskFlags: scored.risk.riskFlags,
            riskScore: scored.risk.riskScore,
          };
        });
      } catch (error) {
        console.error('OpenRouter recommendation error:', error);
        // Fall through to calculated-only recommendations
      }
    }

    // Fallback: Use calculated data without AI explanations
    if (recommendations.length === 0 && topPlans.length > 0) {
      recommendations = topPlans.slice(0, 3).map((scored, index) => ({
        planId: scored.plan.planId,
        rank: index + 1,
        projectedSavings: scored.savings.annualSavings,
        annualSavings: scored.savings.annualSavings,
        monthlySavings: scored.savings.monthlySavings,
        percentageSavings: scored.savings.percentageSavings,
        paybackPeriodMonths: scored.paybackPeriod,
        explanation: `This ${scored.plan.contractType} plan from ${scored.plan.supplierName} offers ${scored.savings.percentageSavings.toFixed(1)}% annual savings ($${scored.savings.annualSavings.toFixed(2)}/year).`,
        riskFlags: scored.risk.riskFlags,
        riskScore: scored.risk.riskScore,
      }));
    }

    // 8. Store in recommendation history (optional - gracefully handle failures)
    if (recommendations.length > 0) {
      try {
        const recommendationHistoryTableName = getTableName('RecommendationHistory');
        const now = new Date().toISOString();
        
        for (const rec of recommendations) {
          await dynamoClient.send(new PutCommand({
            TableName: recommendationHistoryTableName,
            Item: {
              userId,
              recommendationId: `rec-${Date.now()}-${rec.rank}`,
              planId: rec.planId,
              rank: rec.rank,
              projectedSavings: rec.annualSavings,
              explanation: rec.explanation,
              selected: false,
              createdAt: now,
              updatedAt: now,
            },
          })).catch((err: unknown) => {
            console.warn(`[generate-recommendations] Failed to store recommendation history for ${rec.planId}:`, err);
            // Continue with other recommendations
          });
        }
      } catch (error) {
        console.warn('[generate-recommendations] Error storing recommendation history, continuing:', error);
        // Continue - history storage is optional
      }
    }

    return createResponse(200, {
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return createResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

