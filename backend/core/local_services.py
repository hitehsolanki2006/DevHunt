import os
import json
import time
import sqlite3
import threading
from typing import Any
from datetime import datetime
from config import DATA_DIR
from core import logger

CACHE_DB_PATH = os.path.join(DATA_DIR, 'devhunt_cache.db')

class LocalCache:
    """
    Lightweight SQLite-backed cache manager. Requires zero external servers.
    """
    @staticmethod
    def _get_connection():
        conn = sqlite3.connect(CACHE_DB_PATH)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS cache_store (
                key TEXT PRIMARY KEY,
                value TEXT,
                expires_at REAL
            )
        ''')
        conn.commit()
        return conn

    @staticmethod
    def set(key: str, value: Any, expire_seconds: int = None) -> bool:
        try:
            conn = LocalCache._get_connection()
            expires_at = time.time() + expire_seconds if expire_seconds else None
            val_str = json.dumps(value)
            conn.execute('''
                INSERT OR REPLACE INTO cache_store (key, value, expires_at)
                VALUES (?, ?, ?)
            ''', (key, val_str, expires_at))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error("system", f"Failed to write cache for key {key}: {e}")
            return False

    @staticmethod
    def get(key: str) -> Any:
        try:
            conn = LocalCache._get_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT value, expires_at FROM cache_store WHERE key = ?', (key,))
            row = cursor.fetchone()
            if not row:
                conn.close()
                return None
            
            val_str, expires_at = row
            if expires_at and time.time() > expires_at:
                # Cache expired, delete it
                cursor.execute('DELETE FROM cache_store WHERE key = ?', (key,))
                conn.commit()
                conn.close()
                return None
            
            conn.close()
            return json.loads(val_str)
        except Exception as e:
            logger.error("system", f"Failed to read cache for key {key}: {e}")
            return None

    @staticmethod
    def delete(key: str) -> bool:
        try:
            conn = LocalCache._get_connection()
            conn.execute('DELETE FROM cache_store WHERE key = ?', (key,))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error("system", f"Failed to delete cache for key {key}: {e}")
            return False


class LocalQueue:
    """
    SQLite-backed local task queue. Perfect for managing background tasks.
    """
    @staticmethod
    def _get_connection():
        conn = sqlite3.connect(CACHE_DB_PATH)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS task_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_name TEXT,
                payload TEXT,
                status TEXT,
                created_at REAL,
                completed_at REAL,
                error_msg TEXT
            )
        ''')
        conn.commit()
        return conn

    @staticmethod
    def enqueue(task_name: str, payload: dict = None) -> int:
        try:
            conn = LocalQueue._get_connection()
            payload_str = json.dumps(payload or {})
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO task_queue (task_name, payload, status, created_at)
                VALUES (?, ?, 'pending', ?)
            ''', (task_name, payload_str, time.time()))
            conn.commit()
            task_id = cursor.lastrowid
            conn.close()
            logger.info("system", f"Enqueued background task '{task_name}' with ID {task_id}")
            return task_id
        except Exception as e:
            logger.error("system", f"Failed to enqueue task '{task_name}': {e}")
            return -1

    @staticmethod
    def get_task(task_id: int) -> dict:
        try:
            conn = LocalQueue._get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, task_name, payload, status, created_at, completed_at, error_msg 
                FROM task_queue WHERE id = ?
            ''', (task_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                return {
                    "id": row[0],
                    "task_name": row[1],
                    "payload": json.loads(row[2]),
                    "status": row[3],
                    "created_at": row[4],
                    "completed_at": row[5],
                    "error": row[6]
                }
            return None
        except Exception:
            return None


class TaskWorker(threading.Thread):
    """
    Background worker thread checking for pending SQLite queue jobs and processing them.
    """
    def __init__(self):
        super().__init__()
        self.daemon = True
        self.running = True
        self._registry = {} # maps task names to handler functions

    def register_handler(self, task_name: str, handler_func):
        self._registry[task_name] = handler_func

    def run(self):
        logger.info("system", "Starting background local services worker thread...")
        while self.running:
            try:
                conn = LocalQueue._get_connection()
                cursor = conn.cursor()
                # Find the oldest pending task
                cursor.execute('''
                    SELECT id, task_name, payload FROM task_queue 
                    WHERE status = 'pending' ORDER BY id ASC LIMIT 1
                ''')
                row = cursor.fetchone()
                
                if row:
                    task_id, task_name, payload_str = row
                    # Update status to processing
                    cursor.execute('UPDATE task_queue SET status = "processing" WHERE id = ?', (task_id,))
                    conn.commit()
                    conn.close()

                    payload = json.loads(payload_str)
                    logger.info("system", f"Worker picked up task ID {task_id} ('{task_name}')")

                    # Execute task handler
                    handler = self._registry.get(task_name)
                    error_msg = None
                    if handler:
                        try:
                            handler(payload)
                        except Exception as ex:
                            error_msg = str(ex)
                            logger.error("system", f"Error executing task ID {task_id}: {ex}")
                    else:
                        error_msg = f"No registered handler for task '{task_name}'"
                        logger.error("system", error_msg)

                    # Update database with completion status
                    status = "failed" if error_msg else "completed"
                    conn = LocalQueue._get_connection()
                    conn.execute('''
                        UPDATE task_queue 
                        SET status = ?, completed_at = ?, error_msg = ? 
                        WHERE id = ?
                    ''', (status, time.time(), error_msg, task_id))
                    conn.commit()
                    conn.close()
                    logger.info("system", f"Worker finished task ID {task_id} with status '{status}'")
                else:
                    conn.close()
                    
                time.sleep(2.0) # Poll every 2 seconds
            except Exception as e:
                logger.error("system", f"Background worker encountered main loop error: {e}")
                time.sleep(5.0)

    def stop(self):
        self.running = False
