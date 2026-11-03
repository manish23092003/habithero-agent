import mongoose, { Schema, Document } from 'mongoose';

export interface ToolCallRecord {
  name: string;
  args: Record<string, any>;
  callId?: string;
}

export interface ToolResultRecord {
  name: string;
  result: Record<string, any>;
  callId?: string;
}

export interface MessageDocument extends Document {
  conversationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sender: 'user' | 'agent' | 'system';
  content: string;
  toolCalls?: ToolCallRecord[];
  toolResults?: ToolResultRecord[];
  actionProposal?: {
    type: 'reduce_time' | 'rest_day' | 'break_down_task' | 'boost_challenge';
    label: string;
    description: string;
    impactMinutes?: number;
    taskId?: string;
    applied?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<MessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ['user', 'agent', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    toolCalls: {
      type: [
        {
          name: { type: String, required: true },
          args: { type: Schema.Types.Mixed, default: {} },
          callId: { type: String },
        },
      ],
      default: undefined,
    },
    toolResults: {
      type: [
        {
          name: { type: String, required: true },
          result: { type: Schema.Types.Mixed, default: {} },
          callId: { type: String },
        },
      ],
      default: undefined,
    },
    actionProposal: {
      type: {
        type: String,
        enum: ['reduce_time', 'rest_day', 'break_down_task', 'boost_challenge'],
      },
      label: { type: String },
      description: { type: String },
      impactMinutes: { type: Number },
      taskId: { type: String },
      applied: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast message lookup by conversation
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ userId: 1, createdAt: -1 });

export const Message = mongoose.model<MessageDocument>('Message', MessageSchema);

