import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageData } from '@/hooks/useUsageData';
import { apiClient } from '@/services/api/client';

export function UploadPage() {
  const { user } = useAuth();
  const userId = user?.userId || user?.username;
  const { uploadUsageData, isUploading } = useUsageData(userId);
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extractedData, setExtractedData] = useState<CustomerUsageData | null>(
    null
  );

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
      setError(null);
      setSuccess(false);

      // Check file type - all supported formats go through AI reader
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
      const isPDF =
        file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isImage =
        file.type.startsWith('image/') || /\.(png|jpg|jpeg)$/i.test(file.name);
      const isText = file.type === 'text/plain' || file.name.endsWith('.txt');

      // Use AI statement reader for all file types (PDF, images, text, CSV)
      // The AI can intelligently parse CSV files and extract structured data
      // This follows AI bill analyzer best practices by using AI for all formats
      if (isPDF || isImage || isText || isCSV) {
        // Use AI statement reader for all supported formats
        const usageData = await apiClient.readStatement(userId, file);

        // Store extracted data for preview
        setExtractedData(usageData);

        // Process and store the usage data
        uploadUsageData(
          {
            userId,
            usageData: {
              userId,
              usagePoints: usageData.usageDataPoints,
              totalAnnualKwh: usageData.aggregatedStats.totalKwh,
              averageMonthlyKwh: usageData.aggregatedStats.averageMonthlyKwh,
              peakMonthKwh: usageData.aggregatedStats.peakMonthKwh,
              peakMonth: usageData.aggregatedStats.peakMonth,
            },
          },
          {
            onSuccess: () => {
              setSuccess(true);
              setTimeout(() => {
                navigate('/dashboard');
              }, 3000); // Give user time to see the preview
            },
            onError: err => {
              setError(
                err instanceof Error ? err.message : 'Failed to upload data'
              );
            },
          }
        );
      } else {
        setError(
          'Unsupported file type. Please upload PDF, image, CSV, or text file.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Upload Usage Data</h1>
        <p className="mt-2 text-muted-foreground">
          Upload your energy usage data to get personalized recommendations
        </p>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Upload Energy Bill</CardTitle>
          <CardDescription>
            Upload your energy bill as PDF, image (PNG/JPG), CSV, or text file.
            Our AI will automatically extract usage data from your bill.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && extractedData && (
            <Alert>
              <AlertDescription className="space-y-3">
                <p className="font-semibold">
                  ✓ Data extracted and uploaded successfully!
                </p>
                <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                  <p className="mb-2 font-medium">Extracted Summary:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">
                        Total Annual:
                      </span>{' '}
                      <span className="font-semibold">
                        {extractedData.aggregatedStats?.totalKwh?.toFixed(0) ||
                          'N/A'}{' '}
                        kWh
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Avg Monthly:
                      </span>{' '}
                      <span className="font-semibold">
                        {extractedData.aggregatedStats?.averageMonthlyKwh?.toFixed(
                          0
                        ) || 'N/A'}{' '}
                        kWh
                      </span>
                    </div>
                    {extractedData.aggregatedStats?.totalCost && (
                      <div>
                        <span className="text-muted-foreground">
                          Annual Cost:
                        </span>{' '}
                        <span className="font-semibold">
                          ${extractedData.aggregatedStats.totalCost.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {extractedData.aggregatedStats?.peakMonth && (
                      <div>
                        <span className="text-muted-foreground">
                          Peak Month:
                        </span>{' '}
                        <span className="font-semibold">
                          {extractedData.aggregatedStats.peakMonth}
                        </span>
                      </div>
                    )}
                    {extractedData.usageDataPoints && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          Data Points:
                        </span>{' '}
                        <span className="font-semibold">
                          {extractedData.usageDataPoints.length} months
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Redirecting to dashboard in 3 seconds...
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="file">Energy Bill File</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.pdf,.png,.jpg,.jpeg,.txt"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="flex-1 cursor-pointer file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file')?.click()}
                  disabled={isUploading}
                >
                  Browse Files
                </Button>
              </div>
              {file && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✓ Selected: {file.name}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Size: {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, PNG, JPG, CSV, TXT. Our AI will
              automatically extract all relevant data from your energy bill.
            </p>
          </div>

          <Button
            onClick={handleFileUpload}
            disabled={!file || isUploading || success}
            className="w-full"
          >
            {isUploading ? 'Processing with AI...' : 'Read Bill with AI'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
