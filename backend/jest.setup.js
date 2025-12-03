// Global test setup - suppress console.error during tests
// This reduces noise from expected error logs during validation testing

const originalError = console.error;

beforeAll(() => {
  // Suppress console.error during tests
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console.error after all tests
  console.error = originalError;
});

