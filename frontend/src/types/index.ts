export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
  authProvider: 'LOCAL' | 'GOOGLE_OAUTH';
  createdAt: string;
  updatedAt: string;
}

export interface TrainingRecord {
  id: string;
  userId: string;
  technologyId: string;
  title: string;
  description: string;
  hours: number;
  completedDate: string | null;
  completionDate: string | null;
  createdAt: string;
  updatedAt: string;
  files: TrainingFile[];
}

export interface TrainingFile {
  id: string;
  trainingRecordId: string;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface Technology {
  id: string;
  name: string;
  category: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface EmployeeDashboard {
  totalHours: number;
  totalRecords: number;
  hoursByTechnology: TechnologySummary[];
  recentRecords: TrainingRecord[];
}

export interface TechnologySummary {
  technologyId: string;
  technologyName: string;
  totalHours: number;
  recordCount: number;
  employeeCount: number;
}

export interface AdminAnalytics {
  totalHours: number;
  totalRecords: number;
  employeeCount: number;
  hoursByTechnology: TechnologySummary[];
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  totalHours: number;
  recordCount: number;
  rank: number;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: any;
  ipAddress: string | null;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
