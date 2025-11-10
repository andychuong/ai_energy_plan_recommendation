import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import type { CustomerUsageData, UserPreferences } from 'shared/types';

export function useRecommendations(userId: string | undefined, usageData: CustomerUsageData | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recommendations', userId, usageData],
    queryFn: async () => {
      if (!userId || !usageData) {
        throw new Error('User ID and usage data are required');
      }
      return apiClient.generateRecommendations(userId, usageData);
    },
    enabled: !!userId && !!usageData,
  });

  const mutation = useMutation({
    mutationFn: async (data: { userId: string; usageData: CustomerUsageData; preferences?: UserPreferences }) => {
      return apiClient.generateRecommendations(data.userId, data.usageData);
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

