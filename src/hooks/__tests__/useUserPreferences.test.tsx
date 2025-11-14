import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserPreferences } from '../useUserPreferences';
import { apiClient } from '@/services/api/client';
import type {
  UserPreferences,
  CreateUserPreferencesRequest,
} from 'shared/types';

// Mock the API client
jest.mock('@/services/api/client', () => ({
  apiClient: {
    getUserPreferences: jest.fn(),
    createUserPreferences: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useUserPreferences', () => {
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

  const mockPreferences: UserPreferences = {
    userId: 'user-123',
    costSavingsPriority: 'high',
    flexibilityPreference: 5,
    renewableEnergyPreference: 7,
    supplierRatingPreference: 8,
    contractTypePreference: 'fixed',
    earlyTerminationFeeTolerance: 3,
    sustainabilityGoals: ['renewable', 'carbon-neutral'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should fetch user preferences when userId is provided', async () => {
    mockApiClient.getUserPreferences.mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences('user-123'), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.preferences).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toEqual(mockPreferences);
    expect(mockApiClient.getUserPreferences).toHaveBeenCalledWith('user-123');
  });

  it('should not fetch when userId is undefined', () => {
    const { result } = renderHook(() => useUserPreferences(undefined), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockApiClient.getUserPreferences).not.toHaveBeenCalled();
  });

  it('should handle errors when fetching preferences', async () => {
    const error = new Error('Failed to fetch preferences');
    mockApiClient.getUserPreferences.mockRejectedValue(error);

    const { result } = renderHook(() => useUserPreferences('user-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.preferences).toBeUndefined();
  });

  it('should update preferences successfully', async () => {
    mockApiClient.getUserPreferences.mockResolvedValue(mockPreferences);
    mockApiClient.createUserPreferences.mockResolvedValue(mockPreferences);

    const { result } = renderHook(() => useUserPreferences('user-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updateRequest: CreateUserPreferencesRequest = {
      userId: 'user-123',
      preferences: {
        costSavingsPriority: 'medium',
        flexibilityPreference: 6,
        renewableEnergyPreference: 8,
        supplierRatingPreference: 9,
        contractTypePreference: 'variable',
        earlyTerminationFeeTolerance: 4,
      },
    };

    result.current.updatePreferences(updateRequest);

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    expect(mockApiClient.createUserPreferences).toHaveBeenCalledWith(
      updateRequest
    );
  });

  it('should show updating state during mutation', async () => {
    mockApiClient.getUserPreferences.mockResolvedValue(mockPreferences);

    // Create a promise that we can control
    let resolvePromise: (value: UserPreferences) => void;
    const controlledPromise = new Promise<UserPreferences>(resolve => {
      resolvePromise = resolve;
    });
    mockApiClient.createUserPreferences.mockReturnValueOnce(controlledPromise);

    const { result } = renderHook(() => useUserPreferences('user-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updateRequest: CreateUserPreferencesRequest = {
      userId: 'user-123',
      preferences: {
        costSavingsPriority: 'high',
        flexibilityPreference: 5,
        renewableEnergyPreference: 7,
        supplierRatingPreference: 8,
        contractTypePreference: 'fixed',
        earlyTerminationFeeTolerance: 3,
      },
    };

    result.current.updatePreferences(updateRequest);

    // Wait for mutation to start
    await waitFor(
      () => {
        expect(result.current.isUpdating).toBe(true);
      },
      { timeout: 3000 }
    );

    // Resolve the promise
    resolvePromise!(mockPreferences);

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });
});
