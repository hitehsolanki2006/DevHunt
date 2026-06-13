# 🗺️ DevHunt Development Roadmap: Voice, Agents, & MCP

This document details the architectural design, completed milestones, and future implementation plans for extending DevHunt into an interactive, voice-controlled, agentic local assistant.

---

## ✅ Completed Milestones

### 1. Interactive & Collapsible Roadmap Path
* **Description**: Transformed the static roadmap path cards into interactive, expandable details sections.
* **Features**:
  * **Smooth Toggle Transition**: Clicking a day card toggles a three-column detail panel (What to Learn, Study Resources, Quests).
  * **Link Badges**: Displays clickable online links for documentation and reference articles.
  * **Quest Sync**: A `+ Add Quest` shortcut button next to each daily task immediately sends the task to the Quest Board.
  * **Bulk Actions**: Added **Expand All** and **Collapse All** controls in the header.

### 2. Split-Screen Document Analyst (Intel Vault)
* **Description**: Transformed the index list into an interactive reading and Q&A workspace.
* **Features**:
  * **Grounded RAG Filtering**: Scopes the AI context search strictly to the active document being viewed.
  * **Side-by-Side Panel**: Renders scrollable raw document text on the left, and a dedicated, document-specific chat room on the right.
  * **Interactive History**: Messages are isolated by document ID (stored as `doc_chat_<id>` sessions) and can be cleared individually.

### 3. Upgraded RAG URL Ingestion Scraper
* **Description**: Enhanced web scraping and crawling capabilities inside the Intel Vault.
* **Features**:
  * **Protocol Auto-Prepending**: Prefixes `https://` to bare domain inputs automatically to prevent extraction failures.
  * **Browser-Like Header Masking**: Added standard browser headers (`User-Agent`, etc.) to prevent scrapers from being blocked by security firewalls on remote sites.
  * **SSL Certificate Verification Fallback**: Handled self-signed certificates gracefully using SSL bypass (`verify=False` and disabling `urllib3` warnings).

### 4. Game Arcade Stations
* **Description**: Added a local-first, offline-ready terminal mini-game suite designed to run on canvas.
* **Features**:
  - **4-Column Grid Menu**: The game selection menu displays all 4 games in a clean, top-aligned horizontal grid.
  - **Premium Overlays**: Replaced all blocking browser `alert()` popups with non-blocking, visual HTML game-over and win overlays.
  - **Four Classic Games**: Includes Git Commit Snake, Data Lane Runner (safe obstacle loop iterations), Terminal Decrypt, and Hex Malware Sweeper, all styled with a flat, developer-themed color palette.
  - **Consolidated Controls**: Keydown handlers are registered globally to prevent focus conflicts and event leaks.

### 5. Layout & Navigation Polish
* **Description**: Refined the dashboard's layout to maximize visual efficiency, workspace customization, and accessibility.
* **Features**:
  - **Scrollable Navigation Sidebar**: Constrained `.left-sidebar` height to `100vh` and added dynamic scroll behaviors, while keeping the Brand header and status footer pinned.
  - **Minimize Sidebar**: Collapses the sidebar into an icon-only narrow panel. Toggled via settings toggle, clicking the hamburger icon, or using the global `Ctrl + B` (or `Cmd + B`) shortcut.
  - **Feature Access Toggles**: Settings switches to dynamically show or hide modules (Music Player, Quest Board, Intel Vault, Doc Forensics, Game Arcade) and clean route redirection on disable.

---

## 🎙️ Future Phase 1: Multilingual Voice Control
Enable hands-free typing and natural voice inputs in English, Hindi, Gujarati, and Marathi directly from the dashboard.

### Core Architecture
We will use the browser-native **Web Speech API** (`SpeechRecognition`). It provides:
1. **Zero Server Load**: All audio-to-text processing is handled by the client browser engine.
2. **Instant Transcription**: Live previews of words as they are spoken.
3. **Broad Language Support**: Uses exact region-specific language locales (`en-IN`, `hi-IN`, `gu-IN`, `mr-IN`).

### UI/UX Integration
* Add a **🎙️ Microphone button** inside the chat input bar.
* Pulsing animation when the microphone is active (listening mode).
* Add a **Language dropdown** allowing users to switch the spoken language instantly.

---

## 🤖 Future Phase 2: Agentic Tool Core (Local System Commands)
Allow the DevHunt backend to perform physical, local actions on your machine in response to user requests (either typed or spoken).

### Target Operations
1. **Application Launchers** ("open Chrome", "open Spotify"):
   * Use Python's `webbrowser` and `subprocess` to launch default system applications or open web addresses.
2. **Audio & Sentiment Feedback** ("play music", "I feel sad"):
   * Use local sound triggers (such as `pygame.mixer` or HTML5 audio playback) to trigger favorite playlists or sounds.
3. **Local Email Automation** ("draft an email", "read my mail"):
   * Configure secure SMTP (sending) and IMAP (receiving) credential storage in DevHunt's settings.
   * Build tools to query unread emails, generate context-aware draft files, and send emails directly.

---

## 🔌 Future Phase 3: Model Context Protocol (MCP) Integration
Integrate standard **Model Context Protocol (MCP)** configurations to support connecting third-party tool ecosystems.

```
+------------------+         JSON-RPC         +-------------------+
|  DevHunt Client  | <----------------------> |    MCP Server     |
| (Flask Backend)  |     (Standard Protocol)  | (Git, Filesystem) |
+------------------+                          +-------------------+
```

### Protocol Advantages
* **Decoupled Services**: Instead of coding every tool into the DevHunt core, developers can spin up external, sandboxed MCP servers.
* **Shared Standard**: Dynamically link official MCP servers (such as Filesystem tools, Postgres query executors, or Github issue managers) using a unified `mcp_config.json` configuration file.
