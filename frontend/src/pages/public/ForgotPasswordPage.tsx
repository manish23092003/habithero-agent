import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await api.forgotPassword(trimmed);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Unable to process your request at this time. Please try again.');
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
            Reset your password
          </h1>
          <p className="text-xs text-[#5F6F65]">
            Enter your email to receive recovery instructions.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E9ECE7] bg-[#FFFFFF] p-6 sm:p-8 shadow-card space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {submitted ? (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center shadow-subtle">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[#26352D]">Check Your Inbox</h3>
                <p className="text-xs text-[#5F6F65] leading-relaxed">
                  If an account exists for <strong className="text-[#26352D]">{email}</strong>, we've sent password reset instructions with a recovery link.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F7F2] border border-[#E9ECE7] text-xs text-[#5F6F65] text-left space-y-1">
                <span className="font-semibold text-[#26352D] block">Next steps:</span>
                <p className="text-[11px] leading-relaxed">
                  • Click the link in the email within <strong>15 minutes</strong> to choose a new password.
                </p>
                <p className="text-[11px] leading-relaxed">
                  • If you don't see it within a couple of minutes, check your spam or junk folder.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-semibold bg-[#245C46] hover:bg-[#1d4a38] text-white transition-all shadow-subtle"
                >
                  <span>Return to Sign In</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  className="text-xs text-[#5F6F65] hover:text-[#26352D] font-medium py-1"
                >
                  Need to try a different email?
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="block text-xs font-semibold text-[#26352D]">
                  Account Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] disabled:opacity-60 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#245C46] hover:bg-[#1d4a38] disabled:opacity-60 text-white shadow-subtle transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Recovery Email...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Password Reset Link</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F6F65] hover:text-[#26352D] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
