# NINA WebControlPanel - React Frontend

This is the React frontend application for the NINA WebControlPanel, a production-ready astrophotography dashboard built with React 18 + TypeScript + Radix UI.

## 🚀 Features

- **Real-time Equipment Monitoring** - Live NINA equipment status via WebSocket
- **Target Scheduler Integration** - Live project progress from SQLite database  
- **Image Viewer** - Real-time captured image display with WebSocket integration
- **Settings Management** - Comprehensive configuration modal with native file picker
- **System Monitoring** - Cross-platform hardware metrics display
- **RTSP Streaming** - Live observatory camera feeds
- **Responsive Design** - Mobile-optimized with Radix UI components

## 🛠️ Built With

- **React 18** - Modern React with concurrent features
- **TypeScript** - Full type safety and IntelliSense
- **Radix UI Themes** - Professional component library  
- **WebSocket Integration** - Real-time updates from NINA
- **File System Access API** - Native browser file picker integration

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

**API Proxy Configuration**: API requests to `/api/*` are automatically proxied to the backend server at `http://localhost:3001` via `src/setupProxy.js`. This configuration avoids dev server errors and is automatically picked up by Create React App.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## 🧩 Component Architecture

### Core Components
- **Dashboard.tsx** - Main application layout with widget integration
- **SettingsModal.tsx** - Comprehensive configuration interface with file picker
- **ImageViewer.tsx** - Real-time NINA image display with WebSocket integration
- **NINAStatus.tsx** - Live equipment monitoring with 11 device types
- **SystemStatusWidget.tsx** - Cross-platform hardware metrics
- **RTSPViewer.tsx** - Live camera stream viewer
- **SessionWidget.tsx** - Current NINA session monitoring
- **TimeAstronomicalWidget.tsx** - Server time and astronomical data

### Technical Details
- **TypeScript**: Full type safety with strict mode enabled
- **WebSocket Integration**: Real-time updates from backend server
- **File System Access API**: Modern browser file picker (Chrome/Edge)
- **Radix UI**: Professional component library with responsive design
- **Error Handling**: Graceful degradation with loading states

## 🔧 Configuration

The frontend connects to the Express.js backend on port 3001 for:
- **API Integration**: RESTful endpoints for configuration and data (proxied via `/api/*` in development)
- **WebSocket Events**: Real-time NINA session and image updates
- **Database Operations**: SQLite configuration persistence

**Development Proxy**: The `src/setupProxy.js` file handles API request proxying during development, forwarding all `/api/*` requests from the webpack dev server (port 3000) to the backend (port 3001). This avoids CORS issues and dev server configuration errors.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
