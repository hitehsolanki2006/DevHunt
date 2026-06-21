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
from core.update_manager import UpdateManager

import os as _os
import sys as _sys

# Check if running in a packaged PyInstaller executable
_is_frozen = getattr(_sys, 'frozen', False)

_frontend_mode = _os.environ.get('DEVHUNT_FRONTEND_MODE', 'react').lower()

if _is_frozen:
    # Inside PyInstaller bundle: assets are directly in the bundle folder
    _react_dist = _os.path.join(_os.path.dirname(__file__), 'frontend-src', 'dist')
    _legacy_dir = _os.path.join(_os.path.dirname(__file__), 'frontend')
else:
    # Dev mode: assets are in the parent directory paths
    _react_dist = _os.path.join(_os.path.dirname(__file__), '..', 'frontend-src', 'dist')
    _legacy_dir = _os.path.join(_os.path.dirname(__file__), '..', 'frontend')

if _frontend_mode == 'legacy':
    _static_dir = _legacy_dir
else:
    _static_dir = _react_dist if _os.path.isdir(_react_dist) else _legacy_dir

app = Flask(__name__, static_folder=_static_dir, static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})
terminal_engine = TerminalEngine()

API_TOKEN = os.environ.get('X_DEVHUNT_TOKEN')

@app.before_request
def check_api_token():
    if request.method == 'OPTIONS':
        return
    if not request.path.startswith('/api/'):
        return
    if API_TOKEN:
        token = request.headers.get('X-DevHunt-Token')
        if token != API_TOKEN:
            return jsonify({"success": False, "error": "Unauthorized: Invalid or missing execution token."}), 401

# ── Static pages ──────────────────────────────────────────────────────────────
@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response


@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')

@app.route('/logs')
def serve_logs():
    # Try new build first, then legacy
    try:
        return app.send_static_file('logs.html')
    except Exception:
        return '', 404

@app.route('/docs')
def serve_docs():
    try:
        return app.send_static_file('docs.html')
    except Exception:
        return '', 404

@app.route('/api/logs/raw', methods=['GET'])
def get_raw_logs():
    try:
        limit = request.args.get('limit', 200, type=int)
        level = request.args.get('level')
        category = request.args.get('category')
        logs = logger.get_logs(limit=limit, level=level, category=category)
        
        lines = []
        for log_entry in reversed(logs):
            timestamp = log_entry.get('timestamp', '')
            lvl = log_entry.get('level', 'INFO')
            cat = log_entry.get('category', 'system')
            msg = log_entry.get('message', '')
            lines.append(f"[{timestamp}] [{lvl}] [{cat}] {msg}")
            
        return Response("\n".join(lines), mimetype='text/plain')
    except Exception as e:
        return f"Failed to retrieve logs: {e}", 500

# SPA catch-all — all non-API routes return index.html for React Router
@app.route('/<path:path>')
def serve_spa(path):
    if path.startswith('api/'):
        return '', 404
    static_file = _os.path.join(app.static_folder, path)
    if _os.path.isfile(static_file):
        return app.send_static_file(path)
    return app.send_static_file('index.html')

# ── Boot ──────────────────────────────────────────────────────────────────────
init_db()
key_manager    = KeyManager()
rag_pipeline   = RAGPipeline(key_manager)
chat_engine    = ChatEngine(key_manager, rag_pipeline)
learning_path  = LearningPath(key_manager)

# Run initial memory refinement on startup and repeat hourly in a background thread
try:
    from core.memory_manager import MemoryManager
    import threading
    mm = MemoryManager(key_manager)
    
    def run_hourly_memory_consolidation(memory_mgr):
        # Initial run on server startup
        try:
            memory_mgr.refine_memories("default_session")
        except Exception as ex:
            print(f"Initial memory refinement on boot failed: {ex}")
        
        # Consolidation loop every hour (3600 seconds)
        import time as _time
        while True:
            _time.sleep(3600)
            try:
                memory_mgr.refine_memories("default_session")
            except Exception as ex:
                print(f"Scheduled hourly memory refinement failed: {ex}")
                
    threading.Thread(target=run_hourly_memory_consolidation, args=(mm,), daemon=True).start()
except Exception as e:
    print(f"Failed to start startup memory refinement: {e}")


# ── CHAT ──────────────────────────────────────────────────────────────────────
@app.route('/api/chat', methods=['POST'])
def send_chat_message():
    data = request.get_json() or {}
    message      = data.get('message', '').strip()
    session_id   = data.get('session_id', 'default_session')
    model_override = data.get('model_override')
    source_id    = data.get('source_id')
    if source_id is not None:
        try:
            source_id = int(source_id)
        except ValueError:
            source_id = None
            
    if not message:
        return jsonify({"success": False, "error": "Message content is required"}), 400
    try:
        ProfileManager.increment_streak()
        logger.info("chat", f"User: {message[:120]}...", {"session_id": session_id})
        result = chat_engine.send_message(session_id, message, model_override, source_id=source_id)
        if result.get("success") and result.get("response"):
            learning_path.auto_adjust_path(f"User: {message}\nAI: {result['response']}")
            logger.success("chat", f"AI: {result['response'][:120]}...", {"session_id": session_id, "model": result.get("model")})
        return jsonify(result)
    except Exception as e:
        logger.error("chat", f"Chat failed: {e}", {"session_id": session_id})
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/chat/stream', methods=['POST'])
def stream_chat_message():
    data = request.get_json() or {}
    message      = data.get('message', '').strip()
    session_id   = data.get('session_id', 'default_session')
    model_override = data.get('model_override')
    source_id    = data.get('source_id')
    if source_id is not None:
        try:
            source_id = int(source_id)
        except ValueError:
            source_id = None
            
    if not message:
        return jsonify({"success": False, "error": "Message content is required"}), 400

    def generate():
        try:
            ProfileManager.increment_streak()
            logger.info("chat", f"User (stream): {message[:120]}...", {"session_id": session_id})
            full_response = []
            for chunk in chat_engine.stream_message(session_id, message, model_override, source_id=source_id):
                if isinstance(chunk, dict):
                    content = chunk.get('content') or chunk.get('text') or ""
                    if content:
                        full_response.append(content)
                yield f"data: {json.dumps(chunk)}\n\n"
            
            resp_str = "".join(full_response)
            logger.success("chat", f"AI (stream response complete): {resp_str[:120]}...", {"session_id": session_id})
        except Exception as e:
            logger.error("chat", f"Chat stream failed: {e}", {"session_id": session_id})
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


@app.route('/api/chat/sessions', methods=['GET'])
def get_chat_sessions():
    try:
        from core.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                session_id, 
                COUNT(*) as msg_count, 
                MIN(timestamp) as first_msg_time,
                MAX(timestamp) as last_msg_time,
                (SELECT content FROM messages m2 WHERE m2.session_id = messages.session_id ORDER BY timestamp ASC LIMIT 1) as title
            FROM messages
            GROUP BY session_id
            ORDER BY last_msg_time DESC
        """)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "sessions": rows})
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
    import keyring as _keyring
    from google import genai as _genai
    key_label = key_id
    try:
        raw_key = None
        for k in key_manager.keys:
            if k['id'] == key_id:
                raw_key   = _keyring.get_password("DevHunt", key_id)
                key_label = k['label']
                break
        if not raw_key:
            return jsonify({"success": False, "error": "Key not found or not accessible in OS vault"}), 404
        t0     = _t.time()
        client = _genai.Client(api_key=raw_key)
        resp   = client.models.generate_content(model="gemma-4-26b-a4b-it", contents="Reply: OK")
        ms     = int((_t.time() - t0) * 1000)
        reply  = resp.text.strip()[:50]
        logger.success("key_event", f"Key test PASSED: {key_label}", {"duration_ms": ms})
        return jsonify({"success": True, "status": "working", "duration_ms": ms, "reply": reply})
    except Exception as e:
        err    = str(e)[:200]
        status = "quota_exceeded" if ("429" in err or "RESOURCE_EXHAUSTED" in err) else "error"
        logger.error("key_event", f"Key test FAILED: {key_label}", {"error": err})
        return jsonify({"success": False, "status": status, "error": err})


# ── SETTINGS (aggregate endpoint used by the React frontend on load) ──────────
@app.route('/api/settings', methods=['GET'])
def get_settings_overview():
    """Returns a combined snapshot of API keys and active model for frontend header badges."""
    try:
        keys      = key_manager.get_keys_list()
        settings  = ProfileManager.get_settings()
        model     = settings.get('selected_model', 'auto')
        active    = [k for k in keys if k.get('status') == 'Active']
        return jsonify({
            "success": True,
            "api_keys": active,
            "all_keys": keys,
            "active_model": model,
            "key_count": len(active)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── CHECK-UPDATE alias (frontend calls /api/check-update) ─────────────────────
@app.route('/api/check-update', methods=['GET'])
def check_update_alias():
    """Alias for /api/updates/check, used by React frontend update checker."""
    return check_updates_endpoint()


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
        res = learning_path.update_day_status(day_num, status)
        if res:
            logger.success("system", f"Updated learning path day {day_num} status to '{status}'")
        return jsonify({"success": res})
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
        if filename.lower().endswith('.pdf'):
            source_id = rag_pipeline.index_pdf(file_path, filename)
        elif filename.lower().endswith(('.txt', '.md')):
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            source_id = rag_pipeline.index_text_content(filename, 'text', content, path=file_path)
        elif filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.tiff')):
            from core.db import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO knowledge_sources (name, type, path, status, chunk_count) VALUES (?, ?, ?, ?, ?)",
                (filename, 'image', file_path, 'pending', 0)
            )
            source_id = cursor.lastrowid
            conn.commit()
            conn.close()
        else:
            return jsonify({"success": False, "error": "Use PDF, TXT, MD or Images (PNG, JPG, JPEG, WEBP, TIFF)"}), 400
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


@app.route('/api/knowledge/<int:source_id>/content', methods=['GET'])
def get_knowledge_source_content(source_id):
    try:
        from core.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM knowledge_sources WHERE id = ?", (source_id,))
        source = cursor.fetchone()
        if not source:
            conn.close()
            return jsonify({"success": False, "error": "Source not found"}), 404
        
        cursor.execute("SELECT content FROM knowledge_chunks WHERE source_id = ? ORDER BY id ASC", (source_id,))
        chunks = cursor.fetchall()
        conn.close()
        
        full_content = "\n\n".join(c['content'] for c in chunks)
        return jsonify({"success": True, "name": source['name'], "content": full_content})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── DOCUMENT INTELLIGENCE AGENTS ─────────────────────────────────────────────
@app.route('/api/knowledge/<int:source_id>/analyze', methods=['POST'])
def analyze_document_endpoint(source_id):
    try:
        from core.document_analyzer import DocIntelligenceOrchestrator
        orchestrator = DocIntelligenceOrchestrator(key_manager)
        res = orchestrator.run_pipeline(source_id)
        if res.get("success"):
            return jsonify(res)
        else:
            return jsonify(res), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/knowledge/<int:source_id>/analysis', methods=['GET'])
def get_document_analysis_endpoint(source_id):
    try:
        from core.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT final_score, verdict, risk_level, report_json, ela_image_path, dashboard_image_path 
               FROM document_analyses WHERE source_id = ?""",
            (source_id,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"success": False, "analyzed": False})
            
        return jsonify({
            "success": True,
            "analyzed": True,
            "score": row['final_score'],
            "verdict": row['verdict'],
            "risk_level": row['risk_level'],
            "report": json.loads(row['report_json']),
            "ela_image": row['ela_image_path'],
            "dashboard_image": row['dashboard_image_path']
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analysis/image/<path:filename>', methods=['GET'])
def serve_analysis_image_endpoint(filename):
    try:
        from flask import send_from_directory
        return send_from_directory(UPLOADS_DIR, filename)
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


# ── AI MEMORY ─────────────────────────────────────────────────────────────────
@app.route('/api/memory', methods=['GET'])
def get_ai_memory():
    session_id = request.args.get('session_id', 'default_session')
    try:
        from core.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT consolidated_facts FROM user_memories WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        memories = json.loads(row['consolidated_facts']) if (row and row['consolidated_facts']) else []
        return jsonify({"success": True, "memories": memories})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/memory', methods=['PUT'])
def update_ai_memory():
    data = request.get_json() or {}
    session_id = data.get('session_id', 'default_session')
    memories = data.get('memories', [])
    if not isinstance(memories, list):
        return jsonify({"success": False, "error": "memories must be a JSON array of strings"}), 400
    try:
        from core.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO user_memories (session_id, consolidated_facts, last_updated)
               VALUES (?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(session_id) DO UPDATE SET
               consolidated_facts = excluded.consolidated_facts,
               last_updated = CURRENT_TIMESTAMP""",
            (session_id, json.dumps(memories))
        )
        conn.commit()
        conn.close()
        logger.info("system", f"AI memories manually updated for session '{session_id}'")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/memory/refine', methods=['POST'])
def refine_ai_memory():
    data = request.get_json() or {}
    session_id = data.get('session_id', 'default_session')
    try:
        from core.memory_manager import MemoryManager
        mm = MemoryManager(key_manager)
        result = mm.refine_memories(session_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/memory', methods=['DELETE'])
def clear_ai_memory():
    session_id = request.args.get('session_id', 'default_session')
    try:
        from core.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_memories WHERE session_id = ?", (session_id,))
        conn.commit()
        conn.close()
        logger.info("system", f"AI memories cleared for session '{session_id}'")
        return jsonify({"success": True})
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


# ── TERMINAL STATS (Visualization Data) ───────────────────────────────────────
@app.route('/api/stats', methods=['GET'])
def get_terminal_stats():
    try:
        from core.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()

        # Overall totals
        cursor.execute("SELECT COUNT(*) as total_msgs, SUM(COALESCE(tokens_used,0)) as total_toks FROM messages")
        row = cursor.fetchone()
        total_msgs = row['total_msgs'] or 0
        total_toks = row['total_toks'] or 0

        # Unique active sessions
        cursor.execute("SELECT COUNT(DISTINCT session_id) as total_sess FROM messages")
        total_sess = cursor.fetchone()['total_sess'] or 0

        # Efficiency calculations
        avg_tokens = round(total_toks / total_msgs, 1) if total_msgs > 0 else 0.0
        est_savings = round((total_toks / 1000.0) * 0.002, 3)

        # Model distribution
        cursor.execute("""
            SELECT model_used, COUNT(*) as msg_count, SUM(COALESCE(tokens_used,0)) as tokens
            FROM messages
            WHERE model_used IS NOT NULL
            GROUP BY model_used
            ORDER BY msg_count DESC
        """)
        model_rows = [{"model": r['model_used'], "requests": r['msg_count'], "tokens": r['tokens'] or 0}
                      for r in cursor.fetchall()]

        # Key workload distribution
        cursor.execute("""
            SELECT key_used, COUNT(*) as msg_count, SUM(COALESCE(tokens_used,0)) as tokens
            FROM messages
            WHERE key_used IS NOT NULL
            GROUP BY key_used
            ORDER BY msg_count DESC
        """)
        key_raw = cursor.fetchall()

        # Resolve key labels
        km = key_manager
        keys_list = km.get_keys_list()
        key_map = {str(k['id']): k['label'] or k['masked_key'] for k in keys_list}
        key_masked = {str(k['id']): k['masked_key'] for k in keys_list}
        key_rows = []
        for r in key_raw:
            kid = str(r['key_used']) if r['key_used'] else 'unknown'
            label = key_map.get(kid, f"Key …{kid[-6:]}" if len(kid) > 6 else kid)
            masked = key_masked.get(kid, 'N/A')
            key_rows.append({"label": label, "masked": masked, "requests": r['msg_count'], "tokens": r['tokens'] or 0})

        # Daily messages (last 14 days)
        cursor.execute("""
            SELECT DATE(timestamp) as day, COUNT(*) as msg_count, SUM(COALESCE(tokens_used,0)) as tokens
            FROM messages
            WHERE timestamp >= DATE('now', '-14 days')
            GROUP BY DATE(timestamp)
            ORDER BY day ASC
        """)
        daily_rows = [{"day": r['day'], "messages": r['msg_count'], "tokens": r['tokens'] or 0}
                      for r in cursor.fetchall()]

        # Role split (user vs assistant)
        cursor.execute("""
            SELECT role, COUNT(*) as cnt FROM messages GROUP BY role
        """)
        role_split = {r['role']: r['cnt'] for r in cursor.fetchall()}

        # Top sessions by message count
        cursor.execute("""
            SELECT session_id, COUNT(*) as cnt, SUM(COALESCE(tokens_used,0)) as tokens
            FROM messages GROUP BY session_id ORDER BY cnt DESC LIMIT 5
        """)
        session_rows = [{"session": r['session_id'], "messages": r['cnt'], "tokens": r['tokens'] or 0}
                        for r in cursor.fetchall()]

        conn.close()

        return jsonify({
            "success": True,
            "total_messages": total_msgs,
            "total_tokens": total_toks,
            "avg_tokens": avg_tokens,
            "est_savings": est_savings,
            "active_sessions_count": total_sess,
            "model_distribution": model_rows,
            "key_workload": key_rows,
            "daily_activity": daily_rows,
            "role_split": role_split,
            "top_sessions": session_rows
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── LINKEDIN POST DRAFTS ──────────────────────────────────────────────────────
@app.route('/api/linkedin/drafts', methods=['GET'])
def get_linkedin_drafts():
    try:
        from core.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM linkedin_drafts ORDER BY created_at DESC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "drafts": rows})
    except Exception as e:
        logger.error("linkedin", f"Failed to get drafts: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/linkedin/drafts', methods=['POST'])
def create_linkedin_draft():
    try:
        from core.db import get_db_connection
        data = request.get_json() or {}
        title = data.get('title', '').strip() or 'Untitled LinkedIn Post'
        content = data.get('content', '').strip()
        status = data.get('status', 'draft')
        if not content:
            return jsonify({"success": False, "error": "Content is required"}), 400
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO linkedin_drafts (title, content, status, created_at, updated_at) VALUES (?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))",
            (title, content, status)
        )
        draft_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM linkedin_drafts WHERE id = ?", (draft_id,))
        row = dict(cursor.fetchone())
        conn.close()
        logger.info("linkedin", f"Created draft '{title}' (ID: {draft_id})")
        return jsonify({"success": True, "draft": row})
    except Exception as e:
        logger.error("linkedin", f"Failed to create draft: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/linkedin/drafts/<int:draft_id>', methods=['PUT'])
def update_linkedin_draft(draft_id):
    try:
        from core.db import get_db_connection
        data = request.get_json() or {}
        title = data.get('title', '').strip()
        content = data.get('content', '').strip()
        status = data.get('status', 'draft')
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM linkedin_drafts WHERE id = ?", (draft_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "error": "Draft not found"}), 404
        
        cursor.execute(
            "UPDATE linkedin_drafts SET title = COALESCE(?, title), content = COALESCE(?, content), status = COALESCE(?, status), updated_at = datetime('now', 'localtime') WHERE id = ?",
            (title if title else None, content if content else None, status, draft_id)
        )
        conn.commit()
        cursor.execute("SELECT * FROM linkedin_drafts WHERE id = ?", (draft_id,))
        row = dict(cursor.fetchone())
        conn.close()
        logger.info("linkedin", f"Updated draft (ID: {draft_id})", {"title": title or row.get('title')})
        return jsonify({"success": True, "draft": row})
    except Exception as e:
        logger.error("linkedin", f"Failed to update draft {draft_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/linkedin/drafts/<int:draft_id>', methods=['DELETE'])
def delete_linkedin_draft(draft_id):
    try:
        from core.db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM linkedin_drafts WHERE id = ?", (draft_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "error": "Draft not found"}), 404
        cursor.execute("DELETE FROM linkedin_drafts WHERE id = ?", (draft_id,))
        conn.commit()
        conn.close()
        logger.warn("linkedin", f"Deleted draft (ID: {draft_id})")
        return jsonify({"success": True, "message": "Draft deleted successfully"})
    except Exception as e:
        logger.error("linkedin", f"Failed to delete draft {draft_id}: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/linkedin/drafts/refine', methods=['POST'])
def refine_linkedin_draft():
    try:
        from google import genai
        from google.genai import types
        
        data = request.get_json() or {}
        content = data.get('content', '').strip()
        refinement_prompt = (data.get('refinement_prompt') or data.get('prompt') or '').strip()
        
        if not content:
            return jsonify({"success": False, "error": "Draft content is required"}), 400
            
        system_instruction = (
            "You are an expert LinkedIn copywriter. "
            "Refine the user's post content according to their instruction. "
            "Output ONLY the final, modified post content. "
            "Do NOT include any explanations, introduction, markdown headers for title, or wrapping commentary."
        )
        
        user_message = f"Refinement Instruction: {refinement_prompt}\n\nOriginal Draft:\n{content}"
        
        all_keys = key_manager.get_keys_list()
        max_attempts = max(3, len(all_keys))
        
        refined_text = None
        for attempt in range(max_attempts):
            api_key, key_id = key_manager.get_active_key_string()
            if not api_key:
                return jsonify({"success": False, "error": "No active API key. Please add one in Settings."}), 400
                
            try:
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=user_message,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7,
                    )
                )
                refined_text = response.text
                key_manager.on_success(key_id)
                break
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "ResourceExhausted" in err_str:
                    key_manager.on_rate_limit_error(key_id)
                else:
                    key_manager.on_other_error(key_id)
                    
        if not refined_text:
            logger.error("linkedin", "AI Refinement failed: all keys exhausted or rate limited")
            return jsonify({"success": False, "error": "AI Refinement failed. All API keys exhausted or rate limited."}), 500
            
        logger.info("linkedin", "Refined post content using model gemini-2.5-flash", {"prompt": refinement_prompt})
        return jsonify({"success": True, "refined_content": refined_text.strip()})
    except Exception as e:
        logger.error("linkedin", f"AI Refinement failed: {str(e)}")
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
        logger.info("terminal", f"Executed command: {command}", {"cwd": cwd, "new_cwd": new_cwd})
        return jsonify({"success": True, "output": output, "cwd": new_cwd})
    except Exception as e:
        logger.error("terminal", f"Command failed: {command} - {e}", {"cwd": cwd, "error": str(e)})
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


# ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
@app.route('/api/notifications', methods=['GET'])
def get_system_notifications():
    try:
        import requests
        from core.update_manager import UpdateManager
        from core.logger import get_logs
        
        settings = ProfileManager.get_settings()
        read_notifications = settings.get("read_notifications", [])
        dismissed_notifications = settings.get("dismissed_notifications", [])
        
        notifications = []
        
        # 1. Fetch Remote Announcements
        try:
            res = requests.get(
                "https://raw.githubusercontent.com/hitehsolanki2006/DevHunt/main/notifications.json",
                timeout=2.0
            )
            if res.status_code == 200:
                remote_data = res.json()
                if isinstance(remote_data, list):
                    for item in remote_data:
                        notifications.append({
                            "id": item.get("id"),
                            "title": item.get("title", "Announcement"),
                            "message": item.get("message", ""),
                            "type": item.get("type", "release"),
                            "timestamp": item.get("timestamp", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                        })
        except Exception:
            pass
            
        # Load Local Announcements to merge
        try:
            if _is_frozen:
                import sys as _sys
                base_dir = getattr(_sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
                local_notif_path = os.path.join(base_dir, "notifications.json")
            else:
                backend_dir = os.path.dirname(os.path.abspath(__file__))
                local_notif_path = os.path.join(os.path.dirname(backend_dir), "notifications.json")
            if os.path.exists(local_notif_path):
                with open(local_notif_path, "r", encoding="utf-8") as f:
                    local_data = json.load(f)
                    if isinstance(local_data, list):
                        existing_ids = {n["id"] for n in notifications}
                        for item in local_data:
                            if item.get("id") not in existing_ids:
                                notifications.append({
                                    "id": item.get("id"),
                                    "title": item.get("title", "Announcement"),
                                    "message": item.get("message", ""),
                                    "type": item.get("type", "release"),
                                    "timestamp": item.get("timestamp", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                                })
        except Exception:
            pass
            
        # Fallback welcome announcement if offline or repo lacks notifications.json
        if not any(n["type"] in ["release", "news"] for n in notifications):
            notifications.append({
                "id": "announcement-welcome",
                "title": "Welcome to DevHunt!",
                "message": "Welcome to your premium developer dashboard. System Messages consolidates software updates, remote release announcements, and local warnings.",
                "type": "info",
                "timestamp": "2026-06-11 12:00:00"
            })
            
        # 2. Git Update Status
        try:
            update_status = UpdateManager.check_for_updates()
            if update_status.get("success") and update_status.get("update_available"):
                latest_commit = update_status.get("latest_commit")
                commit_msg_list = [c["message"] for c in update_status.get("commits", [])]
                commit_msgs = "; ".join(commit_msg_list) if commit_msg_list else "New changes available."
                notifications.append({
                    "id": f"git-update-{latest_commit}",
                    "title": "⚡ Software Update Available",
                    "message": f"New commit: {latest_commit}. Changes: {commit_msgs}",
                    "type": "update",
                    "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
        except Exception:
            pass
            
        # 3. Local System Log Warning/Error Alerts
        try:
            system_errors = get_logs(limit=100, level="ERROR")
            system_warnings = get_logs(limit=100, level="WARN")
            merged_logs = system_errors + system_warnings
            merged_logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            for log_entry in merged_logs[:100]:
                notifications.append({
                    "id": f"log-{log_entry['id']}",
                    "title": f"⚠️ System Log: {log_entry['category'].upper()} ({log_entry['level']})",
                    "message": log_entry["message"],
                    "type": "log_error" if log_entry["level"] == "ERROR" else "log_warn",
                    "timestamp": log_entry.get("timestamp", ""),
                    "metadata": log_entry.get("metadata", {})
                })
        except Exception:
            pass
            
        # Sort notifications by timestamp descending
        def get_notification_time(n):
            t = n.get("timestamp", "")
            return t if t else "1970-01-01 00:00:00"
            
        notifications.sort(key=get_notification_time, reverse=True)
        filtered_notifications = [n for n in notifications if n.get("id") not in dismissed_notifications]
        
        return jsonify({
            "success": True,
            "notifications": filtered_notifications,
            "read_notifications": read_notifications,
            "dismissed_notifications": dismissed_notifications
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500



# ── UPDATES ───────────────────────────────────────────────────────────────────
@app.route('/api/updates/check', methods=['GET'])
def check_updates_endpoint():
    try:
        result = UpdateManager.check_for_updates()
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/updates/apply', methods=['POST'])
def apply_updates_endpoint():
    try:
        result = UpdateManager.apply_update()
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── MUSIC PLAYER ──────────────────────────────────────────────────────────────
MUSIC_DIR = os.path.join(UPLOADS_DIR, 'music')
os.makedirs(MUSIC_DIR, exist_ok=True)
ALLOWED_AUDIO_EXTS = {'.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.opus', '.weba', '.webm'}


def get_audio_duration(filepath):
    """Try to get duration using yt-dlp probe (lightweight)."""
    try:
        import subprocess, json as _json
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', filepath],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            data = _json.loads(result.stdout)
            return float(data.get('format', {}).get('duration', 0))
    except Exception:
        pass
    return 0


def music_file_info(filename):
    path = os.path.join(MUSIC_DIR, filename)
    if not os.path.exists(path):
        return None
    stat = os.stat(path)
    size_kb = round(stat.st_size / 1024, 1)
    ext = os.path.splitext(filename)[1].lower()
    # Read title from filename (strip yt ID suffix if present)
    title = os.path.splitext(filename)[0]
    # Remove yt-dlp style ID suffix like [abcdef12]
    import re
    title = re.sub(r'\s*\[[a-zA-Z0-9_-]{6,12}\]$', '', title)
    return {
        "filename": filename,
        "title": title,
        "ext": ext,
        "size_kb": size_kb,
        "added_at": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
    }


@app.route('/api/music/list', methods=['GET'])
def music_list():
    try:
        files = []
        for f in sorted(os.listdir(MUSIC_DIR), key=lambda x: os.path.getmtime(os.path.join(MUSIC_DIR, x)), reverse=True):
            if os.path.splitext(f)[1].lower() in ALLOWED_AUDIO_EXTS:
                info = music_file_info(f)
                if info:
                    files.append(info)
        return jsonify({"success": True, "tracks": files})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/music/upload', methods=['POST'])
def music_upload():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        f = request.files['file']
        original = secure_filename(f.filename)
        ext = os.path.splitext(original)[1].lower()
        if ext not in ALLOWED_AUDIO_EXTS:
            return jsonify({"success": False, "error": f"Unsupported format: {ext}. Allowed: {', '.join(ALLOWED_AUDIO_EXTS)}"}), 400
        # Avoid name collisions
        base = os.path.splitext(original)[0]
        filename = original
        counter = 1
        while os.path.exists(os.path.join(MUSIC_DIR, filename)):
            filename = f"{base}_{counter}{ext}"
            counter += 1
        save_path = os.path.join(MUSIC_DIR, filename)
        f.save(save_path)
        info = music_file_info(filename)
        logger.success("music", f"Uploaded track: {filename}")
        return jsonify({"success": True, "track": info})
    except Exception as e:
        logger.error("music", f"Upload failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/music/youtube', methods=['POST'])
def music_youtube():
    """Convert a YouTube URL to MP3 and save it to the music library."""
    data = request.get_json() or {}
    url = data.get('url', '').strip()
    if not url:
        return jsonify({"success": False, "error": "YouTube URL required"}), 400
    try:
        import yt_dlp
        output_template = os.path.join(MUSIC_DIR, '%(title)s [%(id)s].%(ext)s')
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_title = info.get('title', 'Unknown')
            video_id = info.get('id', '')

        # Find the saved file
        saved_file = None
        for f in os.listdir(MUSIC_DIR):
            if video_id in f and f.endswith('.mp3'):
                saved_file = f
                break
        if not saved_file:
            # Fallback: find most recently modified mp3
            mp3s = [f for f in os.listdir(MUSIC_DIR) if f.endswith('.mp3')]
            if mp3s:
                saved_file = max(mp3s, key=lambda x: os.path.getmtime(os.path.join(MUSIC_DIR, x)))

        if not saved_file:
            return jsonify({"success": False, "error": "Conversion succeeded but file not found"}), 500

        track = music_file_info(saved_file)
        logger.success("music", f"YouTube converted: {video_title} → {saved_file}")
        return jsonify({"success": True, "track": track, "youtube_title": video_title})
    except ImportError:
        return jsonify({"success": False, "error": "yt-dlp not installed. Run: pip install yt-dlp"}), 500
    except Exception as e:
        err = str(e)
        logger.warn("music", f"YouTube MP3 conversion failed, attempting native format download: {err[:150]}")
        # If ffmpeg is missing, try downloading without postprocessing (native audio file like .webm/.m4a)
        if 'ffmpeg' in err.lower() or 'ffprobe' in err.lower() or 'postprocessor' in err.lower():
            try:
                # Setup native options (no ffmpeg dependency)
                ydl_opts_native = {
                    'format': 'bestaudio/best',
                    'outtmpl': os.path.join(MUSIC_DIR, '%(title)s [%(id)s].%(ext)s'),
                    'quiet': True,
                    'no_warnings': True,
                }
                with yt_dlp.YoutubeDL(ydl_opts_native) as ydl:
                    info = ydl.extract_info(url, download=True)
                    video_title = info.get('title', 'Unknown')
                    video_id = info.get('id', '')
                
                # Find the downloaded file
                saved_file = None
                for f in os.listdir(MUSIC_DIR):
                    if video_id in f:
                        ext = os.path.splitext(f)[1].lower()
                        if ext in ALLOWED_AUDIO_EXTS:
                            saved_file = f
                            break
                
                if saved_file:
                    track = music_file_info(saved_file)
                    logger.success("music", f"YouTube native download succeeded: {video_title} → {saved_file}")
                    return jsonify({"success": True, "track": track, "youtube_title": video_title})
                else:
                    return jsonify({"success": False, "error": "Native download succeeded but file not found in library"}), 500
            except Exception as e2:
                logger.error("music", f"YouTube native fallback download also failed: {e2}")
                return jsonify({"success": False, "error": f"Native download failed: {str(e2)[:300]}"}), 500
        
        return jsonify({"success": False, "error": err[:300]}), 500


@app.route('/api/music/stream/<path:filename>', methods=['GET'])
def music_stream(filename):
    """Stream audio file to the browser."""
    try:
        safe_name = os.path.basename(filename)
        filepath = os.path.join(MUSIC_DIR, safe_name)
        if not os.path.exists(filepath) or not os.path.isfile(filepath):
            return jsonify({"error": "Track not found"}), 404
        ext = os.path.splitext(safe_name)[1].lower()
        mime_map = {
            '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
            '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4',
            '.opus': 'audio/opus', '.weba': 'audio/webm', '.webm': 'audio/webm'
        }
        mime = mime_map.get(ext, 'audio/mpeg')

        # Support range requests for seeking
        file_size = os.path.getsize(filepath)
        range_header = request.headers.get('Range')
        if range_header:
            byte_start, byte_end = 0, file_size - 1
            m = __import__('re').search(r'(\d+)-(\d*)', range_header)
            if m:
                byte_start = int(m.group(1))
                if m.group(2):
                    byte_end = int(m.group(2))
            length = byte_end - byte_start + 1
            def generate():
                with open(filepath, 'rb') as fh:
                    fh.seek(byte_start)
                    remaining = length
                    while remaining > 0:
                        chunk = fh.read(min(65536, remaining))
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
            resp = Response(generate(), 206, mimetype=mime,
                            content_type=mime, direct_passthrough=True)
            resp.headers['Content-Range'] = f'bytes {byte_start}-{byte_end}/{file_size}'
            resp.headers['Accept-Ranges'] = 'bytes'
            resp.headers['Content-Length'] = str(length)
            return resp
        else:
            from flask import send_file
            return send_file(filepath, mimetype=mime, conditional=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/music/download/<path:filename>', methods=['GET'])
def music_download(filename):
    """Download a music file."""
    try:
        from flask import send_file
        safe_name = os.path.basename(filename)
        filepath = os.path.join(MUSIC_DIR, safe_name)
        if not os.path.exists(filepath) or not os.path.isfile(filepath):
            return jsonify({"error": "Track not found"}), 404
        return send_file(filepath, as_attachment=True, download_name=safe_name)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/music/delete/<path:filename>', methods=['DELETE'])
def music_delete(filename):
    try:
        safe_name = os.path.basename(filename)
        filepath = os.path.join(MUSIC_DIR, safe_name)
        if os.path.exists(filepath) and os.path.isfile(filepath):
            os.remove(filepath)
            logger.info("music", f"Deleted track: {safe_name}")
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── IDE ENDPOINTS ─────────────────────────────────────────────────────────────
if _is_frozen:
    app_data_root = _os.environ.get('LOCALAPPDATA') or _os.environ.get('APPDATA') or _os.path.expanduser('~')
    WORKSPACE_DIR = _os.path.join(app_data_root, 'DevHunt', 'empty_workspace')
else:
    WORKSPACE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "empty_workspace")
    if os.path.basename(os.path.dirname(WORKSPACE_DIR)) == 'backend':
        WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(WORKSPACE_DIR), "..", "empty_workspace"))

if not os.path.exists(WORKSPACE_DIR):
    os.makedirs(WORKSPACE_DIR, exist_ok=True)

def get_project_tree(root_dir):
    ignored_dirs = {'.git', 'venv', '.vscode', '__pycache__', 'node_modules', '.gemini'}
    ignored_files = {'.DS_Store', 'desktop.ini'}
    
    def walk(directory):
        tree = []
        try:
            for item in sorted(os.listdir(directory)):
                if item in ignored_dirs or item in ignored_files:
                    continue
                full_path = os.path.join(directory, item)
                rel_path = os.path.relpath(full_path, WORKSPACE_DIR)
                is_dir = os.path.isdir(full_path)
                
                node = {
                    "name": item,
                    "path": rel_path.replace('\\', '/'),
                    "isDir": is_dir
                }
                if is_dir:
                    node["children"] = walk(full_path)
                tree.append(node)
        except Exception:
            pass
        return tree
    return walk(root_dir)

@app.route('/api/ide/workspace', methods=['GET', 'POST'])
def ide_workspace():
    global WORKSPACE_DIR
    if request.method == 'GET':
        return jsonify({"success": True, "workspace": WORKSPACE_DIR})
    else:
        data = request.get_json() or {}
        new_path = data.get('path', '').strip()
        if not new_path:
            return jsonify({"success": False, "error": "Path required"}), 400
        if not os.path.exists(new_path) or not os.path.isdir(new_path):
            return jsonify({"success": False, "error": "Directory does not exist"}), 400
        
        WORKSPACE_DIR = os.path.abspath(new_path)
        logger.success("system", f"Workspace changed to: {WORKSPACE_DIR}")
        try:
            tree = get_project_tree(WORKSPACE_DIR)
            return jsonify({"success": True, "workspace": WORKSPACE_DIR, "files": tree})
        except Exception as e:
            return jsonify({"success": True, "workspace": WORKSPACE_DIR, "files": [], "warning": str(e)})

@app.route('/api/ide/files', methods=['GET'])
def ide_list_files():
    try:
        tree = get_project_tree(WORKSPACE_DIR)
        return jsonify({"success": True, "files": tree})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/ide/file', methods=['GET'])
def ide_read_file():
    rel_path = request.args.get('path', '').strip()
    if not rel_path:
        return jsonify({"success": False, "error": "Path required"}), 400
    
    # Secure path to prevent directory traversal
    abs_path = os.path.abspath(os.path.join(WORKSPACE_DIR, rel_path))
    if not abs_path.startswith(os.path.abspath(WORKSPACE_DIR)):
        return jsonify({"success": False, "error": "Access denied"}), 403
        
    if not os.path.exists(abs_path) or os.path.isdir(abs_path):
        return jsonify({"success": False, "error": "File not found"}), 404
        
    try:
        with open(abs_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        return jsonify({"success": True, "content": content, "path": rel_path})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/ide/file', methods=['POST'])
def ide_save_file():
    data = request.get_json() or {}
    rel_path = data.get('path', '').strip()
    content = data.get('content', '')
    
    if not rel_path:
        return jsonify({"success": False, "error": "Path required"}), 400
        
    # Secure path to prevent directory traversal
    abs_path = os.path.abspath(os.path.join(WORKSPACE_DIR, rel_path))
    if not abs_path.startswith(os.path.abspath(WORKSPACE_DIR)):
        return jsonify({"success": False, "error": "Access denied"}), 403
        
    try:
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(content)
        logger.success("system", f"IDE saved file: {rel_path}")
        return jsonify({"success": True, "message": "File saved successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ── ADVANCED IDE ENDPOINTS ───────────────────────────────────────────────────
@app.route('/api/ide/search', methods=['GET', 'POST'])
def ide_search_files():
    query = (request.args.get('query') or (request.get_json() or {}).get('query', '')).strip()
    is_case_sensitive = (request.args.get('case_sensitive') == 'true' or (request.get_json() or {}).get('case_sensitive') == True)
    is_whole_word = (request.args.get('whole_word') == 'true' or (request.get_json() or {}).get('whole_word') == True)
    is_regex = (request.args.get('regex') == 'true' or (request.get_json() or {}).get('regex') == True)

    if not query:
        return jsonify({"success": True, "results": []})
    
    results = []
    exclude_dirs = {'.git', 'node_modules', 'venv', 'backend/venv', '__pycache__', '.idea', '.vscode'}
    exclude_exts = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz', '.mp3', '.wav', '.ogg', '.pyc'}

    try:
        import re
        if is_regex:
            flags = 0 if is_case_sensitive else re.IGNORECASE
            try:
                pattern = re.compile(query, flags)
            except Exception as e:
                return jsonify({"success": False, "error": f"Invalid regex: {str(e)}"}), 400
        else:
            escaped = re.escape(query)
            if is_whole_word:
                escaped = rf'\b{escaped}\b'
            flags = 0 if is_case_sensitive else re.IGNORECASE
            pattern = re.compile(escaped, flags)

        for root, dirs, files in os.walk(WORKSPACE_DIR):
            dirs[:] = [d for d in dirs if d not in exclude_dirs and os.path.join(root, d) not in [os.path.join(WORKSPACE_DIR, 'backend', 'venv'), os.path.join(WORKSPACE_DIR, 'venv')]]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in exclude_exts:
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, WORKSPACE_DIR)
                
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                    for idx, line in enumerate(lines):
                        if pattern.search(line):
                            results.append({
                                "path": rel_path.replace('\\', '/'),
                                "line": idx + 1,
                                "content": line.strip()
                            })
                except Exception:
                    pass
        return jsonify({"success": True, "results": results})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/ide/replace', methods=['POST'])
def ide_replace_files():
    data = request.get_json() or {}
    query = data.get('query', '').strip()
    replace_term = data.get('replace', '')
    files_to_modify = data.get('files', [])
    is_case_sensitive = data.get('case_sensitive', False)
    is_whole_word = data.get('whole_word', False)
    is_regex = data.get('regex', False)

    if not query:
        return jsonify({"success": False, "error": "Query required"}), 400
        
    modified_count = 0
    try:
        import re
        if is_regex:
            flags = 0 if is_case_sensitive else re.IGNORECASE
            pattern = re.compile(query, flags)
        else:
            escaped = re.escape(query)
            if is_whole_word:
                escaped = rf'\b{escaped}\b'
            flags = 0 if is_case_sensitive else re.IGNORECASE
            pattern = re.compile(escaped, flags)

        paths = []
        if files_to_modify:
            paths = [os.path.abspath(os.path.join(WORKSPACE_DIR, p)) for p in files_to_modify]
        else:
            exclude_dirs = {'.git', 'node_modules', 'venv', '__pycache__', '.idea', '.vscode'}
            exclude_exts = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz', '.mp3', '.wav', '.ogg', '.pyc'}
            for root, dirs, files in os.walk(WORKSPACE_DIR):
                dirs[:] = [d for d in dirs if d not in exclude_dirs]
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in exclude_exts:
                        continue
                    full_path = os.path.join(root, file)
                    paths.append(full_path)
                    
        for abs_path in paths:
            if not abs_path.startswith(os.path.abspath(WORKSPACE_DIR)):
                continue
            if not os.path.exists(abs_path) or os.path.isdir(abs_path):
                continue
                
            try:
                with open(abs_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                if pattern.search(content):
                    if is_regex or is_whole_word:
                        new_content = pattern.sub(replace_term, content)
                    else:
                        if is_case_sensitive:
                            new_content = content.replace(query, replace_term)
                        else:
                            new_content = pattern.sub(replace_term, content)
                    
                    with open(abs_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    modified_count += 1
            except Exception:
                pass
                
        logger.success("system", f"IDE replaced '{query}' with '{replace_term}' in {modified_count} files")
        return jsonify({"success": True, "modified_count": modified_count})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/ide/gitdiff', methods=['GET'])
def ide_file_gitdiff():
    rel_path = request.args.get('path', '').strip()
    if not rel_path:
        return jsonify({"success": False, "error": "Path required"}), 400
        
    abs_path = os.path.abspath(os.path.join(WORKSPACE_DIR, rel_path))
    if not abs_path.startswith(os.path.abspath(WORKSPACE_DIR)):
        return jsonify({"success": False, "error": "Access denied"}), 403
        
    if not os.path.exists(abs_path):
        return jsonify({"success": True, "added": [], "modified": [], "deleted": []})
        
    try:
        import subprocess
        cmd = ["git", "diff", "-U0", "--", abs_path]
        res = subprocess.run(cmd, cwd=WORKSPACE_DIR, capture_output=True, text=True, errors='ignore')
        
        added_lines = []
        modified_lines = []
        deleted_lines = []
        
        if res.returncode == 0 and res.stdout:
            import re
            hunk_re = re.compile(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@')
            for line in res.stdout.splitlines():
                if line.startswith('@@'):
                    match = hunk_re.match(line)
                    if match:
                        old_start = int(match.group(1))
                        old_count = int(match.group(2)) if match.group(2) else (0 if ',0' in line.split()[1] else 1)
                        new_start = int(match.group(3))
                        new_count = int(match.group(4)) if match.group(4) else (0 if ',0' in line.split()[2] else 1)
                        
                        if old_count == 0:
                            for idx in range(new_start, new_start + new_count):
                                added_lines.append(idx)
                        elif new_count == 0:
                            deleted_lines.append(new_start)
                        else:
                            for idx in range(new_start, new_start + min(old_count, new_count)):
                                modified_lines.append(idx)
                            if new_count > old_count:
                                for idx in range(new_start + old_count, new_start + new_count):
                                    added_lines.append(idx)
                                    
        return jsonify({
            "success": True,
            "added": added_lines,
            "modified": modified_lines,
            "deleted": deleted_lines
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/ide/create', methods=['POST'])
def ide_create_item():
    data = request.get_json() or {}
    rel_path = data.get('path', '').strip()
    item_type = data.get('type', 'file')
    if not rel_path:
        return jsonify({"success": False, "error": "Path required"}), 400
    abs_path = os.path.abspath(os.path.join(WORKSPACE_DIR, rel_path))
    if not abs_path.startswith(os.path.abspath(WORKSPACE_DIR)):
        return jsonify({"success": False, "error": "Access denied"}), 403
    try:
        if item_type == 'directory':
            os.makedirs(abs_path, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            with open(abs_path, 'w', encoding='utf-8') as f:
                f.write('')
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/ide/delete', methods=['POST'])
def ide_delete_item():
    data = request.get_json() or {}
    rel_path = data.get('path', '').strip()
    if not rel_path:
        return jsonify({"success": False, "error": "Path required"}), 400
    abs_path = os.path.abspath(os.path.join(WORKSPACE_DIR, rel_path))
    if not abs_path.startswith(os.path.abspath(WORKSPACE_DIR)):
        return jsonify({"success": False, "error": "Access denied"}), 403
    try:
        if os.path.isdir(abs_path):
            import shutil
            shutil.rmtree(abs_path)
        else:
            os.remove(abs_path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/ide/rename', methods=['POST'])
def ide_rename_item():
    data = request.get_json() or {}
    old_path = data.get('old_path', '').strip()
    new_path = data.get('new_path', '').strip()
    if not old_path or not new_path:
        return jsonify({"success": False, "error": "Paths required"}), 400
    abs_old = os.path.abspath(os.path.join(WORKSPACE_DIR, old_path))
    abs_new = os.path.abspath(os.path.join(WORKSPACE_DIR, new_path))
    if not abs_old.startswith(os.path.abspath(WORKSPACE_DIR)) or not abs_new.startswith(os.path.abspath(WORKSPACE_DIR)):
        return jsonify({"success": False, "error": "Access denied"}), 403
    try:
        os.rename(abs_old, abs_new)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ── ENTRY POINT ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=1225)
    parser.add_argument('--token', type=str, default=None)
    args, unknown = parser.parse_known_args()
    
    if args.token:
        API_TOKEN = args.token
    
    if API_TOKEN:
        logger.info("system", f"Secure API token authentication enabled (ends with ...{API_TOKEN[-4:] if len(API_TOKEN) > 4 else ''})")
    else:
        logger.warn("system", "Running without secure API token authentication.")
        
    logger.info("system", f"DevHunt server starting on host 127.0.0.1, port {args.port}")
    app.run(host='127.0.0.1', port=args.port, debug=not _is_frozen)
