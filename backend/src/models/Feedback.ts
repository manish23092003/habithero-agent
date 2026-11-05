import mongoose, { Schema, Document } from 'mongoose';
import { IFeedback, IOfficialReply } from '../types/index.js';

export interface OfficialReplyDocument extends Document, Omit<IOfficialReply, '_id'> {}
export interface FeedbackDocument extends Document, Omit<IFeedback, '_id'> {}

const OfficialReplySchema = new Schema(
  {
    authorName: {
      type: String,
      required: true,
      default: 'HabitHero Team',
      trim: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      select: false, // Excluded from query projections to prevent exposing internal admin ObjectIds publicly
    },
    content: {
      type: String,
      required: [true, 'Reply content is required'],
      trim: true,
      minlength: 2,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

const FeedbackSchema = new Schema<FeedbackDocument>(
  {
    title: {
      type: String,
      required: [true, 'Feedback title is required'],
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, 'Feedback description is required'],
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ['feature_request', 'bug_report', 'general', 'improvement'],
      required: [true, 'Feedback category is required'],
      default: 'general',
      index: true,
    },
    status: {
      type: String,
      enum: ['under_review', 'planned', 'in_progress', 'completed', 'declined'],
      required: [true, 'Feedback status is required'],
      default: 'under_review',
      index: true,
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'spam'],
      required: [true, 'Moderation status is required'],
      default: 'pending',
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: 'HabitHero Community Member',
      maxlength: 50,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      select: false, // Excluded from normal query projections to protect submitter privacy
    },
    officialReplies: {
      type: [OfficialReplySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound and single-field indexes for fast moderation and public querying
FeedbackSchema.index({ moderationStatus: 1, createdAt: -1 });
FeedbackSchema.index({ moderationStatus: 1, status: 1 });
FeedbackSchema.index({ moderationStatus: 1, category: 1 });

export const Feedback = mongoose.model<FeedbackDocument>('Feedback', FeedbackSchema);

