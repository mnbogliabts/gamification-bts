import React from 'react';

interface ErrorMessageProps {
  message: string;
}

const errorStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  backgroundColor: '#fef2f2',
  color: '#b91c1c',
  border: '1px solid #fecaca',
  borderRadius: 6,
  fontSize: '0.875rem',
};

export default function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;
  return <div style={errorStyle}>{message}</div>;
}
