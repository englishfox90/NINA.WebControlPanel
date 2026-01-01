// API Configuration for NINA WebControlPanel
// Automatically uses the same host as the current website URL

// Dynamically get the current host from the browser's location
const getCurrentHost = (): string => {
  if (typeof window !== 'undefined') {
    // Extract protocol and hostname from current location
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}`;
  }
  // Fallback for server-side rendering or initial load
  return 'http://localhost';
};

// API base URL uses same host as website but port 3001
export const API_BASE_URL = `${getCurrentHost()}:3001`;

// Helper function to get the base API URL
export const getBaseApiUrl = (): string => {
  return API_BASE_URL;
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/api/${cleanEndpoint}`;
};

// Debug logging for development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Dynamic API Configuration:', {
    currentHost: getCurrentHost(),
    API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV
  });
}

const apiConfig = {
  API_BASE_URL,
  getApiUrl,
  getBaseApiUrl
};

export default apiConfig;
