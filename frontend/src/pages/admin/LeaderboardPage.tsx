import React, { useState, useEffect } from 'react';
import api from '@services/api';
import Loading from '@components/Loading';
import ErrorMessage from '@components/ErrorMessage';
import type { LeaderboardEntry } from '@app-types/index';

const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const th: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' };
const td: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#334155', borderBottom: '1px solid #f1f5f9' };
const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.875rem' };
const filterRow: React.CSSProperties = { display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'flex-end' };
const label: React.CSSProperties = { fontSize: '0.8rem', color: '#475569', fontWeight: 500 };
const rankBadge = (rank: number): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: '50%', fontWeight: 700, fontSize: '0.8rem',
  backgroundColor: rank === 1 ? '#fef3c7' : rank === 2 ? '#f1f5f9' : rank === 3 ? '#fed7aa' : '#f8fafc',
  color: rank === 1 ? '#92400e' : rank === 2 ? '#475569' : rank === 3 ? '#9a3412' : '#64748b',
});

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    api.get<LeaderboardEntry[]>(`/analytics/leaderboard?${params}`)
      .then((res) => setEntries(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load leaderboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      <h2 style={{ margin: '0 0 1.25rem', color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>Leaderboard</h2>
      <div style={filterRow}>
        <div><div style={label}>Start Date</div><input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div><div style={label}>End Date</div><input type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <button onClick={fetchData} style={{ padding: '0.5rem 1rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem' }}>Apply</button>
      </div>
      {loading ? <Loading /> : error ? <ErrorMessage message={error} /> : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Rank</th>
              <th style={th}>Employee</th>
              <th style={th}>Email</th>
              <th style={th}>Total Hours</th>
              <th style={th}>Records</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={5}>No data</td></tr>
            ) : entries.map((e) => (
              <tr key={e.userId}>
                <td style={td}><span style={rankBadge(e.rank)}>{e.rank}</span></td>
                <td style={{ ...td, fontWeight: 500 }}>{e.displayName || e.username}</td>
                <td style={td}>{e.email}</td>
                <td style={{ ...td, fontWeight: 600, color: '#4f46e5' }}>{e.totalHours.toFixed(1)}</td>
                <td style={td}>{e.recordCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
