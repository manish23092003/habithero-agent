import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Smile, 
  Clock, 
  Zap, 
  Check, 
  Frown
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
    completedTasksCount === totalTasksCount && totalTasksCount > 0 ? 'great' : 'partial'
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
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-elevation border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 border border-brand-200/60 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 id="checkin-modal-title" className="text-base font-bold text-stone-900">
                Daily Reflection
              </h3>
              <p className="text-xs text-stone-500">
                Reflect on today and set a comfortable pace for tomorrow
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-700">
              How did today feel?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('great')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  status === 'great'
                    ? 'border-brand-500 bg-brand-50/70 text-brand-900 shadow-xs'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-white'
                }`}
              >
                <Smile className="w-5 h-5 mx-auto mb-1 text-brand-600" />
                <span className="text-xs font-bold block">Great</span>
                <span className="text-[10px] text-stone-400">On Track</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('partial')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  status === 'partial'
                    ? 'border-amber-400 bg-amber-50/70 text-amber-900 shadow-xs'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-white'
                }`}
              >
                <Clock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <span className="text-xs font-bold block">Busy / Partial</span>
                <span className="text-[10px] text-stone-400">Felt Rushed</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('missed')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  status === 'missed'
                    ? 'border-red-400 bg-red-50/70 text-red-900 shadow-xs'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-white'
                }`}
              >
                <Frown className="w-5 h-5 mx-auto mb-1 text-red-500" />
                <span className="text-xs font-bold block">Missed</span>
                <span className="text-[10px] text-stone-400">Need Reset</span>
              </button>
            </div>
          </div>

          {/* Friction / Missed Reason */}
          {status !== 'great' && (
            <div className="space-y-2 animate-fade-in">
              <label className="text-xs font-semibold text-stone-700">
                What made things harder today?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'busy', label: 'Busy with work or school' },
                  { id: 'tired', label: 'Low energy or tired' },
                  { id: 'difficult', label: 'Felt too demanding' },
                  { id: 'distracted', label: 'Unexpected distractions' }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setMissedReason(r.id as any)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      missedReason === r.id
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 text-stone-700 bg-white hover:border-stone-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reflection Note */}
          <div className="space-y-1.5">
            <label htmlFor="checkin-reflection" className="block text-xs font-semibold text-stone-700">
              A quick reflection (optional)
            </label>
            <textarea
              id="checkin-reflection"
              rows={2}
              placeholder="What worked well, or what will you try differently tomorrow?"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-stone-900 placeholder:text-stone-400"
            />
          </div>

          {/* Adaptive Habit Recalibration Toggle */}
          {status !== 'great' && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold block text-xs">Adjust tomorrow's tasks</span>
                  <span className="text-[11px] text-amber-800">Switch to 15-minute sessions so you keep your momentum</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={shouldAdapt}
                onChange={(e) => setShouldAdapt(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-subtle hover:shadow-card transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{status !== 'great' && shouldAdapt ? 'Save Reflection & Adjust Plan' : 'Save Daily Reflection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
