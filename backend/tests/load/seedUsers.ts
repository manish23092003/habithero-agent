import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import { User } from '../../src/models/User.js';
import { Goal } from '../../src/models/Goal.js';
import { Task } from '../../src/models/Task.js';
import { CheckIn } from '../../src/models/CheckIn.js';
import { Conversation } from '../../src/models/Conversation.js';
import { Message } from '../../src/models/Message.js';
import { IdempotencyKey } from '../../src/models/IdempotencyKey.js';

const LOADTEST_DB_URI = process.env.LOADTEST_MONGODB_URI || 'mongodb://localhost:27017/habithero_loadtest';
const JWT_SECRET = process.env.JWT_SECRET || 'habithero_development_jwt_secret_token_2026';
const USER_COUNT = 200;

async function seed() {
  console.log(`[Seed] Connecting to dedicated load-test DB: ${LOADTEST_DB_URI}...`);
  await mongoose.connect(LOADTEST_DB_URI);
  console.log('[Seed] Purging previous load-test data in dedicated database...');
  await Promise.all([
    User.deleteMany({}),
    Goal.deleteMany({}),
    Task.deleteMany({}),
    CheckIn.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    IdempotencyKey.deleteMany({}),
  ]);

  console.log(`[Seed] Generating ${USER_COUNT} isolated synthetic users with seeded goals and tasks...`);
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const usersData: any[] = [];

  const userDocs = [];
  const goalDocs = [];
  const taskDocs = [];

  for (let i = 1; i <= USER_COUNT; i++) {
    const userId = new Types.ObjectId();
    const email = `loaduser_${i}@loadtest.local`;
    const name = `Load User ${i}`;

    const token = jwt.sign(
      { id: userId.toString(), email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const goalId = new Types.ObjectId();
    const goalTitle = `Consistency Roadmap ${i}`;
    const taskId = new Types.ObjectId();

    userDocs.push({
      _id: userId,
      name,
      email,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    goalDocs.push({
      _id: goalId,
      userId,
      title: goalTitle,
      tagline: `Daily 20m focus for User ${i}`,
      category: 'learning',
      targetDays: 30,
      currentDay: 1,
      dailyCommitmentMinutes: 20,
      streak: 1,
      status: 'active',
      planOutline: [
        {
          phaseNumber: 1,
          title: 'Foundation',
          focus: 'Daily kickoff',
          dayRange: 'Days 1-7',
          tasksPlanned: 7,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    taskDocs.push({
      _id: taskId,
      userId,
      goalId,
      goalTitle,
      title: `Kickoff Task User ${i}`,
      description: 'Day 1 action for load testing',
      durationMinutes: 20,
      difficulty: 'easy',
      status: 'pending',
      dayNumber: 1,
      scheduledFor: 'Today',
      category: 'learning',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    usersData.push({
      index: i,
      userId: userId.toString(),
      email,
      password: 'Password123!',
      token,
      goalId: goalId.toString(),
      taskId: taskId.toString(),
    });
  }

  await User.insertMany(userDocs);
  await Goal.insertMany(goalDocs);
  await Task.insertMany(taskDocs);

  const outputPath = path.resolve(process.cwd(), 'backend/tests/load/users.json');
  fs.writeFileSync(outputPath, JSON.stringify(usersData, null, 2), 'utf-8');

  console.log(`[Seed] Successfully seeded ${USER_COUNT} users, goals, and tasks in dedicated database.`);
  console.log(`[Seed] Credentials written to: ${outputPath}`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});

