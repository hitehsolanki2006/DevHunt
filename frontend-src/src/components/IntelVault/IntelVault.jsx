import React, { useState, useEffect, useRef } from 'react';
import { Upload, Link, AlignLeft, Shield, Trash2, ArrowLeft, RefreshCw, Send } from 'lucide-react';

export default function IntelVault() {
  const [sources, setSources] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Note inputs
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  
  // URL inputs
  const [urlInput, setUrlInput] = useState('');
  
  // Split Screen Viewer State
  const [activeDoc, setActiveDoc] = useState(null);
  const [docContent, setDocContent] = useState('');
  const [docChatMessages, setDocChatMessages] = useState([]);
  const [docChatInput, setDocChatInput] = useState('');
  const [docChatStreamingText, setDocChatStreamingText] = useState('');
  const [isDocChatStreaming, setIsDocChatStreaming] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const docChatFeedRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    if (docChatFeedRef.current) {
      docChatFeedRef.current.scrollTop = docChatFeedRef.current.scrollHeight;
    }
  }, [docChatMessages, docChatStreamingText]);

  const loadSources = async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      if (data.success) {
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error('Failed to load knowledge sources', err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus('Uploading...');
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('file', files[i]);
    }

    try {
      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setUploadStatus('Index created successfully!');
        loadSources();
      } else {
        setUploadStatus(`Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setUploadStatus('Connection error uploading file');
    }
    setTimeout(() => setUploadStatus(''), 4000);
  };

  const handleIndexUrl = async (e) => {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;

    try {
      const res = await fetch('/api/knowledge/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.success) {
        setUrlInput('');
        alert('URL successfully queued for RAG indexing!');
        loadSources();
      } else {
        alert(`Failed to index URL: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to indexer API');
    }
  };

  const handleSaveNote = async () => {
    const title = noteTitle.trim();
    const body = noteBody.trim();
    if (!title || !body) return;

    try {
      const res = await fetch('/api/knowledge/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: body })
      });
      const data = await res.json();
      if (data.success) {
        setNoteTitle('');
        setNoteBody('');
        alert('Note index created successfully!');
        loadSources();
      } else {
        alert(`Failed to save note: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save note');
    }
  };

  const handleDeleteSource = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this knowledge source? This will wipe all chunks.')) return;
    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadSources();
        if (activeDoc && activeDoc.id === id) {
          closeDocViewer();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openDocViewer = async (source) => {
    setActiveDoc(source);
    setDocContent('Loading document content...');
    setDocChatMessages([]);
    
    // Fetch document content
    try {
      const contentRes = await fetch(`/api/knowledge/${source.id}/content`);
      const contentData = await contentRes.json();
      if (contentData.success) {
        setDocContent(contentData.content || '// Empty document text');
      } else {
        setDocContent(`Error loading content: ${contentData.error}`);
      }
    } catch (err) {
      setDocContent('Connection failure loading document content');
    }

    // Load Chat History scoped to this document
    const docSessionId = `doc_chat_${source.id}`;
    try {
      const chatRes = await fetch(`/api/chat/history?session_id=${encodeURIComponent(docSessionId)}`);
      const chatData = await chatRes.json();
      if (chatData.success) {
        setDocChatMessages(chatData.history || []);
      }
    } catch (err) {
      console.error('Failed to load doc chat history', err);
    }
  };

  const closeDocViewer = () => {
    setActiveDoc(null);
    setDocContent('');
    setDocChatMessages([]);
  };

  const handleDocChatSend = async () => {
    const text = docChatInput.trim();
    if (!text || isDocChatStreaming || !activeDoc) return;

    const docSessionId = `doc_chat_${activeDoc.id}`;
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    
    setDocChatMessages(prev => [...prev, userMsg]);
    setDocChatInput('');
    setIsDocChatStreaming(true);
    setDocChatStreamingText('');

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: docSessionId,
          source_id: activeDoc.id // scope RAG strictly to this document
        })
      });

      if (!res.body) throw new Error('Streaming not supported');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReplyText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'error') {
                fullReplyText += `\nError: ${data.error}`;
                setDocChatStreamingText(fullReplyText);
              } else if (data.content) {
                fullReplyText += data.content;
                setDocChatStreamingText(fullReplyText);
              } else if (data.text) {
                fullReplyText += data.text;
                setDocChatStreamingText(fullReplyText);
              }
            } catch (e) {}
          }
        }
      }

      const assistantMsg = { role: 'assistant', content: fullReplyText, timestamp: new Date().toISOString() };
      setDocChatMessages(prev => [...prev, assistantMsg]);
      setDocChatStreamingText('');
      setIsDocChatStreaming(false);
    } catch (err) {
      console.error(err);
      setDocChatMessages(prev => [...prev, { role: 'assistant', content: `Analyst stream failed: ${err.message}`, timestamp: new Date().toISOString() }]);
      setIsDocChatStreaming(false);
    }
  };

  const handleClearDocChat = async () => {
    if (!activeDoc || !confirm('Clear Q&A logs for this document?')) return;
    const docSessionId = `doc_chat_${activeDoc.id}`;
    try {
      const res = await fetch(`/api/chat/history?session_id=${encodeURIComponent(docSessionId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setDocChatMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="intel-vault" style={{ height: '100%', overflowY: 'auto' }}>
      {!activeDoc ? (
        // 1. INTEL VAULT MAIN INDEX LIST
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="vault-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* FILE DROPZONE */}
            <div className="card" style={{ textAlign: 'left' }}>
              <div className="card-head">
                <h3>Drop Files</h3>
              </div>
              <div 
                className="dropzone" 
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{ border: '2px dashed var(--border)', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.15)' }}
              >
                <Upload size={24} className="muted" style={{ margin: '0 auto 8px auto' }} />
                <div>Click to Ingest PDF · TXT · MD<br /><span className="muted" style={{ fontSize: '10px' }}>Or select multiple files</span></div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  hidden 
                  multiple 
                  accept=".pdf,.txt,.md"
                />
              </div>
              {uploadStatus && <div style={{ fontSize: '11px', marginTop: '8px', color: 'var(--cyan)', textAlign: 'center' }}>{uploadStatus}</div>}
            </div>

            {/* URL INGEST */}
            <div className="card" style={{ textAlign: 'left' }}>
              <div className="card-head">
                <h3>Scrape URL</h3>
              </div>
              <form onSubmit={handleIndexUrl} className="form-row" style={{ display: 'flex', gap: '8px' }}>
                <input 
                  value={urlInput} 
                  onChange={(e) => setUrlInput(e.target.value)} 
                  placeholder="https://docs.example.com" 
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '6px 14px' }}>Index</button>
              </form>

              <div className="card-head" style={{ marginTop: '14px' }}>
                <h3>Custom Note</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  value={noteTitle} 
                  onChange={(e) => setNoteTitle(e.target.value)} 
                  placeholder="Note title..." 
                />
                <textarea 
                  value={noteBody} 
                  onChange={(e) => setNoteBody(e.target.value)} 
                  placeholder="Write text to index..." 
                  rows="3"
                />
                <button className="btn-primary" onClick={handleSaveNote}>Save Note</button>
              </div>
            </div>

            {/* SOURCES TABLE */}
            <div className="card vault-table-wrap" style={{ textAlign: 'left', gridColumn: 'span 2' }}>
              <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Indexed Sources</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter sources..."
                    style={{ padding: '4px 8px', fontSize: '11.5px', width: '160px' }}
                  />
                  <button className="btn-ghost" onClick={loadSources} title="Reload Sources" style={{ padding: '4px' }}>
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>NAME</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>TYPE</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>CHUNKS</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSources.map(s => (
                      <tr 
                        key={s.id} 
                        onClick={() => openDocViewer(s)}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                        className="vault-row"
                      >
                        <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--text)' }}>📄 {s.name}</td>
                        <td style={{ padding: '8px' }}><span className="tag tag-med" style={{ filter: 'grayscale(0.5)' }}>{s.type}</span></td>
                        <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--mono)' }}>{s.chunk_count}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => handleDeleteSource(s.id, e)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}
                            title="Delete Source"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredSources.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>
                          No knowledge sources found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 2. DOCUMENT ANALYST SPLIT SCREEN VIEW
        <div className="vault-viewer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: 'calc(100vh - 120px)' }}>
          {/* Left panel: raw document contents */}
          <div className="card doc-reader-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'left' }}>
            <div className="card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', margin: '0', color: 'var(--green)' }}>
                <ArrowLeft size={16} style={{ cursor: 'pointer' }} onClick={closeDocViewer} />
                Analyst Viewer: {activeDoc.name}
              </h2>
              <button className="btn-ghost" onClick={closeDocViewer} style={{ padding: '4px 8px', fontSize: '11px' }}>✕ Close Analyst</button>
            </div>
            <div 
              className="doc-viewer-body" 
              style={{ flex: 1, overflowY: 'auto', padding: '14px 0', fontFamily: 'var(--mono)', fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--text)' }}
            >
              {docContent}
            </div>
          </div>

          {/* Right panel: scope-grounded RAG analyst chat */}
          <div className="card doc-chat-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'left' }}>
            <div className="card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: '0', color: 'var(--cyan)' }}>Document Analyst Chat</h3>
              <button 
                className="btn-ghost" 
                onClick={handleClearDocChat}
                style={{ fontSize: '10px', color: 'var(--red)', borderColor: 'rgba(255,77,109,0.3)' }}
              >
                ✕ Clear Chat
              </button>
            </div>

            <div 
              className="doc-chat-feed" 
              ref={docChatFeedRef}
              style={{ flex: 1, overflowY: 'auto', padding: '14px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {docChatMessages.map((msg, i) => (
                <div key={i} className={`msg ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  <div>{msg.content}</div>
                </div>
              ))}
              {isDocChatStreaming && docChatStreamingText && (
                <div className="msg ai">
                  <div>{docChatStreamingText}</div>
                  <span className="streaming-cursor">█</span>
                </div>
              )}
              {docChatMessages.length === 0 && (
                <div className="muted" style={{ textAlign: 'center', margin: 'auto', fontStyle: 'italic' }}>
                  Ask questions scoped strictly to this document. RAG pipeline is grounded to this source.
                </div>
              )}
            </div>

            <div className="chat-input" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', gap: '8px', background: 'none' }}>
              <textarea 
                value={docChatInput}
                onChange={(e) => setDocChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleDocChatSend();
                  }
                }}
                placeholder="Ask anything about this document..."
                rows="2"
                style={{ flex: 1, resize: 'none', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px', fontSize: '12px', color: 'var(--text)' }}
              />
              <button 
                className="btn-primary" 
                onClick={handleDocChatSend}
                style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                disabled={isDocChatStreaming}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
