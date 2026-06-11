import os
import uuid
import json
import datetime
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import UPLOADS_DIR, KEYS_PATH, LEARNING_PATH_JSON
from core.db import init_db
from core.key_manager import KeyManager
from core.rag_pipeline import RAGPipeline
from core.chat_engine import ChatEngine
from core.todo_manager import TodoManager
from core.learning_path import LearningPath
from core.profile_manager import ProfileManager
from core.analytics import Analytics
from core import logger
from core.terminal_engine import TerminalEngine

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})
terminal_engine = TerminalEngine()

# ── Static pages ──────────────────────────────────────────────────────────────
@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')

@app.route('/logs')
def serve_logs():
    return app.send_static_file('logs.html')

# ── Boot ──────────────────────────────────────────────────────────────────────
init_db()
key_manager    = KeyManager()
rag_pipeline   = RAGPipeline(key_manager)
chat_engine    = ChatEngine(key_manager, rag_pipeline)
learning_path  = LearningPath(key_manager)


# ── CHAT ──────────────────────────────────────────────────────────────────────
@app.route('/api/chat', methods=['POST'])
def send_chat_message():
    data = request.get_json() or {}
    message      = data.get('message', '').strip()
    session_id   = data.get('session_id', 'default_session')
    model_override = data.get('model_override')
    if not message:
        return jsonify({"success": False, "error": "Message content is required"}), 400
    try:
        ProfileManager.increment_streak()
        result = chat_engine.send_message(session_id, message, model_override)
        if result.get("success") and result.get("response"):
            learning_path.auto_adjust_path(f"User: {message}\nAI: {result['response']}")
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/chat/stream', methods=['POST'])
def stream_chat_message():
    data = request.get_json() or {}
    message      = data.get('message', '').strip()
    session_id   = data.get('session_id', 'default_session')
    model_override = data.get('model_override')
    if not message:
        return jsonify({"success": False, "error": "Message content is required"}), 400

    def generate():
        try:
            ProfileManager.increment_streak()
            for chunk in chat_engine.stream_message(session_id, message, model_override):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    session_id = request.args.get('session_id', 'default_session')
    try:
        return jsonify({"success": True, "history": chat_engine.get_history(session_id)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/chat/history', methods=['DELETE'])
def clear_chat_history():
    session_id = request.args.get('session_id', 'default_session')
    try:
        chat_engine.clear_history(session_id)
        return jsonify({"success": True, "message": "History cleared"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── KEYS ──────────────────────────────────────────────────────────────────────
@app.route('/api/keys', methods=['GET'])
def list_keys():
    try:
        return jsonify({"success": True, "keys": key_manager.get_keys_list()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/keys', methods=['POST'])
def add_key():
    data    = request.get_json() or {}
    raw_key = data.get('key', '').strip()
    label   = data.get('label', '').strip() or None
    if not raw_key:
        return jsonify({"success": False, "error": "API Key is required"}), 400
    try:
        result = key_manager.add_key(raw_key, label)
        if result.get('success'):
            logger.info("key_event", f"Key added: {label or 'unnamed'}")
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/keys/<key_id>', methods=['PUT'])
def update_key_status(key_id):
    data   = request.get_json() or {}
    status = data.get('status', 'Active')
    try:
        return jsonify({"success": key_manager.update_key_status(key_id, status)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/keys/<key_id>', methods=['DELETE'])
def delete_key(key_id):
    try:
        success = key_manager.remove_key(key_id)
        if success:
            logger.info("key_event", f"Key deleted: {key_id}")
        return jsonify({"success": success})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/keys/status', methods=['GET'])
def get_keys_status_live():
    return list_keys()


@app.route('/api/keys/<key_id>/test', methods=['POST'])
def test_api_key(key_id):
    import time as _t
    from google import genai as _genai
    try:
        raw_key = None
        key_label = key_id
        for k in key_manager.keys:
            if k['id'] == key_id:
                raw_key   = key_manager._decrypt(k['key_encrypted'])
                key_label = k['label']
                break
        if not raw_key:
            return jsonify({"success": False, "error": "Key not found"}), 404
        t0     = _t.time()
        client = _genai.Client(api_key=raw_key)
        resp   = client.models.generate_content(model="gemini-2.5-flash", contents="Reply: OK")
        ms     = int((_t.time() - t0) * 1000)
        reply  = resp.text.strip()[:50]
        logger.success("key_event", f"Key test PASSED: {key_label}", {"duration_ms": ms})
        return jsonify({"success": True, "status": "working", "duration_ms": ms, "reply": reply})
    except Exception as e:
        err    = str(e)[:200]
        status = "quota_exceeded" if ("429" in err or "RESOURCE_EXHAUSTED" in err) else "error"
        logger.error("key_event", f"Key test FAILED: {key_label}", {"error": err})
        return jsonify({"success": False, "status": status, "error": err})


# ── MODELS ────────────────────────────────────────────────────────────────────
@app.route('/api/models', methods=['GET'])
def list_models():
    models = [
        {"id": "auto",                 "name": "Auto (Flash-Lite / 2.5 Flash for RAG)"},
        {"id": "gemini-3.1-flash-lite","name": "Gemini 3.1 Flash-Lite — FASTEST · 500/day"},
        {"id": "gemini-2.5-flash",     "name": "Gemini 2.5 Flash — 20/day"},
        {"id": "gemini-3.5-flash",     "name": "Gemini 3.5 Flash — 20/day"},
        {"id": "gemma-4-26b-a4b-it",   "name": "Gemma 4 26B — Unlimited tokens · 1500/day"},
    ]
    return jsonify({"success": True, "models": models})


@app.route('/api/models/select', methods=['POST'])
def select_model_override():
    data = request.get_json() or {}
    try:
        ProfileManager.update_settings({"selected_model": data.get('model', 'auto')})
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── TODOS ─────────────────────────────────────────────────────────────────────
@app.route('/api/todos', methods=['GET'])
def get_todos():
    try:
        todos = TodoManager.get_todos(
            status_filter=request.args.get('status'),
            priority_filter=request.args.get('priority'),
            source_filter=request.args.get('source')
        )
        return jsonify({"success": True, "todos": todos})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/todos', methods=['POST'])
def create_todo():
    data  = request.get_json() or {}
    title = data.get('title', '').strip()
    if not title:
        return jsonify({"success": False, "error": "Todo title is required"}), 400
    try:
        todo = TodoManager.create_todo(
            title=title, description=data.get('description', ''),
            priority=data.get('priority', 'medium'), due_date=data.get('due_date'),
            tags=data.get('tags', []), source="manual"
        )
        return jsonify({"success": True, "todo": todo})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    try:
        return jsonify({"success": TodoManager.update_todo(todo_id, request.get_json() or {})})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    try:
        return jsonify({"success": TodoManager.delete_todo(todo_id)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/todos/<int:todo_id>/complete', methods=['POST'])
def complete_todo(todo_id):
    try:
        return jsonify({"success": TodoManager.complete_todo(todo_id)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── LEARNING PATH ─────────────────────────────────────────────────────────────
@app.route('/api/path', methods=['GET'])
def get_learning_path():
    try:
        return jsonify({"success": True, "path": learning_path.get_path()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/path/generate', methods=['POST'])
def generate_path():
    try:
        profile = ProfileManager.get_profile()
        path = learning_path.generate_initial_path(
            name=profile.get("name"), goal=profile.get("goal"),
            current_skills=profile.get("current_skills", []),
            target_skills=profile.get("target_skills", []),
            daily_study_time=profile.get("daily_study_time", 60)
        )
        return jsonify({"success": True, "path": path})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/path/update', methods=['PUT'])
def trigger_path_update():
    data    = request.get_json() or {}
    day_num = data.get('day')
    status  = data.get('status')
    if day_num is None or not status:
        return jsonify({"success": False, "error": "'day' and 'status' required"}), 400
    try:
        return jsonify({"success": learning_path.update_day_status(day_num, status)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/path/today', methods=['GET'])
def get_today_plan():
    try:
        return jsonify({"success": True, "today_plan": learning_path.get_today_plan()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── KNOWLEDGE BASE ────────────────────────────────────────────────────────────
@app.route('/api/knowledge', methods=['GET'])
def list_knowledge_sources():
    try:
        return jsonify({"success": True, "sources": rag_pipeline.get_sources()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/knowledge/upload', methods=['POST'])
def upload_file_knowledge():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400
    file = request.files['file']
    if not file.filename:
        return jsonify({"success": False, "error": "No file selected"}), 400
    filename  = secure_filename(file.filename)
    file_path = os.path.join(UPLOADS_DIR, filename)
    file.save(file_path)
    try:
        if filename.endswith('.pdf'):
            source_id = rag_pipeline.index_pdf(file_path, filename)
        elif filename.endswith(('.txt', '.md')):
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            source_id = rag_pipeline.index_text_content(filename, 'text', content, path=file_path)
        else:
            return jsonify({"success": False, "error": "Use PDF, TXT or MD"}), 400
        logger.info("rag", f"File indexed: {filename}")
        return jsonify({"success": True, "source_id": source_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/knowledge/url', methods=['POST'])
def index_url_knowledge():
    url = (request.get_json() or {}).get('url', '').strip()
    if not url:
        return jsonify({"success": False, "error": "URL required"}), 400
    try:
        source_id = rag_pipeline.index_url(url)
        logger.info("rag", f"URL indexed: {url[:60]}")
        return jsonify({"success": True, "source_id": source_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/knowledge/note', methods=['POST'])
def index_note_knowledge():
    data    = request.get_json() or {}
    title   = data.get('title', '').strip()
    content = data.get('content', '').strip()
    if not title or not content:
        return jsonify({"success": False, "error": "Title and Content required"}), 400
    try:
        source_id = rag_pipeline.index_text_content(title, 'note', content)
        logger.info("rag", f"Note indexed: {title}")
        return jsonify({"success": True, "source_id": source_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/knowledge/<int:source_id>', methods=['DELETE'])
def delete_knowledge_source(source_id):
    try:
        return jsonify({"success": rag_pipeline.delete_source(source_id)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── PROFILE & SETTINGS ────────────────────────────────────────────────────────
@app.route('/api/profile', methods=['GET'])
def get_user_profile():
    try:
        return jsonify({"success": True, "profile": ProfileManager.get_profile(),
                        "settings": ProfileManager.get_settings()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/profile', methods=['PUT'])
def update_user_profile():
    data         = request.get_json() or {}
    profile_data = data.get('profile', {})
    settings_data= data.get('settings', {})
    try:
        updated_profile  = ProfileManager.update_profile(profile_data)
        updated_settings = ProfileManager.update_settings(settings_data)
        if 'goal' in profile_data or 'target_skills' in profile_data:
            learning_path.generate_initial_path(
                name=updated_profile.get("name"), goal=updated_profile.get("goal"),
                current_skills=updated_profile.get("current_skills", []),
                target_skills=updated_profile.get("target_skills", []),
                daily_study_time=updated_profile.get("daily_study_time", 60)
            )
        return jsonify({"success": True, "profile": updated_profile, "settings": updated_settings})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── ANALYTICS ─────────────────────────────────────────────────────────────────
@app.route('/api/analytics/overview', methods=['GET'])
def get_analytics_overview():
    try:
        return jsonify({"success": True, "overview": Analytics.get_overview()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analytics/skills', methods=['GET'])
def get_analytics_skills():
    try:
        return jsonify({"success": True, "skills": Analytics.get_skills_matrix()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analytics/weekly', methods=['GET'])
def get_analytics_weekly():
    try:
        return jsonify({"success": True, "weekly": Analytics.get_weekly_progress()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── LOGS ──────────────────────────────────────────────────────────────────────
@app.route('/api/logs', methods=['GET'])
def get_system_logs():
    try:
        logs = logger.get_logs(
            limit=int(request.args.get('limit', 200)),
            level=request.args.get('level'),
            category=request.args.get('category')
        )
        return jsonify({"success": True, "logs": logs})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/logs', methods=['DELETE'])
def clear_system_logs():
    try:
        from core.db import get_db_connection
        conn = get_db_connection()
        conn.execute("DELETE FROM system_logs")
        conn.commit()
        conn.close()
        logger.info("system", "Logs cleared by user")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ── TERMINAL ──────────────────────────────────────────────────────────────────
@app.route('/api/terminal/run', methods=['POST'])
def run_terminal_command():
    data = request.get_json() or {}
    command = data.get('command', '').strip()
    cwd = data.get('cwd', '').strip()
    if not command:
        return jsonify({"success": False, "error": "Command is required"}), 400
    try:
        output, new_cwd = terminal_engine.execute(command, cwd)
        return jsonify({"success": True, "output": output, "cwd": new_cwd})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── HISTORY EXPORT ────────────────────────────────────────────────────────────
@app.route('/api/history/export', methods=['GET'])
def export_chat_history():
    try:
        from core.db import get_db_connection
        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM messages ORDER BY timestamp ASC")
        rows   = [dict(r) for r in cursor.fetchall()]
        conn.close()
        sessions = {}
        for row in rows:
            sid = row['session_id']
            sessions.setdefault(sid, []).append(row)
        export_data = {
            "exported_at": datetime.datetime.now().isoformat(),
            "total_messages": len(rows),
            "sessions": sessions
        }
        logger.info("backup", f"Chat history exported ({len(rows)} messages)")
        return Response(json.dumps(export_data, indent=2), mimetype='application/json',
                        headers={"Content-Disposition": "attachment; filename=chat_history.json"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── BACKUP & RESTORE ──────────────────────────────────────────────────────────
@app.route('/api/backup/export', methods=['GET'])
def export_full_backup():
    try:
        from core.db import get_db_connection
        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM messages ORDER BY timestamp ASC")
        messages = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT id, name, type, path, status, chunk_count, created_at FROM knowledge_sources")
        knowledge_sources = [dict(r) for r in cursor.fetchall()]
        conn.close()

        keys_data = json.load(open(KEYS_PATH)) if os.path.exists(KEYS_PATH) else []
        lp_data   = json.load(open(LEARNING_PATH_JSON)) if os.path.exists(LEARNING_PATH_JSON) else {}

        backup = {
            "backup_version":  "1.0",
            "exported_at":     datetime.datetime.now().isoformat(),
            "chat_history":    messages,
            "knowledge_sources": knowledge_sources,
            "keys":            keys_data,
            "profile":         ProfileManager.get_profile(),
            "settings":        ProfileManager.get_settings(),
            "learning_path":   lp_data,
        }
        fname = f"devhunt_backup_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        logger.success("backup", f"Full backup exported: {fname}")
        return Response(json.dumps(backup, indent=2), mimetype='application/json',
                        headers={"Content-Disposition": f"attachment; filename={fname}"})
    except Exception as e:
        logger.error("backup", f"Backup export failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/backup/import', methods=['POST'])
def import_full_backup():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file uploaded"}), 400
        content = request.files['file'].read().decode('utf-8')
        backup  = json.loads(content)
        if backup.get('backup_version') != '1.0':
            return jsonify({"success": False, "error": "Unknown backup version"}), 400

        restored = {}
        from core.db import get_db_connection

        if backup.get('profile'):
            ProfileManager.update_profile(backup['profile'])
            restored['profile'] = True

        if backup.get('settings'):
            ProfileManager.update_settings(backup['settings'])
            restored['settings'] = True

        if backup.get('keys'):
            with open(KEYS_PATH, 'w') as f:
                json.dump(backup['keys'], f, indent=4)
            key_manager._load_keys()
            restored['keys'] = len(backup['keys'])

        if backup.get('learning_path'):
            with open(LEARNING_PATH_JSON, 'w') as f:
                json.dump(backup['learning_path'], f, indent=4)
            restored['learning_path'] = True

        if backup.get('chat_history'):
            conn   = get_db_connection()
            cursor = conn.cursor()
            count  = 0
            for msg in backup['chat_history']:
                try:
                    cursor.execute(
                        """INSERT OR IGNORE INTO messages
                           (id, session_id, role, content, model_used, key_used, timestamp, tokens_used)
                           VALUES (?,?,?,?,?,?,?,?)""",
                        (msg.get('id'), msg.get('session_id'), msg.get('role'),
                         msg.get('content'), msg.get('model_used'), msg.get('key_used'),
                         msg.get('timestamp'), msg.get('tokens_used', 0))
                    )
                    count += 1
                except Exception:
                    pass
            conn.commit()
            conn.close()
            restored['chat_messages'] = count

        logger.success("backup", "Backup restored", restored)
        return jsonify({"success": True, "restored": restored})
    except json.JSONDecodeError:
        return jsonify({"success": False, "error": "Invalid JSON file"}), 400
    except Exception as e:
        logger.error("backup", f"Backup import failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ── RESET ALL ─────────────────────────────────────────────────────────────────
@app.route('/api/reset', methods=['POST'])
def reset_everything():
    """Nuclear option — wipes keys, chat, todos, knowledge base."""
    try:
        from core.db import get_db_connection
        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM messages")
        cursor.execute("DELETE FROM todos")
        cursor.execute("DELETE FROM knowledge_sources")
        cursor.execute("DELETE FROM knowledge_chunks")
        cursor.execute("DELETE FROM analytics_events")
        cursor.execute("DELETE FROM system_logs")
        conn.commit()
        conn.close()
        # Wipe keys
        with open(KEYS_PATH, 'w') as f:
            json.dump([], f)
        key_manager._load_keys()
        # Reset profile & settings to defaults
        ProfileManager.update_profile({"name": "", "goal": "", "current_skills": [], "target_skills": [], "daily_study_time": 60, "streak_counter": 0})
        ProfileManager.update_settings({"english_correction": False, "selected_model": "auto"})
        logger.info("system", "Full reset performed by user")
        return jsonify({"success": True, "message": "All data cleared"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── ENTRY POINT ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    logger.info("system", "DevHunt server starting")
    app.run(host='0.0.0.0', port=5000, debug=True)
