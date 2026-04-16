import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.VITE_API_URL = 'http://localhost:8000/api';
process.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id';

// Global test setup
beforeAll(() => {
  // Setup code that runs once before all tests
});

afterAll(() => {
  // Cleanup code that runs once after all tests
});
