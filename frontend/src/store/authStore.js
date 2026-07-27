/**
 * Global auth state (Zustand). Holds the current user + bootstrap status and
 * exposes login / logout / refreshUser actions.
 */
import { create } from 'zustand';
import { authApi } from '../api/endpoints';
import { tokenStore } from '../api/client';

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true, // true until the initial /me bootstrap completes

  /** Called once on app start to restore the session from a stored token. */
  bootstrap: async () => {
    if (!tokenStore.access) {
      set({ loading: false });
      return;
    }
    try {
      const { data } = await authApi.me();
      set({ user: data.data.user, loading: false });
    } catch {
      tokenStore.clear();
      set({ user: null, loading: false });
    }
  },

  login: async (credentials) => {
    const { data } = await authApi.login(credentials);
    const { accessToken, refreshToken, user } = data.data;
    tokenStore.set({ accessToken, refreshToken });
    set({ user });
    return user;
  },

  registerCompany: async (body) => {
    const { data } = await authApi.registerCompany(body);
    const { accessToken, refreshToken, user } = data.data;
    tokenStore.set({ accessToken, refreshToken });
    set({ user });
    return user;
  },

  refreshUser: async () => {
    const { data } = await authApi.me();
    set({ user: data.data.user });
  },

  logout: async () => {
    try {
      await authApi.logout(tokenStore.refresh);
    } catch {
      /* ignore network errors on logout */
    }
    tokenStore.clear();
    set({ user: null });
  },
}));
