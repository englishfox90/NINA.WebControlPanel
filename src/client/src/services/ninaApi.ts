import axios, { AxiosResponse } from 'axios';
import { NINAStatusResponse, NINAApiError, NINAEventResponse, NINAEvent } from '../interfaces/nina';
import { ConfigService } from './configService';

const NINA_API_BASE_URL = process.env.REACT_APP_NINA_API_URL || 'http://localhost:3001/api'; // Our backend server

// Get NINA URL from config
let NINA_DIRECT_URL = 'http://172.26.81.152:1888'; // Default fallback

// Load config on module initialization
ConfigService.getConfig().then(config => {
  NINA_DIRECT_URL = `${config.nina.baseUrl.replace(/\/$/, '')}:${config.nina.apiPort}`;
}).catch(() => {
  console.warn('Using default NINA API URL');
});

// Mock mode for development when NINA isn't available
const MOCK_MODE = process.env.REACT_APP_MOCK_NINA === 'true' || false; // Disable mock to use real NINA API

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

// Fetch NINA event history
export const fetchNINAEventHistory = async (): Promise<NINAEvent[]> => {
  if (MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      {
        Event: 'SEQUENCE-STARTING',
        Time: new Date(Date.now() - 3600000).toISOString()
      },
      {
        Event: 'TS-TARGETSTART',
        Time: new Date(Date.now() - 3300000).toISOString(),
        TargetName: 'M31 - Andromeda Galaxy',
        ProjectName: 'Andromeda Deep Field',
        TargetEndTime: new Date(Date.now() + 7200000).toISOString(),
        Rotation: 180,
        Coordinates: {
          RA: 0.712,
          Dec: 41.269,
          RAString: '00:42:44',
          DecString: '+41:16:09',
          Epoch: 'J2000',
          RADegrees: 10.683
        }
      },
      {
        Event: 'FILTERWHEEL-CHANGED',
        Time: new Date(Date.now() - 1800000).toISOString(),
        Previous: { Name: 'L', Id: 1 },
        New: { Name: 'Ha', Id: 2 }
      },
      {
        Event: 'IMAGE-SAVE',
        Time: new Date(Date.now() - 600000).toISOString()
      }
    ];
  }

  try {
    const response: AxiosResponse<NINAEventResponse> = await axios.get(
      `${NINA_API_BASE_URL}/nina/event-history`,
      { timeout: 10000 }
    );
    
    if (response.data.Success && Array.isArray(response.data.Response)) {
      console.log('✅ Fetched NINA event history:', response.data.Response.length, 'events');
      return response.data.Response;
    }
    
    throw new Error('Invalid event history response');
  } catch (error) {
    console.error('❌ Error fetching NINA event history:', error);
    // Return empty array on error to allow graceful fallback
    return [];
  }
};

// Create WebSocket connection to NINA
export const createNINAWebSocket = (onMessage: (event: NINAEvent) => void): WebSocket | null => {
  if (MOCK_MODE) {
    // Create a mock WebSocket for development
    const mockWs = {
      onopen: null as ((event: Event) => void) | null,
      onmessage: null as ((event: MessageEvent) => void) | null,
      onclose: null as ((event: CloseEvent) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      close: () => {},
      readyState: WebSocket.OPEN
    };
    
    // Simulate periodic events
    setTimeout(() => {
      if (mockWs.onmessage) {
        const mockEvent = {
          data: JSON.stringify({
            Response: {
              Event: 'IMAGE-SAVE',
              Time: new Date().toISOString()
            },
            Success: true,
            Type: 'Socket'
          })
        } as MessageEvent;
        mockWs.onmessage(mockEvent);
      }
    }, 5000);
    
    return mockWs as any;
  }

  try {
    // Extract hostname from NINA_DIRECT_URL for WebSocket
    const url = new URL(NINA_DIRECT_URL);
    const ws = new WebSocket(`ws://${url.host}/v2/socket`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.Response && data.Response.Event) {
          onMessage(data.Response);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    return ws;
  } catch (error) {
    console.error('Failed to create NINA WebSocket:', error);
    return null;
  }
};