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
   - Endpoint: `GET http://localhost:32000/Reporting/Device`
   - Purpose: Verify Pegasus Unity Platform is running and get connected devices
   - Response: Array of connected devices with unique keys

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
  deviceId: string;  // UUID from Pegasus Unity
  deviceName: string;  // Human-readable name
  refreshInterval: number;  // Default: 5000ms
}
```

---

### Widget Implementation

#### Data Source
**Primary Endpoint:**
```
GET /Driver/{DeviceType}/Report?DriverUniqueKey={DeviceId}
```

**Example:**
```
GET http://localhost:32000/Driver/PPBAdvance/Report?DriverUniqueKey=12345678-1234-1234-1234-123456789abc
```

#### Response Data Model

```typescript
interface PegasusPowerReport {
  status: string | null;
  code: RJesCode;  // 200, 201, 202, 204, 400, 401, 403, 404, 500, 501
  message: string | null;
  data: {
    uniqueKey: string;  // UUID
    name: string | null;
    message: {
      messageType: string | null;
      
      // Power Metrics
      voltage: number;           // Volts
      current: number;           // Amps
      quadCurrent: number;       // Quad USB current
      power: number;             // Watts
      
      // Environmental Metrics
      temperature: number;       // Celsius
      humidity: number;          // Percentage
      dewPoint: number;          // Celsius
      
      // Operational Status
      isOverCurrent: boolean;
      averageAmps: number;
      ampsPerHour: number;       // Consumption tracking
      wattPerHour: number;       // Power consumption
      upTime: string | null;     // Device uptime
      
      // Dew Heater Hub Status
      dewHubStatus: {
        messageType: string | null;
        hub: Array<{
          messageType: string | null;
          current: {
            messageType: string | null;
            value: number;
            isOverCurrent: boolean;
          };
          port: {
            messageType: string | null;
            number: number;       // Port number
            power: number;        // Power percentage (0-100)
          };
        }> | null;
      };
      
      // Power Hub Status
      powerHubStatus: {
        messageType: string | null;
        state: string | null;    // "On" | "Off"
      };
      
      // Variable Voltage Port (PPBAdvance only)
      powerVariablePortStatus: {
        messageType: string | null;
        state: string | null;    // "On" | "Off"
      };
      
      // Dual USB Status (PPBAdvance only)
      ppbA_DualUSB2Status: {
        messageType: string | null;
        state: string | null;    // "On" | "Off"
      };
    };
  };
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
    const response = await fetch('http://localhost:32000/Reporting/Device');
    if (!response.ok) throw new Error('Pegasus Unity not responding');
    return await response.json();
  } catch (error) {
    return { available: false, error: error.message };
  }
};
```

### Device List Retrieval
```javascript
// Get list of connected devices
const getConnectedDevices = async () => {
  const response = await fetch('http://localhost:32000/Reporting/Device');
  const devices = await response.json();
  // Filter for power devices only
  return devices.filter(device => 
    ['PPBAdvance', 'PPB', 'PPBMicro', 'UPBv3', 'UPBv2', 'SaddlePowerBox']
      .includes(device.deviceType)
  );
};
```

### Report Data Fetching
```javascript
// Fetch device report
const getPowerReport = async (deviceType: string, deviceId: string) => {
  const url = `http://localhost:32000/Driver/${deviceType}/Report?DriverUniqueKey=${deviceId}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch report: ${response.status}`);
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
pegasus.deviceId = "12345678-1234-1234-1234-123456789abc"
pegasus.deviceName = "Main Power Box"
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

## Open Questions / Pending Sample Data

1. **Actual API response structure** - Need real sample data to validate interface definitions
2. **Device-specific variations** - Do all devices return the same data structure?
3. **Refresh rate recommendations** - What's optimal for performance vs. real-time updates?
4. **Maximum dew heater ports** - How many ports do devices support (for UI sizing)?
5. **Variable voltage range** - What voltages are supported by PPBAdvance?
6. **Uptime format** - What format is the uptime string? (e.g., "12:34:56" or "12h 34m"?)

---

## Status
**Current Status:** Design Phase - Awaiting Sample Data

**Next Steps:**
1. Obtain sample API responses from actual Pegasus Unity installation
2. Validate data structure against API documentation
3. Create mockups/wireframes for widget layout approval
4. Begin Phase 1 implementation (Settings Integration)

---

*Last Updated: November 28, 2025*
*Document Version: 1.0*
*Author: AI Assistant (based on user requirements)*
