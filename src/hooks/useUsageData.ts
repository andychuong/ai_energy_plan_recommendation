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
      return await apiClient.getUsageData(userId);
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale to ensure fresh data
    gcTime: 0, // Don't cache data - always fetch fresh (React Query v5)
  });

  const mutation = useMutation({
    mutationFn: async (data: { userId: string; usageData: UsageData }) => {
      await apiClient.saveUsageData(data.userId, {
        usagePoints: data.usageData.usagePoints,
        totalAnnualKwh: data.usageData.totalAnnualKwh,
        averageMonthlyKwh: data.usageData.averageMonthlyKwh,
        peakMonthKwh: data.usageData.peakMonthKwh,
        peakMonth: data.usageData.peakMonth,
      });
      return data.usageData;
    },
    onSuccess: (_, variables) => {
      // Invalidate queries for this specific user
      queryClient.invalidateQueries({
        queryKey: ['usageData', variables.userId],
      });
      // Also invalidate all usage data queries
      queryClient.invalidateQueries({ queryKey: ['usageData'] });
    },
  });

  return {
    usageData: query.data,
    isLoading: query.isLoading,
    error: query.error,
    uploadUsageData: mutation.mutate,
    isUploading: mutation.isPending,
    refetch: query.refetch,
  };
}
