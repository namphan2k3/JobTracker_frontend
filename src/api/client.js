import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { API_BASE } from './config';

const REFRESH_PATH = '/auth/refresh';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/** Gắn accessToken vào mỗi request */
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

/** 401 → refresh token → retry (trừ /auth/refresh và /auth/login) */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !url.includes(REFRESH_PATH) &&
      !url.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(API_BASE + REFRESH_PATH, null, {
          withCredentials: true,
        });
        if (data?.success && data?.data?.accessToken) {
          useAuthStore.getState().setAuth(data.data.accessToken, data.data.user);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);
