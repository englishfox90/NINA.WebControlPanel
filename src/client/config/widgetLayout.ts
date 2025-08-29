import { Layout } from 'react-grid-layout';

export interface WidgetConfig {
  id: string;
  component: string;
  title: string;
  layout: {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
  };
}

// Default widget layout configuration
// Grid is 12 columns wide, each unit is ~95px wide
// Height units are ~30px each
export const defaultWidgetLayout: WidgetConfig[] = [
  {
    id: 'nina-status',
    component: 'NINAStatus',
    title: 'Equipment Status',
    layout: {
      i: 'nina-status',
      x: 0,
      y: 0,
      w: 4,  // ~380px wide
      h: 12, // ~360px tall
      minW: 3,
      minH: 8
    }
  },
  {
    id: 'system-status',
    component: 'SystemStatusWidget',
    title: 'System Monitor',
    layout: {
      i: 'system-status',
      x: 4,
      y: 0,
      w: 4,  // ~380px wide
      h: 8,  // ~240px tall
      minW: 3,
      minH: 6
    }
  },
  {
    id: 'rtsp-viewer',
    component: 'RTSPViewer',
    title: 'Live View',
    layout: {
      i: 'rtsp-viewer',
      x: 8,
      y: 0,
      w: 4,  // ~380px wide
      h: 10, // ~300px tall
      minW: 3,
      minH: 8
    }
  },
  {
    id: 'scheduler',
    component: 'SchedulerWidget',
    title: 'Target Scheduler',
    layout: {
      i: 'scheduler',
      x: 0,
      y: 12,
      w: 6,  // ~570px wide
      h: 10, // ~300px tall
      minW: 4,
      minH: 8
    }
  }
];

// Helper function to extract just the layout data for react-grid-layout
export const getGridLayout = (config: WidgetConfig[]): Layout[] => {
  return config.map(widget => widget.layout);
};

// Grid layout settings
export const gridLayoutProps = {
  className: "layout",
  cols: 12,
  rowHeight: 30,
  width: 1200, // This will be overridden by responsive behavior
  compactType: null as null, // Disable auto-compacting
  preventCollision: false,
  useCSSTransforms: true,
  draggableCancel: '.non-draggable',
  draggableHandle: '.drag-handle'
};

// Responsive breakpoints
export const responsiveProps = {
  breakpoints: {
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
    xxs: 0
  },
  cols: {
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2
  }
};
