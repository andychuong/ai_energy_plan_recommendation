import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageData } from '@/hooks/useUsageData';
import { useUserProfile } from '@/hooks/useUserProfile';
import { apiClient } from '@/services/api/client';
import { formatCurrency } from '@/lib/format';
import type { Recommendation, EnergyPlan } from 'shared/types';

interface ComparisonPlan {
  plan: EnergyPlan;
  recommendation?: Recommendation;
  annualCost: number;
  monthlyCost: number;
  annualSavings: number;
  monthlySavings: number;
  percentageSavings: number;
}

export function PlanComparisonPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.username;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { usageData } = useUsageData(userId);
  const { profile } = useUserProfile(userId);

  const [plans, setPlans] = useState<ComparisonPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get plan IDs from URL params
        const planIds = searchParams.get('plans')?.split(',') || [];
        if (planIds.length === 0) {
          setError('No plans specified for comparison');
          setIsLoading(false);
          return;
        }

        // Fetch plan details and recommendations
        const [availablePlans, recommendationHistory] = await Promise.all([
          apiClient.getEnergyPlans(profile?.state),
          apiClient.getRecommendationHistory(userId),
        ]);
        const plansMap = new Map(availablePlans.map(plan => [plan.planId, plan]));
        
        // Create a map of planId to recommendation for quick lookup
        const recommendationsMap = new Map<string, Recommendation>();
        for (const rec of recommendationHistory) {
          if (!recommendationsMap.has(rec.planId)) {
            recommendationsMap.set(rec.planId, rec);
          }
        }

        // Calculate costs for each plan
        const annualKwh =
          usageData?.totalAnnualKwh ||
          (usageData?.averageMonthlyKwh || 0) * 12;
        const currentAnnualCost =
          usageData?.aggregatedStats?.totalCost ||
          (usageData?.aggregatedStats?.averageMonthlyCost || 0) * 12;

        const comparisonPlans: ComparisonPlan[] = planIds
          .map(planId => {
            const plan = plansMap.get(planId);
            if (!plan) return null;

            // Calculate costs
            const energyCost = plan.ratePerKwh * annualKwh;
            const monthlyFees = 0; // Assuming no monthly fees for now
            const annualCost = energyCost + monthlyFees;
            const monthlyCost = annualCost / 12;
            const annualSavings = currentAnnualCost - annualCost;
            const monthlySavings = annualSavings / 12;
            const percentageSavings =
              currentAnnualCost > 0
                ? (annualSavings / currentAnnualCost) * 100
                : 0;

            // Get recommendation data if available
            const recommendation = recommendationsMap.get(planId);

            return {
              plan,
              recommendation,
              annualCost,
              monthlyCost,
              annualSavings,
              monthlySavings,
              percentageSavings,
            };
          })
          .filter((p): p is ComparisonPlan => p !== null);

        setPlans(comparisonPlans);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load plans for comparison'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadPlans();
    }
  }, [searchParams, userId, usageData]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Loading plans...</p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>No Plans to Compare</CardTitle>
            <CardDescription>
              Please select plans from the recommendations page to compare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/recommendations')}>
              Go to Recommendations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentAnnualCost =
    usageData?.aggregatedStats?.totalCost ||
    (usageData?.aggregatedStats?.averageMonthlyCost || 0) * 12;

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4">
          <AlertDescription>
            <p className="font-semibold">✓ {success}</p>
          </AlertDescription>
        </Alert>
      )}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Plan Comparison</h1>
            <p className="mt-2 text-muted-foreground">
              Compare energy plans side-by-side to find the best fit
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/recommendations')}
          >
            Back to Recommendations
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {plans.map((comparisonPlan, index) => (
          <Card key={comparisonPlan.plan.planId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Plan {index + 1}</span>
                <Badge variant="secondary">
                  {comparisonPlan.plan.supplierName}
                </Badge>
              </CardTitle>
              <CardDescription>{comparisonPlan.plan.planName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Annual Cost:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(comparisonPlan.annualCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Monthly Cost:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(comparisonPlan.monthlyCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Annual Savings:
                  </span>
                  <span
                    className={`font-semibold ${
                      comparisonPlan.annualSavings > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {comparisonPlan.annualSavings > 0 ? '+' : ''}
                    {formatCurrency(comparisonPlan.annualSavings)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Savings %:
                  </span>
                  <span
                    className={`font-semibold ${
                      comparisonPlan.percentageSavings > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {comparisonPlan.percentageSavings > 0 ? '+' : ''}
                    {comparisonPlan.percentageSavings.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Comparison</CardTitle>
          <CardDescription>
            Compare all features and costs side-by-side
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left font-semibold">Feature</th>
                  <th className="p-4 text-center font-semibold">
                    Current Plan
                  </th>
                  {plans.map((comparisonPlan, index) => (
                    <th
                      key={comparisonPlan.plan.planId}
                      className="p-4 text-center font-semibold"
                    >
                      Plan {index + 1}
                      <div className="mt-1 text-xs font-normal text-muted-foreground">
                        {comparisonPlan.plan.supplierName}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Rate per kWh */}
                <tr className="border-b">
                  <td className="p-4 font-medium">Rate per kWh</td>
                  <td className="p-4 text-center text-muted-foreground">
                    {usageData?.billingInfo?.currentPlan?.ratePerKwh
                      ? formatCurrency(
                          usageData.billingInfo.currentPlan.ratePerKwh
                        )
                      : 'N/A'}
                  </td>
                  {plans.map(comparisonPlan => (
                    <td
                      key={comparisonPlan.plan.planId}
                      className="p-4 text-center"
                    >
                      {formatCurrency(comparisonPlan.plan.ratePerKwh)}
                    </td>
                  ))}
                </tr>

                {/* Contract Type */}
                <tr className="border-b">
                  <td className="p-4 font-medium">Contract Type</td>
                  <td className="p-4 text-center text-muted-foreground">
                    {usageData?.billingInfo?.currentPlan?.contractType
                      ? usageData.billingInfo.currentPlan.contractType
                          .charAt(0)
                          .toUpperCase() +
                        usageData.billingInfo.currentPlan.contractType.slice(1)
                      : 'N/A'}
                  </td>
                  {plans.map(comparisonPlan => (
                    <td
                      key={comparisonPlan.plan.planId}
                      className="p-4 text-center capitalize"
                    >
                      {comparisonPlan.plan.contractType}
                    </td>
                  ))}
                </tr>

                {/* Contract Length */}
                <tr className="border-b">
                  <td className="p-4 font-medium">Contract Length</td>
                  <td className="p-4 text-center text-muted-foreground">
                    N/A
                  </td>
                  {plans.map(comparisonPlan => (
                    <td
                      key={comparisonPlan.plan.planId}
                      className="p-4 text-center"
                    >
                      {comparisonPlan.plan.contractLengthMonths
                        ? `${comparisonPlan.plan.contractLengthMonths} months`
                        : 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Renewable Energy */}
                <tr className="border-b">
                  <td className="p-4 font-medium">Renewable Energy</td>
                  <td className="p-4 text-center text-muted-foreground">
                    {usageData?.billingInfo?.currentPlan?.renewablePercentage
                      ? `${usageData.billingInfo.currentPlan.renewablePercentage}%`
                      : 'N/A'}
                  </td>
                  {plans.map(comparisonPlan => (
                    <td
                      key={comparisonPlan.plan.planId}
                      className="p-4 text-center"
                    >
                      {comparisonPlan.plan.renewablePercentage !== undefined
                        ? `${comparisonPlan.plan.renewablePercentage}%`
                        : 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Early Termination Fee */}
                <tr className="border-b">
                  <td className="p-4 font-medium">Early Termination Fee</td>
                  <td className="p-4 text-center text-muted-foreground">
                    {usageData?.billingInfo?.currentPlan?.earlyTerminationFee
                      ? formatCurrency(
                          usageData.billingInfo.currentPlan.earlyTerminationFee
                        )
                      : 'N/A'}
                  </td>
                  {plans.map(comparisonPlan => (
                    <td
                      key={comparisonPlan.plan.planId}
                      className="p-4 text-center"
                    >
                      {comparisonPlan.plan.earlyTerminationFee
                        ? formatCurrency(comparisonPlan.plan.earlyTerminationFee)
                        : 'None'}
                    </td>
                  ))}
                </tr>

                {/* Supplier Rating */}
                <tr className="border-b">
                  <td className="p-4 font-medium">Supplier Rating</td>
                  <td className="p-4 text-center text-muted-foreground">
                    N/A
                  </td>
                  {plans.map(comparisonPlan => (
                    <td
                      key={comparisonPlan.plan.planId}
                      className="p-4 text-center"
                    >
                      {comparisonPlan.plan.supplierRating
                        ? `${comparisonPlan.plan.supplierRating.toFixed(1)}/5.0`
                        : 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Annual Cost */}
                <tr className="border-b bg-muted/50">
                  <td className="p-4 font-semibold">Annual Cost</td>
                  <td className="p-4 text-center font-semibold">
                    {formatCurrency(currentAnnualCost)}
                  </td>
                  {plans.map(comparisonPlan => (
                    <td
                      key={comparisonPlan.plan.planId}
                      className="p-4 text-center font-semibold"
                    >
                      {formatCurrency(comparisonPlan.annualCost)}
                    </td>
                  ))}
                </tr>

                {/* Monthly Cost */}
                <tr className="border-b bg-muted/50">
                  <td className="p-4 font-semibold">Monthly Cost</td>
                  <td className="p-4 text-center font-semibold">
                    {formatCurrency(currentAnnualCost / 12)}
                  </td>
                  {plans.map(comparisonPlan => (
                    <td
                      key={comparisonPlan.plan.planId}
                      className="p-4 text-center font-semibold"
                    >
                      {formatCurrency(comparisonPlan.monthlyCost)}
                    </td>
                  ))}
                </tr>

                {/* Annual Savings */}
                <tr className="border-b bg-green-50 dark:bg-green-950/20">
                  <td className="p-4 font-semibold">Annual Savings</td>
                  <td className="p-4 text-center font-semibold">—</td>
                  {plans.map(comparisonPlan => (
                    <td
                      key={comparisonPlan.plan.planId}
                      className={`p-4 text-center font-semibold ${
                        comparisonPlan.annualSavings > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {comparisonPlan.annualSavings > 0 ? '+' : ''}
                      {formatCurrency(comparisonPlan.annualSavings)}
                    </td>
                  ))}
                </tr>

                {/* Risk Flags */}
                {plans.some(p => p.recommendation?.riskFlags && p.recommendation.riskFlags.length > 0) && (
                  <tr className="border-b">
                    <td className="p-4 font-medium">Risk Flags</td>
                    <td className="p-4 text-center text-muted-foreground">
                      —
                    </td>
                    {plans.map(comparisonPlan => (
                      <td
                        key={comparisonPlan.plan.planId}
                        className="p-4 text-center"
                      >
                        {comparisonPlan.recommendation?.riskFlags &&
                        comparisonPlan.recommendation.riskFlags.length > 0 ? (
                          <div className="space-y-1">
                            {comparisonPlan.recommendation.riskFlags.map(
                              (flag, idx) => (
                                <Badge
                                  key={idx}
                                  variant="destructive"
                                  className="mr-1"
                                >
                                  {flag
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, l => l.toUpperCase())}
                                </Badge>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-green-600">None</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation Explanations */}
      {plans.some(p => p.recommendation?.explanation) && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Why These Plans?</CardTitle>
            <CardDescription>
              Personalized explanations for each recommended plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((comparisonPlan, index) => (
                <div key={comparisonPlan.plan.planId} className="space-y-2">
                  <h4 className="font-semibold">
                    Plan {index + 1}: {comparisonPlan.plan.planName}
                  </h4>
                  {comparisonPlan.recommendation?.explanation ? (
                    <p className="text-sm text-muted-foreground">
                      {comparisonPlan.recommendation.explanation}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No explanation available
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex justify-center gap-4">
        {plans.map((comparisonPlan, index) => (
          <Button
            key={comparisonPlan.plan.planId}
            onClick={async () => {
              if (!userId) {
                setError('User ID is required');
                return;
              }

              setIsSelecting(comparisonPlan.plan.planId);
              setError(null);
              setSuccess(null);

              try {
                // Save selected plan to current plan
                await apiClient.saveCurrentPlan(userId, {
                  supplierName: comparisonPlan.plan.supplierName,
                  planName: comparisonPlan.plan.planName,
                  contractType: comparisonPlan.plan.contractType,
                  earlyTerminationFee: comparisonPlan.plan.earlyTerminationFee,
                });

                // Update recommendation history to mark as selected
                const recommendationHistory = await apiClient.getRecommendationHistory(userId);
                const relevantRec = recommendationHistory.find(
                  r => r.planId === comparisonPlan.plan.planId
                );
                if (relevantRec) {
                  // Note: RecommendationHistory doesn't have update method in current schema
                  // This would need to be added or handled differently
                }

                setSuccess(`Plan "${comparisonPlan.plan.planName}" selected successfully!`);
                setTimeout(() => {
                  navigate('/dashboard');
                }, 2000);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to select plan');
              } finally {
                setIsSelecting(null);
              }
            }}
            disabled={isSelecting !== null}
            className="min-w-[200px]"
          >
            {isSelecting === comparisonPlan.plan.planId ? 'Selecting...' : `Select Plan ${index + 1}`}
          </Button>
        ))}
      </div>
    </div>
  );
}

