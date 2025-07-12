
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [supabaseLoaded, setSupabaseLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if Supabase is already loaded
    if (window.supabase) {
      setSupabaseLoaded(true);
      return;
    }

    // Wait for Supabase to load from the script tag in index.html
    const checkSupabase = () => {
      if (window.supabase) {
        setSupabaseLoaded(true);
      } else {
        setTimeout(checkSupabase, 100);
      }
    };

    checkSupabase();
  }, []);

  const handleGoogleLogin = async () => {
    if (!supabaseLoaded) {
      setError("Supabase not loaded yet. Please wait.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const SUPABASE_URL = 'https://bmmcwlukjgfxmzxjpjwx.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbWN3bHVramdmeG16eGpwand4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDMxNjIsImV4cCI6MjA1MDk3OTE2Mn0.sb_publishable_b60TKX8zQ9yPaAB5xEpvuw_VmC14CGY';

      const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      });

      if (error) {
        throw error;
      }

      // If successful, user will be redirected
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">

      <Card className="w-full max-w-md">

        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="StockV5"
              className="h-12 w-12 mr-3"
            />
            <CardTitle className="text-2xl">StockV5</CardTitle>
            <span className="flex justify-right pl-8">
              <ThemeToggle />
            </span>
          </div>
          <CardDescription>
            Sign in to access your StockV5 Org
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading || !supabaseLoaded}
            className="w-full py-6"
            size="lg"
          >
            <div className="h-6 w-6 mr-2 flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                preserveAspectRatio="xMidYMid meet"
                style={{ display: 'block', width: '24px', height: '24px' }}
                className="h-full w-full"
              >
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                <path fill="none" d="M1 1h22v22H1z" />
              </svg>
            </div>



            {isLoading ? "Signing in..." : !supabaseLoaded ? "Loading..." : "Sign in with Google"}
          </Button>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            By logging in, you acknowledge that this program is in a public beta phase. There may still be corrupting bugs or vulnerabilities present.
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
