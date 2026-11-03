import mongoose, { Schema, Document } from 'mongoose';
import { IGoal } from '../types/index.js';

export interface GoalDocument extends Document, Omit<IGoal, '_id'> {}

const HabitPhaseSchema = new Schema(
  {
    phaseNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    focus: { type: String, required: true, trim: true },
    dayRange: { type: String, required: true, trim: true },
    tasksPlanned: { type: Number, required: true, default: 7 },
  },
  { _id: false }
);

const GoalSchema = new Schema<GoalDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: 150,
    },
    tagline: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: ['learning', 'health', 'career', 'productivity', 'mindfulness'],
      default: 'learning',
    },
    targetDays: {
      type: Number,
      required: true,
      min: 1,
      max: 365,
      default: 30,
    },
    currentDay: {
      type: Number,
      default: 1,
      min: 1,
    },
    dailyCommitmentMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 480,
      default: 25,
    },
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'recovery'],
      default: 'active',
      index: true,
    },
    planOutline: {
      type: [HabitPhaseSchema],
      default: [],
    },
    adaptationNotice: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user goal retrieval and sorting
GoalSchema.index({ userId: 1, createdAt: -1 });
GoalSchema.index({ userId: 1, status: 1 });

export const Goal = mongoose.model<GoalDocument>('Goal', GoalSchema);

