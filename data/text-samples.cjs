// CommonJS duplicate of text-samples.ts for use in server.js
// This file is auto-generated. If you update text-samples.ts, update this too!

const textSamples = require("./text-samples.json");

const commonWords = textSamples.commonWords;
const punctuationPhrases = textSamples.punctuationPhrases;
const complexSnippets = textSamples.complexSnippets;

function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function generateWordList(count) {
    const result = [];
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * commonWords.length);
        result.push(commonWords[randomIndex]);
    }
    return result.join(" ");
}

function getTextByType(type, language) {
    switch (type) {
        case "words":
        return generateWordList(200);
        case "punctuation":
        return shuffle(punctuationPhrases).join(" ");
        case "code":
        if (language && complexSnippets[language]) {
            const snippets = complexSnippets[language];
            return shuffle(snippets).join("\n\n");
        } else {
            return shuffle(complexSnippets.JavaScript).join("\n\n");
        }
        default:
        return generateWordList(200);
    }
}

module.exports = {
    getTextByType
};
