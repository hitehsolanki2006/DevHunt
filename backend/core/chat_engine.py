import json
from datetime import datetime
from google import genai
from google.genai import types
from core.db import get_db_connection
from core.key_manager import KeyManager
from core.rag_pipeline import RAGPipeline
from core.model_selector import classify_query
from core.intent_detector import IntentDetector
from core.todo_manager import TodoManager
from core import logger
from config import SETTINGS_PATH

class ChatEngine:
    def __init__(self, key_manager: KeyManager, rag_pipeline: RAGPipeline):
        self.key_manager = key_manager
        self.rag_pipeline = rag_pipeline

    def _get_english_mode(self) -> bool:
        import os
        if os.path.exists(SETTINGS_PATH):
            try:
                with open(SETTINGS_PATH, 'r') as f:
                    settings = json.load(f)
                    return settings.get("english_correction", False)
            except Exception:
                pass
        return False

    def _build_system_instruction(self, user_message: str, active_rag_docs: list, session_id: str, source_id: int = None) -> str:
        if source_id is not None:
            system_instruction = (
                "You are DevHunt AI, currently acting as a Document Analyst. The user has opened a specific document in their viewer.\n"
                "Your primary task is to explain, summarize, and answer any questions about the document context provided below.\n"
                "Ground your answers strictly in the document content. If you cannot find the answer in the document, mention that, but you can also provide a helpful general answer if relevant.\n"
                "Keep answers very focused on this document.\n"
            )
        else:
            system_instruction = (
                "You are DevHunt AI, a smart personal assistant that helps with problem solving, debugging, learning, and answering questions on any topic.\n"
                "You provide clear, structured, and example-rich answers. Always use clear headings, "
                "bullet points, and code blocks where appropriate.\n"
                "If the user asks about a learning roadmap or topic, guide them step-by-step.\n"
            )

        if self._get_english_mode():
            system_instruction += (
                "\n[IMPORTANT: English Grammar Correction is ENABLED]\n"
                "At the very beginning of your response, check if the user's message had any grammar mistakes. "
                "If it did, output a brief, polite correction and suggested phrasing in a blockquote format, "
                "wrapped in italics. For example:\n"
                "> *Grammar Tip: 'I needs learn Docker' -> 'I need to learn Docker' (Suggested: 'I want to study Docker today')*\n"
                "Then proceed to answer their question normally. If there are no mistakes, do not include any grammar tip.\n"
            )

        if active_rag_docs:
            system_instruction += (
                "\n[IMPORTANT: Contextual Knowledge Available]\n"
                "Use the following materials from the user's personal Knowledge Base to answer the question. "
                "You must cite the source name/type in your explanation.\n\nKnowledge Base Context:\n"
            )
            for doc in active_rag_docs:
                source_name = doc['metadata'].get('source_name', 'Unknown Source')
                source_type = doc['metadata'].get('source_type', 'Note')
                system_instruction += f"--- Source: {source_name} ({source_type}) ---\n{doc['content']}\n\n"

        # Fetch active todos to inject into system prompt
        try:
            pending_todos = TodoManager.get_todos(status_filter="pending")
            if pending_todos:
                todos_context = (
                    "\n[INTERNAL CONTEXT: User's Active Quests / To-Do List (Quest Board)]\n"
                    "This is for your internal reference to know what the user is working on. "
                    "Do NOT copy, repeat, or list these tasks in your response unless the user explicitly asks to see their Quest Board / To-Do list.\n" +
                    "\n".join(f"- {t['title']} (Priority: {t['priority']})" for t in pending_todos)
                )
                system_instruction += todos_context + "\n"
        except Exception as e:
            print(f"Error fetching todos for system instruction: {e}")

        # Add instructions for managing the todo list
        system_instruction += (
            "\n[Quest Board Integration]\n"
            "You can manage the user's Quest Board / To-Do list directly based on the conversation.\n"
            "CRITICAL RULES FOR TASKS:\n"
            "1. ONLY output action tags if the user's LATEST message explicitly commands or authorizes you to do so (e.g., 'add this', 'yes, go ahead and add it', 'please add X', 'mark Y done', 'remove Z', 'delete this task').\n"
            "2. If you realize or suggest that a task should be added, but the user has not explicitly commanded it yet, do NOT output any tags. Instead, ask the user for permission (e.g., 'Would you like me to add this to your Quest Board?') and wait for their explicit approval in the next message before adding it.\n"
            "3. Do NOT output tags if the user is merely asking a question, discussing history, or greeting you. Only modify tasks if they explicitly instruct or allow you to do so in the current turn.\n"
            "4. Do NOT explain or display the raw action tags to the user; write them quietly at the very end.\n"
            "5. Do NOT output Quest Board summaries or updates unless explicitly requested by the user.\n"
            "6. STRICTLY FORBIDDEN: Do NOT automatically add, complete, or delete tasks based on your memory facts, profile settings, or general conversation flow unless the user explicitly orders it in their latest message. (e.g., Even if memory says they completed a topic, do NOT output [TODO_COMPLETE] unless they explicitly say 'mark X complete' or authorize it in this turn).\n\n"
            "Tag formats:\n"
            "For adding a task (only when explicitly authorized in the latest message):\n"
            "[TODO_ADD: Title | Priority (high/medium/low) | Description]\n"
            "For completing a task (only when explicitly authorized in the latest message):\n"
            "[TODO_COMPLETE: Title]\n"
            "For deleting/removing a task (only when explicitly authorized in the latest message):\n"
            "[TODO_DELETE: Title]\n\n"
            "Examples:\n"
            "- User: 'Add Docker to my quest list' -> append [TODO_ADD: ...]\n"
            "- User: 'Remove the countdown post task' -> append [TODO_DELETE: countdown post]\n"
            "- User: 'I need to study Python. Can you suggest tasks?' -> Suggest tasks and ask: 'Would you like me to add these tasks to your Quest Board?' (Do NOT append any tags yet! Wait for permission.)\n"
            "- User: 'Yes, add them' (in response to suggestion) -> append [TODO_ADD: ...]\n"
            "- User: 'Do you remember we discussed the summit?' -> Do NOT append any tags."
        )

        # Fetch consolidated memory list
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT consolidated_facts FROM user_memories WHERE session_id = ?", (session_id,))
            row = cursor.fetchone()
            conn.close()
            if row and row['consolidated_facts']:
                memories = json.loads(row['consolidated_facts'])
                if memories:
                    memories_text = (
                        "\n[INTERNAL CONTEXT: LONG-TERM MEMORY (Distilled Facts About User)]\n"
                        "This is for your internal reference to customize your replies. "
                        "Do NOT copy, print, or list these facts or the 'Long-Term Memory' header "
                        "in your response unless the user explicitly asks you to show what you know about them.\n" +
                        "\n".join(f"- {m}" for m in memories)
                    )
                    system_instruction += memories_text + "\n"
        except Exception as e:
            print(f"Error fetching memories for system instruction: {e}")

        return system_instruction

    def _process_todo_tags(self, text: str) -> tuple:
        """
        Parses [TODO_ADD: ...], [TODO_COMPLETE: ...], and [TODO_DELETE: ...] tags from the model's text,
        executes the todo actions, strips the tags from the text, and returns (clean_text, todo_detected).
        """
        if not text:
            return text, None

        import re
        todo_actions = []
        
        # Regex to find [TODO_ADD: Title | Priority | Description]
        add_pattern = r"\[TODO_ADD:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]"
        # Regex to find [TODO_COMPLETE: Title]
        complete_pattern = r"\[TODO_COMPLETE:\s*(.*?)\s*\]"
        # Regex to find [TODO_DELETE: Title]
        delete_pattern = r"\[TODO_DELETE:\s*(.*?)\s*\]"

        # Find all ADD actions
        adds = re.findall(add_pattern, text)
        for title, priority, desc in adds:
            if not title.strip():
                continue
            priority = priority.strip().lower()
            if priority not in ['high', 'medium', 'low']:
                priority = 'medium'
            
            # Check if this task was already added to prevent duplicates
            existing = TodoManager.get_todos(status_filter="pending")
            duplicate = False
            for t in existing:
                if t['title'].lower() == title.strip().lower():
                    duplicate = True
                    break
            
            if not duplicate:
                new_todo = TodoManager.create_todo(
                    title=title.strip(),
                    priority=priority,
                    source="ai_detected",
                    description=desc.strip() or f"Auto-added from chat."
                )
                todo_actions.append({"action": "add", "todo": new_todo})

        # Find all COMPLETE actions
        completes = re.findall(complete_pattern, text)
        for title in completes:
            if not title.strip():
                continue
            todos = TodoManager.get_todos(status_filter="pending")
            completed_todo = None
            for todo in todos:
                if title.strip().lower() in todo['title'].lower() or todo['title'].lower() in title.strip().lower():
                    TodoManager.complete_todo(todo['id'])
                    completed_todo = todo
                    break
            if completed_todo:
                todo_actions.append({"action": "complete", "todo": completed_todo})

        # Find all DELETE actions
        deletes = re.findall(delete_pattern, text)
        for title in deletes:
            if not title.strip():
                continue
            todos = TodoManager.get_todos() # get all, pending or completed
            deleted_todo = None
            for todo in todos:
                if title.strip().lower() in todo['title'].lower() or todo['title'].lower() in title.strip().lower():
                    TodoManager.delete_todo(todo['id'])
                    deleted_todo = todo
                    break
            if deleted_todo:
                todo_actions.append({"action": "delete", "todo": deleted_todo})

        # Clean text by removing tag lines
        clean_text = re.sub(r"\[TODO_ADD:.*?\]\n?", "", text)
        clean_text = re.sub(r"\[TODO_COMPLETE:.*?\]\n?", "", clean_text)
        clean_text = re.sub(r"\[TODO_DELETE:.*?\]\n?", "", clean_text).strip()

        # Build todo_detected output
        todo_detected = None
        if len(todo_actions) == 1:
            todo_detected = todo_actions[0]
        elif len(todo_actions) > 1:
            todo_detected = {"action": "multi", "items": todo_actions}

        return clean_text, todo_detected

    def send_message(self, session_id: str, user_message: str, model_override: str = None, source_id: int = None) -> dict:
        # 1. Fetch relevant content from RAG
        rag_results = self.rag_pipeline.search_similarity(user_message, top_k=6 if source_id is not None else 3, source_id=source_id)
        min_similarity = 0.35 if source_id is not None else 0.45
        active_rag_docs = [r for r in rag_results if r['similarity'] > min_similarity]
        has_rag = len(active_rag_docs) > 0

        # 2. Classify query / select model
        model_name = model_override
        if not model_name:
            model_name = classify_query(user_message, has_rag_docs=has_rag)

        # 3. Retrieve session history from DB (shorter limit since we have consolidated long-term memory)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT role, content FROM messages
               WHERE session_id = ?
               ORDER BY timestamp DESC LIMIT 12""",
            (session_id,)
        )
        history_rows = cursor.fetchall()
        conn.close()
        history = list(reversed(history_rows))

        # 4. Construct System Instruction
        system_instruction = self._build_system_instruction(user_message, active_rag_docs, session_id, source_id)

        # 5. Key rotation retry loop
        all_keys = self.key_manager.get_keys_list()
        max_attempts = max(3, len(all_keys))

        response_text = None
        used_key_id = None
        used_key_masked = "None"

        for attempt in range(max_attempts):
            api_key, key_id = self.key_manager.get_active_key_string()
            if not api_key:
                return {
                    "success": False,
                    "error": "No active API key available. Go to Key Manager in Settings to add a Gemini API Key."
                }

            used_key_id = key_id
            for k in all_keys:
                if k['id'] == key_id:
                    used_key_masked = k['masked_key']
                    break

            try:
                # New google-genai SDK (supports AQ. keys)
                client = genai.Client(api_key=api_key)

                # Build conversation history
                contents = []
                for msg in history:
                    role = "user" if msg['role'] == "user" else "model"
                    contents.append(types.Content(
                        role=role,
                        parts=[types.Part(text=msg['content'])]
                    ))
                # Add current message
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part(text=user_message)]
                ))

                import time as _time
                t0 = _time.time()
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.3,
                    )
                )

                response_text = response.text
                duration_ms = int((_time.time() - t0) * 1000)
                self.key_manager.on_success(key_id)
                logger.success("api_call", f"Chat response from {model_name}", {
                    "model": model_name, "key": used_key_masked,
                    "session_id": session_id, "duration_ms": duration_ms,
                    "prompt_len": len(user_message), "response_len": len(response_text)
                })
                break  # success

            except Exception as e:
                err_str = str(e)
                print(f"ChatEngine Exception: {type(e).__name__} - {err_str}")
                if "429" in err_str or "ResourceExhausted" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    self.key_manager.on_rate_limit_error(key_id)
                    logger.warn("key_event", f"Rate limit hit on key {used_key_masked}", {"key": used_key_masked, "model": model_name})
                else:
                    self.key_manager.on_other_error(key_id)
                    logger.error("api_call", f"API error: {err_str[:200]}", {"model": model_name, "key": used_key_masked, "error": err_str[:300]})
                    return {
                        "success": False,
                        "error": f"Gemini API Error: {err_str}"
                    }
        if not response_text:
            return {
                "success": False,
                "error": "All API keys are exhausted or on cooldown. Please try again in 60 seconds."
            }

        # 6. Intent Detection & Auto-Todo
        response_text, todo_detected = self._process_todo_tags(response_text)

        # 7. Log to SQLite
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO messages (session_id, role, content, model_used, key_used) VALUES (?, ?, ?, ?, ?)",
            (session_id, 'user', user_message, model_name, used_key_id)
        )
        cursor.execute(
            "INSERT INTO messages (session_id, role, content, model_used, key_used) VALUES (?, ?, ?, ?, ?)",
            (session_id, 'assistant', response_text, model_name, used_key_id)
        )
        cursor.execute(
            "INSERT INTO analytics_events (event_type, topic, metadata) VALUES (?, ?, ?)",
            ('question_asked', 'General Q&A', json.dumps({"model": model_name, "has_rag": has_rag}))
        )
        conn.commit()
        conn.close()

        # Trigger background memory check/refinement
        try:
            from core.memory_manager import MemoryManager
            mm = MemoryManager(self.key_manager)
            import threading
            threading.Thread(target=mm.auto_consolidate_if_needed, args=(session_id,), daemon=True).start()
        except Exception as e:
            print(f"Failed to start background memory consolidation: {e}")

        # 8. Citations
        citations = []
        for doc in active_rag_docs:
            citations.append({
                "source_name": doc['metadata'].get('source_name'),
                "source_type": doc['metadata'].get('source_type'),
                "similarity": doc['similarity']
            })

        return {
            "success": True,
            "response": response_text,
            "model_used": model_name,
            "key_used": used_key_masked,
            "citations": citations,
            "todo_detected": todo_detected
        }

    def stream_message(self, session_id: str, user_message: str, model_override: str = None, source_id: int = None):
        """
        Generator that yields SSE chunks as the model streams tokens.
        Yields dicts: {type: 'token', text: '...'} or {type: 'done', ...meta} or {type: 'error', error: '...'}
        """
        import json

        # RAG
        rag_results = self.rag_pipeline.search_similarity(user_message, top_k=6 if source_id is not None else 3, source_id=source_id)
        min_similarity = 0.35 if source_id is not None else 0.45
        active_rag_docs = [r for r in rag_results if r['similarity'] > min_similarity]
        has_rag = len(active_rag_docs) > 0

        # Model
        model_name = model_override or classify_query(user_message, has_rag_docs=has_rag)

        # History (shorter limit since we have consolidated long-term memory)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT 12",
            (session_id,)
        )
        history = list(reversed(cursor.fetchall()))
        conn.close()

        # System prompt
        system_instruction = self._build_system_instruction(user_message, active_rag_docs, session_id, source_id)

        # 5. Key rotation retry loop for stream
        all_keys = self.key_manager.get_keys_list()
        max_attempts = max(3, len(all_keys))
        
        full_response = ""
        key_id = None
        used_key_masked = "None"
        tag_buffer = ""
        in_tag = False

        for attempt in range(max_attempts):
            api_key, key_id = self.key_manager.get_active_key_string()
            if not api_key:
                yield {"type": "error", "error": "No active API key. Add a Gemini key in Settings."}
                return

            used_key_masked = next((k['masked_key'] for k in all_keys if k['id'] == key_id), "None")

            try:
                client = genai.Client(api_key=api_key)

                contents = []
                for msg in history:
                    role = "user" if msg['role'] == "user" else "model"
                    contents.append(types.Content(role=role, parts=[types.Part(text=msg['content'])]))
                contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

                response_stream = client.models.generate_content_stream(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.3,
                    )
                )

                tag_buffer = ""
                in_tag = False
                full_response = ""

                for chunk in response_stream:
                    if chunk.text:
                        text = chunk.text
                        if in_tag:
                            tag_buffer += text
                        else:
                            if "[" in text:
                                parts = text.split("[", 1)
                                if parts[0]:
                                    full_response += parts[0]
                                    yield {"type": "token", "text": parts[0]}
                                tag_buffer = "[" + parts[1]
                                in_tag = True
                            else:
                                full_response += text
                                yield {"type": "token", "text": text}

                # Success, break retry loop
                break

            except Exception as e:
                err_str = str(e)
                print(f"ChatEngine Stream Exception: {type(e).__name__} - {err_str}")
                if "429" in err_str or "ResourceExhausted" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    self.key_manager.on_rate_limit_error(key_id)
                else:
                    self.key_manager.on_other_error(key_id)

                # If we've already streamed some text to the user, we cannot restart cleanly.
                # In that case, or if this was the last attempt, yield the error and abort.
                if len(full_response) > 0 or attempt == max_attempts - 1:
                    yield {"type": "error", "error": f"API Error: {err_str[:200]}"}
                    return

        # If loop completed without full_response, tag_buffer and no error yielded
        if not (full_response or tag_buffer):
            yield {"type": "error", "error": "All API keys are exhausted or on cooldown. Please try again in 60 seconds."}
            return

        try:
            self.key_manager.on_success(key_id)

            # Process any buffered tag content
            todo_detected = None
            if tag_buffer:
                clean_buffer, todo_detected = self._process_todo_tags(tag_buffer)
                if todo_detected:
                    if clean_buffer:
                        full_response += clean_buffer
                        yield {"type": "token", "text": clean_buffer}
                else:
                    full_response += tag_buffer
                    yield {"type": "token", "text": tag_buffer}

            # Save to DB
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO messages (session_id, role, content, model_used, key_used) VALUES (?, ?, ?, ?, ?)",
                (session_id, 'user', user_message, model_name, key_id)
            )
            cursor.execute(
                "INSERT INTO messages (session_id, role, content, model_used, key_used) VALUES (?, ?, ?, ?, ?)",
                (session_id, 'assistant', full_response, model_name, key_id)
            )
            cursor.execute(
                "INSERT INTO analytics_events (event_type, topic, metadata) VALUES (?, ?, ?)",
                ('question_asked', 'General Q&A', json.dumps({"model": model_name, "has_rag": has_rag}))
            )
            conn.commit()
            conn.close()

            # Trigger background memory check/refinement
            try:
                from core.memory_manager import MemoryManager
                mm = MemoryManager(self.key_manager)
                import threading
                threading.Thread(target=mm.auto_consolidate_if_needed, args=(session_id,), daemon=True).start()
            except Exception as e:
                print(f"Failed to start background memory consolidation: {e}")

            # Citations
            citations = [
                {"source_name": d['metadata'].get('source_name'), "source_type": d['metadata'].get('source_type'), "similarity": d['similarity']}
                for d in active_rag_docs
            ]

            yield {"type": "done", "model_used": model_name, "key_used": used_key_masked, "citations": citations, "todo_detected": todo_detected}

        except Exception as e:
            yield {"type": "error", "error": f"Post-processing Error: {str(e)[:200]}"}

    def get_history(self, session_id: str) -> list:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, role, content, model_used, key_used, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC",
            (session_id,)
        )
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def clear_history(self, session_id: str) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        conn.commit()
        conn.close()
        return True
