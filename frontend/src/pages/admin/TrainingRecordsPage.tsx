import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import api from '@services/api';
import Loading from '@components/Loading';
import ErrorMessage from '@components/ErrorMessage';
import FileDownloadModal from '@components/FileDownloadModal';
import type { TrainingRecord, Technology, User, TrainingFile } from '@app-types/index';

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
const btnDanger: React.CSSProperties = { ...btnPrimary, backgroundColor: '#ef4444' };
const btnSecondary: React.CSSProperties = { ...btnPrimary, backgroundColor: '#64748b' };
const btnSmall: React.CSSProperties = {
  ...btnPrimary,
  padding: '0.3rem 0.6rem',
  fontSize: '0.75rem',
};
const inputStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  fontSize: '0.875rem',
  boxSizing: 'border-box' as const,
};
const inputFull: React.CSSProperties = { ...inputStyle, width: '100%' };
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
  width: 480,
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};
const filterRow: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  marginBottom: '1.25rem',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
};
const successMsg: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  backgroundColor: '#dcfce7',
  color: '#166534',
  borderRadius: 4,
  fontSize: '0.8rem',
  marginBottom: '1rem',
};

interface RecordForm {
  userId: string;
  technologyId: string;
  title: string;
  description: string;
  hours: string;
  completionDate: string;
}
const emptyForm: RecordForm = {
  userId: '',
  technologyId: '',
  title: '',
  description: '',
  hours: '',
  completionDate: '',
};

function isValidISO8601Date(value: string): boolean {
  if (!value) return true; // optional field
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  const parsed = new Date(value);
  return !isNaN(parsed.getTime());
}

export default function TrainingRecordsPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTech, setFilterTech] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);
  const [form, setForm] = useState<RecordForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadRecordId, setUploadRecordId] = useState<string | null>(null);
  const [selectedRecordFiles, setSelectedRecordFiles] = useState<TrainingFile[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.set('searchTerm', searchTerm);
    if (filterTech) params.set('technologyId', filterTech);
    if (filterUser) params.set('userId', filterUser);
    api
      .get<TrainingRecord[]>(`/training-records?${params}`)
      .then((res) => {
        setRecords(res.data);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load records'))
      .finally(() => setLoading(false));
  }, [searchTerm, filterTech, filterUser]);

  useEffect(() => {
    Promise.all([api.get<Technology[]>('/technologies'), api.get<User[]>('/users')])
      .then(([techRes, userRes]) => {
        setTechnologies(techRes.data);
        setUsers(userRes.data);
      })
      .catch(() => {});
    fetchRecords();
  }, []);

  const techMap = Object.fromEntries(technologies.map((t) => [t.id, t.name]));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

  const openCreate = () => {
    setEditingRecord(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };
  const openEdit = (r: TrainingRecord) => {
    setEditingRecord(r);
    setForm({
      userId: r.userId,
      technologyId: r.technologyId,
      title: r.title,
      description: r.description,
      hours: String(r.hours),
      completionDate: r.completionDate || '',
    });
    setFormError('');
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingRecord(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim() || !form.technologyId || !form.hours) {
      setFormError('Title, technology, and hours are required');
      return;
    }
    if (!editingRecord && !form.userId) {
      setFormError('Employee is required');
      return;
    }
    const hours = parseFloat(form.hours);
    if (isNaN(hours) || hours < 0.5 || hours > 1000) {
      setFormError('Hours must be between 0.5 and 1000');
      return;
    }
    if (form.completionDate && !isValidISO8601Date(form.completionDate)) {
      setFormError('Completion date must be a valid date in YYYY-MM-DD format');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        userId: form.userId,
        technologyId: form.technologyId,
        title: form.title,
        description: form.description,
        hours,
        completionDate: form.completionDate || undefined,
      };
      if (editingRecord) {
        await api.put(`/training-records/${editingRecord.id}`, {
          technologyId: form.technologyId,
          title: form.title,
          description: form.description,
          hours,
          completionDate: form.completionDate || null,
        });
        setSuccess('Record updated');
      } else {
        await api.post('/training-records', payload);
        setSuccess('Record created');
      }
      closeModal();
      fetchRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (r: TrainingRecord) => {
    if (!confirm(`Delete record "${r.title}"?`)) return;
    try {
      await api.delete(`/training-records/${r.id}`);
      setSuccess('Record deleted');
      fetchRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadRecordId || !e.target.files?.length) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/training-records/${uploadRecordId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('File uploaded');
      fetchRecords();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    }
    setUploadRecordId(null);
    e.target.value = '';
  };

  const handleFileDelete = async (fileId: string) => {
    if (!selectedRecordId) return;
    try {
      await api.delete(`/training-records/${selectedRecordId}/files/${fileId}`);
      setSuccess('File deleted');
      fetchRecords();
      // Update modal files list
      setSelectedRecordFiles((prev) => prev.filter((f) => f.id !== fileId));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete file');
    }
  };

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
          Training Records
        </h2>
        <button style={btnPrimary} onClick={openCreate}>
          Create Record
        </button>
      </div>
      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorMessage message={error} />
        </div>
      )}
      {success && <div style={successMsg}>{success}</div>}

      <div style={filterRow}>
        <input
          style={{ ...inputStyle, width: 200 }}
          placeholder="Search title/description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          style={inputStyle}
          value={filterTech}
          onChange={(e) => setFilterTech(e.target.value)}
        >
          <option value="">All Technologies</option>
          {technologies.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          style={inputStyle}
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
        >
          <option value="">All Employees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>
        <button style={btnPrimary} onClick={fetchRecords}>
          Search
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Title</th>
              <th style={th}>Employee</th>
              <th style={th}>Technology</th>
              <th style={th}>Hours</th>
              <th style={th}>Files</th>
              <th style={th}>Completion Date</th>
              <th style={th}>Date</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td style={{ ...td, textAlign: 'center', color: '#94a3b8' }} colSpan={8}>
                  No records found
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.title}</td>
                  <td style={td}>{userMap[r.userId] || r.userId}</td>
                  <td style={td}>{techMap[r.technologyId] || r.technologyId}</td>
                  <td style={td}>{r.hours}</td>
                  <td style={td}>
                    {(r.files?.length || 0) > 0 ? (
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#4f46e5',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          padding: 0,
                        }}
                        onClick={() => {
                          setSelectedRecordId(r.id);
                          setSelectedRecordFiles(r.files || []);
                        }}
                      >
                        📎 {r.files?.length}
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>0</span>
                    )}
                    <button
                      style={{ ...btnSmall, marginLeft: '0.5rem', backgroundColor: '#0ea5e9' }}
                      onClick={() => {
                        setUploadRecordId(r.id);
                        document.getElementById('file-upload')?.click();
                      }}
                    >
                      +
                    </button>
                  </td>
                  <td style={td}>
                    {r.completionDate ? format(new Date(r.completionDate), 'MMM d, yyyy') : '—'}
                  </td>
                  <td style={td}>{format(new Date(r.createdAt), 'MMM d, yyyy')}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button style={btnSecondary} onClick={() => openEdit(r)}>
                        Edit
                      </button>
                      <button style={btnDanger} onClick={() => handleDelete(r)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
      <input
        id="file-upload"
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept=".pdf,.png,.jpg,.jpeg,.docx"
      />

      {showModal && (
        <div style={overlay} onClick={closeModal}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', color: '#1e293b' }}>
              {editingRecord ? 'Edit Record' : 'Create Record'}
            </h3>
            {formError && (
              <div style={{ marginBottom: '0.75rem' }}>
                <ErrorMessage message={formError} />
              </div>
            )}
            <form onSubmit={handleSubmit}>
              {!editingRecord && (
                <div style={fieldGroup}>
                  <label style={labelStyle}>Employee</label>
                  <select
                    style={inputFull}
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  >
                    <option value="">Select employee...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={fieldGroup}>
                <label style={labelStyle}>Technology</label>
                <select
                  style={inputFull}
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
                  style={inputFull}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Description</label>
                <textarea
                  style={{ ...inputFull, minHeight: 80, resize: 'vertical' }}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Hours</label>
                <input
                  style={inputFull}
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="1000"
                  value={form.hours}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>
                  Completion Date{' '}
                  <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
                </label>
                <input
                  style={inputFull}
                  type="date"
                  value={form.completionDate}
                  onChange={(e) => setForm({ ...form, completionDate: e.target.value })}
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
      )}
      <FileDownloadModal
        isOpen={!!selectedRecordId}
        onClose={() => {
          setSelectedRecordId(null);
          setSelectedRecordFiles([]);
        }}
        files={selectedRecordFiles}
        trainingRecordId={selectedRecordId || ''}
        onDelete={handleFileDelete}
      />
    </div>
  );
}
