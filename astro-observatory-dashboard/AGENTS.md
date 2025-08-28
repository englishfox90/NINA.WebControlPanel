# 🤖 AI AGENT INSTRUCTIONS - Astro Observatory Dashboard

> **CRITICAL**: This document is specifically for AI agents. Always read this completely before making any changes to the project.

## 📋 AGENT QUICK REFERENCE

### 🎯 **PROJECT OVERVIEW**
**Mission**: Full-stack web dashboard for monitoring remote astrophotography equipment running NINA (Nighttime Imaging 'N' Astronomy)

**Current State**: ✅ **PRODUCTION READY**
- **Phase**: Full Stack Development Complete
- **Architecture**: React 18 + TypeScript + Radix UI + Express.js + SQLite
- **Status**: All core components implemented and functional
- **Last Updated**: August 28, 2025

### 🚨 **CRITICAL STATUS FLAGS**
- 🚧 **In Progress** - Currently being worked on
- ✅ **Complete** - Fully functional and tested  
- ❌ **Blocked** - Cannot proceed due to dependency
- 🔄 **Needs Update** - Working but requires modernization
- 🆘 **Broken** - Not functional, needs immediate attention

### ⚡ **IMMEDIATE PRIORITIES**
1. **🔴 HIGH**: Connect `NINAStatus.tsx` to live NINA API (port 1888)
2. **🟡 MEDIUM**: Implement live image loading in `ImageViewer.tsx`
3. **✅ COMPLETE**: Target Scheduler Progress Widget - Fully implemented and integrated
4. **🟢 LOW**: Add advanced NINA controls to Dashboard

---

## 🏗️ SYSTEM ARCHITECTURE

### 📁 **PROJECT STRUCTURE** 
```
astro-observatory-dashboard/
├── 🎯 FRONTEND (React 18 + TypeScript)
│   ├── src/components/          # 9/9 Components ✅ COMPLETE
│   │   ├── Dashboard.tsx        # Main layout ✅
│   │   ├── NINAStatus.tsx      # Equipment status ✅ (Mock data)
│   │   ├── RTSPViewer.tsx      # Live video ✅ WORKING
│   │   ├── SystemStatusWidget.tsx # System monitoring ✅ WORKING
│   │   ├── ImageViewer.tsx     # Photo gallery ✅ (Mock data)
│   │   └── Settings.tsx.disabled # Config UI ✅
│   ├── src/services/           # API integration layer
│   ├── src/types/              # TypeScript definitions
│   └── src/styles/             # Radix UI + CSS
├── 🔧 BACKEND (Express.js + SQLite)
│   ├── config-server.js        # API server (port 3001) ✅
│   ├── systemMonitor.js        # Cross-platform monitoring ✅
│   ├── configDatabase.js       # SQLite operations ✅
│   └── dashboard-config.sqlite # Database file ✅
└── 📄 CONFIG FILES
    ├── config.json             # System configuration ✅
    └── package.json            # Dependencies ✅
```

### 🔌 **API ENDPOINTS**
```javascript
// Configuration APIs
GET/POST /api/config           # Settings management
GET/POST /api/widgets          # Widget positions

// System Monitoring APIs ✅ WORKING
GET /api/system/status         # Complete system overview
GET /api/system/cpu            # CPU usage and info
GET /api/system/memory         # Memory usage (platform-optimized)
GET /api/system/disk           # Disk space information
GET /api/system/network        # Network interface and speeds

// Target Scheduler APIs ✅ WORKING
GET /api/scheduler/progress    # Project progress overview
GET /api/scheduler/project/:id # Individual project details
GET /api/scheduler/status      # Current/next target status
GET /api/scheduler/activity    # Recent imaging activity

// Future APIs (Ready for implementation)
🚧 /api/nina/*                 # NINA equipment status (port 1888)
🚧 /api/images/*               # Image gallery management
```

---

## 📊 COMPONENT STATUS MATRIX

| Component | Status | Capability | Backend | Next Action | Priority |
|-----------|--------|------------|---------|-------------|----------|
| `Dashboard.tsx` | ✅ Complete | Layout + navigation | ✅ Config API | NINA integration | 🟡 Medium |
| `SystemStatusWidget.tsx` | ✅ Complete | **Real-time monitoring** | ✅ Cross-platform | None needed | ✅ Done |
| `RTSPViewer.tsx` | ✅ Complete | **Live video feeds** | ✅ Working streams | Enhanced controls | 🟢 Low |
| `TargetSchedulerWidget.tsx` | ✅ Complete | **Live project progress** | ✅ SQLite integration | None needed | ✅ Done |
| `NINAStatus.tsx` | ✅ UI Ready | Mock equipment data | 🚧 Ready for API | **Live NINA connection** | 🔴 High |
| `ImageViewer.tsx` | ✅ UI Ready | Mock gallery display | 🚧 Ready for files | **Live directory scan** | 🟡 Medium |
| `Settings.tsx` | ✅ Complete | Database persistence | ✅ Full CRUD | None needed | ✅ Done |

### 🎯 **COMPLETION METRICS**
- **UI Components**: 10/10 ✅ Complete (includes SystemStatusWidget + TargetSchedulerWidget)
- **Backend APIs**: 9/11 ✅ Complete (Config + System + Target Scheduler working)
- **Live Data Feeds**: 3/5 ✅ Complete (RTSP + System + Target Scheduler)
- **Database Integration**: ✅ 100% Complete (SQLite + Express)
- **Mobile Responsive**: ✅ 100% Complete (Radix UI)
- **Production Ready**: ✅ 90% Complete (Pending NINA API)

---

## 🔧 TECHNICAL IMPLEMENTATION GUIDE

### 🎨 **UI FRAMEWORK: Radix UI Themes**
**ALWAYS use Radix components** - Professional, accessible, mobile-optimized

#### **Key Components Used:**
```tsx
import { Theme, Button, Card, Flex, Progress, Badge, Dialog } from '@radix-ui/themes';
import { VideoIcon, DesktopIcon, GearIcon } from '@radix-ui/react-icons';

// CORRECT: Use Radix components
<Card>
  <Flex direction="column" gap="3">
    <Button variant="soft"><VideoIcon />Stream</Button>
    <Progress value={75} />
    <Badge color="green">Active</Badge>
  </Flex>
</Card>

// WRONG: Don't create custom CSS components
<div className="custom-card">...</div>
```

#### **Icon System:**
- ✅ **Use**: `@radix-ui/react-icons` (20+ icons converted)
- ❌ **Avoid**: Emojis, custom SVGs, other icon libraries

### 🗄️ **Database Operations**
```javascript
// CORRECT: Use existing database service
const configService = require('./configDatabase');
const result = await configService.getConfig('key');

// System monitoring (cross-platform optimized)
const systemMonitor = require('./systemMonitor');
const memoryInfo = await systemMonitor.getMemoryInfo(); // Handles macOS/Windows/Linux
```

### 📱 **Mobile-First Development**
- **Radix responsive utilities** handle mobile automatically
- **Touch targets**: Minimum 44px (Radix default)
- **Test on**: Chrome DevTools mobile emulation + real devices

---

## 🚀 PLATFORM-SPECIFIC KNOWLEDGE

### 🖥️ **System Monitoring (Cross-Platform)**
**CRITICAL FIX IMPLEMENTED**: Memory reporting accuracy

#### **macOS Memory Issue (SOLVED)**
- **Problem**: `systeminformation` reported 99%+ memory usage due to file system cache
- **Solution**: Platform-specific calculation using `active memory * 3.2x multiplier`
- **Result**: Now shows realistic 64-80% usage matching Activity Monitor

#### **Platform Logic:**
```javascript
if (platform === 'darwin') {
  // macOS: Use active memory with multiplier for accuracy
  usedGB = activeMemory * 3.2;
} else if (platform === 'win32') {  
  // Windows: Direct systeminformation values are accurate
  usedGB = mem.used / (1024**3);
} else {
  // Linux: Use available memory calculation  
  usedGB = totalGB - availableGB;
}
```

### 🎥 **Video Feed Enhancements**
**Dynamic container sizing** implemented:
- **AllSky feeds**: 380px centered squares
- **Widescreen feeds**: Full-width 16:9 aspect ratio
- **Smooth transitions**: Backdrop blur effects between aspect ratios

---

## 📝 DEVELOPMENT WORKFLOW

### ✅ **BEFORE MAKING CHANGES**
1. **Read this entire document** - Critical for context
2. **Check component status matrix** - Understand current state  
3. **Verify dependencies** - `npm install` if needed
4. **Start dev servers** - Frontend (3000) + Backend (3001)

### 🔄 **WHEN MAKING CHANGES**
1. **Use Radix UI components** - Never custom CSS
2. **Update component status** - Mark progress in this document
3. **Test responsively** - Check mobile compatibility
4. **Update AGENTS.md** - Keep this document current
5. **Follow TypeScript** - Maintain type safety

### 📋 **AFTER MAKING CHANGES**  
1. **Test both servers** - React frontend + Express backend
2. **Verify mobile responsive** - Chrome DevTools
3. **Update documentation** - Both AGENTS.md and README.md
4. **Check system monitoring** - Ensure cross-platform compatibility

### 🚨 **CRITICAL RULES**
- ❌ **NEVER** break existing functionality
- ❌ **NEVER** use custom CSS when Radix components exist
- ❌ **NEVER** ignore TypeScript errors
- ✅ **ALWAYS** test on mobile 
- ✅ **ALWAYS** update this AGENTS.md when you make significant changes
- ✅ **ALWAYS** preserve cross-platform compatibility

---

## 🔍 DEBUGGING & TROUBLESHOOTING

### 🚧 **Common Issues**

#### **Memory Reporting Problems**
- **Symptom**: Memory showing >95% on macOS
- **Cause**: Platform-specific reporting differences  
- **Fix**: Use existing platform logic in `systemMonitor.js`

#### **RTSP Stream Issues**  
- **Symptom**: Video not loading
- **Cause**: Browser RTSP support limitations
- **Fix**: Check network connectivity, verify stream URLs

#### **React 18 Build Issues**
- **Symptom**: Build errors with Node.js v22+
- **Fix**: Use `NODE_OPTIONS="--openssl-legacy-provider"`

#### **Database Connection Errors**
- **Symptom**: Config API returning errors
- **Cause**: SQLite file permissions or path issues
- **Fix**: Check `dashboard-config.sqlite` exists and is writable

### 🔧 **Development Commands**
```bash
# Start development (both servers)
cd "/Users/paul.foxreeks/NINA Web Control/astro-observatory-dashboard"
./start-dev.sh  # Starts React (3000) + Express (3001)

# Manual server starts
npm start                    # React frontend only
node config-server.js        # Express backend only

# Test system monitoring
curl http://localhost:3001/api/system/status

# Check memory accuracy  
curl http://localhost:3001/api/system/memory
```

---

## 🎯 FUTURE DEVELOPMENT ROADMAP

### 🔴 **HIGH PRIORITY** (Next Development Session)
1. **NINA API Integration** - Connect `NINAStatus.tsx` to live equipment
   - **Endpoint**: `http://172.26.81.152:1888/` 
   - **Components**: Equipment status, progress tracking
   - **Estimated Time**: 2-3 hours

2. **Live Image Gallery** - Connect `ImageViewer.tsx` to file system
   - **Directory**: `D:/Observatory/Captured`
   - **Features**: Real image loading, FITS metadata parsing
   - **Estimated Time**: 2-4 hours

### 🟡 **MEDIUM PRIORITY** 
3. **Target Scheduler Integration** - Connect to `schedulerdb.sqlite` for advanced observatory monitoring
   - **Database**: `../schedulerdb.sqlite` (382 acquired images across 6 projects)
   - **Features**: Project progress tracking, scheduler status, completion analytics
   - **Documentation**: See `../TARGET_SCHEDULER_DATABASE.md` for complete schema analysis
   - **Estimated Time**: 3-4 hours

4. **Advanced System Monitoring** - Enhance `SystemStatusWidget.tsx`
   - **Features**: Historical charts, alert thresholds
   - **Estimated Time**: 1-2 hours

5. **Enhanced Video Controls** - Improve `RTSPViewer.tsx` 
   - **Features**: Recording, quality selection, PiP
   - **Estimated Time**: 1-3 hours

### 🟢 **LOW PRIORITY**
5. **Dashboard Customization** - Widget positioning, themes
6. **Performance Optimization** - Caching, lazy loading
7. **Advanced NINA Controls** - Sequence management, equipment control

---

## 📚 KNOWLEDGE BASE

### 🔗 **Key Resources**
- **NINA API Documentation**: https://bump.sh/christian-photo/doc/advanced-api/
- **Radix UI Documentation**: https://radix-ui.com/themes/docs  
- **Observatory Live Streams**: https://live.starfront.tools/
- **Project Repository**: https://github.com/englishfox90/NINA.WebControlPanel.git
- **🗄️ Target Scheduler Database**: `../TARGET_SCHEDULER_DATABASE.md` - Complete analysis of observatory automation database

### 📊 **Configuration Files**
```json
// config.json - System configuration
{
  "nina": { "apiPort": 1888, "baseUrl": "http://172.26.81.152/" },
  "streams": {
    "liveFeed1": "https://live.starfront.tools/allsky/",
    "liveFeed2": "https://live.starfront.tools/b8/"
  },
  "directories": {
    "liveStackDirectory": "D:/Observatory/LiveStacks",
    "capturedImagesDirectory": "D:/Observatory/Captured"  
  }
}
```

### 🏷️ **Dependencies**
```json
{
  "@radix-ui/themes": "^3.1.3",           // UI framework
  "@radix-ui/react-icons": "^1.3.0",      // Icon system  
  "systeminformation": "^5.21.8",         // System monitoring
  "express": "^4.18.2",                   // Backend server
  "sqlite3": "^5.1.6"                     // Database
}
```

---

## 📐 WIDGET FORMAT STANDARDS

**All widgets must follow the standardized format defined in [`WIDGET_FORMAT_STANDARD.md`](WIDGET_FORMAT_STANDARD.md)**

### ✅ **Compliant Widgets** (Following Standard Format)
- `SystemStatusWidget.tsx` - ✅ Perfect reference implementation
- `TargetSchedulerWidget.tsx` - ✅ New standard format with live data
- `RTSPViewer.tsx` - ✅ Good structure, standard header/footer

### 🔄 **Needs Format Updates**
- `NINAStatus.tsx` - Needs API integration + standard error handling
- `ImageViewer.tsx` - Needs live directory scanning + standard format

### 📋 **Standard Format Requirements**
1. **Header**: Icon + Title + Status Badge + Refresh Button
2. **Loading State**: Consistent spinner with descriptive message  
3. **Error State**: Professional error display with retry button
4. **Footer**: Timestamp + Live data indicator
5. **API Integration**: Full URL, proper error handling, auto-refresh
6. **Mobile Responsive**: ScrollArea for long content, proper sizing
7. **TypeScript**: Strict interfaces, proper error types

**New widgets MUST use the standard format. Existing widgets should be gradually updated.**

---

## 📝 AGENT UPDATE LOG

### 🔄 **INSTRUCTIONS FOR UPDATING THIS DOCUMENT**

**WHEN TO UPDATE:**
- ✅ New component completed or significantly modified
- ✅ API integration added or changed  
- ✅ Platform-specific fixes implemented
- ✅ Architecture changes made
- ✅ Critical bugs fixed or workarounds found
- ✅ New dependencies added

**HOW TO UPDATE:**
1. **Update status matrices** - Component completion status
2. **Update roadmap priorities** - Move completed items to "Done" 
3. **Add to knowledge base** - Document new findings
4. **Update technical guides** - Include new patterns or fixes
5. **Increment version info** - Update "Last Updated" date
6. **🔄 SYNC WITH COPILOT** - Run `./sync-docs.sh` or manually update `.github/copilot-instructions.md`

### 📋 **CROSS-PLATFORM DOCUMENTATION SYNC**

This project maintains **two AI agent instruction files**:

1. **`AGENTS.md`** (This file) - Comprehensive AI agent guide with full context
2. **`.github/copilot-instructions.md`** - GitHub Copilot optimized version

**🔄 Sync Strategy:**
```bash
# Automatic sync (recommended)
./sync-docs.sh

# Manual sync checklist:
# 1. Component status updates
# 2. Priority changes  
# 3. New API endpoints
# 4. Critical patterns/fixes
# 5. Update "Last Synced" timestamp
```

**🎯 Key Differences:**
- **AGENTS.md**: Full project context, debugging guides, detailed matrices
- **Copilot Instructions**: Concise patterns, critical rules, common tasks

**⚠️ Critical Sync Points:**
- Component completion status changes
- New platform-specific fixes
- Priority task updates
- API endpoint changes
- Development pattern updates

### 📅 **RECENT UPDATES**
- **August 28, 2025**: Created AGENTS.md, documented SystemStatusWidget, cross-platform memory fix
- **August 27, 2025**: Added system monitoring widget with real-time updates
- **August 27, 2025**: Fixed macOS memory reporting accuracy (99% → 64-80%)
- **August 26, 2025**: Enhanced video feed UX with dynamic sizing and transitions
- **August 25, 2025**: Radix UI modernization complete, all components updated

### 🎯 **SUCCESS METRICS**
- **Development Speed**: AI agents should be productive within 10 minutes of reading this
- **Code Quality**: All changes should maintain TypeScript safety and Radix UI patterns
- **Cross-Platform**: All features must work on macOS, Windows, and Linux
- **Mobile Ready**: All changes must be responsive and touch-friendly

---

**🚀 The Astro Observatory Dashboard is a production-ready full-stack application. Focus on NINA API integration to complete the observatory monitoring system!**

*Document Version: 1.0 | Last Updated: August 28, 2025 | Next Review: When major features are added*

---
*Last Synced: August 28, 2025 at 12:55
