import React, { useState, useEffect } from 'react';
import api from '@services/api';
import Loading from '@components/Loading';
import ErrorMessage from '@components/ErrorMessage';
import type { TechnologySummary } from '@app-types/index';

const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const th: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' };
const td: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#334155', borderBottom: '1px solid #f1f5f9' };
const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.875rem' };
const filterRow: React.CSSProperties = { display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'flex-end' };
const label: React.CSSProperties = { fontSize: '0.8rem', color: '#475569', fontWeight: 500 };
const btnPrimary: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem' };

export default function AnalyticsPage() {
  const [data, setData] = useState<TechnologySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    api.get<TechnologySummary[]>(`/analytics/technologies?${params}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const payload: any = {};
      if (startDate) payload.startDate = startDate;
      if (endDate) payload.endDate = endDate;
      const res = await api.post('/analytics/export', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>Technology Analytics</h2>
        <button style={{ ...btnPrimary, backgroundColor: '#059669', opacity: exporting ? 0.7 : 1 }} onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div style={filterRow}>
        <div><div style={label}>Start Date</div><input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div><div style={label}>End Date</div><input type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <button onClick={fetchData} style={btnPrimary}>Apply</button>
      </div>

      {loading ? <Loading /> : error ? <ErrorMessage message={error} /> : (
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
            {data.length === 0 ? (
              <tr><td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={4}>No data</td></tr>
            ) : data.map((t) => (
              <tr key={t.technologyId}>
                <td style={{ ...td, fontWeight: 500 }}>{t.technologyName}</td>
                <td style={{ ...td, fontWeight: 600, color: '#4f46e5' }}>{t.totalHours.toFixed(1)}</td>
                <td style={td}>{t.recordCount}</td>
                <td style={td}>{t.employeeCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
