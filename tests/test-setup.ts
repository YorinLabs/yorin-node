// Mock fetch globally for Node.js environment
import { jest } from "@jest/globals";

// Create a mock fetch function with proper typing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Export the mock for node-fetch module mapping
export default mockFetch;

// Also set up global fetch for any direct usage
global.fetch = mockFetch;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockClear();
});
