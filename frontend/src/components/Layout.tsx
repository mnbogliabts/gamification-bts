import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const sidebarStyle: React.CSSProperties = {
  width: 240,
  backgroundColor: '#1e1b4b',
  color: '#e0e7ff',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
};

const logoStyle: React.CSSProperties = {
  padding: '1.25rem 1rem',
  fontSize: '1.1rem',
  fontWeight: 700,
  borderBottom: '1px solid #312e81',
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.75rem 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const linkBase: React.CSSProperties = {
  display: 'block',
  padding: '0.6rem 1rem',
  color: '#c7d2fe',
  textDecoration: 'none',
  fontSize: '0.875rem',
  borderLeft: '3px solid transparent',
  transition: 'background-color 0.15s',
};

const linkActive: React.CSSProperties = {
  ...linkBase,
  backgroundColor: '#312e81',
  color: '#fff',
  borderLeftColor: '#818cf8',
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#f8fafc',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: '0.75rem 1.5rem',
  backgroundColor: '#fff',
  borderBottom: '1px solid #e2e8f0',
  gap: '1rem',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  padding: '1.5rem',
};

const logoutBtnStyle: React.CSSProperties = {
  padding: '0.4rem 0.75rem',
  backgroundColor: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.8rem',
};

const sectionLabel: React.CSSProperties = {
  padding: '0.75rem 1rem 0.25rem',
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#818cf8',
  fontWeight: 600,
};

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties =>
    isActive ? linkActive : linkBase;

  return (
    <div style={layoutStyle}>
      <aside style={sidebarStyle}>
        <div style={logoStyle}>Training Platform</div>
        <nav style={navStyle}>
          <NavLink to="/dashboard" style={navLinkStyle}>Dashboard</NavLink>
          {isAdmin && (
            <>
              <div style={sectionLabel}>Admin</div>
              <NavLink to="/admin" end style={navLinkStyle}>Overview</NavLink>
              <NavLink to="/admin/users" style={navLinkStyle}>Users</NavLink>
              <NavLink to="/admin/training-records" style={navLinkStyle}>Training Records</NavLink>
              <NavLink to="/admin/leaderboard" style={navLinkStyle}>Leaderboard</NavLink>
              <NavLink to="/admin/technologies" style={navLinkStyle}>Technologies</NavLink>
              <NavLink to="/admin/analytics" style={navLinkStyle}>Analytics</NavLink>
              <NavLink to="/admin/audit-logs" style={navLinkStyle}>Audit Logs</NavLink>
            </>
          )}
        </nav>
      </aside>
      <div style={mainStyle}>
        <header style={headerStyle}>
          <span style={{ fontSize: '0.875rem', color: '#475569' }}>
            {user?.username} ({user?.role})
          </span>
          <button style={logoutBtnStyle} onClick={handleLogout}>Logout</button>
        </header>
        <main style={contentStyle}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
