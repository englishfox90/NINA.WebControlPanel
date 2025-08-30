// Debug script to check phase generation logic
const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function debugPhases() {
  try {
    const data = await fetchJson('http://localhost:3001/api/time/astronomical');
    
    console.log('🌅 Astronomical data received:');
    console.log('Today data:', data.astronomical.multiDay.today);
    console.log('');
    
    // Simulate the 8-hour window logic
    const now = new Date();
    const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours before
    const windowEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours after
    
    console.log('🕐 Current time:', now.toLocaleString());
    console.log('🕐 Window start (-4hr):', windowStart.toLocaleString());
    console.log('🕐 Window end (+4hr):', windowEnd.toLocaleString());
    console.log('');
    
    const { today } = data.astronomical.multiDay;
    
    if (today.sunrise && today.sunset) {
      const sunriseDate = new Date(`${today.date}T${today.sunrise}`);
      const sunsetDate = new Date(`${today.date}T${today.sunset}`);
      
      console.log('☀️ Sunrise:', sunriseDate.toLocaleString());
      console.log('🌅 Sunset:', sunsetDate.toLocaleString());
      console.log('');
      
      // Check if daylight phase intersects with window
      const dayStart = sunriseDate;
      const dayEnd = sunsetDate;
      
      console.log('🌞 Daylight phase:');
      console.log('  Start:', dayStart.toLocaleString());
      console.log('  End:', dayEnd.toLocaleString());
      console.log('  Intersects window?', dayStart < windowEnd && dayEnd > windowStart);
      
      if (dayStart < windowEnd && dayEnd > windowStart) {
        const clampedStart = dayStart < windowStart ? windowStart : dayStart;
        const clampedEnd = dayEnd > windowEnd ? windowEnd : dayEnd;
        const duration = Math.round((clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60));
        
        console.log('  Clamped start:', clampedStart.toLocaleString());
        console.log('  Clamped end:', clampedEnd.toLocaleString());
        console.log('  Duration:', duration, 'minutes');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugPhases();
