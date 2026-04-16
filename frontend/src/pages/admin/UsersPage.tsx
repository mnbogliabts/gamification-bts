import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '@services/api';
import Loading from '@components/Loading';
import ErrorMessage from '@components/ErrorMessage';
import type { User } from '@app-types/index';

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
const modal: React.CSSProperties = { backgroundColor: '#fff', borderRadius: 8, padding: '1.5rem', width: 400, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' };
const badge = (active: boolean): React.CSSProperties => ({ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 500, backgroundColor: active ? '#dcfce7' : '#fee2e2', color: active ? '#166534' : '#991b1b' });
const successMsg: React.CSSProperties = { padding: '0.5rem 0.75rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: 4, fontSize: '0.8rem', marginBottom: '1rem' };

interface FormData { username: string; firstName: string; lastName: string; email: string; password: string; role: 'ADMIN' | 'EMPLOYEE'; }
const emptyForm: FormData = { username: '', firstName: '', lastName: '', email: '', password: '', role: 'EMPLOYEE' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    api.get<User[]>('/users')
      .then((res) => { setUsers(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => { setEditingUser(null); setForm(emptyForm); setFormError(''); setShowModal(true); };
  const openEdit = (u: User) => { setEditingUser(u); setForm({ username: u.username, firstName: u.firstName || '', lastName: u.lastName || '', email: u.email, password: '', role: u.role }); setFormError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingUser(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.username.trim() || !form.email.trim()) { setFormError('Username and email are required'); return; }
    if (!editingUser && !form.password.trim()) { setFormError('Password is required for new users'); return; }
    if (form.firstName.length > 100 || form.lastName.length > 100) { setFormError('First Name and Last Name must be 100 characters or fewer'); return; }
    setSubmitting(true);
    try {
      if (editingUser) {
        const payload: any = { username: form.username, email: form.email, role: form.role, firstName: form.firstName, lastName: form.lastName };
        if (form.password.trim()) payload.password = form.password;
        await api.put(`/users/${editingUser.id}`, payload);
        setSuccess('User updated successfully');
      } else {
        await api.post('/users', form);
        setSuccess('User created successfully');
      }
      closeModal();
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (u: User) => {
    if (!confirm(`Deactivate user "${u.username}"?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setSuccess('User deactivated');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate user');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>User Management</h2>
        <button style={btnPrimary} onClick={openCreate}>Create User</button>
      </div>
      {error && <div style={{ marginBottom: '1rem' }}><ErrorMessage message={error} /></div>}
      {success && <div style={successMsg}>{success}</div>}
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Username</th>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Role</th>
            <th style={th}>Status</th>
            <th style={th}>Created</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={td}>{u.username}</td>
              <td style={td}>{u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username}</td>
              <td style={td}>{u.email}</td>
              <td style={td}><span style={{ fontSize: '0.75rem', fontWeight: 600, color: u.role === 'ADMIN' ? '#4f46e5' : '#475569' }}>{u.role}</span></td>
              <td style={td}><span style={badge(u.isActive)}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
              <td style={td}>{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
              <td style={{ ...td, display: 'flex', gap: '0.5rem' }}>
                <button style={btnSecondary} onClick={() => openEdit(u)}>Edit</button>
                {u.isActive && <button style={btnDanger} onClick={() => handleDeactivate(u)}>Deactivate</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div style={overlay} onClick={closeModal}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', color: '#1e293b' }}>{editingUser ? 'Edit User' : 'Create User'}</h3>
            {formError && <div style={{ marginBottom: '0.75rem' }}><ErrorMessage message={formError} /></div>}
            <form onSubmit={handleSubmit}>
              <div style={fieldGroup}><label style={labelStyle}>Username</label><input style={inputStyle} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ ...fieldGroup, flex: 1 }}><label style={labelStyle}>First Name</label><input style={inputStyle} maxLength={100} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div style={{ ...fieldGroup, flex: 1 }}><label style={labelStyle}>Last Name</label><input style={inputStyle} maxLength={100} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
              </div>
              <div style={fieldGroup}><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div style={fieldGroup}><label style={labelStyle}>Password{editingUser ? ' (leave blank to keep)' : ''}</label><input style={inputStyle} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Role</label>
                <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'EMPLOYEE' })}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
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
