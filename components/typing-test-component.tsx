"use client"

import type React from "react"

import { useRef, useEffect, useCallback, memo } from "react"
import { useTypingSimulation } from "@/hooks/use-typing-simulation"
import { useTypingTest } from "@/hooks/use-typing-test"
import OptimizedTextDisplay from "./optimized-text-display"
import ProgressBar from "./ui/progress-bar"

interface TypingTestProps {
  mode: "simulation" | "interactive"
  wpm?: number
  text: string
  className?: string
  duration?: number // in seconds
  disabled?: boolean
  onProgress?: (stats: { wpm: number; accuracy: number }) => void
  onComplete?: (stats: { wpm: number; accuracy: number; time: number; charsTyped: number }) => void
  onReset?: () => void // Add this prop
}

// Main component
function TypingTest({
  mode = "simulation",
  wpm = 60,
  text,
  className = "",
  duration,
  disabled = false,
  onProgress,
  onComplete,
  onReset,
}: TypingTestProps) {
  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const startTimeRef = useRef<number | null>(null)
  const completedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Simulation mode hook
  const simulation = useTypingSimulation({
    text,
    wpm,
    enabled: mode === "simulation" && !disabled,
  })

  // Interactive mode hook
  const interactive = useTypingTest({
    text,
    enabled: mode === "interactive" && !disabled,
    duration,
  })

  // Determine which values to use based on mode
  const typedIndex = mode === "simulation" ? simulation.typedIndex : interactive.typedIndex
  const currentWpm = mode === "simulation" ? simulation.currentWpm : interactive.currentWpm
  const isCompleted = mode === "simulation" ? simulation.isCompleted : interactive.isCompleted
  const resetTest = mode === "simulation" ? simulation.resetSimulation : interactive.resetTest
  const accuracy = mode === "interactive" ? interactive.accuracy : 100
  const timeRemaining = mode === "interactive" ? interactive.timeRemaining : undefined
  const progress = mode === "simulation" ? simulation.progress : (typedIndex / text.length) * 100

  // Handler to combine parent and internal reset
  const handleReset = useCallback(() => {
    resetTest()
    if (onReset) onReset()
  }, [onReset, resetTest])

  // Report progress periodically
  useEffect(() => {
    if (mode === "interactive" && onProgress && !disabled) {
      // Clear any existing interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }

      // Set up new interval to report progress
      progressIntervalRef.current = setInterval(() => {
        onProgress({
          wpm: currentWpm,
          accuracy: accuracy,
        })
      }, 1000)
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [mode, onProgress, currentWpm, accuracy, disabled])

  // Handle keyboard input for interactive mode
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (mode !== "interactive" || interactive.isCompleted || disabled) return

      // Prevent Tab from autocompleting a word
      if (e.key === "Tab") {
        e.preventDefault()
        // Do not autocomplete or advance on Tab
        return
      }

      // Prevent default behavior for Tab key to avoid losing focus
      if (e.key === "Tab") {
        e.preventDefault()

        // Simulate typing the next word when Tab is pressed
        const currentPosition = interactive.userInput.length
        const nextSpaceIndex = text.indexOf(" ", currentPosition)

        if (nextSpaceIndex !== -1) {
          const nextWord = text.substring(currentPosition, nextSpaceIndex + 1)
          interactive.handleInputChange(interactive.userInput + nextWord)
        }
      }
    },
    [mode, interactive, text, disabled],
  )

  // Auto-focus input and maintain focus
  useEffect(() => {
    if (mode === "interactive" && !disabled) {
      // Always focus input on mount and when mode/disabled changes
      inputRef.current?.focus();
    }

    // Add click handler to maintain focus
    const handleContainerClick = () => {
      if (mode === "interactive" && !interactive.isCompleted && !disabled) {
        inputRef.current?.focus();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("click", handleContainerClick);
    }

    return () => {
      if (container) {
        container.removeEventListener("click", handleContainerClick);
      }
    };
  }, [mode, interactive.isCompleted, disabled, text]);

  // Track completion and call onComplete
  useEffect(() => {
    if (isCompleted && !completedRef.current && onComplete) {
      completedRef.current = true
      const endTime = performance.now()
      const startTime = startTimeRef.current || endTime
      const totalTime = (endTime - startTime) / 1000 // in seconds

      onComplete({
        wpm: currentWpm,
        accuracy: accuracy,
        time: totalTime,
        charsTyped: typedIndex,
      })
    }
  }, [isCompleted, currentWpm, accuracy, onComplete, typedIndex])

  // Reset completion tracking when test is reset
  useEffect(() => {
    if (typedIndex === 0) {
      completedRef.current = false
      startTimeRef.current = null
    } else if (typedIndex === 1 && startTimeRef.current === null) {
      startTimeRef.current = performance.now()
    }
  }, [typedIndex])

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-lg border-4 border-gray-700 bg-gray-900 shadow-[0_0_20px_rgba(0,0,255,0.3)] ${className} ${
        disabled ? "opacity-70" : ""
      }`}
    >
      {/* Text display area */}
      <div className="p-4 bg-gray-800 rounded-t-lg relative">
        <OptimizedTextDisplay
          text={text}
          typedIndex={typedIndex}
          incorrectChars={mode === "interactive" ? interactive.incorrectChars : new Set()}
          mode={mode}
        />

        {/* Hidden input for interactive mode */}
        {mode === "interactive" && (
          <input
            ref={inputRef}
            type="text"
            value={interactive.userInput}
            onChange={(e) => interactive.handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="opacity-0 absolute inset-0 w-full h-full cursor-text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            autoCapitalize="off"
            disabled={interactive.isCompleted || disabled}
          />
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar
        progress={progress}
        typedIndex={typedIndex}
        totalLength={text.length}
        onReset={handleReset}
        timeRemaining={timeRemaining}
        wpm={currentWpm}
        accuracy={accuracy}
      />
    </div>
  )
}

// Memoize the entire component to prevent unnecessary re-renders
export default memo(TypingTest)
