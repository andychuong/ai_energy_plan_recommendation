import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSavedRecommendations } from '../useSavedRecommendations';
import { apiClient } from '@/services/api/client';
import type { RecommendationHistory, EnergyPlan } from 'shared/types';

// Mock the API client
jest.mock('@/services/api/client', () => ({
  apiClient: {
    getRecommendationHistory: jest.fn(),
    getUserProfile: jest.fn(),
    getEnergyPlans: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSavedRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when userId is undefined', () => {
    const { result } = renderHook(() => useSavedRecommendations(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.recommendations).toEqual([]);
  });

  it('should return empty array when no recommendations exist', async () => {
    mockApiClient.getRecommendationHistory.mockResolvedValue([]);

    const { result } = renderHook(() => useSavedRecommendations('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.recommendations).toEqual([]);
    expect(mockApiClient.getRecommendationHistory).toHaveBeenCalledWith(
      'user-123'
    );
  });

  it('should fetch and return the most recent batch of recommendations', async () => {
    const mockHistory: RecommendationHistory[] = [
      {
        userId: 'user-123',
        recommendationId: 'rec-1',
        planId: 'plan-1',
        rank: 1,
        projectedSavings: 500,
        explanation: 'Great plan',
        selected: false,
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        userId: 'user-123',
        recommendationId: 'rec-2',
        planId: 'plan-2',
        rank: 2,
        projectedSavings: 300,
        explanation: 'Good plan',
        selected: false,
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        userId: 'user-123',
        recommendationId: 'rec-3',
        planId: 'plan-3',
        rank: 1,
        projectedSavings: 400,
        explanation: 'Old plan',
        selected: false,
        createdAt: '2024-01-10T10:00:00Z',
      },
    ];

    const mockPlans: EnergyPlan[] = [
      {
        planId: 'plan-1',
        supplierName: 'Green Energy',
        planName: 'Green Plan',
        ratePerKwh: 0.12,
        contractType: 'fixed',
        state: 'CA',
      },
      {
        planId: 'plan-2',
        supplierName: 'Solar Power',
        planName: 'Solar Plan',
        ratePerKwh: 0.11,
        contractType: 'variable',
        state: 'CA',
      },
    ];

    mockApiClient.getRecommendationHistory.mockResolvedValue(mockHistory);
    mockApiClient.getUserProfile.mockResolvedValue({ state: 'CA' });
    mockApiClient.getEnergyPlans.mockResolvedValue(mockPlans);

    const { result } = renderHook(() => useSavedRecommendations('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return only the most recent batch (2024-01-15)
    expect(result.current.recommendations).toHaveLength(2);
    expect(result.current.recommendations[0].history.rank).toBe(1);
    expect(result.current.recommendations[1].history.rank).toBe(2);
    expect(result.current.recommendations[0].plan?.planName).toBe('Green Plan');
    expect(result.current.recommendations[1].plan?.planName).toBe('Solar Plan');
  });

  it('should handle missing plan details gracefully', async () => {
    const mockHistory: RecommendationHistory[] = [
      {
        userId: 'user-123',
        recommendationId: 'rec-1',
        planId: 'plan-1',
        rank: 1,
        projectedSavings: 500,
        explanation: 'Great plan',
        selected: false,
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];

    mockApiClient.getRecommendationHistory.mockResolvedValue(mockHistory);
    mockApiClient.getUserProfile.mockResolvedValue({ state: 'CA' });
    mockApiClient.getEnergyPlans.mockResolvedValue([]); // No plans found

    const { result } = renderHook(() => useSavedRecommendations('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.recommendations).toHaveLength(1);
    expect(result.current.recommendations[0].history.planId).toBe('plan-1');
    expect(result.current.recommendations[0].plan).toBeUndefined();
  });

  it('should sort recommendations by rank', async () => {
    const mockHistory: RecommendationHistory[] = [
      {
        userId: 'user-123',
        recommendationId: 'rec-3',
        planId: 'plan-3',
        rank: 3,
        projectedSavings: 200,
        explanation: 'Third plan',
        selected: false,
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        userId: 'user-123',
        recommendationId: 'rec-1',
        planId: 'plan-1',
        rank: 1,
        projectedSavings: 500,
        explanation: 'First plan',
        selected: false,
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        userId: 'user-123',
        recommendationId: 'rec-2',
        planId: 'plan-2',
        rank: 2,
        projectedSavings: 300,
        explanation: 'Second plan',
        selected: false,
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];

    mockApiClient.getRecommendationHistory.mockResolvedValue(mockHistory);
    mockApiClient.getUserProfile.mockResolvedValue({ state: 'CA' });
    mockApiClient.getEnergyPlans.mockResolvedValue([]);

    const { result } = renderHook(() => useSavedRecommendations('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.recommendations).toHaveLength(3);
    expect(result.current.recommendations[0].history.rank).toBe(1);
    expect(result.current.recommendations[1].history.rank).toBe(2);
    expect(result.current.recommendations[2].history.rank).toBe(3);
  });
});
