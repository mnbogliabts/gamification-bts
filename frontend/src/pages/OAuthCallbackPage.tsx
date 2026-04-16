import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import Loading from '@components/Loading';
import ErrorMessage from '@components/ErrorMessage';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        loginWithToken(token, user);
        navigate('/dashboard', { replace: true });
      } catch {
        setError('Failed to process authentication response.');
      }
    } else {
      setError('Invalid callback parameters.');
    }
  }, [searchParams, loginWithToken, navigate]);

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <ErrorMessage message={error} />
        <a href="/login" style={{ color: '#4f46e5' }}>Back to Login</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Loading />
    </div>
  );
}
