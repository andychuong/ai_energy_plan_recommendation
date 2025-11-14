import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Recommendation, EnergyPlan } from 'shared/types';
import { formatCurrency } from '@/lib/format';

interface SatisfactionData {
  averageRating: number;
  reviewCount: number;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  plan?: EnergyPlan;
  onSelect?: () => void;
  satisfactionData?: SatisfactionData;
}

export function RecommendationCard({
  recommendation,
  plan,
  onSelect,
  satisfactionData,
}: RecommendationCardProps) {
  const savings = recommendation.projectedSavings;
  const isPositive = savings > 0;

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="mb-2">
              #{recommendation.rank} Recommendation
            </CardTitle>
            {plan && (
              <>
                <div className="mb-2">
                  <h3 className="break-words text-lg font-bold leading-tight text-foreground">
                    {plan.supplierName}
                  </h3>
                </div>
                <CardDescription className="mt-1 text-sm">
                  {plan.planName}
                </CardDescription>
              </>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <div
              className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {isPositive ? '+' : ''}
              {formatCurrency(savings)}
            </div>
            <p className="text-xs text-muted-foreground">Annual Savings</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-2 text-sm font-medium">Plan Details</h4>
          {plan && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Rate:</span>{' '}
                <span className="font-medium">
                  {formatCurrency(plan.ratePerKwh)}/kWh
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>{' '}
                <span className="font-medium capitalize">
                  {plan.contractType}
                </span>
              </div>
              {plan.contractLengthMonths && (
                <div>
                  <span className="text-muted-foreground">Contract:</span>{' '}
                  <span className="font-medium">
                    {plan.contractLengthMonths} months
                  </span>
                </div>
              )}
              {plan.renewablePercentage !== undefined && (
                <div>
                  <span className="text-muted-foreground">Renewable:</span>{' '}
                  <span className="font-medium">
                    {plan.renewablePercentage}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">Why This Plan?</h4>
          <p className="text-sm text-muted-foreground">
            {recommendation.explanation}
          </p>
        </div>

        {plan && satisfactionData && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Customer Satisfaction</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        className={`text-lg ${
                          star <= satisfactionData.averageRating
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-semibold">
                    {satisfactionData.averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({satisfactionData.reviewCount}{' '}
                    {satisfactionData.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex space-x-2">
        {onSelect && (
          <Button onClick={onSelect} className="flex-1">
            Select Plan
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
