#!/usr/bin/env node

// Windows-Safe Production Deployment Script for NINA WebControlPanel
// Handles locked native modules and Windows-specific deployment issues

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

class WindowsSafeDeployment {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../');
    this.buildDir = path.join(this.projectRoot, 'build');
    this.logsDir = path.join(this.projectRoot, 'logs');
    this.backupDir = path.join(this.projectRoot, 'backups', 'deployment');
  }

  async deploy() {
    console.log('🚀 Starting Windows-Safe Production Deployment for NINA WebControlPanel');
    console.log('====================================================================');

    try {
      // Step 1: Stop all services gracefully
      await this.stopServices();
      
      // Step 2: Wait for file handles to release
      await this.waitForFileRelease();
      
      // Step 3: Clean deployment with backup
      await this.safeCleanInstall();
      
      // Step 4: Build production assets
      await this.buildProduction();
      
      // Step 5: Start services
      await this.startServices();
      
      console.log('🎉 Production deployment completed successfully!');
      console.log('📊 Dashboard available at: http://localhost:3001');
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      console.log('\n🔧 Attempting recovery...');
      await this.recoverFromFailure();
      process.exit(1);
    }
  }

  async stopServices() {
    console.log('⏹️ Step 1: Stopping services gracefully...');
    
    try {
      // Try to stop via npm script first
      await this.runCommand('npm run stop', this.projectRoot, { ignoreErrors: true });
      console.log('   ✅ Services stopped via npm script');
    } catch (error) {
      console.log('   ⚠️ npm run stop failed, trying manual cleanup...');
    }

    // Wait for processes to terminate
    console.log('   ⏳ Waiting 5 seconds for processes to terminate...');
    await this.sleep(5000);

    // Check for remaining processes
    try {
      const { stdout } = await execAsync('tasklist /fi "imagename eq node.exe" /fo csv', { encoding: 'utf8' });
      const processes = stdout.split('\n').filter(line => line.includes('node.exe'));
      
      if (processes.length > 1) { // Header + at least one process
        console.log(`   ⚠️ Found ${processes.length - 1} remaining Node.js processes`);
        console.log('   💡 These will be handled by file release detection');
      } else {
        console.log('   ✅ All Node.js processes terminated');
      }
    } catch (error) {
      // Tasklist command failed, continue anyway
      console.log('   ℹ️ Could not check process status, continuing...');
    }
  }

  async waitForFileRelease() {
    console.log('⏳ Step 2: Waiting for native modules to be released...');
    
    const sqliteModulePath = path.join(this.projectRoot, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
    
    if (!fs.existsSync(sqliteModulePath)) {
      console.log('   ✅ SQLite module not found, skipping file release check');
      return;
    }

    let attempts = 0;
    const maxAttempts = 12; // 60 seconds total
    
    while (attempts < maxAttempts) {
      try {
        // Try to rename the file to test if it's locked
        const testPath = sqliteModulePath + '.test';
        fs.renameSync(sqliteModulePath, testPath);
        fs.renameSync(testPath, sqliteModulePath);
        
        console.log('   ✅ Native modules released successfully');
        return;
      } catch (error) {
        attempts++;
        console.log(`   ⏳ Attempt ${attempts}/${maxAttempts}: Native modules still locked, waiting...`);
        await this.sleep(5000);
      }
    }

    console.log('   ⚠️ Native modules may still be locked, proceeding with backup strategy');
  }

  async safeCleanInstall() {
    console.log('🧹 Step 3: Performing safe clean installation...');
    
    // Create backup of critical files
    await this.createBackup();
    
    try {
      // Try standard npm install first
      console.log('   📦 Attempting standard dependency installation...');
      await this.runCommand('npm install --omit=dev', this.projectRoot);
      console.log('   ✅ Standard installation successful');
      
    } catch (error) {
      console.log('   ⚠️ Standard installation failed, using alternative approach...');
      await this.alternativeInstall();
    }

    // Install client dependencies
    console.log('   📦 Installing client dependencies...');
    await this.runCommand('npm install', path.join(this.projectRoot, 'src/client'));
    console.log('   ✅ Client dependencies installed');
  }

  async alternativeInstall() {
    console.log('   🔄 Using alternative installation strategy...');
    
    // Remove only specific problematic modules
    const problematicModules = ['better-sqlite3'];
    
    for (const module of problematicModules) {
      const modulePath = path.join(this.projectRoot, 'node_modules', module);
      if (fs.existsSync(modulePath)) {
        try {
          console.log(`   🗑️ Removing ${module} module...`);
          await this.forceRemoveDirectory(modulePath);
          console.log(`   ✅ ${module} module removed`);
        } catch (error) {
          console.log(`   ⚠️ Could not remove ${module}, will reinstall over it`);
        }
      }
    }

    // Reinstall with force
    console.log('   📦 Force reinstalling dependencies...');
    await this.runCommand('npm install --force --omit=dev', this.projectRoot);
    console.log('   ✅ Alternative installation completed');
  }

  async buildProduction() {
    console.log('🏗️ Step 4: Building production assets...');
    
    // Clean previous builds
    if (fs.existsSync(this.buildDir)) {
      console.log('   🧹 Cleaning previous build...');
      fs.rmSync(this.buildDir, { recursive: true });
    }

    // Build React application
    console.log('   ⚛️ Building React application...');
    await this.runCommand('npm run build', path.join(this.projectRoot, 'src/client'));
    
    // Move build to project root
    const clientBuildDir = path.join(this.projectRoot, 'src/client/build');
    if (fs.existsSync(clientBuildDir)) {
      fs.renameSync(clientBuildDir, this.buildDir);
      console.log('   ✅ React build completed and moved to project root');
    } else {
      throw new Error('React build directory not found');
    }
  }

  async startServices() {
    console.log('🚀 Step 5: Starting production services...');
    
    // Start the production server using spawn for better control
    try {
      const { spawn } = require('child_process');
      const serverProcess = spawn('node', ['scripts/deployment/process-manager.js', 'start'], {
        cwd: this.projectRoot,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
      });
      
      serverProcess.unref(); // Allow parent to exit
      console.log('   ✅ Production server started successfully');
      
      // Wait a moment for startup
      await this.sleep(5000);
      
      // Test the service
      try {
        const { stdout } = await execAsync('curl -f http://localhost:3001/api/config', { timeout: 10000 });
        console.log('   ✅ Health check passed - service is running');
      } catch (error) {
        console.log('   ⚠️ Health check failed, but service may still be starting...');
      }
    } catch (error) {
      console.log('   ❌ Failed to start production server:', error.message);
      throw error;
    }
  }

  async createBackup() {
    console.log('   💾 Creating deployment backup...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `deployment-${timestamp}`);
    
    // Backup critical files
    const criticalFiles = [
      'package-lock.json',
      'src/server/dashboard-config.sqlite',
      'config.json'
    ];

    fs.mkdirSync(backupPath, { recursive: true });
    
    for (const file of criticalFiles) {
      const sourcePath = path.join(this.projectRoot, file);
      const targetPath = path.join(backupPath, path.basename(file));
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`   ✅ Backed up ${file}`);
      }
    }
  }

  async forceRemoveDirectory(dirPath) {
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (process.platform === 'win32') {
          // Use Windows rmdir command for better handling of locked files
          await execAsync(`rmdir /s /q "${dirPath}"`, { timeout: 30000 });
        } else {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        console.log(`   ⏳ Removal attempt ${attempt} failed, retrying...`);
        await this.sleep(2000);
      }
    }
  }

  async recoverFromFailure() {
    console.log('🔧 Attempting recovery from deployment failure...');
    
    // Try to restore from backup if needed
    const backupDirs = fs.readdirSync(this.backupDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort()
      .reverse();
    
    if (backupDirs.length > 0) {
      console.log(`   💾 Latest backup found: ${backupDirs[0]}`);
      // Recovery logic would go here if needed
    }
    
    console.log('   💡 Manual intervention may be required');
    console.log('   💡 Try running: npm install --force');
  }

  async runCommand(command, cwd = this.projectRoot, options = {}) {
    return new Promise((resolve, reject) => {
      const child = exec(command, { 
        cwd, 
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 300000 // 5 minute timeout
      }, (error, stdout, stderr) => {
        if (error && !options.ignoreErrors) {
          reject(new Error(`Command failed: ${command}\n${error.message}\n${stderr}`));
        } else {
          resolve({ stdout, stderr });
        }
      });

      if (!options.background) {
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);
      }
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run deployment if called directly
if (require.main === module) {
  const deployment = new WindowsSafeDeployment();
  deployment.deploy().catch(error => {
    console.error('Fatal deployment error:', error);
    process.exit(1);
  });
}

module.exports = WindowsSafeDeployment;
