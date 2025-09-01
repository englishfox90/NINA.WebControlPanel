#!/usr/bin/env node

// Production Deployment Script for NINA WebControlPanel
// Handles production builds, process management, and monitoring

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ConfigValidator = require('../development/config-validator');

class ProductionDeployment {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../');
    this.buildDir = path.join(this.projectRoot, 'build');
    this.logsDir = path.join(this.projectRoot, 'logs');
  }

  async deploy() {
    console.log('🚀 Starting Production Deployment for NINA WebControlPanel');
    console.log('================================================================');

    try {
      // Step 1: Validate configuration
      await this.validateConfiguration();
      
      // Step 2: Install dependencies
      await this.installDependencies();
      
      // Step 3: Build production assets
      await this.buildProduction();
      
      // Step 4: Set up production environment
      await this.setupProductionEnvironment();
      
      // Step 5: Start production server
      await this.startProductionServer();
      
      console.log('✅ Deployment completed successfully!');
      this.printProductionInfo();
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }

  async validateConfiguration() {
    console.log('🔍 Step 1: Validating system configuration...');
    
    const validator = new ConfigValidator();
    const result = await validator.validateSystem();
    
    if (!result.isValid) {
      throw new Error('Configuration validation failed. Please fix errors before deployment.');
    }
    
    console.log('✅ Configuration validation passed');
  }

  async installDependencies() {
    console.log('📦 Step 2: Installing production dependencies...');
    
    // Install root dependencies
    await this.runCommand('npm ci --production', this.projectRoot);
    
    // Install client dependencies and build
    await this.runCommand('npm ci', path.join(this.projectRoot, 'src/client'));
    
    console.log('✅ Dependencies installed');
  }

  async buildProduction() {
    console.log('🏗️ Step 3: Building production assets...');
    
    // Clean previous builds
    if (fs.existsSync(this.buildDir)) {
      fs.rmSync(this.buildDir, { recursive: true });
    }

    // Build React application
    await this.runCommand('npm run build', path.join(this.projectRoot, 'src/client'));
    
    // Move build files to production location
    const clientBuildDir = path.join(this.projectRoot, 'src/client/build');
    if (fs.existsSync(clientBuildDir)) {
      fs.renameSync(clientBuildDir, this.buildDir);
    }
    
    console.log('✅ Production build completed');
  }

  async setupProductionEnvironment() {
    console.log('⚙️ Step 4: Setting up production environment...');
    
    // Create logs directory
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    // Create production config file
    const prodConfigPath = path.join(this.projectRoot, 'production.config.json');
    const prodConfig = {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3001,
      LOG_LEVEL: 'info',
      ENABLE_CORS: true,
      BUILD_DIR: this.buildDir,
      LOGS_DIR: this.logsDir,
      DEPLOYMENT_TIME: new Date().toISOString()
    };
    
    fs.writeFileSync(prodConfigPath, JSON.stringify(prodConfig, null, 2));
    
    console.log('✅ Production environment configured');
  }

  async startProductionServer() {
    console.log('🚀 Step 5: Starting production server...');
    
    const serverScript = path.join(this.projectRoot, 'src/server/config-server.js');
    
    // Set production environment variables
    process.env.NODE_ENV = 'production';
    process.env.BUILD_DIR = this.buildDir;
    
    // Start server with PM2 if available, otherwise as background process
    try {
      await this.runCommand('pm2 --version', this.projectRoot);
      
      // PM2 is available - use it for process management
      const pm2Config = {
        name: 'nina-webcontrol',
        script: serverScript,
        cwd: this.projectRoot,
        env: {
          NODE_ENV: 'production',
          PORT: process.env.PORT || 3001,
          BUILD_DIR: this.buildDir
        },
        log_file: path.join(this.logsDir, 'combined.log'),
        error_file: path.join(this.logsDir, 'error.log'),
        out_file: path.join(this.logsDir, 'out.log'),
        time: true,
        instances: 1,
        autorestart: true,
        max_restarts: 10,
        min_uptime: '5s'
      };
      
      const pm2ConfigPath = path.join(this.projectRoot, 'ecosystem.config.js');
      fs.writeFileSync(pm2ConfigPath, `module.exports = { apps: [${JSON.stringify(pm2Config, null, 2)}] };`);
      
      await this.runCommand('pm2 start ecosystem.config.js', this.projectRoot);
      console.log('✅ Production server started with PM2');
      
    } catch (error) {
      // PM2 not available - use built-in process manager
      const ProcessManager = require('./process-manager');
      const pm = new ProcessManager();
      pm.startServer();
      console.log('✅ Production server started with built-in process manager');
    }
  }

  runCommand(command, cwd) {
    return new Promise((resolve, reject) => {
      console.log(`   Running: ${command}`);
      const child = exec(command, { cwd }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
      
      child.stdout.on('data', (data) => {
        process.stdout.write(`     ${data}`);
      });
    });
  }

  printProductionInfo() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 NINA WEBCONTROLPANEL - PRODUCTION READY');
    console.log('='.repeat(60));
    console.log('📍 Application URL: http://localhost:3001');
    console.log('📊 Admin Dashboard: http://localhost:3001/admin (if enabled)');
    console.log('📁 Build Directory:', this.buildDir);
    console.log('📝 Logs Directory:', this.logsDir);
    console.log('🔧 Process Management:');
    console.log('     - Start: npm run server');
    console.log('     - Stop: pm2 stop nina-webcontrol (or Ctrl+C)');
    console.log('     - Restart: pm2 restart nina-webcontrol');
    console.log('     - Status: pm2 status');
    console.log('     - Logs: pm2 logs nina-webcontrol');
    console.log('='.repeat(60));
    console.log('🌟 Happy astrophotography monitoring!');
    console.log('='.repeat(60) + '\n');
  }
}

// CLI execution
if (require.main === module) {
  const deployment = new ProductionDeployment();
  deployment.deploy().catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionDeployment;
