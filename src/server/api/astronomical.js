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
        const serverTime = new Date().toISOString();
        const browserTime = req.query.browserTime || serverTime;
        const timeZoneOffset = parseInt(req.query.timeZoneOffset) || 0;
        const now = new Date();
        const browserDate = new Date(browserTime);
        const timeDifference = Math.abs(now.getTime() - browserDate.getTime());
        const isDifferent = timeDifference > 60000; // More than 1 minute difference
        
        // Get observatory location from configuration
        const config = this.configDatabase.getConfig();
        const location = config.observatory?.location || {
          latitude: 40.7128,
          longitude: -74.006,
          timezone: 'America/New_York'
        };
        
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
            browserTime,
            timeZoneOffset,
            isDifferent
          },
          astronomical: astronomicalData
        };

        res.json(response);
      } catch (error) {
        console.error('Error getting astronomical data:', error);
        // Fallback data structure to prevent frontend errors
        const fallbackResponse = {
          time: {
            serverTime: new Date().toISOString(),
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
