import mongoose, { Schema, Document } from 'mongoose';

export interface ConversationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Habit Accountability Session',
      maxlength: 120,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup of active conversation
ConversationSchema.index({ userId: 1, updatedAt: -1 });

export const Conversation = mongoose.model<ConversationDocument>('Conversation', ConversationSchema);
