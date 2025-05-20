"use client"

import { Code, FileText, Type } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModeSelectorProps {
  selectedMode: string
  onModeChange: (mode: string) => void
  selectedLanguage: string
  onLanguageChange: (language: string) => void
  className?: string
}

export default function ModeSelector({
  selectedMode,
  onModeChange,
  selectedLanguage,
  onLanguageChange,
  className,
}: ModeSelectorProps) {
  const modes = [
    { id: "words", label: "WORDS", icon: Type },
    { id: "punctuation", label: "PUNCTUATION", icon: FileText },
    { id: "code", label: "CODE", icon: Code },
  ]

  const languages = [
    { id: "JS", label: "JS" },
    { id: "Python", label: "Python" },
    { id: "Java", label: "Java" },
    { id: "C", label: "C" },
    { id: "C++", label: "C++" },
    { id: "C#", label: "C#" },
  ]

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isSelected = selectedMode === mode.id

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-md border-3 text-lg font-bold transition-colors",
                isSelected
                  ? "bg-yellow-600 border-yellow-400 text-yellow-100"
                  : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700",
              )}
            >
              <Icon size={20} />
              {mode.label}
            </button>
          )
        })}
      </div>

      {selectedMode === "code" && (
        <div className="flex flex-wrap gap-2 mt-3 bg-gray-800 p-4 rounded-md border-2 border-gray-700">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => onLanguageChange(lang.id)}
              className={cn(
                "px-4 py-2 rounded text-base font-medium transition-colors",
                selectedLanguage === lang.id
                  ? "bg-blue-600 text-blue-100"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600",
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
