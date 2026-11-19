# 🧩 Tsudoku - Realtime Multiplayer Sudoku

Tsudoku is a fast-paced real-time multiplayer Sudoku web application built with TypeScript, React, Tailwind CSS, and Node.js (Socket.IO).

## ✨ Features

- **Multiplayer Race Mode**: Compete against friends on identical puzzle seeds with live progress tracking, score, and error counters.
- **Instant Feedback vs Freeform Mode**:
  - **Instant Feedback**: Errors are flagged in red immediately with a `-50 pts` score penalty.
  - **Freeform Mode**: No live penalties; board validity is evaluated when complete.
- **Smart Sudoku Engine**:
  - Fast, deterministic puzzle generator with guaranteed unique solutions.
  - 4 difficulty settings: *Easy, Medium, Hard, Expert*.
- **Pencil / Notes Mode**: Toggle notes mode (`N` or `Space`) to enter candidate numbers in a 3x3 mini grid inside any empty cell.
- **Quick Controls & Accessibility**:
  - Full keyboard navigation (`1-9`, Arrow keys / `WASD`, `Backspace`/`Delete`, `Ctrl+Z` / `Cmd+Z` to Undo).
  - Virtual touch-friendly keypad with remaining-number counters.
- **Guest Identity & Lobbies**:
  - Instant guest join with a playful random nickname generator (`SwiftFox42`) + re-roll button or custom name.
  - Shareable 6-character room codes (`TSU-XXXX`) and direct invite links (`?room=CODE`).
- **Tactile Audio & FX**:
  - Procedural sound effects using the Web Audio API (placement chimes, error buzzers, countdown beeps).
  - Confetti celebration and podium standings for match winners.
- **Extensible Architecture**:
  - Modular scoring and cell event system designed to plug directly into future **Map / Territory Control** modes.

---

## 🛠️ Tech Stack & Monorepo Structure

- **Monorepo**: npm workspaces
  - `packages/shared`: Shared TypeScript types, Sudoku generator, DLX/backtracking solver, and scoring engine.
  - `packages/server`: Node.js, Express, and Socket.IO server managing room state machines and real-time synchronization.
  - `packages/client`: React 18, Vite, Tailwind CSS, and Lucide icons.

```
tsudoku/
├── packages/
│   ├── shared/     # Sudoku generator, solver, scoring, and types
│   ├── server/     # Express + Socket.IO multiplayer server
│   └── client/     # React + Vite + Tailwind CSS frontend
├── package.json
└── tsconfig.base.json
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
# Run shared engine and socket multiplayer tests
node --test packages/shared/dist/sudoku.test.js
node --test packages/server/dist/socket.test.js
```

### 3. Development Mode
To run both the server and client with hot reload:
```bash
npm run dev
```
- Client runs at: `http://localhost:3000`
- Server runs at: `http://localhost:3001` (WebSocket port)

### 4. Production Build & Run
```bash
npm run build
npm start
```
The server will start at `http://localhost:3001` and serve the compiled React frontend directly.
