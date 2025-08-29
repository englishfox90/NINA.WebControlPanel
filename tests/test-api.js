// Test script to check if SessionWidget is in the API
const fetch = require('node-fetch');

async function testAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/config');
    const config = await response.json();
    
    console.log('Current widgets in the API:');
    config.layout.widgets.forEach(widget => {
      console.log(`- ${widget.id}: ${widget.component} - ${widget.title}`);
    });
    
    const sessionWidget = config.layout.widgets.find(w => w.id === 'session-widget');
    if (sessionWidget) {
      console.log('\n✅ SessionWidget found in configuration!');
      console.log('Position:', sessionWidget.layout.x, sessionWidget.layout.y);
      console.log('Size:', sessionWidget.layout.w + 'x' + sessionWidget.layout.h);
    } else {
      console.log('\n❌ SessionWidget not found in configuration');
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testAPI();
