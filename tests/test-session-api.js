// Test script for session API

async function testSessionAPI() {
  try {
    console.log('🧪 Testing session API with image...');
    
    const response = await fetch('http://localhost:3001/api/nina/session?includeImage=true', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('✅ Session API Response:');
    console.log(`Success: ${data.Success}`);
    console.log(`Has imageHistory: ${data.Response.imageHistory !== null}`);
    console.log(`Has cameraInfo: ${data.Response.cameraInfo !== null}`);
    console.log(`Has image: ${data.Response.image !== null}`);
    
    if (data.Response.image) {
      console.log(`Image success: ${data.Response.image.Success}`);
      console.log(`Image data length: ${data.Response.image.Response ? data.Response.image.Response.length : 'null'}`);
    }
    
    if (data.Response.imageHistory && data.Response.imageHistory.Response) {
      console.log(`Image history count: ${data.Response.imageHistory.Response.length}`);
      if (data.Response.imageHistory.Response.length > 0) {
        const latest = data.Response.imageHistory.Response[0];
        console.log(`Latest image: ${latest.Filter} filter, ${latest.ExposureTime}s exposure`);
      }
    }
    
    console.log('\n🎯 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Session API test failed:', error.message);
  }
}

testSessionAPI();
