/**
 * AstronomicalService - Handles astronomical data fetching and time synchronization
 * Part of modularized TimeAstronomicalWidget (keeping files under 500 LOC)
 */

import type { TimeAstronomicalData } from '../../interfaces/system';
import { getApiUrl } from '../../config/api';

export class AstronomicalService {
  private serverTimeOffset: number = 0;
  private lastFetchTime: number = 0;
  private cachedData: TimeAstronomicalData | null = null;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Fetch astronomical data with caching
   */
  async fetchData(): Promise<TimeAstronomicalData> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cachedData && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.cachedData;
    }

    try {
      const response = await fetch(getApiUrl('time/astronomical'));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      this.cachedData = result;
      this.lastFetchTime = now;
      
      // Calculate server time offset for clock synchronization
      this.calculateTimeOffset(result);
      
      return result;
    } catch (err) {
      console.error('Error fetching astronomical data:', err);
      throw err instanceof Error ? err : new Error('Failed to fetch astronomical data');
    }
  }

  /**
   * Calculate and store server time offset for accurate clock display
   */
  private calculateTimeOffset(data: TimeAstronomicalData) {
    if (data.time?.serverTimeLocal && data.time?.serverTimezone) {
      console.log(`⏰ Server timezone: ${data.time.serverTimezone}`);
      console.log(`⏰ Server local time: ${data.time.serverTimeLocal}`);
      
      const serverLocalTime = new Date(data.time.serverTimeLocal);
      const browserTime = new Date();
      const initialOffset = serverLocalTime.getTime() - browserTime.getTime();
      this.serverTimeOffset = initialOffset;
      console.log(`⏰ Server time sync offset: ${initialOffset}ms`);
    } else if (data.time?.serverTime) {
      // Fallback to old method if new fields aren't available
      const serverTime = new Date(data.time.serverTime);
      const browserTime = new Date();
      const offset = serverTime.getTime() - browserTime.getTime();
      this.serverTimeOffset = offset;
      console.log(`⏰ Fallback server time offset: ${offset}ms (${Math.round(offset / 1000)}s)`);
    }
  }

  /**
   * Get current server time with offset applied
   */
  getServerTime(): Date {
    const browserTime = new Date();
    return new Date(browserTime.getTime() + this.serverTimeOffset);
  }

  /**
   * Get server time offset in milliseconds
   */
  getServerTimeOffset(): number {
    return this.serverTimeOffset;
  }

  /**
   * Check if browser and server times are different
   */
  isDifferent(): boolean {
    return Math.abs(this.serverTimeOffset) > 1000; // More than 1 second difference
  }

  /**
   * Format time for 12-hour display
   */
  formatTime12Hour(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Format time string for short 12-hour display
   */
  formatTimeShort12Hour(timeStr: string): string {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }
}

// Export singleton instance
export const astronomicalService = new AstronomicalService();
