import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { UserPreferences } from 'shared/types';

export function PreferencesPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.username;
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences(userId);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Partial<UserPreferences>>({
    costSavingsPriority: 'medium',
    flexibilityPreference: 12,
    renewableEnergyPreference: 50,
    supplierRatingPreference: 3.5,
    contractTypePreference: null,
    earlyTerminationFeeTolerance: 100,
  });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    updatePreferences(
      {
        userId,
        preferences: {
          ...formData,
          userId,
          createdAt: preferences?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as UserPreferences,
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Preferences</h1>
        <p className="text-muted-foreground mt-2">
          Set your preferences to get personalized energy plan recommendations
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Your Preferences</CardTitle>
          <CardDescription>
            Configure your preferences to receive recommendations tailored to your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <Alert>
                <AlertDescription>
                  Preferences saved successfully! Redirecting to dashboard...
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Cost Savings Priority</Label>
              <div className="flex space-x-4">
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <Button
                    key={priority}
                    type="button"
                    variant={
                      formData.costSavingsPriority === priority ? 'default' : 'outline'
                    }
                    onClick={() =>
                      setFormData({ ...formData, costSavingsPriority: priority })
                    }
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contract Flexibility (Months)</Label>
              <Slider
                value={[formData.flexibilityPreference || 12]}
                onValueChange={([value]) =>
                  setFormData({ ...formData, flexibilityPreference: value })
                }
                min={0}
                max={36}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                {formData.flexibilityPreference || 12} months
              </p>
            </div>

            <div className="space-y-2">
              <Label>Renewable Energy Preference (%)</Label>
              <Slider
                value={[formData.renewableEnergyPreference || 50]}
                onValueChange={([value]) =>
                  setFormData({ ...formData, renewableEnergyPreference: value })
                }
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                {formData.renewableEnergyPreference || 50}%
              </p>
            </div>

            <div className="space-y-2">
              <Label>Minimum Supplier Rating</Label>
              <Slider
                value={[formData.supplierRatingPreference || 3.5]}
                onValueChange={([value]) =>
                  setFormData({ ...formData, supplierRatingPreference: value })
                }
                min={0}
                max={5}
                step={0.1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                {formData.supplierRatingPreference?.toFixed(1) || '3.5'} / 5.0
              </p>
            </div>

            <div className="space-y-2">
              <Label>Contract Type Preference</Label>
              <div className="flex flex-wrap gap-2">
                {(['fixed', 'variable', 'indexed', 'hybrid'] as const).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={
                      formData.contractTypePreference === type ? 'default' : 'outline'
                    }
                    onClick={() =>
                      setFormData({
                        ...formData,
                        contractTypePreference:
                          formData.contractTypePreference === type ? null : type,
                      })
                    }
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="terminationFee">Early Termination Fee Tolerance ($)</Label>
              <Input
                id="terminationFee"
                type="number"
                value={formData.earlyTerminationFeeTolerance || 100}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    earlyTerminationFeeTolerance: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMonthly">Max Monthly Cost ($) - Optional</Label>
              <Input
                id="maxMonthly"
                type="number"
                value={formData.budgetConstraints?.maxMonthlyCost || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    budgetConstraints: {
                      ...formData.budgetConstraints,
                      maxMonthlyCost: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })
                }
                min={0}
              />
            </div>

            <div className="flex space-x-4">
              <Button type="submit" disabled={isUpdating || success} className="flex-1">
                {isUpdating ? 'Saving...' : 'Save Preferences'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

