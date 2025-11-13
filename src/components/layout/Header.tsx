import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <Logo size="sm" />
          <h1 className="text-xl font-bold">SparkSave</h1>
        </Link>
        <nav className="flex items-center space-x-4">
          {loading ? (
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
              aria-label="Loading"
            ></div>
          ) : user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Link to="/usage-data">
                <Button variant="ghost">Usage Data</Button>
              </Link>
              <Link to="/recommendations">
                <Button variant="ghost">Recommendations</Button>
              </Link>
              <Link to="/compare">
                <Button variant="ghost">Compare Plans</Button>
              </Link>
              <Link to="/preferences">
                <Button variant="ghost">Preferences</Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default">Sign In</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
