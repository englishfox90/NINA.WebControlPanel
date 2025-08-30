# 📚 NINA WebControlPanel - Documentation Index

Welcome to the NINA WebControlPanel documentation. This project provides a full-stack web dashboard for monitoring remote astrophotography equipment running NINA (Nighttime Imaging 'N' Astronomy).

## 🗂️ Documentation Structure

### 📖 Core Documentation
- **[README.md](./README.md)** - Main project documentation and setup guide
- **[AGENTS.md](./AGENTS.md)** - AI Agent instructions and project status  
- **[CURRENT_SESSION_WEBSOCKET.md](./CURRENT_SESSION_WEBSOCKET.md)** - Real-time WebSocket integration and Current Session Widget 🔴 **NEW!**

### 🛠️ Development Guides
- **[development/PROJECT_STATUS.md](./development/PROJECT_STATUS.md)** - Current project status and roadmap
- **[development/CROSS_PLATFORM_DEV_GUIDE.md](./development/CROSS_PLATFORM_DEV_GUIDE.md)** - Cross-platform development setup
- **[development/WINDOWS_STARTUP.md](./development/WINDOWS_STARTUP.md)** - Windows-specific startup instructions

### 🗄️ Database Documentation
- **[database/TARGET_SCHEDULER_DATABASE.md](./database/TARGET_SCHEDULER_DATABASE.md)** - Target Scheduler database schema and API

### 🧩 Widget Documentation
- **[widgets/WIDGET_FORMAT_STANDARD.md](./widgets/WIDGET_FORMAT_STANDARD.md)** - Widget development standards and format specifications

## 🏗️ Project Architecture

```
NINA.WebControlPanel/
├── docs/                       # 📚 All documentation (YOU ARE HERE)
├── src/                        # 💻 Source code
│   ├── server/                 # 🖥️ Backend Express.js server
│   ├── client/                 # 🌐 Frontend React application
│   ├── services/               # 🔧 Shared services (NINA, monitoring)
│   └── types/                  # 📝 TypeScript definitions
├── scripts/                    # 🔧 Utility scripts
│   ├── database/               # 🗄️ Database management scripts
│   ├── development/            # 🛠️ Development utilities
│   └── deployment/             # 🚀 Deployment scripts
├── tests/                      # 🧪 Test files
├── resources/                  # 📦 Development resources (gitignored)
└── .github/                    # 🤖 GitHub workflows
```

## 🚀 Quick Start

1. **Install Dependencies**: `npm install`
2. **Start Development Server**: `npm run start:dev`
3. **Build for Production**: `npm run build`

## 📋 Current Status - August 29, 2025

### ✅ **PRODUCTION READY** - Core Dashboard Complete
- **NINA API Integration**: ✅ Complete - 11 equipment endpoints with mock fallback
- **Target Scheduler**: ✅ Complete - Real-time progress from SQLite database (382+ images)
- **System Monitoring**: ✅ Complete - Cross-platform with macOS memory fix
- **RTSP Video Streaming**: ✅ Complete - Live camera feeds with enhanced UX
- **Database Architecture**: ✅ Complete - SQLite configuration and data management
- **Responsive Design**: ✅ Complete - Radix UI components, mobile-optimized
- **Error Handling**: ✅ Complete - Graceful degradation throughout application

### 🚧 **Remaining Tasks**
- **Image Viewer**: 🟡 Mock data complete, file system integration pending
- **Advanced NINA Controls**: 🟢 Equipment control interfaces (future enhancement)

### 📊 **Project Metrics**
- **Core Features**: 5/5 Complete (100%)
- **Production Readiness**: 95%  
- **API Endpoints**: 12+ implemented and tested
- **Widget Components**: 6/6 complete and functional
- ✅ **Target Scheduler**: Real-time monitoring and progress tracking
- ✅ **NINA Integration**: Live WebSocket connection with real-time equipment monitoring 🔴 **COMPLETE!**
- ✅ **Current Session Widget**: Real-time session monitoring with sub-second updates
- ✅ **System Monitoring**: Cross-platform hardware monitoring (macOS memory optimized)

## 🗂️ Development TODOs

### 🎯 **Immediate Priorities** 
1. **Current Session Widget Refinement** - Enhanced UI/UX and logic improvements
2. **Twilight Clock Widget** - Astronomical twilight tracking and countdown timers
3. **Guiding Widget** - Real-time guiding performance monitoring and charts
4. **Weather Widget** - Environmental conditions and safety monitoring dashboard
5. **Portal Banner System** - Safety alerts and flat panel light notifications

### � **Technical Improvements**
6. **Responsive Layout System** - Fix browser resize not triggering layout saves
7. **Logging System Overhaul** - Structured logging with file rotation and log levels

### 📅 **Future Enhancements**
- Advanced session analytics and reporting
- Mobile app companion  
- Multi-observatory support
- Automated imaging sequence designer

## 🤖 For AI Agents

**CRITICAL**: Always read `AGENTS.md` completely before making changes. It contains detailed project status, architecture decisions, and coding standards.

## 📞 Support

- **Issues**: Check existing documentation first
- **Development**: Follow the cross-platform development guide
- **Database**: Refer to database documentation for schema details
- **Widgets**: Follow widget format standards for consistency

---

*Last Updated: August 29, 2025*  
*Project Status: Production Ready with Real-time WebSocket Integration*
