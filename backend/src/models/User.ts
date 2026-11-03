import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types/index.js';

export interface UserDocument extends Document, Omit<IUser, '_id'> {}

const UserSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    fetchAddress: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    passwordHash: {
      type: String,
      required: false, // Optional for Google OAuth users who authenticate without passwords
      select: false, // Do not expose password hash in queries by default
    },
    passwordChangedAt: {
      type: Date,
      select: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<UserDocument>('User', UserSchema);
