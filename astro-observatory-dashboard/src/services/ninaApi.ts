import axios, { AxiosResponse } from 'axios';
import { NINAStatusResponse, NINAApiError } from '../types/nina';

const NINA_API_BASE_URL = process.env.REACT_APP_NINA_API_URL || 'http://localhost:8080/api'; // Configurable via environment

// Mock mode for development when NINA isn't available
const MOCK_MODE = process.env.REACT_APP_MOCK_NINA === 'true' || true; // Enable mock by default

// Mock data for development
const mockNINAStatus: NINAStatusResponse = {
  status: 'Imaging in progress',
  isConnected: true,
  isRunning: true,
  progress: 75,
  currentTarget: 'M31 - Andromeda Galaxy',
  sequenceProgress: {
    current: 18,
    total: 24
  },
  equipment: {
    camera: {
      connected: true,
      temperature: -10.2
    },
    mount: {
      connected: true,
      tracking: true
    },
    filterWheel: {
      connected: true,
      position: 1,
      filter: 'Luminance'
    }
  }
};

export const fetchNINAStatus = async (): Promise<NINAStatusResponse> => {
  if (MOCK_MODE) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockNINAStatus;
  }

  try {
    const response: AxiosResponse<NINAStatusResponse> = await axios.get(
      `${NINA_API_BASE_URL}/status`,
      { timeout: 5000 }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching NINA status:', error);
    throw new Error('Failed to fetch NINA status');
  }
};

export const fetchSequenceInfo = async () => {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      activeSequence: 'Deep Sky Sequence',
      totalFrames: 24,
      completedFrames: 18,
      estimatedTimeRemaining: '2h 15m'
    };
  }

  try {
    const response = await axios.get(`${NINA_API_BASE_URL}/sequence`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Error fetching sequence info:', error);
    throw new Error('Failed to fetch sequence information');
  }
};

export const fetchEquipmentStatus = async () => {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      camera: { connected: true, temperature: -10.2, coolerPower: 85 },
      mount: { connected: true, tracking: true, ra: '02:20:00', dec: '+41:16:00' },
      filterWheel: { connected: true, position: 1, filterName: 'Luminance' },
      focuser: { connected: true, position: 12543, temperature: 5.8 }
    };
  }

  try {
    const response = await axios.get(`${NINA_API_BASE_URL}/equipment`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Error fetching equipment status:', error);
    throw new Error('Failed to fetch equipment status');
  }
};

export const fetchLatestImage = async () => {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      url: 'https://via.placeholder.com/800x600/1a1f2e/ffffff?text=Latest+Capture',
      timestamp: new Date().toISOString(),
      metadata: {
        exposure: '300s',
        filter: 'Luminance',
        temperature: -10.2,
        target: 'M31 - Andromeda Galaxy'
      }
    };
  }

  try {
    const response = await axios.get(`${NINA_API_BASE_URL}/images/latest`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Error fetching latest image:', error);
    throw new Error('Failed to fetch latest image');
  }
};

// Utility function to check if NINA API is available
export const checkNINAConnection = async (): Promise<boolean> => {
  if (MOCK_MODE) {
    return true;
  }

  try {
    await axios.get(`${NINA_API_BASE_URL}/health`, { timeout: 2000 });
    return true;
  } catch (error) {
    console.warn('NINA API connection failed:', error);
    return false;
  }
};