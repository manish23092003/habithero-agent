import { Goal, DailyTask, CheckInRecord, GoalCategory, UserAnalytics } from '../types';

const isProd = Boolean((import.meta as any).env?.PROD);

/**
 * Normalizes the API base URL to ensure:
 * 1. Trailing slashes are stripped.
 * 2. It always ends with '/api' (handling inputs with or without '/api').
 * 3. Fallbacks to '/api' in production or 'http://localhost:5000/api' in development.
 */
export const normalizeApiBaseUrl = (rawUrl?: string | null, isProduction: boolean = isProd): string => {
  const fallback = isProduction ? '/api' : 'http://localhost:5000/api';
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return fallback;
  }
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return fallback;
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

/**
 * Resolves full request URL, safely preventing duplicate '/api/api' paths
 * if an endpoint already includes the '/api' prefix.
 */
export const resolveApiUrl = (baseUrl: string, endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const finalPath = baseUrl.endsWith('/api') && cleanEndpoint.startsWith('/api/')
    ? cleanEndpoint.slice(4)
    : cleanEndpoint;
  return `${baseUrl}${finalPath}`;
};

const API_BASE_URL = normalizeApiBaseUrl((import.meta as any).env?.VITE_API_URL, isProd);

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  fetchAddress?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

class ApiService {
  public getToken(): string | null {
    return localStorage.getItem('habithero_token');
  }

  public hasToken(): boolean {
    return !!this.getToken();
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

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = resolveApiUrl(API_BASE_URL, cleanEndpoint);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const isAuthEndpoint =
          cleanEndpoint.startsWith('/auth/login') ||
          cleanEndpoint.startsWith('/auth/register') ||
          cleanEndpoint.startsWith('/auth/google') ||
          cleanEndpoint.startsWith('/auth/forgot-password') ||
          cleanEndpoint.startsWith('/auth/reset-password') ||
          cleanEndpoint.startsWith('/api/auth/login') ||
          cleanEndpoint.startsWith('/api/auth/register') ||
          cleanEndpoint.startsWith('/api/auth/google') ||
          cleanEndpoint.startsWith('/api/auth/forgot-password') ||
          cleanEndpoint.startsWith('/api/auth/reset-password');

        if (response.status === 401 && !isAuthEndpoint) {
          this.removeToken();
        }
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error(
          isProd
            ? 'Backend server is temporarily unreachable. Please check your network connection and try again.'
            : 'Backend server is unreachable. Please verify http://localhost:5000 is running.'
        );
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

  async googleAuth(idToken: string): Promise<AuthResponse & { isNewUser?: boolean }> {
    const res = await this.request<{ success: boolean; data: AuthResponse & { isNewUser?: boolean } }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    this.setToken(res.data.token);
    return res.data;
  }

  async getMe(): Promise<AuthUser> {
    const res = await this.request<{ success: boolean; data: AuthUser }>('/auth/me');
    return res.data;
  }

  async updateProfile(data: string | { name?: string; fetchAddress?: string }): Promise<AuthUser> {
    const payload = typeof data === 'string' ? { name: data } : data;
    const res = await this.request<{ success: boolean; data: AuthUser }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
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

  async getGoalById(goalId: string): Promise<Goal> {
    const res = await this.request<{ success: boolean; data: any }>(`/goals/${goalId}`);
    const g = res.data;
    return {
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
  }

  async createGoal(goalData: {
    title: string;
    tagline?: string;
    category?: GoalCategory;
    targetDays?: number;
    dailyCommitmentMinutes?: number;
    idempotencyKey?: string;
  }): Promise<{ goal: Goal; initialTask: DailyTask }> {
    const key = goalData.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    const payload = { ...goalData, idempotencyKey: key };
    const res = await this.request<{ success: boolean; data: { goal: any; initialTask: any } }>('/goals', {
      method: 'POST',
      headers: {
        'Idempotency-Key': key,
      },
      body: JSON.stringify(payload),
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

  async updateGoal(goalId: string, updateData: Partial<Goal>): Promise<Goal> {
    const res = await this.request<{ success: boolean; data: any }>(`/goals/${goalId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
    const g = res.data;
    return {
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
      completedDate: t.completedDate,
      completedAt: t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    }));
  }

  async getAllTasks(): Promise<DailyTask[]> {
    const res = await this.request<{ success: boolean; data: any[] }>('/tasks');
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
      completedDate: t.completedDate,
      completedAt: t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    }));
  }

  async createTask(taskData: {
    goalId: string;
    title: string;
    description?: string;
    durationMinutes: number;
    difficulty?: 'easy' | 'moderate' | 'challenging';
    scheduledFor?: string;
    dayNumber?: number;
    category?: GoalCategory;
    idempotencyKey?: string;
  }): Promise<DailyTask> {
    const key = taskData.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    const payload = { ...taskData, idempotencyKey: key };
    const res = await this.request<{ success: boolean; data: any }>('/tasks', {
      method: 'POST',
      headers: {
        'Idempotency-Key': key,
      },
      body: JSON.stringify(payload),
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

  async completeTask(taskId: string, completed: boolean, clientDate?: string): Promise<DailyTask> {
    const dateToSend = clientDate || new Date().toLocaleDateString('en-CA');
    const res = await this.request<{ success: boolean; data: any }>(`/tasks/${taskId}/complete`, {
      method: 'PATCH',
      headers: {
        'X-Client-Date': dateToSend,
      },
      body: JSON.stringify({ completed, clientDate: dateToSend }),
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
  async getCheckIns(): Promise<CheckInRecord[]> {
    const res = await this.request<{ success: boolean; data: any[] }>('/checkins');
    return res.data.map(c => ({
      id: c._id || c.id,
      date: c.date,
      status: c.status,
      completedTaskCount: c.completedTaskCount,
      totalTaskCount: c.totalTaskCount,
      missedReason: c.missedReason,
      reflection: c.reflection,
      agentAdaptation: c.agentAdaptation,
    }));
  }

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

  // --- Chat APIs ---
  async sendChatMessage(message: string, conversationId?: string): Promise<{
    reply: string;
    conversationId: string;
    toolsExecuted: any[];
    actionProposal?: any;
    apiKeyMissing?: boolean;
  }> {
    const res = await this.request<{
      success: boolean;
      data: {
        reply: string;
        conversationId: string;
        toolsExecuted: any[];
        actionProposal?: any;
        apiKeyMissing?: boolean;
      };
    }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    });
    return res.data;
  }

  async getChatConversations(): Promise<any[]> {
    const res = await this.request<{ success: boolean; data: any[] }>('/chat/conversations');
    if (!res || !Array.isArray(res.data)) {
      throw new Error('Invalid conversation list received from server');
    }
    return res.data;
  }

  async createChatConversation(title?: string): Promise<any> {
    const res = await this.request<{ success: boolean; data: any }>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return res.data;
  }

  async getChatConversation(id: string): Promise<{ conversation: any; messages: any[] }> {
    if (!id || id === 'undefined') {
      return { conversation: null, messages: [] };
    }
    const res = await this.request<{ success: boolean; data: { conversation: any; messages: any[] } }>(`/chat/conversations/${id}`);
    if (!res || !res.data) {
      throw new Error('Invalid conversation history received from server');
    }
    return res.data;
  }

  async deleteChatConversation(id: string): Promise<void> {
    await this.request(`/chat/conversations/${id}`, { method: 'DELETE' });
  }

  async getAnalytics(clientDate?: string): Promise<UserAnalytics> {
    const dateQuery = clientDate ? `?date=${encodeURIComponent(clientDate)}` : '';
    const res = await this.request<{ success: boolean; data: UserAnalytics }>(`/analytics${dateQuery}`, {
      headers: clientDate ? { 'X-Client-Date': clientDate } : {},
    });
    return res.data;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const url = resolveApiUrl(API_BASE_URL, '/health');
      const res = await fetch(url);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService();
