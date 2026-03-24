import { create } from 'zustand';
import axios from 'axios';
import { API_BASE } from '../api/config';

const REFRESH_PATH = '/auth/refresh';

/**
 * Auth store – JWT access token, user info
 * AT lưu trong memory (biến JS / state) – không persist
 * Refresh token nằm trong HTTP-only cookie (backend)
 */
export const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,

  setAuth: (accessToken, user) =>
    set({ accessToken, user }),

  updateUser: (userUpdates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...userUpdates } : null,
    })),

  logout: () =>
    set({ accessToken: null, user: null }),

  /** Khôi phục session từ refresh token (HTTP-only cookie) khi app load */
  tryRestoreSession: async () => {
    const { accessToken } = useAuthStore.getState();
    // Nếu user đã chủ động logout trên máy này, không tự restore lại
    if (localStorage.getItem('jt_skip_restore') === '1') return;
    if (accessToken) return; // Đã có AT trong memory
    try {
      const { data } = await axios.post(API_BASE + REFRESH_PATH, null, {
        withCredentials: true,
      });
      if (data?.success && data?.data?.accessToken) {
        set({
          accessToken: data.data.accessToken,
          user: data.data.user ?? null,
        });
      }
    } catch {
      // Không có refresh cookie hoặc hết hạn – giữ logged out
    }
  },
}));

/** Selector: derived from accessToken */
export const selectIsAuthenticated = (state) => !!state.accessToken;
