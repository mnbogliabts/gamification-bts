import React from 'react';
import { render, screen } from '@testing-library/react';
import FileDownloadModal from '../../components/FileDownloadModal';
import type { TrainingFile } from '@app-types/index';

const mockFiles: TrainingFile[] = [
  {
    id: 'file-1',
    trainingRecordId: 'record-1',
    originalFilename: 'certificate.pdf',
    storedFilename: 'cert-123.pdf',
    fileSize: 1048576,
    mimeType: 'application/pdf',
    uploadedAt: '2026-04-09T10:00:00Z',
  },
  {
    id: 'file-2',
    trainingRecordId: 'record-1',
    originalFilename: 'report.docx',
    storedFilename: 'rep-456.docx',
    fileSize: 512000,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    uploadedAt: '2026-04-08T14:30:00Z',
  },
];

describe('FileDownloadModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    files: mockFiles,
    trainingRecordId: 'record-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when isOpen is true', () => {
    render(<FileDownloadModal {...defaultProps} />);
    expect(screen.getByText('Attached Files')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', () => {
    const { container } = render(<FileDownloadModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays file names correctly', () => {
    render(<FileDownloadModal {...defaultProps} />);
    expect(screen.getByText('certificate.pdf')).toBeInTheDocument();
    expect(screen.getByText('report.docx')).toBeInTheDocument();
  });

  it('displays file sizes in correct format', () => {
    render(<FileDownloadModal {...defaultProps} />);
    // Text is split across elements, use regex matcher
    expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
    expect(screen.getByText(/500\.0 KB/)).toBeInTheDocument();
  });

  it('displays upload dates in correct format', () => {
    render(<FileDownloadModal {...defaultProps} />);
    // Text is split across elements, use regex matcher
    expect(screen.getByText(/Apr 9, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Apr 8, 2026/)).toBeInTheDocument();
  });

  it('displays empty state when no files', () => {
    render(<FileDownloadModal {...defaultProps} files={[]} />);
    expect(screen.getByText('No files attached')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<FileDownloadModal {...defaultProps} onClose={onClose} />);
    screen.getByRole('button', { name: 'Close' }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking overlay', () => {
    const onClose = jest.fn();
    const { container } = render(<FileDownloadModal {...defaultProps} onClose={onClose} />);
    const overlay = container.firstChild as HTMLElement;
    overlay.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays download buttons for each file', () => {
    render(<FileDownloadModal {...defaultProps} />);
    const downloadButtons = screen.getAllByText('↓ Download');
    expect(downloadButtons).toHaveLength(2);
  });
});

describe('FileDownloadModal edge cases', () => {
  it('displays "Untitled" for empty filename', () => {
    render(
      <FileDownloadModal
        isOpen={true}
        onClose={jest.fn()}
        files={[
          {
            id: 'file-1',
            trainingRecordId: 'record-1',
            originalFilename: '',
            storedFilename: 'file-123',
            fileSize: 100,
            mimeType: 'application/octet-stream',
            uploadedAt: '2026-04-09T10:00:00Z',
          },
        ]}
        trainingRecordId="record-1"
      />
    );
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('handles very small file sizes (bytes)', () => {
    render(
      <FileDownloadModal
        isOpen={true}
        onClose={jest.fn()}
        files={[
          {
            id: 'file-1',
            trainingRecordId: 'record-1',
            originalFilename: 'tiny.txt',
            storedFilename: 'tiny-1.txt',
            fileSize: 500,
            mimeType: 'text/plain',
            uploadedAt: '2026-04-09T10:00:00Z',
          },
        ]}
        trainingRecordId="record-1"
      />
    );
    // Text is split across elements
    expect(screen.getByText(/500 B/)).toBeInTheDocument();
  });

  it('handles very large file sizes (MB)', () => {
    render(
      <FileDownloadModal
        isOpen={true}
        onClose={jest.fn()}
        files={[
          {
            id: 'file-1',
            trainingRecordId: 'record-1',
            originalFilename: 'large.zip',
            storedFilename: 'large-1.zip',
            fileSize: 52428800, // 50 MB
            mimeType: 'application/zip',
            uploadedAt: '2026-04-09T10:00:00Z',
          },
        ]}
        trainingRecordId="record-1"
      />
    );
    // Text is split across elements
    expect(screen.getByText(/50\.0 MB/)).toBeInTheDocument();
  });
});
