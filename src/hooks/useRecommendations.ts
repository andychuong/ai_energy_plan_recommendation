import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import type { UsageData, UserPreferences } from '../../../shared/types';

export function useRecommendations(userId: string | undefined, usageData: UsageData | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recommendations', userId, usageData],
    queryFn: async () => {
      if (!userId || !usageData) {
        throw new Error('User ID and usage data are required');
      }
      // Note: The API client expects CustomerUsageData, but we have UsageData
      // This will need to be adjusted when backend is ready
      return apiClient.generateRecommendations(userId, usageData as any);
    },
    enabled: !!userId && !!usageData,
  });

  const mutation = useMutation({
    mutationFn: async (data: { userId: string; usageData: UsageData; preferences?: UserPreferences }) => {
      return apiClient.generateRecommendations(data.userId, data.usageData as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });

  return {
    recommendations: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    generateRecommendations: mutation.mutate,
    isGenerating: mutation.isPending,
  };
}

