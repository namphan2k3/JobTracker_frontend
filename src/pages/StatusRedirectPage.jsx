import { Navigate, useSearchParams } from 'react-router-dom';

export function StatusRedirectPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/public/applications/${encodeURIComponent(token)}/status`} replace />;
}

export function VerifyEmailRedirectPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Navigate to={`/auth/verify-email?token=${encodeURIComponent(token)}`} replace />;
}

export function AcceptInviteRedirectPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Navigate to={`/auth/accept-invite?token=${encodeURIComponent(token)}`} replace />;
}

export function ResetPasswordRedirectPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return <Navigate to="/auth/forgot-password" replace />;
  }

  return <Navigate to={`/auth/reset-password?token=${encodeURIComponent(token)}`} replace />;
}

