export type FeedbackCategory = 'feature_request' | 'bug_report' | 'general' | 'improvement';

export type FeedbackStatus = 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined';

export type FeedbackModerationStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export interface OfficialReply {
  _id: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFeedbackItem {
  _id: string;
  title: string;
  description: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  displayName: string;
  officialReplies: OfficialReply[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminFeedbackItem {
  _id: string;
  title: string;
  description: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  moderationStatus: FeedbackModerationStatus;
  displayName: string;
  email?: string;
  officialReplies: OfficialReply[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FeedbackListResponse {
  success: boolean;
  data: PublicFeedbackItem[];
  pagination: FeedbackPagination;
}

export interface AdminFeedbackListResponse {
  success: boolean;
  data: AdminFeedbackItem[];
  pagination: FeedbackPagination;
}

export interface CreateFeedbackPayload {
  title: string;
  description: string;
  category: FeedbackCategory;
  displayName?: string;
  email?: string;
}

export interface CreateFeedbackResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    title: string;
    description: string;
    category: FeedbackCategory;
    status: FeedbackStatus;
    displayName: string;
    createdAt: string;
  };
}

export interface UpdateModerationResponse {
  success: boolean;
  message: string;
  data: AdminFeedbackItem;
}

export interface UpdateStatusResponse {
  success: boolean;
  message: string;
  data: AdminFeedbackItem;
}

export interface AddOfficialReplyResponse {
  success: boolean;
  message: string;
  data: AdminFeedbackItem;
}


