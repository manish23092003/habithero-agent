import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Flame,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Tag,
  AlertCircle,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { Goal, DailyTask } from '../../types';

export const HabitDetailPage: React.FC = () => {
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit goal state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editCommitment, setEditCommitment] = useState(15);
  const [savingGoal, setSavingGoal] = useState(false);

  // New task modal/state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(15);
  const [newTaskDifficulty, setNewTaskDifficulty] = useState<'easy' | 'moderate' | 'challenging'>('easy');
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskSubmissionKey, setTaskSubmissionKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`
  );

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (habitId) {
      loadHabitData();
    }
  }, [habitId]);

  const loadHabitData = async () => {
    if (!habitId) return;
    try {
      setLoading(true);
      setError(null);
      const [goalData, allTasks] = await Promise.all([
        api.getGoalById(habitId),
        api.getAllTasks(),
      ]);
      setGoal(goalData);
      setTasks(allTasks.filter(t => t.goalId === habitId));
      setEditTitle(goalData.title);
      setEditTagline(goalData.tagline || '');
      setEditCommitment(goalData.dailyCommitmentMinutes);
    } catch (err: any) {
      setError(err.message || 'Failed to load habit details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || !habitId) return;
    try {
      setSavingGoal(true);
      const updated = await api.updateGoal(habitId, {
        title: editTitle,
        tagline: editTagline,
        dailyCommitmentMinutes: editCommitment,
      });
      setGoal(updated);
      setIsEditing(false);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSavingGoal(false);
    }
  };

  const handleToggleTask = async (task: DailyTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    // Optimistic
    setTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    try {
      await api.completeTask(task.id, newStatus === 'completed');
      if (goal && newStatus === 'completed') {
        setGoal({ ...goal, streak: (goal.streak || 0) + 1 });
      }
    } catch (err: any) {
      // Revert on error
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      alert(`Could not toggle task: ${err.message}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || !habitId || !newTaskTitle.trim()) return;
    try {
      setCreatingTask(true);
      const newTask = await api.createTask({
        goalId: habitId,
        title: newTaskTitle.trim(),
        durationMinutes: newTaskDuration,
        difficulty: newTaskDifficulty,
        category: goal.category,
        dayNumber: goal.currentDay,
        idempotencyKey: taskSubmissionKey,
      });
      setTasks(prev => [newTask, ...prev]);
      setNewTaskTitle('');
      setIsAddingTask(false);
      setTaskSubmissionKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`);
    } catch (err: any) {
      alert(`Could not create task: ${err.message}`);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!habitId) return;
    try {
      setDeleting(true);
      await api.deleteGoal(habitId);
      navigate('/app/habits');
    } catch (err: any) {
      alert(`Failed to delete habit: ${err.message}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 bg-[#E9ECE7] rounded w-24"></div>
        <div className="h-32 bg-white rounded-3xl border border-[#E9ECE7]"></div>
        <div className="h-64 bg-white rounded-3xl border border-[#E9ECE7]"></div>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-red-200 text-center max-w-lg mx-auto shadow-sm my-12">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="font-bold text-[#26352D] text-lg mb-1">Habit Not Found</h3>
        <p className="text-xs text-[#5F6F65] mb-4">{error || 'This habit does not exist or has been removed.'}</p>
        <Link
          to="/app/habits"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#245C46] text-white rounded-xl text-xs font-semibold hover:bg-[#1b4736] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Habits</span>
        </Link>
      </div>
    );
  }

  const progress = Math.min(100, Math.round((goal.currentDay / (goal.targetDays || 30)) * 100));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top back navigation & action buttons */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/habits"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F6F65] hover:text-[#26352D] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Habits</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E9ECE7] rounded-xl text-xs font-semibold text-[#26352D] hover:bg-[#F7F7F2] transition-colors shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#5F6F65]" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Habit'}</span>
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Habit Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECE7] shadow-sm space-y-6">
        {isEditing ? (
          <form onSubmit={handleUpdateGoal} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#26352D] mb-1">Habit Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-sm text-[#26352D] focus:outline-none focus:ring-2 focus:ring-[#245C46]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#26352D] mb-1">Tagline</label>
              <input
                type="text"
                value={editTagline}
                onChange={e => setEditTagline(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-sm text-[#26352D] focus:outline-none focus:ring-2 focus:ring-[#245C46]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#26352D] mb-1">Daily Commitment (Minutes)</label>
              <input
                type="number"
                min={1}
                max={180}
                value={editCommitment}
                onChange={e => setEditCommitment(Number(e.target.value))}
                className="w-36 px-3.5 py-2 bg-[#F7F7F2] border border-[#E9ECE7] rounded-xl text-sm text-[#26352D] focus:outline-none focus:ring-2 focus:ring-[#245C46]/30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-[#5F6F65]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingGoal}
                className="px-5 py-2 bg-[#245C46] text-white rounded-xl text-xs font-bold hover:bg-[#1b4736] transition-colors shadow-sm disabled:opacity-50"
              >
                {savingGoal ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#DCEBDD] text-[#245C46] capitalize">
                    <Tag className="w-3 h-3" />
                    {goal.category}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                      goal.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : goal.status === 'recovery'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {goal.status}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#26352D] tracking-tight">
                  {goal.title}
                </h1>
                {goal.tagline && (
                  <p className="text-sm text-[#5F6F65] mt-1 font-medium">{goal.tagline}</p>
                )}
              </div>

              {/* Quick stats pills */}
              <div className="flex items-center gap-3">
                <div className="px-4 py-2.5 bg-[#F7F7F2] border border-[#E9ECE7] rounded-2xl text-center">
                  <div className="flex items-center gap-1 text-[#E8B96B] justify-center">
                    <Flame className="w-4 h-4 fill-current" />
                    <span className="font-mono font-bold text-base text-[#26352D]">{goal.streak || 0}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#5F6F65] tracking-wider">Daily Streak</span>
                </div>

                <div className="px-4 py-2.5 bg-[#F7F7F2] border border-[#E9ECE7] rounded-2xl text-center">
                  <div className="flex items-center gap-1 text-[#245C46] justify-center">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono font-bold text-base text-[#26352D]">{goal.dailyCommitmentMinutes}m</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#5F6F65] tracking-wider">Per Day</span>
                </div>
              </div>
            </div>

            {/* Adaptation Alert */}
            {goal.adaptationNotice && (
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                <TrendingUp className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Adjustment Note: </span>
                  <span>{goal.adaptationNotice}</span>
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-[#5F6F65]">
                <span>Overall Progress: Day {goal.currentDay} of {goal.targetDays}</span>
                <span className="text-[#26352D] font-mono">{progress}% Complete</span>
              </div>
              <div className="h-2.5 w-full bg-[#E9ECE7] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#245C46] rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Phased Roadmap Timeline */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECE7] shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[#245C46]">
          <Layers className="w-5 h-5" />
          <h2 className="text-base font-bold text-[#26352D]">Habit Roadmap Steps</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {goal.planOutline && goal.planOutline.length > 0 ? (
            goal.planOutline.map(phase => (
              <div
                key={phase.phaseNumber}
                className="p-4 rounded-2xl border border-[#E9ECE7] bg-[#F7F7F2]/50 hover:bg-white hover:border-[#245C46]/30 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#26352D]">Phase {phase.phaseNumber}: {phase.title}</span>
                  <span className="font-mono text-[11px] text-[#5F6F65] bg-white px-2 py-0.5 rounded border border-[#E9ECE7]">
                    {phase.dayRange}
                  </span>
                </div>
                <p className="text-xs text-[#5F6F65] leading-relaxed">{phase.focus}</p>
                <div className="text-[11px] text-[#245C46] font-medium pt-1">
                  {phase.tasksPlanned} planned tasks
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 bg-[#F7F7F2] rounded-2xl text-xs text-[#5F6F65] col-span-2 text-center">
              No step outline found for this habit.
            </div>
          )}
        </div>
      </div>

      {/* Associated Tasks Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E9ECE7] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#26352D]">Daily Tasks</h2>
            <p className="text-xs text-[#5F6F65] mt-0.5">
              Tasks planned for this habit.
            </p>
          </div>
          <button
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#245C46] text-white rounded-xl text-xs font-bold hover:bg-[#1b4736] transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Add Task Form */}
        {isAddingTask && (
          <form onSubmit={handleCreateTask} className="p-4 bg-[#F7F7F2] rounded-2xl border border-[#E9ECE7] space-y-3 animate-fade-in">
            <h4 className="text-xs font-bold text-[#26352D]">Create New Task</h4>
            <div>
              <input
                type="text"
                placeholder="What task would you like to add? (e.g. Read 1 chapter)"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-white border border-[#E9ECE7] rounded-xl text-xs text-[#26352D] focus:outline-none focus:ring-2 focus:ring-[#245C46]/30"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#5F6F65]">Duration:</span>
                <select
                  value={newTaskDuration}
                  onChange={e => setNewTaskDuration(Number(e.target.value))}
                  className="px-2.5 py-1 bg-white border border-[#E9ECE7] rounded-lg text-xs"
                >
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={25}>25 min</option>
                  <option value={45}>45 min</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#5F6F65]">Difficulty:</span>
                <select
                  value={newTaskDifficulty}
                  onChange={e => setNewTaskDifficulty(e.target.value as any)}
                  className="px-2.5 py-1 bg-white border border-[#E9ECE7] rounded-lg text-xs"
                >
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="challenging">Challenging</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-3 py-1.5 text-xs text-[#5F6F65]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingTask}
                className="px-4 py-1.5 bg-[#245C46] text-white rounded-lg text-xs font-bold hover:bg-[#1b4736] transition-colors disabled:opacity-50"
              >
                {creatingTask ? 'Adding...' : 'Save Task'}
              </button>
            </div>
          </form>
        )}

        {/* Task list */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#5F6F65] bg-[#F7F7F2]/50 rounded-2xl border border-dashed border-[#E9ECE7]">
            No tasks created for this habit yet. Click "Add Task" to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => {
              const isDone = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isDone
                      ? 'bg-[#F7F7F2]/60 border-[#E9ECE7] opacity-80'
                      : 'bg-white border-[#E9ECE7] hover:border-[#245C46]/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      aria-label="Toggle completed"
                      className="shrink-0 text-[#245C46] hover:scale-110 transition-transform"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 fill-[#245C46] text-white" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#5F6F65]/40" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${
                        isDone ? 'line-through text-[#5F6F65]' : 'text-[#26352D]'
                      }`}>
                        {task.title}
                      </p>
                      {task.adaptationNote && (
                        <p className="text-[11px] text-amber-700 italic mt-0.5">
                          {task.adaptationNote}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs text-[#5F6F65]">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {task.durationMinutes}m
                    </span>
                    <span className="hidden sm:inline-block capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-[#F7F7F2] border border-[#E9ECE7]">
                      {task.difficulty}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-[#E9ECE7] shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#26352D]">Delete Habit?</h3>
              <p className="text-xs text-[#5F6F65] mt-1 leading-relaxed">
                Permanently delete <span className="font-semibold text-[#26352D]">"{goal.title}"</span>? All progress and linked task data will be erased.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#5F6F65] hover:bg-[#F7F7F2] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDeleteGoal}
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
