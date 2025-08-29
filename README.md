# 🔭 NINA WebControlPanel

A modern, full-stack web dashboard for monitoring and controlling remote astrophotography equipment running [NINA (Nighttime Imaging 'N' Astronomy)](https://nighttime-imaging.eu/).

![Project Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- 🎯 **Real-time Equipment Monitoring** - Live status of cameras, mounts, focusers, and more
- � **Live NINA WebSocket Integration** - Real-time equipment events and session updates
- �📊 **Target Scheduler Integration** - Progress tracking and session management
- 🖥️ **System Monitoring** - Hardware metrics (CPU, memory, temperature)
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Drag & Drop Dashboard** - Customizable widget layout
- 🔄 **Live RTSP Streaming** - Real-time view from observatory cameras
- ⚡ **Current Session Monitoring** - Live imaging session details and progress
- 🔌 **WebSocket Architecture** - Sub-second real-time updates without polling

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

The dashboard features a modular widget system:

- **Current Session Widget** 🔴 - **NEW!** Real-time imaging session monitoring with live equipment updates
- **NINA Status** - Equipment connection and status monitoring
- **Target Scheduler** - Current session progress and project tracking
- **System Monitor** - Hardware performance metrics (CPU, memory, temperature)
- **RTSP Viewer** - Live camera streams from observatory
- **Image Viewer** - Latest captured images and thumbnails

Widgets are drag-and-drop with persistent layout saving. The **Current Session Widget** provides real-time updates via WebSocket connection to NINA's event system.

See [Current Session & WebSocket Documentation](./docs/CURRENT_SESSION_WEBSOCKET.md) for technical details.

## 🌐 API Integration

### NINA Advanced API
- **Port**: 1888 (default)
- **REST Endpoints**: Camera, mount, focuser, rotator, weather station status
- **Real-time WebSocket**: `ws://nina-host:1888/v2/socket` for live equipment events
- **Session State**: Live tracking of imaging sessions, targets, and equipment changes
- **Event History**: Complete event timeline for session analysis

### WebSocket Architecture
- **Backend Processing**: Centralized NINA event processing and session state management
- **Frontend Updates**: Real-time WebSocket broadcasting to connected clients
- **Event Types**: Equipment connections, target changes, safety alerts, imaging progress
- **Sub-second Latency**: Immediate updates when equipment status changes

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
