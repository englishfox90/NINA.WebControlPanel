# Guider Widget Enhancement Summary
*Updated: September 3, 2025*

## ✅ Completed Features

### 1. New Configuration Option: Guider Exposure Duration
- **Added**: `nina.guiderExposureDuration` configuration parameter (default: 2.0 seconds)
- **Backend**: Updated `configDatabase.js` to include the new setting in default configuration
- **Frontend TypeScript**: Updated all configuration interfaces and services:
  - `src/client/src/interfaces/config.ts` - Added to NINAConfig interface
  - `src/client/src/services/configDatabase.ts` - Updated default configs and getConfig method
  - `src/client/src/services/configService.ts` - Updated default config

### 2. Settings Modal Integration
- **Enhanced**: Settings Modal now includes Guider Exposure Duration field
- **Location**: NINA Connection tab in settings
- **Features**:
  - Number input with 0.1 to 30.0 second range
  - 0.1 second step precision
  - Clear description for users
  - Integrated with existing config save/load system

### 3. Modular Architecture (Keeping Files Under 500 LOC)
- **Created**: `GuiderService` class (`src/client/src/services/guiderService.ts`)
  - Handles WebSocket connections and event management
  - Manages guider state and adaptive polling
  - Configurable exposure duration with 1.5x refresh rate calculation
  - Event subscription system for real-time updates

- **Created**: Guider Chart Utilities (`src/client/src/utils/guiderChart.ts`)
  - Time-based chart data processing
  - Converts guide steps to time-based measurements
  - Configurable chart options with exposure duration context
  - Enhanced tooltips with time-ago information

### 4. Time-Based Measurements & Adaptive Refresh
- **Implemented**: Time-based chart labeling (replaces step numbers)
- **Features**:
  - Labels show time ago (e.g., "-30s", "-2m") instead of step numbers
  - Adaptive refresh rate: 1.5x the guider exposure duration
  - Only polls when actively guiding (GUIDER-START to GUIDER-STOP)
  - WebSocket-based event handling for connection changes
  - Smart reconnection with equipment-aware delays

### 5. Enhanced User Experience
- **Real-time Status**: Shows guiding state (Guiding/Connected/Disconnected) with color-coded badges
- **Exposure Duration Display**: Shows current exposure setting in widget header
- **Improved Tooltips**: Time-based information with "Captured X ago" details
- **Better Error Handling**: Graceful fallbacks and clear error messages

### 6. Backend API Integration
- **Added**: `/api/nina/guider-graph` endpoint in `api-routes.js`
- **Connected**: To existing NINAService.getGuiderGraph() method
- **Consistent**: Follows established API response patterns

## 🔧 Technical Implementation Details

### Configuration Flow
1. **Default Value**: 2.0 seconds set in backend configDatabase.js
2. **Settings UI**: Exposed in NINA Connection tab with validation
3. **Runtime Update**: GuiderService automatically adjusts polling when config changes
4. **Persistence**: Stored in SQLite database with other settings

### Polling Strategy
- **Idle State**: No polling, relies on WebSocket events only
- **Active Guiding**: Polls every `exposureDuration * 1.5` seconds
- **Event Driven**: WebSocket events trigger immediate refreshes
- **Efficient**: Minimizes API calls when not actively guiding

### WebSocket Integration
- **Unified Connection**: Uses `/ws/unified` endpoint for consistent event handling
- **Event Types**: Responds to GUIDER-CONNECTED, GUIDER-DISCONNECTED, GUIDER-START, GUIDER-STOP
- **Smart Delays**: Different refresh delays for connection vs. state changes

### Chart Enhancements
- **Time Axis**: Shows relative time instead of step numbers
- **History Limit**: Configurable max history (default: 30 minutes)
- **Dynamic Scaling**: Chart scales based on exposure duration
- **Enhanced Tooltips**: Shows step number, values, and time-ago information

## 📁 Files Modified

### Backend Files
- `src/server/configDatabase.js` - Added guiderExposureDuration to default config
- `src/server/api-routes.js` - Added /api/nina/guider-graph endpoint

### Frontend Configuration
- `src/client/src/interfaces/config.ts` - Updated NINAConfig interface
- `src/client/src/services/configDatabase.ts` - Updated config methods
- `src/client/src/services/configService.ts` - Updated default config

### Frontend Components & Services
- `src/client/src/components/SettingsModal.tsx` - Added guider exposure duration field
- `src/client/src/components/GuiderGraphWidget.tsx` - Completely refactored with modular architecture
- `src/client/src/services/guiderService.ts` - **NEW** - Modular guider management
- `src/client/src/utils/guiderChart.ts` - **NEW** - Time-based chart processing

## 🎯 Key Benefits

1. **Configuration Driven**: Users can easily adjust guider exposure duration through settings
2. **Adaptive Performance**: Refresh rates automatically adjust to exposure settings
3. **Modular Code**: Each file stays under 500 LOC as requested
4. **Real-time Monitoring**: Only polls when necessary, efficient resource usage
5. **Time-based Context**: Chart provides meaningful time-based information
6. **Production Ready**: Robust error handling and graceful fallbacks
7. **WebSocket Integration**: Leverages existing stable WebSocket infrastructure

## 🚀 Usage

1. **Configure Exposure**: Go to Settings → NINA Connection tab → Set "Guider Exposure Duration"
2. **Automatic Adaptation**: Widget automatically adjusts refresh rate (1.5x exposure duration)
3. **Active Monitoring**: Chart only updates during active guiding sessions (GUIDER-START to GUIDER-STOP)
4. **Time-based View**: Chart shows time-relative data for better context

## ⚡ Performance Impact

- **Reduced API Calls**: No polling when not guiding
- **Smart Refresh**: Exposure-duration-aware polling intervals
- **Memory Efficient**: Modular services with proper cleanup
- **WebSocket Optimized**: Leverages existing stable connection infrastructure

---

All requirements successfully implemented:
✅ New config option for Guider Exposure Duration (default 2 sec)  
✅ Exposed in settings modal for easy updates  
✅ Time-based measurements using exposure duration  
✅ Adaptive refresh rate (1.5x exposure time)  
✅ Only active during GUIDER-START to GUIDER-STOP  
✅ Files kept under 500 LOC through modularization
