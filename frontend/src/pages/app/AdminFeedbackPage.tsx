import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  XCircle,
  Bug,
  TrendingUp,
  MessageSquare,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Send,
  Loader2,
  RotateCcw,
  Check,
  X,
  Flag,
  ArrowRight,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  AdminFeedbackItem,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackModerationStatus,
  FeedbackPagination,
} from '../../types/feedback';

const CATEGORY_CONFIG: Record<
  FeedbackCategory,
  { label: string; icon: React.FC<{ className?: string }>; bg: string; text: string; border: string }
> = {
  feature_request: {
    label: 'Feature Request',
    icon: Zap,
    bg: 'bg-emerald-50',
    text: 'text-[#245C46]',
    border: 'border-emerald-200',
  },
  bug_report: {
    label: 'Bug Report',
    icon: Bug,
    bg: 'bg-red-50',
    text: 'text-[#C85D55]',
    border: 'border-red-200',
  },
  improvement: {
    label: 'Improvement',
    icon: TrendingUp,
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
  },
  general: {
    label: 'General Feedback',
    icon: MessageSquare,
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-300',
  },
};

const MODERATION_CONFIG: Record<
  FeedbackModerationStatus,
  { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }
> = {
  pending: {
    label: 'Pending Review',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    bg: 'bg-[#DCEBDD]',
    text: 'text-[#183c2e]',
    border: 'border-[#bedbc1]',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-red-50',
    text: 'text-[#C85D55]',
    border: 'border-red-200',
    icon: XCircle,
  },
  spam: {
    label: 'Spam',
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    border: 'border-stone-300',
    icon: Flag,
  },
};

const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  under_review: {
    label: 'Under Review',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  planned: {
    label: 'Planned',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-[#DCEBDD]',
    text: 'text-[#183c2e]',
    border: 'border-[#bedbc1]',
  },
  declined: {
    label: 'Declined',
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    border: 'border-stone-200',
  },
};

export const AdminFeedbackPage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Data & Pagination State
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [pagination, setPagination] = useState<FeedbackPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Loading & Authorization State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAccessDenied, setIsAccessDenied] = useState<boolean>(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters State
  const [moderationFilter, setModerationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Action / Feedback Toast State
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Destructive Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    item: AdminFeedbackItem | null;
    action: 'reject' | 'spam';
  }>({
    isOpen: false,
    item: null,
    action: 'reject',
  });

  // Fetch admin feedback list from API
  const fetchAdminFeedback = useCallback(
    async (page: number, modStatus: string, pubStatus: string, cat: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await api.getAdminFeedback({
          page,
          limit: 20,
          moderationStatus: modStatus,
          status: pubStatus,
          category: cat,
        });

        if (response && response.success) {
          setItems(response.data || []);
          setPagination(
            response.pagination || {
              page,
              limit: 20,
              total: response.data?.length || 0,
              totalPages: 1,
            }
          );
          setIsAccessDenied(false);
        } else {
          throw new Error('Failed to retrieve moderation inbox.');
        }
      } catch (err: any) {
        console.error('[AdminFeedbackPage] fetch error:', err);
        if (err.status === 403 || err.code === 'ADMIN_ACCESS_REQUIRED') {
          setIsAccessDenied(true);
          setAccessDeniedMessage(
            err.message ||
              'Access denied: Administrator privileges required. Only verified Google-authenticated accounts on the ADMIN_EMAILS allowlist have access.'
          );
        } else if (err.status === 401) {
          // Token expired or missing, redirect to login
          navigate('/login', { state: { from: { pathname: '/app/admin/feedback' } } });
        } else {
          setErrorMessage(err.message || 'An error occurred while loading feedback. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    fetchAdminFeedback(currentPage, moderationFilter, statusFilter, categoryFilter);
  }, [currentPage, moderationFilter, statusFilter, categoryFilter, fetchAdminFeedback]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Moderation Status Update (e.g. Approve, Reject, Spam)
  const handleUpdateModeration = async (
    item: AdminFeedbackItem,
    newStatus: FeedbackModerationStatus
  ) => {
    setActionInProgressId(item._id);
    try {
      const res = await api.updateFeedbackModeration(item._id, newStatus);
      if (res && res.success) {
        // Update item in local state immediately
        setItems((prev) =>
          prev.map((i) => (i._id === item._id ? { ...i, moderationStatus: newStatus } : i))
        );
        setToastMessage({
          type: 'success',
          text: `Submission "${item.title.slice(0, 30)}..." marked as ${newStatus}.`,
        });
      }
    } catch (err: any) {
      console.error('[handleUpdateModeration] Error:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to update moderation status.',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle Public Status Update (e.g. Under Review -> In Progress)
  const handleUpdateStatus = async (item: AdminFeedbackItem, newStatus: FeedbackStatus) => {
    if (item.moderationStatus !== 'approved') {
      setToastMessage({
        type: 'error',
        text: 'Cannot update status: submission must be approved before public progress can be assigned.',
      });
      return;
    }

    setActionInProgressId(item._id);
    try {
      const res = await api.updateFeedbackStatus(item._id, newStatus);
      if (res && res.success) {
        setItems((prev) =>
          prev.map((i) => (i._id === item._id ? { ...i, status: newStatus } : i))
        );
        setToastMessage({
          type: 'success',
          text: `Public status updated to "${STATUS_CONFIG[newStatus].label}".`,
        });
      }
    } catch (err: any) {
      console.error('[handleUpdateStatus] Error:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to update public status.',
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle Adding Official Team Reply
  const handleAddReply = async (itemId: string, content: string): Promise<boolean> => {
    setActionInProgressId(itemId);
    try {
      const res = await api.addOfficialReply(itemId, content);
      if (res && res.success) {
        // Update local item with returned updated data
        setItems((prev) =>
          prev.map((i) => (i._id === itemId ? { ...i, officialReplies: res.data.officialReplies } : i))
        );
        setToastMessage({
          type: 'success',
          text: 'Official team reply published successfully.',
        });
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[handleAddReply] Error:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to publish official reply.',
      });
      return false;
    } finally {
      setActionInProgressId(null);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setModerationFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Filter items in local view by search query
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchDesc = item.description.toLowerCase().includes(q);
    const matchAuthor = item.displayName.toLowerCase().includes(q);
    const matchEmail = (item.email || '').toLowerCase().includes(q);
    return matchTitle || matchDesc || matchAuthor || matchEmail;
  });

  const hasActiveFilters =
    moderationFilter !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    searchQuery.trim().length > 0;

  // Access Denied View for unauthorized users
  if (isAccessDenied) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 space-y-6">
        <div className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl p-8 sm:p-10 shadow-card text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-[#C85D55] border border-red-200 flex items-center justify-center shadow-subtle">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#26352D] tracking-tight">
              Administrator Access Required
            </h1>
            <p className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
              {accessDeniedMessage}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F7F2] border border-[#E9ECE7] text-xs text-[#5F6F65] max-w-md mx-auto space-y-1.5 text-left">
            <div className="flex items-center gap-2 font-semibold text-[#26352D]">
              <User className="w-3.5 h-3.5 text-[#245C46]" />
              <span>Current Session Account:</span>
            </div>
            <p className="pl-5 text-[#26352D] font-mono break-all">
              {currentUser?.email || 'Unknown Session'}
            </p>
            <p className="pl-5 text-[11px] text-[#8C9A91]">
              Administrative authorization requires a verified Google-authenticated account allowlisted in the server environment.
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/app/dashboard"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all"
            >
              <span>Return to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#E9ECE7] hover:bg-[#F7F7F2] text-[#26352D] transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-[#5F6F65]" />
              <span>Sign In with Another Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-xl shadow-elevation border flex items-center gap-2.5 text-xs font-medium animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-[#DCEBDD] border-[#bedbc1] text-[#183c2e]'
              : 'bg-red-50 border-red-200 text-[#C85D55]'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#245C46]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-[#C85D55]" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 p-0.5 text-[#5F6F65] hover:text-[#26352D]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E9ECE7]">
        <div className="space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCEBDD] text-[#183c2e] text-xs font-semibold shadow-subtle border border-[#bedbc1]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#245C46]" />
            <span>HabitHero Staff Moderation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#26352D]">
            Feedback Moderation & Roadmap Manager
          </h1>
          <p className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
            Review submissions across moderation states, assign public roadmap statuses to approved suggestions, and communicate official team updates to users.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/feedback"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#E9ECE7] bg-[#FFFFFF] hover:bg-[#F7F7F2] text-[#26352D] shadow-subtle transition-all"
            title="Open Public Feedback Portal in a new tab"
          >
            <span>View Public Board</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#5F6F65]" />
          </Link>
        </div>
      </div>

      {/* Filter & Moderation Tabs */}
      <div className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl p-4 sm:p-5 shadow-card space-y-4">
        {/* Moderation Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[#E9ECE7]">
          <span className="text-xs font-bold text-[#26352D] mr-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#245C46]" />
            <span>Moderation State:</span>
          </span>
          {[
            { id: 'all', label: 'All Submissions' },
            { id: 'pending', label: 'Pending Review', dot: 'bg-amber-500' },
            { id: 'approved', label: 'Approved', dot: 'bg-emerald-600' },
            { id: 'rejected', label: 'Rejected', dot: 'bg-red-500' },
            { id: 'spam', label: 'Spam', dot: 'bg-stone-500' },
          ].map((tab) => {
            const isActive = moderationFilter === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => {
                  setModerationFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#245C46] text-white shadow-subtle'
                    : 'bg-[#F7F7F2] text-[#5F6F65] hover:text-[#26352D] hover:bg-[#E9ECE7]'
                }`}
              >
                {tab.dot && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-white' : tab.dot
                    }`}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#8C9A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, description, or submitter email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C9A91] hover:text-[#26352D] p-0.5"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              id="admin-category-filter"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] transition-all cursor-pointer"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              <option value="feature_request">Feature Request</option>
              <option value="bug_report">Bug Report</option>
              <option value="improvement">Improvement</option>
              <option value="general">General Feedback</option>
            </select>
          </div>

          {/* Public Status Filter */}
          <div className="md:col-span-3">
            <select
              id="admin-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] transition-all cursor-pointer"
              aria-label="Filter by public progress status"
            >
              <option value="all">All Public Statuses</option>
              <option value="under_review">Under Review</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="md:col-span-1 flex justify-end">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset all filters"
                className="p-2 rounded-xl text-xs font-semibold text-[#5F6F65] hover:text-[#245C46] hover:bg-[#F7F7F2] border border-[#E9ECE7] transition-all inline-flex items-center gap-1"
                aria-label="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="md:hidden">Reset</span>
              </button>
            ) : (
              <div className="hidden md:block" />
            )}
          </div>
        </div>
      </div>

      {/* Main Inbox Feed */}
      <section aria-label="Admin Feedback Inbox" className="space-y-4">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl p-6 shadow-card space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-48 bg-stone-200 rounded-full" />
                  <div className="h-5 w-24 bg-stone-200 rounded-full" />
                </div>
                <div className="h-6 w-2/3 bg-stone-200 rounded-lg" />
                <div className="h-4 w-full bg-stone-100 rounded" />
                <div className="h-4 w-5/6 bg-stone-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error Banner */}
        {!isLoading && errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3 shadow-card">
            <div className="w-10 h-10 mx-auto rounded-xl bg-red-100 text-[#C85D55] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#26352D]">Unable to Load Inbox</h2>
            <p className="text-xs sm:text-sm text-[#5F6F65] max-w-md mx-auto">{errorMessage}</p>
            <button
              type="button"
              onClick={() =>
                fetchAdminFeedback(currentPage, moderationFilter, statusFilter, categoryFilter)
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty Inbox */}
        {!isLoading && !errorMessage && filteredItems.length === 0 && (
          <div className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl p-10 text-center space-y-4 shadow-card">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="text-base sm:text-lg font-bold text-[#26352D]">
                {hasActiveFilters ? 'No Submissions Match Filters' : 'Moderation Inbox Is Clean'}
              </h2>
              <p className="text-xs sm:text-sm text-[#5F6F65]">
                {hasActiveFilters
                  ? 'Try selecting a different moderation status tab or clearing your search keywords.'
                  : 'All community submissions have been reviewed and moderated.'}
              </p>
            </div>
            {hasActiveFilters && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E9ECE7] hover:bg-[#F7F7F2] text-[#26352D] transition-all"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback Cards List */}
        {!isLoading && !errorMessage && filteredItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#5F6F65] px-1">
              <span>
                Displaying <strong className="text-[#26352D]">{filteredItems.length}</strong> items
                {pagination.total > filteredItems.length && ` (of ${pagination.total} total)`}
              </span>
              <span>Sorted by most recent</span>
            </div>

            <div className="space-y-4">
              {filteredItems.map((item) => (
                <AdminFeedbackCard
                  key={item._id}
                  item={item}
                  isActionLoading={actionInProgressId === item._id}
                  onApprove={() => handleUpdateModeration(item, 'approved')}
                  onRejectClick={() =>
                    setConfirmModal({ isOpen: true, item, action: 'reject' })
                  }
                  onSpamClick={() =>
                    setConfirmModal({ isOpen: true, item, action: 'spam' })
                  }
                  onUpdateStatus={(newStatus) => handleUpdateStatus(item, newStatus)}
                  onAddReply={(content) => handleAddReply(item._id, content)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="pt-4 flex items-center justify-between border-t border-[#E9ECE7]">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => {
                    const prev = Math.max(1, currentPage - 1);
                    setCurrentPage(prev);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#E9ECE7] bg-[#FFFFFF] hover:bg-[#F7F7F2] text-[#26352D] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="text-xs font-medium text-[#5F6F65]">
                  Page <strong className="text-[#26352D]">{currentPage}</strong> of{' '}
                  <strong className="text-[#26352D]">{pagination.totalPages}</strong>
                </span>

                <button
                  type="button"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => {
                    const next = Math.min(pagination.totalPages, currentPage + 1);
                    setCurrentPage(next);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#E9ECE7] bg-[#FFFFFF] hover:bg-[#F7F7F2] text-[#26352D] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Confirmation Dialog for Destructive Actions (Reject / Spam) */}
      <ConfirmDestructiveModal
        isOpen={confirmModal.isOpen}
        item={confirmModal.item}
        action={confirmModal.action}
        isActionLoading={actionInProgressId === confirmModal.item?._id}
        onClose={() => setConfirmModal({ isOpen: false, item: null, action: 'reject' })}
        onConfirm={async () => {
          if (!confirmModal.item) return;
          const targetStatus: FeedbackModerationStatus =
            confirmModal.action === 'reject' ? 'rejected' : 'spam';
          await handleUpdateModeration(confirmModal.item, targetStatus);
          setConfirmModal({ isOpen: false, item: null, action: 'reject' });
        }}
      />
    </div>
  );
};

/**
 * Individual Admin Moderation Card
 */
interface AdminFeedbackCardProps {
  item: AdminFeedbackItem;
  isActionLoading: boolean;
  onApprove: () => void;
  onRejectClick: () => void;
  onSpamClick: () => void;
  onUpdateStatus: (newStatus: FeedbackStatus) => void;
  onAddReply: (content: string) => Promise<boolean>;
}

const AdminFeedbackCard: React.FC<AdminFeedbackCardProps> = ({
  item,
  isActionLoading,
  onApprove,
  onRejectClick,
  onSpamClick,
  onUpdateStatus,
  onAddReply,
}) => {
  const [showReplyForm, setShowReplyForm] = useState<boolean>(false);
  const [replyContent, setReplyContent] = useState<string>('');
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const modConfig = MODERATION_CONFIG[item.moderationStatus] || MODERATION_CONFIG.pending;
  const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general;
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.under_review;

  const ModIcon = modConfig.icon;
  const CatIcon = catConfig.icon;

  const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReplyError(null);

    const trimmed = replyContent.trim();
    if (trimmed.length < 2) {
      setReplyError('Reply must be at least 2 characters long.');
      return;
    }
    if (trimmed.length > 2000) {
      setReplyError('Reply cannot exceed 2000 characters.');
      return;
    }

    setIsSubmittingReply(true);
    const success = await onAddReply(trimmed);
    setIsSubmittingReply(false);

    if (success) {
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  return (
    <article className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl p-5 sm:p-6 shadow-card space-y-4 transition-all">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E9ECE7]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Moderation Status Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${modConfig.bg} ${modConfig.text} ${modConfig.border}`}
          >
            <ModIcon className="w-3 h-3" />
            <span>{modConfig.label}</span>
          </span>

          {/* Category Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}
          >
            <CatIcon className="w-3 h-3" />
            <span>{catConfig.label}</span>
          </span>

          {/* Public Progress Status Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
          >
            <span>Public: {statusConfig.label}</span>
          </span>
        </div>

        <span className="text-[11px] text-[#5F6F65]">{formattedDate}</span>
      </div>

      {/* Title & Submitter Information */}
      <div className="space-y-1.5">
        <h2 className="text-base sm:text-lg font-bold text-[#26352D] leading-snug">
          {item.title}
        </h2>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#5F6F65]">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#8C9A91]" />
            <span>
              Submitter: <strong className="text-[#26352D]">{item.displayName || 'Anonymous Hero'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F7F7F2] px-2.5 py-0.5 rounded-lg border border-[#E9ECE7]">
            <Mail className="w-3.5 h-3.5 text-[#245C46]" />
            {item.email ? (
              <span className="font-mono text-[#26352D]">{item.email}</span>
            ) : (
              <span className="text-[#8C9A91] italic">No email provided</span>
            )}
            <span className="text-[10px] text-[#8C9A91] ml-1 uppercase font-semibold tracking-wider">
              (Admin-Only)
            </span>
          </div>
        </div>
      </div>

      {/* Description Content */}
      <div className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed whitespace-pre-wrap bg-[#F7F7F2]/50 p-4 rounded-xl border border-[#E9ECE7]">
        {item.description}
      </div>

      {/* Action Toolbar */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#E9ECE7]">
        {/* Moderation Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {item.moderationStatus !== 'approved' && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={onApprove}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Submission</span>
            </button>
          )}

          {item.moderationStatus !== 'rejected' && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={onRejectClick}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#C85D55] bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          )}

          {item.moderationStatus !== 'spam' && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={onSpamClick}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              <Flag className="w-3.5 h-3.5 text-stone-500" />
              <span>Mark as Spam</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#E9ECE7] hover:bg-[#F7F7F2] text-[#26352D] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#245C46]" />
            <span>
              {showReplyForm ? 'Hide Reply Form' : 'Add Official Reply'}
            </span>
          </button>
        </div>

        {/* Public Status Management Dropdown */}
        <div className="flex items-center gap-2">
          <label
            htmlFor={`status-select-${item._id}`}
            className="text-xs font-semibold text-[#26352D] whitespace-nowrap"
          >
            Roadmap Status:
          </label>
          <div className="relative">
            <select
              id={`status-select-${item._id}`}
              value={item.status}
              disabled={item.moderationStatus !== 'approved' || isActionLoading}
              onChange={(e) => onUpdateStatus(e.target.value as FeedbackStatus)}
              className="px-3 py-1.5 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
              title={
                item.moderationStatus !== 'approved'
                  ? 'Cannot update status: feedback must be approved first.'
                  : 'Update public progress status'
              }
            >
              <option value="under_review">Under Review</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
          </div>
          {item.moderationStatus !== 'approved' && (
            <span className="text-[10px] text-amber-700 font-medium hidden lg:inline">
              (Approval required)
            </span>
          )}
        </div>
      </div>

      {/* Official Reply History */}
      {item.officialReplies && item.officialReplies.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-[#E9ECE7]">
          <span className="text-[11px] font-bold text-[#26352D] uppercase tracking-wider">
            Official Replies History ({item.officialReplies.length}):
          </span>

          <div className="space-y-2">
            {item.officialReplies.map((reply) => {
              const rDate = new Date(reply.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={reply._id}
                  className="bg-[#F2F8F4] border-l-4 border-[#245C46] rounded-r-xl p-3.5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="inline-flex items-center gap-1.5 font-bold text-[#245C46]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#245C46]" />
                      <span>{reply.authorName || 'HabitHero Team'}</span>
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-[#DCEBDD] text-[#183c2e]">
                        Official Response
                      </span>
                    </div>
                    <span className="text-[#5F6F65]">{rDate}</span>
                  </div>
                  <p className="text-[#26352D] whitespace-pre-wrap leading-relaxed">
                    {reply.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline Reply Composer Form */}
      {showReplyForm && (
        <form
          onSubmit={handleReplySubmit}
          className="p-4 bg-[#F7F7F2] rounded-xl border border-[#E9ECE7] space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor={`reply-content-${item._id}`}
              className="text-xs font-bold text-[#26352D] flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#245C46]" />
              <span>Post Official HabitHero Team Reply</span>
            </label>
            <span className="text-[11px] text-[#8C9A91]">{replyContent.length}/2000</span>
          </div>

          <textarea
            id={`reply-content-${item._id}`}
            rows={3}
            placeholder="Type your official team reply here. This will be publicly visible to everyone on the feedback board..."
            value={replyContent}
            maxLength={2000}
            onChange={(e) => {
              setReplyContent(e.target.value);
              if (replyError) setReplyError(null);
            }}
            className="w-full px-3 py-2 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] resize-y"
          />

          {replyError && (
            <p className="text-[11px] text-[#C85D55] font-medium">{replyError}</p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[#8C9A91]">
              Author identity is fixed to <strong>HabitHero Team</strong> by the server.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent('');
                  setReplyError(null);
                }}
                disabled={isSubmittingReply}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E9ECE7] bg-[#FFFFFF] hover:bg-[#F7F7F2] text-[#5F6F65]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReply}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white disabled:opacity-50 transition-all"
              >
                {isSubmittingReply ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>Post Reply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </article>
  );
};

/**
 * Confirmation Modal for Destructive Moderation Actions (Reject or Spam)
 */
interface ConfirmDestructiveModalProps {
  isOpen: boolean;
  item: AdminFeedbackItem | null;
  action: 'reject' | 'spam';
  isActionLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmDestructiveModal: React.FC<ConfirmDestructiveModalProps> = ({
  isOpen,
  item,
  action,
  isActionLoading,
  onClose,
  onConfirm,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  if (!item) return null;

  const isReject = action === 'reject';
  const actionTitle = isReject ? 'Reject Submission?' : 'Flag Submission as Spam?';
  const actionDescription = isReject
    ? `Are you sure you want to reject "${item.title}"? Rejected submissions will be removed from the public feedback board.`
    : `Are you sure you want to flag "${item.title}" as spam? Spam submissions will be excluded from public display.`;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        if (!isActionLoading) onClose();
      }}
      className="fixed inset-0 m-auto p-0 bg-transparent rounded-2xl border-none outline-none max-w-md w-[calc(100%-2rem)] z-50 backdrop:bg-[#26352D]/45 backdrop:backdrop-blur-sm"
    >
      <div className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl p-6 shadow-elevation space-y-5">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isReject ? 'bg-red-100 text-[#C85D55]' : 'bg-stone-100 text-stone-700'
            }`}
          >
            {isReject ? <AlertTriangle className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#26352D]">{actionTitle}</h2>
            <p className="text-xs text-[#5F6F65] leading-relaxed">{actionDescription}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E9ECE7] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isActionLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E9ECE7] hover:bg-[#F7F7F2] text-[#26352D]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isActionLoading}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all ${
              isReject
                ? 'bg-[#C85D55] hover:bg-[#b04a43]'
                : 'bg-stone-800 hover:bg-stone-900'
            } disabled:opacity-50`}
          >
            {isActionLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{isReject ? 'Confirm Reject' : 'Confirm Spam'}</span>
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
};
