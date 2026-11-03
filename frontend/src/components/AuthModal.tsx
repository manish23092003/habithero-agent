import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  ArrowRight
} from 'lucide-react';
import { api, AuthUser } from '../services/api';
import { GoogleSignInButton } from './auth/GoogleSignInButton';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your full name');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        const res = await api.register(name.trim(), trimmedEmail, password);
        onAuthSuccess(res.user);
      } else {
        const res = await api.login(trimmedEmail, password);
        onAuthSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-elevation border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 border border-brand-200/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-base font-bold text-stone-900">
                {mode === 'login' ? 'Sign In to HabitHero' : 'Create Your Account'}
              </h3>
              <p className="text-xs text-stone-500">
                {mode === 'login' ? 'Welcome back! Pick up where you left off' : 'Start building lasting habits with your personal coach'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="p-1.5 bg-stone-100 mx-6 mt-5 rounded-xl flex items-center gap-1 border border-stone-200/60">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-800 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Authentication */}
          <GoogleSignInButton
            mode={mode}
            text={mode === 'register' ? 'signup_with' : 'continue_with'}
            onSuccess={(user) => {
              onAuthSuccess(user);
              onClose();
            }}
            onError={(msg) => setError(msg)}
          />

          {/* Divider */}
          <div className="relative flex items-center justify-center my-1">
            <div className="w-full border-t border-stone-200" />
            <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              Or continue with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

          {mode === 'register' && (
            <div className="space-y-1.5 animate-fade-in">
              <label htmlFor="auth-name" className="block text-xs font-semibold text-stone-700">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                placeholder="Alex Hero"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-stone-900 placeholder:text-stone-400"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="block text-xs font-semibold text-stone-700">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-stone-900 placeholder:text-stone-400"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="block text-xs font-semibold text-stone-700">
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-stone-900 placeholder:text-stone-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Free Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};
