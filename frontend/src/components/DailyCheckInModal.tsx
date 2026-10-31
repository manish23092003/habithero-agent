import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Smile, 
  AlertCircle, 
  Clock, 
  Zap, 
  Check, 
  Brain
} from 'lucide-react';
import { CheckInRecord } from '../types';

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCheckIn: (record: Partial<CheckInRecord>, shouldAdaptTomorrow: boolean) => void;
  completedTasksCount: number;
  totalTasksCount: number;
}

export const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  isOpen,
  onClose,
  onSubmitCheckIn,
  completedTasksCount,
  totalTasksCount
}) => {
  const [status, setStatus] = useState<'great' | 'partial' | 'missed'>(
    completedTasksCount === totalTasksCount ? 'great' : 'partial'
  );
  const [missedReason, setMissedReason] = useState<'busy' | 'difficult' | 'tired' | 'distracted' | 'other'>('busy');
  const [reflection, setReflection] = useState('');
  const [shouldAdapt, setShouldAdapt] = useState(true);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitCheckIn(
      {
        status,
        missedReason: status !== 'great' ? missedReason : undefined,
        reflection: reflection.trim() || undefined,
        completedTaskCount: completedTasksCount,
        totalTaskCount: totalTasksCount
      },
      status !== 'great' && shouldAdapt
    );
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-elevation border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 border border-brand-200/60 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 id="checkin-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                Daily Accountability Check-In
              </h3>
              <p className="text-xs text-slate-500">
                Calibrates tomorrow's schedule and preserves your streak
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Daily Progress Assessment
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('great')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  status === 'great'
                    ? 'border-brand-500 bg-brand-50/80 text-brand-900 font-semibold ring-1 ring-brand-500 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Smile className="w-5 h-5 mx-auto mb-1 text-brand-600" />
                <span className="text-xs block font-semibold">Completed</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('partial')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  status === 'partial'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-900 font-semibold ring-1 ring-amber-500 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Clock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <span className="text-xs block font-semibold">Partial</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('missed')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  status === 'missed'
                    ? 'border-rose-500 bg-rose-50/80 text-rose-900 font-semibold ring-1 ring-rose-500 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-600" />
                <span className="text-xs block font-semibold">Missed</span>
              </button>
            </div>
          </div>

          {/* Missed / Difficult Reason dropdown */}
          {status !== 'great' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-amber-600" />
                  Primary Friction Encountered
                </label>
                <p className="text-[11px] text-amber-800">
                  HabitHero analyzes friction to calibrate tomorrow's micro-duration.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'busy', label: 'Time Crunch / Urgent Work' },
                  { id: 'difficult', label: 'Friction / Complexity' },
                  { id: 'tired', label: 'Fatigue / Low Energy' },
                  { id: 'distracted', label: 'Context Switching' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMissedReason(item.id as any)}
                    className={`p-2 rounded-lg border text-left text-[11px] font-medium transition-all ${
                      missedReason === item.id
                        ? 'border-amber-500 bg-white text-amber-950 shadow-xs'
                        : 'border-amber-200/60 bg-amber-50/40 hover:bg-white text-amber-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Adaptive Recommendation Toggle */}
              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-amber-950 flex items-center gap-1 text-[11px]">
                    <Zap className="w-3 h-3 text-amber-600" />
                    Adaptive Rescue Calibration
                  </span>
                  <p className="text-[10px] text-amber-700">
                    Adjust tomorrow's task to a 15-minute micro-sprint.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="should-adapt-toggle"
                  checked={shouldAdapt}
                  onChange={e => setShouldAdapt(e.target.checked)}
                  className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                />
              </div>
            </div>
          )}

          {/* Optional Reflection */}
          <div className="space-y-1.5">
            <label htmlFor="reflection-input" className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Brief Reflection <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="reflection-input"
              rows={2}
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="What went well or what did you learn from today's session?"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-subtle hover:shadow-card transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Record Check-In</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
