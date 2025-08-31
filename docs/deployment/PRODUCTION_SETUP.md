# 🚀 Production Setup & Long-term Reliability Guide

**Last Updated**: August 31, 2025  
**Project**: NINA WebControlPanel v1.0.0

## 📋 Quick Start for Production Deployment

### **1. Validate System Configuration**
```powershell
# Run comprehensive system validation
npm run validate

# This checks:
# - Directory permissions and structure
# - Database connectivity and schema
# - Node.js dependencies
# - NINA API connection (with fallback)
# - Stream URL accessibility
```

### **2. Deploy to Production**
```powershell
# Full production deployment with build optimization
npm run deploy

# This automatically:
# - Validates configuration
# - Installs production dependencies
# - Builds React application for production
# - Configures production environment
# - Starts server with auto-restart process management
```

### **3. Monitor System Health**
```powershell
# Check deployment status
npm run status

# Start continuous health monitoring (optional)
npm run monitor

# Quick health check
npm run health
```

## 🔧 Production Management Commands

| Command | Purpose | Use Case |
|---------|---------|----------|
| `npm run deploy` | Full production deployment | Initial deployment |
| `npm run status` | Check production server status | Verify deployment health |
| `npm run restart` | Restart production server | After configuration changes |
| `npm run monitor` | Start real-time monitoring | Continuous health tracking |
| `npm run health` | Backend health check | Quick status verification |

## 🏗️ Architecture for Long-term Reliability

### **Process Management (Auto-Restart System)**
The ProcessManager provides enterprise-grade reliability:

```javascript
// Auto-restart on any crash with 5-second delay
if (code !== 0) { 
  setTimeout(() => this.startServer(), 5000); 
}
```

**Key Features:**
- **Automatic crash recovery** - Infinite restart attempts on failures
- **5-second restart delay** - Prevents rapid restart loops  
- **PID file management** - Clean process tracking and status monitoring
- **Graceful shutdown** - Proper cleanup on SIGINT/SIGTERM signals
- **Environment variables** - Full production environment propagation
- **Exit code monitoring** - Only restarts on unexpected failures (code !== 0)

**Production Commands:**
```powershell
npm run status    # Check if production server is running
npm run restart   # Gracefully restart production server  
npm run monitor   # Real-time health monitoring
```

### **Database Reliability**
- **SQLite WAL mode** for better concurrent access
- **Transaction safety** for all configuration updates
- **Automatic schema validation** and migration
- **Connection pooling** and timeout management
- **Backup monitoring** for target scheduler database

### **Resource Management**
- **Memory leak prevention** with event cache limits (1000 events max)
- **CPU optimization** with 2-second cache on expensive system calls
- **Disk space monitoring** with configurable thresholds
- **Network timeout handling** with retry mechanisms

### **Error Handling & Recovery**
- **Comprehensive error boundaries** in React components
- **WebSocket reconnection** with exponential backoff
- **API fallback systems** (mock data when services unavailable)
- **Database connection recovery** after temporary failures
- **Equipment status graceful degradation**

## 📊 Monitoring & Alerting

### **Health Monitor Features**
- **Real-time system metrics** (CPU, memory, disk, temperature)
- **Application performance monitoring** (response times, uptime)
- **Database health checks** (configuration and scheduler databases)
- **Network connectivity tests** (NINA API, stream URLs)
- **Overall health scoring** (0-100%) with issue categorization

### **Alert Thresholds** (Configurable)
- **CPU Usage**: >90% triggers critical alert
- **Memory Usage**: >85% triggers critical alert  
- **Disk Usage**: >90% triggers warning alert
- **Response Time**: >5 seconds triggers performance alert
- **Database Errors**: Any connectivity issue triggers immediate alert

### **Log Management**
- **Structured logging** with timestamp, level, and context
- **Daily log rotation** to prevent disk space issues
- **Health log format**: `timestamp | health_score | cpu | memory | status`
- **Error log aggregation** with stack traces and context
- **Performance log tracking** for optimization insights

## 🔒 Security & Best Practices

### **Production Security**
- **CORS configuration** for allowed origins only
- **Input validation** on all API endpoints
- **SQL injection prevention** with prepared statements
- **File system access controls** for database files
- **Environment variable management** for sensitive configuration

### **Network Security**
- **Firewall-friendly design** with configurable ports
- **HTTPS ready** (add reverse proxy like nginx for SSL)
- **WebSocket security** with origin validation
- **API rate limiting** ready for implementation
- **Authentication hooks** prepared for future implementation

## 🔄 Backup & Recovery Strategy

### **Configuration Backup**
```powershell
# Backup current configuration
cp src/server/dashboard-config.sqlite backups/config-$(Get-Date -Format "yyyy-MM-dd").sqlite

# Backup target scheduler database  
cp resources/schedulerdb.sqlite backups/scheduler-$(Get-Date -Format "yyyy-MM-dd").sqlite
```

### **Recovery Procedures**
1. **Database corruption**: Restore from latest backup, reinitialize if needed
2. **Configuration loss**: System automatically creates default configuration
3. **Process crash**: Auto-restart with health monitoring notifications
4. **Network isolation**: Graceful degradation with mock data display
5. **Hardware failure**: All critical data stored in SQLite files for easy migration

## 📈 Performance Optimization

### **Already Implemented**
- **React 18 concurrent features** for smooth UI updates
- **Component memoization** to prevent unnecessary re-renders  
- **API response caching** (2-second cache on system metrics)
- **WebSocket batching** for efficient real-time updates
- **Lazy loading** preparation for future enhancements

### **Scaling Recommendations**
- **Database indexing** on frequently queried columns
- **API pagination** for large image collections (when implemented)
- **CDN integration** for static assets in production
- **Load balancing** support for multiple observatory instances
- **Caching layer** (Redis) for high-traffic scenarios

## 🌐 Multi-Observatory Support (Future)

### **Current Architecture Readiness**
- **Configuration per instance** via database
- **WebSocket namespace support** for multiple NINA connections
- **Dynamic endpoint configuration** for different observatory IPs
- **Separate database connections** for each observatory
- **Widget isolation** for different observatory data

### **Implementation Path**
1. **Configuration enhancement**: Add observatory profiles to database
2. **Service abstraction**: Create observatory-specific service instances  
3. **UI adaptation**: Add observatory selector to dashboard
4. **Data separation**: Namespace WebSocket events and API responses
5. **Authentication layer**: Add user/observatory access control

## 🎯 Maintenance Schedule

### **Daily (Automated)**
- Health monitoring with alerts
- Log rotation and cleanup
- Performance metrics collection
- Database backup verification

### **Weekly**
- Review health monitor logs for trends
- Check disk space and system resources
- Validate all network connections
- Update configuration if needed

### **Monthly**
- Review performance metrics and optimize
- Update dependencies if security patches available
- Test disaster recovery procedures
- Analyze usage patterns for optimization

### **Quarterly**
- Full system validation and testing
- Update documentation
- Review and update alert thresholds
- Plan feature enhancements

## 🚨 Troubleshooting Guide

### **Common Issues & Solutions**

#### **"Server won't start"**
```powershell
# Check configuration
npm run validate

# Check port availability
netstat -ano | findstr :3001

# Check dependencies
npm install
cd src/client && npm install
```

#### **"WebSocket connection failed"**
- Verify NINA is running and accessible
- Check firewall settings for port 1888
- Confirm NINA WebSocket API is enabled
- Review network connectivity between machines

#### **"Database errors"**
```powershell
# Check database file permissions
Get-ChildItem src/server/dashboard-config.sqlite -Force

# Reinitialize database if corrupted
Remove-Item src/server/dashboard-config.sqlite
npm start  # Will recreate with defaults
```

#### **"High resource usage"**
- Review health monitor logs: `tail -f logs/health.log`
- Check for memory leaks in system monitor
- Verify WebSocket client cleanup
- Consider restarting application: `npm run restart`

#### **"NINA API not responding"**
- Application automatically falls back to mock data
- Check NINA service status on target machine
- Verify NINA Advanced API is enabled and configured
- Test direct API access: `curl http://nina-ip:1888/api/info`

## 🎉 Success Metrics

### **System Health Indicators**
- **Health Score**: >90% indicates excellent system performance
- **Uptime**: >99.5% availability target for production deployment
- **Response Time**: <1 second for all dashboard operations
- **Memory Usage**: <85% sustained memory usage
- **Error Rate**: <0.1% of all API requests should fail

### **User Experience Metrics**
- **Real-time Updates**: Sub-second latency for equipment changes
- **Mobile Responsiveness**: Full functionality on tablets and phones
- **Data Accuracy**: Cross-platform system monitoring with <5% variance
- **Feature Completeness**: All 9 core widgets operational with live data

---

**🌟 Your NINA WebControlPanel is now production-ready with enterprise-grade reliability features!**

*For support or enhancements, refer to the comprehensive documentation in the `docs/` directory.*
