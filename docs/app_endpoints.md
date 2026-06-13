# API Reference: Flask Endpoint Routes (app.py)

This document details every route handler mapped in `backend/app.py` to operate the DevHunt frontend client.

---

## Static Assets
* **`GET /`**: Renders `index.html` (main Dashboard).
* **`GET /logs`**: Renders `logs.html` (System Logs control board).

---

## Chat & LLM Interfaces
* **`POST /api/chat`**: Processes synchronous chat prompts. Accepts JSON payload `{"message": str, "session_id": str, "model_override": str, "source_id": int}`. If `source_id` is passed, scopes RAG context search strictly to that document and runs in Grounded Document Analyst mode.
* **`POST /api/chat/stream`**: Establishes a Server-Sent Events (SSE) token stream for real-time chat replies. Accepts the same JSON payload parameters as `POST /api/chat` (including `source_id`).
* **`GET /api/chat/history`**: Retrieves session logs.
* **`DELETE /api/chat/history`**: Deletes all chat logs.

---

## Key Pool Manager
* **`GET /api/keys`**: Masked list of registered API keys.
* **`POST /api/keys`**: Encrypts and saves a new Gemini API key.
* **`PUT /api/keys/<key_id>`**: Toggles key activation state.
* **`DELETE /api/keys/<key_id>`**: Wipes a key from disk.
* **`POST /api/keys/<key_id>/test`**: Submits a ping statement to Gemini using the selected key to verify its quota state.

---

## Quest Board (Todos)
* **`GET /api/todos`**: Queries active task records (supports filtering).
* **`POST /api/todos`**: Appends a new quest/todo.
* **`PUT /api/todos/<todo_id>`**: Merges field updates (status, priority, etc.).
* **`DELETE /api/todos/<todo_id>`**: Deletes a task.
* **`POST /api/todos/<todo_id>/complete`**: Helper to mark a task as completed.

---

## RAG Knowledge Base
* **`GET /api/knowledge`**: Lists indexed documents/resources.
* **`POST /api/knowledge/upload`**: Uploads local PDFs or text files to generate vectors.
* **`POST /api/knowledge/url`**: Crawls/scrapes target URLs to index text. Prepend protocol, browser header masking, and self-signed certificate SSL fallbacks.
* **`POST /api/knowledge/note`**: Indexes typed textual snippets.
* **`DELETE /api/knowledge/<source_id>`**: Deletes indexed resources.
* **`GET /api/knowledge/<source_id>/content`**: Retrieves the full reconstructed text content of an indexed document from its constituent chunks.

---

## AI Cognitive Core Memory
* **`GET /api/memory`**: Fetches long-term consolidated memories.
* **`PUT /api/memory`**: Manually edits/saves cognitive memory facts.
* **`POST /api/memory/refine`**: Forces cognitive consolidation cycles.
* **`DELETE /api/memory`**: Wipes cognitive memories.

---

## Local Analytics & Indicators
* **`GET /api/analytics/overview`**: Overall count status.
* **`GET /api/analytics/skills`**: Topics and matrices.
* **`GET /api/analytics/weekly`**: Weekly traffic charts.

---

## Workspace IDE
* **`GET /api/ide/files`**: Recursively walks the workspace root and returns a JSON file tree of directories and files, filtering system directories (`.git`, `node_modules`, `venv`, etc.).
* **`GET /api/ide/file`**: Reads and returns raw text content for a relative path query parameter, secured with directory boundary validation to prevent traversal attacks.
* **`POST /api/ide/file`**: Saves edited or new file content back to the relative path, creating directory folders dynamically as needed.

---

## System Logs
* **`GET /api/logs`**: Queries `system_logs` (supports filtering).
* **`DELETE /api/logs`**: Clears all database logs.

---

## Hunt Terminal
* **`POST /api/terminal/run`**: Tokenizes input commands starting with `hunt` and executes them using `TerminalEngine`.

---

## Backup, Restore & System Operations
* **`GET /api/history/export`**: Compiles conversation logs into JSON files for download.
* **`GET /api/backup/export`**: Full workspace backup download (messages, knowledge database, configurations, roadmaps, keys).
* **`POST /api/backup/import`**: Restores system data from an uploaded JSON file.
* **`POST /api/reset`**: The nuclear wipe option. Clears tables, wipes keys, and restores default config states.
* **`GET /api/notifications`**: Checks remote announcers, fetches update states, parses local warning logs, and resolves read settings.
