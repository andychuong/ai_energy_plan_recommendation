import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useUsageData } from '@/hooks/useUsageData';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useUserProfile } from '@/hooks/useUserProfile';
import { RecommendationCard } from '@/components/features/RecommendationCard';
import { FeedbackForm } from '@/components/features/FeedbackForm';
import { UsageChart } from '@/components/charts/UsageChart';
import { apiClient } from '@/services/api/client';
import type { Recommendation, EnergyPlan } from 'shared/types';

export function RecommendationsPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.username;
  const navigate = useNavigate();
  const { usageData, isLoading: isLoadingUsage } = useUsageData(userId);
  const { preferences, isLoading: isLoadingPrefs } = useUserPreferences(userId);
  const { profile } = useUserProfile(userId);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Map<string, EnergyPlan>>(new Map());
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [showFeedbackFor, setShowFeedbackFor] = useState<string | null>(null);

  const { generateRecommendations } = useRecommendations(
    userId,
    usageData || null
  );

  const handleGenerateRecommendations = async () => {
    if (!userId || !usageData || !preferences) {
      setError('Please upload usage data and set preferences first');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Fetch plans first - getEnergyPlans will use user profile state if available
      const availablePlans = await apiClient.getEnergyPlans(profile?.state);
      const plansMap = new Map(availablePlans.map(plan => [plan.planId, plan]));
      setPlans(plansMap);

      // Generate recommendations
      generateRecommendations(
        {
          userId,
          usageData,
          preferences,
        },
        {
          onSuccess: data => {
            setRecommendations(data);
            setIsGenerating(false);
          },
          onError: err => {
            setError(
              err instanceof Error
                ? err.message
                : 'Failed to generate recommendations'
            );
            setIsGenerating(false);
          },
        }
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate recommendations'
      );
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
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Missing Information</CardTitle>
            <CardDescription>
              You need to add usage data and set preferences before getting
              recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!usageData && (
              <Link to="/usage-data">
                <Button>Add Usage Data</Button>
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
        <p className="mt-2 text-muted-foreground">
          Get personalized energy plan recommendations based on your usage and
          preferences
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
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Generate Recommendations</CardTitle>
            <CardDescription>
              Click the button below to generate personalized energy plan
              recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGenerateRecommendations}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating
                ? 'Generating Recommendations...'
                : 'Generate Recommendations'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Top Recommendations</h2>
            <div className="flex gap-2">
              {selectedPlans.size > 0 && (
                <Button
                  onClick={() => {
                    const planIds = Array.from(selectedPlans).join(',');
                    navigate(`/compare?plans=${planIds}`);
                  }}
                >
                  Compare Selected ({selectedPlans.size})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleGenerateRecommendations}
                disabled={isGenerating}
              >
                Regenerate
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {recommendations.map(recommendation => (
                <RecommendationCard
                  key={recommendation.recommendationId || recommendation.planId}
                  recommendation={recommendation}
                  plan={plans.get(recommendation.planId)}
                  isSelectedForComparison={selectedPlans.has(recommendation.planId)}
                  onSelect={async () => {
                    if (!userId) {
                      setError('User ID is required');
                      return;
                    }

                    const plan = plans.get(recommendation.planId);
                    if (!plan) {
                      setError('Plan not found');
                      return;
                    }

                    try {
                      await apiClient.saveCurrentPlan(userId, {
                        supplierName: plan.supplierName,
                        planName: plan.planName,
                        contractType: plan.contractType,
                        earlyTerminationFee: plan.earlyTerminationFee,
                      });
                      setError(null);
                      // Show success message
                      alert(`Plan "${plan.planName}" selected successfully!`);
                      navigate('/dashboard');
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to select plan');
                    }
                  }}
                  onCompare={() => {
                    // Toggle plan selection
                    const newSelected = new Set(selectedPlans);
                    if (newSelected.has(recommendation.planId)) {
                      newSelected.delete(recommendation.planId);
                    } else {
                      newSelected.add(recommendation.planId);
                    }
                    setSelectedPlans(newSelected);
                  }}
                />
              ))}
            </div>
            {showFeedbackFor && userId && (
              <div className="mt-6">
                <FeedbackForm
                  userId={userId}
                  recommendationId={showFeedbackFor}
                  onSubmitted={() => setShowFeedbackFor(null)}
                />
              </div>
            )}
            {recommendations.length > 0 && !showFeedbackFor && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    const firstRec = recommendations[0];
                    setShowFeedbackFor(firstRec.recommendationId || firstRec.planId);
                  }}
                >
                  Provide Feedback
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
