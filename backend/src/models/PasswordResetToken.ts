import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPasswordResetToken {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  clientIp?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PasswordResetTokenDocument extends Document, Omit<IPasswordResetToken, '_id'> {}

const PasswordResetTokenSchema = new Schema<PasswordResetTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    clientIp: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for rapid lookup and atomic updates
PasswordResetTokenSchema.index({ userId: 1, usedAt: 1 });
PasswordResetTokenSchema.index({ email: 1, createdAt: -1 });

// TTL index to automatically purge old records 24 hours after expiration
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

export const PasswordResetToken = mongoose.model<PasswordResetTokenDocument>(
  'PasswordResetToken',
  PasswordResetTokenSchema
);
