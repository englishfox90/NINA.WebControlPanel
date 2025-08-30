# 🔭 NINA WebControlPanel

A modern, full-stack web dashboard for monitoring and controlling remote astrophotography equipment running [NINA (Nighttime Imaging 'N' Astronomy)](https://nighttime-imaging.eu/).

![Project Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- 🎯 **Real-time Equipment Monitoring** - Live status of cameras, mounts, focusers, and more ✅
- 🔌 **NINA API Integration** - Complete integration with 11 equipment endpoints ✅
- 📊 **Target Scheduler Integration** - Progress tracking and session management ✅
- 🖥️ **System Monitoring** - Hardware metrics (CPU, memory, temperature) ✅
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile ✅
- 🎨 **Customizable Dashboard** - Database-driven widget configuration ✅
- 🔄 **Live RTSP Streaming** - Real-time view from observatory cameras ✅
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

## 🛠️ Development

### Available Scripts

- `npm start` - Start both frontend and backend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend React app
- `npm run build` - Build for production
- `npm test` - Run tests

### Configuration

The application will automatically create a configuration database on first run. Key settings:

- **NINA API**: Configure your NINA instance URL/IP and port
- **Streams**: Set up RTSP camera feeds
- **Database**: Target scheduler database path
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
- **Image Viewer** 🚧 - Latest captured images (mock data, ready for file system integration)

All widgets are responsive with Radix UI components and feature professional fallback when services unavailable.

## 🌐 API Integration

### NINA Equipment API ✅ **COMPLETE**
- **Endpoint**: `http://172.26.81.152:1888/`
- **Backend Service**: Complete `ninaService.js` with 11 equipment endpoints
- **Equipment Types**: Camera, Mount, Focuser, Filter Wheel, Guider, Rotator, Switch, Flat Panel, Weather, Dome, Safety Monitor
- **Error Handling**: Graceful degradation with connection status reporting
- **Mock Data**: Professional fallback equipment data when NINA unavailable

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

## 🗂️ Development TODOs

### 🎯 **Immediate Priorities** 
1. **Current Session Widget Refinement** - Enhanced UI/UX and logic improvements
2. **Twilight Clock Widget** - Astronomical twilight tracking and countdown timers
3. **Guiding Widget** - Real-time guiding performance monitoring and charts
4. **Weather Widget** - Environmental conditions and safety monitoring dashboard
5. **Portal Banner System** - Safety alerts and flat panel light notifications

### 🔧 **Technical Improvements**
6. **Responsive Layout System** - Fix browser resize not triggering layout saves
7. **Logging System Overhaul** - Structured logging with file rotation and log levels

### 📅 **Future Enhancements**
- Advanced session analytics and reporting
- Mobile app companion
- Multi-observatory support
- Automated imaging sequence designer

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

**Project Status**: ✅ Production Ready with Real-time WebSocket Integration | **Last Updated**: August 29, 2025
