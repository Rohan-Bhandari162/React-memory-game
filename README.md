# React Memory Card Game

A modern, responsive memory-matching web application built with **React 19** and **Vite**. Features an adaptive reshuffling mechanic designed to challenge short-term spatial memory, implemented using clean component composition and a custom React hook for decoupled game state management.

[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![ESLint](https://img.shields.io/badge/ESLint-9.x-4B32C3?logo=eslint&logoColor=white)](https://eslint.org/)

---

## Table of Contents

- [Overview](#overview)
- [How to Play](#how-to-play)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technical Implementation Details](#technical-implementation-details)
  - [1. Component Hierarchy and Separation of Concerns](#1-component-hierarchy-and-separation-of-concerns)
  - [2. Game State Machine](#2-game-state-machine)
  - [3. Fisher-Yates Shuffling Algorithm](#3-fisher-yates-shuffling-algorithm)
  - [4. Partial Grid Reshuffle Strategy](#4-partial-grid-reshuffle-strategy)
  - [5. Concurrency and Click Guarding](#5-concurrency-and-click-guarding)
  - [6. State Transition Timeline](#6-state-transition-timeline)
- [Algorithmic Complexity](#algorithmic-complexity)
- [Tech Stack](#tech-stack)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Roadmap](#roadmap)
- [Author & License](#author--license)

---

## Overview

Traditional memory card games rely on memorizing static coordinates across a grid. This project introduces a dynamic twist: **all unmatched cards dynamically reshuffle their positions after each turn**, while successfully matched pairs remain pinned in place.

This requires players to maintain an active mental model of remaining card values rather than relying solely on static board positions, providing a higher level of cognitive challenge and replayability.

---

## How to Play

1. Click on any facedown card to reveal its value.
2. Click a second card to attempt a match:
   - **Match:** Both cards remain face-up and are highlighted in green. The score counter increments by 1.
   - **Mismatch:** Both cards are temporarily displayed before flipping back face-down.
3. After each turn, the remaining unmatched cards dynamically shift to new positions across the grid.
4. Continue matching pairs until all 8 pairs are cleared with the lowest move count possible.

---

## Key Features

- **4x4 Dynamic Grid (16 Cards):** 8 unique pairs of distinct card values.
- **Adaptive Shuffle Mechanic:** Unmatched cards change positions after every turn; matched pairs remain pinned.
- **Real-Time Metrics:** Live tracking of matches made (`score`) and total attempts (`moves`).
- **Deterministic Win Condition:** Completion banner triggers automatically when all 8 pairs are solved.
- **Instant Board Reset:** New Game control cleans up existing state and generates a fresh randomized board without page reload.
- **Hardware-Accelerated 3D Flip Animations:** Smooth transitions leveraging CSS `perspective`, `transform-style: preserve-3d`, and `backface-visibility`.
- **Responsive Layout:** CSS Grid architecture adapting seamlessly from mobile viewports to desktop displays.

---

## System Architecture

The application adopts the **Container / Presentational Component Pattern**, decoupling rendering from state orchestration through a custom hook (`useGameLogic`).

```mermaid
graph TD
    A[App.jsx<br>Container Component] -->|State & Handlers| B(useGameLogic Hook)
    A -->|Props| C(GameHeader)
    A -->|Props| D(Card Grid)
    A -->|Props| E(WinMessage)
    
    B -->|Manages| F[(State Machine)]
    F -.->|cards, score, moves| A
    
    subgraph Presentational Layer
    C
    D
    E
    end
```

---

## Technical Implementation Details

### 1. Component Hierarchy and Separation of Concerns

- **`App.jsx`:** The root container component. It invokes `useGameLogic` and delegates state slices and handler callbacks to pure presentational components.
- **Presentational Components (`GameHeader`, `Card`, `WinMessage`):** Completely stateless. They receive props, emit DOM events, and produce predictable UI output without side effects.
- **Custom Hook (`useGameLogic.js`):** Encapsulates the entire domain logic including board initialization, shuffle calculations, evaluation timeouts, and win detection.

### 2. Game State Machine

Inside `useGameLogic.js`, state is organized into atomic primitives to keep re-renders focused and avoid unnecessary calculations:

```javascript
const [cards, setCards] = useState([]);             // Array of 16 card objects
const [flippedCards, setFlippedCards] = useState([]); // Array of IDs currently face-up (max length: 2)
const [matchedCards, setMatchedCards] = useState([]); // Array of matched card IDs
const [score, setScore] = useState(0);              // Total successful matches
const [moves, setMoves] = useState(0);              // Total turn attempts
const [isLocked, setIsLocked] = useState(false);    // Concurrency guard during async delays
```

Each card entity in the `cards` array conforms to the following structure:

```typescript
interface Card {
  id: number;          // Unique position index
  value: string;       // Card content identifier
  isFlipped: boolean;  // Controls active card front/back rotation
  isMatched: boolean;  // Flags completed state (glow style & interaction lock)
}
```

### 3. Fisher-Yates Shuffling Algorithm

Deck randomization is implemented using the **Durstenfeld variant of the Fisher-Yates algorithm**:

```javascript
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
```

This guarantees an **unbiased, mathematically uniform permutation** running in optimal **$O(N)$ linear time**, avoiding the non-uniform distribution and higher time complexity associated with `array.sort(() => Math.random() - 0.5)`.

### 4. Partial Grid Reshuffle Strategy

When unmatched cards swap coordinates after a turn, matched pairs must retain their fixed grid locations.

```javascript
const shuffleUnmatchedCards = (currentCards) => {
    const unmatchedIndices = [];
    const unmatchedCards = [];

    // Step 1: Collect unmatched cards and their corresponding slots
    currentCards.forEach((card, index) => {
        if (!card.isMatched) {
            unmatchedIndices.push(index);
            unmatchedCards.push(card);
        }
    });

    // Step 2: Permute only the unmatched subset
    const shuffledUnmatched = shuffleArray(unmatchedCards);
    const newCardsArray = [...currentCards];

    // Step 3: Write permuted items back into preserved slot positions
    unmatchedIndices.forEach((index, i) => {
        newCardsArray[index] = shuffledUnmatched[i];
    });

    return newCardsArray;
};
```

This ensures board stability by keeping solved cards in place while generating an entirely new permutation for remaining cards in a single linear pass.

### 5. Concurrency and Click Guarding

Interactive games frequently encounter race conditions caused by rapid user clicking during animation or evaluation delays. The `handleClick` function enforces a strict guard clause:

```javascript
const handleClick = (card) => {
    if (
        card.isFlipped ||
        card.isMatched ||
        isLocked ||
        flippedCards.length === 2
    ) {
        return;
    }
    // Proceed with flip and evaluation...
};
```

**Guard Invariants:**
- `card.isFlipped`: Prevents redundant clicks on an already revealed card.
- `card.isMatched`: Ignores clicks on cleared cards.
- `isLocked`: Blocks clicks while timers are running.
- `flippedCards.length === 2`: Hard boundary ensuring no more than two cards can be open simultaneously.

### 6. State Transition Timeline

When the second card is selected (`newFlippedCards.length === 2`):

- **Match Case:**
  1. Concurrency lock activated: `setIsLocked(true)`.
  2. Delay of `500ms` allows visual confirmation of the match.
  3. Cards updated to `isMatched: true`.
  4. Score increments by 1.
  5. Remaining unmatched cards reshuffled via `shuffleUnmatchedCards()`.
  6. Concurrency lock released: `setIsLocked(false)`.

- **Mismatch Case:**
  1. Concurrency lock activated: `setIsLocked(true)`.
  2. Delay of `700ms` allows the player to inspect values.
  3. Cards flipped back: `isFlipped: false`.
  4. Subsequent delay of `300ms` triggers reshuffle of unmatched cards.
  5. Concurrency lock released: `setIsLocked(false)`.

---

## Algorithmic Complexity

| Operation | Time Complexity | Space Complexity | Description |
|---|---|---|---|
| **Deck Initialization** | **$O(N)$** | **$O(N)$** | Maps and shuffles the initial card array. |
| **Fisher-Yates Shuffle** | **$O(N)$** | **$O(N)$** | Linear time, unbiased uniform permutation. |
| **Partial Board Reshuffle** | **$O(N)$** | **$O(N)$** | Filters unmatched cards, shuffles, and maps them back. |
| **Card Click Event** | **$O(N)$** | **$O(N)$** | Evaluates matches and triggers reshuffles. |

*(Where $N$ is the total number of cards on the board, currently $N = 16$.)*

---

## Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend Framework** | **React 19** | Component composition, Hooks, functional state updates |
| **Build Tool** | **Vite 7** | Fast HMR dev server and optimized Rollup production bundler |
| **Styling** | **Vanilla CSS3** | CSS Grid, 3D transform animations, glassmorphism design tokens |
| **Linting** | **ESLint 9** | Code standards and React Hooks validation |

---

## Project Directory Structure

```text
react-memory-game/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── Card.jsx        # Flippable 3D card item (stateless)
│   │   ├── GameHeader.jsx  # Scoreboard, moves counter, and reset control
│   │   └── WinMessage.jsx  # Victory banner modal (shown on completion)
│   ├── hooks/
│   │   └── useGameLogic.js # Core game state machine, shuffle logic, timers
│   ├── App.jsx             # Root layout orchestrator
│   ├── index.css           # Global design system, 3D transforms, responsive styles
│   └── main.jsx            # React root DOM entry point
├── index.html              # HTML shell
├── package.json            # Dependencies and npm scripts
├── vite.config.js          # Vite build configuration
└── README.md               # Technical project documentation
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or later recommended)
- **npm** (v9.0.0 or later)

Verify environment:
```bash
node -v
npm -v
```

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rohan-Bhandari162/react-memory-game.git
   cd react-memory-game
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open your browser at the displayed local URL (typically `http://localhost:5173`).

---

## Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Runs the Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | Compiles production assets into the `/dist` directory. |
| `npm run preview` | Locally serves the production build for testing. |
| `npm run lint` | Runs ESLint to verify code quality. |

---

## Roadmap

- [ ] **Local Storage Persistence:** Store best moves and fastest completion records.
- [ ] **Timer / Speedrun Mode:** Implement optional countdown or stopwatch timer.
- [ ] **Configurable Difficulties:** Support alternative grid dimensions (3x4, 4x4, 6x6).
- [ ] **Sound Effects:** Add Web Audio API cues for flips, matches, and victory.
- [ ] **Automated Testing:** Integrate Vitest and React Testing Library for regression test coverage.

---

## Author & License

- **Author:** Rohan Bhandari
- **Repository:** [react-memory-game](https://github.com/Rohan-Bhandari162/react-memory-game)
- **License:** Distributed under the [MIT License](LICENSE).
