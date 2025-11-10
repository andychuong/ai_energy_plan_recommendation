import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/contexts/AuthContext';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <h1 className="mb-4 text-5xl font-bold">SparkSave</h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Smart energy plan recommendations that save you money. Get
          personalized suggestions based on your usage patterns and preferences.
        </p>
      </div>

      {user ? (
        <div className="flex justify-center gap-4">
          <Link to="/dashboard">
            <Button size="lg">Go to Dashboard</Button>
          </Link>
        </div>
      ) : (
        <div className="flex justify-center gap-4">
          <Link to="/auth">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      )}

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Data</CardTitle>
            <CardDescription>
              Upload your energy usage data to get started with personalized
              recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We support CSV files and can integrate with popular energy
              providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Set Your Preferences</CardTitle>
            <CardDescription>
              Configure your preferences for cost, renewable energy, and
              contract flexibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tell us what matters most to you, and we'll find the perfect plan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Get Recommendations</CardTitle>
            <CardDescription>
              Receive AI-powered recommendations tailored to your specific needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our AI analyzes your data and preferences to find the best energy
              plans for you
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
