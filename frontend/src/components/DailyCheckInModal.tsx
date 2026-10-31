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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Daily Accountability Check-In
              </h3>
              <p className="text-xs text-slate-500">
                HabitHero uses this to adapt your upcoming schedule
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              How did today feel?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('great')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  status === 'great'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Smile className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                <span className="text-xs block">Crushed It</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('partial')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  status === 'partial'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-1 ring-amber-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Clock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <span className="text-xs block">Partial Progress</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('missed')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  status === 'missed'
                    ? 'border-orange-500 bg-orange-50 text-orange-900 font-bold ring-1 ring-orange-500'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <AlertCircle className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                <span className="text-xs block">Missed / Off Track</span>
              </button>
            </div>
          </div>

          {/* Missed / Difficult Reason dropdown */}
          {status !== 'great' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-amber-600" />
                  What was the primary friction?
                </label>
                <p className="text-[11px] text-amber-800">
                  Your honesty helps HabitHero prevent this pattern tomorrow.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'busy', label: 'Busy / Overwhelmed' },
                  { id: 'difficult', label: 'Felt too difficult' },
                  { id: 'tired', label: 'Low energy / Exhausted' },
                  { id: 'distracted', label: 'Lost focus / Procrastinated' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMissedReason(item.id as any)}
                    className={`p-2 rounded-lg border text-left font-medium transition-all ${
                      missedReason === item.id
                        ? 'border-amber-500 bg-white text-amber-950 shadow-xs'
                        : 'border-amber-200/60 bg-amber-50/50 hover:bg-white text-amber-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Adaptive Recommendation Toggle */}
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-950 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-600" />
                    Adaptive Rescue Adjustment
                  </span>
                  <p className="text-[11px] text-amber-800">
                    Reduce tomorrow's task to 15 min to protect your streak.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={shouldAdapt}
                  onChange={e => setShouldAdapt(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Optional Reflection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Quick Reflection / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="Any key insight or takeaway from today's session..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Submit Check-In</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
