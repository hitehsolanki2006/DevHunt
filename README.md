# 🌌 DevHunt — Local-First AI Assistant for Developers

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Platform: Windows | macOS | Linux](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

DevHunt is a local-first, self-hosted developer productivity workspace. Designed for absolute privacy, it combines **Streaming Chat**, a **Knowledge Base (RAG)**, **Quest Board (Todo Kanban)**, and a **Learning Path generator** into a single cohesive system powered by free-tier Gemini API keys and local embedding pipelines.

No subscriptions. No third-party data tracking. Everything is stored on your machine.

---

## 🚀 Key Features

*   **🛠️ Self-Healing Setup**: Run a single command (`run.bat` or `run.sh`) to verify Python 3.10+, check virtual environment health (auto-rebuilds if broken), use a fast dependency checker to skip installation checks if satisfied, and automatically kill orphaned processes to free up port 1225 (or the custom set port) before launching.
*   **🖥️ Hunt Terminal CLI**: Run cross-platform shell commands, manage todos, test API keys, view memory, check notifications, and perform full system backup imports/exports (`hunt backup import <file>`) via the `hunt` command-line utility directly in the browser or terminal client.
*   **🗺️ Interactive Roadmap Path & Quest Sync**: Generate custom learning roadmaps. Expand cards to view daily milestones, study resources, reference badges, and use the quick `+ Add Quest` shortcut to directly add tasks to your Quest Board.
*   **🧠 Long-Term AI Memory**: Automatically aggregates and saves facts, user details, and preferences from conversation history to SQLite. View and edit facts directly on the settings page.
*   **📡 System Messages & Git Auto-Updater**: Dedicated announcements tab that displays software updates, git pull releases, and local warnings. Automatically checks and pulls updates.
*   **🔄 Intelligent Key Rotation**: Register multiple Gemini API keys. DevHunt performs round-robin rotation, handles 429 rate limit cooldowns, and bypasses faulty keys seamlessly.
*   **🧠 Natural Quest Board & Assistant Redesign**: Manage tasks organically in chat. The AI assistant has a completely redesigned interface with asymmetric message bubbles, a rounded input pill, a clickable Day curriculum target card linked directly to the Hunt Path (with auto-expand/scroll/glow redirection), and custom styled Quick Quest checklists.
*   **📚 Personal Knowledge Base & Analyst (RAG)**: Index notes, PDFs, or scrape URLs. Includes a **Split-Screen Document Analyst** side-by-side workspace inside the **Intel Vault** with source-grounded RAG chat sessions.
*   **🌐 Upgraded URL Ingestion Scraper**: Scrape web documentation pages with protocol auto-prepending, customizable user-agent browser header masking, and self-signed SSL verification fallback bypasses.
*   **📊 Comprehensive Activity Logging**: Every action (chat messages, terminal commands, Quest Board changes, startup checks) is logged to SQLite with level and category filters (`chat`, `todo`, `terminal`, `updates`, etc.) from a live developer logs dashboard.
*   **🎮 Offline Game Arcade**: A local-first suite of developer-themed games (Git Commit Snake, Data Lane Runner, Terminal Decrypt, Hex Malware Sweeper) running on canvas with custom non-blocking overlays and unified keyboard event controls.
*   **📐 Layout Polish & Sidebar Minimize**: Minimize the left navigation sidebar to an icon-only column via a settings toggle, top hamburger button, or global `Ctrl + B`/`Cmd + B` keyboard hotkey. Independently scrollable navigation list that pins Brand header and status footer. Duplicate top panel tabs bar is hidden (`display: none`) to maximize vertical code editing space.
*   **⚙️ Feature Access Switches**: Enable/disable workspace modules (Music Player, Quest Board, Intel Vault, Doc Forensics, Game Arcade) with automatic homepage routing fallbacks.
*   **💻 Integrated Workspace IDE & Editor**: Collapsible File Explorer tree (recursive scans filtering `.git`, `node_modules`, etc.). File Explorer automatically collapses on non-editor tabs. Features monospaced code editing pane with scroll-synchronized line numbers, multi-tab editing workspace (with local storage draft recovery every 4 seconds), context menus (create, rename, delete files/folders), document outlines (for JS, Py, HTML, MD), document indentation formatter (`Shift+Alt+F`), and floating Find & Replace. Easily mount local directories temporarily via the **Browser File System Access API** (`Ctrl+Alt+O` to open folder, `Ctrl+O` for file).
*   **📟 Split-Screen Integrated Terminal**: Toggle an integrated bottom terminal panel inside the editor workspace (via header button or keyboard settings). Executes both built-in `hunt` commands and **native host system commands** (e.g. `npm`, `git`, `python`, `ipconfig`) using your host shell with synchronized CWD prompts.
*   **🔌 Host CLI DevTerminal Launcher**: Connect to the running DevHunt backend terminal session directly from your host command line window by running `hunter -dt` (or `hunter.bat -dt` on Windows).
*   **🎨 Multi-Theme System**: Instantly switch between the default **Industrial Slate** theme (professional dark slate-gray), the high-contrast **Minimalist Light** theme (polished with premium Indigo `#4f46e5` accents, white inputs, Indigo/gray chat bubbles, and white Kanban cards), the **Devil Version** theme (polished dark charcoal layout with premium off-white/silver accents, a dark charcoal status bar, and custom grayscale/silver canvas charts in the Stats dashboard), and the **Cyberpunk Neon** theme. Includes theme-aware canvas charts that auto-adjust grids, text, and colors, and client-side canvas loop suspension when dark/light themes are active to save CPU cycles.
*   **🔤 Typography & UI Font Selection**: Customize the overall interface layout typography via the settings menu. Supports 8 beautiful Google Fonts (Inter, Outfit, Roboto, Fira Sans, IBM Plex Sans, Orbitron, Caveat, JetBrains Mono, or client OS System Default). Custom system instructions textareas automatically inherit the selected UI font family dynamically.

---

## 🛠️ System Requirements

Before setting up DevHunt, ensure your local environment satisfies the following:

### Software Requirements
*   **OS**: Windows 10/11, macOS Big Sur+, or Ubuntu 20.04+
*   **Python**: Version `3.10` or higher
*   **Internet Connection**: Required for initial setup and communicating with the Gemini API.
*   **Web Browser**: Chrome, Edge, Firefox, or Safari (launcher scripts open your default browser).

---

## 🔌 Setup & Quickstart

DevHunt is designed to require zero manual Python environment configuration.

### The Easiest Way: Automated Launchers

    ```bash
    git clone https://github.com/hitehsolanki2006/DevHunt.git
    cd DevHunt
    ```

2.  **Run the Launcher**:
    *   **Windows**: Double-click `run.bat` or run:
        ```cmd
        run.bat
        ```
    *   **macOS / Linux**: Set execute permissions and run:
        ```bash
        chmod +x run.sh
        ./run.sh
        ```

    > [!NOTE]
    > **What the Launcher Does:**
    > 1. Checks if Python 3.10+ is installed and present in your system PATH (outputs helper guide and official links if missing).
    > 2. Validates existing virtual environment health (automatically deletes and recreates `backend/venv` if broken or corrupted).
    > 3. Runs a fast dependency checker (`check_requirements.py`) to skip pip install on subsequent launches.
    > 4. Installs and upgrades all required modules from `backend/requirements.txt` with a pip upgrade fail-safe.
    > 5. Launches the Flask backend server and automatically opens DevHunt in your default browser.

3.  **Register your Gemini API Key**:
    *   Get a free key from the [Google AI Studio Console](https://aistudio.google.com/app/apikey).
    *   Open the DevHunt dashboard at `http://localhost:1225`.
    *   Navigate to **Settings & Nodes** in the sidebar, paste your key, and click **+ Register Key**.

4.  **Connect via Host Command Line (Optional)**:
    *   To execute commands in the DevHunt workspace directly from your native Command Prompt, PowerShell, or terminal window, open a new window and run:
        *   **Windows**: `hunter.bat -dt`
        *   **macOS / Linux**: `./hunter -dt`

### Manual Installation (Optional fallback)

If you prefer to set up your environment manually:
```bash
# 1. Navigate to backend and setup venv
cd backend
python -m venv venv

# 2. Activate venv & install dependencies
# On Windows:
venv\Scripts\activate
pip install -r requirements.txt
# On macOS/Linux:
source venv/bin/activate
pip install -r requirements.txt

# 3. Launch the server
python app.py
```

---

## 📁 Repository Structure

```
DevHunt/
├── backend/
│   ├── app.py                # Flask API application entry point
│   ├── config.py             # App paths, settings constants, and AES secrets
│   ├── requirements.txt      # Python modules list
│   ├── check_requirements.py # Fast dependency verification script
│   ├── hunter_cli.py         # Host command prompt CLI connector client
│   └── core/
│       ├── chat_engine.py    # SSE stream generation & tag extraction logic
│       ├── rag_pipeline.py   # Vector ingestion, URLs parser, & DB matching
│       ├── key_manager.py    # Stateful round-robin API key rotation
│       ├── todo_manager.py   # SQLite CRUD operations for Quest board
│       ├── learning_path.py  # AI roadmap compilation
│       ├── update_manager.py # Git auto-updater and check client
│       ├── terminal_engine.py# Hunt Terminal CLI execution logic
│       ├── memory_manager.py # AI long-term consolidated memory manager
│       ├── profile_manager.py# User profile & settings manager
│       ├── analytics.py      # Local usage & streak calculations
│       └── db.py             # SQLite connection pools & schema setup
├── frontend-src/             # Vite + React IDE (modern interface)
│   ├── src/                  # React components & pages
│   ├── dist/                 # Compiled production bundle (served by Flask)
│   └── public/               # Static assets (docs.html, logs.html, logo.png)
├── frontend/                 # Legacy plain HTML/JS interface (fallback)
├── devhunt-website/          # Netlify-ready static marketing site
├── run.bat                   # Automated Windows launcher (port 1225)
├── run.sh                    # Automated macOS/Linux launcher
├── build_desktop.bat         # Full desktop EXE builder (Tauri + PyInstaller)
└── README.md
```

---

## 📡 Core API Reference

### Chat & Streams
*   `POST /api/chat`: Processes synchronous chat messages (optional `source_id`).
*   `POST /api/chat/stream`: Initiates an SSE token stream for user messages, returning real-time response chunks and Quest Board status updates (optional `source_id`).
*   `GET /api/chat/sessions`: Lists all unique chat sessions in SQLite, returning timestamps and previews.
*   `GET /api/chat/history`: Retrieves chat session database records.
*   `DELETE /api/chat/history`: Clears session history from the database.

### Key Management
*   `GET /api/keys`: Lists registered keys (masked).
*   `POST /api/keys`: Encrypts and saves a new Gemini API key.
*   `DELETE /api/keys/<id>`: Deletes a key from storage.
*   `POST /api/keys/<id>/test`: Live test connection to Gemini API.

### Workspace IDE
*   `GET /api/ide/files`: Returns a JSON file tree of the local workspace (filtering system files).
*   `GET /api/ide/file`: Reads relative path content (with directory traversal guard checks).
*   `POST /api/ide/file`: Writes edits to a relative path on disk (auto-creates folders).

---

## 📖 Module & Functions Documentation

Comprehensive documentation is available at the [GitHub repository](https://github.com/hitehsolanki2006/DevHunt/tree/main/docs) or view the full interactive docs at `http://localhost:1225/docs` when the app is running.

---

## 🤝 How to Contribute

We welcome contributions of all forms: bug fixes, UI enhancements, features, and documentation updates.

### Development Workflow

1.  **Fork the Repo** and create a feature branch:
    ```bash
    git checkout -b feature/amazing-new-feature
    ```
2.  **Backend Rules**:
    *   Keep modules inside `backend/core/` structured and single-purpose.
    *   Maintain clean SQLite transactions and close connections correctly inside helper functions.
3.  **Frontend Rules**:
    *   Keep styling inside `frontend/styles.css` clean, clean variables, and ensure responsive design.
    *   Handle asynchronous state changes gracefully in `frontend/app.js`.
4.  **Open a Pull Request**: Submit your changes to the main repository for review.

---

## 📄 License

DevHunt is open-source software released under the [MIT License](LICENSE).

---

## 👥 Created By

**Hitesh Solanki** — Hunter Group
*   **Website**: [hiteshsolanki.in](https://hiteshsolanki.in)
*   **Email**: solankihiteshpankajbhai7@gmail.com
*   **GitHub**: [hitehsolanki2006](https://github.com/hitehsolanki2006)
*   **Mobile**: +91 9327810431