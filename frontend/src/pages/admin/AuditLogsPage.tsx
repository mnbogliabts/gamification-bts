import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '@services/api';
import Loading from '@components/Loading';
import ErrorMessage from '@components/ErrorMessage';
import type { AuditLog, PaginatedResponse } from '@app-types/index';

const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const th: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' };
const td: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#334155', borderBottom: '1px solid #f1f5f9' };
const inputStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.875rem' };
const filterRow: React.CSSProperties = { display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end' };
const label: React.CSSProperties = { fontSize: '0.8rem', color: '#475569', fontWeight: 500 };
const btnPrimary: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem' };
const btnDisabled: React.CSSProperties = { ...btnPrimary, backgroundColor: '#cbd5e1', cursor: 'not-allowed' };
const paginationRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem', color: '#475569' };
const actionBadge = (action: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; fg: string }> = {
    CREATE: { bg: '#dcfce7', fg: '#166534' },
    UPDATE: { bg: '#dbeafe', fg: '#1e40af' },
    DELETE: { bg: '#fee2e2', fg: '#991b1b' },
    LOGIN: { bg: '#fef3c7', fg: '#92400e' },
    LOGOUT: { bg: '#f1f5f9', fg: '#475569' },
  };
  const c = colors[action] || { bg: '#f1f5f9', fg: '#475569' };
  return { display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600, backgroundColor: c.bg, color: c.fg };
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (filterAction) params.set('action', filterAction);
    if (filterEntity) params.set('entityType', filterEntity);
    api.get<PaginatedResponse<AuditLog>>(`/audit-logs?${params}`)
      .then((res) => {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [page, filterAction, filterEntity]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const applyFilters = () => { setPage(1); };

  return (
    <div>
      <h2 style={{ margin: '0 0 1.25rem', color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>Audit Logs</h2>

      <div style={filterRow}>
        <div>
          <div style={label}>Action</div>
          <select style={inputStyle} value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>
        <div>
          <div style={label}>Entity Type</div>
          <select style={inputStyle} value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}>
            <option value="">All Types</option>
            <option value="User">User</option>
            <option value="TrainingRecord">Training Record</option>
            <option value="Technology">Technology</option>
            <option value="Session">Session</option>
          </select>
        </div>
        <button onClick={applyFilters} style={btnPrimary}>Apply</button>
      </div>

      {loading ? <Loading /> : error ? <ErrorMessage message={error} /> : (
        <>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Action</th>
                <th style={th}>Entity Type</th>
                <th style={th}>Entity ID</th>
                <th style={th}>Changes</th>
                <th style={th}>IP Address</th>
                <th style={th}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={6}>No logs found</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id}>
                  <td style={td}><span style={actionBadge(log.action)}>{log.action}</span></td>
                  <td style={td}>{log.entityType}</td>
                  <td style={{ ...td, fontSize: '0.75rem', fontFamily: 'monospace' }}>{log.entityId ? log.entityId.slice(0, 8) + '...' : '—'}</td>
                  <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {log.changes ? JSON.stringify(log.changes).slice(0, 60) : '—'}
                  </td>
                  <td style={td}>{log.ipAddress || '—'}</td>
                  <td style={td}>{format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={paginationRow}>
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={page <= 1 ? btnDisabled : btnPrimary} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button style={page >= pagination.totalPages ? btnDisabled : btnPrimary} disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
