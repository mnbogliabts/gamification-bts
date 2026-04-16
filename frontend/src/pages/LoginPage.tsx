import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import ErrorMessage from '@components/ErrorMessage';

const pageStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: '#f1f5f9',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const cardStyle: React.CSSProperties = {
  width: 380,
  padding: '2rem',
  backgroundColor: '#fff',
  borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 1.5rem',
  fontSize: '1.5rem',
  fontWeight: 700,
  textAlign: 'center',
  color: '#1e1b4b',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#334155',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: '0.875rem',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem',
  backgroundColor: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const fieldGroup: React.CSSProperties = {
  marginBottom: '1rem',
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthLogin = () => {
    window.location.href = '/api/auth/oauth/google';
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Training Platform</h1>
        {error && <div style={{ marginBottom: '1rem' }}><ErrorMessage message={error} /></div>}
        <form onSubmit={handleSubmit}>
          <div style={fieldGroup}>
            <label style={labelStyle} htmlFor="username">Username</label>
            <input
              id="username"
              style={inputStyle}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle} htmlFor="password">Password</label>
            <input
              id="password"
              style={inputStyle}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }} type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', margin: '1rem 0 0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>or</div>
        <button
          style={{ ...btnStyle, backgroundColor: '#fff', color: '#334155', border: '1px solid #cbd5e1' }}
          onClick={handleOAuthLogin}
          type="button"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
