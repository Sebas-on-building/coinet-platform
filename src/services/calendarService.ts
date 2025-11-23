import ICAL from "ical.js";
import schedule from "node-schedule";
import { Redis } from "ioredis";
import { notificationService, NotificationType } from "./notificationService";
import { toast } from "react-hot-toast";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isImportant: boolean;
  reminderTime?: Date;
  reminderTypes?: NotificationType[];
  recurrence?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    endDate?: Date;
  };
  color?: string;
  tags?: string[];
  attendees?: string[];
}

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  score: number; // Higher score means better time slot
}

export class CalendarService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis();
  }

  /**
   * Generate an iCal file for a calendar event
   */
  async generateICalFile(event: CalendarEvent): Promise<string> {
    const jcalData = new ICAL.Component('vcalendar');
    jcalData.addProperty(new ICAL.Property.fromData(['prodid', '', 'TEXT', 'coinet/calendar']));

    const jcalEvent = new ICAL.Component('vevent');
    jcalEvent.addProperty(new ICAL.Property.fromData(['uid', '', 'TEXT', event.id]));
    jcalEvent.addProperty(new ICAL.Property.fromData(['dtstamp', '', 'DATE-TIME', new Date()]));
    jcalEvent.addProperty(new ICAL.Property.fromData(['dtstart', '', 'DATE-TIME', event.startTime]));
    jcalEvent.addProperty(new ICAL.Property.fromData(['dtend', '', 'DATE-TIME', event.endTime]));
    jcalEvent.addProperty(new ICAL.Property.fromData(['summary', '', 'TEXT', event.title]));
    jcalEvent.addProperty(new ICAL.Property.fromData(['description', '', 'TEXT', event.description]));

    if (event.location) {
      jcalEvent.addProperty(new ICAL.Property.fromData(['location', '', 'TEXT', event.location]));
    }

    if (event.recurrence) {
      const rruleData: any = {
        freq: event.recurrence.frequency.toUpperCase(),
        interval: event.recurrence.interval,
      };
      if (event.recurrence.endDate) {
        rruleData.until = event.recurrence.endDate;
      }
      jcalEvent.addProperty(new ICAL.Property.fromData(['rrule', '', 'RECUR', rruleData]));
    }

    if (event.attendees) {
      for (const email of event.attendees) {
        jcalEvent.addProperty(new ICAL.Property.fromData(['attendee', '', 'CAL-ADDRESS', email]));
      }
    }

    jcalData.addSubcomponent(jcalEvent);

    return jcalData.toString();
  }

  /**
   * Save an event to the calendar
   */
  async saveEvent(event: CalendarEvent): Promise<void> {
    const eventKey = `calendar:event:${event.id}`;
    await this.redis.set(eventKey, JSON.stringify(event));

    if (event.isImportant && event.reminderTime) {
      this.scheduleReminder(event);
    }

    if (event.recurrence) {
      this.scheduleRecurringEvent(event);
    }
  }

  /**
   * Schedule a reminder for an important event
   */
  private scheduleReminder(event: CalendarEvent): void {
    if (!event.reminderTime) return;

    schedule.scheduleJob(event.reminderTime, async () => {
      const reminderTypes = event.reminderTypes || ["browser"];

      for (const type of reminderTypes) {
        await notificationService.sendNotification({
          title: `Reminder: ${event.title}`,
          body: event.description,
          userId: event.id,
          type,
          data: {
            eventId: event.id,
            startTime: event.startTime,
            location: event.location,
          },
        });
      }
    });
  }

  /**
   * Schedule a recurring event
   */
  private scheduleRecurringEvent(event: CalendarEvent): void {
    if (!event.recurrence) return;

    const rule = new schedule.RecurrenceRule();
    rule.frequency = event.recurrence.frequency;
    rule.interval = event.recurrence.interval;

    if (event.recurrence.endDate) {
      rule.end = event.recurrence.endDate;
    }

    schedule.scheduleJob(rule, async () => {
      const newEvent = { ...event, id: Date.now().toString() };
      await this.saveEvent(newEvent);
    });
  }

  /**
   * Get all events for a user
   */
  async getUserEvents(userId: string): Promise<CalendarEvent[]> {
    const eventKeys = await this.redis.keys(`calendar:event:${userId}:*`);
    const events: CalendarEvent[] = [];

    for (const key of eventKeys) {
      const eventData = await this.redis.get(key);
      if (eventData) {
        events.push(JSON.parse(eventData));
      }
    }

    return events;
  }

  /**
   * Get events by date range
   */
  async getEventsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    const events = await this.getUserEvents(userId);
    return events.filter(
      (event) => event.startTime >= startDate && event.endTime <= endDate,
    );
  }

  /**
   * Get events by tag
   */
  async getEventsByTag(userId: string, tag: string): Promise<CalendarEvent[]> {
    const events = await this.getUserEvents(userId);
    return events.filter((event) => event.tags?.includes(tag));
  }

  /**
   * Share event with other users
   */
  async shareEvent(eventId: string, userIds: string[]): Promise<void> {
    const eventKey = `calendar:event:${eventId}`;
    const eventData = await this.redis.get(eventKey);

    if (eventData) {
      const event = JSON.parse(eventData) as CalendarEvent;
      event.attendees = [...(event.attendees || []), ...userIds];
      await this.saveEvent(event);
    }
  }

  private findConflicts(
    event: CalendarEvent,
    excludeEventId?: string,
  ): CalendarEvent[] {
    return this.events.filter((existingEvent) => {
      if (existingEvent.id === excludeEventId) return false;

      const existingStart = new Date(existingEvent.startTime);
      const existingEnd = new Date(existingEvent.endTime);
      const newStart = new Date(event.startTime);
      const newEnd = new Date(event.endTime);

      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });
  }

  private findAvailableTimeSlots(
    date: Date,
    duration: number,
    startHour: number = 9,
    endHour: number = 17,
    excludeEventId?: string,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const dayStart = new Date(date);
    dayStart.setHours(startHour, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, 0, 0, 0);

    // Get all events for the day
    const dayEvents = this.events.filter((event) => {
      if (event.id === excludeEventId) return false;
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });

    // Sort events by start time
    dayEvents.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    // Find gaps between events
    let currentTime = new Date(dayStart);
    for (const event of dayEvents) {
      const eventStart = new Date(event.startTime);
      const gap = eventStart.getTime() - currentTime.getTime();
      const gapMinutes = gap / (1000 * 60);

      if (gapMinutes >= duration) {
        const score = this.calculateTimeSlotScore(currentTime, gapMinutes);
        slots.push({
          startTime: new Date(currentTime),
          endTime: new Date(currentTime.getTime() + duration * 60 * 1000),
          score,
        });
      }
      currentTime = new Date(event.endTime);
    }

    // Check gap after last event
    const finalGap = dayEnd.getTime() - currentTime.getTime();
    const finalGapMinutes = finalGap / (1000 * 60);
    if (finalGapMinutes >= duration) {
      const score = this.calculateTimeSlotScore(currentTime, finalGapMinutes);
      slots.push({
        startTime: new Date(currentTime),
        endTime: new Date(currentTime.getTime() + duration * 60 * 1000),
        score,
      });
    }

    return slots.sort((a, b) => b.score - a.score);
  }

  private calculateTimeSlotScore(time: Date, availableMinutes: number): number {
    let score = 0;
    const hour = time.getHours();
    const dayOfWeek = time.getDay();

    // Prefer morning slots (9-12)
    if (hour >= 9 && hour < 12) score += 3;
    // Prefer afternoon slots (13-16)
    else if (hour >= 13 && hour < 16) score += 2;
    // Less preferred: early morning or late afternoon
    else if (hour >= 8 && hour < 9) score += 1;
    else if (hour >= 16 && hour < 17) score += 1;

    // Prefer slots with more buffer time
    score += Math.min(availableMinutes / 30, 4);

    // Prefer weekdays over weekends
    if (dayOfWeek >= 1 && dayOfWeek <= 5) score += 2;

    // Prefer slots that don't break lunch time (12-13)
    if (hour !== 12) score += 1;

    // Prefer slots that align with common meeting durations
    const duration = availableMinutes;
    if (duration % 30 === 0) score += 1;
    if (duration % 60 === 0) score += 2;

    return score;
  }

  async createEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
    const conflicts = this.findConflicts(event as CalendarEvent);

    if (conflicts.length > 0) {
      const duration =
        (new Date(event.endTime).getTime() -
          new Date(event.startTime).getTime()) /
        (1000 * 60);
      const alternativeSlots = this.findAvailableTimeSlots(
        new Date(event.startTime),
        duration,
      );

      if (alternativeSlots.length > 0) {
        const bestSlots = alternativeSlots.slice(0, 3); // Get top 3 suggestions
        const formattedSlots = bestSlots.map((slot) => ({
          time: slot.startTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: slot.startTime.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
          score: slot.score,
        }));

        toast.error(
          `Time slot conflicts with existing events. Suggested alternatives:`,
          {
            duration: 8000,
            action: {
              label: "View Suggestions",
              onClick: () => {
                // Show suggestions in a modal or dropdown
                const suggestions = formattedSlots.map((slot, index) => ({
                  label: `${slot.date} at ${slot.time}`,
                  onClick: () => {
                    const newEvent = {
                      ...event,
                      startTime: bestSlots[index].startTime,
                      endTime: bestSlots[index].endTime,
                    };
                    this.createEvent(newEvent);
                  },
                }));
                // TODO: Implement suggestions UI
                console.log("Suggestions:", suggestions);
              },
            },
          },
        );
        throw new Error("Event time conflict");
      } else {
        toast.error("No available time slots found for this duration");
        throw new Error("No available time slots");
      }
    }

    const newEvent: CalendarEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.events.push(newEvent);
    return newEvent;
  }

  async updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const index = this.events.findIndex((e) => e.id === event.id);
    if (index === -1) {
      throw new Error("Event not found");
    }

    const conflicts = this.findConflicts(event, event.id);
    if (conflicts.length > 0) {
      const duration =
        (new Date(event.endTime).getTime() -
          new Date(event.startTime).getTime()) /
        (1000 * 60);
      const alternativeSlots = this.findAvailableTimeSlots(
        new Date(event.startTime),
        duration,
        9,
        17,
        event.id,
      );

      if (alternativeSlots.length > 0) {
        const bestSlot = alternativeSlots[0];
        const formattedTime = bestSlot.startTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        toast.error(
          `Time slot conflicts with existing events. Suggested alternative: ${formattedTime}`,
          {
            duration: 5000,
            action: {
              label: "Use Suggestion",
              onClick: () => {
                const updatedEvent = {
                  ...event,
                  startTime: bestSlot.startTime,
                  endTime: bestSlot.endTime,
                };
                this.updateEvent(updatedEvent);
              },
            },
          },
        );
        throw new Error("Event time conflict");
      } else {
        toast.error("No available time slots found for this duration");
        throw new Error("No available time slots");
      }
    }

    this.events[index] = event;
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    const index = this.events.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error("Event not found");
    }
    this.events.splice(index, 1);
  }

  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    return this.events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  async getEvent(id: string): Promise<CalendarEvent | null> {
    return this.events.find((event) => event.id === id) || null;
  }

  async getConflicts(event: CalendarEvent): Promise<CalendarEvent[]> {
    return this.findConflicts(event);
  }

  async getAlternativeTimeSlots(
    date: Date,
    duration: number,
    startHour: number = 9,
    endHour: number = 17,
  ): Promise<TimeSlot[]> {
    return this.findAvailableTimeSlots(date, duration, startHour, endHour);
  }
}

// Export a singleton instance
export const calendarService = new CalendarService();
