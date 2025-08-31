// Astronomical Data Service
// Integrates with sunrise-sunset.org API for real astronomical data

class AstronomicalService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes cache
  }

  /**
   * Fetch astronomical data from sunrise-sunset.org API
   * @param {number} latitude - Latitude in decimal degrees
   * @param {number} longitude - Longitude in decimal degrees  
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {boolean} formatted - Whether to return formatted times (default: false for UTC)
   * @returns {Promise<Object>} Astronomical data
   */
  async fetchAstronomicalData(latitude, longitude, date, formatted = false) {
    const cacheKey = `${latitude},${longitude},${date},${formatted}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const formatParam = formatted ? '1' : '0';
      const url = `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${date}&formatted=${formatParam}`;
      
      console.log(`🌅 Fetching astronomical data: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status !== 'OK') {
        throw new Error(`API returned error status: ${data.status}`);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: data.results,
        timestamp: Date.now()
      });

      return data.results;
    } catch (error) {
      console.error('❌ Error fetching astronomical data:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive astronomical data for multiple days to cover 8-hour span
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {string} timezone - IANA timezone string
   * @returns {Promise<Object>} Combined astronomical data
   */
  async getComprehensiveAstronomicalData(latitude, longitude, timezone) {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      // Format dates for API (YYYY-MM-DD)
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      const yesterdayStr = formatDate(yesterday);
      const todayStr = formatDate(now);
      const tomorrowStr = formatDate(tomorrow);

      console.log(`📅 Fetching astronomical data for ${yesterdayStr}, ${todayStr}, ${tomorrowStr}`);

      // Fetch data for all three days in parallel
      const [yesterdayData, todayData, tomorrowData] = await Promise.all([
        this.fetchAstronomicalData(latitude, longitude, yesterdayStr, false),
        this.fetchAstronomicalData(latitude, longitude, todayStr, false), 
        this.fetchAstronomicalData(latitude, longitude, tomorrowStr, false)
      ]);

      // Debug: Log the received data structure
      // console.log('📊 Astronomical API responses:');
      // console.log('📅 Yesterday keys:', yesterdayData ? Object.keys(yesterdayData) : 'null');
      // console.log('📅 Today keys:', todayData ? Object.keys(todayData) : 'null'); 
      // console.log('📅 Tomorrow keys:', tomorrowData ? Object.keys(tomorrowData) : 'null');
      
      // Debug: Check specific values
      // console.log('🌅 Sample yesterday data:', {
      //   sunset: yesterdayData?.sunset,
      //   civil_twilight_end: yesterdayData?.civil_twilight_end
      // });
      // console.log('🌅 Sample today data:', {
      //   sunrise: todayData?.sunrise,
      //   sunset: todayData?.sunset
      // });

      // Convert UTC times to local timezone and extract times
      const convertToLocalTime = (utcDateTimeStr) => {
        try {
          // The API returns full ISO datetime strings like "2025-08-30T12:11:11+00:00"
          const utcDate = new Date(utcDateTimeStr);
          
          // Convert to local time using the specified timezone
          const localTimeString = utcDate.toLocaleTimeString("en-US", { 
            timeZone: timezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit', 
            second: '2-digit'
          });
          
          return localTimeString; // Returns HH:MM:SS format
        } catch (error) {
          console.error(`❌ Error converting time ${utcDateTimeStr}:`, error);
          return "00:00:00"; // Fallback
        }
      };

      // Use today's data as primary, but keep all for reference
      const result = {
        // Primary times (today)
        sunrise: convertToLocalTime(todayData.sunrise),
        sunset: convertToLocalTime(todayData.sunset),
        civilTwilightBegin: convertToLocalTime(todayData.civil_twilight_begin),
        civilTwilightEnd: convertToLocalTime(todayData.civil_twilight_end),
        nauticalTwilightBegin: convertToLocalTime(todayData.nautical_twilight_begin),
        nauticalTwilightEnd: convertToLocalTime(todayData.nautical_twilight_end),
        astronomicalTwilightBegin: convertToLocalTime(todayData.astronomical_twilight_begin),
        astronomicalTwilightEnd: convertToLocalTime(todayData.astronomical_twilight_end),
        
        // Multi-day data for 8-hour window calculations - with explicit null checks
        multiDay: {
          yesterday: {
            date: yesterdayStr,
            sunset: yesterdayData?.sunset ? convertToLocalTime(yesterdayData.sunset) : "19:00:00",
            civilTwilightEnd: yesterdayData?.civil_twilight_end ? convertToLocalTime(yesterdayData.civil_twilight_end) : "19:30:00",
            nauticalTwilightEnd: yesterdayData?.nautical_twilight_end ? convertToLocalTime(yesterdayData.nautical_twilight_end) : "20:00:00",
            astronomicalTwilightEnd: yesterdayData?.astronomical_twilight_end ? convertToLocalTime(yesterdayData.astronomical_twilight_end) : "20:30:00"
          },
          today: {
            date: todayStr,
            sunrise: todayData?.sunrise ? convertToLocalTime(todayData.sunrise) : "06:00:00",
            sunset: todayData?.sunset ? convertToLocalTime(todayData.sunset) : "19:00:00",
            civilTwilightBegin: todayData?.civil_twilight_begin ? convertToLocalTime(todayData.civil_twilight_begin) : "05:30:00",
            civilTwilightEnd: todayData?.civil_twilight_end ? convertToLocalTime(todayData.civil_twilight_end) : "19:30:00",
            nauticalTwilightBegin: todayData?.nautical_twilight_begin ? convertToLocalTime(todayData.nautical_twilight_begin) : "05:00:00",
            nauticalTwilightEnd: todayData?.nautical_twilight_end ? convertToLocalTime(todayData.nautical_twilight_end) : "20:00:00",
            astronomicalTwilightBegin: todayData?.astronomical_twilight_begin ? convertToLocalTime(todayData.astronomical_twilight_begin) : "04:30:00",
            astronomicalTwilightEnd: todayData?.astronomical_twilight_end ? convertToLocalTime(todayData.astronomical_twilight_end) : "20:30:00"
          },
          tomorrow: {
            date: tomorrowStr,
            sunrise: tomorrowData?.sunrise ? convertToLocalTime(tomorrowData.sunrise) : "06:00:00",
            civilTwilightBegin: tomorrowData?.civil_twilight_begin ? convertToLocalTime(tomorrowData.civil_twilight_begin) : "05:30:00",
            nauticalTwilightBegin: tomorrowData?.nautical_twilight_begin ? convertToLocalTime(tomorrowData.nautical_twilight_begin) : "05:00:00",
            astronomicalTwilightBegin: tomorrowData?.astronomical_twilight_begin ? convertToLocalTime(tomorrowData.astronomical_twilight_begin) : "04:30:00"
          }
        },
        
        // Metadata
        location: { latitude, longitude, timezone },
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ Astronomical data processed successfully');
      return result;

    } catch (error) {
      console.error('❌ Error getting comprehensive astronomical data:', error);
      // Return fallback data on error
      return this.getFallbackAstronomicalData(timezone);
    }
  }

  /**
   * @deprecated Use getMoonPhase() instead for more accurate calculations
   * Get current moon phase (simplified calculation)
   * @param {Date} date 
   * @returns {Object} Moon phase information
   */
  getCurrentMoonPhase(date = new Date()) {
    // Redirect to the new, more accurate method
    return this.getMoonPhase(date);
  }

  /**
   * Determine current astronomical phase based on actual twilight times
   * @param {Date} currentTime - The current date/time
   * @param {Object} astronomicalData - The astronomical data with twilight times
   * @returns {string} Current phase: 'daylight', 'civil', 'nautical', 'astronomical', 'night'
   */
  getCurrentPhase(currentTime, astronomicalData) {
    try {
      // Convert time strings to minutes for comparison
      const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      // Convert current UTC time to local time for comparison with astronomical data
      // The astronomical data times are already in local time from convertToLocalTime()
      const timezone = astronomicalData.location?.timezone || 'America/Chicago';
      
      // Get local time components using Intl.DateTimeFormat for reliable timezone conversion
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });
      
      const parts = formatter.formatToParts(currentTime);
      const localHour = parseInt(parts.find(part => part.type === 'hour').value);
      const localMinute = parseInt(parts.find(part => part.type === 'minute').value);
      const currentMinutes = localHour * 60 + localMinute;
      
      const sunrise = timeToMinutes(astronomicalData.sunrise);
      const sunset = timeToMinutes(astronomicalData.sunset);
      const civilBegin = timeToMinutes(astronomicalData.civilTwilightBegin);
      const civilEnd = timeToMinutes(astronomicalData.civilTwilightEnd);
      const nauticalBegin = timeToMinutes(astronomicalData.nauticalTwilightBegin);
      const nauticalEnd = timeToMinutes(astronomicalData.nauticalTwilightEnd);
      const astroBegin = timeToMinutes(astronomicalData.astronomicalTwilightBegin);
      const astroEnd = timeToMinutes(astronomicalData.astronomicalTwilightEnd);

      // console.log(`🌅 Phase detection at ${localHour}:${String(localMinute).padStart(2,'0')} local (${currentMinutes}min)`);
      // console.log(`   UTC time: ${currentTime.getHours()}:${String(currentTime.getMinutes()).padStart(2,'0')}, Local time: ${localHour}:${String(localMinute).padStart(2,'0')}`);
      // console.log(`   Sunrise: ${sunrise}, Sunset: ${sunset}`);
      // console.log(`   Civil: ${civilBegin}-${civilEnd}, Nautical: ${nauticalBegin}-${nauticalEnd}, Astro: ${astroBegin}-${astroEnd}`);

      // Daylight phase (between sunrise and sunset)
      if (currentMinutes >= sunrise && currentMinutes <= sunset) {
        console.log('   → DAYLIGHT phase');
        return 'daylight';
      }
      
      // Morning phases (before sunrise)
      if (currentMinutes >= civilBegin && currentMinutes < sunrise) {
        console.log('   → CIVIL dawn phase');
        return 'civil';
      }
      if (currentMinutes >= nauticalBegin && currentMinutes < civilBegin) {
        console.log('   → NAUTICAL dawn phase'); 
        return 'nautical';
      }
      if (currentMinutes >= astroBegin && currentMinutes < nauticalBegin) {
        console.log('   → ASTRONOMICAL dawn phase');
        return 'astronomical';
      }
      
      // Evening phases (after sunset)
      if (currentMinutes > sunset && currentMinutes <= civilEnd) {
        console.log('   → CIVIL dusk phase');
        return 'civil';
      }
      if (currentMinutes > civilEnd && currentMinutes <= nauticalEnd) {
        console.log('   → NAUTICAL dusk phase');
        return 'nautical';
      }
      if (currentMinutes > nauticalEnd && currentMinutes <= astroEnd) {
        console.log('   → ASTRONOMICAL dusk phase');
        return 'astronomical';
      }
      
      // Night phase (before astronomical dawn or after astronomical dusk)
      console.log('   → NIGHT phase');
      return 'night';
      
    } catch (error) {
      console.error('Error determining current phase:', error);
      return 'night'; // Default fallback
    }
  }

  /**
   * Calculate precise moon phase information
   * @param {Date} date - Date to calculate moon phase for
   * @returns {Object} Moon phase data with age, illumination, and phase name
   */
  getMoonPhase(date = new Date()) {
    const synodicMonth = 29.53059; // Average length of lunar cycle in days
    
    // Reference: 2000-01-06 18:14 UTC (known new moon - January 6, 2000)
    const referenceNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
    const daysSinceReference = (date.getTime() - referenceNewMoon) / (24 * 60 * 60 * 1000);
    
    // Calculate current age of moon in this cycle
    const age = ((daysSinceReference % synodicMonth) + synodicMonth) % synodicMonth;
    
    // Calculate illumination percentage (0 = new moon, 1 = full moon)
    const illuminationFraction = 0.5 * (1 - Math.cos(2 * Math.PI * age / synodicMonth));
    const illuminationPercent = Math.round(illuminationFraction * 100);
    
    // Determine phase name based on age
    let phaseName = "";
    let phaseKey = "";
    
    if (age < 1.84566) {
      phaseName = "New Moon";
      phaseKey = "new_moon";
    } else if (age < 5.53699) {
      phaseName = "Waxing Crescent";
      phaseKey = "waxing_crescent";
    } else if (age < 9.22831) {
      phaseName = "First Quarter";
      phaseKey = "first_quarter";
    } else if (age < 12.91963) {
      phaseName = "Waxing Gibbous";
      phaseKey = "waxing_gibbous";
    } else if (age < 16.61096) {
      phaseName = "Full Moon";
      phaseKey = "full_moon";
    } else if (age < 20.30228) {
      phaseName = "Waning Gibbous";
      phaseKey = "waning_gibbous";
    } else if (age < 23.99361) {
      phaseName = "Last Quarter";
      phaseKey = "last_quarter";
    } else {
      phaseName = "Waning Crescent";
      phaseKey = "waning_crescent";
    }
    
    return {
      age: Math.round(age * 10) / 10, // Round to 1 decimal place
      illumination: illuminationPercent,
      phase: phaseKey,
      phaseName: phaseName,
      isWaxing: age < synodicMonth / 2,
      daysUntilNew: Math.round((synodicMonth - age) * 10) / 10,
      daysUntilFull: age < synodicMonth / 2 ? 
        Math.round(((synodicMonth / 2) - age) * 10) / 10 : 
        Math.round(((synodicMonth * 1.5) - age) * 10) / 10
    };
  }

  /**
   * Fallback astronomical data when API fails
   * @param {string} timezone 
   * @returns {Object}
   */
  getFallbackAstronomicalData(timezone) {
    console.log('⚠️ Using fallback astronomical data');
    return {
      sunrise: '06:30:00',
      sunset: '19:30:00',
      civilTwilightBegin: '06:00:00',
      civilTwilightEnd: '20:00:00',
      nauticalTwilightBegin: '05:25:00',
      nauticalTwilightEnd: '20:35:00',
      astronomicalTwilightBegin: '04:50:00',
      astronomicalTwilightEnd: '21:10:00',
      location: { latitude: 31.5475, longitude: -99.3817, timezone },
      lastUpdated: new Date().toISOString(),
      fallback: true
    };
  }

  /**
   * Clear the cache (useful for testing or forced refresh)
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Astronomical data cache cleared');
  }
}

module.exports = AstronomicalService;
