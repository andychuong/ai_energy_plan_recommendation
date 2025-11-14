// Set environment variable BEFORE any imports
process.env.VITE_USE_MOCK_API = 'true';

// Mock amplify_outputs.json FIRST, before any imports
jest.mock(
  '../../../amplify_outputs.json',
  () => ({
    __esModule: true,
    default: {
      version: '1',
      auth: {
        user_pool_id: 'test-pool-id',
        user_pool_client_id: 'test-client-id',
      },
      custom: {},
    },
  }),
  { virtual: true }
);

// Mock Amplify
jest.mock('aws-amplify/data', () => ({
  generateClient: jest.fn(),
}));

jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(),
}));

// Mock the mock API
jest.mock('../../mock/mockApi', () => ({
  mockApi: {
    getEnergyPlans: jest.fn(),
    generateRecommendations: jest.fn(),
    getUserProfile: jest.fn(),
    getUserPreferences: jest.fn(),
  },
}));

// Now import after mocks are set up
import { apiClient } from '../client';
import { mockApi } from '../../mock/mockApi';
import type {
  EnergyPlan,
  CustomerUsageData,
  Recommendation,
  UserPreferences,
  UsageData,
} from 'shared/types';

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set mock API mode by default
    process.env.VITE_USE_MOCK_API = 'true';
  });

  afterEach(() => {
    delete process.env.VITE_USE_MOCK_API;
  });

  describe('getEnergyPlans', () => {
    it('should return energy plans from mock API when VITE_USE_MOCK_API is true', async () => {
      const mockPlans: EnergyPlan[] = [
        {
          planId: 'plan-1',
          supplierName: 'Green Energy Co.',
          planName: 'Green Power Plan',
          ratePerKwh: 0.12,
          contractType: 'fixed',
          state: 'TX',
        },
      ];

      (mockApi.getEnergyPlans as jest.Mock).mockResolvedValue(mockPlans);

      const plans = await apiClient.getEnergyPlans('TX');

      expect(plans).toEqual(mockPlans);
      expect(mockApi.getEnergyPlans).toHaveBeenCalledWith('TX');
    });

    it('should default to CA when no state is provided in mock mode', async () => {
      const mockPlans: EnergyPlan[] = [];
      (mockApi.getEnergyPlans as jest.Mock).mockResolvedValue(mockPlans);

      await apiClient.getEnergyPlans();

      expect(mockApi.getEnergyPlans).toHaveBeenCalledWith('CA');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations from mock API', async () => {
      const mockUsageData: CustomerUsageData = {
        customerInfo: {
          customerId: 'user-123',
          address: {
            city: 'Austin',
            state: 'TX',
          },
        },
        utilityInfo: {
          utilityName: 'Austin Energy',
        },
        usageDataPoints: [
          {
            timestamp: '2024-01-01T00:00:00Z',
            kwh: 1000,
            cost: 100,
          },
        ],
        aggregatedStats: {
          totalKwh: 12000,
          totalCost: 1200,
          averageMonthlyKwh: 1000,
          averageMonthlyCost: 100,
          peakMonth: 'July',
          peakMonthKwh: 1500,
        },
      };

      const mockRecommendations: Recommendation[] = [
        {
          recommendationId: 'rec-1',
          planId: 'plan-1',
          rank: 1,
          projectedSavings: 500,
          explanation: 'Great plan',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      (mockApi.generateRecommendations as jest.Mock).mockResolvedValue(
        mockRecommendations
      );

      const recommendations = await apiClient.generateRecommendations(
        'user-123',
        mockUsageData
      );

      expect(recommendations).toEqual(mockRecommendations);
      expect(mockApi.generateRecommendations).toHaveBeenCalledWith(
        'user-123',
        mockUsageData
      );
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile from mock API', async () => {
      // In mock mode, getUserProfile returns a hardcoded value
      const profile = await apiClient.getUserProfile('user-123');

      expect(profile).toEqual({ state: 'CA' });
    });
  });

  describe('getUserPreferences', () => {
    it('should get user preferences from mock API', async () => {
      const mockPreferences: UserPreferences = {
        userId: 'user-123',
        costSavingsPriority: 'high',
        flexibilityPreference: 5,
        renewableEnergyPreference: 7,
        supplierRatingPreference: 8,
        contractTypePreference: 'fixed',
        earlyTerminationFeeTolerance: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (mockApi.getUserPreferences as jest.Mock).mockResolvedValue(
        mockPreferences
      );

      const preferences = await apiClient.getUserPreferences('user-123');

      expect(preferences).toEqual(mockPreferences);
      expect(mockApi.getUserPreferences).toHaveBeenCalledWith('user-123');
    });
  });

  describe('saveUsageData', () => {
    it('should save usage data via mock API', async () => {
      const usageData: UsageData = {
        userId: 'user-123',
        usagePoints: [
          {
            timestamp: '2024-01-01T00:00:00Z',
            kwh: 1000,
            cost: 100,
          },
        ],
        totalAnnualKwh: 12000,
        averageMonthlyKwh: 1000,
        peakMonthKwh: 1500,
        peakMonth: 'July',
      };

      // Mock the saveUsageData method - it should not throw
      await expect(
        apiClient.saveUsageData('user-123', usageData)
      ).resolves.not.toThrow();
    });
  });
});
