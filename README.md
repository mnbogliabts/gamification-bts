# Employee Training Management Platform

A full-stack web application for tracking, managing, and analyzing employee training activities. Built with Domain-Driven Design (DDD) principles using TypeScript, React, Node.js/Express, and PostgreSQL.

## Project Structure

This is a monorepo containing both backend and frontend applications:

```
employee-training-platform/
├── backend/                 # Node.js/Express backend API
│   ├── src/
│   │   ├── domain/         # Domain layer (entities, value objects, domain services)
│   │   ├── application/    # Application layer (use cases, DTOs)
│   │   ├── infrastructure/ # Infrastructure layer (database, file storage, auth)
│   │   ├── presentation/   # Presentation layer (REST API routes, middleware)
│   │   ├── shared/         # Shared utilities and types
│   │   └── test/           # Test setup and utilities
│   ├── tsconfig.json       # TypeScript configuration
│   ├── package.json        # Backend dependencies
│   ├── jest.config.js      # Jest test configuration
│   └── .eslintrc.json      # ESLint configuration
│
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── test/           # Test setup and utilities
│   ├── tsconfig.json       # TypeScript configuration
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.ts      # Vite configuration
│   ├── jest.config.js      # Jest test configuration
│   └── .eslintrc.json      # ESLint configuration
│
├── package.json            # Root package.json for workspace management
├── .prettierrc             # Prettier configuration
└── .gitignore              # Git ignore rules
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT + Google OAuth 2.0
- **Testing**: Jest, Supertest, fast-check (property-based testing)
- **Code Quality**: ESLint, Prettier

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Testing**: Jest, React Testing Library
- **Code Quality**: ESLint, Prettier

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher
- PostgreSQL 15 or higher

**OR**

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher

### Option 1: Docker Setup (Recommended)

The easiest way to run the application is using Docker:

1. Clone the repository:
```bash
git clone <repository-url>
cd employee-training-platform
```

2. Copy and configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start all services with Docker Compose:

**Development mode (with hot reload):**
```bash
docker-compose -f docker-compose.dev.yml up
```

**Production mode:**
```bash
docker-compose up -d
```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Database: localhost:5432

For detailed Docker instructions, see [DOCKER.md](DOCKER.md).

### Option 2: Local Development Setup

If you prefer to run services locally without Docker:

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd employee-training-platform
```

2. Install dependencies for all workspaces:
```bash
npm run install:all
```

3. Set up environment variables:

Backend:
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

Frontend:
```bash
cd frontend
cp .env.example .env
# Edit .env with your configuration
```

### Development

Run both backend and frontend in development mode:
```bash
npm run dev
```

Or run them separately:

Backend:
```bash
npm run dev --workspace=backend
```

Frontend:
```bash
npm run dev --workspace=frontend
```

The backend will run on http://localhost:8000 and the frontend on http://localhost:3000.

### Building for Production

Build both applications:
```bash
npm run build
```

### Testing

Run all tests:
```bash
npm test
```

Run tests for a specific workspace:
```bash
npm test --workspace=backend
npm test --workspace=frontend
```

Run tests in watch mode:
```bash
npm run test:watch --workspace=backend
npm run test:watch --workspace=frontend
```

### Code Quality

Lint all code:
```bash
npm run lint
```

Format all code:
```bash
npm run format
```

## Architecture

The application follows Domain-Driven Design (DDD) principles with a layered architecture:

### Backend Layers

1. **Domain Layer**: Core business logic, entities, value objects, and domain services
2. **Application Layer**: Use cases, DTOs, and application services
3. **Infrastructure Layer**: Database repositories, file storage, external services
4. **Presentation Layer**: REST API endpoints, middleware, request/response handling

### Key Features

- Role-based access control (Admin/Employee)
- Training record management with file uploads
- Comprehensive analytics and visualizations
- Employee leaderboards
- Data export to CSV
- Audit logging
- Google OAuth 2.0 authentication
- Rate limiting and security middleware

## API Documentation

The backend API will be available at `http://localhost:8000/api` with the following main endpoints:

- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management (admin only)
- `/api/training-records/*` - Training record CRUD
- `/api/technologies/*` - Technology management
- `/api/analytics/*` - Analytics and reporting
- `/api/audit-logs/*` - Audit log viewing (admin only)

## Contributing

1. Follow the existing code style (enforced by ESLint and Prettier)
2. Write tests for new features
3. Ensure all tests pass before submitting
4. Update documentation as needed

## License

[Your License Here]
