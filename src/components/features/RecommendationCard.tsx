import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Recommendation, EnergyPlan } from 'shared/types';
import { formatCurrency } from '@/lib/format';

interface RecommendationCardProps {
  recommendation: Recommendation;
  plan?: EnergyPlan;
  onSelect?: () => void;
  onCompare?: () => void;
  isSelectedForComparison?: boolean;
}

export function RecommendationCard({
  recommendation,
  plan,
  onSelect,
  onCompare,
  isSelectedForComparison = false,
}: RecommendationCardProps) {
  const savings = recommendation.projectedSavings;
  const isPositive = savings > 0;

  return (
    <Card
      className={`relative ${
        isSelectedForComparison ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              #{recommendation.rank} Recommendation
              {plan && <Badge variant="secondary">{plan.supplierName}</Badge>}
            </CardTitle>
            {plan && (
              <CardDescription className="mt-1">
                {plan.planName}
              </CardDescription>
            )}
          </div>
          <div className="text-right">
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

        {recommendation.riskFlags && recommendation.riskFlags.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Risk Flags:</p>
                <ul className="list-inside list-disc space-y-1">
                  {recommendation.riskFlags.map(
                    (flag: string, index: number) => (
                      <li key={index} className="text-sm">
                        {flag
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex space-x-2">
        {onSelect && (
          <Button onClick={onSelect} className="flex-1">
            Select Plan
          </Button>
        )}
        {onCompare && (
          <Button
            variant={isSelectedForComparison ? 'default' : 'outline'}
            onClick={onCompare}
          >
            {isSelectedForComparison ? 'Selected' : 'Compare'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
