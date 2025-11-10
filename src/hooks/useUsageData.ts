import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import type { UsageData } from 'shared/types';

export function useUsageData(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['usageData', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return apiClient.getUsageData(userId);
    },
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: async (data: { userId: string; usageData: UsageData }) => {
      // TODO: Implement upload endpoint when backend is ready
      return Promise.resolve(data.usageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usageData'] });
    },
  });

  return {
    usageData: query.data,
    isLoading: query.isLoading,
    error: query.error,
    uploadUsageData: mutation.mutate,
    isUploading: mutation.isPending,
  };
}
