# Module: core.memory_manager (MemoryManager)

The `MemoryManager` class implements the state-of-the-art consolidated long-term AI memory system. It automatically extracts relevant user facts, preferences, and details from conversation histories using the Gemini API and saves them to local storage.

---

## Methods

### `get_memory`
* **Signature**: `get_memory(session_id: str) -> list[str]`
* **Description**: Queries the `user_memories` table to retrieve consolidated facts for the active session.
* **Parameters**:
  - `session_id` (`str`): Target chat session.
* **Returns**:
  - `list[str]`: An array of consolidated user memory strings.

---

### `save_memory`
* **Signature**: `save_memory(session_id: str, facts: list[str]) -> bool`
* **Description**: Updates the `user_memories` table manually with a raw JSON array of fact strings.
* **Parameters**:
  - `session_id` (`str`): Session identifier.
  - `facts` (`list[str]`): List of facts.
* **Returns**:
  - `bool`: `True` if successfully saved.

---

### `refine_memories`
* **Signature**: `refine_memories(session_id: str) -> dict`
* **Description**: Triggers manual/prompt-driven consolidation. It retrieves the full chat logs of the session, loads existing memories, sends them to Gemini to merge, remove duplicates/contradictions, extract new facts, and updates the `user_memories` table.
* **Parameters**:
  - `session_id` (`str`): Session identifier.
* **Returns**:
  - `dict`: Consolidation metadata (`success`, `memories_count`).

---

### `auto_consolidate_if_needed`
* **Signature**: `auto_consolidate_if_needed(session_id: str) -> bool`
* **Description**: Evaluates if auto-consolidation should run. If more than 10 messages were sent since the last consolidation, and at least 1 hour has elapsed, it launches a thread to refine user memories asynchronously.
* **Parameters**:
  - `session_id` (`str`): Session identifier.
* **Returns**:
  - `bool`: `True` if consolidation was triggered, `False` if skipped.
