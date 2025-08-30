// Widget Service - Manages widgets using the dashboard_widgets table
import { API_BASE_URL } from '../config/api';

interface WidgetLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface WidgetConfig {
  id: string;
  component: string;
  title: string;
  layout: WidgetLayout;
}

interface WidgetResponse {
  success: boolean;
  id?: string;
  message?: string;
  error?: string;
}

const API_BASE = API_BASE_URL + '/api';

export class WidgetService {
  /**
   * Load all widgets from the dashboard_widgets table
   */
  static async loadWidgets(): Promise<WidgetConfig[]> {
    try {
      const response = await fetch(`${API_BASE}/dashboard-widgets`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const widgets: WidgetConfig[] = await response.json();
      return widgets;
    } catch (error) {
      console.error('Failed to load widgets from API:', error);
      throw error;
    }
  }

  /**
   * Save widget layout changes (for drag-and-drop operations)
   */
  static async saveWidgetLayout(widgets: WidgetConfig[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/dashboard-widgets/layout`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ widgets }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: WidgetResponse = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to save widget layout');
      }
    } catch (error) {
      console.error('Failed to save widget layout to API:', error);
      throw error;
    }
  }

  /**
   * Add a new widget
   */
  static async addWidget(widget: WidgetConfig): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/dashboard-widgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: widget.id,
          component: widget.component,
          title: widget.title,
          x: widget.layout.x,
          y: widget.layout.y,
          w: widget.layout.w,
          h: widget.layout.h,
          minW: widget.layout.minW,
          minH: widget.layout.minH
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: WidgetResponse = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to add widget');
      }

      return result.id || widget.id;
    } catch (error) {
      console.error('Failed to add widget:', error);
      throw error;
    }
  }

  /**
   * Update an existing widget
   */
  static async updateWidget(id: string, updates: Partial<WidgetConfig>): Promise<void> {
    try {
      const updateData: any = {};
      
      if (updates.title) updateData.title = updates.title;
      if (updates.component) updateData.component = updates.component;
      if (updates.layout) {
        updateData.x = updates.layout.x;
        updateData.y = updates.layout.y;
        updateData.w = updates.layout.w;
        updateData.h = updates.layout.h;
        if (updates.layout.minW !== undefined) updateData.minW = updates.layout.minW;
        if (updates.layout.minH !== undefined) updateData.minH = updates.layout.minH;
      }

      const response = await fetch(`${API_BASE}/dashboard-widgets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: WidgetResponse = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to update widget');
      }
    } catch (error) {
      console.error('Failed to update widget:', error);
      throw error;
    }
  }

  /**
   * Remove a widget
   */
  static async removeWidget(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/dashboard-widgets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: WidgetResponse = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to remove widget');
      }
    } catch (error) {
      console.error('Failed to remove widget:', error);
      throw error;
    }
  }

  /**
   * Debounced save function to avoid excessive API calls during drag operations
   */
  private static saveTimeout: NodeJS.Timeout | null = null;
  
  static debouncedSave(widgets: WidgetConfig[], delay: number = 1000): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(async () => {
      try {
        await this.saveWidgetLayout(widgets);
        console.log('Widget layout saved successfully');
      } catch (error) {
        console.error('Failed to save widget layout:', error);
      }
    }, delay);
  }
}

export default WidgetService;
