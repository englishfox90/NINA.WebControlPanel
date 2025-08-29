#!/usr/bin/env node

/**
 * Script to add ImageViewer widget to existing dashboard configuration
 */

const { getConfigDatabase } = require('../../src/server/configDatabase');
const path = require('path');

async function addImageViewerWidget() {
  console.log('🖼️  Adding ImageViewer widget to dashboard configuration...');
  
  try {
    // Initialize the database connection
    const configDb = getConfigDatabase(path.join(process.cwd(), 'src', 'server', 'dashboard-config.sqlite'));
    
    // Check if ImageViewer widget already exists
    const existingWidget = configDb.getWidget('image-viewer');
    if (existingWidget) {
      console.log('⚠️  ImageViewer widget already exists in database');
      console.log('Current configuration:', JSON.stringify({
        id: existingWidget.id,
        component: existingWidget.component,
        title: existingWidget.title,
        position: { x: existingWidget.x, y: existingWidget.y, w: existingWidget.w, h: existingWidget.h }
      }, null, 2));
      return;
    }

    // Define the ImageViewer widget
    const imageViewerWidget = {
      id: 'image-viewer',
      component: 'ImageViewer',
      title: 'Recent Images',
      x: 0,
      y: 14,
      w: 8,
      h: 6,
      minW: 4,
      minH: 4
    };

    // Add the widget to the database
    configDb.addWidget(imageViewerWidget);
    
    console.log('✅ ImageViewer widget added successfully!');
    console.log('Widget configuration:', JSON.stringify({
      id: imageViewerWidget.id,
      component: imageViewerWidget.component,
      title: imageViewerWidget.title,
      position: { x: imageViewerWidget.x, y: imageViewerWidget.y, w: imageViewerWidget.w, h: imageViewerWidget.h }
    }, null, 2));

    // Display current widget layout
    console.log('\n📊 Current dashboard layout:');
    const allWidgets = configDb.getWidgets();
    allWidgets.forEach(widget => {
      console.log(`  • ${widget.title} (${widget.component}) - Position: x:${widget.layout.x}, y:${widget.layout.y}, size: ${widget.layout.w}x${widget.layout.h}`);
    });

    console.log('\n🎉 ImageViewer widget is now available in the dashboard!');
    console.log('💡 Restart the development server to see the changes: npm start');
    
  } catch (error) {
    console.error('❌ Error adding ImageViewer widget:', error);
    process.exit(1);
  }
}

// Run the script
addImageViewerWidget();
