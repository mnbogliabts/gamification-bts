---
name: react-component
description: >
  Generate React components following project patterns (presentational/container, inline styles, TypeScript).
  Trigger: When creating, modifying, or debugging React components in frontend/src/pages or frontend/src/components.
license: Apache-2.0
metadata:
  author: gamification-bts
  version: '1.0'
---

## When to Use

- Creating new React components in `frontend/src/components/` or `frontend/src/pages/`
- Modifying existing components (add props, state, handlers)
- Debugging component issues (check patterns below)
- Adding new pages in `frontend/src/pages/admin/`

## Critical Patterns

### Component Structure

```tsx
import React from 'react';

// Inline styles - NO CSS files, NO Tailwind, NO styled-components
const componentName: React.CSSProperties = {
  display: 'flex',
  padding: '1rem',
  backgroundColor: '#fff',
};

interface ComponentProps {
  title: string;
  onSubmit?: () => void;
  children?: React.ReactNode;
}

export default function ComponentName({ title, onSubmit, children }: ComponentProps) {
  return (
    <div style={componentName}>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
```

### Style Constants

- Define all styles as `const` at TOP of file (after imports)
- Use meaningful names: `containerStyle`, `buttonStyle`, `headerStyle`
- Use Tailwind-ish naming: `btnPrimary`, `btnSecondary`, `inputStyle`
- Group related styles: `const cardRow`, `const card`, `const cardLabel`

### Props Interface

```tsx
// In frontend/src/types/index.ts, add:
export interface MyEntity {
  id: string;
  name: string;
  createdAt: string;
}

// Use in component:
interface MyComponentProps {
  entity: MyEntity;
  onDelete?: (id: string) => void;
}
```

### State Management

```tsx
// Use useState for local state
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

// Use useCallback for expensive operations
const handleSubmit = useCallback(async () => {
  // ...
}, [deps]);
```

### No External CSS

- NEVER create `.css` files
- NEVER use Tailwind classes (no `className="flex p-4"`)
- All styles in JS objects with `React.CSSProperties` typing

### Page Components

- Pages go in `frontend/src/pages/` (or `pages/admin/`)
- Use `useAuth` hook for auth context: `const { user, isAdmin } = useAuth()`
- Use `api` service for HTTP: `api.get()`, `api.post()`, `api.delete()`

## Component Types

| Type     | Location      | Pattern                                              |
| -------- | ------------- | ---------------------------------------------------- |
| Reusable | `components/` | Props in, JSX out, no side effects                   |
| Page     | `pages/`      | Uses hooks (useState, useEffect, useAuth), calls API |
| Modal    | `components/` | Props: `isOpen`, `onClose`, optional `onSubmit`      |

## API Integration Pattern

```tsx
import api from '@services/api';
import type { MyEntity } from '@app-types/index';

const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const res = await api.get<MyEntity[]>('/endpoint');
    setData(res.data);
  } catch (err: any) {
    setError(err.response?.data?.message || 'Failed to load');
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

## Commands

```bash
# Lint component
npm run lint -- --fix frontend/src/components/MyComponent.tsx

# Type check
cd frontend && npx tsc --noEmit
```

## Resources

- **Templates**: See [assets/](assets/) for component template
- **Types**: `frontend/src/types/index.ts`
- **API Service**: `frontend/src/services/api.ts`
- **Auth Context**: `frontend/src/contexts/AuthContext.tsx`
