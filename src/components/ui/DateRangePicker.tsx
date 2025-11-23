"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/Button";
import { CalendarIcon } from "@heroicons/react/24/outline";

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  onRangeChange: (range: DateRange) => void;
}

export function DateRangePicker({ onRangeChange }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (!startDate) {
      setStartDate(date);
    } else if (!endDate) {
      setEndDate(date);
      if (date) {
        onRangeChange({
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(date, "yyyy-MM-dd"),
        });
        setIsOpen(false);
      }
    } else {
      setStartDate(date);
      setEndDate(undefined);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[300px] justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {startDate ? (
            endDate ? (
              <>
                {format(startDate, "LLL dd, y")} -{" "}
                {format(endDate, "LLL dd, y")}
              </>
            ) : (
              format(startDate, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: startDate, to: endDate }}
          onSelect={({ from, to }) => {
            if (from) handleDateSelect(from);
            if (to) handleDateSelect(to);
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
