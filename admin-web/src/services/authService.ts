import { api } from './api';
import type { User } from '../types';

const TOKEN_KEY = 'medilink_admin_token';
const USER_KEY = 'medilink_admin_user';

export interface LoginResponse {
  status: string;
  message: string;
  accessToken: string;
  setUp?: boolean;
}

export const authService = {
  async login(email: string, password: string):Promise<{ token: string; user: User }> {
    const response = await api.post<LoginResponse>('/auth/login/email', {
      email,
      password,
    });

    const token = response.data.accessToken;
    if (!token) {
      throw new Error('No access token received from authentication server.');
    }

    localStorage.setItem(TOKEN_KEY, token);

    // Fetch user details & roles to ensure administrator access
    const user = await this.getMe();

    const isAdmin =
      user.roles?.includes('SUPER_ADMIN') ||
      user.roles?.includes('HOSPITAL_ADMIN') ||
      Boolean(user.superAdmin) ||
      Boolean(user.hospitalAdmin);

    if (!isAdmin) {
      this.logout();
      throw new Error(
        'Access Denied: This account is not authorized as an administrator. Only SuperAdmin or HospitalAdmin accounts may access this portal.'
      );
    }

    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return { token, user };
  },

  async getMe(): Promise<User> {
    const response = await api.get<{ status: string; data: User }>('/users/myinfo');
    const user = response.data.data;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },

  logout(): void {
    try {
      api.post('/auth/logout').catch(() => {});
    } catch (_) {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  },

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    return Boolean(
      user.roles?.includes('SUPER_ADMIN') ||
      user.roles?.includes('HOSPITAL_ADMIN') ||
      user.superAdmin ||
      user.hospitalAdmin
    );
  },
};
