import React, { useState } from 'react';
import { format } from 'date-fns';
import type { TrainingFile } from '@app-types/index';

interface FileDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: TrainingFile[];
  trainingRecordId: string;
  onDelete?: (fileId: string) => Promise<void>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  width: 520,
  maxHeight: '80vh',
  overflow: 'auto',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

const modalHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.25rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid #e2e8f0',
};

const modalTitle: React.CSSProperties = {
  margin: 0,
  color: '#1e293b',
  fontSize: '1.125rem',
  fontWeight: 600,
};

const closeButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  color: '#64748b',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
};

const fileList: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const fileItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem',
  borderRadius: 6,
  border: '1px solid #f1f5f9',
  marginBottom: '0.5rem',
  transition: 'background-color 0.15s',
};

const fileInfo: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  flex: 1,
  minWidth: 0,
};

const fileName: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#334155',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const fileMeta: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
};

const downloadButton: React.CSSProperties = {
  padding: '0.4rem 0.75rem',
  backgroundColor: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  transition: 'opacity 0.15s',
};

const downloadButtonDisabled: React.CSSProperties = {
  ...downloadButton,
  opacity: 0.6,
  cursor: 'not-allowed',
};

const deleteButton: React.CSSProperties = {
  padding: '0.4rem 0.75rem',
  backgroundColor: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  transition: 'opacity 0.15s',
  marginLeft: '0.5rem',
};

const deleteButtonDisabled: React.CSSProperties = {
  ...deleteButton,
  opacity: 0.6,
  cursor: 'not-allowed',
};

const buttonGroup: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const errorMessage: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#ef4444',
  marginTop: '0.25rem',
};

const emptyState: React.CSSProperties = {
  textAlign: 'center',
  color: '#64748b',
  padding: '2rem 1rem',
  fontSize: '0.875rem',
};

const spinner: React.CSSProperties = {
  width: 14,
  height: 14,
  border: '2px solid #fff',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

export default function FileDownloadModal({
  isOpen,
  onClose,
  files,
  trainingRecordId,
  onDelete,
}: FileDownloadModalProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (file: TrainingFile) => {
    setDownloadingId(file.id);
    setError(null);
    try {
      const response = await fetch(`/api/training-records/${trainingRecordId}/files/${file.id}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Download failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalFilename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (file: TrainingFile) => {
    if (!onDelete) return;
    if (!confirm(`Delete "${file.originalFilename}"?`)) return;

    setDeletingId(file.id);
    setError(null);
    try {
      await onDelete(file.id);
    } catch (err: any) {
      setError(err.message || 'Delete failed. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <h3 style={modalTitle}>Attached Files</h3>
          <button style={closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#fef2f2',
              borderRadius: 4,
              fontSize: '0.8rem',
              color: '#ef4444',
            }}
          >
            {error}
          </div>
        )}

        {files.length === 0 ? (
          <div style={emptyState}>No files attached</div>
        ) : (
          <ul style={fileList}>
            {files.map((file) => (
              <li key={file.id} style={fileItem}>
                <div style={fileInfo}>
                  <span style={fileName} title={file.originalFilename}>
                    {file.originalFilename || 'Untitled'}
                  </span>
                  <span style={fileMeta}>
                    {formatFileSize(file.fileSize)} •{' '}
                    {format(new Date(file.uploadedAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <div style={buttonGroup}>
                  <button
                    style={downloadingId === file.id ? downloadButtonDisabled : downloadButton}
                    onClick={() => handleDownload(file)}
                    disabled={downloadingId === file.id}
                  >
                    {downloadingId === file.id ? (
                      <>
                        <span style={spinner}></span>
                        Downloading
                      </>
                    ) : (
                      '↓ Download'
                    )}
                  </button>
                  {onDelete && (
                    <button
                      style={deletingId === file.id ? deleteButtonDisabled : deleteButton}
                      onClick={() => handleDelete(file)}
                      disabled={deletingId === file.id}
                    >
                      {deletingId === file.id ? 'Deleting...' : '🗑 Delete'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
