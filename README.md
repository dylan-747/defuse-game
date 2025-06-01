
            ___________
           /           \
          /  BOOM! 💣   \
         |   Defuse!    |
          \             /
           \___________/
               \   /
                \_/

# Defuse.Online

> A 5×5 bomb-defusal puzzle game built with React. Find the bomb, avoid wrong clicks, and climb the leaderboards!

---

## Table of Contents

1. [Overview](#overview)  
2. [Installation](#installation)  
3. [Available Scripts](#available-scripts)  
4. [Gameplay](#gameplay)  
   - [Daily Defuse](#daily-defuse)  
   - [Endless Mode](#endless-mode)  
   - [Hints & Themes](#hints--themes)  
   - [Leaderboards](#leaderboards)  
5. [Project Structure](#project-structure)  
6. [Styling & CSS Notes](#styling--css-notes)  
7. [Contributing](#contributing)  
8. [License](#license)  

---

## Overview

Defuse.Online challenges you to locate a hidden bomb on a 5×5 grid. Each day, one bomb is seeded by the date; you get 5 lives (wrong clicks). Guess wrong five times, and 💥—streak reset. Click the bomb before running out of lives to win, record your time/streak, and unlock cool themes. After a 3-day winning streak, “Endless Mode” activates for unlimited fun.

---

## Installation

1. **Clone & Install**  
   ```bash
   git clone https://github.com/<your-username>/defuse.online.git
   cd defuse.online
   npm install
   ```
2. **Environment**  
   - Create a `.env.local` file in the project root.  
   - Add your Supabase credentials:
     ```
     REACT_APP_SUPABASE_URL=your-supabase-url
     REACT_APP_SUPABASE_ANON_KEY=your-anon-key
     ```
3. **Run**  
   ```bash
   npm start
   ```  
   The app will open at [http://localhost:3000](http://localhost:3000). Hot-reloads on save.

---

## Available Scripts

- **`npm start`**  
  Launches the development server.  
- **`npm test`**  
  Runs React tests (if any).  
- **`npm run build`**  
  Bundles for production into `build/`.  
- **`npm run lint`** _(if configured)_  
  Lints the code.  
- **`npm run eject`** _(one-way operation)_  
  Ejects Create React App configuration for full control.

---

## Gameplay

### Daily Defuse

- **Grid**: 5×5 cells.  
- **Bomb Location**: Determined by hashing today’s date (ISO “YYYY-MM-DD”).  
- **Lives**: You start with 5. Each wrong click deducts one life. If lives reach 0, the bomb explodes (game over).  
- **Hints**:  
  - Clicking a safe cell (or after you lose) shows an emoji hint based on distance to the bomb:  
    - **Chebyshev = 0**: 💣 (on win) or 💥 (on loss) in grey  
    - **Chebyshev = 1**: 🔥 in red (or theme-specific emoji/color)  
    - **Manhattan ≤ 4**: 🌡️ in orange (or theme variant)  
    - **Otherwise**: ❄️ in blue (or theme variant)  
- **Win**: Click the bomb before losing all lives. Timer stops and the bomb cell shows “💣”. Enter your name to submit to the daily leaderboard.  
- **Streaks**:  
  - Winning on consecutive calendar days increments “current streak.”  
  - Losing resets current streak to 0.  
  - Best streak is stored in `localStorage`.  
  - Once you finish today’s puzzle (win or lose), you cannot play again until tomorrow.

### Endless Mode

- **Unlock**: Requires a 3-day winning streak in Daily Defuse.  
- **Grid**: 5×5, with one random bomb per round.  
- **Guesses**: Up to 5 wrong clicks. If you click the bomb within 5 guesses, you win that round. Otherwise, bomb explodes on the 5th wrong click.  
- **Score**: Each defuse increments your session’s win count.  
- **Play Again**: After win or loss, click “Play Again” to load a new grid.  
- **Leaderboard**: Defusing a bomb submits your name + best daily streak to the “Endless” leaderboard.

### Hints & Themes

- **Default Theme** (Classic)  
  - Neutral greys; emoji hints: 💣, 🔥, 🌡️, ❄️.

- **Other Themes** (unlock thresholds in days of streak):  
  1. **Red** (5-day streak) – 🔥→👽, 🌡️→🪐, ❄️→✨  
  2. **Ocean Blue** (5-day streak) – 🔥→🐟, 🌡️→🐬, ❄️→🌊  
  3. **Neon Green** (10-day streak) – 🔥→👽, 🌡️→🪐, ❄️→✨ (green styling)  
  4. **Gold** (20-day streak) – 🔥→🤴, 🌡️→💎, ❄️→✨ (gold styling)

- **How to Change**:  
  - Click “Open Menu,” choose a theme (locked themes are disabled until you hit the required streak).  
  - Themes set CSS variables (`--bg`, `--cell-bg`, `--cell-border`, `--fg`) on `<html>` to recolor the grid and hints.

### Leaderboards

- **Daily Leaderboard**  
  - Top 10 entries for today, sorted by fastest time ascending.  
  - Shows each player’s time and current streak.

- **Endless Leaderboard**  
  - Top 10 overall highest “score” (number of bombs defused in one session).  
  - Submits your name + best streak automatically on each defuse.

- **Viewing**:  
  - Click “Leaderboard” tab to switch. If data is loading, a “Loading…” message appears briefly.

---

## Project Structure

```
defuse.online/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.css            # Grid & theme CSS variables
│   ├── App.jsx            # Renders <DefuseGame />
│   ├── index.jsx          # React entry point
│   ├── DefuseGame.js      # Main component (daily, endless, leaderboard, themes)
│   └── supabaseClient.js  # Preconfigured Supabase client
├── .env.local             # Contains Supabase URL + anon key
├── package.json
└── README.md              # ← (this file)
```

---

## Styling & CSS Notes

- **`.crossword-container`**  
  - Wraps title, tabs, grid, menus; centers content.

- **`.grid`**  
  - `display: grid; grid-template-columns: repeat(5, 40px); grid-template-rows: repeat(5, 40px); gap: 2px;`

- **`.cell`**  
  ```css
  .cell {
    width: 40px;
    height: 40px;
    border: 1px solid var(--cell-border, #000);
    background-color: var(--cell-bg, #ccc);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  .cell:hover {
    filter: brightness(1.1);
  }
  ```
  - Revealed cells override `background` and `color` inline based on hint or bomb.

- **CSS Variables** (set on `<html>` via JS when theme changes):  
  ```css
  --bg:        /* page background */
  --cell-bg:   /* default cell background */
  --cell-border: /* cell border color */
  --fg:        /* text/emoji color */
  ```

---

## Contributing

1. **Fork the repo**  
2. **Create a branch**  
   ```bash
   git checkout -b feature/awesome-emoji
   ```
3. **Make changes**, test daily & endless flows locally.  
4. **Commit** with a clear message:  
   ```
   git commit -m "Add new Neon theme hint animation"
   ```
5. **Push** to your fork and open a Pull Request.

> **Before PR**:  
> - Ensure code style is consistent.  
> - Run any existing tests.  
> - Update this README if you add a new feature.

---

## License

This project is released under the **MIT License**. See [LICENSE](./LICENSE) for details.

---

💥 _Happy defusing!_ 💥
