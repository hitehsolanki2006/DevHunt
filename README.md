# 🌌 DevHunt — Local-First AI Assistant for Developers

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Platform: Windows | macOS | Linux](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

DevHunt is a local-first, self-hosted developer productivity workspace. Designed for absolute privacy, it combines **Streaming Chat**, a **Knowledge Base (RAG)**, **Quest Board (Todo Kanban)**, and a **Learning Path generator** into a single cohesive system powered by free-tier Gemini API keys and local embedding pipelines.

No subscriptions. No third-party data tracking. Everything is stored on your machine.

---

## 🚀 Key Features

*   **🛠️ Self-Healing Setup**: Run a single command (`run.bat` or `run.sh`) to verify Python 3.10+, check virtual environment health (auto-rebuilds if broken), and use a fast dependency checker to skip installation checks if satisfied.
*   **🖥️ Hunt Terminal CLI**: Run cross-platform shell commands, manage todos, test API keys, view memory, and check notifications via the `hunt` command-line utility directly in the browser.
*   **🧠 Long-Term AI Memory**: Automatically aggregates and saves facts, user details, and preferences from conversation history to SQLite. View and edit facts directly on the settings page.
*   **📡 System Messages & Git Auto-Updater**: Dedicate announcements tab that displays software updates, git pull releases, and local warnings. Automatically checks and pulls updates.
*   **🔄 Intelligent Key Rotation**: Register multiple Gemini API keys. DevHunt performs round-robin rotation, handles 429 rate limit cooldowns, and bypasses faulty keys seamlessly.
*   **🧠 Natural Quest Board Integration**: Manage tasks organically in chat. The AI assistant has real-time visibility into your Quest Board and updates, completes, or deletes tasks using LLM action-tag extraction.
*   **📚 Personal Knowledge Base (RAG)**: Index notes, PDFs, or scrape URLs. DevHunt performs local similarity matches and feeds document context directly to the LLM with exact source citations.
*   **📊 Comprehensive Activity Logging**: Every action (chat messages, terminal commands, Quest Board changes, startup checks) is logged to SQLite with level and category filters (`chat`, `todo`, `terminal`, `updates`, etc.) from a live developer logs dashboard.

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

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/hitehsolanki2006/DevHunt.git
    cd Local-AI
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
    *   Open the DevHunt dashboard at `http://localhost:5000`.
    *   Navigate to **Settings & Nodes** in the sidebar, paste your key, and click **+ Register Key**.

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
Local-AI/
├── backend/
│   ├── app.py                # Flask API application entry point
│   ├── config.py             # App paths, settings constants, and AES secrets
│   ├── requirements.txt      # Python modules list
│   ├── check_requirements.py # Fast dependency verification script
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
├── frontend/
│   ├── index.html            # Core user interface
│   ├── logs.html             # System logs debugger dashboard
│   ├── app.js                # SSE receivers, state handlers, & rendering
│   └── styles.css            # Custom CSS themes & glassmorphism styling
├── run.bat                   # Automated Windows launcher
├── run.sh                    # Automated macOS/Linux launcher
├── ROADMAP.md                # Development roadmap
└── README.md
```

---

## 📡 Core API Reference

### Chat & Streams
*   `POST /api/chat/stream`: Initiates an SSE token stream for user messages, returning real-time response chunks and Quest Board status updates.
*   `GET /api/chat/history`: Retrieves chat session database records.
*   `DELETE /api/chat/history`: Clears session history from the database.

### Key Management
*   `GET /api/keys`: Lists registered keys (masked).
*   `POST /api/keys`: Encrypts and saves a new Gemini API key.
*   `DELETE /api/keys/<id>`: Deletes a key from storage.
*   `POST /api/keys/<id>/test`: Live test connection to Gemini API.

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

**Hitesh Solanki**
*   **Website**: [hiteshsolanki.in](https://hiteshsolanki.in)
*   **Email**: solankihiteshpankajbhai7@gmail.com
*   **Mobile**: +91 9327810431