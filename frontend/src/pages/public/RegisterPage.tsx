import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name (minimum 2 characters)');
      return;
    }
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    try {
      await register(trimmedName, trimmedEmail, password);
      // Navigate to onboarding flow for first-time habit setup
      navigate('/onboarding', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand & Heading */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-xl bg-[#245C46] flex items-center justify-center text-white shadow-subtle">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#26352D]">
            Create your HabitHero account
          </h1>
          <p className="text-xs text-[#5F6F65]">
            Start building lasting consistency with your personal habit coach.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 sm:p-8 shadow-card space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#C85D55] text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-[#C85D55] shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-name" className="block text-xs font-semibold text-[#26352D]">
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                placeholder="Alex Hero"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-xs font-semibold text-[#26352D]">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="reg-password" className="block text-xs font-semibold text-[#26352D]">
                  Password
                </label>
                <span className={`text-[11px] ${password.length >= 6 ? 'text-[#245C46] font-semibold' : 'text-[#8C9A91]'}`}>
                  {password.length >= 6 ? '✓ 6+ characters' : 'Min 6 characters'}
                </span>
              </div>

              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Choose a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6F65] hover:text-[#26352D] p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-confirm" className="block text-xs font-semibold text-[#26352D]">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle hover:shadow-card transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Start Onboarding</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Link to Login */}
        <p className="text-center text-xs text-[#5F6F65]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[#245C46] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
