// Target Scheduler Service for NINA Target Scheduler Database Integration
// Provides read-only access to schedulerdb.sqlite for dashboard monitoring

const Database = require('better-sqlite3');
const path = require('path');

class TargetSchedulerService {
  constructor(dbPath) {
    this.dbPath = null;
    this.db = null;
    this.connected = false;

    if (dbPath) {
      this.initialize(dbPath);
    } else {
      console.log('⚠️ Target Scheduler Service created without database path - will initialize later');
    }
  }

  initialize(dbPath) {
    try {
      this.dbPath = path.resolve(dbPath);
      console.log(`🔍 Attempting to connect to Target Scheduler database: ${this.dbPath}`);

      // Check if file exists
      if (!require('fs').existsSync(this.dbPath)) {
        console.warn(`⚠️ Target Scheduler database file not found: ${this.dbPath}`);
        console.warn(`⚠️ Scheduler features will be unavailable until database is configured`);
        this.connected = false;
        return false;
      }

      // Try to open database with WAL mode disabled initially
      this.db = new Database(this.dbPath, {
        readonly: true,
        fileMustExist: true
      });

      // Test the connection
      this.db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' LIMIT 1').get();

      console.log(`📊 Target Scheduler database connected successfully: ${this.dbPath}`);
      this.connected = true;
      return true;
    } catch (error) {
      console.error('Failed to connect to Target Scheduler database:', error.message);
      console.warn('⚠️ Scheduler features will be unavailable until database is configured');
      this.connected = false;
      return false;
    }
  }

  // Check if service is connected to database
  isConnected() {
    return this.connected && this.db !== null;
  }

  // Get comprehensive project progress with targets and filters
  getProjectProgress() {
    if (!this.isConnected()) {
      console.warn('⚠️ Target Scheduler database not connected');
      return [];
    }

    try {
      const query = `
        SELECT 
          p.Id as id,
          p.name,
          p.description,
          p.priority,
          p.state,
          p.createdate,
          p.activedate,
          COUNT(DISTINCT t.Id) as target_count,
          SUM(ep.acquired) as total_acquired,
          SUM(ep.accepted) as total_accepted,
          SUM(ep.desired) as total_desired,
          CASE 
            WHEN SUM(ep.desired) > 0 THEN 
              MIN(100.0, ((SUM(ep.acquired) + SUM(ep.accepted)) * 100.0) / (SUM(ep.desired) * 2.0))
            ELSE 0 
          END as completion_percentage
        FROM project p
        LEFT JOIN target t ON p.Id = t.projectid AND t.active = 1
        LEFT JOIN exposureplan ep ON t.Id = ep.targetid AND ep.enabled = 1
        LEFT JOIN exposuretemplate et ON ep.exposureTemplateId = et.Id
        WHERE p.state = 1 AND (ep.id IS NULL OR et.Id IS NOT NULL)
        GROUP BY p.Id
        ORDER BY p.priority DESC, completion_percentage DESC, p.name
      `;

      const projects = this.db.prepare(query).all();

      return projects.map(project => {
        const targets = this.getProjectTargets(project.id);

        // Get last activity timestamp separately to avoid JOIN issues
        const lastActivityQuery = `
          SELECT MAX(ai.acquireddate) as last_activity_timestamp
          FROM acquiredimage ai
          WHERE ai.projectId = ?
        `;
        const lastActivityResult = this.db.prepare(lastActivityQuery).get(project.id);

        // Calculate overall completion - give credit for acquired images + full credit for accepted images
        // Formula: (acquired + accepted) / (desired * 2) * 100, capped at 100%
        // This rewards capture progress even before grading is complete
        const totalCompletion = project.total_desired > 0
          ? Math.min(100, Math.round(((project.total_acquired + project.total_accepted) / (project.total_desired * 2)) * 100 * 10) / 10)
          : 0;

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          priority: project.priority,
          state: project.state,
          targets: targets,
          totalImages: project.total_acquired || 0,
          totalCompletion: totalCompletion,
          lastActivity: lastActivityResult?.last_activity_timestamp ? new Date(lastActivityResult.last_activity_timestamp * 1000).toISOString() : null
        };
      });
    } catch (error) {
      console.error('Error getting project progress:', error);
      return [];
    }
  }

  // Get targets for a specific project with filter progress
  getProjectTargets(projectId) {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const targetQuery = `
        SELECT 
          t.Id as id,
          t.name,
          t.ra,
          t.dec,
          t.rotation,
          t.roi,
          t.active
        FROM target t
        WHERE t.projectid = ? AND t.active = 1
        ORDER BY t.name
      `;

      const targets = this.db.prepare(targetQuery).all(projectId);

      return targets.map(target => {
        const filters = this.getTargetFilters(target.id);

        // Calculate target completion - give credit for acquired images + full credit for accepted images  
        // Formula: (acquired + accepted) / (desired * 2) * 100, capped at 100%
        const totalDesired = filters.reduce((sum, f) => sum + f.desired, 0);
        const totalAcquired = filters.reduce((sum, f) => sum + f.acquired, 0);
        const totalAccepted = filters.reduce((sum, f) => sum + f.accepted, 0);
        const totalCompletion = totalDesired > 0
          ? Math.min(100, Math.round(((totalAcquired + totalAccepted) / (totalDesired * 2)) * 100 * 10) / 10)
          : 0;

        return {
          id: target.id,
          name: target.name,
          ra: target.ra,
          dec: target.dec,
          rotation: target.rotation,
          roi: target.roi,
          filters: filters,
          totalCompletion: totalCompletion
        };
      });
    } catch (error) {
      console.error('Error getting project targets:', error);
      return [];
    }
  }

  // Get filter progress for a specific target
  getTargetFilters(targetId) {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const filterQuery = `
        SELECT 
          et.filtername,
          ep.exposure,
          ep.desired,
          ep.acquired,
          ep.accepted,
          ep.enabled,
          et.defaultexposure,
          et.moonavoidanceseparation,
          et.maximumhumidity
        FROM exposureplan ep
        JOIN exposuretemplate et ON ep.exposureTemplateId = et.Id
        WHERE ep.targetid = ? AND ep.enabled = 1
        ORDER BY et.filtername
      `;

      const filters = this.db.prepare(filterQuery).all(targetId);

      return filters.map(filter => {
        const exposureTime = filter.exposure !== -1 ? filter.exposure : filter.defaultexposure;
        const desiredIntegrationTime = (filter.desired || 0) * exposureTime;
        const acquiredIntegrationTime = (filter.acquired || 0) * exposureTime;
        const acceptedIntegrationTime = (filter.accepted || 0) * exposureTime;
        const remainingImages = Math.max(0, (filter.desired || 0) - (filter.accepted || 0));
        const remainingIntegrationTime = remainingImages * exposureTime;

        return {
          filtername: filter.filtername,
          desired: filter.desired || 0,
          acquired: filter.acquired || 0,
          accepted: filter.accepted || 0,
          // Updated completion calculation: (acquired + accepted) / (desired * 2) * 100, capped at 100%
          // This gives partial credit for captured images before grading
          completion: filter.desired > 0 ? Math.min(100, Math.round(((filter.acquired + filter.accepted) / (filter.desired * 2)) * 100)) : 0,
          exposureTime: exposureTime,
          desiredIntegrationTime: desiredIntegrationTime,
          acquiredIntegrationTime: acquiredIntegrationTime,
          acceptedIntegrationTime: acceptedIntegrationTime,
          remainingImages: remainingImages,
          remainingIntegrationTime: remainingIntegrationTime,
          moonAvoidance: filter.moonavoidanceseparation,
          humidityLimit: filter.maximumhumidity
        };
      });
    } catch (error) {
      console.error('Error getting target filters:', error);
      return [];
    }
  }

  // Get detailed information for a specific project
  getProjectDetails(projectId) {
    if (!this.isConnected()) {
      return null;
    }

    try {
      const projectQuery = `
        SELECT 
          p.*,
          COUNT(DISTINCT t.Id) as target_count,
          SUM(ep.acquired) as total_acquired,
          SUM(ep.accepted) as total_accepted,
          SUM(ep.desired) as total_desired
        FROM project p
        LEFT JOIN target t ON p.Id = t.projectid
        LEFT JOIN exposureplan ep ON t.Id = ep.targetid
        WHERE p.Id = ?
        GROUP BY p.Id
      `;

      const project = this.db.prepare(projectQuery).get(projectId);
      if (!project) return null;

      const targets = this.getProjectTargets(projectId);
      const recentImages = this.getProjectRecentImages(projectId, 10);

      return {
        ...project,
        targets: targets,
        recentImages: recentImages,
        // Updated completion calculation: (acquired + accepted) / (desired * 2) * 100, capped at 100%
        totalCompletion: project.total_desired > 0
          ? Math.min(100, Math.round(((project.total_acquired + project.total_accepted) / (project.total_desired * 2)) * 100 * 10) / 10)
          : 0
      };
    } catch (error) {
      console.error('Error getting project details:', error);
      return null;
    }
  }

  // Get current scheduler status (most recent activity)
  getSchedulerStatus() {
    if (!this.isConnected()) {
      return {
        currentTarget: null,
        nextTarget: null,
        timestamp: new Date().toISOString(),
        error: 'Database not connected'
      };
    }

    try {
      const statusQuery = `
        SELECT 
          p.name as current_project,
          t.name as current_target,
          ai.filtername as current_filter,
          ai.acquireddate,
          COUNT(*) as images_tonight
        FROM acquiredimage ai
        JOIN project p ON ai.projectId = p.Id
        JOIN target t ON ai.targetId = t.Id
        WHERE DATE(ai.acquireddate, 'unixepoch') = DATE('now')
        GROUP BY p.Id, t.Id, ai.filtername
        ORDER BY ai.acquireddate DESC
        LIMIT 1
      `;

      const current = this.db.prepare(statusQuery).get();

      // Get next likely target based on priority and completion
      const nextTargetQuery = `
        SELECT 
          p.name as project_name,
          t.name as target_name,
          p.priority,
          COUNT(ep.id) as incomplete_plans
        FROM project p
        JOIN target t ON p.Id = t.projectid
        JOIN exposureplan ep ON t.Id = ep.targetid
        WHERE p.state = 1 AND t.active = 1 AND ep.enabled = 1 
          AND ep.accepted < ep.desired
        GROUP BY p.Id, t.Id
        ORDER BY p.priority DESC, incomplete_plans DESC
        LIMIT 1
      `;

      const next = this.db.prepare(nextTargetQuery).get();

      return {
        currentTarget: current ? {
          project: current.current_project,
          target: current.current_target,
          filter: current.current_filter,
          lastActivity: new Date(current.acquireddate * 1000).toISOString(),
          imagesTonight: current.images_tonight
        } : null,
        nextTarget: next ? {
          project: next.project_name,
          target: next.target_name,
          priority: next.priority,
          incompletePlans: next.incomplete_plans
        } : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting scheduler status:', error);
      return { currentTarget: null, nextTarget: null, timestamp: new Date().toISOString() };
    }
  }

  // Get recent imaging activity
  getRecentActivity(days = 7) {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const activityQuery = `
        SELECT 
          DATE(ai.acquireddate, 'unixepoch') as date,
          p.name as project,
          t.name as target,
          ai.filtername,
          COUNT(*) as image_count,
          ai.gradingStatus
        FROM acquiredimage ai
        JOIN project p ON ai.projectId = p.Id
        JOIN target t ON ai.targetId = t.Id
        WHERE ai.acquireddate > strftime('%s', 'now', '-${days} days')
        GROUP BY DATE(ai.acquireddate, 'unixepoch'), p.Id, t.Id, ai.filtername
        ORDER BY ai.acquireddate DESC
      `;

      const activity = this.db.prepare(activityQuery).all();

      return activity.map(row => ({
        date: row.date,
        project: row.project,
        target: row.target,
        filter: row.filtername,
        imageCount: row.image_count,
        gradingStatus: row.gradingStatus
      }));
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  // Get recent images for a specific project
  getProjectRecentImages(projectId, limit = 10) {
    if (!this.isConnected()) {
      return [];
    }

    try {
      const imagesQuery = `
        SELECT 
          ai.Id as id,
          ai.acquireddate,
          ai.filtername,
          ai.gradingStatus,
          t.name as target_name
        FROM acquiredimage ai
        JOIN target t ON ai.targetId = t.Id
        WHERE ai.projectId = ?
        ORDER BY ai.acquireddate DESC
        LIMIT ?
      `;

      const images = this.db.prepare(imagesQuery).all(projectId, limit);

      return images.map(img => ({
        id: img.id,
        timestamp: new Date(img.acquireddate * 1000).toISOString(),
        filter: img.filtername,
        target: img.target_name,
        gradingStatus: img.gradingStatus
      }));
    } catch (error) {
      console.error('Error getting project recent images:', error);
      return [];
    }
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      console.log('🔒 Target Scheduler database connection closed');
    }
  }
}

// Factory function to create database instance
function getTargetSchedulerDatabase(dbPath) {
  return new TargetSchedulerService(dbPath);
}

module.exports = { TargetSchedulerService, getTargetSchedulerDatabase };
