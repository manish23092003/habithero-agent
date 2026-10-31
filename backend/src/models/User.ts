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
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Do not expose password hash in queries by default
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<UserDocument>('User', UserSchema);

