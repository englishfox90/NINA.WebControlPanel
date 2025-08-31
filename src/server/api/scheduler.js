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
        
        res.json({
          projects: projects,
          lastUpdate: new Date().toISOString(),
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.state === 1).length
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
  }
}

module.exports = SchedulerRoutes;
