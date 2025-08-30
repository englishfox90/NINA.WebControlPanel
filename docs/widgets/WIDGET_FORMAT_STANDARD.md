# 📐 Standard Widget Format Documentation

## Overview
This document defines the **standard format and patterns** for all widgets in the Astro Observatory Dashboard to ensure consistency, maintainability, and professional appearance.

## 🎯 Widget Design Principles

### 1. **Consistent Structure**
All widgets must follow this exact structure pattern:

```tsx
// Standard Widget Template
const WidgetName: React.FC<WidgetProps> = ({ onRefresh }) => {
  // 1. State Management
  const [data, setData] = useState<DataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Data Fetching
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/endpoint');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // 3. Effect Hook (Initial load only)
  useEffect(() => {
    fetchData();
  }, []);

  // 4. Global Refresh Handler
  useEffect(() => {
    if (onRefresh) {
      const handleGlobalRefresh = () => fetchData();
      // Listen for global refresh events
      return () => {}; // Cleanup if needed
    }
  }, [onRefresh]);

  // 5. Loading State
  if (loading) {
    return <LoadingState />;
  }

  // 6. Error State
  if (error) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  // 7. Main Content (No footer with timestamp)
  return <MainContent data={data} />;
};
```

## 🔧 Required Components & Patterns

### 1. **Header Structure** ✅ MANDATORY
Every widget must have this exact header format:

```tsx
{/* Header */}
<Flex justify="between" align="center">
  <Flex align="center" gap="2">
    <WidgetIcon />
    <Text size="3" weight="medium">Widget Name</Text>
  </Flex>
  <Badge color="green" size="2">
    <StatusIcon width="12" height="12" />
    Status Text
  </Badge>
</Flex>
```

**Note:** Individual widget refresh buttons are removed. Use the global dashboard refresh instead.

### 2. **Loading State** ✅ MANDATORY
Consistent loading appearance across all widgets:

```tsx
if (loading) {
  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex align="center" gap="2">
          <WidgetIcon />
          <Text size="3" weight="medium">Widget Name</Text>
        </Flex>
        <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
          <Flex direction="column" align="center" gap="2">
            <ReloadIcon className="loading-spinner" />
            <Text size="2" color="gray">Loading widget data...</Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
```

### 3. **Error State** ✅ MANDATORY
Professional error handling:

```tsx
if (error) {
  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex align="center" gap="2">
          <WidgetIcon />
          <Text size="3" weight="medium">Widget Name</Text>
        </Flex>
        <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
          <Flex direction="column" align="center" gap="2">
            <ExclamationTriangleIcon color="red" width="24" height="24" />
            <Text size="2" color="red">Failed to load data</Text>
            <Text size="1" color="gray">{error}</Text>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
```

**Note:** Use global refresh instead of individual retry buttons.

## 🎨 UI Framework Standards

### **ALWAYS Use Radix UI Themes**
```tsx
// ✅ CORRECT - Import from themes
import { Card, Flex, Badge, Progress, Button, Text } from '@radix-ui/themes';
import { ReloadIcon, CheckCircledIcon } from '@radix-ui/react-icons';

// ❌ WRONG - Never use custom CSS or other UI libraries
import './custom-styles.css';
```

### **Color Palette Standards**
```tsx
// Status Colors
const STATUS_COLORS = {
  success: 'green',
  warning: 'amber', 
  error: 'red',
  info: 'blue',
  neutral: 'gray'
} as const;

// Filter-Specific Colors
const FILTER_COLORS = {
  'ha': 'red',
  'oiii': 'cyan', 
  'sii': 'amber',
  'rgb': 'gray',
  'luminance': 'gray'
} as const;
```

### **Typography Standards**
```tsx
// Widget Titles
<Text size="3" weight="medium">Widget Title</Text>

// Section Headers  
<Text size="2" weight="bold">Section Header</Text>

// Data Values
<Text size="2" weight="medium">Data Value</Text>

// Labels & Metadata
<Text size="1" color="gray">Label</Text>
```

## 📊 Data Patterns

### 1. **API Integration Pattern**
```tsx
interface ApiResponse<T> {
  data: T;
  lastUpdate: string;
  status: 'success' | 'error';
  message?: string;
}

// Always use full URLs for API calls
const API_BASE = 'http://localhost:3001';
const response = await fetch(`${API_BASE}/api/endpoint`);
```

### 2. **State Management Pattern**
```tsx
// Use descriptive interfaces
interface WidgetData {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  lastUpdate: string;
}

interface WidgetState {
  data: WidgetData | null;
  loading: boolean;
  error: string | null;
}
```

### 3. **Update Policy**
```tsx
// Refresh Policy - Most widgets use global refresh only
// Only specific widgets need automatic refresh:
const AUTO_REFRESH_WIDGETS = [
  'SystemStatusWidget',    // Server monitoring
  'RTSPViewer'            // Video feed
];

// Standard refresh intervals (for auto-refresh widgets only)
const REFRESH_INTERVALS = {
  frequent: 30000,    // 30 seconds - system monitoring  
  normal: 30000,     // 30 seconds - video feed
} as const;
```

## 🔄 Refresh & Update Patterns

### **Global Refresh Policy**
Most widgets should NOT implement automatic refresh. They rely on the global refresh button at the top of the dashboard.

### **Auto-Refresh (Limited Use)**
Only for specific widgets like system monitoring and video feeds:
```tsx
useEffect(() => {
  fetchData();
  
  const interval = setInterval(fetchData, REFRESH_INTERVAL);
  return () => clearInterval(interval);
}, []);
```

### **Standard Widget Pattern (No Auto-Refresh)**
```tsx
useEffect(() => {
  fetchData(); // Initial load only
}, []);
```

## 📱 Dynamic Layout & Responsiveness

### **React Grid Layout Dashboard System**
```tsx
// Dashboard uses react-grid-layout for professional drag-and-drop functionality
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

<ResponsiveGridLayout
  layouts={getGridLayout(widgetConfig)}
  onLayoutChange={handleLayoutChange}
  isDraggable={true}
  isResizable={true}
  cols={12}
  rowHeight={30}
  margin={[24, 24]}
>
  {widgets.map(config => (
    <div key={config.layout.i} className="widget-container">
      <div className="drag-handle">...</div>
      <Widget />
    </div>
  ))}
</ResponsiveGridLayout>
```

### **Widget Configuration System**
```tsx
// Each widget has a complete configuration object
interface WidgetConfig {
  id: string;
  component: string;  // Component name to render
  title: string;      // Display title for drag handle
  layout: {
    i: string;        // Unique identifier
    x: number;        // Grid column position (0-11)
    y: number;        // Grid row position
    w: number;        // Width in grid units
    h: number;        // Height in grid units
    minW?: number;    // Minimum width constraint
    minH?: number;    // Minimum height constraint
    static?: boolean; // Prevent dragging/resizing
  };
}

// Example widget configuration
{
  id: 'nina-status',
  component: 'NINAStatus',
  title: 'Equipment Status',
  layout: {
    i: 'nina-status',
    x: 0, y: 0,
    w: 4, h: 12,    // 4 columns wide, 12 rows tall (~360px)
    minW: 3, minH: 8
  }
}
```

### **Benefits of React Grid Layout:**
- ✅ **Professional Drag & Drop**: Industry-standard library used by major dashboards
- ✅ **Drag Handles**: Clear visual indicators for dragging widgets
- ✅ **Resize Handles**: Users can resize widgets to their preferred size
- ✅ **Layout Persistence**: Easy to save/load layouts to/from localStorage or API
- ✅ **Responsive Design**: Different layouts for different screen sizes
- ✅ **Collision Detection**: Widgets intelligently move out of the way
- ✅ **Grid Snapping**: Widgets snap to clean grid positions
- ✅ **Configurable**: JSON-driven widget configuration system

### **Grid System Specifications:**
- **12-Column Grid**: Standard responsive grid system
- **30px Row Height**: Fine-grained vertical control
- **24px Margins**: Consistent spacing between widgets
- **Responsive Breakpoints**: lg: 12 cols, md: 10 cols, sm: 6 cols, xs: 4 cols, xxs: 2 cols
- **Draggable Handles**: Custom styled handles with widget titles
- **Resize Handles**: Bottom-right corner resize controls

### **Widget Container Structure:**
```tsx
<div className="widget-container">
  {/* Draggable handle with title */}
  <div className="drag-handle">
    Equipment Status ⋮⋮
  </div>
  
  {/* Widget content area */}
  <div style={{ height: 'calc(100% - 30px)' }}>
    <NINAStatus />
  </div>
</div>
```

### **Layout Configuration Management:**
```tsx
// Layout changes are captured for persistence
const handleLayoutChange = (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
  // Save to localStorage
  localStorage.setItem('dashboardLayout', JSON.stringify(layouts));
  
  // Or send to API
  fetch('/api/dashboard/layout', {
    method: 'POST',
    body: JSON.stringify({ layouts })
  });
};
```

### **Future Configurability Features:**
- **Widget Settings**: Each widget can have individual configuration options
- **Add/Remove Widgets**: Dynamic widget management
- **Multiple Layouts**: Save different layout presets
- **User Permissions**: Control which widgets users can modify
- **Real-time Sync**: Share layouts across multiple sessions

### **Mobile-Optimized Sizing**
```tsx
// Button sizes
<Button size="1" />        // Mobile-friendly
<Button variant="ghost" />  // Less visual weight

// Badge sizes  
<Badge size="1" />         // Compact
<Badge size="2" />         // Standard

// Text sizes
<Text size="1" />          // Small labels
<Text size="2" />          // Content
<Text size="3" />          // Headers
```

## 🎯 Widget-Specific Examples

### **Reference Implementations**
1. **SystemStatusWidget** - Perfect example with auto-refresh (system monitoring) ✅
2. **NINAStatus** - Updated to new standard (no auto-refresh) ✅ 
3. **SchedulerWidget** - Updated to new standard (no auto-refresh) ✅
4. **RTSPViewer** - Keeps refresh functionality for video feed ✅
5. **TimeAstronomicalWidget** - NEW! Complete implementation with time display and astronomical visualization ✅

### **Auto-Refresh Exceptions**
Only these widgets should implement auto-refresh:
- **SystemStatusWidget**: Server/system monitoring (5 seconds)
- **RTSPViewer**: Video feed refresh (30 seconds)

All other widgets use global refresh only.

### **Implementation Checklist**
- ✅ Uses Radix UI Themes exclusively
- ✅ Standard header with icon + title + status badge (no refresh button)
- ✅ Proper loading state with spinner and message
- ✅ Professional error state (no retry button - use global refresh)
- ✅ No footer with timestamp (removed for cleaner UI)
- ✅ TypeScript interfaces for all data structures
- ✅ Proper API error handling with HTTP status codes
- ✅ Initial data fetch only (no auto-refresh unless specified)
- ✅ Global refresh integration via onRefresh prop
- ✅ Mobile-responsive layout with ScrollArea
- ✅ Consistent color palette and typography

## 🔧 Development Guidelines

### **File Structure**
```
src/components/
├── WidgetName.tsx           # Main component
├── WidgetName.types.ts      # TypeScript interfaces (if complex)
└── WidgetName.test.tsx      # Unit tests (future)
```

### **Import Order**
```tsx
// 1. React
import React, { useState, useEffect } from 'react';

// 2. Radix UI  
import { Card, Flex, Text } from '@radix-ui/themes';
import { ReloadIcon } from '@radix-ui/react-icons';

// 3. Internal types
import type { WidgetData } from '../types/widget';

// 4. Utils & services
import { formatDate } from '../utils/helpers';
```

### **Naming Conventions**
- Components: `PascalCase` (e.g., `TargetSchedulerWidget`)
- Props interfaces: `ComponentNameProps` 
- API functions: `fetchComponentData`
- Event handlers: `handleActionName`
- State variables: `camelCase` with descriptive names

## 🚀 Production Standards

### **Performance**
- Always cleanup intervals in useEffect return
- Use proper dependency arrays
- Implement loading states for better UX
- Error boundaries for crash prevention

### **Accessibility**
- Semantic HTML structure
- Proper ARIA labels on interactive elements
- Color contrast compliance (handled by Radix)
- Keyboard navigation support

### **Testing**
- TypeScript strict mode compliance
- No console errors or warnings
- Proper error handling for all API calls
- Mobile responsiveness testing

---

## 📋 Widget Format Compliance

**All new widgets MUST follow this standard format. Existing widgets should be gradually updated to match this pattern for consistency and maintainability.**

**Last Updated:** August 29, 2025  
**Format Version:** 1.1  
**Status:** Production Standard
