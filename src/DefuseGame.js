// src/DefuseGame.js
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

export default function DefuseGame() {
  const size = 5;
  const maxTries = 5;

  // Bomb position
  const [bomb] = useState(() => ({
    row: Math.floor(Math.random() * size),
    col: Math.floor(Math.random() * size),
  }));

  // Click tracking
  const [guesses, setGuesses] = useState([]);
  const won = guesses.some(g => g.row === bomb.row && g.col === bomb.col);
  const lost = !won && guesses.length >= maxTries;
  const triesLeft = maxTries - guesses.length;

  // Streak logic
  const [streak, setStreak] = useState(() => {
    const s = localStorage.getItem("defuseStreak");
    return s ? parseInt(s, 10) : 0;
  });
  const [bestStreak, setBestStreak] = useState(() => {
    const b = localStorage.getItem("defuseBestStreak");
    return b ? parseInt(b, 10) : 0;
  });

  // Update streak on win
  useEffect(() => {
    if (won) {
      const next = streak + 1;
      setStreak(next);
      localStorage.setItem("defuseStreak", next);
      if (next > bestStreak) {
        setBestStreak(next);
        localStorage.setItem("defuseBestStreak", next);
      }
    }
  }, [won]);

  // Reset streak on loss
  useEffect(() => {
    if (lost) {
      setStreak(0);
      localStorage.setItem("defuseStreak", 0);
    }
  }, [lost]);

  // Leaderboard fetch
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    const { data, error } = await supabase
      .from('leaderboard')
      .select('id, name, score')
      .order('score', { ascending: false })
      .limit(10);
    if (!error) setLeaderboard(data);
    setLoadingLeaderboard(false);
  };
  useEffect(() => { fetchLeaderboard(); }, []);

  // Handle cell clicks
  function handleClick(r, c) {
    if (won || lost || guesses.some(g => g.row === r && g.col === c)) return;
    if (navigator.vibrate) navigator.vibrate(100);
    setGuesses([...guesses, { row: r, col: c }]);
  }

  // Hint logic: red only for adjacent (Chebyshev distance = 1)
  function getHint(r, c) {
    const dRow = Math.abs(r - bomb.row);
    const dCol = Math.abs(c - bomb.col);
    const cheb = Math.max(dRow, dCol);
    const manh = dRow + dCol;
    if (cheb === 0) {
      return { text: "💥", color: "grey" };
    }
    if (cheb === 1) {
      return { text: "🔥", color: "red" };
    }
    if (manh <= 4) {
      return { text: "🌡️", color: "orange" };
    }
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
      .insert([{ name, score: bestStreak }]);
    setSubmitting(false);
    if (error) {
      console.error(error);
      alert('Error saving score. Please ensure your Supabase table allows inserts (disable RLS in Supabase).');
    } else {
      setSubmitted(true);
      fetchLeaderboard();
    }
  };

  // Share best streak
  const handleShare = () => {
    const text = `I’ve got a ${bestStreak}-game streak on Defuse 💣 — can you beat it?`;
    const url = 'https://defuse.online';
    if (navigator.share) {
      navigator.share({ title: 'Defuse 💣', text, url });
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      alert("Copied to clipboard!");
    }
  };

  return (
    <div className="crossword-container">
      <h1>Defuse</h1>

      <div className="top-bar" style={{ justifyContent: 'center', gap: '1.5rem' }}>
        <div>Streak: {streak}</div>
        <div>Best: {bestStreak}</div>
      </div>

      <div className="action-bar">
        <button onClick={handleShare}>Share Best Streak</button>
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

      {lost && !submitted && bestStreak > 0 && (
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

      {(won || lost) && (
        <button onClick={() => window.location.reload()}>Play Again</button>
      )}

      <div className="leaderboard">
        <h2>🏆 Leaderboard</h2>
        {loadingLeaderboard ? (
          <p>Loading...</p>
        ) : (
          <ol style={{ listStylePosition: 'inside', paddingLeft: 0 }}>
            {leaderboard.map((row, idx) => (
              <li key={row.id} style={{ margin: '0.25rem 0' }}>
                {row.name} — {row.score}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
