import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'DRIVER' | 'OWNER' | 'ADMIN';
  createdAt: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, user: UserProfile) => void;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<UserProfile>) => void;
  checkAuth: () => Promise<void>;
}

export const API_URL = 
  import.meta.env.MODE === 'production'
    ? `${window.location.origin}/api`
    : import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: (accessToken, user) => {
    set({
      accessToken,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateUser: (updatedFields) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedFields } : null,
    }));
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // Attempt token refresh using httpOnly cookie
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        
        // Fetch full profile info
        const profileRes = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          set({
            accessToken: data.accessToken,
            user: profileData,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }
      // If refresh failed, reset auth state
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      console.error('Check auth error:', error);
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
