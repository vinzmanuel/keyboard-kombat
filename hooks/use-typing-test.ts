"use client"

import { useRef, useEffect, useCallback, useReducer } from "react"

// Define action types for the reducer
type TypingAction =
  | { type: "SET_INPUT"; payload: string }
  | { type: "SET_INCORRECT"; payload: Set<number> }
  | { type: "SET_COMPLETED"; payload: boolean }
  | { type: "TICK_TIMER" }
  | { type: "RESET" }

// Define state interface
interface TypingState {
  userInput: string
  typedIndex: number
  incorrectChars: Set<number>
  isCompleted: boolean
  timeRemaining: number
}

// Reducer function for complex state management
function typingReducer(state: TypingState, action: TypingAction): TypingState {
  switch (action.type) {
    case "SET_INPUT":
      return {
        ...state,
        userInput: action.payload,
        typedIndex: action.payload.length,
      }
    case "SET_INCORRECT":
      return {
        ...state,
        incorrectChars: action.payload,
      }
    case "SET_COMPLETED":
      return {
        ...state,
        isCompleted: action.payload,
      }
    case "TICK_TIMER":
      const newTime = state.timeRemaining - 1
      return {
        ...state,
        timeRemaining: newTime < 0 ? 0 : newTime,
        isCompleted: newTime <= 0 ? true : state.isCompleted,
      }
    case "RESET":
      return {
        userInput: "",
        typedIndex: 0,
        incorrectChars: new Set(),
        isCompleted: false,
        timeRemaining: 0, // Will be set properly after reset
      }
    default:
      return state
  }
}

interface TypingTestOptions {
  text: string
  enabled: boolean
  duration?: number // in seconds
}

interface TypingTestResult {
  userInput: string
  typedIndex: number
  incorrectChars: Set<number>
  progress: number
  currentWpm: number
  accuracy: number
  isCompleted: boolean
  timeRemaining: number
  handleInputChange: (value: string) => void
  resetTest: () => void
}

export function useTypingTest({ text, enabled, duration }: TypingTestOptions): TypingTestResult {
  // Use reducer for complex state management
  const [state, dispatch] = useReducer(typingReducer, {
    userInput: "",
    typedIndex: 0,
    incorrectChars: new Set<number>(),
    isCompleted: false,
    timeRemaining: duration || 0,
  })

  // Use refs for values that don't need to trigger re-renders
  const startTimeRef = useRef<number | null>(null)
  const currentWpmRef = useRef(0)
  const accuracyRef = useRef(100)
  const timerRef = useRef<number | null>(null)
  const textRef = useRef(text)
  const durationRef = useRef(duration)

  // Update refs when props change
  useEffect(() => {
    textRef.current = text
    durationRef.current = duration
  }, [text, duration])

  // Handle user input - optimized to reduce calculations
  const handleInputChange = useCallback(
    (value: string) => {
      if (!enabled || state.isCompleted) return

      // Start timer on first input
      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now()

        // Start countdown timer if duration is specified
        if (durationRef.current) {
          dispatch({ type: "SET_INPUT", payload: value })

          // Set initial time
          const initialTime = durationRef.current
          state.timeRemaining = initialTime

          // Use requestAnimationFrame for timer to avoid setInterval issues
          let lastTickTime = performance.now()
          const tickTimer = (now: number) => {
            if (state.isCompleted) return

            // Only update every second (1000ms)
            if (now - lastTickTime >= 1000) {
              lastTickTime = now
              dispatch({ type: "TICK_TIMER" })

              // Check if time's up
              if (state.timeRemaining <= 1) {
                return // Stop the animation loop
              }
            }

            timerRef.current = requestAnimationFrame(tickTimer)
          }

          timerRef.current = requestAnimationFrame(tickTimer)
        }
      }

      // Update input state
      dispatch({ type: "SET_INPUT", payload: value })

      // Check each character for correctness - optimized to only check new characters
      const newIncorrectChars = new Set<number>(state.incorrectChars)
      const prevLength = state.userInput.length
      const currentText = textRef.current

      // Only check new characters
      for (let i = prevLength; i < value.length; i++) {
        if (i < currentText.length && value[i] !== currentText[i]) {
          newIncorrectChars.add(i)
        }
      }

      // Remove characters that are no longer in the input
      if (value.length < prevLength) {
        for (let i = value.length; i < prevLength; i++) {
          newIncorrectChars.delete(i)
        }
      }

      dispatch({ type: "SET_INCORRECT", payload: newIncorrectChars })

      // Check completion for non-timed tests
      if (!durationRef.current && value.length >= currentText.length) {
        dispatch({ type: "SET_COMPLETED", payload: true })
      }

      // Calculate stats immediately for responsive UI
      if (startTimeRef.current) {
        const elapsedMinutes = (performance.now() - startTimeRef.current) / 60000
        if (elapsedMinutes > 0) {
          // Calculate WPM (words per minute) with accuracy validation
          const wordsTyped = value.length / 5 // Standard: 5 chars = 1 word

          // Calculate raw WPM
          const rawWpm = Math.round(wordsTyped / elapsedMinutes)

          // Calculate accuracy
          const errorRate = (newIncorrectChars.size / Math.max(1, value.length)) * 100
          const currentAccuracy = Math.round(100 - errorRate)

          // Apply accuracy penalty to WPM to prevent spam typing from inflating WPM
          // If accuracy is below 50%, significantly reduce the effective WPM
          let adjustedWpm = rawWpm
          if (currentAccuracy < 50) {
            adjustedWpm = Math.round(rawWpm * (currentAccuracy / 100))
          } else if (currentAccuracy < 80) {
            adjustedWpm = Math.round(rawWpm * 0.8)
          }

          // Cap WPM at a reasonable maximum to prevent unrealistic values
          currentWpmRef.current = Math.min(200, adjustedWpm)
          accuracyRef.current = currentAccuracy
        }
      }
    },
    [enabled, state.isCompleted],
  )

  // Reset function
  const resetTest = useCallback(() => {
    dispatch({ type: "RESET" })
    startTimeRef.current = null
    currentWpmRef.current = 0
    accuracyRef.current = 100

    // Reset timer
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current)
      timerRef.current = null
    }

    // Reset time remaining
    if (durationRef.current) {
      state.timeRemaining = durationRef.current
    }
  }, [state])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current)
      }
    }
  }, [])

  // Calculate progress percentage - memoized calculation
  const progress = text.length > 0 ? (state.typedIndex / text.length) * 100 : 0

  return {
    userInput: state.userInput,
    typedIndex: state.typedIndex,
    incorrectChars: state.incorrectChars,
    progress,
    currentWpm: currentWpmRef.current,
    accuracy: accuracyRef.current,
    isCompleted: state.isCompleted,
    timeRemaining: state.timeRemaining,
    handleInputChange,
    resetTest,
  }
}
