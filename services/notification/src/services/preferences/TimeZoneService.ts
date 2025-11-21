import { TimezoneConfig } from '@/types';
import { Logger } from '@/utils/Logger';

export class TimeZoneService {
  private static instance: TimeZoneService;
  private logger: Logger;
  private timezones: Map<string, TimezoneConfig> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeDefaultTimezones();
  }

  static getInstance(): TimeZoneService {
    if (!TimeZoneService.instance) {
      TimeZoneService.instance = new TimeZoneService();
    }
    return TimeZoneService.instance;
  }

  /**
   * Initialize default timezone configurations
   */
  private initializeDefaultTimezones(): void {
    const defaultTimezones: TimezoneConfig[] = [
      { identifier: 'UTC', displayName: 'Coordinated Universal Time', offset: 0, isActive: true },
      { identifier: 'America/New_York', displayName: 'Eastern Standard Time', offset: -5, isActive: true },
      { identifier: 'America/Chicago', displayName: 'Central Standard Time', offset: -6, isActive: true },
      { identifier: 'America/Denver', displayName: 'Mountain Standard Time', offset: -7, isActive: true },
      { identifier: 'America/Los_Angeles', displayName: 'Pacific Standard Time', offset: -8, isActive: true },
      { identifier: 'Europe/London', displayName: 'Greenwich Mean Time', offset: 0, isActive: true },
      { identifier: 'Europe/Berlin', displayName: 'Central European Time', offset: 1, isActive: true },
      { identifier: 'Asia/Tokyo', displayName: 'Japan Standard Time', offset: 9, isActive: true },
      { identifier: 'Australia/Sydney', displayName: 'Australian Eastern Standard Time', offset: 10, isActive: true },
    ];

    for (const tz of defaultTimezones) {
      this.timezones.set(tz.identifier, tz);
    }

    this.logger.info('Default timezones initialized');
  }

  /**
   * Convert UTC time to user's timezone
   */
  convertFromUTC(utcDate: Date, timezone: string): Date {
    try {
      const userTimezone = this.timezones.get(timezone) || this.timezones.get('UTC')!;
      const offsetHours = userTimezone.offset;

      // Create new date in user's timezone
      const userDate = new Date(utcDate.getTime() + (offsetHours * 60 * 60 * 1000));
      return userDate;

    } catch (error) {
      this.logger.error('Failed to convert UTC time to timezone', { error, timezone, utcDate });
      return utcDate; // Fallback to UTC
    }
  }

  /**
   * Convert user's local time to UTC
   */
  convertToUTC(localDate: Date, timezone: string): Date {
    try {
      const userTimezone = this.timezones.get(timezone) || this.timezones.get('UTC')!;
      const offsetHours = userTimezone.offset;

      // Create UTC date from user's local time
      const utcDate = new Date(localDate.getTime() - (offsetHours * 60 * 60 * 1000));
      return utcDate;

    } catch (error) {
      this.logger.error('Failed to convert local time to UTC', { error, timezone, localDate });
      return localDate; // Fallback to input date
    }
  }

  /**
   * Get current time in user's timezone
   */
  getCurrentTimeInTimezone(timezone: string): Date {
    return this.convertFromUTC(new Date(), timezone);
  }

  /**
   * Check if current time is within quiet hours for user
   */
  isWithinQuietHours(timezone: string, startTime: string, endTime: string): boolean {
    try {
      const userNow = this.getCurrentTimeInTimezone(timezone);
      const currentTime = userNow.getHours() * 100 + userNow.getMinutes();

      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      if (startHour === undefined || startMinute === undefined || endHour === undefined || endMinute === undefined) {
        return false; // Invalid time format, default to not quiet hours
      }

      const startTotal = startHour * 100 + startMinute;
      const endTotal = endHour * 100 + endMinute;

      // Handle overnight quiet hours (e.g., 22:00 to 07:00)
      if (startTotal > endTotal) {
        return currentTime >= startTotal || currentTime <= endTotal;
      } else {
        return currentTime >= startTotal && currentTime <= endTotal;
      }

    } catch (error) {
      this.logger.error('Failed to check quiet hours', { error, timezone, startTime, endTime });
      return false; // Default to allowing notification if check fails
    }
  }

  /**
   * Get time until next quiet hours period ends
   */
  getTimeUntilQuietHoursEnd(timezone: string, endTime: string): number {
    try {
      const userNow = this.getCurrentTimeInTimezone(timezone);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      if (endHour === undefined || endMinute === undefined) {
        return 0; // Invalid time format, return 0
      }

      const endToday = new Date(userNow);
      endToday.setHours(endHour, endMinute, 0, 0);

      // If end time is tomorrow (overnight quiet hours)
      if (endToday <= userNow) {
        endToday.setDate(endToday.getDate() + 1);
      }

      return endToday.getTime() - userNow.getTime();

    } catch (error) {
      this.logger.error('Failed to calculate time until quiet hours end', { error, timezone, endTime });
      return 0;
    }
  }

  /**
   * Validate timezone identifier
   */
  isValidTimezone(timezone: string): boolean {
    return this.timezones.has(timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone === timezone;
  }

  /**
   * Get all available timezones
   */
  getAvailableTimezones(): TimezoneConfig[] {
    return Array.from(this.timezones.values()).filter(tz => tz.isActive);
  }

  /**
   * Get timezone by identifier
   */
  getTimezone(identifier: string): TimezoneConfig | null {
    return this.timezones.get(identifier) || null;
  }

  /**
   * Add custom timezone
   */
  addTimezone(timezone: TimezoneConfig): void {
    this.timezones.set(timezone.identifier, timezone);
    this.logger.info(`Added timezone: ${timezone.identifier}`);
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  parseTimeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    if (hours === undefined || minutes === undefined) {
      return 0; // Return 0 if parsing fails
    }
    return hours * 60 + minutes;
  }

  /**
   * Format minutes since midnight to time string (HH:MM)
   */
  formatMinutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Check if two time periods overlap
   */
  doTimePeriodsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const start1Min = this.parseTimeToMinutes(start1);
    const end1Min = this.parseTimeToMinutes(end1);
    const start2Min = this.parseTimeToMinutes(start2);
    const end2Min = this.parseTimeToMinutes(end2);

    // Handle overnight periods
    const isOvernight1 = end1Min < start1Min;
    const isOvernight2 = end2Min < start2Min;

    if (isOvernight1 && isOvernight2) {
      // Both are overnight periods - they always overlap
      return true;
    } else if (isOvernight1) {
      // First period is overnight, check if second period overlaps with it
      return start2Min <= end1Min || start2Min >= start1Min;
    } else if (isOvernight2) {
      // Second period is overnight, check if first period overlaps with it
      return start1Min <= end2Min || start1Min >= start2Min;
    } else {
      // Both are regular periods
      return !(end1Min <= start2Min || end2Min <= start1Min);
    }
  }
}
