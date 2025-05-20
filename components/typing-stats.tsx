import { memo } from "react"

interface TypingStatsProps {
  wpm: number
  accuracy: number
  timeRemaining?: number
  mode: "simulation" | "interactive"
  targetWpm?: number
}

const TypingStats = memo(function TypingStats({ wpm, accuracy, timeRemaining, mode, targetWpm }: TypingStatsProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg mb-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-blue-600">{wpm}</div>
        <div className="text-sm text-gray-500">WPM</div>
      </div>

      {mode === "interactive" && (
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-green-600">{accuracy}%</div>
          <div className="text-sm text-gray-500">Accuracy</div>
        </div>
      )}

      {timeRemaining !== undefined && timeRemaining > 0 && (
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-yellow-600">{timeRemaining}</div>
          <div className="text-sm text-gray-500">Seconds</div>
        </div>
      )}

      {mode === "simulation" && targetWpm && (
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-purple-600">{targetWpm}</div>
          <div className="text-sm text-gray-500">Target WPM</div>
        </div>
      )}
    </div>
  )
})

export default TypingStats
