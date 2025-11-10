import { useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import {
  useNavigate,
  useLocation,
  type NavigateFunction,
} from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Sign In component using Amplify Authenticator
 * Provides sign-in, sign-up, and password reset functionality
 * Handles OAuth callbacks from Google
 */
export function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser, user } = useAuth();

  // If user is already authenticated and we're not processing a callback, redirect to dashboard
  useEffect(() => {
    if (user && !location.pathname.includes('callback')) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, location.pathname]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Welcome to SparkSave</h1>
          <p className="text-muted-foreground">
            Sign in to get smart energy plan recommendations that save you money
          </p>
        </div>
        <Authenticator loginMechanisms={['email']} socialProviders={['google']}>
          {({ user: authUser }) => {
            // Use a separate component to handle the effect
            return (
              <SignInHandler
                user={authUser}
                refreshUser={refreshUser}
                navigate={navigate}
              />
            );
          }}
        </Authenticator>
      </div>
    </div>
  );
}

function SignInHandler({
  user,
  refreshUser,
  navigate,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  refreshUser: () => Promise<void>;
  navigate: NavigateFunction;
}) {
  useEffect(() => {
    if (user) {
      // Add a small delay to ensure auth state is fully synced
      const timer = setTimeout(() => {
        refreshUser().then(() => {
          navigate('/dashboard', { replace: true });
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, navigate, refreshUser]);

  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
