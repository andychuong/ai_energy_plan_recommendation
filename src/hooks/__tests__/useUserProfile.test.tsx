import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserProfile } from '../useUserProfile';
import { apiClient } from '@/services/api/client';

// Mock the API client
jest.mock('@/services/api/client', () => ({
  apiClient: {
    getUserProfile: jest.fn(),
    saveUserProfile: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useUserProfile', () => {
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

  const mockProfile = {
    state: 'TX',
    address: {
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
    },
    useCustomAverages: false,
  };

  it('should fetch user profile when userId is provided', async () => {
    mockApiClient.getUserProfile.mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useUserProfile('user-123'), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.profile).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(mockApiClient.getUserProfile).toHaveBeenCalledWith('user-123');
  });

  it('should not fetch when userId is undefined', () => {
    const { result } = renderHook(() => useUserProfile(undefined), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(mockApiClient.getUserProfile).not.toHaveBeenCalled();
  });

  it('should handle errors when fetching profile', async () => {
    const error = new Error('Failed to fetch profile');
    mockApiClient.getUserProfile.mockRejectedValue(error);

    const { result } = renderHook(() => useUserProfile('user-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.profile).toBeUndefined();
  });

  it('should save user profile successfully', async () => {
    mockApiClient.getUserProfile.mockResolvedValue(mockProfile);
    mockApiClient.saveUserProfile.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUserProfile('user-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const profileUpdate = {
      userId: 'user-123',
      profile: {
        state: 'CA',
        useCustomAverages: true,
        customAverageKwh: 1000,
        customAverageCost: 100,
      },
    };

    result.current.saveUserProfile(profileUpdate);

    await waitFor(() => {
      expect(result.current.isSaving).toBe(false);
    });

    expect(mockApiClient.saveUserProfile).toHaveBeenCalledWith(
      'user-123',
      profileUpdate.profile
    );
  });

  it('should show saving state during mutation', async () => {
    mockApiClient.getUserProfile.mockResolvedValue(mockProfile);

    // Create a promise that we can control
    let resolvePromise: () => void;
    const controlledPromise = new Promise<void>(resolve => {
      resolvePromise = resolve;
    });
    mockApiClient.saveUserProfile.mockReturnValue(controlledPromise);

    const { result } = renderHook(() => useUserProfile('user-123'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const profileUpdate = {
      userId: 'user-123',
      profile: {
        state: 'CA',
      },
    };

    result.current.saveUserProfile(profileUpdate);

    // Wait for mutation to start
    await waitFor(() => {
      expect(result.current.isSaving).toBe(true);
    });

    // Resolve the promise
    resolvePromise!();

    await waitFor(() => {
      expect(result.current.isSaving).toBe(false);
    });
  });
});
