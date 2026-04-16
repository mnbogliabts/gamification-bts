# File Storage Service

This module provides file storage functionality for the Employee Training Management Platform.

## Overview

The `LocalFileStorageService` implements the `FileStorageService` interface defined in the domain layer. It handles:

- File uploads with validation (type, size)
- Secure file storage with non-guessable filenames (UUID-based)
- File downloads
- File deletion
- Time-limited secure download URLs with HMAC-SHA256 signing

## File Storage Structure

Files are stored in a hierarchical directory structure:

```
/uploads
  /training-files
    /{year}
      /{month}
        /{uuid}.{extension}
```

Example:
```
/uploads/training-files/2024/01/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
```

## Validation Rules

### Allowed File Types
- PDF: `application/pdf`
- PNG: `image/png`
- JPEG: `image/jpeg`, `image/jpg`
- DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### File Size Limit
- Maximum: 10 MB (10,485,760 bytes)

### Files Per Training Record
- Maximum: 10 files

## Usage

### Initialize the Service

```typescript
import { LocalFileStorageService } from './infrastructure/storage';

const fileStorage = new LocalFileStorageService(
  './uploads',           // Base upload path
  'your-signing-secret'  // Secret for URL signing (optional, uses env var)
);
```

### Upload a File

```typescript
const fileBuffer = Buffer.from(fileData);
const metadata = await fileStorage.uploadFile(
  fileBuffer,
  'certificate.pdf',
  'application/pdf'
);

console.log(metadata);
// {
//   id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
//   originalFilename: 'certificate.pdf',
//   storedFilename: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf',
//   fileSize: 12345,
//   mimeType: 'application/pdf',
//   uploadedAt: Date
// }
```

### Download a File

```typescript
const fileBuffer = await fileStorage.downloadFile(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf'
);
```

### Delete a File

```typescript
const deleted = await fileStorage.deleteFile(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf'
);
console.log(deleted); // true if deleted, false if not found
```

### Generate Secure Download URL

```typescript
const secureUrl = await fileStorage.generateSecureUrl(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf',
  60 // Expiration in minutes (default: 60)
);

console.log(secureUrl);
// {
//   url: '/api/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf/download?token=abc123...&expires=1234567890',
//   expiresAt: Date
// }
```

### Validate Secure URL

```typescript
const isValid = fileStorage.validateSecureUrl(
  storedFilename,
  token,
  expiresTimestamp
);
```

## Security Features

### Non-Guessable Filenames
- Uses UUID v4 for unique, non-guessable filenames
- Prevents unauthorized access by filename enumeration
- Validates: Requirement 20.4

### Time-Limited Download URLs
- URLs expire after 1 hour by default (configurable)
- Signed with HMAC-SHA256 to prevent tampering
- Validates: Requirement 12.4

### File Type Validation
- Only allows specific MIME types
- Prevents upload of executable or malicious files
- Validates: Requirement 5.1

### File Size Validation
- Enforces 10 MB maximum file size
- Prevents storage exhaustion attacks
- Validates: Requirement 5.2

## Error Handling

The service throws the following errors:

- `ValidationError`: Invalid file type or size
- `NotFoundError`: File not found during download/delete/URL generation

Example:
```typescript
try {
  await fileStorage.uploadFile(buffer, 'file.exe', 'application/x-msdownload');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid file:', error.message);
  }
}
```

## Environment Variables

- `URL_SIGNING_SECRET`: Secret key for signing download URLs (required in production)

## Testing

Run tests:
```bash
npm test -- LocalFileStorageService.test.ts
```

The test suite includes:
- File upload validation (type, size)
- Directory structure creation
- Unique filename generation
- File download and deletion
- Secure URL generation and validation
- Edge cases and error conditions

## Requirements Validation

This implementation validates the following requirements:

- **5.1**: File type validation (PDF, PNG, JPG, JPEG, DOCX)
- **5.2**: File size validation (max 10 MB)
- **5.3**: File count limit (max 10 per record)
- **5.4**: Unique file identifier generation (UUID)
- **5.5**: File deletion with cleanup
- **12.2**: File download with proper content
- **12.4**: Time-limited secure download URLs
- **20.4**: Non-guessable filenames for security
