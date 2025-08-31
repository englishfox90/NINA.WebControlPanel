// Dashboard widget management API routes
const express = require('express');

class DashboardRoutes {
  constructor(configDatabase) {
    this.configDatabase = configDatabase;
  }

  register(app) {
    // Get dashboard widgets configuration
    app.get('/api/dashboard-widgets', (req, res) => {
      try {
        const widgets = this.configDatabase.getWidgets();
        res.json(widgets);
      } catch (error) {
        console.error('Error getting widgets:', error);
        res.status(500).json({ error: 'Failed to get widgets' });
      }
    });

    // Add new widget
    app.post('/api/dashboard-widgets', (req, res) => {
      try {
        const widget = req.body;
        this.configDatabase.addWidget(widget);
        res.json({ success: true, id: widget.id });
      } catch (error) {
        console.error('Error adding widget:', error);
        res.status(500).json({ error: 'Failed to add widget' });
      }
    });

    // Bulk widget layout update for drag-and-drop operations (MUST be before /:id route)
    app.put('/api/dashboard-widgets/layout', (req, res) => {
      try {
        const { widgets } = req.body;
        
        if (!widgets || !Array.isArray(widgets)) {
          return res.status(400).json({ error: 'Invalid request: widgets array is required' });
        }
        
        // Update each widget's position
        for (const widget of widgets) {
          if (widget.layout && widget.id) {
            this.configDatabase.updateWidget(widget.id, {
              x: widget.layout.x,
              y: widget.layout.y,
              w: widget.layout.w,
              h: widget.layout.h
            });
          }
        }
        
        res.json({ success: true, updated: widgets.length });
      } catch (error) {
        console.error('Error updating widget layout:', error);
        res.status(500).json({ error: 'Failed to update widget layout' });
      }
    });

    // Update individual widget configuration
    app.put('/api/dashboard-widgets/:id', (req, res) => {
      try {
        const id = req.params.id;
        const updates = req.body;
        
        // Validate and filter the updates to only include valid database columns
        const validUpdates = {};
        const allowedFields = ['component', 'title', 'x', 'y', 'w', 'h', 'minW', 'minH', 'enabled'];
        
        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            validUpdates[field] = updates[field];
          }
        }
        
        // Handle layout updates (if the updates contain a layout object)
        if (updates.layout) {
          if (updates.layout.x !== undefined) validUpdates.x = updates.layout.x;
          if (updates.layout.y !== undefined) validUpdates.y = updates.layout.y;
          if (updates.layout.w !== undefined) validUpdates.w = updates.layout.w;
          if (updates.layout.h !== undefined) validUpdates.h = updates.layout.h;
          if (updates.layout.minW !== undefined) validUpdates.minW = updates.layout.minW;
          if (updates.layout.minH !== undefined) validUpdates.minH = updates.layout.minH;
        }
        
        if (Object.keys(validUpdates).length === 0) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        this.configDatabase.updateWidget(id, validUpdates);
        res.json({ success: true });
      } catch (error) {
        console.error('Error updating widget:', error);
        res.status(500).json({ error: 'Failed to update widget' });
      }
    });

    // Delete widget
    app.delete('/api/dashboard-widgets/:id', (req, res) => {
      try {
        const id = req.params.id;
        this.configDatabase.removeWidget(id);
        res.json({ success: true });
      } catch (error) {
        console.error('Error removing widget:', error);
        res.status(500).json({ error: 'Failed to remove widget' });
      }
    });
  }
}

module.exports = DashboardRoutes;
