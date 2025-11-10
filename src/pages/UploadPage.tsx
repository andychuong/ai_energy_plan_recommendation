import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageData } from '@/hooks/useUsageData';
import type { UsageDataPoint } from 'shared/types';

export function UploadPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.username;
  const { uploadUsageData, isUploading } = useUsageData(userId);
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleFileUpload = async () => {
    if (!file || !userId) {
      setError('Please select a file and ensure you are logged in');
      return;
    }

    try {
      // Parse CSV file (simplified - in production, use a proper CSV parser)
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

      const usagePoints: UsageDataPoint[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });

        // Try to find timestamp and kwh columns
        const timestamp = row.timestamp || row.date || row.time || '';
        const kwh = parseFloat(row.kwh || row.usage || row.consumption || '0');
        const cost = row.cost ? parseFloat(row.cost) : undefined;

        if (timestamp && kwh) {
          usagePoints.push({
            timestamp: new Date(timestamp).toISOString(),
            kwh,
            cost,
          });
        }
      }

      if (usagePoints.length === 0) {
        setError('No valid data found in file. Please check the format.');
        return;
      }

      // Calculate aggregated stats
      const totalKwh = usagePoints.reduce((sum, point) => sum + point.kwh, 0);
      const averageMonthlyKwh = totalKwh / 12;
      const peakPoint = usagePoints.reduce((max, point) =>
        point.kwh > max.kwh ? point : max
      );

      const usageData = {
        userId,
        usagePoints,
        totalAnnualKwh: totalKwh,
        averageMonthlyKwh,
        peakMonthKwh: peakPoint.kwh,
        peakMonth: new Date(peakPoint.timestamp).toLocaleString('default', { month: 'long' }),
      };

      uploadUsageData(
        { userId, usageData },
        {
          onSuccess: () => {
            setSuccess(true);
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          },
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Failed to upload data');
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Upload Usage Data</h1>
        <p className="text-muted-foreground mt-2">
          Upload your energy usage data to get personalized recommendations
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Upload a CSV file with your energy usage data. The file should include columns for
            timestamp/date and kWh usage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>
                Data uploaded successfully! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="file">CSV File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Expected columns: timestamp (or date), kwh (or usage, consumption), cost (optional)
            </p>
          </div>

          <Button
            onClick={handleFileUpload}
            disabled={!file || isUploading || success}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

