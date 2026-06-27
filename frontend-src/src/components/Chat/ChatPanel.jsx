import React, { useState, useEffect, useRef } from 'react';

// Simple custom Markdown parser that matches original styling rules
function parseMarkdown(text) {
  if (!text) return '';
  
  // Scap/sanitize HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="code-block language-${lang}"><code>${code.trim()}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Callouts (custom DevHunt syntax, e.g., [!] Warning or similar)
  html = html.replace(/\[!\]\s*(.*?)\n/g, '<div class="callout"><div class="callout-title">⚠️ WARNING</div>$1</div>');
  
  // Headings
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Lists
  html = html.replace(/^\*\s+(.*?)$/gm, '<li>$1</li>');
  html = html.replace(/^-\s+(.*?)$/gm, '<li>$1</li>');
  
  // Wrap list items in <ul> if they exist
  // A simple way to handle list grouping without full parsing libraries
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
  
  // Paragraph splits (double newlines)
  html = html.replace(/\n\n/g, '<br/><br/>');
  
  return html;
}

export default function ChatPanel({ theme, activeModel, activeKey, onAddQuest }) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState('default_session');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  const [allTodos, setAllTodos] = useState([]);
  const chatFeedRef = useRef(null);

  const loadQuests = async () => {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      if (data.success) {
        setAllTodos(data.todos || []);
      }
    } catch (err) {
      console.error('Failed to load quests in ChatPanel', err);
    }
  };

  useEffect(() => {
    loadSessions();
    loadHistory(activeSession);
    loadQuests();

    // Listen to custom refresh events
    window.addEventListener('devhunt-refresh-quests', loadQuests);
    return () => {
      window.removeEventListener('devhunt-refresh-quests', loadQuests);
    };
  }, []);

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load chat sessions', err);
    }
  };

  const loadHistory = async (sessionId) => {
    try {
      const res = await fetch(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.history || []);
        setActiveSession(sessionId);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    }
  };

  const createNewSession = () => {
    const newId = 'session_' + crypto.randomUUID();
    setActiveSession(newId);
    setMessages([]);
    setSessions(prev => [
      { session_id: newId, title: 'New Conversation', msg_count: 0, last_msg_time: new Date().toISOString() },
      ...prev
    ]);
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) return;
    try {
      const res = await fetch(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        if (activeSession === sessionId) {
          createNewSession();
        } else {
          loadSessions();
        }
      }
    } catch (err) {
      console.error('Delete session failed', err);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    // Add user message
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsStreaming(true);
    setStreamingText('');

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: activeSession
        })
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReplyText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Process SSE lines
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'error') {
                fullReplyText += `\nError: ${data.error}`;
                setStreamingText(fullReplyText);
              } else if (data.content) {
                fullReplyText += data.content;
                setStreamingText(fullReplyText);
              } else if (data.text) {
                fullReplyText += data.text;
                setStreamingText(fullReplyText);
              } else if (data.type === 'done') {
                if (data.todo_detected) {
                  window.dispatchEvent(new CustomEvent('devhunt-refresh-quests'));
                }
                if (data.linkedin_detected) {
                  window.dispatchEvent(new CustomEvent('devhunt-refresh-linkedin'));
                  alert(`✓ Added draft to LinkedIn: "${data.linkedin_detected.title || 'Untitled Post'}"`);
                }
              }
            } catch (e) {
              // Ignore parse errors on partial streams
            }
          }
        }
      }

      // Completed streaming
      const assistantMsg = { role: 'assistant', content: fullReplyText, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, assistantMsg]);
      setStreamingText('');
      setIsStreaming(false);
      loadSessions(); // refresh counts
      loadQuests(); // reload quests list
    } catch (err) {
      console.error('Streaming error', err);
      setMessages(prev => [...prev, { role: 'assistant', content: `Stream connection failed: ${err.message}`, timestamp: new Date().toISOString() }]);
      setIsStreaming(false);
    }
  };

  const handleQuestToggle = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        loadQuests();
        window.dispatchEvent(new CustomEvent('devhunt-refresh-quests'));
      }
    } catch (err) {
      console.error('Failed to toggle quest', err);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="mentor-grid" style={{ height: '100%', minHeight: '0' }}>
      {/* 1. COLLAPSIBLE CHAT HISTORY SIDEBAR */}
      <aside className={`card chat-history-sidebar ${showHistory ? '' : 'collapsed'}`}>
        <div 
          className="card-head" 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '8px' }}
        >
          <h3 style={{ fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--cyan)' }}>Chats</h3>
          <button 
            className="btn-primary" 
            onClick={createNewSession}
            style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}
          >
            + New
          </button>
        </div>
        
        <div className="history-sessions-list">
          {sessions.map(s => {
            const isActive = activeSession === s.session_id;
            return (
              <div 
                key={s.session_id} 
                className={`session-item ${isActive ? 'active' : ''}`}
                onClick={() => loadHistory(s.session_id)}
                style={{ textAlign: 'left' }}
              >
                <div className="session-title" title={s.title}>{s.title || 'Conversation'}</div>
                <div className="session-meta">
                  <span>💬 {s.msg_count} msgs</span>
                  <span>• {new Date(s.last_msg_time).toLocaleDateString()}</span>
                </div>
                <button 
                  className="session-delete-btn" 
                  onClick={(e) => deleteSession(s.session_id, e)}
                  title="Delete Chat"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* 2. MAIN CHAT AREA */}
      <div className="card chat" style={{ flex: '1', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0' }}>
        <div className="card-head">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className="btn-ghost" 
              onClick={() => setShowHistory(!showHistory)}
              style={{ padding: '4px 8px', fontSize: '11px' }}
              title="Toggle History Sidebar"
            >
              🕒 History
            </button>
            AI Assistant
          </h2>
          <div className="hud">
            <span className="hud-pill"><i className="dot dot-green"></i> RAG ACTIVE</span>
            <span className="hud-pill"><i className="dot dot-cyan"></i> GRAMMAR HELPER</span>
          </div>
        </div>

        {/* Chat Messages Feed */}
        <div className="chat-feed" id="chat-feed" ref={chatFeedRef} style={{ flex: '1', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((msg, i) => {
            let grammarTip = null;
            let content = msg.content;
            if (msg.role === 'assistant' || msg.role === 'ai') {
              const grammarMatch = content.match(/^>\s*\*Grammar Tip:\s*(.*?)\*\s*\n?/);
              if (grammarMatch) {
                grammarTip = grammarMatch[1];
                content = content.replace(/^>\s*\*Grammar Tip:\s*(.*?)\*\s*\n?/, '').trim();
              }
            }
            return (
              <div 
                key={i} 
                className={`msg ${msg.role === 'user' ? 'user' : 'ai'}`}
                style={{ textAlign: 'left' }}
              >
                {grammarTip && (
                  <div className="callout" style={{ marginBottom: '8px' }}>
                    <div className="callout-title">✎ GRAMMAR &amp; PHRASING TIP</div>
                    <i>{grammarTip}</i>
                  </div>
                )}
                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
                <span className="msg-time">{formatTime(msg.timestamp)}</span>
              </div>
            );
          })}
          
          {/* Stream chunk preview */}
          {isStreaming && streamingText && (() => {
            let grammarTip = null;
            let content = streamingText;
            const grammarMatch = content.match(/^>\s*\*Grammar Tip:\s*(.*?)\*\s*\n?/);
            if (grammarMatch) {
              grammarTip = grammarMatch[1];
              content = content.replace(/^>\s*\*Grammar Tip:\s*(.*?)\*\s*\n?/, '').trim();
            }
            return (
              <div className="msg ai" style={{ textAlign: 'left' }}>
                {grammarTip && (
                  <div className="callout" style={{ marginBottom: '8px' }}>
                    <div className="callout-title">✎ GRAMMAR &amp; PHRASING TIP</div>
                    <i>{grammarTip}</i>
                  </div>
                )}
                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
                <span className="streaming-cursor">█</span>
              </div>
            );
          })()}
        </div>

        {/* Input box */}
        <div className="chat-input" style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <textarea 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask the mentor anything... (markdown supported)"
            rows="1"
            spellCheck={true}
          />
          <button className="btn-primary" onClick={handleSend} disabled={isStreaming}>
            TRANSMIT →
          </button>
        </div>
      </div>

      {/* 3. TODAY TARGETS & QUESTS (Right Side Sidebar) */}
      <aside className="card chat-side" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: '0', overflowY: 'auto', textAlign: 'left' }}>
        <div className="card-head no-border">
          <h3>Today's Targets</h3>
        </div>
        <ul className="target-list" style={{ listStyle: 'none', padding: '0', margin: '0' }}>
          {allTodos.filter(t => t.status !== 'done' && t.priority.toLowerCase() === 'high').map((t) => (
            <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="tag tag-high">HIGH</span> 
              <span className="target-text" style={{ fontSize: '11.5px' }}>{t.title}</span>
            </li>
          ))}
          {allTodos.filter(t => t.status !== 'done' && t.priority.toLowerCase() === 'high').length === 0 && (
            <li className="muted" style={{ fontStyle: 'italic', fontSize: '11px' }}>No high targets pending</li>
          )}
        </ul>

        <div className="card-head no-border" style={{ marginTop: '12px' }}>
          <h3>Quick Quests</h3>
        </div>
        <ul className="quest-mini" style={{ listStyle: 'none', padding: '0', margin: '0' }}>
          {allTodos.filter(t => t.status !== 'done' && t.priority.toLowerCase() !== 'high').map(q => {
            const inputId = `quest-chk-${q.id}`;
            return (
              <li key={q.id} className="quest-mini-item" style={{ marginBottom: '6px' }}>
                <input 
                  id={inputId}
                  type="checkbox" 
                  checked={q.status === 'done'} 
                  onChange={() => handleQuestToggle(q.id, q.status)} 
                /> 
                <label htmlFor={inputId}>
                  <span className="checkbox-box"></span>
                  <span className="quest-mini-title">{q.title}</span>
                </label>
              </li>
            );
          })}
          {allTodos.filter(t => t.status !== 'done' && t.priority.toLowerCase() !== 'high').length === 0 && (
            <li className="muted" style={{ fontStyle: 'italic', fontSize: '11px' }}>No pending quests</li>
          )}
        </ul>
      </aside>
    </div>
  );
}
