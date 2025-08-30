#!/usr/bin/env node

// Quick script to update all hardcoded localhost URLs to use dynamic API configuration
const fs = require('fs');
const path = require('path');

// List of files that need updating
const filesToUpdate = [
  'src/client/src/components/SchedulerWidget.tsx',
  'src/client/src/components/ImageViewer.tsx', 
  'src/client/src/components/Dashboard.tsx',
  'src/client/src/components/NINAStatus.tsx',
  'src/client/src/components/TimeAstronomicalWidget.tsx',
  'src/client/src/components/SystemStatusWidget.tsx',
  'src/client/src/services/widgetService.ts',
  'src/client/src/services/ninaWebSocket.ts',
  'src/client/src/services/ninaApi.ts'
];

const replacements = [
  {
    from: /http:\/\/localhost:3001\/api\/([^'"`]+)/g,
    to: "getApiUrl('$1')",
    needsImport: true
  },
  {
    from: /ws:\/\/localhost:3001\/([^'"`]+)/g,  
    to: "getWsUrl('$1')",
    needsImport: true
  }
];

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let hasChanges = false;
  let needsImport = false;

  replacements.forEach(({ from, to, needsImport: requiresImport }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      hasChanges = true;
      if (requiresImport) needsImport = true;
    }
  });

  if (hasChanges) {
    // Add import if needed and not already present
    if (needsImport && !content.includes("from '../config/api'")) {
      // Find the last import statement
      const importRegex = /import.*from.*['"][^'"]+['"];?\s*$/gm;
      const imports = content.match(importRegex);
      
      if (imports) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPoint = lastImportIndex + lastImport.length;
        
        content = content.slice(0, insertPoint) + 
                 "\nimport { getApiUrl, getWsUrl } from '../config/api';" +
                 content.slice(insertPoint);
      }
    }

    fs.writeFileSync(fullPath, content);
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
});

console.log('\n🎉 URL updates complete!');
