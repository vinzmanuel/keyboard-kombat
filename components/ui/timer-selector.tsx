"use client"

import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimerSelectorProps {
  selectedDuration: number | undefined
  onDurationChange: (duration: number | undefined) => void
  className?: string
}

export default function TimerSelector({ selectedDuration, onDurationChange, className }: TimerSelectorProps) {
  const durations = [
    { value: undefined, label: "∞" },
    { value: 15, label: "15s" },
    { value: 30, label: "30s" },
    { value: 60, label: "60s" },
    { value: 120, label: "120s" },
  ]

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-lg font-bold text-gray-300">
        <Clock size={20} />
        <span>TIME LIMIT</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {durations.map((duration) => (
          <button
            key={duration.label}
            onClick={() => onDurationChange(duration.value)}
            className={cn(
              "px-4 py-3 rounded-md border-3 text-lg font-bold transition-colors",
              selectedDuration === duration.value
                ? "bg-purple-600 border-purple-400 text-purple-100"
                : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700",
            )}
          >
            {duration.label}
          </button>
        ))}
      </div>
    </div>
  )
}
