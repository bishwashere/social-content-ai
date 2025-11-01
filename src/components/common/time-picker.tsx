"use client"

import * as React from "react"
import { Clock } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TimePickerDialogProps {
  /** Current value as "HH:mm" string or undefined */
  value?: string
  /** Callback when time changes */
  onChange?: (time: string | undefined) => void
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange?: (open: boolean) => void
  /** Callback when confirm is clicked */
  onConfirm?: (time: string | undefined) => void
}

export function TimePickerDialog({
  value,
  onChange,
  open,
  onOpenChange,
  onConfirm
}: TimePickerDialogProps) {
  // Split the time parts for the UI
  const [selectedHour, setSelectedHour] = React.useState<string>(
    value ? value.split(":")[0] : "12"
  )
  const [selectedMinute, setSelectedMinute] = React.useState<string>(
    value ? value.split(":")[1] : "00"
  )

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value) {
      const [hour, minute] = value.split(":")
      setSelectedHour(hour || "12")
      setSelectedMinute(minute || "00")
    } else {
      setSelectedHour("12")
      setSelectedMinute("00")
    }
  }, [value])

  // Generate hours (00-23)
  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  )

  // Generate minutes (00-59, in 5-minute intervals for better UX)
  const minutes = Array.from({ length: 12 }, (_, i) =>
    (i * 5).toString().padStart(2, "0")
  )

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
    const timeString = `${selectedHour}:${selectedMinute}`
    onChange?.(timeString)
    if (onConfirm) onConfirm(timeString)
    onOpenChange?.(false)
  }

  // Handle cancel button click
  const handleCancel = () => {
    // Reset to the original value
    if (value) {
      const [hour, minute] = value.split(":")
      setSelectedHour(hour || "12")
      setSelectedMinute(minute || "00")
    } else {
      setSelectedHour("12")
      setSelectedMinute("00")
    }
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-xl shadow-lg border-primary/10">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold text-primary flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Select Time
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Hour
                </label>
                <Select value={selectedHour} onValueChange={handleHourChange}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {hours.map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-2xl font-bold mt-6">:</span>
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Minute
                </label>
                <Select value={selectedMinute} onValueChange={handleMinuteChange}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {minutes.map((minute) => (
                      <SelectItem key={minute} value={minute}>
                        {minute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Selected: {selectedHour}:{selectedMinute}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

