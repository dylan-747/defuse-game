// src/DefuseGame.js
import React, { useState, useEffect } from "react";
import "./App.css";

export default function DefuseGame() {
  const size = 5;
  const maxTries = 5;

  // Load streaks from localStorage
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem("defuseStreak");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [bestStreak, setBestStreak] = useState(() => {
    const saved = localStorage.getItem("defuseBestStreak");
    return saved ? parseInt(saved, 10) : 0;
  });

  // Pick bomb once
  const [bomb] = useState(() => ({
    row: Math.floor(Math.random() * size),
    col: Math.floor(Math.random() * size),
  }));

  // Track your clicks
  const [guesses, setGuesses] = useState([]);
  const triesLeft = maxTries - guesses.length;

  function handleClick(r, c) {
    if (triesLeft === 0 || guesses.some((g) => g.row === r && g.col === c))
      return;
    setGuesses([...guesses, { row: r, col: c }]);
  }

  function getHint(r, c) {
    const dist = Math.abs(r - bomb.row) + Math.abs(c - bomb.col);
    if (dist === 0) return { text: "💥", color: "grey" };
    if (dist <= 2) return { text: "🔥", color: "red" };
    if (dist <= 4) return { text: "🌡️", color: "orange" };
    return { text: "❄️", color: "blue" };
  }

  const won = guesses.some((g) => g.row === bomb.row && g.col === bomb.col);
  const lost = !won && guesses.length >= maxTries;

  // Update streaks on win
  useEffect(() => {
    if (won) {
      const next = streak + 1;
      setStreak(next);
      localStorage.setItem("defuseStreak", next);
      const storedBest =
        parseInt(localStorage.getItem("defuseBestStreak"), 10) || 0;
      if (next > storedBest) {
        setBestStreak(next);
        localStorage.setItem("defuseBestStreak", next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  // Reset current streak on loss
  useEffect(() => {
    if (lost) {
      setStreak(0);
      localStorage.setItem("defuseStreak", 0);
    }
  }, [lost]);

  // Share best streak to clipboard
  function handleShare() {
    const text = `I’ve got a ${bestStreak}-game defuse streak on Defuse! Can you top it? 🔥`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => alert("Copied to clipboard!"))
        .catch(() => prompt("Copy this text:", text));
    } else {
      prompt("Copy this text:", text);
    }
  }

  return (
    <div className="crossword-container">
      <h1>Defuse</h1>

      <div className="top-bar">
        <div>Streak: {streak}</div>
        <div>Best: {bestStreak}</div>
      </div>

      <button onClick={handleShare}>Share Best Streak</button>

      <div>Tries left: {triesLeft}</div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${size}, 40px)`,
          gridTemplateRows: `repeat(${size}, 40px)`,
        }}
      >
        {Array(size)
          .fill(0)
          .map((_, r) =>
            Array(size)
              .fill(0)
              .map((_, c) => {
                const guess = guesses.find(
                  (g) => g.row === r && g.col === c
                );
                const isBomb = r === bomb.row && c === bomb.col;
                let content = "";
                let style = {};

                if (guess) {
                  const hint = getHint(r, c);
                  content = hint.text;
                  style = { background: hint.color };
                }

                if ((won || lost) && isBomb) {
                  content = "💣";
                  style = { background: "black", color: "white" };
                }

                return (
                  <div
                    key={`${r}-${c}`}
                    className="cell"
                    style={style}
                    onClick={() => handleClick(r, c)}
                  >
                    {content}
                  </div>
                );
              })
          )}
      </div>

      {won && <div className="win-banner">You defused it! 🎉</div>}
      {lost && <div className="lose-banner">Boom! 💥 Game over.</div>}

      {(won || lost) && (
        <button onClick={() => window.location.reload()}>Play Again</button>
      )}
    </div>
  );
}
