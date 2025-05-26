// src/DefuseGame.js
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

export default function DefuseGame() {
  const size = 5;
  const maxTries = 5;

  // Supabase leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Local game state
  const [bomb] = useState(() => ({
    row: Math.floor(Math.random() * size),
    col: Math.floor(Math.random() * size),
  }));
  const [guesses, setGuesses] = useState([]);
  const triesLeft = maxTries - guesses.length;
  const won = guesses.some(g => g.row === bomb.row && g.col === bomb.col);
  const lost = !won && guesses.length >= maxTries;

  // Streak logic persisted locally
  const [streak, setStreak] = useState(() => {
    const s = localStorage.getItem("defuseStreak");
    return s ? parseInt(s, 10) : 0;
  });

  useEffect(() => {
    if (won) {
      const next = streak + 1;
      setStreak(next);
      localStorage.setItem("defuseStreak", next);
    }
    if (lost) {
      setStreak(0);
      localStorage.setItem("defuseStreak", 0);
    }
  }, [won, lost]);

  // Leaderboard fetching
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    let { data, error } = await supabase
      .from('leaderboard')
      .select('name, score')
      .order('score', { ascending: false })
      .limit(10);
    if (!error) setLeaderboard(data);
    setLoadingLeaderboard(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Handle cell clicks
  function handleClick(r, c) {
    if (won || lost || guesses.some(g => g.row === r && g.col === c)) return;
    if (navigator.vibrate) navigator.vibrate(100);
    setGuesses([...guesses, { row: r, col: c }]);
  }

  function getHint(r, c) {
    const dist = Math.abs(r - bomb.row) + Math.abs(c - bomb.col);
    if (dist === 0) return { text: "💥", color: "grey" };
    if (dist <= 2) return { text: "🔥", color: "red" };
    if (dist <= 4) return { text: "🌡️", color: "orange" };
    return { text: "❄️", color: "blue" };
  }

  // Submission form state
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitScore = async () => {
    if (!name) return alert('Please enter a name');
    setSubmitting(true);
    const { error } = await supabase
      .from('leaderboard')
      .insert([{ name, score: streak }]);
    setSubmitting(false);
    if (error) {
      alert('Error saving score');
    } else {
      setSubmitted(true);
      fetchLeaderboard();
    }
  };

  return (
    <div className="crossword-container">
      <h1>Defuse</h1>
      <div className="top-bar">
        <div>Streak: {streak}</div>
        <div>Tries left: {triesLeft}</div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, 40px)`, gridTemplateRows: `repeat(${size}, 40px)` }}>
        {Array(size).fill(0).map((_, r) =>
          Array(size).fill(0).map((_, c) => {
            const guess = guesses.find(g => g.row === r && g.col === c);
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
              <div key={`${r}-${c}`} className="cell" style={style} onClick={() => handleClick(r, c)}>
                {content}
              </div>
            );
          })
        )}
      </div>

      {won && <div className="win-banner">You defused it! 🎉</div>}
      {lost && <div className="lose-banner">Boom! 💥 Game over.</div>}

      {/* Submit score form after win */}
      {won && !submitted && (
        <div className="submit-score">
          <input
            type="text"
            placeholder="Enter name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={submitting}
          />
          <button onClick={handleSubmitScore} disabled={submitting}>
            {submitting ? 'Saving...' : 'Submit Score'}
          </button>
        </div>
      )}

      {/* Play again button */}
      {(won || lost) && (
        <button onClick={() => window.location.reload()}>Play Again</button>
      )}

      {/* Leaderboard display */}
      <div className="leaderboard">
        <h2>🏆 Leaderboard</h2>
        {loadingLeaderboard ? (
          <p>Loading...</p>
        ) : (
          <ol>
            {leaderboard.map((row, idx) => (
              <li key={idx}>{row.name} — {row.score}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
