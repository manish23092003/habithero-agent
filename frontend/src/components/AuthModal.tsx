import React, { useState } from 'react';
import { X, Sparkles, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { api, AuthUser } from '../services/api';

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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
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
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) throw new Error('Please enter your name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        const res = await api.register(name.trim(), email.trim(), password);
        onAuthSuccess(res.user);
      } else {
        const res = await api.login(email.trim(), password);
        onAuthSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    const demoEmail = 'alex.habithero@example.com';
    const demoPassword = 'password123';

    try {
      const res = await api.login(demoEmail, demoPassword);
      onAuthSuccess(res.user);
      onClose();
    } catch {
      try {
        const res = await api.register('Alex Hero', demoEmail, demoPassword);
        onAuthSuccess(res.user);
        onClose();
      } catch (regErr: any) {
        setError(regErr.message || 'Could not authenticate demo profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-elevation border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 border border-brand-200/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                {mode === 'login' ? 'Sign In to HabitHero' : 'Create HabitHero Account'}
              </h3>
              <p className="text-xs text-slate-500">
                Synchronizes roadmap & streak persistence with MongoDB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-name" className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Hero"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400 transition-all"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              id="auth-password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm shadow-subtle hover:shadow-card transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Dashboard</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Profile & Sync</span>
              </>
            )}
          </button>

          {/* Quick Demo Login Option */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={isLoading}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline inline-flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-brand-50 transition-colors"
            >
              <span>⚡ One-Click Demo Profile (Alex Hero)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
