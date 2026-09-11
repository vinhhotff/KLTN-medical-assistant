import { create } from 'zustand';
import { api } from '../services/api';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  status: string;
  avatarUrl?: string;
  doctorProfile?: any;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null, token?: string) => void;
  fetchCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
}

// Initial state from localStorage for zero-flicker persistence
const storedUserJson = localStorage.getItem('mediassist_user');
let initialUser: UserProfile | null = null;
if (storedUserJson) {
  try {
    initialUser = JSON.parse(storedUserJson);
  } catch {
    localStorage.removeItem('mediassist_user');
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isLoading: false,
  isAuthenticated: !!initialUser,

  setUser: (user, token) => {
    if (user) {
      localStorage.setItem('mediassist_user', JSON.stringify(user));
      if (token) {
        localStorage.setItem('mediassist_token', token);
      }
    } else {
      localStorage.removeItem('mediassist_user');
      localStorage.removeItem('mediassist_token');
    }

    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },

  fetchCurrentUser: async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data?.data?.user || res.data?.data;
      if (res.data?.success && userData) {
        localStorage.setItem('mediassist_user', JSON.stringify(userData));
        set({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        localStorage.removeItem('mediassist_user');
        localStorage.removeItem('mediassist_token');
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      localStorage.removeItem('mediassist_user');
      localStorage.removeItem('mediassist_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('mediassist_user');
      localStorage.removeItem('mediassist_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
      window.location.href = '/login';
    }
  },
}));
