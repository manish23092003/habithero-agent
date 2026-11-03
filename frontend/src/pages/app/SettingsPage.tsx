import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  LogOut,
  Sliders
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Preferences
  const [reminderTime, setReminderTime] = useState('20:00');
  const [confettiEnabled, setConfettiEnabled] = useState(true);
  const [autoRecovery, setAutoRecovery] = useState(true);
  const [weekendBuffer, setWeekendBuffer] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSavePreferences = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header bar */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#26352D]">Settings & Preferences</h1>
        <p className="text-sm text-[#5F6F65] mt-1">
          Configure your reminder time, habit pacing preferences, and account settings.
        </p>
      </div>

      {savedNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Preferences saved successfully.</span>
        </div>
      )}

      {/* Behavioral & Cadence Preferences */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECE7] shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-[#245C46]">
          <Sliders className="w-5 h-5" />
          <h2 className="text-base font-bold text-[#26352D]">Coach & Routine Options</h2>
        </div>

        <div className="space-y-4 divide-y divide-[#E9ECE7]">
          {/* Daily Reminder Time */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
            <div>
              <span className="text-xs font-bold text-[#26352D] block">Daily Reflection Time</span>
              <span className="text-[11px] text-[#5F6F65]">
                When you would like your coach to remind you to reflect on your day
              </span>
            </div>
            <input
              type="time"
              value={reminderTime}
              onChange={e => setReminderTime(e.target.value)}
              className="px-3 py-1.5 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-xs font-mono text-[#26352D] focus:outline-none focus:ring-2 focus:ring-[#245C46]/30"
            />
          </div>

          {/* Auto Recovery / Never Miss Twice */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <span className="text-xs font-bold text-[#26352D] block">Adaptive Plan Pacing</span>
              <span className="text-[11px] text-[#5F6F65]">
                Automatically shorten task durations if you fall behind to keep momentum
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRecovery}
                onChange={e => setAutoRecovery(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#E9ECE7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#245C46]" />
            </label>
          </div>

          {/* Confetti & Celebrations */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <span className="text-xs font-bold text-[#26352D] block">Milestone Celebrations</span>
              <span className="text-[11px] text-[#5F6F65]">
                Show celebratory animations when you hit milestones and complete habits
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={confettiEnabled}
                onChange={e => setConfettiEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#E9ECE7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#245C46]" />
            </label>
          </div>

          {/* Weekend Light Load */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <span className="text-xs font-bold text-[#26352D] block">Lighter Weekend Pace</span>
              <span className="text-[11px] text-[#5F6F65]">
                Keep weekend tasks shorter and more relaxed
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={weekendBuffer}
                onChange={e => setWeekendBuffer(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#E9ECE7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#245C46]" />
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSavePreferences}
            className="px-5 py-2 bg-[#245C46] text-white text-xs font-bold rounded-xl hover:bg-[#1b4736] transition-colors shadow-sm"
          >
            Save Preferences
          </button>
        </div>
      </div>

      {/* Account Session Actions */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-200/80 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-red-700">Account Session</h2>
          <p className="text-xs text-[#5F6F65] mt-1">
            Sign out of your account on this device. Your progress is saved and protected.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of HabitHero</span>
        </button>
      </div>
    </div>
  );
};
