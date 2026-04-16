import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '@contexts/AuthContext';
import api from '@services/api';
import Loading from '@components/Loading';
import ErrorMessage from '@components/ErrorMessage';
import FileDownloadModal from '@components/FileDownloadModal';
import type {
  EmployeeDashboard,
  AdminAnalytics,
  Technology,
  LeaderboardEntry,
  TrainingRecord,
  TrainingFile,
} from '@app-types/index';

const cardRow: React.CSSProperties = { display: 'flex', gap: '1rem', marginBottom: '1.5rem' };
const card: React.CSSProperties = {
  flex: 1,
  padding: '1.25rem',
  backgroundColor: '#fff',
  borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};
const cardLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#64748b',
  marginBottom: '0.25rem',
};
const cardValue: React.CSSProperties = { fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' };
const sectionTitle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '0.75rem',
};
const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: '#fff',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#64748b',
  borderBottom: '2px solid #e2e8f0',
  backgroundColor: '#f8fafc',
};
const td: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#334155',
  borderBottom: '1px solid #f1f5f9',
};
const btnPrimary: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 500,
};
const btnSecondary: React.CSSProperties = { ...btnPrimary, backgroundColor: '#64748b' };
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: '0.875rem',
  boxSizing: 'border-box' as const,
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#334155',
};
const fieldGroup: React.CSSProperties = { marginBottom: '0.75rem' };
const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.3)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
};
const modal: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 8,
  padding: '1.5rem',
  width: 460,
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};
const successMsg: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  backgroundColor: '#dcfce7',
  color: '#166534',
  borderRadius: 4,
  fontSize: '0.8rem',
  marginBottom: '1rem',
};
const rankBadge = (rank: number): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: '50%',
  fontWeight: 700,
  fontSize: '0.8rem',
  backgroundColor:
    rank === 1 ? '#fef3c7' : rank === 2 ? '#f1f5f9' : rank === 3 ? '#fed7aa' : '#f8fafc',
  color: rank === 1 ? '#92400e' : rank === 2 ? '#475569' : rank === 3 ? '#9a3412' : '#64748b',
});

const COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#84cc16',
  '#f97316',
];

interface RecordForm {
  technologyId: string;
  title: string;
  description: string;
  hours: string;
  completedDate: string;
}
const emptyForm: RecordForm = {
  technologyId: '',
  title: '',
  description: '',
  hours: '',
  completedDate: '',
};

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [employeeData, setEmployeeData] = useState<EmployeeDashboard | null>(null);
  const [adminData, setAdminData] = useState<AdminAnalytics | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentRecords, setRecentRecords] = useState<TrainingRecord[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<RecordForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedRecordFiles, setSelectedRecordFiles] = useState<TrainingFile[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [showFileModal, setShowFileModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [techRes] = await Promise.all([api.get<Technology[]>('/technologies')]);
      setTechnologies(techRes.data);

      if (isAdmin) {
        const [analyticsRes, leaderboardRes, recordsRes] = await Promise.all([
          api.get<AdminAnalytics>('/analytics/admin'),
          api.get<LeaderboardEntry[]>('/analytics/leaderboard'),
          api.get<TrainingRecord[]>('/training-records'),
        ]);
        setAdminData(analyticsRes.data);
        setLeaderboard(leaderboardRes.data);
        setRecentRecords(recordsRes.data);
      } else {
        const res = await api.get<EmployeeDashboard>('/analytics/dashboard');
        setEmployeeData(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim() || !form.technologyId || !form.hours) {
      setFormError('Title, technology, and hours are required');
      return;
    }
    const hours = parseFloat(form.hours);
    if (isNaN(hours) || hours < 0.5 || hours > 1000) {
      setFormError('Hours must be between 0.5 and 1000');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/training-records', {
        userId: user?.id,
        technologyId: form.technologyId,
        title: form.title,
        description: form.description || ' ',
        hours,
        completedDate: form.completedDate || undefined,
      });
      setSuccess('Training record created');
      closeModal();
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedRecordId || !e.target.files?.length) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/training-records/${selectedRecordId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('File uploaded');
      fetchData();
      setSelectedRecordId(null);
      setSelectedRecordFiles([]);
      setShowFileModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    }
    e.target.value = '';
  };

  const handleFileDelete = async (fileId: string) => {
    if (!selectedRecordId) return;
    try {
      await api.delete(`/training-records/${selectedRecordId}/files/${fileId}`);
      setSuccess('File deleted');
      fetchData();
      setSelectedRecordFiles((prev) => prev.filter((f) => f.id !== fileId));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete file');
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  const techMap = Object.fromEntries(technologies.map((t) => [t.id, t.name]));

  // Admin view
  if (isAdmin && adminData) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>
            Dashboard
          </h2>
          <button style={btnPrimary} onClick={openCreate}>
            Add Training
          </button>
        </div>
        {success && <div style={successMsg}>{success}</div>}

        <div style={cardRow}>
          <div style={card}>
            <div style={cardLabel}>Total Hours</div>
            <div style={cardValue}>{adminData.totalHours.toFixed(1)}</div>
          </div>
          <div style={card}>
            <div style={cardLabel}>Total Records</div>
            <div style={cardValue}>{adminData.totalRecords}</div>
          </div>
          <div style={card}>
            <div style={cardLabel}>Employees</div>
            <div style={cardValue}>{adminData.employeeCount}</div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={sectionTitle}>Hours by Technology</div>
          {adminData.hoursByTechnology.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
              No data yet
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: '2rem',
                alignItems: 'center',
                backgroundColor: '#fff',
                padding: '1.5rem',
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ width: 300, height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={adminData.hoursByTechnology}
                      dataKey="totalHours"
                      nameKey="technologyName"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {adminData.hoursByTechnology.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)} hrs`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1 }}>
                <table style={{ ...table, boxShadow: 'none' }}>
                  <thead>
                    <tr>
                      <th style={th}>Technology</th>
                      <th style={th}>Hours</th>
                      <th style={th}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.hoursByTechnology.map((t, i) => {
                      const total = adminData.totalHours;
                      const percent = total > 0 ? (t.totalHours / total) * 100 : 0;
                      return (
                        <tr key={t.technologyId}>
                          <td
                            style={{ ...td, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                          >
                            <span
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 2,
                                backgroundColor: COLORS[i % COLORS.length],
                              }}
                            ></span>
                            {t.technologyName}
                          </td>
                          <td style={{ ...td, fontWeight: 600, color: '#4f46e5' }}>
                            {t.totalHours.toFixed(1)}
                          </td>
                          <td style={td}>{percent.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={sectionTitle}>Employee Ranking</div>
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
              {leaderboard.length === 0 ? (
                <tr>
                  <td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={5}>
                    No data yet
                  </td>
                </tr>
              ) : (
                leaderboard.map((e) => (
                  <tr key={e.userId}>
                    <td style={td}>
                      <span style={rankBadge(e.rank)}>{e.rank}</span>
                    </td>
                    <td style={{ ...td, fontWeight: 500 }}>{e.displayName || e.username}</td>
                    <td style={td}>{e.email}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#4f46e5' }}>
                      {e.totalHours.toFixed(1)}
                    </td>
                    <td style={td}>{e.recordCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <div style={sectionTitle}>Recent Records</div>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Title</th>
                <th style={th}>Technology</th>
                <th style={th}>Hours</th>
                <th style={th}>Files</th>
                <th style={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.length === 0 ? (
                <tr>
                  <td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={5}>
                    No records yet
                  </td>
                </tr>
              ) : (
                recentRecords.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{r.title}</td>
                    <td style={td}>{techMap[r.technologyId] || r.technologyId}</td>
                    <td style={td}>{r.hours}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {(r.files?.length || 0) > 0 ? (
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: '#4f46e5',
                              fontSize: '0.875rem',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecordId(r.id);
                              setSelectedRecordFiles(r.files || []);
                              setShowFileModal(true);
                            }}
                          >
                            📎 {r.files?.length}
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>0</span>
                        )}
                        <button
                          style={{
                            padding: '0.2rem 0.5rem',
                            backgroundColor: '#0ea5e9',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecordId(r.id);
                            setSelectedRecordFiles(r.files || []);
                            setShowFileModal(false);
                            document.getElementById('employee-file-upload')?.click();
                          }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td style={td}>{format(new Date(r.createdAt), 'MMM d, yyyy')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {renderModal()}
        <FileDownloadModal
          isOpen={showFileModal}
          onClose={() => {
            setSelectedRecordId(null);
            setSelectedRecordFiles([]);
            setShowFileModal(false);
          }}
          files={selectedRecordFiles}
          trainingRecordId={selectedRecordId || ''}
          onDelete={handleFileDelete}
        />
      </div>
    );
  }

  // Employee view
  if (!employeeData) return null;
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>
          Welcome, {user?.username}
        </h2>
        <button style={btnPrimary} onClick={openCreate}>
          Add Training
        </button>
      </div>
      {success && <div style={successMsg}>{success}</div>}

      <div style={cardRow}>
        <div style={card}>
          <div style={cardLabel}>Total Hours</div>
          <div style={cardValue}>{employeeData.totalHours.toFixed(1)}</div>
        </div>
        <div style={card}>
          <div style={cardLabel}>Total Records</div>
          <div style={cardValue}>{employeeData.totalRecords}</div>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={sectionTitle}>Hours by Technology</div>
        {employeeData.hoursByTechnology.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No data yet</div>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              alignItems: 'center',
              backgroundColor: '#fff',
              padding: '1.5rem',
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ width: 250, height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={employeeData.hoursByTechnology}
                    dataKey="totalHours"
                    nameKey="technologyName"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {employeeData.hoursByTechnology.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)} hrs`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1 }}>
              <table style={{ ...table, boxShadow: 'none' }}>
                <thead>
                  <tr>
                    <th style={th}>Technology</th>
                    <th style={th}>Hours</th>
                    <th style={th}>Records</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeData.hoursByTechnology.map((t, i) => (
                    <tr key={t.technologyId}>
                      <td style={{ ...td, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 2,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        ></span>
                        {t.technologyName}
                      </td>
                      <td style={{ ...td, fontWeight: 600, color: '#4f46e5' }}>
                        {t.totalHours.toFixed(1)}
                      </td>
                      <td style={td}>{t.recordCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div>
        <div style={sectionTitle}>Recent Records</div>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Title</th>
              <th style={th}>Hours</th>
              <th style={th}>Files</th>
              <th style={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {employeeData.recentRecords.length === 0 ? (
              <tr>
                <td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={4}>
                  No records yet
                </td>
              </tr>
            ) : (
              employeeData.recentRecords.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.title}</td>
                  <td style={td}>{r.hours}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {(r.files?.length || 0) > 0 ? (
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: '#4f46e5',
                            fontSize: '0.875rem',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecordId(r.id);
                            setSelectedRecordFiles(r.files || []);
                            setShowFileModal(true);
                          }}
                        >
                          📎 {r.files?.length}
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>0</span>
                      )}
                      <button
                        style={{
                          padding: '0.2rem 0.5rem',
                          backgroundColor: '#0ea5e9',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecordId(r.id);
                          setSelectedRecordFiles(r.files || []);
                          setShowFileModal(false);
                          document.getElementById('employee-file-upload')?.click();
                        }}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td style={td}>{format(new Date(r.createdAt), 'MMM d, yyyy')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <input
        id="employee-file-upload"
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept=".pdf,.png,.jpg,.jpeg,.docx"
      />

      {renderModal()}
      <FileDownloadModal
        isOpen={showFileModal}
        onClose={() => {
          setSelectedRecordId(null);
          setSelectedRecordFiles([]);
          setShowFileModal(false);
        }}
        files={selectedRecordFiles}
        trainingRecordId={selectedRecordId || ''}
        onDelete={handleFileDelete}
      />
    </div>
  );

  function renderModal() {
    if (!showModal) return null;
    return (
      <div style={overlay} onClick={closeModal}>
        <div style={modal} onClick={(e) => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 1rem', color: '#1e293b' }}>Add Training Record</h3>
          {formError && (
            <div style={{ marginBottom: '0.75rem' }}>
              <ErrorMessage message={formError} />
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={fieldGroup}>
              <label style={labelStyle}>Technology</label>
              <select
                style={inputStyle}
                value={form.technologyId}
                onChange={(e) => setForm({ ...form, technologyId: e.target.value })}
              >
                <option value="">Select technology...</option>
                {technologies.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Title</label>
              <input
                style={inputStyle}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Hours</label>
              <input
                style={inputStyle}
                type="number"
                step="0.5"
                min="0.5"
                max="1000"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
              />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Completion Date</label>
              <input
                style={inputStyle}
                type="date"
                value={form.completedDate}
                onChange={(e) => setForm({ ...form, completedDate: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" style={btnSecondary} onClick={closeModal}>
                Cancel
              </button>
              <button
                type="submit"
                style={{ ...btnPrimary, opacity: submitting ? 0.7 : 1 }}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
