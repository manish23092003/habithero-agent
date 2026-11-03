import mongoose, { Schema, Document } from 'mongoose';
import { ICheckIn } from '../types/index.js';

export interface CheckInDocument extends Document, Omit<ICheckIn, '_id'> {}

const CheckInSchema = new Schema<CheckInDocument>(
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
      required: false,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['great', 'partial', 'missed'],
      required: true,
    },
    completedTaskCount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalTaskCount: {
      type: Number,
      required: true,
      default: 0,
    },
    missedReason: {
      type: String,
      enum: ['busy', 'difficult', 'tired', 'distracted', 'other'],
      default: undefined,
    },
    reflection: {
      type: String,
      trim: true,
      default: '',
    },
    agentAdaptation: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring idempotency: exactly one check-in per user per day
CheckInSchema.index({ userId: 1, date: 1 }, { unique: true });

export const CheckIn = mongoose.model<CheckInDocument>('CheckIn', CheckInSchema);

