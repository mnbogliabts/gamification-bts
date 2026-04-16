-- Database Initialization Script
-- Employee Training Management Platform
-- This script runs automatically when the PostgreSQL container starts for the first time

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- Nullable for OAuth users
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'EMPLOYEE')),
  is_active BOOLEAN DEFAULT true,
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL' CHECK (auth_provider IN ('LOCAL', 'GOOGLE_OAUTH')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Technologies table
CREATE TABLE technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training records table
CREATE TABLE training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  technology_id UUID NOT NULL REFERENCES technologies(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  hours DECIMAL(6,2) NOT NULL CHECK (hours >= 0.5 AND hours <= 1000),
  completion_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training files table
CREATE TABLE training_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_record_id UUID NOT NULL REFERENCES training_records(id) ON DELETE CASCADE,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) UNIQUE NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size <= 10485760), -- 10MB in bytes
  mime_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT')),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),  -- Supports IPv6
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (for JWT token management)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Technologies table indexes
CREATE INDEX idx_technologies_name ON technologies(name);
CREATE INDEX idx_technologies_category ON technologies(category);

-- Training records table indexes
CREATE INDEX idx_training_records_user_id ON training_records(user_id);
CREATE INDEX idx_training_records_technology_id ON training_records(technology_id);
CREATE INDEX idx_training_records_created_at ON training_records(created_at);
CREATE INDEX idx_training_records_hours ON training_records(hours);
CREATE INDEX idx_training_records_completion_date ON training_records(completion_date);
CREATE INDEX idx_training_records_user_created ON training_records(user_id, created_at);

-- Training files table indexes
CREATE INDEX idx_training_files_training_record_id ON training_files(training_record_id);
CREATE INDEX idx_training_files_stored_filename ON training_files(stored_filename);

-- Audit logs table indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Sessions table indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Default admin user
-- Password: admin123 (hashed with bcrypt, cost factor 10)
INSERT INTO users (username, first_name, last_name, email, password_hash, role, auth_provider)
VALUES (
  'admin',
  'Admin',
  'User',
  'admin@bluetrailsoft.com',
  '$2b$10$ANG8vgaOjePI3hQJ3.i/VOw/I3APPPgijCx8nkh9cmPu1IbEkbHv2',
  'ADMIN',
  'LOCAL'
);

-- Default technologies
INSERT INTO technologies (name, category) VALUES
  ('JavaScript', 'Programming'),
  ('TypeScript', 'Programming'),
  ('React', 'Frontend'),
  ('Node.js', 'Backend'),
  ('Python', 'Programming'),
  ('QA Testing', 'Testing'),
  ('DevOps', 'Operations'),
  ('Cloud Computing', 'Infrastructure'),
  ('Database Design', 'Data'),
  ('Security', 'Security');

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for training_records table
CREATE TRIGGER update_training_records_updated_at
  BEFORE UPDATE ON training_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Create a health check table to verify database is working
CREATE TABLE IF NOT EXISTS _health_check (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO _health_check (created_at) VALUES (CURRENT_TIMESTAMP);

-- Display summary of created objects
DO $$
BEGIN
  RAISE NOTICE 'Database initialization complete!';
  RAISE NOTICE 'Tables created: users, technologies, training_records, training_files, audit_logs, sessions';
  RAISE NOTICE 'Indexes created: 20 performance indexes';
  RAISE NOTICE 'Seed data: 1 admin user, 10 technologies';
END $$;
