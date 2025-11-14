import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import type { RecommendationHistory } from 'shared/types';
import type { EnergyPlan } from 'shared/types';

interface SavedRecommendation {
  history: RecommendationHistory;
  plan?: EnergyPlan;
}

/**
 * Hook to fetch the latest saved recommendations from RecommendationHistory
 * Groups by generation batch (same createdAt) and returns the most recent batch
 */
export function useSavedRecommendations(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['savedRecommendations', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get all recommendation history
      const history = await apiClient.getRecommendationHistory(userId);

      if (history.length === 0) {
        return [];
      }

      // Group by createdAt (same batch) and get the most recent batch
      const groupedByDate = history.reduce(
        (acc, rec) => {
          const date = rec.createdAt.split('T')[0]; // Group by date
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(rec);
          return acc;
        },
        {} as Record<string, RecommendationHistory[]>
      );

      // Get the most recent date
      const dates = Object.keys(groupedByDate).sort().reverse();
      if (dates.length === 0) {
        return [];
      }

      const mostRecentDate = dates[0];
      const mostRecentBatch = groupedByDate[mostRecentDate];

      // Sort by rank
      mostRecentBatch.sort((a, b) => a.rank - b.rank);

      // Fetch plan details once for all recommendations
      let plans: EnergyPlan[] = [];
      try {
        const profile = await apiClient.getUserProfile(userId);
        const state = profile?.state || 'CA';
        plans = await apiClient.getEnergyPlans(state);
      } catch (error) {
        console.warn('Failed to fetch plan details:', error);
      }

      // Match plans to recommendations
      const savedRecommendations: SavedRecommendation[] = mostRecentBatch.map(
        rec => {
          const plan = plans.find(p => p.planId === rec.planId);
          return {
            history: rec,
            plan,
          };
        }
      );

      return savedRecommendations;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    recommendations: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
