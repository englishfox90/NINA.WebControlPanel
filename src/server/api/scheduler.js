// Target scheduler API routes
const express = require('express');

class SchedulerRoutes {
  constructor(targetSchedulerDb) {
    this.targetSchedulerDb = targetSchedulerDb;
  }

  register(app) {
    // Get project progress overview
    app.get('/api/scheduler/progress', async (req, res) => {
      try {
        if (!this.targetSchedulerDb) {
          return res.status(503).json({ error: 'Target Scheduler database not available' });
        }

        const projects = this.targetSchedulerDb.getProjectProgress();

        // Get current session target to determine which project is currently active
        let currentTargetName = null;
        try {
          const sessionStateManager = req.app.locals.sessionStateManager;
          if (sessionStateManager) {
            const sessionState = sessionStateManager.getSessionState(); // Fix: use correct method name
            currentTargetName = sessionState?.target?.name ||
              sessionState?.target?.TargetName;
          }
        } catch (error) {
          console.log('Could not determine current target from session:', error.message);
        }

        // Mark project as currently active if its target matches the current session target
        const enhancedProjects = projects.map(project => ({
          ...project,
          isCurrentlyActive: currentTargetName &&
            project.targets?.some(target =>
              target.name === currentTargetName ||
              target.name === currentTargetName?.trim()
            )
        }));

        // Sort projects: currently active first, then by priority, then by completion
        enhancedProjects.sort((a, b) => {
          if (a.isCurrentlyActive && !b.isCurrentlyActive) return -1;
          if (!a.isCurrentlyActive && b.isCurrentlyActive) return 1;
          if (b.priority !== a.priority) return b.priority - a.priority;
          return b.totalCompletion - a.totalCompletion;
        });

        res.json({
          projects: enhancedProjects,
          lastUpdate: new Date().toISOString(),
          totalProjects: enhancedProjects.length,
          activeProjects: enhancedProjects.filter(p => p.state === 1).length,
          currentTarget: currentTargetName
        });
      } catch (error) {
        console.error('Error getting scheduler progress:', error);
        res.status(500).json({ error: 'Failed to get scheduler progress' });
      }
    });

    // Get detailed project information
    app.get('/api/scheduler/project/:id', async (req, res) => {
      try {
        if (!this.targetSchedulerDb) {
          return res.status(503).json({ error: 'Target Scheduler database not available' });
        }

        const projectId = parseInt(req.params.id);
        const project = this.targetSchedulerDb.getProjectDetails(projectId);

        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
      } catch (error) {
        console.error('Error getting project details:', error);
        res.status(500).json({ error: 'Failed to get project details' });
      }
    });

    // Get scheduler status (current/next target)
    app.get('/api/scheduler/status', async (req, res) => {
      try {
        if (!this.targetSchedulerDb) {
          return res.status(503).json({ error: 'Target Scheduler database not available' });
        }

        const status = this.targetSchedulerDb.getSchedulerStatus();
        res.json(status);
      } catch (error) {
        console.error('Error getting scheduler status:', error);
        res.status(500).json({ error: 'Failed to get scheduler status' });
      }
    });

    // Get recent imaging activity
    app.get('/api/scheduler/activity', async (req, res) => {
      try {
        if (!this.targetSchedulerDb) {
          return res.status(503).json({ error: 'Target Scheduler database not available' });
        }

        const days = parseInt(req.query.days) || 7;
        const activity = this.targetSchedulerDb.getRecentActivity(days);
        res.json({ activity, days });
      } catch (error) {
        console.error('Error getting scheduler activity:', error);
        res.status(500).json({ error: 'Failed to get scheduler activity' });
      }
    });

    // Check if scheduler database file exists
    app.post('/api/scheduler/check-file', async (req, res) => {
      try {
        const { path } = req.body;

        if (!path) {
          return res.status(400).json({
            exists: false,
            message: 'Path is required'
          });
        }

        const fs = require('fs');
        const pathModule = require('path');

        // Resolve environment variables (Windows)
        let resolvedPath = path;
        if (process.platform === 'win32') {
          resolvedPath = path.replace(/%([^%]+)%/g, (_, variable) => {
            return process.env[variable] || `%${variable}%`;
          });
        }

        // Check if file exists
        const fileExists = fs.existsSync(resolvedPath);

        res.json({
          exists: fileExists,
          message: fileExists
            ? 'Database file found successfully'
            : 'Database file not found at the specified path',
          resolvedPath: fileExists ? resolvedPath : undefined
        });
      } catch (error) {
        console.error('Error checking scheduler file:', error);
        res.status(500).json({
          exists: false,
          message: 'Error checking file: ' + error.message
        });
      }
    });
  }
}

module.exports = SchedulerRoutes;
