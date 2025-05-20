"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  progress: number
  typedIndex: number
  totalLength: number
  onReset: () => void
  timeRemaining?: number
  wpm: number
  accuracy: number
}

// Memoize the component to prevent unnecessary re-renders
const ProgressBar = memo(function ProgressBar({
  progress,
  typedIndex,
  totalLength,
  onReset,
  timeRemaining,
  wpm,
  accuracy,
}: ProgressBarProps) {
  return (
    <div className="p-6 border-t border-gray-700 bg-gray-900 rounded-b-lg">
      {/* Stats display */}
      <div className="flex flex-wrap justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-blue-900 text-blue-300 rounded text-xl font-bold border-2 border-blue-700">
            {wpm} WPM
          </div>
          <div className="px-4 py-2 bg-green-900 text-green-300 rounded text-xl font-bold border-2 border-green-700">
            {accuracy}% ACC
          </div>
          {timeRemaining !== undefined && (
            <div className="px-4 py-2 bg-yellow-900 text-yellow-300 rounded text-xl font-bold border-2 border-yellow-700">
              {timeRemaining}s
            </div>
          )}
        </div>
        <div className="text-lg text-gray-400 font-mono">
          {typedIndex} / {totalLength}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-800 rounded-full h-5 border-2 border-gray-700 mb-4">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            progress < 30 ? "bg-red-600" : progress < 70 ? "bg-yellow-600" : "bg-green-600",
          )}
          style={{ width: `${progress}%` }}
        >
          {/* Progress segments */}
          <div className="h-full w-full flex">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="h-full border-r border-black/20 flex-1 last:border-r-0" />
            ))}
          </div>
        </div>
      </div>

      {/* Reset button */}
      <div className="flex justify-end">
        <div className="text-gray-400 text-sm pt-3 pr-3">
          Press <span className="text-blue-400"> tab + enter</span> to reset
        </div>
        <button
          onClick={onReset}
          className="text-base bg-gray-800 text-gray-300 px-4 py-2 rounded border-2 border-gray-700 hover:bg-gray-700 transition-colors"
        >
          RESET
        </button>
      </div>
    </div>
  )
})

export default ProgressBar
