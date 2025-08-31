// Astronomical data API routes
const express = require('express');

class AstronomicalRoutes {
  constructor(astronomicalService, configDatabase) {
    this.astronomicalService = astronomicalService;
    this.configDatabase = configDatabase;
  }

  register(app) {
    // Time and astronomical data endpoint
    app.get('/api/time/astronomical', async (req, res) => {
      try {
        // Get observatory location from configuration first to get timezone
        const config = this.configDatabase.getConfig();
        const location = config.observatory?.location || {
          latitude: 40.7128,
          longitude: -74.006,
          timezone: 'America/New_York'
        };
        
        // Create server time in the observatory's timezone
        const now = new Date();
        const serverTimeLocal = now.toLocaleString('en-US', { 
          timeZone: location.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        // Calculate timezone offset in minutes for the observatory location
        const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
        const localDate = new Date(now.toLocaleString('en-US', { timeZone: location.timezone }));
        const timezoneOffsetMinutes = (utcDate.getTime() - localDate.getTime()) / (1000 * 60);
        
        // Also provide ISO format in UTC for consistency
        const serverTime = now.toISOString();
        const browserTime = req.query.browserTime || serverTime;
        const timeZoneOffset = parseInt(req.query.timeZoneOffset) || 0;
        const browserDate = new Date(browserTime);
        const timeDifference = Math.abs(now.getTime() - browserDate.getTime());
        const isDifferent = timeDifference > 60000; // More than 1 minute difference
        
        console.log(`🌅 Fetching astronomical data for location: ${location.latitude}, ${location.longitude}`);
        
        // Get real astronomical data from sunrise-sunset.org API
        const astronomicalData = await this.astronomicalService.getComprehensiveAstronomicalData(
          location.latitude,
          location.longitude,
          location.timezone
        );
        
        // Add current phase using real astronomical data instead of hardcoded times
        astronomicalData.currentPhase = this.astronomicalService.getCurrentPhase(now, astronomicalData);
        astronomicalData.moonPhase = this.astronomicalService.getMoonPhase(now);
        
        const response = {
          time: {
            serverTime,
            serverTimeLocal,
            serverTimezone: location.timezone,
            serverTimezoneOffsetMinutes: timezoneOffsetMinutes,
            browserTime,
            timeZoneOffset,
            isDifferent
          },
          astronomical: astronomicalData
        };

        res.json(response);
      } catch (error) {
        console.error('Error getting astronomical data:', error);
        // Get timezone from config for fallback as well
        const config = this.configDatabase.getConfig();
        const timezone = config.observatory?.location?.timezone || 'America/New_York';
        
        const now = new Date();
        const serverTimeLocal = now.toLocaleString('en-US', { 
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        // Fallback data structure to prevent frontend errors
        const fallbackResponse = {
          time: {
            serverTime: new Date(now.toLocaleString('en-US', { timeZone: timezone })).toISOString(),
            serverTimeLocal,
            serverTimezone: timezone,
            browserTime: req.query.browserTime || new Date().toISOString(),
            timeZoneOffset: parseInt(req.query.timeZoneOffset) || 0,
            isDifferent: false
          },
          astronomical: {
            sunrise: '06:30:00',
            sunset: '19:30:00',
            civilTwilightBegin: '06:00:00',
            civilTwilightEnd: '20:00:00',
            nauticalTwilightBegin: '05:30:00',
            nauticalTwilightEnd: '20:30:00',
            astronomicalTwilightBegin: '05:00:00',
            astronomicalTwilightEnd: '21:00:00',
            currentPhase: 'NIGHT',
            moonPhase: {
              phase: 'Full Moon',
              illumination: 100
            }
          }
        };
        res.json(fallbackResponse);
      }
    });
  }
}

module.exports = AstronomicalRoutes;
