import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'habithero_development_jwt_secret_token_2026';
};

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export class AuthService {
  static async register(dto: RegisterDTO) {
    const existing = await User.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await User.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
    });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  static async login(dto: LoginDTO) {
    const user = await User.findOne({ email: dto.email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  static async getMe(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}

