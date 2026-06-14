import sqlite3
import os
from config import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create messages table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        role TEXT,           -- 'user' or 'assistant'
        content TEXT,
        model_used TEXT,
        key_used TEXT,       -- which key ID was used
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        tokens_used INTEGER DEFAULT 0
    )
    ''')
    
    # Create todos table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT,       -- 'high', 'medium', 'low'
        status TEXT,         -- 'pending', 'in_progress', 'done'
        due_date TEXT,
        tags TEXT,           -- JSON array
        source TEXT,         -- 'manual' or 'ai_detected'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
    )
    ''')
    
    # Create knowledge_sources table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS knowledge_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT,           -- 'pdf', 'url', 'text', 'note'
        path TEXT,
        status TEXT,         -- 'indexed', 'pending', 'error'
        chunk_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create knowledge_chunks table for lightweight vector search
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER,
        content TEXT,
        embedding TEXT,      -- JSON array of float embeddings
        metadata TEXT,       -- JSON metadata
        FOREIGN KEY(source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
    )
    ''')
    
    # Create analytics_events table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT,     -- 'question_asked', 'todo_completed', 'path_updated'
        topic TEXT,
        metadata TEXT,       -- JSON
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Create system_logs table for the logs page
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT,          -- 'INFO', 'WARN', 'ERROR', 'SUCCESS'
        category TEXT,       -- 'api_call', 'key_event', 'chat', 'rag', 'backup', 'system'
        message TEXT,
        metadata TEXT,       -- JSON: model, key_label, session_id, duration_ms, etc.
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Create user_memories table for consolidated long-term AI memory
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        consolidated_facts TEXT, -- JSON array of strings
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # Create document_analyses table for AI Document Intelligence reports
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS document_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER UNIQUE,
        final_score REAL,
        verdict TEXT,
        risk_level TEXT,
        report_json TEXT,
        ela_image_path TEXT,
        dashboard_image_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
    )
    ''')

    # Create linkedin_drafts table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS linkedin_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    conn.commit()
    conn.close()
