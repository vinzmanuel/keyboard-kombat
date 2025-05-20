"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getTextByType } from "@/data/text-samples"
import TypingTest from "./typing-test-component"
import ModeSelector from "./ui/mode-selector"
import TimerSelector from "./ui/timer-selector"
import RetroButton from "./ui/retro-button"
import RetroContainer from "./ui/retro-container"
import RetroTitle from "./ui/retro-title"
import TestResultsModal from "./test-results-modal"

export default function PracticeMode() {
  const router = useRouter()
  const [textType, setTextType] = useState("words")
  const [language, setLanguage] = useState("JavaScript")
  const [duration, setDuration] = useState<number | undefined>(60)
  const [text, setText] = useState("")
  const [testResults, setTestResults] = useState<{
    wpm: number
    accuracy: number
    time: number
    charsTyped?: number
    mode?: string
    language?: string
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const sessionRef = useRef(0)
  const [testKey, setTestKey] = useState(0)

  // Track Tab key state for Tab+Enter detection
  const tabPressedRef = useRef(false)

  // Generate text only on client after mount or when mode/language changes
  useEffect(() => {
    setText(getTextByType(textType, language))
  }, [textType, language])

  // Unified reset logic for all reset actions
  const resetTestSession = useCallback((newType?: string, newLang?: string, newDuration?: number | undefined) => {
    sessionRef.current++ // Invalidate previous session/results
    const type = newType ?? textType
    const lang = newLang ?? language
    setText(getTextByType(type, lang))
    setIsModalOpen(false)
    setTestResults(null)
    setTestKey((k) => k + 1) // Force TypingTest remount to clear progress
    if (newType) setTextType(newType)
    if (newLang) setLanguage(newLang)
    if (typeof newDuration !== 'undefined') setDuration(newDuration)
  }, [textType, language])

  // Mode change
  const handleModeChange = useCallback(
    (mode: string) => {
      resetTestSession(mode)
    },
    [resetTestSession],
  )

  // Language change
  const handleLanguageChange = useCallback(
    (lang: string) => {
      resetTestSession(undefined, lang)
    },
    [resetTestSession],
  )

  // Timer change
  const handleDurationChange = useCallback((newDuration: number | undefined) => {
    resetTestSession(undefined, undefined, newDuration)
  }, [resetTestSession])

  // Handle test completion (only show modal if test is finished by time or by typing all text)
  const handleTestComplete = useCallback(
    (stats: { wpm: number; accuracy: number; time: number; charsTyped: number; completedByTimeout?: boolean }) => {
      const thisSession = sessionRef.current
      // Only show results if this is the latest session and the test is actually finished (by time or by typing all text)
      const finishedByText = stats.charsTyped === text.length
      const finishedByTimeout = stats.completedByTimeout === true || (typeof duration === 'number' && stats.time >= duration)
      const noTimeLimit = !duration || duration === 0
      if (
        sessionRef.current === thisSession &&
        ((noTimeLimit && finishedByText) || (!noTimeLimit && (finishedByText || finishedByTimeout)))
      ) {
        setTestResults({ ...stats, mode: textType, language })
        setIsModalOpen(true)
      }
    },
    [textType, language, text.length, duration],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        tabPressedRef.current = true
      }
      if ((e.key === 'Enter' || e.code === 'Enter') && tabPressedRef.current) {
        e.preventDefault()
        resetTestSession()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        tabPressedRef.current = false
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [resetTestSession])

  return (
    <div className="min-h-screen  text-white p-4 flex items-center justify-center">
      <RetroContainer className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <RetroButton onClick={() => router.push("/")} color="blue" size="md" className="mr-4">
              <ArrowLeft size={20} className="mr-2" /> BACK
            </RetroButton>
            <RetroTitle size="md">PRACTICE MODE</RetroTitle>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ModeSelector
            selectedMode={textType}
            onModeChange={handleModeChange}
            selectedLanguage={language}
            onLanguageChange={handleLanguageChange}
          />

          <TimerSelector selectedDuration={duration} onDurationChange={handleDurationChange} />
        </div>

        <div className="mb-8 flex flex-col gap-4">
          <TypingTest
            key={testKey}
            mode="interactive"
            text={text}
            duration={duration}
            onComplete={handleTestComplete}
            onReset={() => resetTestSession()}
          />
        </div>
      </RetroContainer>

      <TestResultsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        results={testResults}
        onTryAgain={() => {
          // Reset progress, keep same text
          sessionRef.current++;
          setIsModalOpen(false);
          setTestResults(null);
          setTestKey((k) => k + 1); // Remount TypingTest to clear progress
        }}
        onContinue={() => {
          // Reset everything, including text
          resetTestSession();
        }}
      />
    </div>
  )
}
