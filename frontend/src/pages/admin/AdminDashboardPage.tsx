import React, { useState, useEffect } from 'react';
import api from '@services/api';
import Loading from '@components/Loading';
import ErrorMessage from '@components/ErrorMessage';
import type { AdminAnalytics } from '@app-types/index';

const cardRow: React.CSSProperties = { display: 'flex', gap: '1rem', marginBottom: '1.5rem' };
const card: React.CSSProperties = { flex: 1, padding: '1.25rem', backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const cardLabel: React.CSSProperties = { fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '0.25rem' };
const cardValue: React.CSSProperties = { fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const th: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' };
const td: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#334155', borderBottom: '1px solid #f1f5f9' };
const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.875rem' };
const filterRow: React.CSSProperties = { display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' };
const label: React.CSSProperties = { fontSize: '0.8rem', color: '#475569', fontWeight: 500 };

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
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
    api.get<AdminAnalytics>(`/analytics/admin?${params}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div>
      <h2 style={{ margin: '0 0 1.25rem', color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>Admin Dashboard</h2>

      <div style={filterRow}>
        <div>
          <div style={label}>Start Date</div>
          <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <div style={label}>End Date</div>
          <input type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={fetchData} style={{ padding: '0.5rem 1rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem', alignSelf: 'flex-end' }}>
          Apply
        </button>
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && data && (
        <>
          <div style={cardRow}>
            <div style={card}><div style={cardLabel}>Total Hours</div><div style={cardValue}>{data.totalHours.toFixed(1)}</div></div>
            <div style={card}><div style={cardLabel}>Total Records</div><div style={cardValue}>{data.totalRecords}</div></div>
            <div style={card}><div style={cardLabel}>Employees</div><div style={cardValue}>{data.employeeCount}</div></div>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>Hours by Technology</div>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Technology</th>
                <th style={th}>Total Hours</th>
                <th style={th}>Records</th>
                <th style={th}>Employees</th>
              </tr>
            </thead>
            <tbody>
              {data.hoursByTechnology.length === 0 ? (
                <tr><td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={4}>No data</td></tr>
              ) : data.hoursByTechnology.map((t) => (
                <tr key={t.technologyId}>
                  <td style={td}>{t.technologyName}</td>
                  <td style={td}>{t.totalHours.toFixed(1)}</td>
                  <td style={td}>{t.recordCount}</td>
                  <td style={td}>{t.employeeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
