"use client"

import { memo, useRef, useEffect, useMemo } from "react"

interface OptimizedTextDisplayProps {
  text: string
  typedIndex: number
  incorrectChars: Set<number>
  mode: "simulation" | "interactive"
}

// Memoize the component to prevent unnecessary re-renders
const OptimizedTextDisplay = memo(function OptimizedTextDisplay({
  text,
  typedIndex,
  incorrectChars,
  mode,
}: OptimizedTextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)

  // For practice mode, render the full text (no virtualization)
  if (mode === "interactive") {
    // Auto-scroll the cursor into view on every keystroke, but use 'nearest' for smoother experience
    useEffect(() => {
      if (cursorRef.current) {
        cursorRef.current.scrollIntoView({ block: "center", behavior: "smooth" })
      }
    }, [typedIndex])

    return (
      <div
        ref={containerRef}
        className="font-mono text-3xl leading-relaxed whitespace-pre-wrap h-[250px] overflow-y-auto scrollbar-hide relative bg-gray-900 p-6 rounded-md border border-gray-700"
      >
        {/* Characters before cursor */}
        <span className="text-green-500">
          {Array.from(text.substring(0, typedIndex)).map((char, i) => {
            const isIncorrect = incorrectChars.has(i)
            return (
              <span key={i} className={isIncorrect ? "text-red-500 bg-red-900/30" : ""}>
                {char}
              </span>
            )
          })}
        </span>

        {/* Current cursor */}
        <span ref={cursorRef} className="bg-yellow-500 text-black animate-pulse">{text.charAt(typedIndex) || " "}</span>

        {/* Characters after cursor */}
        <span className="text-gray-500">{text.substring(typedIndex + 1)}</span>
      </div>
    )
  }

  // Calculate visible range for virtualization
  const visibleRange = useMemo(() => {
    const charsPerLine = 40 // Reduced chars per line for larger text
    const visibleLines = 5
    const charsBuffer = charsPerLine * visibleLines

    const middleLine = Math.floor(typedIndex / charsPerLine)
    const startLine = Math.max(0, middleLine - Math.floor(visibleLines / 2))
    const endLine = startLine + visibleLines + 1 // +1 for partial lines

    const start = Math.max(0, startLine * charsPerLine)
    const end = Math.min(text.length, endLine * charsPerLine)

    return { start, end }
  }, [typedIndex, text.length])

  // Improved auto-scroll logic - always keep cursor visible
  useEffect(() => {
    if (cursorRef.current) {
      cursorRef.current.scrollIntoView({ block: "center", behavior: "smooth" })
    }
  }, [typedIndex])

  // Prepare text segments for efficient rendering
  const textSegments = useMemo(() => {
    // Add buffer before and after visible range
    const charsPerLine = 40
    const bufferStart = Math.max(0, visibleRange.start - charsPerLine)
    const bufferEnd = Math.min(text.length, visibleRange.end + charsPerLine)

    // Create segments for before, visible, and after
    const beforeCursor = text.substring(bufferStart, typedIndex)
    const cursor = text.charAt(typedIndex) || " "
    const afterCursor = text.substring(typedIndex + 1, bufferEnd)

    return { bufferStart, beforeCursor, cursor, afterCursor }
  }, [text, typedIndex, visibleRange])

  return (
    <div
      ref={containerRef}
      className="font-mono text-3xl leading-relaxed whitespace-pre-wrap h-[250px] overflow-y-auto scrollbar-hide relative bg-gray-900 p-6 rounded-md border border-gray-700"
    >
      {/* Characters before cursor */}
      <span className="text-green-500">
        {Array.from(textSegments.beforeCursor).map((char, i) => {
          const index = textSegments.bufferStart + i
          const isIncorrect = incorrectChars.has(index)
          return (
            <span key={index} className={isIncorrect ? "text-red-500 bg-red-900/30" : ""}>
              {char}
            </span>
          )
        })}
      </span>

      {/* Current cursor */}
      <span ref={cursorRef} className="bg-yellow-500 text-black animate-pulse">{textSegments.cursor}</span>

      {/* Characters after cursor */}
      <span className="text-gray-500">{textSegments.afterCursor}</span>
    </div>
  )
})

export default OptimizedTextDisplay
