import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  MessageSquarePlus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  Zap,
  XCircle,
  Bug,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  X,
  User,
  RotateCcw,
  Send,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  PublicFeedbackItem,
  FeedbackCategory,
  FeedbackStatus,
  FeedbackPagination,
  CreateFeedbackPayload,
} from '../../types/feedback';

const CATEGORY_CONFIG: Record<
  FeedbackCategory,
  { label: string; icon: React.FC<{ className?: string }>; bg: string; text: string; border: string }
> = {
  feature_request: {
    label: 'Feature Request',
    icon: Sparkles,
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

const STATUS_CONFIG: Record<
  FeedbackStatus,
  { label: string; icon: React.FC<{ className?: string }>; bg: string; text: string; border: string }
> = {
  under_review: {
    label: 'Under Review',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  planned: {
    label: 'Planned',
    icon: Calendar,
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  in_progress: {
    label: 'In Progress',
    icon: Zap,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    bg: 'bg-[#DCEBDD]',
    text: 'text-[#183c2e]',
    border: 'border-[#bedbc1]',
  },
  declined: {
    label: 'Declined',
    icon: XCircle,
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    border: 'border-stone-200',
  },
};

export const FeedbackPage: React.FC = () => {
  // Feedback data state
  const [items, setItems] = useState<PublicFeedbackItem[]>([]);
  const [pagination, setPagination] = useState<FeedbackPagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Submission modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Fetch feedback from API
  const fetchFeedback = useCallback(async (page: number, category: string, status: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getPublicFeedback({
        page,
        limit: 15,
        category,
        status,
      });
      if (response && response.success) {
        setItems(response.data || []);
        setPagination(
          response.pagination || {
            page,
            limit: 15,
            total: response.data?.length || 0,
            totalPages: 1,
          }
        );
      } else {
        throw new Error('Unable to retrieve feedback list.');
      }
    } catch (err: any) {
      console.error('[FeedbackPage] fetch error:', err);
      setError(err.message || 'Failed to load community feedback. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger fetch when server-side query params change
  useEffect(() => {
    fetchFeedback(currentPage, selectedCategory, selectedStatus);
  }, [currentPage, selectedCategory, selectedStatus, fetchFeedback]);

  // Client-side text search filter for quick responsiveness
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const matchTitle = item.title.toLowerCase().includes(query);
    const matchDesc = item.description.toLowerCase().includes(query);
    const matchAuthor = item.displayName.toLowerCase().includes(query);
    return matchTitle || matchDesc || matchAuthor;
  });

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedStatus !== 'all' || searchQuery.trim().length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E9ECE7]">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCEBDD] text-[#183c2e] text-xs font-semibold shadow-subtle border border-[#bedbc1]">
            <Sparkles className="w-3.5 h-3.5 text-[#245C46]" />
            <span>Community Feedback & Roadmap</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#26352D]">
            Shape the Future of HabitHero
          </h1>
          <p className="text-sm sm:text-base text-[#5F6F65] leading-relaxed">
            Browse suggestions, report issues, and see what the team is currently building. Have an idea to make habit consistency easier? Share it below.
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle hover:shadow-card transition-all active:scale-[0.98]"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Submit Feedback</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl p-4 sm:p-5 shadow-card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#8C9A91] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search feedback by keyword or title..."
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

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                id="feedback-category-filter"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] transition-all cursor-pointer"
                aria-label="Filter by feedback category"
              >
                <option value="all">All Categories</option>
                <option value="feature_request">Feature Request</option>
                <option value="bug_report">Bug Report</option>
                <option value="improvement">Improvement</option>
                <option value="general">General Feedback</option>
              </select>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                id="feedback-status-filter"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] transition-all cursor-pointer"
                aria-label="Filter by feedback status"
              >
                <option value="all">All Statuses</option>
                <option value="under_review">Under Review</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>

          {/* Reset Filters Action */}
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

        {/* Quick status summary pills for visual roadmap feel */}
        <div className="pt-2 border-t border-[#E9ECE7] flex flex-wrap items-center gap-2 text-xs text-[#5F6F65]">
          <span className="font-semibold text-[#26352D] mr-1 inline-flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#245C46]" />
            <span>Roadmap Stages:</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedStatus(selectedStatus === 'under_review' ? 'all' : 'under_review');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
              selectedStatus === 'under_review'
                ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                : 'bg-amber-50/60 text-amber-800 border-amber-200/60 hover:bg-amber-100/60'
            }`}
          >
            Under Review
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedStatus(selectedStatus === 'planned' ? 'all' : 'planned');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
              selectedStatus === 'planned'
                ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold'
                : 'bg-purple-50/60 text-purple-700 border-purple-200/60 hover:bg-purple-100/60'
            }`}
          >
            Planned
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedStatus(selectedStatus === 'in_progress' ? 'all' : 'in_progress');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
              selectedStatus === 'in_progress'
                ? 'bg-blue-100 text-blue-900 border-blue-300 font-bold'
                : 'bg-blue-50/60 text-blue-700 border-blue-200/60 hover:bg-blue-100/60'
            }`}
          >
            In Progress
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedStatus(selectedStatus === 'completed' ? 'all' : 'completed');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
              selectedStatus === 'completed'
                ? 'bg-[#cbe3cc] text-[#143226] border-[#a8cfac] font-bold'
                : 'bg-[#DCEBDD]/60 text-[#183c2e] border-[#bedbc1]/60 hover:bg-[#DCEBDD]'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Main Feedback Content Area */}
      <section aria-label="Community Feedback List" className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((skeletonKey) => (
              <div
                key={skeletonKey}
                className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl p-6 shadow-card space-y-3 animate-pulse"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-24 bg-stone-200 rounded-full" />
                  <div className="h-5 w-20 bg-stone-200 rounded-full" />
                </div>
                <div className="h-6 w-3/4 bg-stone-200 rounded-lg" />
                <div className="space-y-1.5 pt-1">
                  <div className="h-4 w-full bg-stone-100 rounded" />
                  <div className="h-4 w-5/6 bg-stone-100 rounded" />
                </div>
                <div className="flex items-center gap-3 pt-3">
                  <div className="h-4 w-28 bg-stone-100 rounded" />
                  <div className="h-4 w-20 bg-stone-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3 shadow-card">
            <div className="w-10 h-10 mx-auto rounded-xl bg-red-100 text-[#C85D55] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-[#26352D]">Unable to Load Feedback</h2>
            <p className="text-xs sm:text-sm text-[#5F6F65] max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => fetchFeedback(currentPage, selectedCategory, selectedStatus)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredItems.length === 0 && (
          <div className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl p-10 text-center space-y-4 shadow-card">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h2 className="text-base sm:text-lg font-bold text-[#26352D]">
                {hasActiveFilters ? 'No Feedback Matches Your Filters' : 'No Feedback Shared Yet'}
              </h2>
              <p className="text-xs sm:text-sm text-[#5F6F65]">
                {hasActiveFilters
                  ? 'Try selecting different categories or clear your search term to see more ideas.'
                  : 'Be the first person in the HabitHero community to suggest a feature or report an issue!'}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E9ECE7] hover:bg-[#F7F7F2] text-[#26352D] transition-all"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle hover:shadow-card transition-all"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Submit First Idea</span>
              </button>
            </div>
          </div>
        )}

        {/* Feedback List */}
        {!isLoading && !error && filteredItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-[#5F6F65] px-1">
              <span>
                Showing <strong className="text-[#26352D]">{filteredItems.length}</strong> {filteredItems.length === 1 ? 'submission' : 'submissions'}
                {pagination.total > filteredItems.length && ` (of ${pagination.total} total)`}
              </span>
              <span>Updated in real-time</span>
            </div>

            <div className="space-y-4">
              {filteredItems.map((item) => (
                <FeedbackCard key={item._id} item={item} />
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
                  Page <strong className="text-[#26352D]">{currentPage}</strong> of <strong className="text-[#26352D]">{pagination.totalPages}</strong>
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

      {/* Feedback Submission Modal */}
      <SubmitFeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // If viewing approved items, reload or reset to first page
          fetchFeedback(1, selectedCategory, selectedStatus);
        }}
      />
    </div>
  );
};

/**
 * Individual Feedback Item Card
 */
interface FeedbackCardProps {
  item: PublicFeedbackItem;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const categoryConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general;
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.under_review;

  const CategoryIcon = categoryConfig.icon;
  const StatusIcon = statusConfig.icon;

  const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const shouldTruncate = item.description.length > 260;
  const displayDescription = shouldTruncate && !isExpanded
    ? `${item.description.slice(0, 260)}...`
    : item.description;

  return (
    <article className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all space-y-4">
      {/* Badges Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${categoryConfig.bg} ${categoryConfig.text} ${categoryConfig.border}`}
          >
            <CategoryIcon className="w-3 h-3" />
            <span>{categoryConfig.label}</span>
          </span>

          {/* Status Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
          >
            <StatusIcon className="w-3 h-3" />
            <span>{statusConfig.label}</span>
          </span>
        </div>

        {/* Date and Replies count */}
        <div className="flex items-center gap-3 text-[11px] text-[#5F6F65]">
          <span>{formattedDate}</span>
          {item.officialReplies && item.officialReplies.length > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-[#245C46] bg-[#DCEBDD]/60 px-2 py-0.5 rounded-md">
              <ShieldCheck className="w-3 h-3 text-[#245C46]" />
              <span>{item.officialReplies.length} {item.officialReplies.length === 1 ? 'Official Reply' : 'Official Replies'}</span>
            </span>
          )}
        </div>
      </div>

      {/* Title & Author */}
      <div className="space-y-1.5">
        <h2 className="text-base sm:text-lg font-bold text-[#26352D] leading-snug tracking-tight">
          {item.title}
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-[#5F6F65]">
          <User className="w-3 h-3 text-[#8C9A91]" />
          <span>Suggested by <strong className="text-[#26352D] font-semibold">{item.displayName || 'Anonymous Hero'}</strong></span>
        </div>
      </div>

      {/* Description */}
      <div className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed whitespace-pre-wrap">
        <p>{displayDescription}</p>
        {shouldTruncate && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 text-xs font-semibold text-[#245C46] hover:underline focus:outline-none"
          >
            {isExpanded ? 'Show less' : 'Read full feedback'}
          </button>
        )}
      </div>

      {/* Official Replies Section */}
      {item.officialReplies && item.officialReplies.length > 0 && (
        <div className="space-y-3 pt-2">
          {item.officialReplies.map((reply) => {
            const replyDate = new Date(reply.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            return (
              <div
                key={reply._id}
                className="bg-[#F2F8F4] border-l-4 border-[#245C46] rounded-r-xl p-4 space-y-2 text-xs sm:text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#245C46]">
                    <ShieldCheck className="w-4 h-4 text-[#245C46]" />
                    <span>{reply.authorName || 'HabitHero Team'}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#DCEBDD] text-[#183c2e]">
                      Official Response
                    </span>
                  </div>
                  <span className="text-[11px] text-[#5F6F65]">{replyDate}</span>
                </div>
                <div className="text-[#26352D] font-normal leading-relaxed whitespace-pre-wrap">
                  {reply.content}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};

/**
 * Modern Accessible Feedback Submission Modal
 * Uses native <dialog> adhering to modern-web-guidance
 */
interface SubmitFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SubmitFeedbackModal: React.FC<SubmitFeedbackModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Form Fields
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<FeedbackCategory>('feature_request');
  const [description, setDescription] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // Status & Validation State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  // Synchronize modal state with native <dialog> element
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setCategory('feature_request');
      setDescription('');
      setDisplayName('');
      setEmail('');
      setClientErrors({});
      setServerError(null);
      setIsRateLimited(false);
      setIsSubmittedSuccess(false);
    }
  }, [isOpen]);

  // Validate form client-side matching backend schemas
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errors.title = 'Title is required';
    } else if (trimmedTitle.length < 3) {
      errors.title = 'Title must be at least 3 characters long';
    } else if (trimmedTitle.length > 150) {
      errors.title = 'Title cannot exceed 150 characters';
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      errors.description = 'Description is required';
    } else if (trimmedDesc.length < 10) {
      errors.description = 'Description must be at least 10 characters long';
    } else if (trimmedDesc.length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters';
    }

    const trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName.length > 50) {
      errors.displayName = 'Display name cannot exceed 50 characters';
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Please provide a valid email address';
      } else if (trimmedEmail.length > 254) {
        errors.email = 'Email address is too long';
      }
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setIsRateLimited(false);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateFeedbackPayload = {
        title: title.trim(),
        description: description.trim(),
        category,
        ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
      };

      const res = await api.submitFeedback(payload);
      if (res && res.success) {
        setIsSubmittedSuccess(true);
        onSuccess();
      } else {
        throw new Error(res.message || 'Submission failed. Please try again.');
      }
    } catch (err: any) {
      console.error('[SubmitFeedbackModal] Error:', err);
      if (err.status === 429 || (err.message && err.message.toLowerCase().includes('limit'))) {
        setIsRateLimited(true);
        setServerError(
          err.message || 'Submission limit reached (maximum 5 submissions per 15 minutes). Please wait before trying again.'
        );
      } else {
        setServerError(err.message || 'An error occurred while submitting feedback. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Light dismiss: click outside dialog box
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog && !isSubmitting) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      id="submit-feedback-modal"
      aria-labelledby="submit-feedback-modal-title"
      onClick={handleDialogClick}
      onCancel={(e) => {
        e.preventDefault();
        if (!isSubmitting) onClose();
      }}
      className="fixed inset-0 m-auto p-0 bg-transparent rounded-2xl border-none outline-none max-w-lg w-[calc(100%-2rem)] z-50 backdrop:bg-[#26352D]/45 backdrop:backdrop-blur-sm"
    >
      <div className="bg-[#FFFFFF] border border-[#E9ECE7] rounded-2xl shadow-elevation overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E9ECE7] flex items-center justify-between bg-[#F7F7F2]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#245C46] text-white flex items-center justify-center shadow-subtle">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 id="submit-feedback-modal-title" className="text-base font-bold text-[#26352D]">
                Submit Feedback
              </h2>
              <p className="text-[11px] text-[#5F6F65]">Share your idea, bug report, or improvement</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#8C9A91] hover:text-[#26352D] hover:bg-[#E9ECE7] transition-colors"
            aria-label="Close feedback modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Success View */}
          {isSubmittedSuccess ? (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#DCEBDD] text-[#245C46] flex items-center justify-center shadow-subtle">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-lg font-bold text-[#26352D]">
                  Feedback Submitted!
                </h3>
                <p className="text-xs sm:text-sm text-[#5F6F65] leading-relaxed">
                  Thank you for helping us improve HabitHero! To protect our community from spam, all new submissions are reviewed by a moderator before appearing publicly on the board.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle hover:shadow-card transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Submission Form View */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Rate Limit Banner */}
              {isRateLimited && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">Rate Limit Reached</span>
                    <p className="leading-relaxed">{serverError}</p>
                  </div>
                </div>
              )}

              {/* General Server Error Banner */}
              {!isRateLimited && serverError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#C85D55] text-xs flex items-start gap-2.5 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-[#C85D55] shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{serverError}</span>
                </div>
              )}

              {/* Title Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="fb-title" className="block text-xs font-semibold text-[#26352D]">
                    Feedback Title <span className="text-[#C85D55]">*</span>
                  </label>
                  <span className="text-[11px] text-[#8C9A91]">{title.length}/150</span>
                </div>
                <input
                  id="fb-title"
                  type="text"
                  placeholder="e.g. Add morning habit reminder notifications"
                  value={title}
                  maxLength={150}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (clientErrors.title) {
                      setClientErrors({ ...clientErrors, title: '' });
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border ${
                    clientErrors.title ? 'border-red-300 ring-1 ring-red-300' : 'border-[#E9ECE7]'
                  } focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] transition-all`}
                />
                {clientErrors.title && (
                  <p className="text-[11px] text-[#C85D55] font-medium">{clientErrors.title}</p>
                )}
              </div>

              {/* Category Field */}
              <div className="space-y-1.5">
                <label htmlFor="fb-category" className="block text-xs font-semibold text-[#26352D]">
                  Category <span className="text-[#C85D55]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['feature_request', 'bug_report', 'improvement', 'general'] as FeedbackCategory[]).map((catKey) => {
                    const cfg = CATEGORY_CONFIG[catKey];
                    const Icon = cfg.icon;
                    const isSelected = category === catKey;
                    return (
                      <button
                        type="button"
                        key={catKey}
                        onClick={() => setCategory(catKey)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                          isSelected
                            ? 'border-[#245C46] bg-[#DCEBDD]/40 text-[#245C46] ring-1 ring-[#245C46]'
                            : 'border-[#E9ECE7] bg-[#FFFFFF] text-[#5F6F65] hover:bg-[#F7F7F2]'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#245C46]' : 'text-[#8C9A91]'}`} />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="fb-description" className="block text-xs font-semibold text-[#26352D]">
                    Description <span className="text-[#C85D55]">*</span>
                  </label>
                  <span className="text-[11px] text-[#8C9A91]">{description.length}/2000</span>
                </div>
                <textarea
                  id="fb-description"
                  rows={4}
                  placeholder="Explain your idea, what problem it solves, or the steps to reproduce an issue..."
                  value={description}
                  maxLength={2000}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (clientErrors.description) {
                      setClientErrors({ ...clientErrors, description: '' });
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border ${
                    clientErrors.description ? 'border-red-300 ring-1 ring-red-300' : 'border-[#E9ECE7]'
                  } focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] transition-all resize-y`}
                />
                {clientErrors.description ? (
                  <p className="text-[11px] text-[#C85D55] font-medium">{clientErrors.description}</p>
                ) : (
                  <p className="text-[11px] text-[#8C9A91]">Minimum 10 characters.</p>
                )}
              </div>

              {/* Display Name & Email (Row) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label htmlFor="fb-name" className="block text-xs font-semibold text-[#26352D]">
                    Display Name <span className="text-[#8C9A91] font-normal">(Optional)</span>
                  </label>
                  <input
                    id="fb-name"
                    type="text"
                    placeholder="e.g. Alex H. (or leave blank)"
                    value={displayName}
                    maxLength={50}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E9ECE7] focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] transition-all"
                  />
                  {clientErrors.displayName && (
                    <p className="text-[11px] text-[#C85D55] font-medium">{clientErrors.displayName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="fb-email" className="block text-xs font-semibold text-[#26352D]">
                    Email <span className="text-[#8C9A91] font-normal">(Optional & Private)</span>
                  </label>
                  <input
                    id="fb-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    maxLength={254}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (clientErrors.email) {
                        setClientErrors({ ...clientErrors, email: '' });
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl border ${
                      clientErrors.email ? 'border-red-300 ring-1 ring-red-300' : 'border-[#E9ECE7]'
                    } focus:outline-none focus:ring-2 focus:ring-[#245C46] bg-[#FFFFFF] text-[#26352D] placeholder:text-[#8C9A91] transition-all`}
                  />
                  {clientErrors.email && (
                    <p className="text-[11px] text-[#C85D55] font-medium">{clientErrors.email}</p>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-[#8C9A91]">
                Your email is never shared publicly and only used if the team has questions regarding your suggestion.
              </p>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#E9ECE7] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E9ECE7] hover:bg-[#F7F7F2] text-[#26352D] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#245C46] hover:bg-[#1d4a38] text-white shadow-subtle hover:shadow-card transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </dialog>
  );
};
