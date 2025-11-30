# NINA WebControlPan **Session Monitoring**
A modern, full-stack web dashboard for monitoring remote astrophotography equipment running [NINA (Nighttime Imaging 'N' Astronomy)](https://nighttime-imaging.eu/).

![Project Status](https://img.shields.io/badge/Status-Performance%20Optimized-brightgreen)
![Backend Performance](https://img.shields.io/badge/Backend-Progressive%20Loading-blue)
![Version](https://img.shields.io/badge/Version-1.2.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

Quick Install: https://github.com/englishfox90/NINA.WebControlPanel/wiki/Quick-Start

## Features

-  **Performance Optimized** - React.memo + Progressive Loading + Backend Caching for 60-70% faster responses
-  **Progressive Loading Strategy** - Lite API (45s) + Full API (3.75min) with smart data merging
-  **React Performance** - useCallback optimization + conditional rendering eliminating duplicate calls
-  **Enhanced Backend Stability** - Memory leak prevention, graceful error handling, auto-recovery
-  **Modular API Architecture** - Organized route structure with comprehensive endpoint coverage
-  **Process Monitoring** - Automatic restart on crashes with health monitoring
-  **Real-time Equipment Monitoring** - Live status of cameras, mounts, focusers, and more
-  **NINA API Integration** - Complete integration with 25+ equipment and system endpoints
-  **Target Scheduler Integration** - Progress tracking and session management 
-  **System Monitoring** - Hardware metrics (CPU, memory, temperature) with intelligent caching 
-  **Astronomical Data** - Modular time visualization with SVG timeline and enhanced performance (reduced from 693 to 245 lines) 
-  **Live RTSP Streaming** - Real-time view from observatory cameras 
-  **Session Monitoring** - Real-time NINA session tracking via WebSocket 
-  **Image Viewer** - Real-time NINA image display with WebSocket integration 
-  **Settings Management** - Comprehensive configuration modal with file picker 
-  **Responsive Design** - Works on desktop, tablet, and mobile 
-  **Customizable Dashboard** - Database-driven widget configuration 
-  **SQLite Database** - Configuration and target scheduler integration 
-  **Mock Data Fallback** - Professional fallback when equipment unavailable 

## Widget System

The dashboard features a modular widget system with database-driven configuration:

- **NINA Equipment Status** - Live monitoring of 11 equipment types (Camera, Mount, Focuser, etc.)
- **Target Scheduler Progress** - Real-time project progress with 382+ captured images across 6 projects  
- **System Monitor** - Cross-platform hardware metrics (CPU, memory, temperature)
- **RTSP Viewer** - Live camera streams from observatory
- **Time & Astronomical Data** - Server time sync, twilight phases, and moon phase tracking
- **Current Session** - Real-time NINA session monitoring with WebSocket integration
- **Image Viewer** - Real-time NINA captured images with WebSocket integration and metadata display
- **Guider Graph** - Professional guiding performance monitoring with real-time PHD2/NINA data visualization
- **Settings Modal** - Comprehensive configuration interface with native file picker

All widgets are responsive with Radix UI components and feature professional fallback when services unavailable.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## cknowledgments

- [NINA](https://nighttime-imaging.eu/) - Nighttime Imaging 'N' Astronomy
- [React](https://reactjs.org/) - Frontend framework
- [Radix UI](https://www.radix-ui.com/) - Component library
- [Express.js](https://expressjs.com/) - Backend framework
