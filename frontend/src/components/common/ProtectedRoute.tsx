import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F2] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#245C46] animate-spin" />
        <p className="text-xs text-[#5F6F65] font-medium tracking-wide">
          Verifying HabitHero session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const PublicOnlyRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F2] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#245C46] animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    // If user already logged in, redirect to intended target or /app/dashboard
    const from = (location.state as any)?.from?.pathname || '/app/dashboard';
    return <Navigate to={from} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
