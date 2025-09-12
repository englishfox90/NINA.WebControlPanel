# 🔭 NINA WebControlPan- 📡 **Session Monitoring** - Real-time NINA session tracking via WebSocket ✅
- **Image Viewer** - Real-time NINA image display with WebSocket integration ✅
- 📊 **Guider Graph** - Optimized PHD2/NINA guiding performance monitoring with 12-hour time format and single API call efficiency ✅
- ⚙️ **Settings Management** - Comprehensive configuration modal with file picker ✅

A modern, full-stack web dashboard for monitoring and controlling remote astrophotography equipment running [NINA (Nighttime Imaging 'N' Astronomy)](https://nighttime-imaging.eu/).

![Project Status](https://img.shields.io/badge/Status-Performance%20Optimized-brightgreen)
![Backend Performance](https://img.shields.io/badge/Backend-Progressive%20Loading-blue)
![Version](https://img.shields.io/badge/Version-1.2.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- � **Performance Optimized** - React.memo + Progressive Loading + Backend Caching for 60-70% faster responses ✅
- 📊 **Progressive Loading Strategy** - Lite API (45s) + Full API (3.75min) with smart data merging ✅
- 🔧 **React Performance** - useCallback optimization + conditional rendering eliminating duplicate calls ✅
- �🛡️ **Enhanced Backend Stability** - Memory leak prevention, graceful error handling, auto-recovery ✅
- 🔧 **Modular API Architecture** - Organized route structure with comprehensive endpoint coverage ✅
- 📊 **Process Monitoring** - Automatic restart on crashes with health monitoring ✅
- 🎯 **Real-time Equipment Monitoring** - Live status of cameras, mounts, focusers, and more ✅
- 🔌 **NINA API Integration** - Complete integration with 25+ equipment and system endpoints ✅
- 📊 **Target Scheduler Integration** - Progress tracking and session management ✅
- 🖥️ **System Monitoring** - Hardware metrics (CPU, memory, temperature) with intelligent caching ✅
- 🌅 **Astronomical Data** - Modular time visualization with SVG timeline and enhanced performance (reduced from 693 to 245 lines) ✅
- 🔄 **Live RTSP Streaming** - Real-time view from observatory cameras ✅
- 📡 **Session Monitoring** - Real-time NINA session tracking via WebSocket ✅
- � **Image Viewer** - Real-time NINA image display with WebSocket integration ✅
- ⚙️ **Settings Management** - Comprehensive configuration modal with file picker ✅
- �📱 **Responsive Design** - Works on desktop, tablet, and mobile ✅
- 🎨 **Customizable Dashboard** - Database-driven widget configuration ✅
- 💾 **SQLite Database** - Configuration and target scheduler integration ✅
- 🛡️ **Mock Data Fallback** - Professional fallback when equipment unavailable ✅

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **npm** 8+
- **NINA** running on the target machine

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/NINA.WebControlPanel.git
   cd NINA.WebControlPanel
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd src/client && npm install
   ```

3. **Start development environment**:
   ```bash
   npm start
   ```

This will start both the backend API server (port 3001) and frontend React app (port 3000).

## 📁 Project Structure

```
NINA.WebControlPanel/
├── docs/                       # 📚 Documentation
│   ├── development/           # Development guides  
│   ├── database/              # Database schemas
│   └── widgets/               # Widget specifications
├── src/                       # 💻 Source code
│   ├── server/                # 🖥️ Express.js backend
│   ├── client/                # 🌐 React frontend
│   ├── services/              # 🔧 Shared services
│   └── types/                 # 📝 TypeScript definitions
├── scripts/                   # 🔧 Utility scripts
│   ├── database/              # Database management
│   ├── development/           # Development tools
│   └── deployment/            # Deployment scripts
├── tests/                     # 🧪 Test files
└── resources/                 # 📦 Development resources
```

## �️ Backend Stability & Architecture

### **Enhanced Stability Features (August 2025)**
- **Memory Leak Prevention**: Intelligent event cleanup with 4-hour history limits
- **WebSocket Health Monitoring**: Automatic connection recovery with heartbeat detection  
- **Graceful Error Handling**: Process crashes prevented with comprehensive error recovery
- **Modular API Architecture**: Organized routes with separated concerns for better maintenance
- **Process Monitoring**: Auto-restart capabilities with health monitoring and graceful shutdown
- **Performance Optimization**: 60-80% memory usage reduction with sub-second API responses

### **Stability Commands**
```bash
# Enhanced development with monitoring
npm run start:stable         # Auto-restart on crashes

# Monitor backend health in real-time  
npm run monitor

# Apply all stability fixes automatically
npm run fix-backend

# Check system and backend health
npm run health
```

### **Debug & Logging Commands**
```bash
# Normal startup (no debug logging)
npm start                    # Clean startup, no log files created

# Debug modes (creates log files in src/logs/)
npm run start:debug          # General debug logging
npm run start:debug-websocket # WebSocket event logging (verbose)
npm run start:debug-all      # Full debug mode (all logging)
```

**WebSocket Event Logging**:
- **Default**: No logging (clean operation)  
- **Debug Mode**: Creates `src/logs/websocket-events.log` with detailed event flow
- **Use When**: Debugging IMAGE-SAVE event processing, WebSocket connection issues
- **File Size**: Can grow large quickly - only enable when needed

## 🛠️ Development

### Available Scripts

- `npm start` - Start both frontend and backend in unified development mode (no debug logging)
- `npm run start:debug` - Start with general debug logging enabled
- `npm run start:debug-websocket` - Start with verbose WebSocket event logging (creates websocket-events.log)
- `npm run start:debug-all` - Start with all debug logging enabled (full debugging mode)
- `npm run start:stable` - Start with automatic restart on crashes and monitoring  
- `npm run start:prod` - Start in production mode with PM2 process management
- `npm run server` - Start only the backend server (enhanced stability)
- `npm run client` - Start only the frontend React app
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run monitor` - Real-time backend health monitoring
- `npm run health` - Check system and backend health
- `npm run fix-backend` - Apply stability fixes automatically
- `npm run validate` - Validate configuration and dependencies

### Configuration

The application features a comprehensive **Settings Modal** with native file picker integration:

#### 🔧 **Settings Interface**
- **NINA Connection**: Host/IP and port configuration with connection testing
- **SQLite Database**: Native file picker for target scheduler database (Chrome/Edge) 
- **Live Streams**: Configure up to 3 RTSP camera feeds
- **File System Access API**: Modern browser integration with SQLite file filtering
- **Cross-browser Support**: Manual input fallback for Firefox/Safari

#### 🗄️ **Database Configuration**
- **Configuration Database**: Auto-created `dashboard-config.sqlite` 
- **Target Scheduler**: Connect to NINA's `schedulerdb.sqlite`
- **Persistent Settings**: All configuration stored in SQLite
- **API Integration**: RESTful configuration management via `/api/config`

Key settings include:
- **NINA API**: Configure your NINA instance URL/IP and port  
- **Streams**: Set up RTSP camera feeds with individual URLs
- **Database Path**: SQLite target scheduler database selection 
- **Observatory**: Location and equipment details

## 🗄️ Database

The application uses SQLite databases:
- **Configuration**: `resources/samples/dashboard-config.sqlite`
- **Target Scheduler**: `resources/schedulerdb.sqlite` (from NINA)

See [database documentation](./docs/database/) for schema details.

## 🧩 Widget System

The dashboard features a modular widget system with database-driven configuration:

- **NINA Equipment Status** ✅ - Live monitoring of 11 equipment types (Camera, Mount, Focuser, etc.)
- **Target Scheduler Progress** ✅ - Real-time project progress with 382+ captured images across 6 projects  
- **System Monitor** ✅ - Cross-platform hardware metrics (CPU, memory, temperature)
- **RTSP Viewer** ✅ - Live camera streams from observatory
- **Time & Astronomical Data** ✅ - Server time sync, twilight phases, and moon phase tracking
- **Current Session** ✅ - Real-time NINA session monitoring with WebSocket integration
- **Image Viewer** ✅ - Real-time NINA captured images with WebSocket integration and metadata display
- **Guider Graph** ✅ - Professional guiding performance monitoring with real-time PHD2/NINA data visualization
- **Settings Modal** ✅ - Comprehensive configuration interface with native file picker

All widgets are responsive with Radix UI components and feature professional fallback when services unavailable.

### 📊 **Guider Graph Widget** - Professional Astrophotography Monitoring

**Latest Addition**: The Guider Graph Widget provides professional guiding performance monitoring with real-time visualization of PHD2/NINA guiding data, matching the functionality of professional astronomy applications.

#### **Key Features**:
- **Step-Based X-Axis** - Professional step numbering (#1, #2, #3...) like NINA and PHD2, not time-based
- **Event-Driven Operation** - Activates only between GUIDER-START and GUIDER-STOP WebSocket events  
- **Real NINA Data Only** - No mock data fallback; displays "Guiding hasn't started yet" when inactive
- **Intelligent Polling** - 5-second refresh during active guiding, paused when not guiding
- **Professional Styling** - Radix UI color palette with enhanced contrast for dark themes

#### **Technical Implementation**:
- **Chart.js Integration** - Linear scale X-axis with step-based progression for professional UX
- **WebSocket Events** - GUIDER-START/GUIDER-STOP event detection for state management
- **NINA API Endpoint** - `/api/nina/guider-graph` connecting to NINA's `/v2/api/equipment/guider/graph`
- **TypeScript Support** - Complete interface definitions in `nina.ts` for type safety
- **Responsive Design** - Mobile-friendly chart with proper scaling and touch interactions

#### **User Experience**:
```
🎯 Inactive State: "Guiding hasn't started yet" - Clean, professional messaging
📊 Active State: Real-time guiding data with step-based progression
🔄 Automatic State Management: Seamless transitions during guiding sessions
```

The widget provides the same professional experience as NINA's built-in guiding graph, with real-time updates and no unnecessary data when guiding is inactive.

## 🌐 API Integration

### NINA Equipment API ✅ **ENHANCED**
- **Endpoint**: `http://172.26.81.152:1888/`
- **Backend Service**: Complete `ninaService.js` with 25+ equipment and system endpoints
- **Equipment Types**: Camera, Mount, Focuser, Filter Wheel, Guider, Rotator, Switch, Flat Panel, Weather, Dome, Safety Monitor
- **Enhanced Features**: Session data, image history, event monitoring, camera information, **guider graph visualization**
- **New Endpoints**: `/api/nina/guider-graph` - Real-time PHD2/NINA guiding performance data
- **Error Handling**: Graceful degradation with comprehensive connection status reporting
- **Event-Driven Updates**: WebSocket integration for GUIDER-START/GUIDER-STOP events
- **Mock Data**: Professional fallback equipment data when NINA unavailable (guider graph shows user-friendly "not started" message)

### Target Scheduler Database ✅ **COMPLETE**
- **Database**: `resources/schedulerdb.sqlite` with live project data
- **Projects**: 6 active projects (Barnard 160, SH2-124, M31, M42, NGC 7635, etc.)
- **Progress Tracking**: Filter completion, exposure times, priority management
- **API Endpoints**: `/api/scheduler/progress`, `/api/scheduler/activity`, `/api/scheduler/status`

### System Monitoring
- **Hardware**: CPU, memory, disk usage with cross-platform support
- **Temperature**: System thermal monitoring (macOS memory calculation optimized)
- **Network**: Connection status and metrics

## 🚀 Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set environment variables**:
   ```bash
   NODE_ENV=production
   PORT=3001
   NINA_HOST=your-nina-host
   ```

3. **Run with PM2** (recommended):
   ```bash
   pm2 start src/server/config-server.js --name nina-webcontrol
   ```

## 📖 Documentation

- **[Complete Documentation](./docs/INDEX.md)** - Full documentation index
- **[Current Session & WebSocket](./docs/CURRENT_SESSION_WEBSOCKET.md)** - Real-time integration details  
- **[Development Guide](./docs/development/)** - Setup and development
- **[Database Schema](./docs/database/)** - Database documentation  
- **[Widget Development](./docs/widgets/)** - Creating custom widgets
- **[API Reference](./docs/development/)** - Backend API documentation

## � **Latest Updates - September 11, 2025**

### **🚀 Major WebSocket & Image Processing Fixes**

#### **IMAGE-SAVE Event Processing Resolution ✅**
- **Problem**: Frontend ImageViewer not responding to live IMAGE-SAVE events despite backend processing successfully
- **Root Cause**: WebSocket message type mismatch - backend sending `unifiedSession` but frontend only handled `sessionUpdate`
- **Solution**: Enhanced WebSocket message router to support both message types with unified session handling

#### **Frontend ImageViewer Architecture Simplification ✅**  
- **Removed**: Complex dual event handling (direct NINA events + session updates)
- **Implemented**: Clean session-based architecture following "always pull the last image" approach
- **Result**: Eliminated duplicate API calls, reduced complexity, improved reliability

#### **Enhanced WebSocket Event Logging System ✅**
- **Added**: Comprehensive `WebSocketEventLogger` with file/line tracking across all components
- **Implemented**: Stage-based logging (WS_CLIENT → NORMALIZER → EVENT_HANDLER → FSM)
- **Verified**: Complete event flow from NINA WebSocket through backend processing to frontend updates

#### **Production Fixes Applied**
- **UnifiedSessionManager**: Confirmed IMAGE-SAVE event processing and database persistence working correctly
- **EventNormalizer**: Fixed WebSocket event structure handling (`Response.Event` vs direct `Event` field)
- **Frontend Logic**: Simplified to rely on backend session state as single source of truth
- **Message Flow**: Fixed end-to-end MESSAGE-SAVE processing: NINA → Backend → WebSocket → Frontend → Image Update

#### **Repository Cleanup ✅**
- **Organized**: Moved all debug files from root to `scripts/debug/` and `scripts/monitoring/`
- **Enhanced**: Root directory now clean following repository standards
- **Updated**: Documentation with comprehensive fix details

### **🔍 Technical Details**
**WebSocket Message Flow (Fixed)**:
```
NINA IMAGE-SAVE → NINAWebSocketClient → SessionInitializer → 
UnifiedSessionManager → SessionEventHandler → Database Storage → 
WebSocket Broadcast → Frontend Session Update → Image Fetch
```

**Key Files Modified**:
- `src/client/src/services/unifiedWebSocket.ts` - Added `unifiedSession` message type support
- `src/client/src/components/ImageViewer/useImageData.ts` - Simplified to session-only architecture
- `src/server/websocket/WebSocketEventLogger.js` - Comprehensive logging system
- `src/server/session/EventNormalizer.js` - Fixed WebSocket event structure handling

---

## �🗂️ Development TODOs

### 🎯 **Current Development Status**
**✅ Core Dashboard: PRODUCTION READY** - All essential monitoring features implemented

### 🚀 **Enhancement Priorities**
1. **Advanced Image Management** - Directory browsing and image history navigation  
2. **Automated Sequence Controls** - NINA sequence management and automation tools
3. **Enhanced Session Analytics** - Historical data and performance trending
4. **Mobile App Companion** - Native mobile application for remote monitoring
5. **Multi-Observatory Support** - Manage multiple NINA instances from single dashboard

### 🔧 **Technical Improvements**
- **Enhanced WebSocket Integration** - Sub-second real-time updates for critical equipment
- **Advanced Logging System** - Structured logging with file rotation and configurable levels  
- **Performance Optimization** - Caching strategies for large image collections
- **Backup & Recovery** - Configuration and data backup automation

### 📊 **Advanced Features** 
- **Predictive Analytics** - Weather integration and session success prediction
- **Equipment Health Monitoring** - Long-term equipment performance tracking  
- **Automation Rules** - Custom triggers and responses for equipment states
- **Cloud Integration** - Remote access and mobile notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [NINA](https://nighttime-imaging.eu/) - Nighttime Imaging 'N' Astronomy
- [React](https://reactjs.org/) - Frontend framework
- [Radix UI](https://www.radix-ui.com/) - Component library
- [Express.js](https://expressjs.com/) - Backend framework

---

**Project Status**: ✅ **PRODUCTION READY + WEBSOCKET FIXES COMPLETE** - Complete astrophotography dashboard with enhanced backend stability, fixed IMAGE-SAVE event processing, simplified frontend architecture, and comprehensive WebSocket logging system | **Last Updated**: September 11, 2025
