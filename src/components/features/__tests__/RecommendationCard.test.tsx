import { render, screen } from '@testing-library/react';
import { RecommendationCard } from '../RecommendationCard';
import type { Recommendation, EnergyPlan } from 'shared/types';

const mockRecommendation: Recommendation = {
  recommendationId: 'rec-1',
  planId: 'plan-1',
  rank: 1,
  projectedSavings: 500,
  explanation: 'This plan offers great savings for your usage pattern.',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockPlan: EnergyPlan = {
  planId: 'plan-1',
  supplierName: 'Green Energy Co.',
  planName: 'Green Power Plan',
  ratePerKwh: 0.12,
  contractType: 'fixed',
  contractLengthMonths: 12,
  renewablePercentage: 100,
  supplierRating: 4.5,
  state: 'TX',
};

describe('RecommendationCard', () => {
  it('should render recommendation with plan details', () => {
    render(
      <RecommendationCard recommendation={mockRecommendation} plan={mockPlan} />
    );

    expect(screen.getByText('#1 Recommendation')).toBeInTheDocument();
    expect(screen.getByText('Green Energy Co.')).toBeInTheDocument();
    expect(screen.getByText('Green Power Plan')).toBeInTheDocument();
    expect(screen.getByText('+$500.00')).toBeInTheDocument();
    expect(screen.getByText('Annual Savings')).toBeInTheDocument();
    expect(
      screen.getByText('This plan offers great savings for your usage pattern.')
    ).toBeInTheDocument();
  });

  it('should display positive savings in green', () => {
    render(
      <RecommendationCard recommendation={mockRecommendation} plan={mockPlan} />
    );

    const savingsElement = screen.getByText('+$500.00');
    expect(savingsElement).toHaveClass('text-green-600');
  });

  it('should display negative savings in red', () => {
    const negativeRecommendation: Recommendation = {
      ...mockRecommendation,
      projectedSavings: -100,
    };

    render(
      <RecommendationCard
        recommendation={negativeRecommendation}
        plan={mockPlan}
      />
    );

    const savingsElement = screen.getByText('-$100.00');
    expect(savingsElement).toHaveClass('text-red-600');
  });

  it('should display plan details correctly', () => {
    render(
      <RecommendationCard recommendation={mockRecommendation} plan={mockPlan} />
    );

    expect(screen.getByText('$0.12/kWh')).toBeInTheDocument();
    expect(screen.getByText(/fixed/i)).toBeInTheDocument();
    expect(screen.getByText('12 months')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should handle optional plan fields', () => {
    const planWithoutOptional: EnergyPlan = {
      planId: 'plan-2',
      supplierName: 'Basic Energy',
      planName: 'Basic Plan',
      ratePerKwh: 0.1,
      contractType: 'variable',
    };

    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        plan={planWithoutOptional}
      />
    );

    expect(screen.getByText('Basic Energy')).toBeInTheDocument();
    expect(screen.getByText('Basic Plan')).toBeInTheDocument();
    expect(screen.getByText('$0.10/kWh')).toBeInTheDocument();
    expect(screen.getByText(/variable/i)).toBeInTheDocument();
  });

  it('should display customer satisfaction when available', () => {
    const satisfactionData = {
      averageRating: 4.5,
      reviewCount: 10,
    };

    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        plan={mockPlan}
        satisfactionData={satisfactionData}
      />
    );

    expect(screen.getByText('Customer Satisfaction')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(10 reviews)')).toBeInTheDocument();
  });

  it('should not display satisfaction section when no data', () => {
    render(
      <RecommendationCard recommendation={mockRecommendation} plan={mockPlan} />
    );

    expect(screen.queryByText('Customer Satisfaction')).not.toBeInTheDocument();
  });

  it('should call onSelect when Select Plan button is clicked', () => {
    const onSelect = jest.fn();

    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        plan={mockPlan}
        onSelect={onSelect}
      />
    );

    const selectButton = screen.getByText('Select Plan');
    selectButton.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('should render without plan if plan is not provided', () => {
    render(<RecommendationCard recommendation={mockRecommendation} />);

    expect(screen.getByText('#1 Recommendation')).toBeInTheDocument();
    expect(screen.getByText('+$500.00')).toBeInTheDocument();
    expect(screen.queryByText('Green Energy Co.')).not.toBeInTheDocument();
  });
});
