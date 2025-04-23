import React, { useState, useEffect } from "react";

const KeyboardDisplay = ({ currentWord, typedWord }) => {
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [correctKeys, setCorrectKeys] = useState(new Set());
  const [incorrectKeys, setIncorrectKeys] = useState(new Set());

  // Keyboard layout
  const keyboardRows = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"],
  ];

  // Update active keys based on the next characters to type
  useEffect(() => {
    const nextChars = currentWord.slice(typedWord.length);
    const nextKey = nextChars.length > 0 ? nextChars[0].toLowerCase() : " ";

    setActiveKeys(new Set([nextKey]));

    // Update correct and incorrect keys
    const newCorrectKeys = new Set();
    const newIncorrectKeys = new Set();

    for (let i = 0; i < typedWord.length; i++) {
      const typedChar = typedWord[i].toLowerCase();
      const expectedChar = currentWord[i]?.toLowerCase();

      if (typedChar === expectedChar) {
        newCorrectKeys.add(typedChar);
      } else if (typedChar !== expectedChar) {
        newIncorrectKeys.add(typedChar);
      }
    }

    setCorrectKeys(newCorrectKeys);
    setIncorrectKeys(newIncorrectKeys);
  }, [currentWord, typedWord]);

  // Render a single key
  const renderKey = (key) => {
    let className =
      "w-10 h-10 rounded-md flex items-center justify-center text-sm font-medium transition-all duration-150";

    if (correctKeys.has(key)) {
      className += " bg-emerald-500 text-white";
    } else if (incorrectKeys.has(key)) {
      className += " bg-red-500 text-white";
    } else if (activeKeys.has(key)) {
      className += " bg-blue-500 text-white";
    } else {
      className += " bg-zinc-700 text-zinc-300 hover:bg-zinc-600";
    }

    return (
      <div key={key} className={className}>
        {key}
      </div>
    );
  };

  // Render the space key
  const renderSpaceKey = () => {
    let className =
      "w-32 h-10 rounded-md flex items-center justify-center text-xs font-medium transition-all duration-150";

    if (activeKeys.has(" ")) {
      className += " bg-blue-500 text-white";
    } else {
      className += " bg-zinc-700 text-zinc-300 hover:bg-zinc-600";
    }

    return <div className={className}>SPACE</div>;
  };

  return (
    <div className="keyboard-display">
      <div className="flex flex-col items-center gap-1">
        {keyboardRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-1 justify-center"
            style={{ marginLeft: rowIndex * 10 }}
          >
            {row.map((key) => renderKey(key))}
          </div>
        ))}
        <div className="flex gap-1 mt-1">{renderSpaceKey()}</div>
      </div>
    </div>
  );
};

export default KeyboardDisplay;