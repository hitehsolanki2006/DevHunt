import json
from datetime import datetime
from google import genai
from google.genai import types
from core.db import get_db_connection
from core.key_manager import KeyManager
from core import logger

class MemoryManager:
    def __init__(self, key_manager: KeyManager):
        self.key_manager = key_manager

    def refine_memories(self, session_id: str = "default_session") -> dict:
        """
        Fetches chat history for the session, prompts Gemini to consolidate and clean 
        key facts/preferences, and updates the DB user_memories table.
        """
        api_key, key_id = self.key_manager.get_active_key_string()
        if not api_key:
            logger.warn("system", "Memory Consolidation: No active API key found.")
            return {"success": False, "error": "No active API key"}

        # 1. Fetch current consolidated memories
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT consolidated_facts FROM user_memories WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        current_memories = json.loads(row['consolidated_facts']) if (row and row['consolidated_facts']) else []

        # 2. Fetch the last 100 chat messages to extract facts from
        cursor.execute(
            """SELECT role, content FROM messages 
               WHERE session_id = ? 
               ORDER BY timestamp DESC LIMIT 100""",
            (session_id,)
        )
        chat_rows = cursor.fetchall()
        conn.close()

        if not chat_rows:
            logger.info("system", f"Memory Consolidation: No chat messages found for session '{session_id}'. Skipping.")
            return {"success": True, "memories": current_memories, "updated": False}

        # Format chat history for prompt
        chat_history_str = "\n".join([f"{r['role']}: {r['content']}" for r in reversed(chat_rows)])

        # 3. Construct prompt for Gemini
        prompt = (
            f"You are a Memory Consolidation Engine.\n"
            f"Your job is to read the raw conversation history, compare it with existing memories about the user, and produce an updated list of core facts, user preferences, current project details, coding tech stack, and learning progress.\n\n"
            f"--- EXISTING MEMORIES ---\n"
            f"{json.dumps(current_memories, indent=2)}\n\n"
            f"--- NEW/RECENT CHAT HISTORY ---\n"
            f"{chat_history_str}\n\n"
            f"Instructions:\n"
            f"1. Extract permanent, meaningful details about the user (e.g. 'User is learning Kubernetes', 'User prefers Python over Javascript', 'User is working on a Flask and React app').\n"
            f"2. Keep facts objective, descriptive, and short (1 sentence each).\n"
            f"3. Deduplicate and clean. Remove old or obsolete memories (e.g. if the user says they solved a problem, remove/update 'User is struggling with X').\n"
            f"4. Keep the list concise and high-impact. Limit to at most 15 core facts.\n"
            f"5. Return the result strictly as a JSON list of strings: [\"fact 1\", \"fact 2\", ...]. Do not include markdown formatting or backticks around the JSON."
        )

        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            self.key_manager.on_success(key_id)
            
            # Clean response text in case markdown block wrapper is returned anyway
            response_text = response.text.strip()
            if response_text.startswith("```"):
                # strip code fence
                lines = response_text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                response_text = "\n".join(lines).strip()
            
            updated_memories = json.loads(response_text)
            if not isinstance(updated_memories, list):
                raise ValueError("Response is not a JSON list")

            # 4. Save back to database
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO user_memories (session_id, consolidated_facts, last_updated)
                   VALUES (?, ?, CURRENT_TIMESTAMP)
                   ON CONFLICT(session_id) DO UPDATE SET
                   consolidated_facts = excluded.consolidated_facts,
                   last_updated = CURRENT_TIMESTAMP""",
                (session_id, json.dumps(updated_memories))
            )
            conn.commit()
            conn.close()

            logger.success("system", f"Memory Consolidation complete for session '{session_id}'. Facts count: {len(updated_memories)}")
            return {"success": True, "memories": updated_memories, "updated": True}

        except Exception as e:
            logger.error("system", f"Memory Consolidation failed: {str(e)}")
            return {"success": False, "error": str(e)}

    def auto_consolidate_if_needed(self, session_id: str = "default_session"):
        """
        Checks if the memories are outdated (older than 1 hour or never run)
        and if there are new messages since the last consolidation, then runs refinement if needed.
        """
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if there are any messages sent since the last consolidation
            cursor.execute(
                """SELECT COUNT(*) as new_count FROM messages 
                   WHERE session_id = ? 
                   AND (
                       (SELECT COUNT(*) FROM user_memories WHERE session_id = ?) = 0
                       OR 
                       timestamp > (SELECT last_updated FROM user_memories WHERE session_id = ?)
                   )""",
                (session_id, session_id, session_id)
            )
            new_messages = cursor.fetchone()['new_count']
            
            if new_messages == 0:
                logger.info("system", f"Memory Consolidation: No new messages since last update for session '{session_id}'. Skipping.")
                conn.close()
                return

            cursor.execute("SELECT last_updated FROM user_memories WHERE session_id = ?", (session_id,))
            row = cursor.fetchone()
            conn.close()

            if not row:
                # Never run before and has messages, trigger now
                logger.info("system", f"Memory Consolidation: First-time consolidation for session '{session_id}'.")
                self.refine_memories(session_id)
                return

            last_updated_str = row['last_updated']
            # Parse SQLite datetime string
            last_dt = datetime.strptime(last_updated_str, "%Y-%m-%d %H:%M:%S")
            delta = datetime.utcnow() - last_dt

            # Consolidate memory if older than 1 hour (3600 seconds)
            if delta.total_seconds() > 3600:
                logger.info("system", f"Memory for session '{session_id}' is stale (> 1 hour). Consolidating...")
                self.refine_memories(session_id)
            else:
                logger.info("system", f"Memory for session '{session_id}' is up-to-date within the last 1 hour. (Last updated: {last_updated_str})")
        except Exception as e:
            logger.error("system", f"auto_consolidate_if_needed failed: {str(e)}")
            # Fallback to refining just in case
            self.refine_memories(session_id)

