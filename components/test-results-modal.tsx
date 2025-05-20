"use client"

import { memo } from "react"
import Modal from "./ui/modal"
import RetroButton from "./ui/retro-button"
import { Trophy } from "lucide-react"

interface TestResultsModalProps {
  isOpen: boolean
  onClose: () => void
  results: {
    wpm: number
    accuracy: number
    time: number
    charsTyped?: number
    mode?: string // Add mode and language for custom message
    language?: string
  } | null
  onTryAgain?: () => void // New: resets progress, keeps text
  onContinue?: () => void // New: resets everything, new text
}

const TestResultsModal = memo(function TestResultsModal({ isOpen, onClose, results, onTryAgain, onContinue }: TestResultsModalProps) {
  if (!results) return null

  // Calculate a score based on WPM and accuracy
  const score = Math.round(results.wpm * (results.accuracy / 100))

  // Custom message logic
  let title = ""
  let subtitle = ""
  let details = ""

  // Helper: animal/creature ranks for words/punctuation
  function getWordsRank(wpm: number) {
    if (wpm < 40) return { title: "You're a Sloth.", subtitle: "Keep practicing and you'll get faster!" }
    if (wpm < 60) return { title: "You're a Cat.", subtitle: "Nice! You type with the grace of a feline." }
    if (wpm < 80) return { title: "You're a Rabbit.", subtitle: "Quick and nimble!" }
    if (wpm < 95) return { title: "You're a Fox.", subtitle: "Sharp and speedy!" }
    if (wpm < 100) return { title: "You're a Cheetah.", subtitle: "Blazing fast!" }
    return { title: "You're an Octopus.", subtitle: "Incredible! You type with many hands!" }
  }

  // Helper: engineering ranks for code
  function getCodeRank(wpm: number) {
    if (wpm < 30) return { title: "You're a Code Newbie", subtitle: "Everyone starts somewhere. Keep coding!" }
    if (wpm < 50) return { title: "You're a Junior Engineer", subtitle: "You type fast... just don't break prod." }
    if (wpm < 70) return { title: "You're a Developer", subtitle: "Solid work! You can ship features." }
    if (wpm < 90) return { title: "You're a Senior Engineer", subtitle: "Fast and reliable!" }
    return { title: "You're a Code Wizard!", subtitle: "Legendary speed. Just don't refactor the universe!" }
  }

  if (results.mode === "code") {
    const rank = getCodeRank(results.wpm)
    title = rank.title
    subtitle = rank.subtitle
    details = `You type ${results.language || "code"} at ${results.wpm} WPM with ${results.accuracy}% accuracy.`
  } else if (results.mode === "punctuation" || results.mode === "words") {
    const rank = getWordsRank(results.wpm)
    title = rank.title
    subtitle = `${rank.subtitle} You type at ${results.wpm} WPM with ${results.accuracy}% accuracy.`
  } else {
    title = "Practice Complete!"
    subtitle = `You typed at ${results.wpm} WPM with ${results.accuracy}% accuracy.`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Trophy className="text-yellow-400" size={64} />
        </div>
        <h2 className="text-4xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600">
          {title}
        </h2>
        <div className="text-2xl text-yellow-400 mb-4">{subtitle}</div>
        {details && <div className="text-lg text-gray-300 mb-6">{details}</div>}
        <div className="grid grid-cols-3 gap-8 mb-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-500">{results.wpm}</div>
            <div className="text-lg text-gray-400">WPM</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-500">{results.accuracy}%</div>
            <div className="text-lg text-gray-400">ACCURACY</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-500">{Math.round(results.time)}s</div>
            <div className="text-lg text-gray-400">TIME</div>
          </div>
        </div>
        <div className="mb-8 p-4 border-4 border-yellow-500 rounded-lg bg-yellow-900/30">
          <div className="text-xl font-bold text-yellow-400 mb-2">TOTAL SCORE</div>
          <div className="text-5xl font-bold text-yellow-300">{score}</div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <RetroButton
            onClick={onTryAgain || (() => {})}
            color="blue"
            size="lg"
            className="px-8"
          >
            Try Again (Same Text)
          </RetroButton>
          <RetroButton
            onClick={onContinue || (() => {})}
            color="green"
            size="lg"
            className="px-8"
          >
            New Text
          </RetroButton>
        </div>
      </div>
    </Modal>
  )
})

export default TestResultsModal
