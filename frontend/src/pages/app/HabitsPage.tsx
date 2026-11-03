import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Flame,
  Clock,
  Trash2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Tag,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { Goal, GoalCategory } from '../../types';

const CATEGORIES: { label: string; value: GoalCategory | 'all' }[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Learning', value: 'learning' },
  { label: 'Health & Fitness', value: 'health' },
  { label: 'Career & Work', value: 'career' },
  { label: 'Productivity', value: 'productivity' },
  { label: 'Mindfulness', value: 'mindfulness' },
];

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Recovery', value: 'recovery' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
];

export const HabitsPage: React.FC = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getGoals();
      setGoals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load habits.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!goalToDelete) return;
    try {
      setDeleting(true);
      await api.deleteGoal(goalToDelete.id);
      setGoals(prev => prev.filter(g => g.id !== goalToDelete.id));
      setGoalToDelete(null);
    } catch (err: any) {
      alert(`Failed to delete habit: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const filteredGoals = goals.filter(goal => {
    const matchesSearch =
      goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (goal.tagline && goal.tagline.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || goal.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || goal.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#26352D]">Your Habits</h1>
          <p className="text-sm text-[#5F6F65] mt-1">
            Your personalized habit plans, designed for gentle, sustainable consistency.
          </p>
        </div>
        <Link
          to="/app/habits/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#245C46] text-white text-sm font-semibold rounded-xl hover:bg-[#1b4736] transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E9ECE7] shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5F6F65] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search habits or keywords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-sm text-[#26352D] placeholder-[#5F6F65]/60 focus:outline-none focus:ring-2 focus:ring-[#245C46]/30 focus:border-[#245C46] transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 text-[#5F6F65] absolute left-3 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as any)}
              className="pl-8 pr-8 py-2 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-xs font-medium text-[#26352D] focus:outline-none focus:ring-2 focus:ring-[#245C46]/30 transition-all appearance-none cursor-pointer"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-xs font-medium text-[#26352D] focus:outline-none focus:ring-2 focus:ring-[#245C46]/30 transition-all appearance-none cursor-pointer"
          >
            {STATUS_FILTERS.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-[#E9ECE7] shadow-sm animate-pulse space-y-4">
              <div className="h-4 bg-[#F7F7F2] rounded w-1/3"></div>
              <div className="h-6 bg-[#F7F7F2] rounded w-3/4"></div>
              <div className="h-3 bg-[#F7F7F2] rounded w-full"></div>
              <div className="h-2 bg-[#F7F7F2] rounded w-full"></div>
              <div className="h-10 bg-[#F7F7F2] rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl p-8 border border-red-200 text-center max-w-lg mx-auto shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="font-semibold text-[#26352D] mb-1">Could not load habits</h3>
          <p className="text-sm text-[#5F6F65] mb-4">{error}</p>
          <button
            onClick={loadGoals}
            className="px-4 py-2 bg-[#245C46] text-white rounded-xl text-sm font-medium hover:bg-[#1b4736] transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#E9ECE7] text-center max-w-md mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#DCEBDD] flex items-center justify-center mx-auto mb-4 text-[#245C46]">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#26352D] mb-2">
            {goals.length === 0 ? 'No habits yet' : 'No habits match your filters'}
          </h3>
          <p className="text-sm text-[#5F6F65] mb-6">
            {goals.length === 0
              ? 'Create your first habit to build a steady routine with friendly coaching.'
              : 'Try clearing your search query or changing category and status filters.'}
          </p>
          {goals.length === 0 ? (
            <Link
              to="/app/habits/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#245C46] text-white text-sm font-semibold rounded-xl hover:bg-[#1b4736] transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Habit</span>
            </Link>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className="px-4 py-2 bg-[#F7F7F2] text-[#26352D] text-xs font-semibold rounded-xl hover:bg-[#E9ECE7] transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map(goal => {
            const progress = Math.min(100, Math.round((goal.currentDay / (goal.targetDays || 30)) * 100));
            const activePhase = goal.planOutline && goal.planOutline.length > 0
              ? goal.planOutline[Math.min(goal.planOutline.length - 1, Math.floor(((goal.currentDay - 1) / goal.targetDays) * goal.planOutline.length))]
              : null;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl border border-[#E9ECE7] shadow-sm hover:shadow-md hover:border-[#245C46]/30 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCEBDD] text-[#245C46] capitalize">
                      <Tag className="w-3 h-3" />
                      {goal.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          goal.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : goal.status === 'recovery'
                            ? 'bg-amber-50 text-amber-700'
                            : goal.status === 'paused'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {goal.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setGoalToDelete(goal);
                        }}
                        className="text-[#5F6F65]/40 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete habit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <h3
                      onClick={() => navigate(`/app/habits/${goal.id}`)}
                      className="text-lg font-bold text-[#26352D] group-hover:text-[#245C46] transition-colors cursor-pointer line-clamp-1"
                    >
                      {goal.title}
                    </h3>
                    {goal.tagline && (
                      <p className="text-xs text-[#5F6F65] mt-1 line-clamp-2 leading-relaxed">
                        {goal.tagline}
                      </p>
                    )}
                  </div>

                  {/* Adaptive Notice if any */}
                  {goal.adaptationNotice && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-xs text-amber-800">
                      <TrendingUp className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <span>{goal.adaptationNotice}</span>
                    </div>
                  )}

                  {/* Phased Roadmap Pill */}
                  {activePhase && (
                    <div className="bg-[#F7F7F2] p-2.5 rounded-xl border border-[#E9ECE7] text-xs">
                      <div className="flex items-center justify-between text-[#5F6F65] mb-0.5">
                        <span className="font-semibold text-[#26352D]">Phase {activePhase.phaseNumber}: {activePhase.title}</span>
                        <span className="text-[11px] font-mono">{activePhase.dayRange}</span>
                      </div>
                      <p className="text-[#5F6F65] text-[11px] line-clamp-1">{activePhase.focus}</p>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-[#5F6F65]">
                      <span>Progress (Day {goal.currentDay} of {goal.targetDays})</span>
                      <span className="font-semibold text-[#26352D]">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#E9ECE7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#245C46] rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Metrics & CTA */}
                <div className="bg-[#F7F7F2]/60 px-5 py-3 border-t border-[#E9ECE7] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-[#5F6F65]">
                    <span className="flex items-center gap-1 font-semibold text-[#26352D]">
                      <Flame className="w-3.5 h-3.5 text-[#E8B96B]" />
                      {goal.streak || 0}d streak
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#5F6F65]" />
                      {goal.dailyCommitmentMinutes}m/day
                    </span>
                  </div>

                  <Link
                    to={`/app/habits/${goal.id}`}
                    className="inline-flex items-center gap-1 font-semibold text-[#245C46] hover:text-[#1b4736] group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-[#E9ECE7] shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#26352D]">Delete Habit?</h3>
              <p className="text-xs text-[#5F6F65] mt-1 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-[#26352D]">"{goalToDelete.title}"</span>? This will remove its tasks and progress history.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={deleting}
                onClick={() => setGoalToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#5F6F65] hover:bg-[#F7F7F2] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Habit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
