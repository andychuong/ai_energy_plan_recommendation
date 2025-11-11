import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageData } from '@/hooks/useUsageData';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { UsageChart } from '@/components/charts/UsageChart';

export function Dashboard() {
  const { user } = useAuth();
  const userId = user?.userId || user?.username;
  const {
    usageData,
    isLoading: isLoadingUsage,
    refetch: refetchUsageData,
  } = useUsageData(userId);
  const { preferences, isLoading: isLoadingPrefs } = useUserPreferences(userId);

  // Refetch usage data when component mounts or becomes visible
  // Also refetch when window regains focus (user navigates back to tab)
  React.useEffect(() => {
    if (userId) {
      // eslint-disable-next-line no-console
      console.log('[Dashboard] Component mounted, refetching usage data');
      refetchUsageData();

      // Refetch when window regains focus
      const handleFocus = () => {
        // eslint-disable-next-line no-console
        console.log('[Dashboard] Window focused, refetching usage data');
        refetchUsageData();
      };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [userId, refetchUsageData]);

  // Log usage data for debugging
  React.useEffect(() => {
    if (usageData) {
      // eslint-disable-next-line no-console
      console.log('[Dashboard] Usage data loaded:', {
        averageMonthlyKwh: usageData.aggregatedStats?.averageMonthlyKwh,
        averageMonthlyCost: usageData.aggregatedStats?.averageMonthlyCost,
        totalKwh: usageData.aggregatedStats?.totalKwh,
        totalCost: usageData.aggregatedStats?.totalCost,
      });
    }
  }, [usageData]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back! Manage your energy plan recommendations here.
        </p>
      </div>

      {/* Usage Data Summary Section */}
      {usageData &&
        usageData.usagePoints &&
        usageData.usagePoints.length > 0 && (
          <div className="mb-8">
            <UsageChart
              data={usageData.usagePoints}
              title="Your Energy Usage"
              description="Monthly energy consumption over time"
            />
          </div>
        )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Usage Data</CardTitle>
            <CardDescription>
              {usageData
                ? 'Your usage data is ready'
                : 'Add your usage data to get started'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsage ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : usageData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Average Monthly</p>
                    <p className="text-lg font-semibold">
                      {usageData?.aggregatedStats?.averageMonthlyKwh?.toFixed(
                        0
                      ) || 'N/A'}{' '}
                      kWh
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Annual</p>
                    <p className="text-lg font-semibold">
                      {usageData?.aggregatedStats?.totalKwh?.toFixed(0) ||
                        'N/A'}{' '}
                      kWh
                    </p>
                  </div>
                  {usageData?.aggregatedStats?.averageMonthlyCost && (
                    <>
                      <div>
                        <p className="text-muted-foreground">
                          Avg Monthly Cost
                        </p>
                        <p className="text-lg font-semibold">
                          $
                          {usageData.aggregatedStats.averageMonthlyCost.toFixed(
                            2
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Total Annual Cost
                        </p>
                        <p className="text-lg font-semibold">
                          $
                          {usageData.aggregatedStats.totalCost?.toFixed(2) ||
                            'N/A'}
                        </p>
                      </div>
                    </>
                  )}
                  {usageData?.aggregatedStats?.peakMonth && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Peak Month</p>
                        <p className="text-lg font-semibold">
                          {usageData.aggregatedStats.peakMonth}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Peak Usage</p>
                        <p className="text-lg font-semibold">
                          {usageData.aggregatedStats.peakMonthKwh?.toFixed(0) ||
                            'N/A'}{' '}
                          kWh
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {usageData.usagePoints && usageData.usagePoints.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {usageData.usagePoints.length} data points recorded
                  </p>
                )}
                <Link to="/usage-data">
                  <Button variant="outline" className="mt-4 w-full">
                    Update Usage Data
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to="/usage-data">
                <Button className="w-full">Add Usage Data</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              {preferences
                ? 'Your preferences are set'
                : 'Set your preferences for personalized recommendations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPrefs ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : preferences ? (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Cost Priority:</span>{' '}
                  {preferences.costSavingsPriority}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Renewable Energy:</span>{' '}
                  {preferences.renewableEnergyPreference}%
                </p>
                <Link to="/preferences">
                  <Button variant="outline" className="mt-4 w-full">
                    Update Preferences
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to="/preferences">
                <Button className="w-full">Set Preferences</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Get personalized energy plan recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/recommendations">
              <Button className="w-full" disabled={!usageData || !preferences}>
                View Recommendations
              </Button>
            </Link>
            {(!usageData || !preferences) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Add usage data and set preferences first
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
