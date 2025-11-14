import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '../Header';

// Define the AuthContextType based on what's actually used in Header
type AuthContextType = {
  user: { userId: string; email?: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser?: () => Promise<void>;
};

// Mock the Logo component
jest.mock('@/components/ui/Logo', () => ({
  Logo: ({ size }: { size: string }) => (
    <div data-testid="logo">Logo {size}</div>
  ),
}));

// Mock the useAuth hook
const mockSignOut = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  useAuth: () => mockUseAuth(),
}));

const renderWithRouter = (authContextValue: Partial<AuthContextType>) => {
  const contextValue: AuthContextType = {
    user: authContextValue.user || null,
    loading: authContextValue.loading ?? false,
    signOut: authContextValue.signOut || mockSignOut,
    refreshUser: authContextValue.refreshUser || jest.fn(),
  };

  mockUseAuth.mockReturnValue(contextValue);

  return render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>
  );
};

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementation
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signOut: mockSignOut,
      refreshUser: jest.fn(),
    });
  });

  it('should render logo and app name', () => {
    renderWithRouter({ user: null });

    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByText('SparkSave')).toBeInTheDocument();
  });

  it('should show loading spinner when loading', () => {
    renderWithRouter({ user: null, loading: true });

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
  });

  it('should show Sign In button when user is not logged in', () => {
    renderWithRouter({ user: null, loading: false });

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
  });

  it('should show navigation links when user is logged in', () => {
    renderWithRouter({
      user: { userId: 'user-123', email: 'test@example.com' },
      loading: false,
    });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Usage Data')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    expect(screen.queryByText('Compare Plans')).not.toBeInTheDocument();
  });

  it('should call signOut when Sign Out button is clicked', () => {
    renderWithRouter({
      user: { userId: 'user-123', email: 'test@example.com' },
      loading: false,
    });

    const signOutButton = screen.getByText('Sign Out');
    signOutButton.click();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('should have correct links for navigation', () => {
    renderWithRouter({
      user: { userId: 'user-123', email: 'test@example.com' },
      loading: false,
    });

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const usageDataLink = screen.getByText('Usage Data').closest('a');
    const recommendationsLink = screen
      .getByText('Recommendations')
      .closest('a');
    const preferencesLink = screen.getByText('Preferences').closest('a');

    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    expect(usageDataLink).toHaveAttribute('href', '/usage-data');
    expect(recommendationsLink).toHaveAttribute('href', '/recommendations');
    expect(preferencesLink).toHaveAttribute('href', '/preferences');
  });

  it('should have link to auth page for Sign In button', () => {
    renderWithRouter({ user: null, loading: false });

    const signInLink = screen.getByText('Sign In').closest('a');
    expect(signInLink).toHaveAttribute('href', '/auth');
  });

  it('should have link to home page for logo', () => {
    renderWithRouter({ user: null, loading: false });

    const logoLink = screen.getByTestId('logo').closest('a');
    expect(logoLink).toHaveAttribute('href', '/');
  });
});
