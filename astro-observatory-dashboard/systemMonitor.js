// System Monitor Service - Cross-platform system health monitoring
const si = require('systeminformation');
const os = require('os');
const fs = require('fs');
const path = require('path');

class SystemMonitor {
  constructor() {
    this.startTime = Date.now();
    this.cachedData = {};
    this.cacheTimeout = 2000; // 2 second cache to avoid excessive system calls
  }

  // Get cached data or fetch fresh if expired
  async getCachedData(key, fetchFunction, timeout = this.cacheTimeout) {
    const now = Date.now();
    if (this.cachedData[key] && (now - this.cachedData[key].timestamp) < timeout) {
      return this.cachedData[key].data;
    }

    try {
      const data = await fetchFunction();
      this.cachedData[key] = { data, timestamp: now };
      return data;
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      return null;
    }
  }

  // Get system uptime and process uptime
  async getUptimeInfo() {
    return this.getCachedData('uptime', async () => {
      const systemUptime = os.uptime(); // in seconds
      const processUptime = process.uptime(); // in seconds
      
      return {
        system: {
          seconds: Math.floor(systemUptime),
          formatted: this.formatUptime(systemUptime)
        },
        process: {
          seconds: Math.floor(processUptime),
          formatted: this.formatUptime(processUptime)
        }
      };
    });
  }

  // Get CPU information and usage
  async getCPUInfo() {
    return this.getCachedData('cpu', async () => {
      const [cpuInfo, currentLoad] = await Promise.all([
        si.cpu(),
        si.currentLoad()
      ]);

      return {
        model: cpuInfo.manufacturer + ' ' + cpuInfo.brand,
        cores: cpuInfo.cores,
        physicalCores: cpuInfo.physicalCores,
        speed: cpuInfo.speed,
        usage: Math.round(currentLoad.currentLoad),
        temperature: await this.getCPUTemperature()
      };
    });
  }

  // Get memory information with platform-specific accuracy
  // Different OS platforms report memory usage differently:
  // - macOS: Uses complex memory management (active + wired + compressed + cache)
  // - Windows: Direct reporting is usually accurate
  // - Linux: Available memory provides better accuracy than raw used/free
  async getMemoryInfo() {
    return this.getCachedData('memory', async () => {
      const mem = await si.mem();
      const totalGB = mem.total / (1024 ** 3);
      const platform = process.platform;
      
      let usedGB, freeGB, usagePercent, availableGB;
      
      if (platform === 'darwin') {
        // macOS: Complex memory management requires hybrid calculation
        // Activity Monitor shows memory used = active + wired + compressed + some cache
        // systeminformation doesn't provide all these details, so we approximate
        
        availableGB = mem.available / (1024 ** 3);
        
        // Method: Use active memory as base and apply macOS-specific multiplier
        // This accounts for wired memory, compressed memory, and essential cache
        const activeGB = mem.active / (1024 ** 3);
        const macOSMultiplier = 3.2; // Empirically derived to match Activity Monitor
        
        usedGB = Math.min(activeGB * macOSMultiplier, totalGB * 0.95); // Cap at 95%
        freeGB = totalGB - usedGB;
        usagePercent = Math.round((usedGB / totalGB) * 100);
        
        // Alternative fallback: if active is too low, use total - available
        const alternativeUsed = totalGB - availableGB;
        if (alternativeUsed > usedGB && alternativeUsed < totalGB * 0.9) {
          usedGB = alternativeUsed;
          freeGB = availableGB;
          usagePercent = Math.round((usedGB / totalGB) * 100);
        }
        
      } else if (platform === 'win32') {
        // Windows: systeminformation provides reliable values
        // Use direct values as Windows memory reporting is typically accurate
        usedGB = mem.used / (1024 ** 3);
        freeGB = mem.free / (1024 ** 3);
        availableGB = mem.available / (1024 ** 3);
        usagePercent = Math.round((mem.used / mem.total) * 100);
        
      } else {
        // Linux/Unix: Use available memory for accuracy (similar to macOS)
        // Most Unix systems benefit from available memory calculation
        availableGB = mem.available / (1024 ** 3);
        usedGB = totalGB - availableGB;
        freeGB = availableGB;
        usagePercent = Math.round((usedGB / totalGB) * 100);
      }
      
      return {
        total: Math.round(totalGB * 100) / 100,
        used: Math.round(usedGB * 100) / 100,
        free: Math.round(freeGB * 100) / 100,
        usagePercent: Math.max(0, Math.min(100, usagePercent)), // Ensure 0-100 range
        available: Math.round(availableGB * 100) / 100,
        platform: platform // Include platform info for debugging
      };
    });
  }

  // Get disk space information
  async getDiskInfo() {
    return this.getCachedData('disk', async () => {
      const fsSize = await si.fsSize();
      const disks = fsSize.map(disk => {
        const totalGB = disk.size / (1024 ** 3);
        const usedGB = disk.used / (1024 ** 3);
        const freeGB = (disk.size - disk.used) / (1024 ** 3);
        
        return {
          filesystem: disk.fs,
          mount: disk.mount,
          type: disk.type,
          total: Math.round(totalGB * 100) / 100,
          used: Math.round(usedGB * 100) / 100,
          free: Math.round(freeGB * 100) / 100,
          usagePercent: Math.round(disk.use)
        };
      });
      
      // Return main system disk (usually the first or largest)
      const mainDisk = disks.find(d => d.mount === '/' || d.mount === 'C:') || disks[0];
      return {
        main: mainDisk,
        all: disks
      };
    });
  }

  // Get network information
  async getNetworkInfo() {
    return this.getCachedData('network', async () => {
      const [networkInterfaces, networkStats] = await Promise.all([
        si.networkInterfaces(),
        si.networkStats()
      ]);

      // Find active network interface
      const activeInterface = networkInterfaces.find(iface => 
        !iface.internal && iface.operstate === 'up' && iface.ip4
      ) || networkInterfaces[0];

      const activeStats = networkStats.find(stat => 
        stat.iface === activeInterface?.iface
      ) || networkStats[0];

      return {
        interface: activeInterface?.iface || 'Unknown',
        ip: activeInterface?.ip4 || 'N/A',
        mac: activeInterface?.mac || 'N/A',
        speed: activeInterface?.speed || 0,
        rx_bytes: activeStats?.rx_bytes || 0,
        tx_bytes: activeStats?.tx_bytes || 0,
        rx_sec: activeStats?.rx_sec || 0,
        tx_sec: activeStats?.tx_sec || 0
      };
    });
  }

  // Get CPU temperature (if available)
  async getCPUTemperature() {
    try {
      const temp = await si.cpuTemperature();
      return temp.main ? Math.round(temp.main) : null;
    } catch (error) {
      return null; // Temperature monitoring not available on all systems
    }
  }

  // Get operating system information
  async getOSInfo() {
    return this.getCachedData('os', async () => {
      const osInfo = await si.osInfo();
      return {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
        hostname: osInfo.hostname,
        kernel: osInfo.kernel
      };
    }, 60000); // Cache OS info for 1 minute as it rarely changes
  }

  // Get process information
  async getProcessInfo() {
    return this.getCachedData('process', async () => {
      const processes = await si.processes();
      const nodeProcesses = processes.list.filter(p => 
        p.name.toLowerCase().includes('node') || 
        p.command.toLowerCase().includes('node')
      );

      return {
        total: processes.all,
        running: processes.running,
        sleeping: processes.sleeping,
        node_processes: nodeProcesses.length,
        memory_usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) // MB
      };
    });
  }

  // Format uptime to human readable format
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Get comprehensive system status
  async getSystemStatus() {
    try {
      const [uptime, cpu, memory, disk, network, os, process] = await Promise.all([
        this.getUptimeInfo(),
        this.getCPUInfo(),
        this.getMemoryInfo(),
        this.getDiskInfo(),
        this.getNetworkInfo(),
        this.getOSInfo(),
        this.getProcessInfo()
      ]);

      return {
        timestamp: new Date().toISOString(),
        uptime,
        cpu,
        memory,
        disk,
        network,
        os,
        process,
        status: this.getOverallHealth(cpu, memory, disk)
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      throw error;
    }
  }

  // Determine overall system health
  getOverallHealth(cpu, memory, disk) {
    const warnings = [];
    let status = 'healthy';

    // Check CPU usage
    if (cpu.usage > 90) {
      warnings.push('High CPU usage');
      status = 'warning';
    } else if (cpu.usage > 95) {
      status = 'critical';
    }

    // Check memory usage
    if (memory.usagePercent > 85) {
      warnings.push('High memory usage');
      status = 'warning';
    } else if (memory.usagePercent > 95) {
      status = 'critical';
    }

    // Check disk space
    if (disk.main && disk.main.usagePercent > 85) {
      warnings.push('Low disk space');
      status = 'warning';
    } else if (disk.main && disk.main.usagePercent > 95) {
      status = 'critical';
    }

    // Check CPU temperature
    if (cpu.temperature && cpu.temperature > 80) {
      warnings.push('High CPU temperature');
      status = 'warning';
    } else if (cpu.temperature && cpu.temperature > 90) {
      status = 'critical';
    }

    return { status, warnings };
  }
}

module.exports = SystemMonitor;
