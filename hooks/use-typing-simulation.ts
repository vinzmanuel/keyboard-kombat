"use client"

import { useState, useRef, useEffect, useCallback } from "react"

interface TypingSimulationOptions {
  text: string
  wpm: number
  enabled: boolean
}

interface TypingSimulationResult {
  typedIndex: number
  progress: number
  currentWpm: number
  isCompleted: boolean
  resetSimulation: () => void
}

export function useTypingSimulation({ text, wpm, enabled }: TypingSimulationOptions): TypingSimulationResult {
  const [typedIndex, setTypedIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  // Use refs for values that don't need to trigger re-renders
  const startTimeRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const prevWpmRef = useRef(wpm)
  const currentWpmRef = useRef(0)

  // Calculate characters per millisecond based on WPM
  // Average word length is 5 characters + 1 space
  const getCharsPerMs = useCallback((currentWpm: number) => (currentWpm * 6) / 60000, [])

  // Reset function
  const resetSimulation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setTypedIndex(0)
    setIsCompleted(false)
    startTimeRef.current = null
    currentWpmRef.current = 0
  }, [])

  // Animation loop
  useEffect(() => {
    if (!enabled || isCompleted) return

    // Start the animation if not already started
    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now()
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) return

      // If WPM changed, adjust the timing
      if (prevWpmRef.current !== wpm) {
        // Recalculate the startTime to maintain the current position with new speed
        const elapsedTime = timestamp - startTimeRef.current
        const charsTyped = typedIndex
        const newCharsPerMs = getCharsPerMs(wpm)
        const newStartTime = timestamp - charsTyped / newCharsPerMs

        startTimeRef.current = newStartTime
        prevWpmRef.current = wpm
      }

      // Calculate how many characters should be typed by now
      const elapsedTime = timestamp - startTimeRef.current
      const charsPerMs = getCharsPerMs(wpm)
      const expectedChars = Math.floor(elapsedTime * charsPerMs)

      // Add some natural variation (±10% of the speed)
      const variation = 1 + (Math.random() * 0.2 - 0.1)
      const adjustedExpectedChars = Math.floor(expectedChars * variation)

      // Update the typed index if needed
      if (adjustedExpectedChars > typedIndex && typedIndex < text.length) {
        setTypedIndex(Math.min(adjustedExpectedChars, text.length))
      }

      // Calculate current WPM (for display only)
      if (elapsedTime > 0) {
        currentWpmRef.current = Math.round(typedIndex / 6 / (elapsedTime / 60000))
      }

      // Check completion
      if (typedIndex >= text.length && !isCompleted) {
        setIsCompleted(true)
      }

      // Continue animation if not finished
      if (typedIndex < text.length) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    // Start animation
    animationRef.current = requestAnimationFrame(animate)

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [enabled, wpm, typedIndex, text, isCompleted, getCharsPerMs])

  // Calculate progress percentage
  const progress = text.length > 0 ? (typedIndex / text.length) * 100 : 0

  return {
    typedIndex,
    progress,
    currentWpm: currentWpmRef.current,
    isCompleted,
    resetSimulation,
  }
}
