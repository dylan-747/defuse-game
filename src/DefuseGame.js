// src/DefuseGame.js
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";

const THEMES = [
  { key: 'default', label: 'Classic', vars: {} },
  { key: 'red', label: 'Red', vars: { '--bg': '#2b0000', '--cell-bg': '#400000', '--cell-border': '#ff4444', '--fg': '#ffecec' } },
  { key: 'neon', label: 'Neon Green', vars: { '--bg': '#000', '--cell-bg': '#001100', '--cell-border': '#00ff00', '--fg': '#00ff00' } },
  { key: 'gold', label: 'Gold', vars: { '--bg': '#111000', '--cell-bg': '#222000', '--cell-border': '#ffcc00', '--fg': '#ffeb99' } },
];

// Unlock thresholds per theme
const UNLOCKS = { default: 0, red: 5, neon: 10, gold: 20 };

export default function DefuseGame() {
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('defuseTheme') || 'default');
  // Mode state
  const [hardMode, setHardMode] = useState(() => localStorage.getItem('defuseHardMode') === 'true');
  const size = hardMode ? 7 : 5;
  const maxTries = hardMode ? 7 : 5;

  // Apply theme CSS variables and clear previous
  useEffect(() => {
    // remove all theme vars
    const allKeys = THEMES.flatMap(t => Object.keys(t.vars));
    allKeys.forEach(key => document.documentElement.style.removeProperty(key));
    // apply current theme
    const themeObj = THEMES.find(t => t.key === theme) || THEMES[0];
    Object.entries(themeObj.vars).forEach(([key, val]) => {
      document.documentElement.style.setProperty(key, val);
    });
    localStorage.setItem('defuseTheme', theme);
  }, [theme]);

  // Persist mode toggle
  const toggleMode = () => {
    const next = !hardMode;
    setHardMode(next);
    localStorage.setItem('defuseHardMode', next);
    window.location.reload();
  };

  // Bomb position
  const [bomb] = useState(() => ({ row: Math.floor(Math.random() * size), col: Math.floor(Math.random() * size) }));
  // UI state
  const [menuOpen, setMenuOpen] = useState(false);

  // Click tracking
  const [guesses, setGuesses] = useState([]);
  const won = guesses.some(g => g.row === bomb.row && g.col === bomb.col);
  const lost = !won && guesses.length >= maxTries;
  const triesLeft = maxTries - guesses.length;

  // Streak logic
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('defuseStreak') || '0', 10));
  const [bestStreak, setBestStreak] = useState(() => parseInt(localStorage.getItem('defuseBestStreak') || '0', 10));

  useEffect(() => {
    if (won) {
      const next = streak + 1;
      setStreak(next);
      localStorage.setItem('defuseStreak', next);
      if (next > bestStreak) {
        setBestStreak(next);
        localStorage.setItem('defuseBestStreak', next);
      }
    }
  }, [won]);
  useEffect(() => {
    if (lost) {
      setStreak(0);
      localStorage.setItem('defuseStreak', '0');
    }
  }, [lost]);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    const { data } = await supabase.from('leaderboard').select('id,name,score').order('score', { ascending: false }).limit(10);
    setLeaderboard(data || []);
    setLoadingLeaderboard(false);
  };
  useEffect(() => { fetchLeaderboard(); }, []);

  function handleClick(r, c) {
    if (won || lost || guesses.some(g => g.row === r && g.col === c)) return;
    if (navigator.vibrate) navigator.vibrate(100);
    setGuesses([...guesses, { row: r, col: c }]);
  }

  function getHint(r, c) {
    const dRow = Math.abs(r - bomb.row);
    const dCol = Math.abs(c - bomb.col);
    const cheb = Math.max(dRow, dCol);
    const manh = dRow + dCol;
    if (cheb === 0) return { text: '💥', color: 'grey' };
    if (cheb === 1) return { text: '🔥', color: 'red' };
    if (manh <= 4) return { text: '🌡️', color: 'orange' };
    return { text: '❄️', color: 'blue' };
  }

  // Score submission
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const handleSubmitScore = async () => {
    if (!name) return alert('Enter name');
    setSubmitting(true);
    const display = name + (hardMode ? ' (Hard Mode)' : '');
    const { error } = await supabase.from('leaderboard').insert([{ name: display, score: bestStreak }]);
    setSubmitting(false);
    if (error) alert('Error saving score');
    else { setSubmitted(true); fetchLeaderboard(); }
  };

  // Share
  const handleShare = () => {
    const modeTag = hardMode ? ' (Hard)' : '';
    const text = `I’ve got a ${bestStreak}-game streak${modeTag} on Defuse 💣 — can you beat it?`;
    if (navigator.share) navigator.share({ title: 'Defuse 💣', text, url: 'https://defuse.online' });
    else { navigator.clipboard.writeText(`${text} https://defuse.online`); alert('Copied!'); }
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
        {Array(size).fill().map((_, r) => Array(size).fill().map((_, c) => {
          const guess = guesses.find(g => g.row === r && g.col === c);
          const isBomb = r === bomb.row && c === bomb.col;
          let content = '';
          let style = {};
          if (guess) { const hint = getHint(r, c); content = hint.text; style = { background: hint.color }; }
          if ((won || lost) && isBomb) { content = '💣'; style = { background: 'black', color: 'white' }; }
          return <div key={`${r}-${c}`} className="cell" style={style} onClick={() => handleClick(r, c)}>{content}</div>;
        }))}
      </div>
      {won && <div className="win-banner">You defused it! 🎉</div>}
      {lost && <div className="lose-banner">Boom! 💥 Game over.</div>}
      <div className="menu-button-container" style={{ textAlign: 'center', margin: '1rem 0' }}>
        <button onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close Menu' : 'Open Menu'}</button>
      </div>
      {menuOpen && (
        <div className="menu-panel">
          <h3>Themes</h3>
          <div className="themes-list">
            {THEMES.map(t => {
              const unlock = UNLOCKS[t.key] || 0;
              const locked = bestStreak < unlock;
              return (
                <button key={t.key}
                  disabled={locked}
                  onClick={() => setTheme(t.key)}
                  style={{ margin: '0.25rem' }}>
                  {t.label}{locked ? ` (Unlock at ${unlock})` : ''}
                </button>
              );
            })}
          </div>
          <h3>Mode</h3>
          <button onClick={toggleMode}>{hardMode ? 'Switch to Normal Mode' : 'Switch to Hard Mode'}</button>
        </div>
      )}
      {lost && !submitted && bestStreak > 0 && (
        <div className="submit-score">
          <input placeholder="Enter name" value={name} onChange={e => setName(e.target.value)} disabled={submitting} />
          <button onClick={handleSubmitScore} disabled={submitting}>{submitting ? 'Saving...' : 'Submit Score'}</button>
        </div>
      )}
      {(won || lost) && <button onClick={() => window.location.reload()}>Play Again</button>}
      <div className="leaderboard">
        <h2>🏆 Leaderboard</h2>
        {loadingLeaderboard ? <p>Loading...</p> : (
          <ol style={{ listStylePosition: 'inside', paddingLeft: 0 }}>
            {leaderboard.map(row => <li key={row.id} style={{ margin: '0.25rem 0' }}>{row.name} — {row.score}</li>)}
          </ol>
        )}
      </div>
    </div>
  );
}
