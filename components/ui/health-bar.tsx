import { cn } from "@/lib/utils"

interface HealthBarProps {
  currentHealth: number
  maxHealth: number
  playerName: string
  className?: string
}

export default function HealthBar({ currentHealth, maxHealth, playerName, className }: HealthBarProps) {
  const healthPercentage = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100))

  // Determine color based on health percentage
  let healthColor = "bg-green-500"
  if (healthPercentage < 30) {
    healthColor = "bg-red-500"
  } else if (healthPercentage < 60) {
    healthColor = "bg-yellow-500"
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between mb-2">
        <span className="text-xl font-bold text-white uppercase">{playerName}</span>
        <span className="text-xl font-bold text-white">{Math.round(healthPercentage)}%</span>
      </div>
      <div className="w-full h-8 bg-gray-800 border-4 border-gray-600 rounded-md overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", healthColor, healthPercentage < 30 && "animate-pulse")}
          style={{ width: `${healthPercentage}%` }}
        >
          {/* Health segments */}
          <div className="h-full w-full flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-full border-r-2 border-black/30 flex-1 last:border-r-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
