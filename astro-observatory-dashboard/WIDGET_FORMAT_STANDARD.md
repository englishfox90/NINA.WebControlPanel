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

  // 3. Effect Hook
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // 4. Event Handlers
  const handleRefresh = () => {
    fetchData();
    onRefresh?.();
  };

  // 5. Loading State
  if (loading) {
    return <LoadingState />;
  }

  // 6. Error State
  if (error) {
    return <ErrorState error={error} onRetry={handleRefresh} />;
  }

  // 7. Main Content
  return <MainContent data={data} onRefresh={handleRefresh} />;
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
  <Flex align="center" gap="2">
    <Badge color="green" size="2">
      <StatusIcon width="12" height="12" />
      Status Text
    </Badge>
    <Button 
      variant="ghost" 
      size="1" 
      onClick={handleRefresh}
      disabled={loading}
    >
      <ReloadIcon />
    </Button>
  </Flex>
</Flex>
```

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
Professional error handling with retry functionality:

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
            <Button size="1" onClick={handleRefresh}>
              <ReloadIcon />
              Try Again
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
```

### 4. **Footer Structure** ✅ RECOMMENDED
Include timestamp and status indicators:

```tsx
{/* Footer */}
<Flex justify="between" align="center" pt="2" style={{ borderTop: '1px solid var(--gray-6)' }}>
  <Text size="1" color="gray">
    Last updated: {lastUpdate.toLocaleTimeString()}
  </Text>
  <Flex align="center" gap="1">
    <DotFilledIcon color="green" width="12" height="12" />
    <Text size="1" color="green">Live Data</Text>
  </Flex>
</Flex>
```

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

### 3. **Update Intervals**
```tsx
// Standard refresh intervals
const REFRESH_INTERVALS = {
  realtime: 1000,    // 1 second - critical status
  frequent: 5000,    // 5 seconds - system monitoring  
  normal: 30000,     // 30 seconds - general data
  slow: 300000       // 5 minutes - historical data
} as const;
```

## 🔄 Refresh & Update Patterns

### **Manual Refresh Handler**
```tsx
const handleRefresh = useCallback(() => {
  fetchData();
  onRefresh?.(); // Notify parent component
}, [onRefresh]);
```

### **Auto-Refresh Setup**
```tsx
useEffect(() => {
  fetchData();
  
  const interval = setInterval(fetchData, REFRESH_INTERVAL);
  return () => clearInterval(interval);
}, []);
```

## 📱 Mobile Responsiveness

### **Responsive Layout**
```tsx
// Use ScrollArea for long content
<ScrollArea style={{ height: '350px' }}>
  <Flex direction="column" gap="3">
    {/* Content */}
  </Flex>
</ScrollArea>

// Responsive flex layouts
<Flex direction={{ initial: 'column', md: 'row' }} gap="3">
```

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
1. **SystemStatusWidget** - Perfect example of standard format ✅
2. **TargetSchedulerWidget** - Follows new standard format ✅ 
3. **RTSPViewer** - Good structure, needs footer update 🔄
4. **NINAStatus** - Needs full API integration 🚧

### **Implementation Checklist**
- ✅ Uses Radix UI Themes exclusively
- ✅ Standard header with icon + title + status badge + refresh button
- ✅ Proper loading state with spinner and message
- ✅ Professional error state with retry functionality  
- ✅ Footer with timestamp and live data indicator
- ✅ TypeScript interfaces for all data structures
- ✅ Proper API error handling with HTTP status codes
- ✅ Auto-refresh with cleanup on unmount
- ✅ Mobile-responsive layout with ScrollArea
- ✅ Consistent color palette and typography
- ✅ Manual refresh callback for parent notifications

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

**Last Updated:** August 28, 2025  
**Format Version:** 1.0  
**Status:** Production Standard
