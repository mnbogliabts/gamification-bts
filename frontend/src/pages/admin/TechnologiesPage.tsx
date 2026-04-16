import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '@services/api';
import Loading from '@components/Loading';
import ErrorMessage from '@components/ErrorMessage';
import type { Technology } from '@app-types/index';

const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const th: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc' };
const td: React.CSSProperties = { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#334155', borderBottom: '1px solid #f1f5f9' };
const btnPrimary: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 };
const btnDanger: React.CSSProperties = { ...btnPrimary, backgroundColor: '#ef4444' };
const btnSecondary: React.CSSProperties = { ...btnPrimary, backgroundColor: '#64748b' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.875rem', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 500, color: '#334155' };
const fieldGroup: React.CSSProperties = { marginBottom: '0.75rem' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modal: React.CSSProperties = { backgroundColor: '#fff', borderRadius: 8, padding: '1.5rem', width: 380, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' };
const successMsg: React.CSSProperties = { padding: '0.5rem 0.75rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: 4, fontSize: '0.8rem', marginBottom: '1rem' };

interface TechForm { name: string; category: string; }
const emptyForm: TechForm = { name: '', category: '' };

export default function TechnologiesPage() {
  const [techs, setTechs] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Technology | null>(null);
  const [form, setForm] = useState<TechForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchTechs = () => {
    setLoading(true);
    api.get<Technology[]>('/technologies')
      .then((res) => { setTechs(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load technologies'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTechs(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormError(''); setShowModal(true); };
  const openEdit = (t: Technology) => { setEditing(t); setForm({ name: t.name, category: t.category }); setFormError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.category.trim()) { setFormError('Name and category are required'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/technologies/${editing.id}`, form);
        setSuccess('Technology updated');
      } else {
        await api.post('/technologies', form);
        setSuccess('Technology created');
      }
      closeModal();
      fetchTechs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (t: Technology) => {
    if (!confirm(`Delete technology "${t.name}"?`)) return;
    try {
      await api.delete(`/technologies/${t.id}`);
      setSuccess('Technology deleted');
      fetchTechs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>Technologies</h2>
        <button style={btnPrimary} onClick={openCreate}>Create Technology</button>
      </div>
      {error && <div style={{ marginBottom: '1rem' }}><ErrorMessage message={error} /></div>}
      {success && <div style={successMsg}>{success}</div>}
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Category</th>
            <th style={th}>Created</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {techs.map((t) => (
            <tr key={t.id}>
              <td style={{ ...td, fontWeight: 500 }}>{t.name}</td>
              <td style={td}>{t.category}</td>
              <td style={td}>{format(new Date(t.createdAt), 'MMM d, yyyy')}</td>
              <td style={td}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button style={btnSecondary} onClick={() => openEdit(t)}>Edit</button>
                  <button style={btnDanger} onClick={() => handleDelete(t)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div style={overlay} onClick={closeModal}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', color: '#1e293b' }}>{editing ? 'Edit Technology' : 'Create Technology'}</h3>
            {formError && <div style={{ marginBottom: '0.75rem' }}><ErrorMessage message={formError} /></div>}
            <form onSubmit={handleSubmit}>
              <div style={fieldGroup}><label style={labelStyle}>Name</label><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Category</label><input style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" style={btnSecondary} onClick={closeModal}>Cancel</button>
                <button type="submit" style={{ ...btnPrimary, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
