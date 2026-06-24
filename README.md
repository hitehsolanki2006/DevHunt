# 🌌 DevHunt — Local-First AI Assistant & Workspace for Developers

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Vite: React](https://img.shields.io/badge/Vite-React-emerald.svg)](https://vite.dev/)
[![Tauri: v2](https://img.shields.io/badge/Tauri-v2-orange.svg)](https://tauri.app/)
[![Platform: Windows | macOS | Linux](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()
[![Website: Netlify](https://img.shields.io/badge/Website-dev--hunt--local.netlify.app-teal.svg)](https://dev-hunt-local.netlify.app/)

DevHunt is a premium, **local-first developer productivity workspace**. Designed with absolute privacy in mind, it combines **Streaming Chat**, a **Knowledge Base (RAG)**, a **Quest Board (Todo Kanban)**, and a **Learning Path generator** into a single cohesive desktop workspace powered by free-tier Gemini API keys and local embedding pipelines.

No subscriptions. No third-party cloud data tracking. Everything runs locally on your machine.

👉 **Visit the Official Website & Download Installers:** [https://dev-hunt-local.netlify.app/](https://dev-hunt-local.netlify.app/)

---

## ⚡ Key Features

*   **🤖 AI Cognitive Assistant**: Streaming chat model with long-term memory (SQLite), rate-limited API key rotation, custom grammar helper overlays, and today's curriculum lesson targets.
*   **📚 Personal Knowledge Base (RAG)**: Index notes, PDFs, or scrape URLs. Includes a split-screen workspace with source-grounded analyst chat sessions.
*   **💻 Integrated Workspace IDE & Editor**: Features code tab panels powered by CodeMirror 6 with syntax highlighting, a collapsible file explorer, and a split-screen native terminal.
*   **🎮 Offline Game Arcade**: Canvas-based games (Git Commit Snake, Data Lane Runner, Terminal Decrypt, Hex Malware Sweeper) running with unified keyboard controls.
*   **🗺️ Interactive roadmap path & todo sync**: Automatically generates career roadmaps using the Gemini model and allows you to push roadmap tasks directly to your Quest Board.

---

## 📁 Repository Directory Structure

To help you find your way around the codebase:

```
DevHunt/
├── .github/                  # Structured YAML issue templates & CI/CD workflows
├── backend/                  # Python Flask backend server
│   ├── core/                 # Python modules (Chat, RAG, DB, Terminal engines)
│   ├── requirements.txt      # Backend dependencies (flask, PyMuPDF, etc.)
│   └── app.py                # Main Flask application API router
├── devhunt-website/          # Official landing website files (Netlify)
├── docs/                     # Technical specifications and guides
├── frontend/                 # Legacy Vanilla HTML/CSS/JS frontend
└── frontend-src/             # Modern React + Vite + Tauri v2 frontend
    ├── src-tauri/            # Tauri desktop Rust configuration
    ├── src/                  # React modular components
    │   ├── components/       # UI panels (Chat, QuestBoard, IDE, IntelVault, Arcade)
    │   └── App.jsx           # Core dashboard state manager
    └── vite.config.js        # Vite configurations and API dev proxy
```

---

## 🛠️ Current Project Status

*   **Current Stable Release**: `v1.0.2` (Installer binaries `.msi` and `.exe` for Windows are stable and available).
*   **Active Objective**: We are scaling DevHunt into a major open-source ecosystem. We are introducing GitHub Actions, writing issue guidelines, and inviting developers to shape the future of local AI workspaces!

---

## 🤝 How to Start Contributing

We love contributions! Follow these steps to get started:

1.  **Read the Guidelines**: Review the [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed developer installation, Python environment setups, Node React configurations, and coding guidelines.
2.  **Pick an Issue**: Head over to our **[GitHub Issues](https://github.com/hitehsolanki2006/DevHunt/issues)** page. We label starter tasks as `good first issue` and `help wanted`.
3.  **Submit a Pull Request**: Submit your changes via a Pull Request. Every Pull Request will run our automated [GitHub Actions CI Pipeline](.github/workflows/ci.yml) to ensure it compiles correctly.

---

## 🔒 Security & Privacy

We take data privacy very seriously. We index notes and run model scripts locally. To report vulnerabilities safely without exposing them to public zero-day exploits, please review our [SECURITY.md](SECURITY.md) policy.

---

## 📄 License

DevHunt is open-source software licensed under the **[MIT License](LICENSE)**.

---

## 👥 Connect & Maintainers

DevHunt is created and maintained by:

**Hitesh Solanki** — Hunter Group
*   **Website**: [hiteshsolanki.in](https://hiteshsolanki.in)
*   **Email**: [solankihiteshpankajbhai7@gmail.com](mailto:solankihiteshpankajbhai7@gmail.com)
*   **GitHub**: [@hitehsolanki2006](https://github.com/hitehsolanki2006)
*   **Mobile**: [+91 9327810431](tel:+919327810431)

Feel free to open an issue or pull request if you run into any setup problems or want to suggest new features! Let's build the ultimate local dev suite together. 💻