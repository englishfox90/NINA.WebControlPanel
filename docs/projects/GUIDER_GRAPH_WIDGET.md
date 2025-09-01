# 📊 NINA Guider Graph Widget Project

> **Project Status**: 📋 Planning Phase  
> **Priority**: 🟡 Medium (Enhancement)  
> **Est. Completion**: 2-3 Development Sessions  
> **Dependencies**: Chart.js (✅ Available), NINA API (✅ Connected)

## 🎯 Project Overview

Create a professional guider graph widget that displays real-time PHD2/NINA guiding performance data, showing RA/Dec error patterns, RMS statistics, and guide step visualizations similar to professional astrophotography applications.

### 🔗 API Reference
- **NINA Endpoint**: `/v2/api/equipment/guider/graph`
- **Documentation**: https://bump.sh/christian-photo/doc/advanced-api/operation/operation-get-equipment-guider-graph
- **Update Frequency**: Real-time via WebSocket + 30-second polling fallback

## 📊 Data Structure Analysis

Based on the NINA API documentation, the guider graph endpoint provides:

```typescript
interface GuiderGraphResponse {
  Response: {
    RMS: {
      RA: number;           // RA RMS error
      Dec: number;          // Dec RMS error  
      Total: number;        // Total RMS
      RAText: string;       // Formatted RA RMS
      DecText: string;      // Formatted Dec RMS
      TotalText: string;    // Formatted total RMS
      PeakRAText: string;   // Peak RA error text
      PeakDecText: string;  // Peak Dec error text
      Scale: number;        // Pixel scale
      PeakRA: number;       // Peak RA error
      PeakDec: number;      // Peak Dec error
      DataPoints: number;   // Number of data points
    };
    Interval: number;       // Guide interval (seconds)
    MaxY: number;          // Chart max Y axis
    MinY: number;          // Chart min Y axis
    MaxDurationY: number;  // Max duration Y axis
    MinDurationY: number;  // Min duration Y axis
    GuideSteps: GuideStep[]; // Array of guide steps
    HistorySize: number;   // Number of steps stored
    PixelScale: number;    // Arcsec per pixel
    Scale: number;         // Chart scale
  };
  Error: string;
  StatusCode: number;
  Success: boolean;
  Type: string;
}

interface GuideStep {
  Id: number;                    // Step ID
  IdOffsetLeft: number;         // Left offset
  IdOffsetRight: number;        // Right offset
  RADistanceRaw: number;        // Raw RA distance
  RADistanceRawDisplay: number; // Display RA distance
  RADuration: number;           // RA correction duration
  DECDistanceRaw: number;       // Raw Dec distance
  DECDistanceRawDisplay: number;// Display Dec distance
  DECDuration: number;          // Dec correction duration
  Dither: string;              // Dither event marker
}
```

## 🏗️ Architecture Design

### 1. Component Structure (Following Project Patterns)

```
src/client/src/components/GuiderGraphWidget/
├── index.tsx                 // Main widget component
├── GuiderChart.tsx          // Chart.js line chart component
├── RMSStats.tsx            // RMS statistics display
├── GuiderControls.tsx      // Chart controls (time range, etc)
└── GuiderGraph.types.ts    // TypeScript interfaces
```

### 2. Integration Points

#### **Frontend Integration:**
- **Dashboard Integration**: Add to `dashboard_widgets` table with default position
- **Chart.js Integration**: Extend existing Chart.js setup from `TimeAstronomicalWidget`
- **Performance Optimization**: Apply React.memo + useCallback patterns from `SystemStatusWidget`
- **Radix UI Consistency**: Use Card, Flex, Text, Badge components

#### **Backend Integration:**
- **API Route**: Add `/api/nina/guider-graph` endpoint in `src/server/api/nina.js`
- **Service Integration**: Extend `ninaService.js` with guider graph fetching
- **WebSocket Enhancement**: Add guider events to WebSocket subscription
- **Caching Strategy**: Apply 5-second caching like other NINA endpoints

#### **Interface Integration:**
- **Type Definitions**: Add to `src/client/src/interfaces/nina.ts`
- **Widget Props**: Extend dashboard widget props pattern
- **Error Handling**: Follow established error boundary patterns

## 📈 Chart Implementation Strategy

### Chart.js Combo Chart Implementation

Based on the react-chartjs-2 combo chart example, we'll use a **mixed chart type** with dual Y-axes:

```typescript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Chart } from 'react-chartjs-2'; // Using generic Chart for mixed types
import 'chartjs-adapter-date-fns'; // For time-based X-axis

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement, // Added for bar chart overlay
  Title,
  Tooltip,
  Legend,
  TimeScale
);
```

### Combo Chart Configuration

```typescript
const comboChartData = {
  labels: guideSteps.map(step => new Date(step.timestamp)), // Time-based labels
  datasets: [
    {
      type: 'line' as const,
      label: 'RA Error',
      data: guideSteps.map(step => step.RADistanceRawDisplay),
      borderColor: '#3B82F6', // Blue
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      yAxisID: 'yError',
      tension: 0.1,
      pointRadius: 2,
      pointHoverRadius: 4
    },
    {
      type: 'line' as const,
      label: 'Dec Error',
      data: guideSteps.map(step => step.DECDistanceRawDisplay),
      borderColor: '#EF4444', // Red
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      yAxisID: 'yError',
      tension: 0.1,
      pointRadius: 2,
      pointHoverRadius: 4
    },
    {
      type: 'bar' as const,
      label: 'RA Pulse',
      data: guideSteps.map(step => step.RADuration),
      backgroundColor: 'rgba(59, 130, 246, 0.3)',
      borderColor: '#3B82F6',
      borderWidth: 1,
      yAxisID: 'yDuration',
      barThickness: 3
    },
    {
      type: 'bar' as const,
      label: 'Dec Pulse',
      data: guideSteps.map(step => step.DECDuration),
      backgroundColor: 'rgba(239, 68, 68, 0.3)',
      borderColor: '#EF4444',
      borderWidth: 1,
      yAxisID: 'yDuration',
      barThickness: 3
    }
  ]
};

const comboChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: 'time' as const,
      time: {
        unit: 'minute' as const,
        displayFormats: {
          minute: 'HH:mm'
        }
      },
      title: { 
        display: true, 
        text: 'Time',
        color: 'var(--gray-11)'
      },
      grid: { 
        color: 'var(--gray-6)' 
      },
      ticks: {
        color: 'var(--gray-11)'
      }
    },
    yError: {
      type: 'linear' as const,
      position: 'left' as const,
      title: { 
        display: true, 
        text: 'Error (arcsec)',
        color: 'var(--gray-11)'
      },
      grid: { 
        color: 'var(--gray-4)' 
      },
      ticks: {
        color: 'var(--gray-11)'
      }
    },
    yDuration: {
      type: 'linear' as const,
      position: 'right' as const,
      title: { 
        display: true, 
        text: 'Pulse Duration (ms)',
        color: 'var(--gray-11)'
      },
      grid: { 
        drawOnChartArea: false // Don't draw grid lines for right axis
      },
      ticks: {
        color: 'var(--gray-11)'
      }
    }
  },
  plugins: {
    legend: { 
      position: 'top' as const,
      labels: {
        color: 'var(--gray-11)',
        usePointStyle: true,
        pointStyle: 'rect'
      }
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'var(--gray-1)',
      titleColor: 'var(--gray-12)',
      bodyColor: 'var(--gray-11)',
      borderColor: 'var(--gray-6)',
      borderWidth: 1,
      callbacks: {
        title: (context: any) => {
          const timestamp = context[0].parsed.x;
          return `Step ${context[0].dataIndex + 1} - ${new Date(timestamp).toLocaleTimeString()}`;
        },
        label: (context: any) => {
          const value = context.parsed.y;
          const unit = context.dataset.yAxisID === 'yError' ? ' arcsec' : ' ms';
          return `${context.dataset.label}: ${value.toFixed(2)}${unit}`;
        },
        afterBody: (context: any) => {
          // Show dither information if available
          const stepIndex = context[0].dataIndex;
          const step = guideSteps[stepIndex];
          return step?.Dither ? [`Dither: ${step.Dither}`] : [];
        }
      }
    }
  },
  interaction: {
    mode: 'nearest' as const,
    intersect: false
  },
  // Dither event annotations (if using chartjs-plugin-annotation)
  plugins: {
    annotation: {
      annotations: guideSteps
        .filter(step => step.Dither)
        .map((step, index) => ({
          type: 'line',
          scaleID: 'x',
          value: step.timestamp,
          borderColor: '#F59E0B',
          borderWidth: 2,
          label: {
            content: '🔄',
            enabled: true,
            position: 'top'
          }
        }))
    }
  }
};
```

### Combo Chart Component Usage

```typescript
const GuiderChart: React.FC<GuiderChartProps> = ({ 
  guideSteps, 
  interval, 
  scale, 
  maxY, 
  minY 
}) => {
  const chartData = useMemo(() => {
    // Transform guideSteps into combo chart format
    return processGuideStepsForChart(guideSteps, interval, scale);
  }, [guideSteps, interval, scale]);

  const chartOptions = useMemo(() => {
    // Generate chart options with dynamic Y-axis ranges
    return generateComboChartOptions(maxY, minY, guideSteps);
  }, [maxY, minY, guideSteps]);

  return (
    <Box style={{ height: '300px', position: 'relative' }}>
      <Chart 
        type="line" // Base type, datasets override with specific types
        data={chartData} 
        options={chartOptions} 
      />
    </Box>
  );
};
```

## 🔌 API Integration Plan

### Backend Implementation

**File**: `src/server/api/nina.js`

```javascript
// Add guider graph endpoint
app.get('/api/nina/guider-graph', async (req, res) => {
  try {
    const guiderData = await ninaService.getGuiderGraph();
    res.json(guiderData);
  } catch (error) {
    logger.error('Error fetching guider graph:', error);
    res.status(500).json({ 
      error: 'Failed to fetch guider graph data',
      details: error.message 
    });
  }
});
```

**File**: `src/services/ninaService.js`

```javascript
// Add guider graph method
async getGuiderGraph() {
  return this.getCachedData('guider-graph', async () => {
    const response = await axios.get(
      `${this.baseUrl}/v2/api/equipment/guider/graph`,
      { timeout: this.timeout }
    );
    
    // Process and validate data
    const data = response.data;
    if (!data.Success) {
      throw new Error(data.Error || 'Failed to fetch guider graph');
    }
    
    return {
      ...data.Response,
      timestamp: Date.now() // Add fetch timestamp
    };
  });
}
```

### WebSocket Integration Strategy

Since guider graph data isn't directly available in WebSocket events, we'll use **event-driven refresh triggers**:

**Available NINA Guider WebSocket Events:**
- `GUIDER-CONNECTED` - Guider connects, refresh to show new data
- `GUIDER-DISCONNECTED` - Guider disconnects, show offline state  
- `GUIDER-START` - Guiding starts, begin active monitoring
- `GUIDER-STOP` - Guiding stops, final refresh then reduce frequency
- `GUIDER-DITHER` - Dither event, immediate refresh to show marker

### Frontend Data Flow with Smart WebSocket Integration

```typescript
const GuiderGraphWidget: React.FC<GuiderGraphWidgetProps> = ({ 
  onRefresh, 
  hideHeader = false 
}) => {
  const [guiderData, setGuiderData] = useState<GuiderGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuidingActive, setIsGuidingActive] = useState(false);
  const [guiderConnected, setGuiderConnected] = useState(false);

  const fetchGuiderData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(getApiUrl('/api/nina/guider-graph'));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setGuiderData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket event handlers for guider events
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      switch (data.Event) {
        case 'GUIDER-CONNECTED':
          console.log('🔌 Guider connected - refreshing graph data');
          setGuiderConnected(true);
          fetchGuiderData();
          break;
          
        case 'GUIDER-DISCONNECTED':
          console.log('🔌 Guider disconnected - showing offline state');
          setGuiderConnected(false);
          setIsGuidingActive(false);
          break;
          
        case 'GUIDER-START':
          console.log('🎯 Guiding started - enabling active monitoring');
          setIsGuidingActive(true);
          fetchGuiderData();
          break;
          
        case 'GUIDER-STOP':
          console.log('⏹️ Guiding stopped - final refresh');
          setIsGuidingActive(false);
          fetchGuiderData(); // Final refresh to capture last data
          break;
          
        case 'GUIDER-DITHER':
          console.log('🔄 Dither event detected - refreshing for marker');
          fetchGuiderData(); // Immediate refresh to show dither marker
          break;
      }
    };

    // Connect to existing WebSocket system
    // (Implementation depends on current WebSocket architecture)
    const ws = new WebSocket(getApiUrl('/ws/nina').replace('http', 'ws'));
    ws.addEventListener('message', handleWebSocketMessage);
    
    return () => ws.close();
  }, [fetchGuiderData]);

  // Adaptive polling based on guiding state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isGuidingActive && guiderConnected) {
      // Active guiding: refresh every 15 seconds
      interval = setInterval(fetchGuiderData, 15000);
    } else if (guiderConnected) {
      // Connected but not guiding: refresh every 60 seconds
      interval = setInterval(fetchGuiderData, 60000);
    }
    // Disconnected: no polling, only WebSocket-triggered refreshes
    
    return () => clearInterval(interval);
  }, [isGuidingActive, guiderConnected, fetchGuiderData]);

  // Initial data fetch
  useEffect(() => {
    fetchGuiderData();
  }, [fetchGuiderData]);
};
```

## 🎨 UI/UX Design

### Widget Layout

```typescript
<Card className="guider-graph-widget">
  {!hideHeader && (
    <Flex justify="between" align="center" className="widget-header">
      <Flex align="center" gap="2">
        <ActivityLogIcon />
        <Text weight="bold">Guider Graph</Text>
      </Flex>
      <Flex gap="2">
        <Badge color={rmsStatus.color}>{rmsStatus.text}</Badge>
        <IconButton onClick={onRefresh}>
          <ReloadIcon />
        </IconButton>
      </Flex>
    </Flex>
  )}
  
  <Flex direction="column" gap="3" p="3">
    {/* RMS Statistics Row */}
    <Flex gap="3" justify="center">
      <RMSStats 
        ra={guiderData.RMS.RA} 
        dec={guiderData.RMS.Dec}
        total={guiderData.RMS.Total}
        peakRA={guiderData.RMS.PeakRA}
        peakDec={guiderData.RMS.PeakDec}
      />
    </Flex>
    
    {/* Main Chart */}
    <Box style={{ height: '300px', position: 'relative' }}>
      <GuiderChart 
        guideSteps={guiderData.GuideSteps}
        interval={guiderData.Interval}
        scale={guiderData.Scale}
        maxY={guiderData.MaxY}
        minY={guiderData.MinY}
      />
    </Box>
    
    {/* Chart Controls */}
    <GuiderControls 
      historySize={guiderData.HistorySize}
      dataPoints={guiderData.RMS.DataPoints}
      onTimeRangeChange={handleTimeRangeChange}
      onScaleChange={handleScaleChange}
    />
  </Flex>
</Card>
```

### RMS Statistics Component

```typescript
const RMSStats: React.FC<RMSStatsProps> = ({ ra, dec, total, peakRA, peakDec }) => (
  <Flex gap="4">
    <HoverCard.Root>
      <HoverCard.Trigger>
        <Badge color="blue" size="2">
          RA: {ra.toFixed(2)}"
        </Badge>
      </HoverCard.Trigger>
      <HoverCard.Content>
        <Flex direction="column" gap="1">
          <Text size="1" weight="bold">Right Ascension</Text>
          <Text size="1">RMS: {ra.toFixed(2)} arcsec</Text>
          <Text size="1">Peak: {peakRA.toFixed(2)} arcsec</Text>
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
    
    <HoverCard.Root>
      <HoverCard.Trigger>
        <Badge color="red" size="2">
          Dec: {dec.toFixed(2)}"
        </Badge>
      </HoverCard.Trigger>
      <HoverCard.Content>
        <Flex direction="column" gap="1">
          <Text size="1" weight="bold">Declination</Text>
          <Text size="1">RMS: {dec.toFixed(2)} arcsec</Text>
          <Text size="1">Peak: {peakDec.toFixed(2)} arcsec</Text>
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
    
    <HoverCard.Root>
      <HoverCard.Trigger>
        <Badge color="green" size="2">
          Total: {total.toFixed(2)}"
        </Badge>
      </HoverCard.Trigger>
      <HoverCard.Content>
        <Flex direction="column" gap="1">
          <Text size="1" weight="bold">Total RMS Error</Text>
          <Text size="1">Combined: {total.toFixed(2)} arcsec</Text>
          <Text size="1">Data Points: {/* dataPoints */}</Text>
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  </Flex>
);
```

## 🚀 Implementation Phases

### Phase 1: Combo Chart Implementation (Session 1)
- [ ] **Create component structure** and TypeScript interfaces
- [ ] **Implement Chart.js combo chart** with mixed line/bar types and dual Y-axes
- [ ] **Add TypeScript interfaces** to `nina.ts` for GuiderGraphData and GuideStep
- [ ] **Create backend API endpoint** `/api/nina/guider-graph` in `nina.js`
- [ ] **Basic RMS statistics display** with Radix UI hover cards
- [ ] **Add widget to dashboard database** with default configuration

### Phase 2: Smart WebSocket Integration (Session 2) 
- [ ] **Event-driven refresh system** using GUIDER-* WebSocket events
- [ ] **Adaptive polling strategy**: 15s active guiding, 60s idle, none when disconnected
- [ ] **Guider state management** with connection and activity tracking
- [ ] **Performance optimization** with React.memo/useCallback patterns
- [ ] **Error handling** for guider offline scenarios with graceful fallbacks
- [ ] **Dither event markers** triggered by GUIDER-DITHER WebSocket events
- [ ] **Real-time status indicators** showing guider connection and activity state

### Phase 3: Polish & Professional Features (Session 3)
- [ ] Advanced tooltips with guide step details
- [ ] Export functionality (PNG/CSV)
- [ ] Guiding quality assessment indicators
- [ ] Mobile responsive design
- [ ] Professional hover cards with detailed stats
- [ ] Chart zoom and pan capabilities
- [ ] Integration testing with live NINA system

## 🔧 Technical Considerations

### Performance Optimization
- **Data Processing**: Process large guide step arrays efficiently
- **Chart Updates**: Use Chart.js update methods vs full re-render
- **Memory Management**: Limit displayed data points to prevent memory issues
- **Debounced Updates**: Prevent rapid re-renders from WebSocket events

### Error Handling
- **Equipment Disconnected**: Show graceful fallback when guider offline
- **Data Validation**: Validate API response structure
- **Network Issues**: Retry logic with exponential backoff
- **Chart Errors**: Fallback to basic error display

### Mobile Responsiveness
- **Touch Interactions**: Implement touch-friendly chart interactions  
- **Compact Layout**: Responsive RMS stats layout
- **Chart Sizing**: Proper sizing for mobile viewports

## 📚 Dependencies

### Required Packages (Already Available)
- ✅ `chart.js` (v4.5.0)
- ✅ `react-chartjs-2` (v5.3.0) - Will use generic `Chart` component for mixed types
- ✅ `@radix-ui/themes`
- ✅ `@radix-ui/react-icons`

### Optional Enhancements
- `chartjs-adapter-date-fns` - For time-scale X-axis (recommended)
- `chartjs-plugin-annotation` - For dither event markers (optional)
- `chartjs-plugin-zoom` - For chart zoom/pan functionality (nice-to-have)

## 🧪 Testing Strategy

### Unit Testing
- Component rendering with mock data
- Chart data transformation accuracy
- Error state handling

### Integration Testing  
- NINA API connection testing
- WebSocket real-time updates
- Dashboard widget integration

### Manual Testing
- Live guiding session visualization
- Different guiding scenarios (good/poor seeing)
- Mobile device compatibility

## 📖 Documentation Requirements

### User Documentation
- Widget usage guide in README.md
- Guiding quality interpretation guide
- Troubleshooting common issues

### Developer Documentation
- API endpoint documentation
- Component architecture overview
- Chart.js configuration reference

---

**Next Steps**: 
1. Review and approve project plan
2. Begin Phase 1 implementation
3. Test with live NINA guiding data

*Created: September 1, 2025*  
*Author: AI Development Assistant*  
*Status: Ready for Development*
