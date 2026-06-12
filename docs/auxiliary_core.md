# Module Summary: Auxiliary Core Modules

This document details functions inside the auxiliary core modules of DevHunt: `profile_manager`, `analytics`, `key_manager`, `rag_pipeline`, and `db`.

---

## 👤 core.profile_manager (ProfileManager)
Manages user configurations, settings, study streak metrics, and profile metadata.

### `get_profile` / `get_settings`
* **Signature**: `get_profile() -> dict` / `get_settings() -> dict`
* **Description**: Reads settings details from `profile.json` and `settings.json`. Returns default schemas if files do not exist.

### `update_profile` / `update_settings`
* **Signature**: `update_profile(data: dict) -> dict` / `update_settings(data: dict) -> dict`
* **Description**: Merges new configurations into target files and writes back to disk.

### `increment_streak`
* **Signature**: `increment_streak() -> int`
* **Description**: Tracks user consistency. Evaluates the difference between the current date and the last active date. Increments the streak counter if active on consecutive days. Resets the streak if more than 1 day has passed.

---

## 📊 core.analytics (Analytics)
Calculates workspace study statistics, streaks, and model usage distributions.

### `get_overview`
* **Signature**: `get_overview() -> dict`
* **Description**: Computes overall stats: total active quests, completed quests, registered keys count, current study streak, and total indexed knowledge chunks.

### `get_skills_matrix`
* **Signature**: `get_skills_matrix() -> list[dict]`
* **Description**: Resolves topic frequency and success metrics based on logged `analytics_events`.

### `get_weekly_progress`
* **Signature**: `get_weekly_progress() -> list[int]`
* **Description**: Returns message counts logged on each day of the current week.

---

## 🔑 core.key_manager (KeyManager)
Implements round-robin API key rotation and state checks.

### `add_key` / `remove_key`
* **Signature**: `add_key(key: str, label: str) -> dict` / `remove_key(key_id: str) -> bool`
* **Description**: Encrypts/saves new Gemini API keys using Fernet AES, or removes them.

### `update_key_status`
* **Signature**: `update_key_status(key_id: str, status: str) -> bool`
* **Description**: Toggles key operational states (`Active`, `Paused`).

### `get_active_key_string`
* **Signature**: `get_active_key_string() -> tuple[str, str]`
* **Description**: Selects the next active key string using round-robin scheduling. Validates that selected keys are not on cooldown.

### `on_success` / `on_rate_limit_error` / `on_other_error`
* **Signature**: `on_success(key_id)` / `on_rate_limit_error(key_id)` / `on_other_error(key_id)`
* **Description**: State callbacks. pause/cooldown keys when hitting 429 errors.

---

## 📚 core.rag_pipeline (RAGPipeline)
Handles PDF parsing, web crawling, indexing, and vector similarity search.

### `index_text_content` / `index_pdf` / `index_url`
* **Signature**: `index_text_content(...)` / `index_pdf(...)` / `index_url(...)`
* **Description**: Parses input resources, splits text into overlapping chunks, generates embedding matrices locally, and inserts records into `knowledge_sources` / `knowledge_chunks`.

### `search_similarity`
* **Signature**: `search_similarity(query: str, top_k: int) -> list[dict]`
* **Description**: Computes cosine similarities between query embeddings and stored database chunk embeddings, returning the highest matching document contexts.

---

## 💾 core.db (Database Core)
Establishes the data layer.

### `get_db_connection`
* **Signature**: `get_db_connection() -> sqlite3.Connection`
* **Description**: Resolves sqlite3 connection pools.

### `init_db`
* **Signature**: `init_db()`
* **Description**: Initializes database schemas (`messages`, `todos`, `knowledge_sources`, `system_logs`, etc.).
