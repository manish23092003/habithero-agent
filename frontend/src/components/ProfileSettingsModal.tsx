import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sliders, 
  LogOut, 
  Trash2, 
  CheckCircle2
} from 'lucide-react';
import { AuthUser } from '../services/api';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
  isBackendConnected: boolean;
  currentStreak: number;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  isBackendConnected,
  currentStreak
}) => {
  const [reminderTime, setReminderTime] = useState(() => {
    return localStorage.getItem('habithero_pref_reminder') || '20:00';
  });
  const [sensitivity, setSensitivity] = useState<'gentle' | 'balanced' | 'strict'>(() => {
    return (localStorage.getItem('habithero_pref_sensitivity') as any) || 'balanced';
  });
  const [confettiEnabled, setConfettiEnabled] = useState(() => {
    return localStorage.getItem('habithero_pref_confetti') !== 'false';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('habithero_pref_reminder', reminderTime);
    localStorage.setItem('habithero_pref_sensitivity', sensitivity);
    localStorage.setItem('habithero_pref_confetti', String(confettiEnabled));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleClearCache = () => {
    if (window.confirm('Clear local offline habits and chat history cache?')) {
      localStorage.removeItem('habithero_messages');
      localStorage.removeItem('habithero_goals');
      localStorage.removeItem('habithero_tasks');
      window.location.reload();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-elevation border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 border border-brand-200/60 flex items-center justify-center font-bold text-sm shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
            </div>
            <div>
              <h3 id="profile-modal-title" className="text-base font-bold text-stone-900">
                {currentUser ? currentUser.name : 'Guest User'}
              </h3>
              <p className="text-xs text-stone-500">
                {currentUser?.email || 'Local preview session'} • {currentStreak}-day streak
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

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Account & Storage Status */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-700">Sync Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                {isBackendConnected && currentUser ? 'Synced to Cloud' : 'Offline / Preview'}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {currentUser 
                ? 'Your habits, daily tasks, and reflections are securely saved to your account.'
                : 'Sign in to sync your habits across devices and get personalized coaching.'}
            </p>
          </div>

          {/* Coach & Habit Preferences Form */}
          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Coach & Habit Preferences
              </h4>
            </div>

            {/* Reminder Time */}
            <div className="space-y-1.5">
              <label htmlFor="reminder-time" className="block text-xs font-semibold text-stone-700">
                Daily Reflection Reminder Time
              </label>
              <input
                id="reminder-time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-stone-800"
              />
              <span className="text-[11px] text-stone-400">
                We'll remind you to check in and review your habits around this time.
              </span>
            </div>

            {/* Pacing & Flexibility Sensitivity */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                Pacing & Flexibility
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['gentle', 'balanced', 'strict'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSensitivity(level)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      sensitivity === level
                        ? 'border-brand-500 bg-brand-50/70 text-brand-800 shadow-xs'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-white'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-stone-400">
                {sensitivity === 'gentle' && 'Gentle: Automatically shortens tasks to 10-15 minutes whenever life gets busy.'}
                {sensitivity === 'balanced' && 'Balanced: Suggests lighter tasks when you report feeling overwhelmed.'}
                {sensitivity === 'strict' && 'Focused: Keeps your scheduled pace unless you specifically ask for an adjustment.'}
              </span>
            </div>

            {/* Confetti Animation Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/50">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-stone-800">Celebratory Confetti</span>
                <p className="text-[11px] text-stone-500">Celebrate with confetti when completing tasks and milestone reflections.</p>
              </div>
              <button
                type="button"
                onClick={() => setConfettiEnabled(!confettiEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  confettiEnabled ? 'bg-brand-600' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    confettiEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-1">
              {savedSuccess ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-brand-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-brand-600" />
                  Preferences Saved
                </span>
              ) : <div />}

              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </form>

          {/* Session & Cache Actions */}
          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClearCache}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-medium text-stone-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local Cache</span>
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
