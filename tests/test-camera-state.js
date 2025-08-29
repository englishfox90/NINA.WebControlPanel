// Test script to check camera state details
async function testCameraState() {
  try {
    console.log('🔍 Checking camera state from NINA...');
    
    const response = await fetch('http://localhost:3001/api/nina/camera', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.Success && data.Response) {
      console.log('📹 Camera State Details:');
      console.log(`CameraState: "${data.Response.CameraState}"`);
      console.log(`IsExposing: ${data.Response.IsExposing}`);
      console.log(`Connected: ${data.Response.Connected}`);
      console.log(`Name: ${data.Response.Name}`);
      
      console.log('\n🎯 Display Logic:');
      const displayState = data.Response.IsExposing ? 'Exposing' : data.Response.CameraState;
      console.log(`Final displayed state: "${displayState}"`);
      
    } else {
      console.log('❌ Camera API unsuccessful:', data);
    }
    
  } catch (error) {
    console.error('❌ Camera state test failed:', error.message);
  }
}

testCameraState();
