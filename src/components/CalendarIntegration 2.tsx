import React, { useState, useEffect } from "react";
import { CalendarEvent, calendarService } from "../services/calendarService";
import {
  NotificationType,
  notificationService,
} from "../services/notificationService";
import { toast } from "react-hot-toast";
import { Calendar, Clock, Tag, Users, Bell, Share2 } from "lucide-react";
import { CalendarView } from "./CalendarView";

interface CalendarIntegrationProps {
  userId: string;
}

export const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({
  userId,
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: "",
    description: "",
    startTime: new Date(),
    endTime: new Date(),
    isImportant: false,
    reminderTypes: ["browser"],
    tags: [],
    color: "#3B82F6",
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filterTag, setFilterTag] = useState<string>("");

  useEffect(() => {
    loadEvents();
  }, [userId]);

  const loadEvents = async () => {
    try {
      const userEvents = await calendarService.getUserEvents(userId);
      setEvents(userEvents);
    } catch (error) {
      toast.error("Failed to load calendar events");
    }
  };

  const handleExportToCalendar = async (event: CalendarEvent) => {
    try {
      const icalData = await calendarService.generateICalFile(event);
      const blob = new Blob([icalData], {
        type: "text/calendar;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${event.title}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Event exported successfully");
    } catch (error) {
      toast.error("Failed to export event");
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const event: CalendarEvent = {
        id: Date.now().toString(),
        title: newEvent.title || "",
        description: newEvent.description || "",
        startTime: newEvent.startTime || new Date(),
        endTime: newEvent.endTime || new Date(),
        isImportant: newEvent.isImportant || false,
        reminderTime: newEvent.isImportant
          ? new Date(newEvent.startTime!.getTime() - 24 * 60 * 60 * 1000)
          : undefined,
        reminderTypes: newEvent.reminderTypes,
        tags: newEvent.tags,
        color: newEvent.color,
        recurrence: newEvent.recurrence,
      };

      await calendarService.saveEvent(event);
      await loadEvents();
      setNewEvent({
        title: "",
        description: "",
        startTime: new Date(),
        endTime: new Date(),
        isImportant: false,
        reminderTypes: ["browser"],
        tags: [],
        color: "#3B82F6",
      });
      toast.success("Event created successfully");
    } catch (error) {
      toast.error("Failed to create event");
    }
  };

  const handleShareEvent = async (eventId: string, email: string) => {
    try {
      await calendarService.shareEvent(eventId, [email]);
      toast.success("Event shared successfully");
    } catch (error) {
      toast.error("Failed to share event");
    }
  };

  const filteredEvents = filterTag
    ? events.filter((event) => event.tags?.includes(filterTag))
    : events;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Calendar Integration</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-md ${
              view === "list" ? "bg-indigo-600 text-white" : "bg-gray-100"
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 rounded-md ${
              view === "calendar" ? "bg-indigo-600 text-white" : "bg-gray-100"
            }`}
          >
            Calendar View
          </button>
        </div>
      </div>

      {/* Create Event Form */}
      <form
        onSubmit={handleCreateEvent}
        className="mb-8 p-6 bg-white rounded-lg shadow-lg"
      >
        <h3 className="text-lg font-semibold mb-4">Create New Event</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent({ ...newEvent, title: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Color
            </label>
            <input
              type="color"
              value={newEvent.color}
              onChange={(e) =>
                setNewEvent({ ...newEvent, color: e.target.value })
              }
              className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={newEvent.description}
              onChange={(e) =>
                setNewEvent({ ...newEvent, description: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={newEvent.startTime?.toISOString().slice(0, 16)}
              onChange={(e) =>
                setNewEvent({
                  ...newEvent,
                  startTime: new Date(e.target.value),
                })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Time
            </label>
            <input
              type="datetime-local"
              value={newEvent.endTime?.toISOString().slice(0, 16)}
              onChange={(e) =>
                setNewEvent({ ...newEvent, endTime: new Date(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tags
            </label>
            <input
              type="text"
              placeholder="Add tags (comma-separated)"
              onChange={(e) =>
                setNewEvent({
                  ...newEvent,
                  tags: e.target.value.split(",").map((tag) => tag.trim()),
                })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reminder Types
            </label>
            <div className="mt-2 space-y-2">
              {(["browser", "email", "push", "sms"] as NotificationType[]).map(
                (type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newEvent.reminderTypes?.includes(type)}
                      onChange={(e) => {
                        const types = newEvent.reminderTypes || [];
                        setNewEvent({
                          ...newEvent,
                          reminderTypes: e.target.checked
                            ? [...types, type]
                            : types.filter((t) => t !== type),
                        });
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">
                      {type}
                    </span>
                  </label>
                ),
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newEvent.isImportant}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, isImportant: e.target.checked })
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Mark as Important
                </span>
              </label>

              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Events Display */}
      {view === "calendar" ? (
        <CalendarView
          events={events}
          onEventClick={(event) => {
            // Handle event click - you could show a modal with event details
            toast.success(`Selected event: ${event.title}`);
          }}
          onEventUpdate={(event) => {
            // Handle event update
            calendarService.updateEvent(event);
            loadEvents();
            toast.success("Event updated successfully");
          }}
          onEventCreate={(event) => {
            // Handle event creation
            calendarService.saveEvent(event);
            loadEvents();
            toast.success("Event created successfully");
          }}
          onEventDelete={(eventId) => {
            // Handle event deletion
            calendarService.deleteEvent(eventId);
            loadEvents();
            toast.success("Event deleted successfully");
          }}
          onDateClick={(date: Date) => {
            // Handle date click - you could show a modal to create a new event
            setNewEvent({
              ...newEvent,
              startTime: date,
              endTime: new Date(date.getTime() + 60 * 60 * 1000), // 1 hour later
            });
            toast.success(`Selected date: ${date.toLocaleDateString()}`);
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Your Events</h3>
            <div className="flex space-x-2">
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">All Tags</option>
                {Array.from(new Set(events.flatMap((e) => e.tags || []))).map(
                  (tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              style={{ borderLeft: `4px solid ${event.color || "#3B82F6"}` }}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-medium">{event.title}</h4>
                    {event.isImportant && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Important
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">{event.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(event.startTime).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(event.startTime).toLocaleTimeString()} -{" "}
                      {new Date(event.endTime).toLocaleTimeString()}
                    </span>
                    {event.tags && event.tags.length > 0 && (
                      <span className="flex items-center">
                        <Tag className="w-4 h-4 mr-1" />
                        {event.tags.join(", ")}
                      </span>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {event.attendees.length} attendees
                      </span>
                    )}
                    {event.reminderTypes && event.reminderTypes.length > 0 && (
                      <span className="flex items-center">
                        <Bell className="w-4 h-4 mr-1" />
                        {event.reminderTypes.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExportToCalendar(event)}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Export to Calendar"
                  >
                    <Calendar className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      const email = prompt("Enter email to share with:");
                      if (email) handleShareEvent(event.id, email);
                    }}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Share Event"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
