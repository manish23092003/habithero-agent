import { Goal, DailyTask, CheckInRecord, GoalCategory } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('habithero_token');
  }

  public setToken(token: string): void {
    localStorage.setItem('habithero_token', token);
  }

  public removeToken(): void {
    localStorage.removeItem('habithero_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Backend server is unreachable. Please check if http://localhost:5000 is running.');
      }
      throw err;
    }
  }

  // --- Auth APIs ---
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await this.request<{ success: boolean; data: AuthResponse }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    this.setToken(res.data.token);
    return res.data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await this.request<{ success: boolean; data: AuthResponse }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.data.token);
    return res.data;
  }

  async getMe(): Promise<AuthUser> {
    const res = await this.request<{ success: boolean; data: AuthUser }>('/auth/me');
    return res.data;
  }

  logout(): void {
    this.removeToken();
  }

  // --- Goals APIs ---
  async getGoals(): Promise<Goal[]> {
    const res = await this.request<{ success: boolean; data: any[] }>('/goals');
    return res.data.map(g => ({
      id: g._id || g.id,
      title: g.title,
      tagline: g.tagline || '',
      category: g.category as GoalCategory,
      targetDays: g.targetDays,
      currentDay: g.currentDay || 1,
      dailyCommitmentMinutes: g.dailyCommitmentMinutes,
      streak: g.streak || 0,
      status: g.status,
      planOutline: g.planOutline || [],
      adaptationNotice: g.adaptationNotice,
      createdAt: g.createdAt,
    }));
  }

  async createGoal(goalData: {
    title: string;
    tagline?: string;
    category?: GoalCategory;
    targetDays?: number;
    dailyCommitmentMinutes?: number;
  }): Promise<{ goal: Goal; initialTask: DailyTask }> {
    const res = await this.request<{ success: boolean; data: { goal: any; initialTask: any } }>('/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
    const g = res.data.goal;
    const t = res.data.initialTask;

    const formattedGoal: Goal = {
      id: g._id || g.id,
      title: g.title,
      tagline: g.tagline || '',
      category: g.category as GoalCategory,
      targetDays: g.targetDays,
      currentDay: g.currentDay || 1,
      dailyCommitmentMinutes: g.dailyCommitmentMinutes,
      streak: g.streak || 0,
      status: g.status,
      planOutline: g.planOutline || [],
      adaptationNotice: g.adaptationNotice,
      createdAt: g.createdAt,
    };

    const formattedTask: DailyTask = {
      id: t._id || t.id,
      goalId: t.goalId,
      goalTitle: t.goalTitle,
      title: t.title,
      description: t.description || '',
      durationMinutes: t.durationMinutes,
      difficulty: t.difficulty || 'easy',
      status: t.status,
      dayNumber: t.dayNumber || 1,
      scheduledFor: t.scheduledFor || 'Today',
      category: t.category,
      adaptationNote: t.adaptationNote,
      completedAt: t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    };

    return { goal: formattedGoal, initialTask: formattedTask };
  }

  async deleteGoal(goalId: string): Promise<void> {
    await this.request(`/goals/${goalId}`, { method: 'DELETE' });
  }

  // --- Tasks APIs ---
  async getTodayTasks(): Promise<DailyTask[]> {
    const res = await this.request<{ success: boolean; data: any[] }>('/tasks/today');
    return res.data.map(t => ({
      id: t._id || t.id,
      goalId: t.goalId,
      goalTitle: t.goalTitle,
      title: t.title,
      description: t.description || '',
      durationMinutes: t.durationMinutes,
      difficulty: t.difficulty || 'easy',
      status: t.status,
      dayNumber: t.dayNumber || 1,
      scheduledFor: t.scheduledFor || 'Today',
      category: t.category,
      adaptationNote: t.adaptationNote,
      completedAt: t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    }));
  }

  async completeTask(taskId: string, completed: boolean): Promise<DailyTask> {
    const res = await this.request<{ success: boolean; data: any }>(`/tasks/${taskId}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    });
    const t = res.data;
    return {
      id: t._id || t.id,
      goalId: t.goalId,
      goalTitle: t.goalTitle,
      title: t.title,
      description: t.description || '',
      durationMinutes: t.durationMinutes,
      difficulty: t.difficulty || 'easy',
      status: t.status,
      dayNumber: t.dayNumber || 1,
      scheduledFor: t.scheduledFor || 'Today',
      category: t.category,
      adaptationNote: t.adaptationNote,
      completedAt: t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    };
  }

  async updateTask(taskId: string, updateData: Partial<DailyTask>): Promise<DailyTask> {
    const res = await this.request<{ success: boolean; data: any }>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
    const t = res.data;
    return {
      id: t._id || t.id,
      goalId: t.goalId,
      goalTitle: t.goalTitle,
      title: t.title,
      description: t.description || '',
      durationMinutes: t.durationMinutes,
      difficulty: t.difficulty || 'easy',
      status: t.status,
      dayNumber: t.dayNumber || 1,
      scheduledFor: t.scheduledFor || 'Today',
      category: t.category,
      adaptationNote: t.adaptationNote,
      completedAt: t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    };
  }

  // --- Check-Ins APIs ---
  async getTodayCheckIn(): Promise<CheckInRecord | null> {
    const res = await this.request<{ success: boolean; data: any }>('/checkins/today');
    if (!res.data) return null;
    return {
      id: res.data._id || res.data.id,
      date: res.data.date,
      status: res.data.status,
      completedTaskCount: res.data.completedTaskCount,
      totalTaskCount: res.data.totalTaskCount,
      missedReason: res.data.missedReason,
      reflection: res.data.reflection,
      agentAdaptation: res.data.agentAdaptation,
    };
  }

  async createCheckIn(record: {
    status: 'great' | 'partial' | 'missed';
    completedTaskCount: number;
    totalTaskCount: number;
    missedReason?: string;
    reflection?: string;
    adaptTomorrow?: boolean;
    goalId?: string;
  }): Promise<CheckInRecord> {
    const res = await this.request<{ success: boolean; data: any }>('/checkins', {
      method: 'POST',
      body: JSON.stringify(record),
    });
    const c = res.data;
    return {
      id: c._id || c.id,
      date: c.date,
      status: c.status,
      completedTaskCount: c.completedTaskCount,
      totalTaskCount: c.totalTaskCount,
      missedReason: c.missedReason,
      reflection: c.reflection,
      agentAdaptation: c.agentAdaptation,
    };
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService();
