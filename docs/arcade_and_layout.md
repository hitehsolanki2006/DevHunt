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

### 3. Feature Access Toggles
* **Design Goal**: Allow developers to customize the workspace and hide unused modules.
* **Implementation**:
  - Granular checkboxes under Settings control the visibility of modules: *Music Player, Hunt Path, Quest Board, Intel Vault, Doc Forensics, and Game Arcade*.
  - Toggling a module off instantly removes its menu options from the sidebar.
  - Dynamic route fallback is implemented: if a developer toggles off a currently active module, the workspace automatically falls back to the **AI Cognitive Assistant** screen to prevent visual breakage.

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
