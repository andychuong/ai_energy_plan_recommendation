import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import type { CreateUserPreferencesRequest } from 'shared/types';

export function useUserPreferences(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['userPreferences', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return apiClient.getUserPreferences(userId);
    },
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: async (request: CreateUserPreferencesRequest) => {
      return apiClient.createUserPreferences(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}

