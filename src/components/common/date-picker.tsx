"use client"

import * as React from "react"
import { format } from "date-fns"
import { Clock } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface DateTimePickerDialogProps {
  /** Current value as a Date object or undefined */
  value?: Date
  /** Callback when date or time changes */
  onChange?: (date: Date | undefined) => void
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  onConfirm?: (date: Date | undefined) => void
}

export function DateTimePickerDialog({
  value,
  onChange,
  open,
  onOpenChange,
  onConfirm
}: DateTimePickerDialogProps) {
  // Split the date and time parts for the UI
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value)
  const [selectedHour, setSelectedHour] = React.useState<string>(
    value ? format(value, "HH") : "12"
  )
  const [selectedMinute, setSelectedMinute] = React.useState<string>(
    value ? format(value, "mm") : "00"
  )

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value) {
      setSelectedDate(value)
      setSelectedHour(format(value, "HH"))
      setSelectedMinute(format(value, "mm"))
    } else {
      setSelectedDate(undefined)
      setSelectedHour("12")
      setSelectedMinute("00")
    }
  }, [value])

  // Generate hours (00-23)
  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  )

  // Generate minutes (00-59)
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  )

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
  }

  // Handle hour selection
  const handleHourChange = (hour: string) => {
    setSelectedHour(hour)
  }

  // Handle minute selection
  const handleMinuteChange = (minute: string) => {
    setSelectedMinute(minute)
  }

  // Handle confirm button click
  const handleConfirm = () => {
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setHours(parseInt(selectedHour, 10))
      newDate.setMinutes(parseInt(selectedMinute, 10))
      newDate.setSeconds(0)
      newDate.setMilliseconds(0)
      onChange?.(newDate)
      if (onConfirm) onConfirm(newDate)
    } else {
      onChange?.(undefined)
      if (onConfirm) onConfirm(undefined)
    }
    onOpenChange(false)
  }

  // Handle cancel button click
  const handleCancel = () => {
    // Reset to the original value
    if (value) {
      setSelectedDate(value)
      setSelectedHour(format(value, "HH"))
      setSelectedMinute(format(value, "mm"))
    } else {
      setSelectedDate(undefined)
      setSelectedHour("12")
      setSelectedMinute("00")
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-xl shadow-lg border-primary/10">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold text-primary">Select Date and Time</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4">
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 mb-4 mx-auto">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="mx-auto"
            />
          </div>
          <Separator className="my-4" />
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Clock className="h-4 w-4" />
              <span>Set Time</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="hour-select" className="text-xs text-muted-foreground">
                  Hour
                </label>
                <Select value={selectedHour} onValueChange={handleHourChange}>
                  <SelectTrigger id="hour-select" className="bg-primary/5 border-primary/10 w-full">
                    <SelectValue placeholder="Hour" className="w-full" />
                  </SelectTrigger>
                  <SelectContent className="h-60">
                    {hours.map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="minute-select" className="text-xs text-muted-foreground">
                  Minute
                </label>
                <Select value={selectedMinute} onValueChange={handleMinuteChange}>
                  <SelectTrigger id="minute-select" className="bg-primary/5 border-primary/10 w-full">
                    <SelectValue placeholder="Minute" className="w-full" />
                  </SelectTrigger>
                  <SelectContent className="h-60">
                    {minutes.map((minute) => (
                      <SelectItem key={minute} value={minute}>
                        {minute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="bg-muted/30 px-6 py-4">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="px-6">
              Confirm
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
