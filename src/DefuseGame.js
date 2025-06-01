// src/DefuseGame.js
import React, { useState, useEffect, useRef } from "react"
import { supabase } from "./supabaseClient"
import "./App.css"

// ── A) Themes + Unlocks ───────────────────────────
const THEMES = [
  { key: "default", label: "Classic", vars: {} },
  {
    key: "red",
    label: "Red",
    vars: {
      "--bg": "#2b0000",
      "--cell-bg": "#400000",
      "--cell-border": "#ff4444",
      "--fg": "#ffecec",
    },
  },
  {
    key: "blue",
    label: "Ocean Blue",
    vars: {
      "--bg": "#001f3f",
      "--cell-bg": "#003366",
      "--cell-border": "#0074D9",
      "--fg": "#7FDBFF",
    },
  },
  {
    key: "neon",
    label: "Neon Green",
    vars: {
      "--bg": "#000",
      "--cell-bg": "#001100",
      "--cell-border": "#00ff00",
      "--fg": "#00ff00",
    },
  },
  {
    key: "gold",
    label: "Gold",
    vars: {
      "--bg": "#111000",
      "--cell-bg": "#222000",
      "--cell-border": "#ffcc00",
      "--fg": "#ffeb99",
    },
  },
]

// Unlock thresholds per theme (daily streak required)
const UNLOCKS = {
  default: 0,
  red: 5,
  blue: 5,
  neon: 10,
  gold: 20,
}

export default function DefuseGame() {
  //
  // ── 1) Tab State ────────────────────────────────
  //
  const [activeTab, setActiveTab] = useState("daily")

  //
  // ── 2) Menu State ───────────────────────────────
  //
  const [menuOpen, setMenuOpen] = useState(false)

  //
  // ── 3) Theme State ──────────────────────────────
  //
  const [theme, setTheme] = useState("default") // force Classic by default

  useEffect(() => {
    const allKeys = THEMES.flatMap((t) => Object.keys(t.vars))
    allKeys.forEach((key) =>
      document.documentElement.style.removeProperty(key)
    )
    const themeObj = THEMES.find((t) => t.key === theme) || THEMES[0]
    Object.entries(themeObj.vars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v)
    )
    localStorage.setItem("defuseTheme", theme)
  }, [theme])

  //
  // ── 4) Player Identity & Streak Tracking ────────
  //
  const [playerId] = useState(() => {
    const existing = localStorage.getItem("defusePlayerId")
    if (existing) return existing
    const newId = crypto.randomUUID()
    localStorage.setItem("defusePlayerId", newId)
    return newId
  })

  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("defuseName") || ""
  )
  function saveDisplayName(name) {
    setDisplayName(name)
    localStorage.setItem("defuseName", name)
  }

  const [currentStreak, setCurrentStreak] = useState(() => {
    return parseInt(localStorage.getItem("defuseStreak") || "0", 10)
  })
  const [bestStreak, setBestStreak] = useState(() => {
    return parseInt(localStorage.getItem("defuseBestStreak") || "0", 10)
  })
  const [lastPlayedDate, setLastPlayedDate] = useState(
    () => localStorage.getItem("defuseLastDate") || ""
  )

  function todayKey() {
    return new Date().toISOString().split("T")[0]
  }

  //
  // ── 5) Daily Mode State ──────────────────────────
  //
  const [livesLeft, setLivesLeft] = useState(5)
  const [dailyGuesses, setDailyGuesses] = useState([])
  const [dailyWon, setDailyWon] = useState(false)
  const [dailyLost, setDailyLost] = useState(false)
  const [dailyStartTime, setDailyStartTime] = useState(null)
  const [dailyElapsed, setDailyElapsed] = useState(0)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)

  const dateSeed = todayKey()
  function hashDate(str) {
    return str.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  }
  const numericSeed = hashDate(dateSeed)

  const sizeDaily = 5
  const bombRowDaily = useRef(null)
  const bombColDaily = useRef(null)
  useEffect(() => {
    bombRowDaily.current = numericSeed % sizeDaily
    bombColDaily.current = (numericSeed * 7) % sizeDaily
  }, [numericSeed])

  useEffect(() => {
    if (activeTab === "daily") {
      setLivesLeft(5)
      setDailyGuesses([])
      setDailyStartTime(Date.now())
      setDailyElapsed(0)
      setDailyWon(false)
      setDailyLost(false)
      setAlreadyCompleted(false)
      if (lastPlayedDate === dateSeed && currentStreak > 0) {
        setAlreadyCompleted(true)
      }
    }
  }, [activeTab, dateSeed, lastPlayedDate, currentStreak])

  useEffect(() => {
    if (dailyStartTime === null) return
    if (dailyWon || dailyLost) return
    const id = setInterval(() => {
      setDailyElapsed(Math.floor((Date.now() - dailyStartTime) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [dailyStartTime, dailyWon, dailyLost])

  async function handleDailyClick(r, c) {
    if (dailyWon || dailyLost || alreadyCompleted) return
    if (dailyGuesses.some((g) => g.row === r && g.col === c)) return

    if (r === bombRowDaily.current && c === bombColDaily.current) {
      // WIN: add bomb to guesses immediately
      setDailyGuesses((prev) => [...prev, { row: r, col: c }])
      setDailyWon(true)
      setDailyElapsed(Math.floor((Date.now() - dailyStartTime) / 1000))

      // Update streak
      let newStreak = 1
      if (lastPlayedDate === dateSeed) {
        newStreak = currentStreak
      } else {
        const yesterday = new Date(
          Date.now() - 86400000
        ).toISOString().split("T")[0]
        newStreak =
          lastPlayedDate === yesterday
            ? currentStreak + 1
            : 1
      }
      setCurrentStreak(newStreak)
      localStorage.setItem("defuseStreak", String(newStreak))

      if (newStreak > bestStreak) {
        setBestStreak(newStreak)
        localStorage.setItem("defuseBestStreak", String(newStreak))
      }

      setLastPlayedDate(dateSeed)
      localStorage.setItem("defuseLastDate", dateSeed)

      // Insert into Supabase daily_scores
      const record = {
        id: crypto.randomUUID(),
        player_id: playerId,
        user_name: displayName || "Anonymous",
        date_key: dateSeed,
        time_taken: Math.floor((Date.now() - dailyStartTime) / 1000),
        streak: newStreak,
        completed_at: new Date().toISOString(),
      }
      const { error } = await supabase
        .from("daily_scores")
        .insert([record])
      if (error) console.error("Error inserting daily_scores:", error)
    } else {
      // WRONG GUESS
      setDailyGuesses((prev) => [...prev, { row: r, col: c }])
      setLivesLeft((prev) => prev - 1)
      if (livesLeft - 1 <= 0) {
        setDailyLost(true)
        setCurrentStreak(0)
        localStorage.setItem("defuseStreak", "0")
        setLastPlayedDate(dateSeed)
        localStorage.setItem("defuseLastDate", dateSeed)
      }
    }
  }

  //
  // ── 6) Endless Mode State ───────────────────────
  //
  const endlessUnlocked = currentStreak >= 3
  const [endlessBomb, setEndlessBomb] = useState({ row: 0, col: 0 })
  const [endlessGuesses, setEndlessGuesses] = useState([])
  const [endlessTries, setEndlessTries] = useState(0)
  const [endlessWins, setEndlessWins] = useState(0)

  useEffect(() => {
    if (activeTab === "endless" && endlessUnlocked) {
      const r = Math.floor(Math.random() * 5)
      const c = Math.floor(Math.random() * 5)
      setEndlessBomb({ row: r, col: c })
      setEndlessGuesses([])
      setEndlessTries(0)
      setEndlessWins(0)
    }
  }, [activeTab, endlessUnlocked])

  async function handleEndlessClick(r, c) {
    if (!endlessUnlocked) return
    if (endlessWins > 0 || endlessTries >= 4) return

    if (endlessBomb.row === r && endlessBomb.col === c) {
      setEndlessWins((prev) => prev + 1)
      const record = {
        name: displayName || "Anonymous",
        score: bestStreak,
      }
      const { error } = await supabase
        .from("leaderboard")
        .insert([record])
      if (error) console.error("Error inserting leaderboard:", error)
    } else {
      setEndlessTries((prev) => prev + 1)
    }
  }

  //
  // ── 7) Hint Logic ───────────────────────────────
  //
  function getHint(r, c) {
    let bombR = -999,
      bombC = -999
    if (activeTab === "daily") {
      bombR = bombRowDaily.current
      bombC = bombColDaily.current
    } else if (activeTab === "endless") {
      bombR = endlessBomb.row
      bombC = endlessBomb.col
    }

    const dRow = Math.abs(r - bombR)
    const dCol = Math.abs(c - bombC)
    const cheb = Math.max(dRow, dCol)
    const manh = dRow + dCol

    if (theme === "neon") {
      if (cheb === 0) return { text: "🛸", color: "grey" }
      if (cheb === 1) return { text: "👽", color: "lime" }
      if (manh <= 4) return { text: "🪐", color: "green" }
      return { text: "✨", color: "teal" }
    }
    if (theme === "gold") {
      if (cheb === 0) return { text: "👑", color: "gold" }
      if (cheb === 1) return { text: "🤴", color: "goldenrod" }
      if (manh <= 4) return { text: "💎", color: "deepskyblue" }
      return { text: "✨", color: "lightgoldenrodyellow" }
    }
    if (theme === "blue") {
      if (cheb === 0) return { text: "🦈", color: "#001f3f" }
      if (cheb === 1) return { text: "🐟", color: "#0074D9" }
      if (manh <= 4) return { text: "🐬", color: "#7FDBFF" }
      return { text: "🌊", color: "#001f3f" }
    }
    if (cheb === 0) return { text: "💣", color: "grey" }
    if (cheb === 1) return { text: "🔥", color: "red" }
    if (manh <= 4) return { text: "🌡️", color: "orange" }
    return { text: "❄️", color: "blue" }
  }

  //
  // ── 8) Score Submission & Leaderboards ─────────
  //
  const [name, setName] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const handleSubmitScore = async () => {
    if (!name) return alert("Enter name")
    setSubmitting(true)
    const display = name
    const { error } = await supabase
      .from("leaderboard")
      .insert([{ name: display, score: bestStreak }])
    setSubmitting(false)
    if (error) alert("Error saving score")
    else {
      setSubmitted(true)
      fetchLeaderboard()
    }
  }

  const [dailyLeaderboard, setDailyLeaderboard] = useState([])
  const [endlessLeaderboard, setEndlessLeaderboard] = useState([])
  const [loadingBoard, setLoadingBoard] = useState(true)

  async function fetchLeaderboard() {
    setLoadingBoard(true)
    const { data: dailyData } = await supabase
      .from("daily_scores")
      .select("user_name, time_taken, streak")
      .eq("date_key", dateSeed)
      .order("time_taken", { ascending: true })
      .order("streak", { ascending: false })
      .limit(10)

    const { data: endlessData } = await supabase
      .from("leaderboard")
      .select("name, score")
      .order("score", { ascending: false })
      .limit(10)

    setDailyLeaderboard(dailyData || [])
    setEndlessLeaderboard(endlessData || [])
    setLoadingBoard(false)
  }

  useEffect(() => {
    if (activeTab === "leaderboard") {
      fetchLeaderboard()
    }
  }, [activeTab, dateSeed])

  //
  // ── 9) Computed Win/Lose Flags ───────────────────
  //
  const dailyWinFlag = dailyWon
  const dailyLoseFlag = dailyLost
  const endlessLoseFlag =
    endlessUnlocked && endlessTries >= 5 && endlessWins === 0

  //
  // ── 10) Render ───────────────────────────────────
  //
  return (
    <div className="crossword-container">
      {/* Title */}
      <h1>Defuse</h1>

      {/* 1) Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <button
          onClick={() => {
            setActiveTab("daily")
            setMenuOpen(false)
          }}
          disabled={activeTab === "daily"}
        >
          Daily Defuse
        </button>
        <button
          onClick={() => {
            setActiveTab("endless")
            setMenuOpen(false)
          }}
          disabled={activeTab === "endless"}
        >
          {endlessUnlocked
            ? "Endless Mode"
            : `Endless (Unlock at 3-day streak)`}
        </button>
        <button
          onClick={() => {
            setActiveTab("leaderboard")
            setMenuOpen(false)
          }}
          disabled={activeTab === "leaderboard"}
        >
          Leaderboard
        </button>
      </div>

      {/* 2) Daily Tab */}
      {activeTab === "daily" && (
        <div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Lives:</strong> {livesLeft} &nbsp;|&nbsp;{" "}
            <strong>Time:</strong>{" "}
            {String(dailyElapsed).padStart(2, "0")}s
          </div>
          {alreadyCompleted && (
            <div
              style={{ color: "orange", marginBottom: "0.5rem" }}
            >
              You already completed today’s puzzle!
            </div>
          )}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${sizeDaily}, 40px)`,
              gridTemplateRows: `repeat(${sizeDaily}, 40px)`,
            }}
          >
            {Array(sizeDaily)
              .fill(0)
              .map((_, r) =>
                Array(sizeDaily)
                  .fill(0)
                  .map((_, c) => {
                    const guessed = dailyGuesses.some(
                      (g) => g.row === r && g.col === c
                    )
                    let content = ""
                    let style = {}

                    // If guess or loss, reveal bomb or hints
                    if (guessed || dailyLoseFlag) {
                      if (
                        r === bombRowDaily.current &&
                        c === bombColDaily.current
                      ) {
                        content = "💥"
                        style = { background: "grey", color: "white" }
                      } else {
                        const hint = getHint(r, c)
                        content = hint.text
                        style = { background: hint.color }
                      }
                    }

                    // If win and bomb cell, show bomb
                    if (
                      dailyWinFlag &&
                      r === bombRowDaily.current &&
                      c === bombColDaily.current
                    ) {
                      content = "💣"
                      style = { background: "grey", color: "white" }
                    }

                    return (
                      <div
                        key={`${r}-${c}`}
                        className="cell"
                        style={style}
                        onClick={() => {
                          if (
                            !alreadyCompleted &&
                            !dailyWinFlag &&
                            !dailyLoseFlag
                          ) {
                            handleDailyClick(r, c)
                          }
                        }}
                      >
                        {content}
                      </div>
                    )
                  })
              )}
          </div>

          {/* Win banner */}
          {dailyWinFlag && (
            <div className="win-banner" style={{ marginBottom: "1rem" }}>
              You defused it! 🎉
            </div>
          )}

          {/* Loss copy-result only; no “Play Again” */}
          {dailyLoseFlag && (
            <button
              style={{ marginTop: "0.5rem" }}
              onClick={() => {
                const gridLines = []
                for (let r = 0; r < sizeDaily; r++) {
                  let line = ""
                  for (let c = 0; c < sizeDaily; c++) {
                    const guessed = dailyGuesses.some(
                      (g) => g.row === r && g.col === c
                    )
                    if (!guessed) {
                      line += "⬜"
                    } else if (
                      r === bombRowDaily.current &&
                      c === bombColDaily.current
                    ) {
                      line += "💣"
                    } else {
                      const hint = getHint(r, c)
                      line += hint.text
                    }
                  }
                  gridLines.push(line)
                }
                const resultText = [
                  "💥 Failed today’s defuse. Streak reset.",
                  "",
                  ...gridLines,
                  "",
                  "💣 = Bomb",
                  "🔥 etc. = Hint",
                  "⬜ = Untouched",
                  "defuse.online",
                ].join("\n")
                navigator.clipboard.writeText(resultText)
                alert("Copied to clipboard!")
              }}
            >
              Copy Result
            </button>
          )}
        </div>
      )}

      {/* 3) Endless Tab */}
      {activeTab === "endless" && (
        <div>
          {!endlessUnlocked ? (
            <div style={{ color: "grey" }}>
              Endless Mode unlocks at a 3-day streak.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "0.5rem" }}>
                Your Wins: {endlessWins} &nbsp;|&nbsp; Tries used this
                round: {endlessTries}
              </div>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(5, 40px)`,
                  gridTemplateRows: `repeat(5, 40px)`,
                }}
              >
                {Array(5)
                  .fill(0)
                  .map((_, r) =>
                    Array(5)
                      .fill(0)
                      .map((_, c) => {
                        let content = ""
                        let style = {}

                        if (
                          endlessTries > 0 ||
                          endlessWins > 0 ||
                          endlessLoseFlag
                        ) {
                          if (
                            r === endlessBomb.row &&
                            c === endlessBomb.col
                          ) {
                            content = "💣"
                            style = {
                              background: "grey",
                              color: "white",
                            }
                          }
                        }

                        return (
                          <div
                            key={`${r}-${c}`}
                            className="cell"
                            style={style}
                            onClick={() => {
                              if (
                                endlessUnlocked &&
                                !endlessLoseFlag &&
                                endlessWins === 0
                              ) {
                                handleEndlessClick(r, c)
                              }
                            }}
                          >
                            {content}
                          </div>
                        )
                      })
                  )}
              </div>
              {(endlessWins > 0 || endlessLoseFlag) && (
                <button
                  style={{ marginTop: "1rem" }}
                  onClick={() => window.location.reload()}
                >
                  Play Again
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* 4) Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <div>
          {loadingBoard ? (
            <p>Loading...</p>
          ) : (
            <>
              <h3>🗓️ Today’s Leaderboard (Daily)</h3>
              <ol
                style={{
                  listStylePosition: "inside",
                  paddingLeft: 0,
                }}
              >
                {dailyLeaderboard.map((row, idx) => (
                  <li key={idx}>
                    {row.user_name} — {row.time_taken}s (Streak: {row.streak})
                  </li>
                ))}
              </ol>
              <h3 style={{ marginTop: "1.5rem" }}>
                ♾️ Endless Leaderboard
              </h3>
              <ol
                style={{
                  listStylePosition: "inside",
                  paddingLeft: 0,
                }}
              >
                {endlessLeaderboard.map((row, idx) => (
                  <li key={idx}>
                    {row.name} — {row.score}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}

      {/* 5) Menu Button */}
      <div
        className="menu-button-container"
        style={{ textAlign: "center", margin: "1rem 0" }}
      >
        <button onClick={() => setMenuOpen((prev) => !prev)}>
          {menuOpen ? "Close Menu" : "Open Menu"}
        </button>
      </div>

      {/* 6) Menu Panel (Themes) */}
      {menuOpen && (
        <div className="menu-panel">
          <h3>Themes</h3>
          <div className="themes-list">
            {THEMES.map((t) => {
              const unlock = UNLOCKS[t.key] || 0
              const locked = currentStreak < unlock
              return (
                <button
                  key={t.key}
                  disabled={locked}
                  onClick={() => setTheme(t.key)}
                  style={{ margin: "0.25rem" }}
                >
                  {t.label}
                  {locked ? ` (Unlock at ${unlock})` : ""}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
