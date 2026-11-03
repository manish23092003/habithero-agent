import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Flame,
  Activity,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { CheckInRecord, DailyTask } from '../../types';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [checkInsData, tasksData] = await Promise.all([
        api.getCheckIns(),
        api.getAllTasks(),
      ]);
      setCheckIns(checkInsData);
      setTasks(tasksData);
    } catch (err: any) {
      setError(err.message || 'Failed to load habit calendar data.');
    } finally {
      setLoading(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create grid cells
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format ISO date string for day
  const getDayIso = (day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Get checkin for a day
  const getDayCheckIn = (dateStr: string) => {
    return checkIns.find(c => c.date === dateStr);
  };

  // Get tasks for a day
  const getDayTasks = (dateStr: string) => {
    return tasks.filter(t => t.scheduledFor === dateStr || (t.scheduledFor === 'Today' && dateStr === new Date().toISOString().split('T')[0]));
  };

  const selectedDayCheckIn = getDayCheckIn(selectedDate);
  const selectedDayTasks = getDayTasks(selectedDate);

  // Stats calculation
  const totalCheckIns = checkIns.length;
  const greatCheckIns = checkIns.filter(c => c.status === 'great').length;
  const rate = totalCheckIns > 0 ? Math.round((greatCheckIns / totalCheckIns) * 100) : 100;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-[#E9ECE7] rounded w-48"></div>
        <div className="h-24 bg-white rounded-2xl border border-[#E9ECE7]"></div>
        <div className="h-96 bg-white rounded-3xl border border-[#E9ECE7]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-red-200 text-center max-w-lg mx-auto shadow-sm my-12">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="font-bold text-[#26352D] text-lg mb-1">Calendar Error</h3>
        <p className="text-xs text-[#5F6F65] mb-4">{error}</p>
        <button
          onClick={loadCalendarData}
          className="px-4 py-2 bg-[#245C46] text-white rounded-xl text-xs font-semibold hover:bg-[#1b4736]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#26352D]">Habit Calendar</h1>
          <p className="text-sm text-[#5F6F65] mt-1">
            See your daily consistency and past reflections at a glance.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-[#E9ECE7] shadow-sm">
          <button
            onClick={prevMonth}
            aria-label="Previous month"
            className="p-1.5 rounded-xl hover:bg-[#F7F7F2] text-[#5F6F65] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-[#26352D] px-2 min-w-[130px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            aria-label="Next month"
            className="p-1.5 rounded-xl hover:bg-[#F7F7F2] text-[#5F6F65] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E9ECE7] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#5F6F65] font-medium">Daily Reflections</div>
            <div className="text-lg font-bold text-[#26352D] font-mono">{totalCheckIns} Days</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E9ECE7] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#5F6F65] font-medium">Consistency Rate</div>
            <div className="text-lg font-bold text-[#26352D] font-mono">{rate}%</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E9ECE7] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-[#E8B96B]" />
          </div>
          <div>
            <div className="text-xs text-[#5F6F65] font-medium">Guiding Principle</div>
            <div className="text-xs font-bold text-[#245C46]">Never Miss Twice Active</div>
          </div>
        </div>
      </div>

      {/* Main Grid + Selected Day Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E9ECE7] shadow-sm space-y-4">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-[#5F6F65] pb-2 border-b border-[#E9ECE7]">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Grid of days */}
          <div className="grid grid-cols-7 gap-2">
            {blanks.map(blank => (
              <div key={`blank-${blank}`} className="aspect-square rounded-2xl bg-[#F7F7F2]/40" />
            ))}

            {days.map(day => {
              const dateStr = getDayIso(day);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isSelected = dateStr === selectedDate;
              const checkIn = getDayCheckIn(dateStr);
              const dayTasks = getDayTasks(dateStr);
              const hasTasks = dayTasks.length > 0;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square rounded-2xl p-2 flex flex-col justify-between items-center transition-all border text-left relative group ${
                    isSelected
                      ? 'border-[#245C46] ring-2 ring-[#245C46]/20 bg-[#DCEBDD]/20 shadow-xs'
                      : isToday
                      ? 'border-[#245C46]/50 bg-white font-bold'
                      : 'border-[#E9ECE7] bg-white hover:border-[#245C46]/40 hover:bg-[#F7F7F2]'
                  }`}
                >
                  <span
                    className={`text-xs font-mono ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-[#245C46] text-white flex items-center justify-center font-bold'
                        : isSelected
                        ? 'text-[#245C46] font-bold'
                        : 'text-[#26352D]'
                    }`}
                  >
                    {day}
                  </span>

                  {/* Indicator Dots */}
                  <div className="flex items-center gap-1">
                    {checkIn ? (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          checkIn.status === 'great'
                            ? 'bg-emerald-600'
                            : checkIn.status === 'partial'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        title={`Reflection: ${checkIn.status}`}
                      />
                    ) : null}

                    {hasTasks && !checkIn && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5F6F65]/40" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-[#E9ECE7] flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#5F6F65]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Adjusted / Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Missed</span>
            </div>
          </div>
        </div>

        {/* Selected Day Inspector Panel */}
        <div className="bg-white rounded-3xl p-6 border border-[#E9ECE7] shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#245C46]">Day Details</span>
              <h3 className="text-lg font-bold text-[#26352D] mt-0.5">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
            </div>

            {/* Check-In Status on Selected Day */}
            <div className="p-4 rounded-2xl bg-[#F7F7F2] border border-[#E9ECE7] space-y-2">
              <span className="text-[11px] font-bold uppercase text-[#5F6F65] tracking-wider block">
                Daily Reflection
              </span>
              {selectedDayCheckIn ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        selectedDayCheckIn.status === 'great'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedDayCheckIn.status === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedDayCheckIn.status}
                    </span>
                    <span className="text-xs font-mono text-[#5F6F65]">
                      {selectedDayCheckIn.completedTaskCount} of {selectedDayCheckIn.totalTaskCount} tasks
                    </span>
                  </div>
                  {selectedDayCheckIn.reflection && (
                    <p className="text-xs text-[#26352D] italic bg-white p-2.5 rounded-xl border border-[#E9ECE7]">
                      "{selectedDayCheckIn.reflection}"
                    </p>
                  )}
                  {selectedDayCheckIn.agentAdaptation && (
                    <div className="text-[11px] text-[#245C46] font-medium flex items-start gap-1.5 pt-1">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{selectedDayCheckIn.agentAdaptation}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#5F6F65]">
                  No reflection recorded for this day.
                </p>
              )}
            </div>

            {/* Tasks scheduled / completed on this day */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-[#5F6F65] tracking-wider block">
                Tasks for this day ({selectedDayTasks.length})
              </span>
              {selectedDayTasks.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#5F6F65] bg-[#F7F7F2]/50 rounded-2xl border border-dashed border-[#E9ECE7]">
                  No tasks scheduled for this day.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedDayTasks.map(t => (
                    <div
                      key={t.id}
                      className="p-3 bg-[#F7F7F2] rounded-xl border border-[#E9ECE7] text-xs flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className={`font-semibold block truncate ${
                          t.status === 'completed' ? 'line-through text-[#5F6F65]' : 'text-[#26352D]'
                        }`}>
                          {t.title}
                        </span>
                        <span className="text-[10px] text-[#5F6F65]">{t.goalTitle}</span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-[#245C46] shrink-0">
                        {t.durationMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-[#DCEBDD]/40 rounded-2xl border border-[#245C46]/20 text-[11px] text-[#245C46] flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              HabitHero gently checks in with you every evening at 8:00 PM to help adjust tomorrow's tasks.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
