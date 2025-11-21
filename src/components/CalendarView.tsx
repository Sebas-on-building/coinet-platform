import React, { useState, useMemo } from "react";
import { CalendarEvent } from "../services/calendarService";
import { ChevronLeft, ChevronRight, Calendar, Clock, Copy } from "lucide-react";
import { toast } from "react-hot-toast";

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventCreate: (event: CalendarEvent) => void;
  onEventDelete: (id: string) => void;
}

type ViewType = "month" | "week" | "day";
type ResizeDirection = "start" | "end" | null;

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onEventClick,
  onDateClick,
  onEventUpdate,
  onEventCreate,
  onEventDelete,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null);
  const [resizeStartTime, setResizeStartTime] = useState<number | null>(null);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentDate]);

  const firstDayOfMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1).getDay();
  }, [currentDate]);

  const monthName = useMemo(() => {
    return currentDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  const checkEventConflict = (
    event: CalendarEvent,
    newStartTime: Date,
    newEndTime: Date,
  ): boolean => {
    return events.some((existingEvent) => {
      if (existingEvent.id === event.id) return false;

      const existingStart = new Date(existingEvent.startTime);
      const existingEnd = new Date(existingEvent.endTime);

      return (
        (newStartTime >= existingStart && newStartTime < existingEnd) ||
        (newEndTime > existingStart && newEndTime <= existingEnd) ||
        (newStartTime <= existingStart && newEndTime >= existingEnd)
      );
    });
  };

  const handleDragStart = (event: CalendarEvent, e: React.DragEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.setData("text/plain", event.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (date: Date, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDate(date);
  };

  const handleDrop = (date: Date, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedEvent) return;

    const newStartTime = new Date(date);
    const duration =
      new Date(draggedEvent.endTime).getTime() -
      new Date(draggedEvent.startTime).getTime();
    const newEndTime = new Date(newStartTime.getTime() + duration);

    if (checkEventConflict(draggedEvent, newStartTime, newEndTime)) {
      toast.error("Event conflict detected! Please choose a different time.");
      return;
    }

    const updatedEvent = {
      ...draggedEvent,
      startTime: newStartTime,
      endTime: newEndTime,
    };

    onEventUpdate(updatedEvent);
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const handleResizeStart = (
    event: CalendarEvent,
    direction: ResizeDirection,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setResizingEvent(event);
    setResizeDirection(direction);
    setResizeStartTime(e.clientY);
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!resizingEvent || !resizeDirection || !resizeStartTime) return;

    const deltaY = e.clientY - resizeStartTime;
    const deltaMinutes = Math.round(deltaY / 30); // 30px per hour

    const newEvent = { ...resizingEvent };
    if (resizeDirection === "start") {
      const newStartTime = new Date(newEvent.startTime);
      newStartTime.setMinutes(newStartTime.getMinutes() + deltaMinutes);
      if (newStartTime < new Date(newEvent.endTime)) {
        newEvent.startTime = newStartTime;
      }
    } else {
      const newEndTime = new Date(newEvent.endTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + deltaMinutes);
      if (newEndTime > new Date(newEvent.startTime)) {
        newEvent.endTime = newEndTime;
      }
    }

    const hasConflicts = checkEventConflict(
      newEvent,
      newEvent.startTime,
      newEvent.endTime,
    );
    if (!hasConflicts) {
      onEventUpdate(newEvent);
    }
  };

  const handleResizeEnd = () => {
    setResizingEvent(null);
    setResizeDirection(null);
    setResizeStartTime(null);
  };

  const handleDuplicateEvent = (event: CalendarEvent) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: Date.now().toString(),
      title: `${event.title} (Copy)`,
      startTime: new Date(event.startTime.getTime() + 24 * 60 * 60 * 1000), // Next day
      endTime: new Date(event.endTime.getTime() + 24 * 60 * 60 * 1000),
    };

    // Check for conflicts with the new time
    const hasConflicts = checkEventConflict(newEvent);
    if (hasConflicts) {
      toast.error("Cannot duplicate event due to conflicts");
      return;
    }

    onEventCreate(newEvent);
    toast.success("Event duplicated successfully");
  };

  const renderEvent = (event: CalendarEvent, isDragging: boolean = false) => {
    const startHour = new Date(event.startTime).getHours();
    const startMinute = new Date(event.startTime).getMinutes();
    const endHour = new Date(event.endTime).getHours();
    const endMinute = new Date(event.endTime).getMinutes();

    const top = (startHour + startMinute / 60) * 60; // 60px per hour
    const height =
      (endHour + endMinute / 60 - (startHour + startMinute / 60)) * 60;

    return (
      <div
        key={event.id}
        draggable
        onDragStart={(e) => handleDragStart(event, e)}
        onDragEnd={handleDragEnd}
        className={`absolute left-0 right-0 mx-2 rounded cursor-pointer hover:bg-opacity-90 ${
          isDragging ? "opacity-50" : ""
        }`}
        style={{
          backgroundColor: event.color || "#3B82F6",
          color: "#fff",
          top: `${top}px`,
          height: `${height}px`,
          zIndex: isDragging ? 10 : 1,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onEventClick(event);
        }}
      >
        <div className="flex flex-col h-full p-1">
          <div
            className="h-2 cursor-ns-resize"
            onMouseDown={(e) => handleResizeStart(event, "start", e)}
          />
          <div className="flex-1 overflow-hidden">
            <div className="text-xs font-medium truncate">{event.title}</div>
            <div className="text-xs opacity-75 truncate">
              {new Date(event.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -
              {new Date(event.endTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div
            className="h-2 cursor-ns-resize"
            onMouseDown={(e) => handleResizeStart(event, "end", e)}
          />
        </div>
        <div className="flex space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicateEvent(event);
            }}
            className="p-1 hover:bg-black/10 rounded"
            title="Duplicate event"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEventDelete(event.id);
            }}
            className="p-1 hover:bg-black/10 rounded"
            title="Delete event"
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = 42; // 6 rows of 7 days
    const prevMonthDays = firstDayOfMonth;
    const currentMonthDays = daysInMonth;
    const nextMonthDays = totalDays - prevMonthDays - currentMonthDays;

    // Previous month days
    for (let i = 0; i < prevMonthDays; i++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        currentMonthDays - prevMonthDays + i + 1,
      );
      days.push(
        <div
          key={`prev-${i}`}
          className="p-2 h-32 bg-gray-50 text-gray-400 border border-gray-200"
        >
          <span className="text-sm">{date.getDate()}</span>
        </div>,
      );
    }

    // Current month days
    for (let i = 1; i <= currentMonthDays; i++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        i,
      );
      const dayEvents = getEventsForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();
      const isDragOver = dragOverDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={`current-${i}`}
          className={`p-2 h-32 border border-gray-200 ${
            isToday ? "bg-blue-50" : "bg-white"
          } ${isDragOver ? "bg-indigo-50" : ""}`}
          onClick={() => onDateClick(date)}
          onDragOver={(e) => handleDragOver(date, e)}
          onDrop={(e) => handleDrop(date, e)}
        >
          <div className="flex justify-between items-start">
            <span
              className={`text-sm ${isToday ? "font-bold text-blue-600" : ""}`}
            >
              {i}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-800 px-1 rounded">
                {dayEvents.length}
              </span>
            )}
          </div>
          <div className="mt-1 space-y-1">
            {dayEvents
              .slice(0, 2)
              .map((event) =>
                renderEvent(event, draggedEvent?.id === event.id),
              )}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>,
      );
    }

    // Next month days
    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        i,
      );
      days.push(
        <div
          key={`next-${i}`}
          className="p-2 h-32 bg-gray-50 text-gray-400 border border-gray-200"
        >
          <span className="text-sm">{date.getDate()}</span>
        </div>,
      );
    }

    return days;
  };

  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const newDate = new Date(start);
      newDate.setDate(start.getDate() + i);
      dates.push(newDate);
    }
    return dates;
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {weekDates.map((date, index) => (
          <div key={index} className="bg-white">
            <div className="p-2 text-center border-b">
              <div className="font-medium">
                {date.toLocaleDateString([], { weekday: "short" })}
              </div>
              <div className="text-sm text-gray-500">{date.getDate()}</div>
            </div>
            <div className="relative h-[720px]">
              {" "}
              {/* 12 hours * 60px */}
              {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-gray-100"
                  style={{ top: `${(hour - 8) * 60}px` }}
                >
                  <div className="absolute -top-3 left-1 text-xs text-gray-400">
                    {hour}:00
                  </div>
                </div>
              ))}
              {events
                .filter((event) => {
                  const eventDate = new Date(event.startTime);
                  return eventDate.toDateString() === date.toDateString();
                })
                .map((event) =>
                  renderEvent(event, draggedEvent?.id === event.id),
                )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDayView = () => {
    return (
      <div className="relative h-[720px] bg-white">
        {" "}
        {/* 12 hours * 60px */}
        {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
          <div
            key={hour}
            className="absolute w-full border-t border-gray-100"
            style={{ top: `${(hour - 8) * 60}px` }}
          >
            <div className="absolute -top-3 left-1 text-xs text-gray-400">
              {hour}:00
            </div>
          </div>
        ))}
        {events
          .filter((event) => {
            const eventDate = new Date(event.startTime);
            return eventDate.toDateString() === currentDate.toDateString();
          })
          .map((event) => renderEvent(event, draggedEvent?.id === event.id))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {currentDate.toLocaleDateString([], {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1 rounded-md ${
                view === "month"
                  ? "bg-indigo-100 text-indigo-700"
                  : "hover:bg-gray-100"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1 rounded-md ${
                view === "week"
                  ? "bg-indigo-100 text-indigo-700"
                  : "hover:bg-gray-100"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView("day")}
              className={`px-3 py-1 rounded-md ${
                view === "day"
                  ? "bg-indigo-100 text-indigo-700"
                  : "hover:bg-gray-100"
              }`}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      <div
        className="relative"
        onMouseMove={handleResizeMove}
        onMouseUp={handleResizeEnd}
        onMouseLeave={handleResizeEnd}
      >
        {view === "month" && renderCalendarDays()}
        {view === "week" && renderWeekView()}
        {view === "day" && renderDayView()}
      </div>
    </div>
  );
};
