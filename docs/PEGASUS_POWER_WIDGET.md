# Pegasus Power Consumption Widget

## Overview
A new widget for monitoring Pegasus Astro power devices through the Pegasus Unity Platform REST API. This widget provides real-time power consumption, environmental monitoring, and device status visualization for connected Pegasus power management hardware.

---

## Supported Devices
- **PPBAdvance** - Pocket PowerBox Advance
- **PPB** - Pocket PowerBox
- **PPBMicro** - Pocket PowerBox Micro
- **UPBv3** - Ultimate PowerBox v3
- **UPBv2** - Ultimate PowerBox v2
- **SaddlePowerBox** - Saddle PowerBox

---

## Architecture

### Settings Integration

#### New Settings Tab: "Power Devices"
Add a new tab in `SettingsModal.tsx` alongside NINA Connection, Database, and Live Feeds.

**Settings Flow:**
1. **Check Pegasus Unity Status**
   - Endpoint: `GET http://localhost:32000/Server/DeviceManager/Connected`
   - Purpose: Verify Pegasus Unity Platform is running and get connected devices
   - Response: Array of connected devices with unique keys and device details

2. **Device Selection**
   - User selects device from dropdown populated by API response
   - Store selected device's `uniqueKey` and device type in configuration
   - Configuration stored in SQLite database via existing config system

**Configuration Structure:**
```typescript
interface PegasusConfig {
  enabled: boolean;
  unityBaseUrl: string;  // Default: http://localhost:32000
  deviceType: 'PPBAdvance' | 'PPB' | 'PPBMicro' | 'UPBv3' | 'UPBv2' | 'SaddlePowerBox' | null;
  uniqueKey: string;  // UUID from Pegasus Unity (e.g., "d003f9bc-6695-4398-9e09-5ccff0bc4b41")
  deviceID: string;  // Serial number (e.g., "PPBAAYSXQ3A")
  deviceName: string;  // Human-readable name (e.g., "Pocket PowerBox Advance")
  firmware: string;  // Firmware version
  refreshInterval: number;  // Default: 5000ms
}
```

---

### Widget Implementation

#### Data Source
**Primary Endpoint (Aggregate Report - All Data):**
```
GET /Driver/{DeviceType}/Report?DriverUniqueKey={UniqueKey}
```

**Example:**
```
GET http://localhost:32000/Driver/PPBAdvance/Report?DriverUniqueKey=d003f9bc-6695-4398-9e09-5ccff0bc4b41
```

**Additional Endpoints (Specific Data):**
- Power Only: `GET /Driver/{DeviceType}/Report/Power?DriverUniqueKey={UniqueKey}`
- Power Consumption: `GET /Driver/{DeviceType}/Report/PowerConsumption?DriverUniqueKey={UniqueKey}`
- Connected Devices: `GET /Server/DeviceManager/Connected`
- Telemetry: `GET /Server/TelemetryDevices`

#### Response Data Model

**Aggregate Report Response (Primary Data Source):**
```typescript
interface PegasusAggregateReport {
  status: string;  // "success"
  code: number;    // 200, 400, 401, 403, 404, 500, 501
  message: string; // "Readings report."
  data: {
    uniqueKey: string;  // UUID (e.g., "d003f9bc-6695-4398-9e09-5ccff0bc4b41")
    name: string;       // Device type (e.g., "PPBAdvance")
    message: {
      messageType: string;  // "AggregateReportPPB"
      
      // Power Metrics
      voltage: number;      // Volts (e.g., 13.2)
      current: number;      // Total Amps (e.g., 0.44)
      quadCurrent: number;  // Quad USB current in Amps (e.g., 0.3)
      power: number;        // Watts (e.g., 5)
      
      // Environmental Metrics
      temperature: number;  // Celsius (e.g., 14.4)
      humidity: number;     // Percentage (e.g., 48)
      dewPoint: number;     // Celsius (e.g., 3.5)
      
      // Operational Status
      isOverCurrent: boolean;
      averageAmps: number;   // Running average (e.g., 0.21)
      ampsPerHour: number;   // Amp-hour consumption (e.g., 0.34)
      wattPerHour: number;   // Watt-hour consumption (e.g., 4.45)
      upTime: string;        // TimeSpan format "HH:MM:SS.mmmmmmm" (e.g., "01:35:28.3530000")
      
      // Dew Heater Hub Status
      dewHubStatus: {
        messageType: string;  // "DewHubStatusPPB"
        hub: Array<{
          messageType: string;  // "DewPortStatus"
          current: {
            messageType: string;  // "PortCurrentStatus"
            value: number;        // Current in Amps
            isOverCurrent: boolean;
          };
          port: {
            messageType: string;  // "DewPortState"
            number: number;       // Port number (1-based)
            power: number;        // Power percentage (0-100)
          };
        }>;
      };
      
      // Power Hub Status
      powerHubStatus: {
        messageType: string;  // "SwitchState"
        state: string;        // "ON" | "OFF"
      };
      
      // Variable Voltage Port (PPBAdvance only)
      powerVariablePortStatus: {
        messageType: string;  // "SwitchState"
        state: string;        // "ON" | "OFF"
      };
      
      // Dual USB Status (PPBAdvance only)
      ppbA_DualUSB2Status: {
        messageType: string;  // "SwitchState"
        state: string;        // "ON" | "OFF"
      };
    };
  };
}

interface PegasusConnectedDevice {
  uniqueKey: string;   // "d003f9bc-6695-4398-9e09-5ccff0bc4b41"
  name: string;        // "PPBAdvance"
  fullName: string;    // "Pocket PowerBox Advance"
  deviceID: string;    // "PPBAAYSXQ3A"
  firmware: string;    // "2.12.3"
  revision: string;    // "A"
}

interface PegasusTelemetryData {
  deviceType: string;        // "PPBAdvance [PPBAAYSXQ3A]"
  deviceSerialNum: string;   // "PPBAAYSXQ3A"
  upTime: string;            // Hours as decimal (e.g., "0.45")
  averageAmps: string;       // Average amps as string (e.g., "0.2")
  lowestVoltage: string;     // Minimum voltage recorded (e.g., "13.2")
  highestVoltage: string;    // Maximum voltage recorded (e.g., "13.2")
  lostPackets: number;       // Packet loss count
  messageType: string;       // "TelemetryDevice"
}
```

---

## Widget UI Design Specification

### Layout Concept
Taking inspiration from Pegasus Unity's dashboard but with unique NINA.WebControlPanel styling using Radix UI components.

### Primary Display Sections

#### 1. Power Metrics Panel
**Large, prominent display of key power data:**
- **Voltage** - Large circular gauge (similar to existing widgets)
  - Color coding: Green (11.5V-13V), Yellow (11V-11.5V), Red (<11V or >13V)
- **Current Draw** - Circular gauge with current consumption
  - Display in Amps with color coding for load percentage
- **Power Consumption** - Digital display showing Watts
  - Secondary display for Wh (Watt-hours) accumulated

**Layout:** Horizontal flex with 3 circular gauges (similar to SystemStatusWidget)

#### 2. Environmental Monitoring
**Compact environmental data display:**
- Temperature (°C)
- Humidity (%)
- Dew Point (°C)

**Layout:** Card with 3 inline metrics using Radix UI Badge components

#### 3. Consumption Tracking
**Power usage over time:**
- Average Amps
- Amp-hours (Ah)
- Watt-hours (Wh)
- Uptime display

**Layout:** Compact table or grid showing accumulated consumption data

#### 4. Dew Heater Status (if device supports)
**Visual representation of dew heater ports:**
- Port number badges
- Power level indicators (0-100%)
- Over-current warnings
- Individual port current draw

**Layout:** Horizontal flex of port status cards (up to 4 ports typically)

#### 5. Port Status Indicators (device-specific)
**Toggle indicators for device-specific ports:**
- Power Hub: ON/OFF badge
- Variable Voltage Port: ON/OFF with voltage display (PPBAdvance)
- Dual USB2: ON/OFF badge (PPBAdvance)

**Layout:** Inline badge group with color coding (green=ON, gray=OFF)

---

## Visual Design Guidelines

### Color Scheme (Radix UI)
- **Normal Operation:** `green` variant
- **Warning States:** `yellow`/`orange` variant
- **Critical/Error:** `red` variant
- **Disabled/Off:** `gray` variant
- **Active Elements:** `blue`/`accent` variant

### Component Usage
- **Gauges:** Use existing circular gauge pattern from SystemStatusWidget
- **Badges:** Radix UI `Badge` component for status indicators
- **Cards:** Radix UI `Card` for section grouping
- **Icons:** Radix Icons for port indicators, warnings, power symbols
- **Text:** Radix UI `Text` component with appropriate sizing

### Responsive Behavior
- **Desktop:** Multi-column layout with all sections visible
- **Mobile:** Stacked vertical layout with collapsible sections
- **Minimum widget size:** 4x6 grid units (similar to WeatherWidget)
- **Recommended size:** 6x8 grid units for full feature display

---

## Implementation Plan

### Phase 1: Settings Integration
**Files to modify:**
- `src/client/src/components/SettingsModal.tsx` - Add "Power Devices" tab
- `src/client/src/interfaces/config.ts` - Add PegasusConfig interface
- `src/server/configDatabase.js` - Add Pegasus configuration schema
- `src/server/api/config.js` - Handle Pegasus config endpoints

**New endpoints needed:**
- `GET /api/pegasus/status` - Check if Unity is running
- `GET /api/pegasus/devices` - Get connected devices list
- `GET /api/config/pegasus` - Get Pegasus configuration
- `PUT /api/config/pegasus` - Update Pegasus configuration

### Phase 2: Widget Component
**New files to create:**
- `src/client/src/components/PegasusPowerWidget.tsx` - Main widget component
- `src/client/src/interfaces/pegasus.ts` - TypeScript interfaces for Pegasus data
- `src/client/src/services/pegasusApi.ts` - API service for Pegasus endpoints

**Backend integration:**
- `src/server/api/pegasus.js` - Proxy API calls to Pegasus Unity
- Add widget to default widgets in `configDatabase.js`

### Phase 3: Testing & Refinement
**Requirements:**
- Test with real Pegasus Unity API
- Verify all device types work correctly
- Handle connection errors gracefully
- Implement proper loading states
- Add refresh mechanism

---

## API Integration Details

### Pegasus Unity Detection
```javascript
// Check if Pegasus Unity is running
const checkPegasusUnity = async () => {
  try {
    const response = await fetch('http://localhost:32000/Server/DeviceManager/Connected');
    if (!response.ok) throw new Error('Pegasus Unity not responding');
    const result = await response.json();
    return {
      available: result.status === 'success',
      devices: result.data || [],
      message: result.message
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
};
```

### Device List Retrieval
```javascript
// Get list of connected devices
const getConnectedDevices = async () => {
  const response = await fetch('http://localhost:32000/Server/DeviceManager/Connected');
  const result = await response.json();
  
  if (result.status !== 'success') {
    throw new Error(result.message || 'Failed to get connected devices');
  }
  
  // Filter for power devices only
  return result.data.filter(device => 
    ['PPBAdvance', 'PPB', 'PPBMicro', 'UPBv3', 'UPBv2', 'SaddlePowerBox']
      .includes(device.name)
  );
};
```

### Report Data Fetching
```javascript
// Fetch aggregate device report (all data in one call)
const getPowerReport = async (deviceType: string, uniqueKey: string) => {
  const url = `http://localhost:32000/Driver/${deviceType}/Report?DriverUniqueKey=${uniqueKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch report: ${response.status}`);
  const result = await response.json();
  
  if (result.status !== 'success') {
    throw new Error(result.message || 'Failed to get power report');
  }
  
  return result.data;
};

// Optional: Fetch specific report types for lighter payloads
const getPowerOnly = async (deviceType: string, uniqueKey: string) => {
  const url = `http://localhost:32000/Driver/${deviceType}/Report/Power?DriverUniqueKey=${uniqueKey}`;
  const response = await fetch(url);
  return await response.json();
};

const getPowerConsumption = async (deviceType: string, uniqueKey: string) => {
  const url = `http://localhost:32000/Driver/${deviceType}/Report/PowerConsumption?DriverUniqueKey=${uniqueKey}`;
  const response = await fetch(url);
  return await response.json();
};
```

---

## Error Handling

### Connection Errors
- Display clear message if Pegasus Unity is not running
- Provide link/instructions to download Pegasus Unity Platform
- Show "Disconnected" state in widget with retry button

### API Errors
- Handle HTTP error codes appropriately:
  - `404` - Device not found or driver not started
  - `401/403` - Authentication issues (shouldn't occur for localhost)
  - `500/501` - Internal server error
- Display error state in widget without breaking dashboard

### Missing Data
- Handle null/undefined fields gracefully
- Show "N/A" or appropriate placeholder for missing metrics
- Device-specific features should conditionally render

---

## Configuration Database Schema

### New config keys:
```sql
-- Pegasus Unity configuration
pegasus.enabled = true/false
pegasus.unityBaseUrl = "http://localhost:32000"
pegasus.deviceType = "PPBAdvance"
pegasus.uniqueKey = "d003f9bc-6695-4398-9e09-5ccff0bc4b41"
pegasus.deviceID = "PPBAAYSXQ3A"
pegasus.deviceName = "Pocket PowerBox Advance"
pegasus.firmware = "2.12.3"
pegasus.refreshInterval = 5000
```

---

## Widget Default Configuration
```javascript
{
  id: 'pegasus-power',
  component: 'PegasusPowerWidget',
  title: 'Pegasus Power',
  x: 0,
  y: 26,
  w: 6,
  h: 8,
  minW: 4,
  minH: 6
}
```

---

## Future Enhancements (Post-MVP)

### Advanced Features
1. **Historical Data Graphing**
   - Use Pegasus Unity's `/Reporting/Device/{uniquekey}/Dates` endpoint
   - Display power consumption trends over time
   - Similar to GuiderGraphWidget implementation

2. **Multiple Device Support**
   - Allow monitoring multiple Pegasus devices simultaneously
   - Tabbed interface or device selector dropdown

3. **Alert Thresholds**
   - Configurable alerts for voltage drops
   - Over-current warnings
   - Temperature/humidity alerts

4. **Port Control Integration**
   - Direct power hub control from widget
   - Dew heater adjustments
   - Quick power cycling

5. **Energy Cost Tracking**
   - Configure electricity rate
   - Calculate session costs
   - Export consumption reports

---

## Dependencies

### New NPM Packages
No additional packages required - use existing dependencies:
- Radix UI (already installed)
- Radix Icons (already installed)
- TypeScript (already configured)

### External Dependencies
- **Pegasus Unity Platform** must be installed and running on same machine
  - Default port: 32000
  - Download: https://pegasusastro.com/support/unity-platform/

---

## Testing Strategy

### Unit Tests
- Component rendering with mock data
- API service functions
- Error handling scenarios
- Configuration validation

### Integration Tests
- Settings modal device selection flow
- Widget data fetching and display
- Refresh mechanism
- Database configuration persistence

### Manual Testing Checklist
- [ ] Verify Pegasus Unity detection
- [ ] Test with each supported device type
- [ ] Validate all metrics display correctly
- [ ] Check responsive layout (desktop/mobile)
- [ ] Test error states (Unity not running, device disconnected)
- [ ] Verify configuration persistence
- [ ] Check widget hide/show functionality
- [ ] Test with no device configured
- [ ] Validate color coding and thresholds

---

## Documentation Requirements

### User Documentation
- How to install Pegasus Unity Platform
- How to configure Pegasus device in settings
- Understanding power metrics and what they mean
- Troubleshooting connection issues

### Developer Documentation
- API integration patterns
- Adding support for new Pegasus devices
- Extending widget functionality
- Custom threshold configuration

---

## Real API Sample Data

### Connected Devices Response
```json
{
  "status": "success",
  "code": 200,
  "message": "Connected Devices :1",
  "data": [
    {
      "uniqueKey": "d003f9bc-6695-4398-9e09-5ccff0bc4b41",
      "name": "PPBAdvance",
      "fullName": "Pocket PowerBox Advance",
      "deviceID": "PPBAAYSXQ3A",
      "firmware": "2.12.3",
      "revision": "A"
    }
  ]
}
```

### Aggregate Report Response (Full Data)
```json
{
  "status": "success",
  "code": 200,
  "message": "Readings report.",
  "data": {
    "uniqueKey": "d003f9bc-6695-4398-9e09-5ccff0bc4b41",
    "name": "PPBAdvance",
    "message": {
      "voltage": 13.2,
      "current": 0.44,
      "quadCurrent": 0.3,
      "power": 5,
      "temperature": 14.4,
      "humidity": 48,
      "dewPoint": 3.5,
      "isOverCurrent": false,
      "averageAmps": 0.21,
      "ampsPerHour": 0.34,
      "wattPerHour": 4.45,
      "upTime": "01:35:28.3530000",
      "dewHubStatus": {
        "hub": [
          {
            "current": {
              "value": 0,
              "isOverCurrent": false,
              "messageType": "PortCurrentStatus"
            },
            "port": {
              "number": 1,
              "power": 0,
              "messageType": "DewPortState"
            },
            "messageType": "DewPortStatus"
          },
          {
            "current": {
              "value": 0,
              "isOverCurrent": false,
              "messageType": "PortCurrentStatus"
            },
            "port": {
              "number": 2,
              "power": 0,
              "messageType": "DewPortState"
            },
            "messageType": "DewPortStatus"
          }
        ],
        "messageType": "DewHubStatusPPB"
      },
      "powerHubStatus": {
        "state": "ON",
        "messageType": "SwitchState"
      },
      "powerVariablePortStatus": {
        "state": "ON",
        "messageType": "SwitchState"
      },
      "ppbA_DualUSB2Status": {
        "state": "ON",
        "messageType": "SwitchState"
      },
      "messageType": "AggregateReportPPB"
    }
  }
}
```

### Telemetry Data Response
```json
{
  "status": "success",
  "code": 200,
  "message": "GetTelemetrySessionData",
  "data": [
    {
      "deviceType": "PPBAdvance [PPBAAYSXQ3A]",
      "deviceSerialNum": "PPBAAYSXQ3A",
      "upTime": "0.45",
      "averageAmps": "0.2",
      "lowestVoltage": "13.2",
      "highestVoltage": "13.2",
      "lostPackets": 0,
      "messageType": "TelemetryDevice"
    }
  ]
}
```

## Questions Answered

1. ✅ **API response structure** - Validated with real data above
2. ⏳ **Device-specific variations** - Currently have PPBAdvance data; other models need testing
3. ✅ **Refresh rate recommendations** - 5000ms (5 seconds) is appropriate for non-critical power monitoring
4. ✅ **Maximum dew heater ports** - PPBAdvance has 2 ports; varies by device (plan for up to 4 in UI)
5. ⏳ **Variable voltage range** - Need to query voltage control endpoint (not in report data)
6. ✅ **Uptime format** - Uses .NET TimeSpan format "HH:MM:SS.mmmmmmm" (e.g., "01:35:28.3530000")

---

## Status
**Current Status:** Ready for Implementation - Sample Data Validated ✅

**Validated Information:**
- ✅ API endpoints confirmed and tested
- ✅ Data structures validated with real responses
- ✅ Device model identified (PPBAdvance with serial PPBAAYSXQ3A)
- ✅ All critical metrics available in aggregate report
- ✅ Uptime format confirmed (TimeSpan)
- ✅ Dew heater structure validated (2 ports on test device)

**Next Steps:**
1. Create mockups/wireframes for widget layout
2. Begin Phase 1 implementation (Settings Integration)
3. Implement Phase 2 (Widget Component with real endpoints)
4. Test with additional device types (PPB, UPBv3, etc.)

---

*Last Updated: December 15, 2025*
*Document Version: 2.0 - Real Data Validated*
*Validated Against: Pegasus Unity Platform with PPBAdvance (PPBAAYSXQ3A)*
