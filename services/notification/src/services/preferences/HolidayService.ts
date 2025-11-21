import { HolidayConfig } from '@/types';
import { Logger } from '@/utils/Logger';

export class HolidayService {
  private static instance: HolidayService;
  private logger: Logger;
  private holidays: Map<string, HolidayConfig> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeDefaultHolidays();
  }

  static getInstance(): HolidayService {
    if (!HolidayService.instance) {
      HolidayService.instance = new HolidayService();
    }
    return HolidayService.instance;
  }

  /**
   * Initialize default holiday configurations
   */
  private initializeDefaultHolidays(): void {
    const defaultHolidays: HolidayConfig[] = [
      // 2024 Holidays
      { name: 'New Year\'s Day', date: '2024-01-01', type: 'national', country: 'US', isActive: true },
      { name: 'Martin Luther King Jr. Day', date: '2024-01-15', type: 'national', country: 'US', isActive: true },
      { name: 'Presidents\' Day', date: '2024-02-19', type: 'national', country: 'US', isActive: true },
      { name: 'Memorial Day', date: '2024-05-27', type: 'national', country: 'US', isActive: true },
      { name: 'Juneteenth', date: '2024-06-19', type: 'national', country: 'US', isActive: true },
      { name: 'Independence Day', date: '2024-07-04', type: 'national', country: 'US', isActive: true },
      { name: 'Labor Day', date: '2024-09-02', type: 'national', country: 'US', isActive: true },
      { name: 'Columbus Day', date: '2024-10-14', type: 'national', country: 'US', isActive: true },
      { name: 'Veterans Day', date: '2024-11-11', type: 'national', country: 'US', isActive: true },
      { name: 'Thanksgiving', date: '2024-11-28', type: 'national', country: 'US', isActive: true },
      { name: 'Christmas Day', date: '2024-12-25', type: 'national', country: 'US', isActive: true },

      // 2025 Holidays
      { name: 'New Year\'s Day', date: '2025-01-01', type: 'national', country: 'US', isActive: true },
      { name: 'Martin Luther King Jr. Day', date: '2025-01-20', type: 'national', country: 'US', isActive: true },
      { name: 'Presidents\' Day', date: '2025-02-17', type: 'national', country: 'US', isActive: true },
      { name: 'Memorial Day', date: '2025-05-26', type: 'national', country: 'US', isActive: true },
      { name: 'Juneteenth', date: '2025-06-19', type: 'national', country: 'US', isActive: true },
      { name: 'Independence Day', date: '2025-07-04', type: 'national', country: 'US', isActive: true },
      { name: 'Labor Day', date: '2025-09-01', type: 'national', country: 'US', isActive: true },
      { name: 'Columbus Day', date: '2025-10-13', type: 'national', country: 'US', isActive: true },
      { name: 'Veterans Day', date: '2025-11-11', type: 'national', country: 'US', isActive: true },
      { name: 'Thanksgiving', date: '2025-11-27', type: 'national', country: 'US', isActive: true },
      { name: 'Christmas Day', date: '2025-12-25', type: 'national', country: 'US', isActive: true },

      // Global Holidays
      { name: 'Christmas Eve', date: '2024-12-24', type: 'religious', isActive: true },
      { name: 'Christmas Eve', date: '2025-12-24', type: 'religious', isActive: true },
      { name: 'New Year\'s Eve', date: '2024-12-31', type: 'custom', isActive: true },
      { name: 'New Year\'s Eve', date: '2025-12-31', type: 'custom', isActive: true },
    ];

    for (const holiday of defaultHolidays) {
      this.holidays.set(`${holiday.date}-${holiday.country || 'global'}-${holiday.name}`, holiday);
    }

    this.logger.info('Default holidays initialized');
  }

  /**
   * Check if current date is a holiday
   */
  isHoliday(date: Date = new Date(), country?: string): boolean {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    for (const holiday of this.holidays.values()) {
      if (holiday.date === dateString && holiday.isActive) {
        // If no country specified, check global holidays or if country matches
        if (!country || !holiday.country || holiday.country === country) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get holiday information for a specific date
   */
  getHolidayInfo(date: Date = new Date(), country?: string): HolidayConfig | null {
    const dateString = date.toISOString().split('T')[0];

    for (const holiday of this.holidays.values()) {
      if (holiday.date === dateString && holiday.isActive) {
        if (!country || !holiday.country || holiday.country === country) {
          return holiday;
        }
      }
    }

    return null;
  }

  /**
   * Check if current date is within a holiday period (including surrounding days)
   */
  isHolidayPeriod(date: Date = new Date(), country?: string, includeAdjacentDays: boolean = true): boolean {
    if (this.isHoliday(date, country)) {
      return true;
    }

    if (!includeAdjacentDays) {
      return false;
    }

    // Check day before and after holiday
    const dayBefore = new Date(date);
    dayBefore.setDate(dayBefore.getDate() - 1);

    const dayAfter = new Date(date);
    dayAfter.setDate(dayAfter.getDate() + 1);

    return this.isHoliday(dayBefore, country) || this.isHoliday(dayAfter, country);
  }

  /**
   * Get all holidays for a specific year
   */
  getHolidaysForYear(year: number, country?: string): HolidayConfig[] {
    const holidays: HolidayConfig[] = [];

    for (const holiday of this.holidays.values()) {
      if (holiday.date.startsWith(year.toString()) && holiday.isActive) {
        if (!country || !holiday.country || holiday.country === country) {
          holidays.push(holiday);
        }
      }
    }

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get upcoming holidays
   */
  getUpcomingHolidays(days: number = 30, country?: string): HolidayConfig[] {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
    const upcoming: HolidayConfig[] = [];

    for (const holiday of this.holidays.values()) {
      const holidayDate = new Date(holiday.date);

      if (holidayDate >= now && holidayDate <= futureDate && holiday.isActive) {
        if (!country || !holiday.country || holiday.country === country) {
          upcoming.push(holiday);
        }
      }
    }

    return upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Add custom holiday
   */
  addHoliday(holiday: HolidayConfig): void {
    const key = `${holiday.date}-${holiday.country || 'global'}-${holiday.name}`;
    this.holidays.set(key, holiday);
    this.logger.info(`Added holiday: ${holiday.name} on ${holiday.date}`);
  }

  /**
   * Remove holiday
   */
  removeHoliday(name: string, date: string, country?: string): boolean {
    const key = `${date}-${country || 'global'}-${name}`;
    const deleted = this.holidays.delete(key);

    if (deleted) {
      this.logger.info(`Removed holiday: ${name} on ${date}`);
    }

    return deleted;
  }

  /**
   * Get all holidays
   */
  getAllHolidays(country?: string): HolidayConfig[] {
    const allHolidays: HolidayConfig[] = [];

    for (const holiday of this.holidays.values()) {
      if (holiday.isActive && (!country || !holiday.country || holiday.country === country)) {
        allHolidays.push(holiday);
      }
    }

    return allHolidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Check if holiday affects quiet hours (e.g., should quiet hours be extended)
   */
  shouldExtendQuietHours(holiday: HolidayConfig): boolean {
    // Religious holidays might warrant extended quiet hours
    if (holiday.type === 'religious') {
      return true;
    }

    // Major national holidays might warrant extended quiet hours
    const majorHolidays = ['Christmas Day', 'New Year\'s Day', 'Thanksgiving'];
    if (majorHolidays.includes(holiday.name)) {
      return true;
    }

    return false;
  }

  /**
   * Get holiday-adjusted quiet hours end time
   */
  getHolidayAdjustedQuietHoursEnd(holiday: HolidayConfig, normalEndTime: string): string {
    if (!this.shouldExtendQuietHours(holiday)) {
      return normalEndTime;
    }

    // Extend quiet hours by 2 hours for major holidays
    const [hours, minutes] = normalEndTime.split(':').map(Number);
    if (hours === undefined || minutes === undefined) {
      return normalEndTime; // Return original if parsing fails
    }

    const extendedHours = hours + 2;

    if (extendedHours >= 24) {
      // Next day
      return `${(extendedHours - 24).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    return `${extendedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
