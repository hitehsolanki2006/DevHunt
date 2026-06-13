# 🕹️ Arcade and Layout Enhancements

This document details the design, implementation, and keyboard shortcuts for the **Game Arcade** and the **Layout Toggles & Sidebar Polish** features added to DevHunt.

---

## 📐 Layout & Navigation Polish

To improve the screen-space utilization, accessibility, and desktop usability of the dashboard, several visual and layout adjustments were introduced:

### 1. Scrollable Navigation Sidebar
* **Design Goal**: Prevent overflow of sidebar elements from hiding navigation options or metrics logs when additional features (like the Music Player or Game Arcade) are active.
* **Implementation**:
  - The left sidebar (`.left-sidebar`) has its overall height restricted to `100vh` and layout set to `flex`.
  - The brand logo header and the bottom status/version footer are pinned securely.
  - The navigation list (`.nav-links`) is configured with `overflow-y: auto` to allow independent, smooth scroll control if elements exceed the vertical space.

### 2. Minimize Sidebar Toggle & Shortcuts
* **Features**:
  - The sidebar can be collapsed into a compact icon-only column to maximize working workspace for features like the Code Assistant and Game Arcade.
  - A **Minimize Sidebar** checkbox toggle is integrated into the **Settings** menu.
  - Toggling can be done directly by clicking the hamburger icon `≡` at the top of the sidebar.
  - A global hotkey **`Ctrl + B`** (or `Cmd + B` on macOS) is implemented to instantly toggle the collapsed state from any tab.
  - The minimized state persists across browser reloads via `localStorage` state synchronization and is synced with the SQLite database settings profile.

### 3. Collapsible File Explorer Sidebar Visibility
* **Features**:
  - To prevent layout confusion, the File Explorer sidebar is configured to **only show/open when the Code Editor panel is active**.
  - Switching to any non-editor tab (AI Assistant, Stats, Hunt Path, Settings, etc.) will **automatically collapse the File Explorer sidebar**.
  - Clicking the active Code Editor icon in the Activity Bar toggles the sidebar, while clicking it when another panel is active switches to the Code Editor and expands the sidebar.

### 4. Remove Redundant Horizontal Panel Tabs Bar
* **Implementation**:
  - Hidden the duplicate top horizontal panel tabs bar (`#panel-tabs-bar`) via CSS (`display: none !important`), as it duplicated the left vertical Activity Bar navigation, reclaiming valuable vertical space.

---

## 🎮 Game Arcade Stations

The **Game Arcade** is a local-first, offline-ready terminal mini-game suite designed to let developers unwind during long build/compile breaks. 

### 1. Game Selection Layout
- The game selection screen arranges all 4 games in a clean, top-aligned **4-column horizontal grid**, leaving the second row ready for future expansions.
- Each card has smooth scale/border hover micro-animations matching the developer theme.

### 2. Game List & Mechanics
The arcade includes four retro, developer-themed games styled with a clean, flat-color palette (avoiding overly bright neon colors in the game arena):
* **Git Commit Snake**: Guide a git branch vector to ingest green "commit" nodes while avoiding conflict segments and walls.
* **Data Lane Runner**: Lane-dodge falling malware blocks while collecting green "RAM buffer" units to compile successfully. (Implementation uses backward-iterating loops for obstacle updates to prevent array splice index skips).
* **Terminal Decrypt**: Solve password lockouts using likeness matching logic in a classic terminal console interface.
* **Hex Malware Sweeper**: Audit a 100-cell hex address board to flag malware vectors safely.

### 3. Non-Blocking Glassmorphic Overlays
- All legacy, blocking browser dialogue methods (`alert()`) have been removed from the game loops.
- Game Over, Victory, and Lockout screens use custom HTML overlays positioned directly over the canvas viewport.
- Keyboard shortcut overlays display action hints (e.g., **SPACE to Restart**, **ESC to Menu**) to keep gameplay fluid and non-intrusive.
- Canvas event listeners for keyboard inputs are consolidated globally to prevent listener leaks and focus conflicts between games.

---

## 🎨 Theme System & Integrated Workspace IDE

DevHunt has transitioned to a professional, slate-gray IDE-like workspace with support for multiple themes and real-world file management.

### 1. Multi-Theme Architecture
* **Industrial Slate (Default)**: A premium, dark slate-gray design with clean blue accents, monospaced text, and subtle micro-animations. Bypasses background particle canvas updates when active to optimize CPU performance.
* **Cyberpunk Neon**: The legacy neon-green/cyan theme with glows and active `#dragon-bg` canvas background loops.
* **Minimalist Light (Polished)**:
  - Theme variables are tuned to use a premium Indigo accent (`#4f46e5`) instead of bright cyan.
  - Input, select, and textarea fields are configured with a solid white background (`#ffffff`), dark charcoal text (`#0f172a`), and clean borders (`#cbd5e1`).
  - Chat bubbles are customized: User messages appear as solid Indigo bubbles with white text, and AI Assistant responses appear as clean light gray bubbles (`#f1f5f9`).
  - Quest Kanban Cards are set to solid white backgrounds (`#ffffff`) for readability against column backdrops.
  - State Sync: Theme selections automatically synchronize to the SQLite profile database and persist in browser `localStorage` to avoid flash-of-unstyled-content (FOUC).
* **Theme-Aware Canvas Charts**: Analytics charts (`drawBarChart`, `drawDailyChart`, and `drawDonutChart`) dynamically check if `document.body.classList.contains('theme-light')` is true. If so, they adapt grid lines, borders, labels, and text colors to dark, legible tones.

### 2. Collapsible File Explorer & Navigation
* **Slim Activity Bar**: Pinned to the far left with custom SVG navigation icons for all core developer panels.
* **Collapsible Side panel**: Hosts a directory tree explorer fetching contents from `/api/ide/files`.
* **VS Code-Style Sidebar Toggling**:
  - Clicking an Activity Bar icon when its panel is *already active* will toggle (expand/collapse) the left File Explorer sidebar.
  - Clicking an Activity Bar icon for a *different* panel will switch to that panel and ensure the sidebar remains expanded.
* **Workspace Tree Nodes**: Supports folders expansion/collapsing and files identification. Filters system files and folders like `.git`, `node_modules`, `venv`, and `.gemini`.
* **Explorer Panel Toggle**: Can be collapsed or expanded using the toggle icon button, View menu topbar, Settings toggle switch, or the **`Ctrl + B`** keyboard shortcut.

### 3. Monospaced Code Editor Pane & Topbar Title
* **Dynamic Line Numbers**: Auto-calculating line indicator scroll-synchronized with code workspace textarea.
* **Tab Key Hook**: Overrides standard tab key focus-out behavior to insert four spaces.
* **Save Transactions**: Integrates client-side modifications saving back to the backend disk via `POST /api/ide/file` endpoints using the Save button or `Ctrl + S` shortcut.
* **Centered Window Title**: A centered topbar title bar dynamically displays the current open relative file path (e.g. `frontend/app.js - DevHunt`) when editing, and reverts to `DevHunt` when closed/cleared.
* **Keyboard Shortcut (⌘K / Ctrl+K)**: Instantly switches focus to the AI Assistant panel and focuses the chat input (`#chat-input`).
* **Inline New File Creation (Ctrl + N)**:
  - Removed browser-level `prompt()` dialogues.
  - Clicking the `+` button in the explorer sidebar header or pressing **`Ctrl + N`** inserts an inline text input box at the top of the file tree.
  - Typing the filename and pressing `Enter` creates an empty file on disk immediately via backend `POST /api/ide/file`, refreshes the explorer tree, and opens it. Pressing `Escape` or blurring cancels.

---

## 🎵 Background Music Playback
* **Fallback Autoplay**: Pressing play when no track is selected will automatically fall back to load and play the first available track.
* **Deck Click Navigation**: Clicking the track details or progress time of the horizontal music player deck switches the workspace view directly to the Music panel.
