import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUsageData } from '../useUsageData';
import { apiClient } from '@/services/api/client';
import type { CustomerUsageData } from 'shared/types';

// Mock the API client
jest.mock('@/services/api/client', () => ({
  apiClient: {
    getUsageData: jest.fn(),
    saveUsageData: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useUsageData', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should fetch usage data when userId is provided', async () => {
    const mockUsageData: CustomerUsageData = {
      customerInfo: {
        customerId: 'user-123',
        address: {
          city: 'Austin',
          state: 'TX',
        },
      },
      utilityInfo: {
        utilityName: 'Austin Energy',
      },
      usageDataPoints: [
        {
          timestamp: '2024-01-01T00:00:00Z',
          kwh: 1000,
          cost: 100,
        },
      ],
      aggregatedStats: {
        totalKwh: 12000,
        totalCost: 1200,
        averageMonthlyKwh: 1000,
        averageMonthlyCost: 100,
        peakMonth: 'July',
        peakMonthKwh: 1500,
      },
    };

    mockApiClient.getUsageData.mockResolvedValue(mockUsageData);

    const { result } = renderHook(() => useUsageData('user-123'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.usageData).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.usageData).toEqual(mockUsageData);
    expect(mockApiClient.getUsageData).toHaveBeenCalledWith('user-123');
  });

  it('should not fetch when userId is undefined', () => {
    const { result } = renderHook(() => useUsageData(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockApiClient.getUsageData).not.toHaveBeenCalled();
  });

  it('should handle errors when fetching usage data', async () => {
    const error = new Error('Failed to fetch usage data');
    mockApiClient.getUsageData.mockRejectedValue(error);

    const { result } = renderHook(() => useUsageData('user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.usageData).toBeUndefined();
  });

  it('should upload usage data successfully', async () => {
    const mockUsageData: CustomerUsageData = {
      customerInfo: {
        customerId: 'user-123',
        address: {},
      },
      utilityInfo: {
        utilityName: 'Test Utility',
      },
      usageDataPoints: [],
      aggregatedStats: {
        totalKwh: 0,
        totalCost: 0,
        averageMonthlyKwh: 0,
        averageMonthlyCost: 0,
        peakMonth: 'January',
        peakMonthKwh: 0,
      },
    };

    mockApiClient.getUsageData.mockResolvedValue(mockUsageData);
    mockApiClient.saveUsageData.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUsageData('user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const usageData = {
      userId: 'user-123',
      usageData: {
        userId: 'user-123',
        usagePoints: [
          {
            timestamp: '2024-01-01T00:00:00Z',
            kwh: 1000,
          },
        ],
        totalAnnualKwh: 12000,
        averageMonthlyKwh: 1000,
        peakMonthKwh: 1500,
        peakMonth: 'July',
      },
    };

    result.current.uploadUsageData(usageData);

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });

    expect(mockApiClient.saveUsageData).toHaveBeenCalledWith('user-123', {
      usagePoints: usageData.usageData.usagePoints,
      totalAnnualKwh: 12000,
      averageMonthlyKwh: 1000,
      peakMonthKwh: 1500,
      peakMonth: 'July',
    });
  });

  it('should show uploading state during mutation', async () => {
    mockApiClient.getUsageData.mockResolvedValue({
      customerInfo: { customerId: 'user-123', address: {} },
      utilityInfo: { utilityName: 'Test' },
      usageDataPoints: [],
      aggregatedStats: {
        totalKwh: 0,
        totalCost: 0,
        averageMonthlyKwh: 0,
        averageMonthlyCost: 0,
        peakMonth: 'January',
        peakMonthKwh: 0,
      },
    });

    // Create a promise that we can control
    let resolvePromise: () => void;
    const controlledPromise = new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
    mockApiClient.saveUsageData.mockReturnValue(controlledPromise);

    const { result } = renderHook(() => useUsageData('user-123'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const usageData = {
      userId: 'user-123',
      usageData: {
        userId: 'user-123',
        usagePoints: [],
        totalAnnualKwh: 0,
        averageMonthlyKwh: 0,
      },
    };

    result.current.uploadUsageData(usageData);

    // Wait for mutation to start
    await waitFor(() => {
      expect(result.current.isUploading).toBe(true);
    });

    // Resolve the promise
    resolvePromise!();

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });
  });
});
