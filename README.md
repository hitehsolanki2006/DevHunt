# 🌌 DevHunt — Local-First AI Assistant for Developers

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Platform: Windows | macOS | Linux](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()
[![Website: Netlify](https://img.shields.io/badge/Website-dev--hunt--local.netlify.app-emerald.svg)](https://dev-hunt-local.netlify.app/)

DevHunt is a local-first, self-hosted developer productivity workspace. Designed for absolute privacy, it combines **Streaming Chat**, a **Knowledge Base (RAG)**, **Quest Board (Todo Kanban)**, and a **Learning Path generator** into a single cohesive system powered by free-tier Gemini API keys and local embedding pipelines.

No subscriptions. No third-party data tracking. Everything is stored on your machine.

🔗 **Visit the Official Website & Download Installers:** [https://dev-hunt-local.netlify.app/](https://dev-hunt-local.netlify.app/)

---

## 🚀 Key Features

*   **🤖 AI Cognitive Assistant**: Chat with the model powered by custom knowledge index (RAG) and grammar helpers to perfect writing. Includes Today's Targets (curriculum lessons) and Quick Quests (to-dos with custom styled checklists and dim/strikethrough animations).
*   **📚 Personal Knowledge Base (RAG)**: Index notes, PDFs, or scrape URLs. Includes a **Split-Screen Document Analyst** side-by-side workspace inside the **Intel Vault** with source-grounded RAG chat sessions.
*   **🛠️ Self-Healing Setup**: Run a single command (`run.bat` or `run.sh`) to verify Python 3.10+, check virtual environment health (auto-rebuilds if broken), use a fast dependency checker to skip installation checks, and automatically kill orphaned processes to free up port 1225.
*   **🖥️ Hunt Terminal CLI**: Run cross-platform shell commands, manage todos, test API keys, view memory, check notifications, and perform full system backup imports/exports (`hunt backup import <file>`) via the `hunt` command-line utility directly in the browser or terminal client.
*   **🗺️ Interactive Roadmap Path & Quest Sync**: Generate custom learning roadmaps. Expand cards to view daily milestones, study resources, reference badges, and use the quick `+ Add Quest` shortcut to directly add tasks to your Quest Board.
*   **🧠 Long-Term AI Memory**: Automatically aggregates and saves facts, user details, and preferences from conversation history to SQLite. View and edit facts directly on the settings page.
*   **📡 System Messages & Git Auto-Updater**: Dedicated announcements tab that displays software updates, git pull releases, and local warnings. Automatically checks and pulls updates.
*   **🔄 Intelligent Key Rotation**: Register multiple Gemini API keys. DevHunt performs round-robin rotation, handles 429 rate limit cooldowns, and bypasses faulty keys seamlessly.
*   **🌐 Upgraded URL Ingestion Scraper**: Scrape web documentation pages with protocol auto-prepending, customizable user-agent browser header masking, and self-signed SSL verification fallback bypasses.
*   **📊 Comprehensive Activity Logging**: Every action (chat messages, terminal commands, Quest Board changes, startup checks) is logged to SQLite with level and category filters from a live developer logs dashboard.
*   **🎮 Offline Game Arcade**: A local-first suite of developer-themed games (Git Commit Snake, Data Lane Runner, Terminal Decrypt, Hex Malware Sweeper) running on canvas with custom non-blocking overlays and unified keyboard event controls.
*   **📐 Layout Polish & Sidebar Minimize**: Minimize the left navigation sidebar to an icon-only column via a settings toggle, top hamburger button, or global `Ctrl + B`/`Cmd + B` keyboard hotkey.
*   **⚙️ Feature Access Switches**: Enable/disable workspace modules (Music Player, Quest Board, Intel Vault, Doc Forensics, Game Arcade) with automatic homepage routing fallbacks.
*   **💻 Integrated Workspace IDE & Editor**: Collapsible File Explorer tree. Features monospaced code editing pane with scroll-synchronized line numbers, multi-tab editing workspace, context menus, document outlines, document indentation formatter, and floating Find & Replace.
*   **📟 Split-Screen Integrated Terminal**: Toggle an integrated bottom terminal panel inside the editor workspace. Executes both built-in `hunt` commands and **native host system commands** (e.g. `npm`, `git`, `python`) using your host shell.
*   **🎨 Multi-Theme System**: Instantly switch between the default **Industrial Slate** theme, the high-contrast **Minimalist Light** theme, the **Devil Version** theme, and the **Cyberpunk Neon** theme.
*   **🔤 Typography & UI Font Selection**: Customize the overall interface layout typography via the settings menu. Supports 8 Google Fonts.

---

## 📦 Desktop App Installers (.EXE & .MSI)

DevHunt is packaged as a standalone desktop application using **Tauri v2** and **Rust** wrapping WebView2 for rendering, combined with a **PyInstaller** bundled Python sidecar. This eliminates the need to manually install Python or configure dependencies on the host system.

### Pre-compiled Binaries for Windows:
*   **Windows Setup (EXE)**: A standard setup executable that handles installation.
*   **Windows Installer (MSI)**: An enterprise-ready installer package.

Both installers are version-locked (current version: **1.0.2**) and can be downloaded directly from the official website:
👉 **Download Installers:** [https://dev-hunt-local.netlify.app/#download](https://dev-hunt-local.netlify.app/#download)

---

## 🛠️ System Requirements

*   **OS**: Windows 10/11, macOS Big Sur+, or Ubuntu 20.04+
*   **Python**: Version `3.10` or higher (only required if running from source)
*   **Internet Connection**: Required for communicating with the Gemini API.
*   **Web Browser**: Chrome, Edge, Firefox, or Safari (launcher scripts open your default browser).

---

## 🚀 Setup & Quickstart (Running from Source)

If you prefer to run the workspace from source instead of using the desktop installers:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/hitehsolanki2006/DevHunt.git
    cd DevHunt
    ```

2.  **Run the Launcher**:
    *   **Windows**: Run:
        ```cmd
        run.bat
        ```
    *   **macOS / Linux**: Set execute permissions and run:
        ```bash
        chmod +x run.sh
        ./run.sh
        ```

3.  **Register your Gemini API Key**:
    *   Get a free key from the [Google AI Studio Console](https://aistudio.google.com/app/apikey).
    *   Open the DevHunt dashboard at `http://localhost:1225`.
    *   Navigate to Settings, paste your key, and click **Register Key**.

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