import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Menu, X, Github, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PublicLayout: React.FC = () => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7F7F2] flex flex-col text-[#26352D] font-sans">
      {/* Public Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E9ECE7] shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-[#245C46] rounded-xl p-1"
            >
              <div className="w-8 h-8 rounded-xl bg-[#245C46] flex items-center justify-center text-white shadow-subtle group-hover:bg-[#1d4a38] transition-colors">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-[#26352D] leading-none">
                  Habit<span className="text-[#245C46]">Hero</span>
                </span>
                <span className="text-[10px] text-[#5F6F65] font-medium tracking-wide uppercase mt-0.5">
                  Personal Habit Coach
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#5F6F65]">
              <NavLink 
                to="/" 
                end
                className={({ isActive }) => 
                  `transition-colors hover:text-[#26352D] ${isActive ? 'text-[#245C46] font-bold' : ''}`
                }
              >
                Home
              </NavLink>
              <NavLink 
                to="/features" 
                className={({ isActive }) => 
                  `transition-colors hover:text-[#26352D] ${isActive ? 'text-[#245C46] font-bold' : ''}`
                }
              >
                Features
              </NavLink>
              <NavLink 
                to="/about" 
                className={({ isActive }) => 
                  `transition-colors hover:text-[#26352D] ${isActive ? 'text-[#245C46] font-bold' : ''}`
                }
              >
                About
              </NavLink>
            </nav>

            {/* Desktop Auth Actions */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <span className="text-xs text-[#5F6F65] font-medium">
                    Signed in as <strong className="text-[#26352D]">{currentUser?.name.split(' ')[0]}</strong>
                  </span>
                  <Link
                    to="/app/dashboard"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle hover:shadow-card transition-all"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="text-xs text-[#5F6F65] hover:text-[#C85D55] font-medium px-2 py-1 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#26352D] hover:bg-[#E9ECE7]/50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle hover:shadow-card transition-all"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-[#5F6F65] hover:text-[#26352D] hover:bg-[#E9ECE7]/50"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FFFFFF] border-b border-[#E9ECE7] px-4 pt-3 pb-6 space-y-3 animate-fade-in">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-[#5F6F65]">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-[#26352D]"
              >
                Home
              </Link>
              <Link 
                to="/features" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-[#26352D]"
              >
                Features
              </Link>
              <Link 
                to="/about" 
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 hover:text-[#26352D]"
              >
                About
              </Link>
            </nav>

            <div className="pt-3 border-t border-[#E9ECE7] flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/app/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-[#245C46] text-white"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                      navigate('/');
                    }}
                    className="w-full py-2 text-center text-xs font-semibold text-[#C85D55]"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 rounded-xl text-center text-xs font-semibold border border-[#E9ECE7] text-[#26352D]"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 rounded-xl text-center text-xs font-bold bg-[#245C46] text-white"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Public Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Professional SaaS Footer */}
      <footer className="border-t border-[#E9ECE7] bg-[#FFFFFF] py-12 text-xs text-[#5F6F65]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#245C46] flex items-center justify-center text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-base text-[#26352D]">HabitHero</span>
              </div>
              <p className="text-xs text-[#5F6F65] max-w-sm leading-relaxed">
                Your friendly personal habit coach. Break big aspirations into realistic daily steps and gently adjust your plan when life gets busy.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#5F6F65]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#245C46]" />
                <span>Private, secure, and powered by intelligent habit coaching</span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#26352D]">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="hover:text-[#245C46] transition-colors">Overview</Link></li>
                <li><Link to="/features" className="hover:text-[#245C46] transition-colors">Features</Link></li>
                <li><Link to="/about" className="hover:text-[#245C46] transition-colors">About</Link></li>
                <li><Link to="/login" className="hover:text-[#245C46] transition-colors">Sign In</Link></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#26352D]">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/features" className="hover:text-[#245C46] transition-colors">
                    Habit Methodology
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-[#245C46] transition-colors">
                    Behavioral Science
                  </Link>
                </li>
                <li>
                  <a href="https://github.com/manish23092003/habithero-agent" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[#245C46] transition-colors">
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub Repository</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E9ECE7] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <p>© {new Date().getFullYear()} HabitHero. Built for human habit consistency. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span>Never Miss Twice Principle</span>
              <span>•</span>
              <span>Adaptive Habit Pacing</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
