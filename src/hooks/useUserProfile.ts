import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';

export function useUserProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return apiClient.getUserProfile(userId);
    },
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      profile: {
        state?: string;
        address?: Record<string, unknown>;
        useCustomAverages?: boolean;
        customAverageKwh?: number;
        customAverageCost?: number;
      };
    }) => {
      await apiClient.saveUserProfile(data.userId, data.profile);
      return data.profile;
    },
    onSuccess: (_, variables) => {
      // Invalidate user profile query
      queryClient.invalidateQueries({
        queryKey: ['userProfile', variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      // Also invalidate usage data query since it depends on user profile (for custom averages)
      queryClient.invalidateQueries({
        queryKey: ['usageData', variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ['usageData'] });
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error,
    saveUserProfile: mutation.mutate,
    saveUserProfileAsync: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
