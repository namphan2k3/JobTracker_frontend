import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

/**
 * POST /auth/register
 * @param {{ companyName: string, email: string, password: string, firstName: string, lastName: string, phone?: string }}
 */
export async function register(payload) {
  const { data } = await apiClient.post('/auth/register', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Đăng ký thất bại');
  }
  return data.data;
}

/**
 * POST /auth/login
 * @param {{ email: string, password: string }}
 */
export async function login({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  if (!data?.success || !data?.data) {
    throw new Error(data?.message || 'Đăng nhập thất bại');
  }
  const { user, accessToken, expiresAt } = data.data;
  // User đã login thành công → cho phép restore session lần sau
  localStorage.removeItem('jt_skip_restore');
  useAuthStore.getState().setAuth(accessToken, user);
  return { user, accessToken, expiresAt };
}

/**
 * POST /auth/verify-email
 * @param {{ token: string }}
 */
export async function verifyEmail({ token }) {
  const { data } = await apiClient.post('/auth/verify-email', { token });
  if (!data?.success) {
    throw new Error(data?.message || 'Xác thực email thất bại');
  }
  return data.data;
}

/**
 * POST /auth/resend-verification
 * @param {{ email: string }}
 */
export async function resendVerification({ email }) {
  const { data } = await apiClient.post('/auth/resend-verification', { email });
  if (!data?.success) {
    throw new Error(data?.message || 'Gửi email xác thực thất bại');
  }
  return data;
}

/**
 * POST /auth/forgot-password
 * @param {{ email: string }}
 */
export async function forgotPassword({ email }) {
  const { data } = await apiClient.post('/auth/forgot-password', { email });
  if (!data?.success) {
    throw new Error(data?.message || 'Gửi email reset mật khẩu thất bại');
  }
  return data;
}

/**
 * POST /auth/reset-password
 * @param {{ token: string, newPassword: string }}
 */
export async function resetPassword({ token, newPassword }) {
  const { data } = await apiClient.post('/auth/reset-password', {
    token,
    newPassword,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Đặt lại mật khẩu thất bại');
  }
  return data;
}

/**
 * POST /auth/accept-invite
 * @param {{ token: string, password: string }}
 */
export async function acceptInvite({ token, password }) {
  const { data } = await apiClient.post('/auth/accept-invite', {
    token,
    password,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Chấp nhận lời mời thất bại');
  }
  return data.data;
}

/**
 * POST /auth/logout
 */
export async function logout() {
  const token = useAuthStore.getState().accessToken;
  try {
    if (token) {
      await apiClient.post('/auth/logout', { accessToken: token });
    }
  } finally {
    // Đánh dấu user đã chủ động logout trên máy này → không auto restore bằng refresh token nữa
    try {
      localStorage.setItem('jt_skip_restore', '1');
    } catch {
      // ignore
    }
    useAuthStore.getState().logout();
  }
}
