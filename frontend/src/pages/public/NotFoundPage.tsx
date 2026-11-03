import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center font-extrabold text-2xl shadow-subtle">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#26352D]">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
            The page you are looking for does not exist or may have moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/app/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Go to Dashboard</span>
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#FFFFFF] hover:bg-[#F7F7F2] text-[#26352D] border border-[#E9ECE7] transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
