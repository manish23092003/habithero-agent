import mongoose, { Schema, Document } from 'mongoose';
import { ITask } from '../types/index.js';

export interface TaskDocument extends Document, Omit<ITask, '_id'> {}

const TaskSchema = new Schema<TaskDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goalId: {
      type: Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
      index: true,
    },
    goalTitle: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      default: 20,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'challenging'],
      default: 'easy',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'missed', 'adapted'],
      default: 'pending',
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    dayNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    scheduledFor: {
      type: String,
      required: true,
      index: true,
    },
    adaptationNote: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['learning', 'health', 'career', 'productivity', 'mindfulness'],
      default: 'learning',
    },
  },
  {
    timestamps: true,
  }
);

export const Task = mongoose.model<TaskDocument>('Task', TaskSchema);

