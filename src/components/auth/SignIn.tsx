import { useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Sign In component using Amplify Authenticator
 * Provides sign-in, sign-up, and password reset functionality
 */
export function SignIn() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to Arbor AI Energy</h1>
          <p className="text-muted-foreground">
            Sign in to get personalized energy plan recommendations
          </p>
        </div>
        <Authenticator
          loginMechanisms={['email']}
          socialProviders={['google']}
        >
          {({ user }) => {
            // Use a separate component to handle the effect
            return <SignInHandler user={user} refreshUser={refreshUser} navigate={navigate} />;
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
  navigate: (path: string) => void;
}) {
  useEffect(() => {
    if (user) {
      refreshUser().then(() => {
        navigate('/dashboard');
      });
    }
  }, [user, navigate, refreshUser]);
  return null;
}

