import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useUsageData } from '@/hooks/useUsageData';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { RecommendationCard } from '@/components/features/RecommendationCard';
import { UsageChart } from '@/components/charts/UsageChart';
import { apiClient } from '@/services/api/client';
import type { Recommendation, EnergyPlan } from 'shared/types';

export function RecommendationsPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.username;
  const { usageData, isLoading: isLoadingUsage } = useUsageData(userId);
  const { preferences, isLoading: isLoadingPrefs } = useUserPreferences(userId);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Map<string, EnergyPlan>>(new Map());

  const { generateRecommendations } = useRecommendations(userId, usageData || null);

  const handleGenerateRecommendations = async () => {
    if (!userId || !usageData || !preferences) {
      setError('Please upload usage data and set preferences first');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Fetch plans first
      const state = 'CA'; // TODO: Get from user profile or preferences
      const availablePlans = await apiClient.getEnergyPlans(state);
      const plansMap = new Map(availablePlans.map((plan) => [plan.planId, plan]));
      setPlans(plansMap);

      // Generate recommendations
      generateRecommendations(
        {
          userId,
          usageData,
          preferences,
        },
        {
          onSuccess: (data) => {
            setRecommendations(data);
            setIsGenerating(false);
          },
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
            setIsGenerating(false);
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
      setIsGenerating(false);
    }
  };

  if (isLoadingUsage || isLoadingPrefs) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!usageData || !preferences) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Missing Information</CardTitle>
            <CardDescription>
              You need to upload usage data and set preferences before getting recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!usageData && (
              <Link to="/upload">
                <Button>Upload Usage Data</Button>
              </Link>
            )}
            {!preferences && (
              <Link to="/preferences">
                <Button>Set Preferences</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Recommendations</h1>
        <p className="text-muted-foreground mt-2">
          Get personalized energy plan recommendations based on your usage and preferences
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {usageData && usageData.usageDataPoints.length > 0 && (
        <div className="mb-8">
          <UsageChart data={usageData.usageDataPoints} />
        </div>
      )}

      {recommendations.length === 0 ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Generate Recommendations</CardTitle>
            <CardDescription>
              Click the button below to generate personalized energy plan recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGenerateRecommendations}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? 'Generating Recommendations...' : 'Generate Recommendations'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Top Recommendations</h2>
            <Button variant="outline" onClick={handleGenerateRecommendations} disabled={isGenerating}>
              Regenerate
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.recommendationId || recommendation.planId}
                recommendation={recommendation}
                plan={plans.get(recommendation.planId)}
                onSelect={() => {
                  // TODO: Handle plan selection
                  // eslint-disable-next-line no-console
                  console.log('Select plan:', recommendation.planId);
                }}
                onCompare={() => {
                  // TODO: Navigate to comparison page
                  // eslint-disable-next-line no-console
                  console.log('Compare plan:', recommendation.planId);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

