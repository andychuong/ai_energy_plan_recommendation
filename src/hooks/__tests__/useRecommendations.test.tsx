import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecommendations } from '../useRecommendations';
import { apiClient } from '@/services/api/client';
import type { CustomerUsageData, Recommendation } from 'shared/types';

// Mock the API client
jest.mock('@/services/api/client', () => ({
  apiClient: {
    generateRecommendations: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useRecommendations', () => {
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

  const mockRecommendations: Recommendation[] = [
    {
      recommendationId: 'rec-1',
      planId: 'plan-1',
      rank: 1,
      projectedSavings: 500,
      explanation: 'This plan offers great savings',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      recommendationId: 'rec-2',
      planId: 'plan-2',
      rank: 2,
      projectedSavings: 300,
      explanation: 'This plan is also good',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  it('should fetch recommendations when userId and usageData are provided', async () => {
    mockApiClient.generateRecommendations.mockResolvedValue(
      mockRecommendations
    );

    const { result } = renderHook(
      () => useRecommendations('user-123', mockUsageData),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.recommendations).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.recommendations).toEqual(mockRecommendations);
    expect(mockApiClient.generateRecommendations).toHaveBeenCalledWith(
      'user-123',
      mockUsageData
    );
  });

  it('should not fetch when userId is undefined', () => {
    const { result } = renderHook(
      () => useRecommendations(undefined, mockUsageData),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockApiClient.generateRecommendations).not.toHaveBeenCalled();
  });

  it('should not fetch when usageData is null', () => {
    const { result } = renderHook(() => useRecommendations('user-123', null), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockApiClient.generateRecommendations).not.toHaveBeenCalled();
  });

  it('should handle errors when fetching recommendations', async () => {
    const error = new Error('Failed to generate recommendations');
    mockApiClient.generateRecommendations.mockRejectedValue(error);

    const { result } = renderHook(
      () => useRecommendations('user-123', mockUsageData),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.recommendations).toEqual([]);
  });

  it('should generate recommendations via mutation', async () => {
    mockApiClient.generateRecommendations.mockResolvedValue(
      mockRecommendations
    );

    const { result } = renderHook(
      () => useRecommendations('user-123', mockUsageData),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.generateRecommendations({
      userId: 'user-123',
      usageData: mockUsageData,
    });

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(mockApiClient.generateRecommendations).toHaveBeenCalledTimes(3); // Once for query, once for mutation, once for refetch after invalidation
  });

  it('should show generating state during mutation', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: Recommendation[]) => void;
    const controlledPromise = new Promise<Recommendation[]>(resolve => {
      resolvePromise = resolve;
    });

    // First call (from query) resolves immediately
    mockApiClient.generateRecommendations.mockResolvedValueOnce(
      mockRecommendations
    );
    // Second call (from mutation) uses controlled promise
    mockApiClient.generateRecommendations.mockReturnValueOnce(
      controlledPromise
    );

    const { result } = renderHook(
      () => useRecommendations('user-123', mockUsageData),
      { wrapper }
    );

    // Wait for initial query to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.generateRecommendations({
      userId: 'user-123',
      usageData: mockUsageData,
    });

    // Wait for mutation to start
    await waitFor(
      () => {
        expect(result.current.isGenerating).toBe(true);
      },
      { timeout: 3000 }
    );

    // Resolve the promise
    resolvePromise!(mockRecommendations);

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });
  });
});
