# AGENTS.md - Frontend

## Structure

```
frontend/src/
├── components/     # Reusable components (ErrorMessage, Loading, etc.)
├── pages/          # Page components (Dashboard, Login, etc.)
├── pages/admin/    # Admin pages (UsersPage, TrainingRecordsPage, etc.)
├── services/       # API client
├── contexts/       # React contexts (AuthContext)
├── types/          # TypeScript interfaces
└── App.tsx         # Entry point
```

## Architecture

- **Entry point**: `frontend/src/App.tsx`
- **Routing**: React Router
- **Auth**: JWT + AuthContext

## Naming

| Type       | Pattern             | Example                     |
| ---------- | ------------------- | --------------------------- |
| Component  | `ComponentName.tsx` | `FileDownloadModal.tsx`     |
| Page       | `PageName.tsx`      | `DashboardPage.tsx`         |
| Admin Page | `PageName.tsx`      | `UsersPage.tsx` (in admin/) |
| Type       | `EntityName.ts`     | in `types/index.ts`         |
| Service    | `api.ts`            | `services/api.ts`           |

## Code Patterns

### Component (Inline Styles)

```tsx
const containerStyle: React.CSSProperties = {
  display: 'flex',
  padding: '1rem',
};

interface ComponentProps {
  title: string;
  onSubmit?: () => void;
}

export default function ComponentName({ title, onSubmit }: ComponentProps) {
  return <div style={containerStyle}>{title}</div>;
}
```

### Page with Auth

```tsx
import { useAuth } from '@contexts/AuthContext';
import api from '@services/api';

export default function PageName() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState([]);

  // Fetch data...

  return <div>...</div>;
}
```

### Type Definition

```typescript
// frontend/src/types/index.ts
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'employee';
}
```

### API Call

```tsx
const fetchData = useCallback(async () => {
  const res = await api.get<User[]>('/users');
  setData(res.data);
}, []);
```

## Style Rules

- **NO CSS files** — todos los estilos en objetos JS inline
- **NO Tailwind** — no usar classes como `className="flex p-4"`
- Todos los estilos como `React.CSSProperties`
- Constants al inicio del archivo

## Testing

```bash
npm test -- --testPathPattern=ComponentName
npm run test:coverage
```

## Commands

```bash
npm run dev          # Vite hot reload (port 3000)
npm run build        # Vite build (needs backend tsc first!)
npm run lint         # ESLint
npm run format       # Prettier
```

## Environment

- Variables en `frontend/.env`
- API URL: `http://localhost:8000/api` (dev)
