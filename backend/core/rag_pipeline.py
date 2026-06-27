import os
import re
import json
import requests
from bs4 import BeautifulSoup
import pypdf as PyPDF2
from google import genai
from google.genai import types
from core.db import get_db_connection
from core.key_manager import KeyManager

class RAGPipeline:
    def __init__(self, key_manager: KeyManager):
        self.key_manager = key_manager

    def get_embedding(self, text: str, is_query: bool = False) -> list:
        api_key, key_id = self.key_manager.get_active_key_string()
        if not api_key:
            raise Exception("No active Gemini API key found. Please add a key in Settings.")

        task_type = "RETRIEVAL_QUERY" if is_query else "RETRIEVAL_DOCUMENT"

        try:
            client = genai.Client(api_key=api_key)
            response = client.models.embed_content(
                model="gemini-embedding-2",
                contents=text,
                config=types.EmbedContentConfig(task_type=task_type)
            )
            self.key_manager.on_success(key_id)
            return response.embeddings[0].values
        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg or "ResourceExhausted" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                self.key_manager.on_rate_limit_error(key_id)
            else:
                self.key_manager.on_other_error(key_id)
            raise e

    def chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 150) -> list:
        # Simple character-based chunking with word boundary consideration
        sentences = re.split(r'(?<=[.?!])\s+', text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) < chunk_size:
                current_chunk += " " + sentence if current_chunk else sentence
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                # Start new chunk with overlap from end of current_chunk if possible
                words = current_chunk.split()
                overlap_words = words[-max(1, int(overlap/10)):] if len(words) > 10 else words
                overlap_text = " ".join(overlap_words)
                current_chunk = overlap_text + " " + sentence
        
        if current_chunk:
            chunks.append(current_chunk.strip())
            
        return chunks

    def index_text_content(self, name: str, source_type: str, content: str, path: str = None) -> int:
        """
        Chunks the content, embeds each chunk, and saves to SQLite.
        Returns the source_id.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Create knowledge source entry
            cursor.execute(
                "INSERT INTO knowledge_sources (name, type, path, status) VALUES (?, ?, ?, ?)",
                (name, source_type, path, 'pending')
            )
            source_id = cursor.lastrowid
            conn.commit()
            
            # Chunk and embed
            chunks = self.chunk_text(content)
            chunk_count = 0
            
            for index, chunk in enumerate(chunks):
                if not chunk.strip():
                    continue
                embedding = self.get_embedding(chunk, is_query=False)
                metadata = {"index": index, "source_name": name, "source_type": source_type}
                
                cursor.execute(
                    "INSERT INTO knowledge_chunks (source_id, content, embedding, metadata) VALUES (?, ?, ?, ?)",
                    (source_id, chunk, json.dumps(embedding), json.dumps(metadata))
                )
                chunk_count += 1
            
            # Update source status to indexed
            cursor.execute(
                "UPDATE knowledge_sources SET status = ?, chunk_count = ? WHERE id = ?",
                ('indexed', chunk_count, source_id)
            )
            conn.commit()
            return source_id
        except Exception as e:
            if 'source_id' in locals():
                cursor.execute("UPDATE knowledge_sources SET status = ? WHERE id = ?", ('error', source_id))
                conn.commit()
            raise e
        finally:
            conn.close()

    def is_safe_url(self, url: str) -> bool:
        from urllib.parse import urlparse
        import socket
        import ipaddress
        
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname
            if not hostname:
                return False
            # Resolve hostname to IP
            ip_address = socket.gethostbyname(hostname)
            ip = ipaddress.ip_address(ip_address)
            # Check if the IP is private, loopback, link-local, etc.
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                return False
            return True
        except Exception:
            return False

    def index_url(self, url: str) -> int:
        url = url.strip()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        if not self.is_safe_url(url):
            raise Exception("Access denied: Target URL resolves to a local or private network address.")

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.google.com/'
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
        except requests.exceptions.SSLError:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            response = requests.get(url, headers=headers, timeout=10, verify=False)
            response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
            
        text = soup.get_text(separator=' ')
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = '\n'.join(chunk for chunk in chunks if chunk)
        
        title = soup.title.string if soup.title else url
        return self.index_text_content(title.strip(), 'url', clean_text, path=url)

    def index_pdf(self, file_path: str, filename: str) -> int:
        with open(file_path, 'rb') as f:
            pdf = PyPDF2.PdfReader(f)
            text_content = []
            for page_num in range(len(pdf.pages)):
                page = pdf.pages[page_num]
                text = page.extract_text()
                if text:
                    text_content.append(text)
            
            full_text = "\n\n--- Page Break ---\n\n".join(text_content)
            
        if not full_text.strip():
            raise Exception("PDF appears to contain no text.")
            
        return self.index_text_content(filename, 'pdf', full_text, path=file_path)

    def search_similarity(self, query: str, top_k: int = 4, source_id: int = None) -> list:
        """
        Searches the local SQLite vector store using Cosine Similarity in Python.
        """
        # Get query embedding
        try:
            query_vector = self.get_embedding(query, is_query=True)
        except Exception:
            # If embedding fails (e.g. no API key or rate limit), return empty context
            return []

        conn = get_db_connection()
        cursor = conn.cursor()
        
        if source_id is not None:
            cursor.execute("SELECT id, source_id, content, embedding, metadata FROM knowledge_chunks WHERE source_id = ?", (source_id,))
        else:
            cursor.execute("SELECT id, source_id, content, embedding, metadata FROM knowledge_chunks")
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for row in rows:
            chunk_id = row['id']
            source_id = row['source_id']
            content = row['content']
            embedding_json = row['embedding']
            metadata_json = row['metadata']
            
            try:
                chunk_vector = json.loads(embedding_json)
                similarity = self.cosine_similarity(query_vector, chunk_vector)
                
                results.append({
                    "chunk_id": chunk_id,
                    "source_id": source_id,
                    "content": content,
                    "similarity": similarity,
                    "metadata": json.loads(metadata_json)
                })
            except Exception:
                continue
                
        # Sort by similarity descending
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:top_k]

    def cosine_similarity(self, v1: list, v2: list) -> float:
        dot_product = sum(x * y for x, y in zip(v1, v2))
        norm_v1 = sum(x * x for x in v1) ** 0.5
        norm_v2 = sum(y * y for y in v2) ** 0.5
        if not norm_v1 or not norm_v2:
            return 0.0
        return dot_product / (norm_v1 * norm_v2)

    def get_sources(self) -> list:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, type, path, status, chunk_count, created_at FROM knowledge_sources ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(r) for r in rows]

    def delete_source(self, source_id: int) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get path if file
        cursor.execute("SELECT type, path FROM knowledge_sources WHERE id = ?", (source_id,))
        row = cursor.fetchone()
        
        if row and row['type'] == 'pdf' and row['path'] and os.path.exists(row['path']):
            try:
                os.remove(row['path'])
            except Exception:
                pass
                
        cursor.execute("DELETE FROM knowledge_sources WHERE id = ?", (source_id,))
        cursor.execute("DELETE FROM knowledge_chunks WHERE source_id = ?", (source_id,)) # cascade delete chunk embeddings
        conn.commit()
        conn.close()
        return True
