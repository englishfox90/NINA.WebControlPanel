// Configuration Validator - Ensures system health and proper setup
// Validates all critical configuration before starting the application

const fs = require('fs');
const path = require('path');
const { getConfigDatabase } = require('../../src/server/configDatabase');

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = path.resolve(__dirname, '../..');
  }

  // Validate entire system configuration
  async validateSystem() {
    console.log('🔍 Starting NINA WebControlPanel Configuration Validation...');
    
    await this.validateDirectories();
    await this.validateDatabase();
    await this.validateDependencies();
    await this.validateNINAConnection();
    await this.validateStreamUrls();
    
    this.printResults();
    
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  // Check all required directories exist and are writable
  async validateDirectories() {
    console.log('📁 Validating directories...');
    
    const requiredDirs = [
      { path: 'logs', description: 'Log files directory', create: true },
      { path: 'src/server', description: 'Backend server code' },
      { path: 'src/client', description: 'Frontend React code' },
      { path: 'resources', description: 'Database and resource files', create: true }
    ];

    for (const dir of requiredDirs) {
      const fullPath = path.join(this.projectRoot, dir.path);
      
      if (!fs.existsSync(fullPath)) {
        if (dir.create) {
          try {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`✅ Created missing directory: ${dir.path}`);
          } catch (error) {
            this.errors.push(`Cannot create ${dir.description}: ${fullPath}`);
          }
        } else {
          this.errors.push(`Missing ${dir.description}: ${fullPath}`);
        }
      } else {
        // Test write permissions
        try {
          const testFile = path.join(fullPath, '.write-test');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
        } catch (error) {
          this.errors.push(`No write permission to ${dir.description}: ${fullPath}`);
        }
      }
    }
  }

  // Validate database configuration and connectivity
  async validateDatabase() {
    console.log('🗄️ Validating database configuration...');
    
    try {
      const configDb = getConfigDatabase();
      const config = configDb.getConfig();
      
      // Test configuration database
      const stats = configDb.getStats();
      if (stats.totalConfigs === 0) {
        this.warnings.push('Configuration database is empty - will initialize defaults');
      }
      
      // Validate target scheduler database path
      const schedulerPath = config.database.targetSchedulerPath;
      if (schedulerPath && !schedulerPath.startsWith('http')) {
        const fullSchedulerPath = path.isAbsolute(schedulerPath) ? 
          schedulerPath : path.join(this.projectRoot, schedulerPath);
          
        if (!fs.existsSync(fullSchedulerPath)) {
          this.warnings.push(`Target scheduler database not found: ${fullSchedulerPath}`);
        } else {
          // Test SQLite database validity
          try {
            const Database = require('better-sqlite3');
            const testDb = new Database(fullSchedulerPath, { readonly: true });
            const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            testDb.close();
            
            const requiredTables = ['project', 'target', 'exposureplan', 'acquiredimage'];
            const missingTables = requiredTables.filter(table => 
              !tables.some(t => t.name === table)
            );
            
            if (missingTables.length > 0) {
              this.warnings.push(`Target scheduler database missing tables: ${missingTables.join(', ')}`);
            }
          } catch (error) {
            this.errors.push(`Cannot read target scheduler database: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      this.errors.push(`Database validation failed: ${error.message}`);
    }
  }

  // Check all Node.js dependencies are installed
  async validateDependencies() {
    console.log('📦 Validating dependencies...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const clientPackageJsonPath = path.join(this.projectRoot, 'src/client/package.json');
    
    // Check root dependencies
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      await this.checkNodeModules(this.projectRoot, packageJson.dependencies);
    }
    
    // Check client dependencies
    if (fs.existsSync(clientPackageJsonPath)) {
      const clientPackageJson = JSON.parse(fs.readFileSync(clientPackageJsonPath, 'utf8'));
      await this.checkNodeModules(
        path.join(this.projectRoot, 'src/client'), 
        clientPackageJson.dependencies
      );
    }
  }

  async checkNodeModules(basePath, dependencies) {
    const nodeModulesPath = path.join(basePath, 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      this.errors.push(`Missing node_modules in ${basePath}. Run 'npm install'`);
      return;
    }

    const criticalDeps = [
      'express', 'better-sqlite3', 'systeminformation', 'ws',
      '@radix-ui/themes', '@radix-ui/react-icons', 'react', 'typescript'
    ];

    for (const dep of criticalDeps) {
      if (dependencies && dependencies[dep]) {
        const depPath = path.join(nodeModulesPath, dep);
        if (!fs.existsSync(depPath)) {
          this.errors.push(`Missing critical dependency: ${dep}`);
        }
      }
    }
  }

  // Test NINA API connection
  async validateNINAConnection() {
    console.log('🔌 Testing NINA connection...');
    
    try {
      const configDb = getConfigDatabase();
      const config = configDb.getConfig();
      
      // Fix URL construction - baseUrl already includes protocol, so we need to handle it properly
      let baseUrl = config.nina.baseUrl;
      
      // Remove trailing slash if present
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      
      // If baseUrl already includes protocol, we need to extract just the host part for port construction
      if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
        const urlParts = new URL(baseUrl);
        const ninaUrl = `${urlParts.protocol}//${urlParts.hostname}:${config.nina.apiPort}/api/info`;
        
        // Test with timeout
        const fetch = require('axios');
        const response = await fetch.get(ninaUrl, { 
          timeout: config.nina.timeout || 5000 
        });
        
        if (response.data) {
          console.log('✅ NINA connection successful');
        }
      } else {
        // If no protocol, construct URL normally
        const ninaUrl = `http://${baseUrl}:${config.nina.apiPort}/api/info`;
        
        // Test with timeout
        const fetch = require('axios');
        const response = await fetch.get(ninaUrl, { 
          timeout: config.nina.timeout || 5000 
        });
        
        if (response.data) {
          console.log('✅ NINA connection successful');
        }
      }
    } catch (error) {
      this.warnings.push(`NINA API not accessible: ${error.message} (will use mock data)`);
    }
  }

  // Validate streaming URLs
  async validateStreamUrls() {
    console.log('📡 Validating stream URLs...');
    
    try {
      const configDb = getConfigDatabase();
      const config = configDb.getConfig();
      
      const streamUrls = [
        config.streams.liveFeed1,
        config.streams.liveFeed2,
        config.streams.liveFeed3
      ].filter(url => url && url.trim() !== '');

      for (const url of streamUrls) {
        try {
          const fetch = require('axios');
          await fetch.head(url, { timeout: 3000 });
        } catch (error) {
          this.warnings.push(`Stream URL not accessible: ${url}`);
        }
      }
    } catch (error) {
      this.warnings.push(`Could not validate stream URLs: ${error.message}`);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All systems are ready for deployment!');
    } else {
      if (this.errors.length > 0) {
        console.log('❌ ERRORS (must fix before deployment):');
        this.errors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }
      
      if (this.warnings.length > 0) {
        console.log('⚠️ WARNINGS (recommended to address):');
        this.warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning}`);
        });
      }
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// CLI execution
if (require.main === module) {
  const validator = new ConfigValidator();
  validator.validateSystem()
    .then((result) => {
      process.exit(result.isValid ? 0 : 1);
    })
    .catch((error) => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = ConfigValidator;
