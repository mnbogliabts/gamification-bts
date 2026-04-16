import React from 'react';

const spinnerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '2rem',
};

const dotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  margin: '0 4px',
  borderRadius: '50%',
  backgroundColor: '#4f46e5',
  animation: 'pulse 1.4s infinite ease-in-out',
};

export default function Loading() {
  return (
    <div style={spinnerStyle}>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{ ...dotStyle, animationDelay: '0s' }} />
      <div style={{ ...dotStyle, animationDelay: '0.2s' }} />
      <div style={{ ...dotStyle, animationDelay: '0.4s' }} />
    </div>
  );
}
