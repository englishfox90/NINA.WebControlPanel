import axios, { AxiosResponse, AxiosError } from 'axios';

// API utility functions and helpers
const DEFAULT_TIMEOUT = 5000;

export const createApiClient = (baseURL: string, timeout: number = DEFAULT_TIMEOUT) => {
  return axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Error handling utility
export const handleApiError = (error: AxiosError): string => {
  if (error.response) {
    // Server responded with error status
    return `API Error: ${error.response.status} - ${error.response.statusText}`;
  } else if (error.request) {
    // Network error
    return 'Network Error: Unable to reach the server';
  } else {
    // Other error
    return `Request Error: ${error.message}`;
  }
};

// Generic API call wrapper with error handling
export const makeApiCall = async <T>(
  apiCall: () => Promise<AxiosResponse<T>>,
  errorMessage: string = 'API call failed'
): Promise<T> => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error(errorMessage, error);
    throw new Error(handleApiError(error as AxiosError));
  }
};

// Utility to format timestamps
export const formatTimestamp = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Utility to format durations
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

// Utility to format temperature
export const formatTemperature = (celsius: number): string => {
  return `${celsius.toFixed(1)}°C`;
};

// Utility to format file sizes
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Add more utility functions as needed for other API interactions.