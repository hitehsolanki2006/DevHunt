# DevHunt — AI Assistant

> A local-first, self-hosted AI assistant for developers. Built for problem solving, debugging, learning, and answering any question — powered by Google's free Gemini & Gemma models. No subscriptions. No cloud. Runs entirely on your machine.

---

## Why DevHunt?

Most AI tools either cost money or send your data to third-party servers. DevHunt is different — it runs 100% locally, uses Google's free-tier Gemini models, and keeps all your data on your own machine. It's designed for developers who want a serious AI workspace without the SaaS price tag.

---

## Features

### Streaming Chat
Token-by-token responses as the model generates them — no waiting for the full answer. Ask anything: debug errors, explain concepts, write code, or just think out loud.

### Knowledge Base (RAG)
Upload PDFs, paste URLs to scrape, or write notes. The AI references your documents in answers and cites the source. Build a personal knowledge base that actually talks back.

### Learning Path
Generate a day-by-day learning roadmap tailored to your goals — built by AI, structured for consistency.

### Quest Board
Kanban-style task board with AI auto-detection of tasks from chat. Your conversations automatically surface action items — no manual tracking needed.

### Terminal Stats
Study hours, streaks, consistency score, and skills progress — all tracked locally so you can see how much you're actually learning.

### API Key Manager
Register multiple Gemini API keys from different Google accounts. When one hits its rate limit, DevHunt automatically rotates to the next available key. No downtime, no manual switching.

### Backup & Restore
Export everything — chat history, encrypted API keys, profile, settings, and learning path — as a single JSON file. Import it back on any machine.

### System Logs
Live log viewer with filters by level (INFO / SUCCESS / WARN / ERROR) and category (api_call / key_event / chat / rag / backup).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10+, Flask 3.0 |
| AI SDK | `google-genai` v2.8+ |
| Models | Gemini 3.1 Flash-Lite (default), Gemini 2.5 Flash (RAG), Gemma 4 26B |
| Embeddings | `gemini-embedding-2` |
| Database | SQLite (local, zero-config) |
| Frontend | Vanilla HTML / CSS / JS — no framework, no build step |

---

## Free Tier Model Limits

| Model | Use Case | RPM | Daily Limit |
|---|---|---|---|
| `gemini-3.1-flash-lite` | All regular chat (default) | 15 | 500/day |
| `gemini-2.5-flash` | RAG queries | 5 | 20/day |
| `gemma-4-26b-a4b-it` | Heavy reasoning | 15 | 1,500/day |
| `gemini-embedding-2` | Vector embeddings | 100 | 1,000/day |

Add multiple API keys from different Google accounts — DevHunt automatically rotates them when rate limits are hit.

---

## Project Structure

```
Local-AI/
├── backend/
│   ├── app.py                # Flask API server — all endpoints
│   ├── config.py             # Paths, constants, encryption setup
│   ├── requirements.txt      # Python dependencies
│   ├── core/
│   │   ├── chat_engine.py    # Chat + streaming response logic
│   │   ├── rag_pipeline.py   # PDF/URL/note indexing + similarity search
│   │   ├── key_manager.py    # API key rotation, cooldown, encryption
│   │   ├── model_selector.py # Picks the right model per query type
│   │   ├── learning_path.py  # AI-generated roadmap logic
│   │   ├── todo_manager.py   # Quest board CRUD
│   │   ├── profile_manager.py# User profile & settings
│   │   ├── analytics.py      # Study stats & skills matrix
│   │   ├── intent_detector.py# Detects task intent from chat messages
│   │   ├── logger.py         # System log writer/reader
│   │   └── db.py             # SQLite init & connection helper
│   └── data/
│       ├── devhunt.db        # SQLite database (auto-created)
│       ├── keys.json         # Encrypted API keys (auto-created)
│       ├── profile.json      # User profile (auto-created)
│       ├── settings.json     # App settings (auto-created)
│       └── learning_path.json# Current roadmap (auto-created)
├── frontend/
│   ├── index.html            # Main dashboard
│   ├── logs.html             # System logs page
│   ├── app.js                # All frontend logic
│   └── styles.css            # Dark theme UI
├── run.bat                   # Windows launcher — starts server + opens browser
├── run.sh                    # Linux/macOS launcher
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.10 or higher
- A Google Gemini API key (free) — get one at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd Local-AI
```

### 2. Create virtual environment and install dependencies

```bash
cd backend
python -m venv venv
```

**Windows:**
```cmd
venv\Scripts\pip install -r requirements.txt
```

**Linux / macOS:**
```bash
venv/bin/pip install -r requirements.txt
```

### 3. Run the app

**Windows — double-click `run.bat`** or from terminal:
```cmd
run.bat
```

**Linux / macOS:**
```bash
bash run.sh
```

**Manual start:**
```bash
# Windows
cd backend && venv\Scripts\python app.py

# Linux/macOS
cd backend && venv/bin/python app.py
```

The server starts at **http://localhost:5000** — the launcher scripts automatically open your browser.

### 4. Add your API key

1. Open **http://localhost:5000**
2. Go to **Settings & Nodes** in the sidebar
3. Paste your Gemini API key and click **+ Register Key**

---

## API Reference

### Chat
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Send message, get full response |
| POST | `/api/chat/stream` | Send message, stream tokens (SSE) |
| GET | `/api/chat/history` | Get chat history for a session |
| DELETE | `/api/chat/history` | Clear chat history for a session |

### Keys
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/keys` | List all registered keys |
| POST | `/api/keys` | Add a new key |
| PUT | `/api/keys/<id>` | Enable or disable a key |
| DELETE | `/api/keys/<id>` | Remove a key |
| POST | `/api/keys/<id>/test` | Live-test a specific key |

### Backup
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/backup/export` | Download full backup JSON |
| POST | `/api/backup/import` | Upload and restore a backup |
| GET | `/api/history/export` | Download chat history JSON |

### System
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/logs` | Get system logs |
| DELETE | `/api/logs` | Clear system logs |
| POST | `/api/reset` | Reset all data (irreversible) |

---

## Notes

- No `.env` file needed. The encryption key for API key storage is auto-generated on first run and saved to `backend/data/.secret`. Keep this file if you want to restore encrypted key backups.
- All data stays local — nothing leaves your machine except the API calls to Google.
- The `data/` folder contains your database and settings. Back it up to preserve your history.

---

## Contribute

DevHunt is open for collaboration. If you're a developer who cares about privacy-first tooling, local AI, or just building useful things — you're welcome here.

**Ways to contribute:**
- Fix bugs or improve existing features
- Add new integrations (models, document types, exporters)
- Improve the frontend UI/UX
- Write tests or improve documentation
- Share feedback, ideas, or feature requests via Issues

To get started, fork the repo, make your changes, and open a pull request. For larger features, open an Issue first to discuss the direction.

All skill levels welcome — whether you're fixing a typo or building a new module.

---

## License

MIT — free to use, modify, and distribute.

---

## Created By

**Hitesh Solanki**
- Website: [hiteshsolanki.in](https://hiteshsolanki.in)
- Email: solankihiteshpankajbhai7@gmail.com
- Mobile: +91 9327810431