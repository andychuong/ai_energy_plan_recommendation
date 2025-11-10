import type { Handler } from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
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

const client = generateClient<Schema>({
  authMode: 'iam',
});

// Initialize OpenRouter client
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'https://arbor-ai-energy.com', // Optional: for analytics
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
  }>;
}

interface GenerateRecommendationsResponse {
  success: boolean;
  recommendations?: Array<{
    planId: string;
    rank: number;
    projectedSavings: number;
    explanation: string;
    riskFlags: string[];
  }>;
  error?: string;
}

export const handler: Handler<
  GenerateRecommendationsEvent,
  GenerateRecommendationsResponse
> = async (event) => {
  try {
    const { userId, usageData, preferences, availablePlans } = event;

    // TODO: Implement recommendation logic
    // 1. Fetch user preferences from memory bank
    // 2. Fetch usage patterns from memory bank
    // 3. Fetch recommendation history from memory bank
    // 4. Calculate recommendations based on:
    //    - Usage data analysis
    //    - Preference matching
    //    - Cost calculations
    //    - Risk assessment
    // 5. Use OpenRouter AI (GPT-4-turbo) for explanation generation
    // 6. Rank recommendations
    // 7. Store in recommendation history
    // 8. Return recommendations

    // Example: Use OpenRouter for recommendation generation
    if (process.env.OPENROUTER_API_KEY) {
      try {
        // Fetch user preferences and patterns from memory bank
        // Note: UserPreferences uses userId as the primary key (id field)
        // UsagePattern uses userId and patternId, so we filter by userId
        const [preferencesResult, patternsResult] = await Promise.all([
          client.models.UserPreferences.get({ id: userId }),
          client.models.UsagePattern.list({
            filter: {
              userId: { eq: userId } as any, // Type assertion needed for filter
            },
          }),
        ]);

        const userPreferences = preferencesResult.data;
        const usagePatterns = patternsResult.data || [];

        const prompt = `Generate top 3 energy plan recommendations based on:

User Usage Data:
${JSON.stringify(usageData, null, 2)}

User Preferences:
${JSON.stringify(preferences, null, 2)}

Available Plans:
${JSON.stringify(availablePlans, null, 2)}

Usage Patterns:
${JSON.stringify(usagePatterns, null, 2)}

Instructions:
1. Analyze usage data and patterns
2. Match plans to user preferences
3. Calculate projected savings for each plan
4. Identify risk flags (variable rates, high fees, etc.)
5. Generate clear explanations for each recommendation
6. Rank top 3 recommendations
7. Return valid JSON only

Return format:
{
  "recommendations": [
    {
      "planId": "string",
      "rank": 1,
      "projectedSavings": 120.50,
      "explanation": "Clear explanation of why this plan is recommended",
      "riskFlags": ["variable_rate", "high_termination_fee"]
    }
  ]
}`;

        const response = await openrouter.chat.completions.create({
          model: 'openai/gpt-4-turbo', // Use better model for complex reasoning
          messages: [
            {
              role: 'system',
              content:
                'You are an energy plan recommendation expert. Generate personalized recommendations based on usage data, preferences, and available plans. Return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3, // Slightly higher for more creative explanations
        });

        const aiRecommendations = JSON.parse(
          response.choices[0].message.content || '{}'
        );

        // Store in recommendation history
        if (aiRecommendations.recommendations) {
          for (const rec of aiRecommendations.recommendations) {
            await client.models.RecommendationHistory.create({
              userId,
              recommendationId: `rec-${Date.now()}-${rec.rank}`,
              planId: rec.planId,
              rank: rec.rank,
              projectedSavings: rec.projectedSavings,
              explanation: rec.explanation,
              selected: false,
              createdAt: new Date().toISOString(),
            });
          }
        }

        return {
          success: true,
          recommendations: aiRecommendations.recommendations || [],
        };
      } catch (error) {
        console.error('OpenRouter recommendation error:', error);
        // Fall through to placeholder implementation
      }
    }

    // Placeholder implementation (fallback)
    return {
      success: true,
      recommendations: availablePlans.slice(0, 3).map((plan, index) => ({
        planId: plan.planId,
        rank: index + 1,
        projectedSavings: Math.random() * 200,
        explanation: `Recommended plan based on your preferences`,
        riskFlags: [],
      })),
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

