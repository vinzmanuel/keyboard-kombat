import textSamples from "./text-samples.json" assert { type: "json" };

export const commonWords: string[] = (textSamples as any).commonWords;
export const punctuationPhrases: string[] = (textSamples as any).punctuationPhrases;
export const complexSnippets: Record<string, string[]> = (textSamples as any).complexSnippets;

// Local shuffle function
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Generate a random string of simple words
export function generateWordList(count: number): string {
  const result = []
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * commonWords.length)
    result.push(commonWords[randomIndex])
  }
  return result.join(" ")
}

// Main export
export function getTextByType(type: string, language?: string): string {
  switch (type) {
    case "words":
      return generateWordList(200)
    case "punctuation":
      return shuffle(punctuationPhrases).join(" ")
    case "code":
      if (language && complexSnippets[language as keyof typeof complexSnippets]) {
        const snippets = complexSnippets[language as keyof typeof complexSnippets]
        return shuffle(snippets).join("\n\n")
      } else {
        return shuffle(complexSnippets.JavaScript).join("\n\n")
      }
    default:
      return generateWordList(200)
  }
}
