# DevHunt AI & LLM API Usage Analysis

This document outlines exactly where and how the Google Gemini / GenAI APIs are utilized across the DevHunt platform, detailing model choices, execution triggers, and fallback behaviors.

---

## 1. Summary of Active Models

DevHunt utilizes three primary models from the Gemini suite, optimized for speed, reasoning, and vector search parameters on the free-tier quota limits:

| Model ID | Category | Primary Function | Quota Limits (Free Tier) | Selection Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **`gemini-3.1-flash-lite`** | Text | General chat queries and writing assistance | 15 RPM / 250K TPM / 500 RPD | Selected by default for conversational queries without RAG documents context. |
| **`gemini-2.5-flash`** | Text | Retrieval-Augmented Generation (RAG) Q&A, entity analysis, roadmap generation, memory refinement, key verification | 5 RPM / 250K TPM / 20 RPD | Selected for RAG context queries, background memory refactoring, custom learning path compilation, or manual override checks. |
| **`gemini-embedding-2`** | Vector | Text embeddings generation for document indexing and query vector matching | 1500 RPM | Used automatically whenever a document is indexed in the Intel Vault, or when a similarity query is performed. |

---

## 2. API Usage Locations & Code Breakdown

The Google GenAI SDK (`google-genai`) is imported and utilized across seven distinct components in the Flask backend codebase:

### 1. Key Manager Verification Checks (`backend/app.py` & `backend/core/terminal_engine.py`)
* **Functions**: `test_api_key` in `app.py` (REST endpoint `/api/keys/<key_id>/test`) and `cmd_keys` test in `terminal_engine.py` (`hunt keys test <id>`).
* **Model Used**: `gemini-2.5-flash`
* **Trigger Timing**: Manual trigger from the settings UI dashboard or running the test subcommand in the Hunt Terminal CLI.
* **Operational Logic**: Creates a secure connection client:
  ```python
  client = _genai.Client(api_key=raw_key)
  resp = client.models.generate_content(model="gemini-2.5-flash", contents="Reply: OK")
  ```
  This returns standard response latency stats if successful or parses quota warnings (429 errors) if keys are exhausted.

### 2. Conversational Chat Engine (`backend/core/chat_engine.py`)
* **Functions**: `send_message` (POST `/api/chat`) and `stream_message` (POST `/api/chat/stream`).
* **Model Used**: Evaluated dynamically via `classify_query()` from [model_selector.py](file:///e:/git-projects/DevHunt/backend/core/model_selector.py):
  - Uses `gemini-2.5-flash` if the search similarity queries yield matching RAG documents context (`similarity > 0.45`).
  - Uses `gemini-3.1-flash-lite` by default for standard queries to maximize throughput speed and conserve daily quotas.
  - Can be manually overridden via `model_override` parameters in JSON request payloads.
* **Trigger Timing**: Triggered instantly whenever a developer types a prompt in the assistant pane, or asks a question regarding an uploaded PDF/image document inside the Doc Forensics tab.
* **Operational Logic**: Uses `client.models.generate_content` for standard JSON replies, or `client.models.generate_content_stream` to stream response tokens in event streams (`text/event-stream`).

### 3. RAG Chunker & Vector Embeddings Pipeline (`backend/core/rag_pipeline.py`)
* **Functions**: `get_embedding`
* **Model Used**: `gemini-embedding-2`
* **Trigger Timing**: Triggered dynamically when new files (PDFs, URLs, Notes) are uploaded/added to the Intel Vault, or when performing similarity searches during chat queries.
* **Operational Logic**: Computes a numeric vector representation of the text chunk:
  ```python
  response = client.models.embed_content(
      model="gemini-embedding-2",
      contents=text,
      config=types.EmbedContentConfig(task_type=task_type)
  )
  ```
  Returns the float list to be indexed in the local SQLite table `knowledge_chunks`.

### 4. Background Memory Consolidation Manager (`backend/core/memory_manager.py`)
* **Functions**: `refine_memories`
* **Model Used**: `gemini-2.5-flash`
* **Trigger Timing**: Triggered automatically in a background daemon thread (`auto_consolidate_if_needed`) after a conversation exchange, provided there are new messages and at least 1 hour has elapsed since the last refinement.
* **Operational Logic**: Passes the last 100 chat messages along with current memorized details to compile consolidated facts strictly as a JSON string array (`types.GenerateContentConfig(response_mime_type="application/json")`).

### 5. Dynamic Learning Path & Streaks Generator (`backend/core/learning_path.py`)
* **Functions**: `generate_initial_path` and `auto_adjust_path`.
* **Model Used**: `gemini-2.5-flash`
* **Trigger Timing**:
  - `generate_initial_path`: Triggered once when the developer fills in their initial goals and profile setups.
  - `auto_adjust_path`: Triggered dynamically after chat entries to see if upcoming roadmap goals need adjustments or extra resources.
* **Operational Logic**: Request is configured with `response_mime_type="application/json"` to enforce output schema compatibility. It falls back to a clean offline DevOps curriculum tree if keys are missing or calls fail.

### 6. Document Forensics Orchestrator (`backend/core/document_analyzer.py`)
* **Functions**: `AnalystAgent._query_llm_analysis`
* **Model Used**: `gemini-2.5-flash`
* **Trigger Timing**: Called during the multi-agent forensics orchestrator execution (`POST /api/knowledge/<id>/analyze`).
* **Operational Logic**: Summarizes extracted texts, validates security flags, and creates risk verdicts.
* **Local Fallback Design**: To protect free Gemini API quotas from 429 RESOURCE_EXHAUSTED errors during sequential checks, the document scanning agent is configured to use a fast, local regex-based heuristics parser (`_rule_based_fallback`) by default. This reduces scan latencies and preserves active LLM quotas for subsequent interactive document Q&A chats.

---

## 3. API Key Lifecycle & Quota Management

To prevent execution blocks and ensure local security, DevHunt incorporates a robust management layer:

1. **Local Encryption**: Registered API keys are secured in `backend/data/keys.json` utilizing `cryptography.fernet` symmetric encryption (encryption keys are kept in `backend/data/.secret`).
2. **Rotating Pools**: The `KeyManager` rotates active keys dynamically. If a key hits rate limits (response exception includes `429` or `RESOURCE_EXHAUSTED`), it initiates a cooldown counter (60 seconds) and automatically routes traffic to the next active key pool.
3. **Graceful Fallbacks**: Core structures like the Learning Path and Document Forensics Orchestrator run rule-based computations locally if no API keys are registered or working, ensuring uninterrupted offline performance.
