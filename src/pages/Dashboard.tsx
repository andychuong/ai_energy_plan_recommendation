import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageData } from '@/hooks/useUsageData';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export function Dashboard() {
  const { user } = useAuth();
  const userId = user?.userId || user?.username;
  const { usageData, isLoading: isLoadingUsage } = useUsageData(userId);
  const { preferences, isLoading: isLoadingPrefs } = useUserPreferences(userId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Manage your energy plan recommendations here.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Usage Data</CardTitle>
            <CardDescription>
              {usageData ? 'Your usage data is ready' : 'Upload your usage data to get started'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingUsage ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : usageData ? (
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Average Monthly:</span>{' '}
                  {usageData.averageMonthlyKwh?.toFixed(0) || 'N/A'} kWh
                </p>
                <p className="text-sm">
                  <span className="font-medium">Total Annual:</span>{' '}
                  {usageData.totalAnnualKwh?.toFixed(0) || 'N/A'} kWh
                </p>
                <Link to="/upload">
                  <Button variant="outline" className="mt-4 w-full">
                    Update Usage Data
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to="/upload">
                <Button className="w-full">Upload Usage Data</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              {preferences ? 'Your preferences are set' : 'Set your preferences for personalized recommendations'}
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
              <p className="text-xs text-muted-foreground mt-2">
                Upload usage data and set preferences first
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

