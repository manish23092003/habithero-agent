import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IdempotencyKeyDocument extends Document {
  userId: Types.ObjectId;
  key: string;
  resourceType: 'goal' | 'task';
  resourceId: Types.ObjectId;
  createdAt: Date;
}

const IdempotencyKeySchema = new Schema<IdempotencyKeyDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      enum: ['goal', 'task'],
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring idempotency per user
IdempotencyKeySchema.index({ userId: 1, key: 1 }, { unique: true });

// Auto-expire idempotency records after 24 hours
IdempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const IdempotencyKey = mongoose.model<IdempotencyKeyDocument>(
  'IdempotencyKey',
  IdempotencyKeySchema
);

