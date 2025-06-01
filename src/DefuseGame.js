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
  const [theme, setTheme] = useState(
    () => localStorage.getItem("defuseTheme") || "default"
  )
  useEffect(() => {
    // Clear out any previously set CSS variables
    const allKeys = THEMES.flatMap((t) => Object.keys(t.vars))
    allKeys.forEach((key) =>
      document.documentElement.style.removeProperty(key)
    )

    // Apply the new theme's variables
    const themeObj = THEMES.find((t) => t.key === theme) || THEMES[0]
    Object.entries(themeObj.vars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v)
    )

    // Persist the chosen theme
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
  const [showNameModal, setShowNameModal] = useState(displayName === "")

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
  const [awaitingName, setAwaitingName] = useState(false)

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

  // Initialize only once when tab becomes "daily"
  useEffect(() => {
    if (activeTab === "daily" && dailyStartTime === null) {
      if (lastPlayedDate === dateSeed && currentStreak > 0) {
        setAlreadyCompleted(true)
        return
      }
      setLivesLeft(5)
      setDailyGuesses([])
      setDailyStartTime(Date.now())
      setDailyElapsed(0)
      setDailyWon(false)
      setDailyLost(false)
      setAwaitingName(false)
      setAlreadyCompleted(false)
    }
  }, [activeTab, dateSeed, lastPlayedDate, currentStreak, dailyStartTime])

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
      // WIN
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

      // Delay Supabase insert until name is provided
      setAwaitingName(true)
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
  //    (Open for everyone; restored original hint‐behavior)
  //
  const [endlessBomb, setEndlessBomb] = useState({ row: 0, col: 0 })
  const [endlessGuesses, setEndlessGuesses] = useState([])
  const [endlessWins, setEndlessWins] = useState(false)
  const [endlessLost, setEndlessLost] = useState(false)
  const MAX_ENDLESS_TRIES = 5

  useEffect(() => {
    if (activeTab === "endless") {
      const r = Math.floor(Math.random() * sizeDaily)
      const c = Math.floor(Math.random() * sizeDaily)
      setEndlessBomb({ row: r, col: c })
      setEndlessGuesses([])
      setEndlessWins(false)
      setEndlessLost(false)
    }
  }, [activeTab])

  async function handleEndlessClick(r, c) {
    if (endlessWins || endlessLost) return
    if (endlessGuesses.some((g) => g.row === r && g.col === c)) return

    if (r === endlessBomb.row && c === endlessBomb.col) {
      // WIN
      setEndlessGuesses((prev) => [...prev, { row: r, col: c }])
      setEndlessWins(true)

      // Save to Supabase
      const record = {
        name: displayName || "Anonymous",
        score: bestStreak,
      }
      const { error } = await supabase.from("leaderboard").insert([record])
      if (error) console.error("Error inserting leaderboard:", error)
    } else {
      // WRONG GUESS
      const newGuesses = [...endlessGuesses, { row: r, col: c }]
      setEndlessGuesses(newGuesses)
      if (newGuesses.length >= MAX_ENDLESS_TRIES) {
        setEndlessLost(true)
      }
    }
  }

  //
  // ── 7) Hint Logic ───────────────────────────────
  //
  function getHint(r, c, mode) {
    let bombR = -999,
      bombC = -999
    if (mode === "daily") {
      bombR = bombRowDaily.current
      bombC = bombColDaily.current
    } else if (mode === "endless") {
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
    if (!name.trim()) return alert("Enter name")
    setSubmitting(true)
    const display = name.trim()
    saveDisplayName(display)

    const record = {
      id: crypto.randomUUID(),
      player_id: playerId,
      user_name: display,
      date_key: dateSeed,
      time_taken: dailyElapsed,
      streak: currentStreak,
      completed_at: new Date().toISOString(),
    }
    const { error } = await supabase.from("daily_scores").insert([record])
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

  //
  // ── 10) Render ───────────────────────────────────
  //

  // Add consistent padding so nothing is cropped by the white border.
  // Also allow the “Daily Completed” overlay to overflow if needed.
  const containerStyle = {
    padding: "1.5rem",
    boxSizing: "border-box",
    ...(activeTab === "daily" && alreadyCompleted
      ? { overflow: "visible" }
      : {}),
  }

  return (
    <div className="crossword-container" style={containerStyle}>
      {/* NAME & “HOW TO PLAY” MODAL */}
      {showNameModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            padding: "2rem",
            textAlign: "center",
            overflowY: "auto",
          }}
        >
          <h2>Welcome to Defuse!</h2>
          <p style={{ maxWidth: "400px", marginBottom: "1rem" }}>
            <strong>How to Play:</strong>
            <br />
            • Click on squares to find the hidden bomb.
            <br />
            • You have 5 Tries. Each wrong click deducts one.
            <br />
            • Emojis show how close you are:
            <span style={{ display: "block" }}>
              🔥 = Touching (Chebyshev = 1),
            </span>
            <span style={{ display: "block" }}>
              🌡️ = Manh. ≤ 4, ❄️ = Way off bro.
            </span>
            <br />
            • Find the bomb quickly, and share your streak!
            <br />
            Come back daily for a new puzzle.
          </p>
          <input
            type="text"
            placeholder="Enter your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{
              padding: "0.5rem",
              width: "200px",
              marginBottom: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #fff",
              background: "transparent",
              color: "#fff",
            }}
          />
          <button
            onClick={() => {
              if (displayName.trim()) {
                saveDisplayName(displayName.trim())
                setShowNameModal(false)
              } else {
                alert("Please enter your name.")
              }
            }}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #fff",
              background: "transparent",
              color: "#fff",
              borderRadius: "4px",
            }}
          >
            Let’s Go!
          </button>
        </div>
      )}

      {/* Title */}
      <h1 style={{ marginTop: 0 }}>Defuse</h1>

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
          {alreadyCompleted ? "Daily 🔒" : "Daily Defuse"}
        </button>
        <button
          onClick={() => {
            setActiveTab("endless")
            setMenuOpen(false)
          }}
          disabled={activeTab === "endless"}
        >
          Endless Mode
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
        <div style={{ position: "relative" }}>
          {/* DAILY-PLAY LOCK OVERLAY */}
          {alreadyCompleted && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.95)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
                textAlign: "center",
                padding: "2rem",
                overflowY: "auto",
                boxSizing: "border-box",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 0.5rem 0" }}>
                  🔒 Today’s Puzzle Completed
                </h2>
                <p style={{ margin: 0 }}>Come back tomorrow for a new challenge!</p>
              </div>
            </div>
          )}

          {!alreadyCompleted && (
            <>
              <div style={{ marginBottom: "0.5rem" }}>
                <span style={{ marginRight: "1rem" }}>
                  🔥 Streak: {currentStreak}
                </span>
                <strong>Tries:</strong> {livesLeft} &nbsp;|&nbsp;{" "}
                <strong>Time:</strong> {String(dailyElapsed).padStart(2, "0")}s
              </div>
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

                        // If guessed or loss, reveal bomb/hints
                        if (guessed || dailyLoseFlag) {
                          if (
                            r === bombRowDaily.current &&
                            c === bombColDaily.current
                          ) {
                            content = dailyLoseFlag ? "💥" : "💣"
                            style = { background: "grey", color: "white" }
                          } else {
                            const hint = getHint(r, c, "daily")
                            content = hint.text
                            style = { background: hint.color }
                          }
                        }

                        // If win, reveal bomb “💣” even if not guessed
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

              {/* WIN banner + Name Input */}
              {dailyWinFlag && !submitted && awaitingName && (
                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                  <div
                    className="win-banner"
                    style={{ marginBottom: "0.5rem" }}
                  >
                    You defused it! 🎉
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ padding: "0.5rem", width: "160px" }}
                      disabled={submitting}
                    />
                  </div>
                  <button
                    onClick={handleSubmitScore}
                    disabled={submitting}
                    style={{ marginTop: "0.5rem" }}
                  >
                    {submitting ? "Saving..." : "Submit Score"}
                  </button>
                </div>
              )}

              {/* LOSS → Copy Result only */}
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
                          line += "💥"
                        } else {
                          const hint = getHint(r, c, "daily")
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
                      "💥 = Bomb exploded",
                      "💣 = Bomb (if you’d found it)",
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
            </>
          )}
        </div>
      )}

      {/* 3) Endless Tab */}
      {activeTab === "endless" && (
        <div>
          {/* Display streak and tries side-by-side, aligned vertically */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "2rem",
              alignItems: "center",      // <— This ensures they line up at the same height
              marginBottom: "0.5rem",
            }}
          >
            <div>🔥 Streak: {currentStreak}</div>
            <div>
              Tries Left: {Math.max(0, MAX_ENDLESS_TRIES - endlessGuesses.length)}
            </div>
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
                    const guessed = endlessGuesses.some(
                      (g) => g.row === r && g.col === c
                    )
                    let content = ""
                    let style = {}

                    if (guessed) {
                      const hint = getHint(r, c, "endless")
                      content = hint.text
                      style = { background: hint.color }
                    }

                    if (
                      endlessLost &&
                      r === endlessBomb.row &&
                      c === endlessBomb.col
                    ) {
                      content = "💥"
                      style = { background: "grey", color: "white" }
                    }
                    if (
                      endlessWins &&
                      r === endlessBomb.row &&
                      c === endlessBomb.col
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
                          if (!endlessWins && !endlessLost) {
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
          {(endlessWins || endlessLost) && (
            <button
              style={{ marginTop: "1rem" }}
              onClick={() => window.location.reload()}
            >
              Play Again
            </button>
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

      {/* 5) Menu Button (hide if Daily is locked) */}
      {!(activeTab === "daily" && alreadyCompleted) && (
        <div
          className="menu-button-container"
          style={{ textAlign: "center", margin: "1rem 0" }}
        >
          <button onClick={() => setMenuOpen((prev) => !prev)}>
            {menuOpen ? "Close Menu" : "Open Menu"}
          </button>
        </div>
      )}

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
