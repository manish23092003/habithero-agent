import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  RefreshCw,
  Check,
} from 'lucide-react';
import { api } from '../../services/api';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password requirement checks
  const hasMinLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // If no token is present in the URL query string
  if (!token || !token.trim()) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-red-100 flex items-center justify-center text-red-600 shadow-subtle">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#26352D]">
              Invalid Recovery Link
            </h1>
            <p className="text-xs text-[#5F6F65]">
              This password reset link is missing a valid security token.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 sm:p-8 shadow-card text-center space-y-4">
            <p className="text-xs text-[#5F6F65] leading-relaxed">
              Password reset links must be opened directly from the email sent to you. If your link was copied incompletely or has expired, please request a new one.
            </p>

            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Request a New Reset Link</span>
            </Link>

            <div className="pt-2">
              <Link to="/login" className="text-xs font-medium text-[#5F6F65] hover:text-[#26352D]">
                Return to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setIsLoading(true);
    try {
      await api.resetPassword(token.trim(), password);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired or already been used.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-xl bg-[#245C46] flex items-center justify-center text-white shadow-subtle">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#26352D]">
            {isSuccess ? 'Password Reset Complete' : 'Set a New Password'}
          </h1>
          <p className="text-xs text-[#5F6F65]">
            {isSuccess
              ? 'Your account has been secured with your new password.'
              : 'Choose a strong password with at least 8 characters.'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 sm:p-8 shadow-card space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 space-y-1">
                <div className="leading-relaxed">{error}</div>
                {error.includes('expired') || error.includes('Invalid') ? (
                  <Link
                    to="/forgot-password"
                    className="inline-block font-semibold underline text-red-800 hover:text-red-950 pt-1"
                  >
                    Request a fresh link &rarr;
                  </Link>
                ) : null}
              </div>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-5 text-center animate-fade-in">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center shadow-subtle">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#26352D]">Ready to Sign In</h3>
                <p className="text-xs text-[#5F6F65] leading-relaxed">
                  Your password has been securely updated. All previous sessions have been invalidated for your safety.
                </p>
              </div>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all"
              >
                <span>Sign In to HabitHero</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block text-xs font-semibold text-[#26352D]">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] disabled:opacity-60 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C9A91] hover:text-[#26352D]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="block text-xs font-semibold text-[#26352D]">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] disabled:opacity-60 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C9A91] hover:text-[#26352D]"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 rounded-xl bg-[#F7F7F2] border border-[#E9ECE7] space-y-1.5 text-xs">
                <span className="font-semibold text-[11px] text-[#26352D] block">Password Checklist:</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      hasMinLength ? 'bg-[#245C46] text-white' : 'bg-[#E9ECE7] text-[#8C9A91]'
                    }`}
                  >
                    {hasMinLength ? <Check className="w-2.5 h-2.5" /> : '•'}
                  </span>
                  <span className={hasMinLength ? 'text-[#245C46] font-medium' : 'text-[#5F6F65]'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      passwordsMatch ? 'bg-[#245C46] text-white' : 'bg-[#E9ECE7] text-[#8C9A91]'
                    }`}
                  >
                    {passwordsMatch ? <Check className="w-2.5 h-2.5" /> : '•'}
                  </span>
                  <span className={passwordsMatch ? 'text-[#245C46] font-medium' : 'text-[#5F6F65]'}>
                    Passwords match
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !hasMinLength || !passwordsMatch}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#245C46] hover:bg-[#1d4a38] disabled:opacity-50 text-white shadow-subtle transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Save New Password</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F6F65] hover:text-[#26352D] transition-colors"
                >
                  <span>Cancel and return to login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

