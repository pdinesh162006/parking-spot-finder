import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { API_URL } from '../store/authStore';
import { Car, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import GoogleSignInModal from '../components/GoogleSignInModal';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const connectSocketStore = useSocketStore((s) => s.connectSocket);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rememberedEmail');
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch (err) {
      // ignore localStorage errors
    }
  }, []);

  const handleGoogleSuccess = async (googleEmail: string, googleName: string) => {
    setGoogleModalOpen(false);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: googleEmail, name: googleName }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.accessToken, data.user);
        connectSocketStore(data.accessToken);

        const from = location.state?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
        } else {
          const defaultRedirects = {
            DRIVER: '/dashboard',
            OWNER: '/owner',
            ADMIN: '/admin',
          };
          navigate(defaultRedirects[data.user.role as 'DRIVER' | 'OWNER' | 'ADMIN'] || '/');
        }
      } else {
        setError(data.message || 'Google login failed. Please try again.');
      }
    } catch (err) {
      console.error('Google login request error:', err);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic client-side email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Authenticate state
        login(data.accessToken, data.user);
        
        // Connect Socket.io client
        connectSocketStore(data.accessToken);

        // Redirect to intended route or default depending on role
        const from = location.state?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
        } else {
          const defaultRedirects = {
            DRIVER: '/dashboard',
            OWNER: '/owner',
            ADMIN: '/admin',
          };
          navigate(defaultRedirects[data.user.role as 'DRIVER' | 'OWNER' | 'ADMIN'] || '/');
        }
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
        // Persist remembered email when login is successful
        if (res.ok) {
          try {
            if (rememberMe) {
              localStorage.setItem('rememberedEmail', email);
            } else {
              localStorage.removeItem('rememberedEmail');
            }
          } catch (err) {
            // ignore localStorage errors
          }
        }
    } catch (err) {
      console.error('Login request error:', err);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-100 shadow-premium">
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2 text-indigo-600 font-extrabold text-3xl mb-2">
            <Car className="h-8 w-8 text-indigo-500 animate-pulse" />
            <span>ParkEase</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Welcome Back</h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">Sign in to find and book your parking spot.</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@parkease.com"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-slate-200 rounded"
            />
            <label htmlFor="remember" className="text-sm font-semibold text-slate-600">Remember me</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl shadow-premium transition hover-lift flex items-center justify-center space-x-1"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center text-xs font-bold uppercase">
            <span className="bg-white px-3 text-slate-400">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGoogleModalOpen(true)}
          className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-extrabold py-3.5 rounded-xl shadow-sm transition hover-lift flex items-center justify-center space-x-2.5"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Google</span>
        </button>

        <GoogleSignInModal
          isOpen={googleModalOpen}
          onClose={() => setGoogleModalOpen(false)}
          onSuccess={handleGoogleSuccess}
        />

        <div className="text-center pt-2">
          <p className="text-xs font-semibold text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-500 hover:text-indigo-600">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
