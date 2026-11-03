import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Lock,
  Edit2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await updateProfile(name.trim());
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header bar */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#26352D]">Your Profile</h1>
        <p className="text-sm text-[#5F6F65] mt-1">
          Manage your name, email, and privacy settings.
        </p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Profile name updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-800 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECE7] shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center font-bold text-2xl">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#26352D]">{user?.name || 'HabitHero Member'}</h2>
            <p className="text-xs text-[#5F6F65]">{user?.email}</p>
            <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCEBDD] text-[#245C46]">
              <ShieldCheck className="w-3 h-3" />
              <span>Private & Protected Account</span>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <div className="pt-4 border-t border-[#E9ECE7]">
          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-[#26352D] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#5F6F65] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-xs text-[#26352D] focus:outline-none focus:ring-2 focus:ring-[#245C46]/30"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 text-xs text-[#5F6F65] hover:bg-[#F7F7F2] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[#245C46] text-white text-xs font-bold rounded-xl hover:bg-[#1b4736] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-[#E9ECE7]/60">
                <div className="text-xs">
                  <span className="text-[#5F6F65] block">Display Name</span>
                  <span className="font-bold text-[#26352D]">{user?.name}</span>
                </div>
                <button
                  onClick={() => {
                    setName(user?.name || '');
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-xs font-semibold text-[#26352D] hover:bg-[#E9ECE7] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Name</span>
                </button>
              </div>

              <div className="py-2 border-b border-[#E9ECE7]/60">
                <span className="text-xs text-[#5F6F65] block">Email Address</span>
                <span className="text-xs font-mono font-medium text-[#26352D]">{user?.email}</span>
              </div>

              <div className="py-2 border-b border-[#E9ECE7]/60">
                <span className="text-xs text-[#5F6F65] block">Account ID</span>
                <span className="text-xs font-mono text-[#5F6F65]">{user?.id || 'usr_65f8a092b8d91c'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tenancy & Data Isolation Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECE7] shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[#245C46]">
          <Lock className="w-5 h-5" />
          <h3 className="text-base font-bold text-[#26352D]">Privacy & Data Protection</h3>
        </div>
        <p className="text-xs text-[#5F6F65] leading-relaxed">
          Your habits, reflections, and coach conversations are strictly private to you. Everything is encrypted in transit and securely partitioned to your personal account so your data is never shared or exposed.
        </p>
      </div>
    </div>
  );
};
