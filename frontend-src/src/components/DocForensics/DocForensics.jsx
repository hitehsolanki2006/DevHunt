import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Play, RefreshCw, Send, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

// Simple custom Markdown parser that matches original styling rules
function parseMarkdown(text) {
  if (!text) return '';
  
  // Escape/sanitize HTML
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
  
  // Callouts
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
  
  // Wrap list items in <ul>
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
  
  // Paragraph splits
  html = html.replace(/\n\n/g, '<br/><br/>');
  
  return html;
}

export default function DocForensics() {
  const [sources, setSources] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [report, setReport] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  
  // Contrast state for ELA
  const [elaContrast, setElaContrast] = useState(1.0);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreamingText, setChatStreamingText] = useState('');
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const chatFeedRef = useRef(null);

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [chatMessages, chatStreamingText]);

  const loadSources = async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      if (data.success) {
        // Show only PDFs and Images for forensics, or let everything show
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error('Failed to load forensics sources', err);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setUploadStatus('Document uploaded successfully!');
        loadSources();
        // Automatically select and run forensics on this newly uploaded doc
        const sourceId = data.source_id;
        handleSelectDoc({ id: sourceId, name: file.name });
      } else {
        setUploadStatus(`Upload failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setUploadStatus('Connection error uploading file');
    }
    setTimeout(() => setUploadStatus(''), 4000);
  };

  const handleSelectDoc = async (source) => {
    setActiveDoc(source);
    setReport(null);
    setChatMessages([]);
    setElaContrast(1.0);
    
    // Load historical scan if exists
    setIsAnalyzing(true);
    setAnalysisStatus('Reading database records...');
    try {
      const res = await fetch(`/api/knowledge/${source.id}/analysis`);
      const data = await res.json();
      if (data.success && data.analyzed) {
        setReport(data);
        setIsAnalyzing(false);
        loadChatHistory(source.id, source.name);
      } else {
        // Run analysis if not already analyzed
        runAnalysis(source.id, source.name);
      }
    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
    }
  };

  const runAnalysis = async (sourceId, name) => {
    setIsAnalyzing(true);
    setAnalysisStatus('Orchestrating Forensic Agents...');
    try {
      const res = await fetch(`/api/knowledge/${sourceId}/analyze`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisStatus('Fetching report details...');
        const resRep = await fetch(`/api/knowledge/${sourceId}/analysis`);
        const repData = await resRep.json();
        if (repData.success) {
          setReport(repData);
          loadSources(); // Refresh list to update analysis statuses
        } else {
          alert(`Analysis report retrieval failed: ${repData.error}`);
        }
      } else {
        alert(`Forensic analysis failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Forensics error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
      loadChatHistory(sourceId, name);
    }
  };

  const loadChatHistory = async (sourceId, name) => {
    const sessionId = `doc_forensics_${sourceId}`;
    try {
      const res = await fetch(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (data.success) {
        const history = data.history || [];
        if (history.length === 0) {
          setChatMessages([
            {
              role: 'assistant',
              content: `### Document Chat Active 🕵️‍♂️\nAsk me anything about **${name}**! I will use semantic context search inside this file.`,
              timestamp: new Date().toISOString()
            }
          ]);
        } else {
          setChatMessages(history);
        }
      }
    } catch (err) {
      console.error('Failed to load forensics chat history', err);
    }
  };

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || isChatStreaming || !activeDoc) return;

    const sessionId = `doc_forensics_${activeDoc.id}`;
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatStreaming(true);
    setChatStreamingText('');

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          source_id: activeDoc.id
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
                setChatStreamingText(fullReplyText);
              } else if (data.content) {
                fullReplyText += data.content;
                setChatStreamingText(fullReplyText);
              } else if (data.text) {
                fullReplyText += data.text;
                setChatStreamingText(fullReplyText);
              }
            } catch (e) {}
          }
        }
      }

      const assistantMsg = { role: 'assistant', content: fullReplyText, timestamp: new Date().toISOString() };
      setChatMessages(prev => [...prev, assistantMsg]);
      setChatStreamingText('');
      setIsChatStreaming(false);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Analyst stream failed: ${err.message}`, timestamp: new Date().toISOString() }]);
      setIsChatStreaming(false);
    }
  };

  const handleClearChat = async () => {
    if (!activeDoc || !confirm('Clear Q&A logs for this document forensics session?')) return;
    const sessionId = `doc_forensics_${activeDoc.id}`;
    try {
      const res = await fetch(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages([
          {
            role: 'assistant',
            content: `### History Cleared\nAsk me anything about this document.`,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSource = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this archive? This will wipe the scanned model data.')) return;
    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadSources();
        if (activeDoc && activeDoc.id === id) {
          setActiveDoc(null);
          setReport(null);
          setChatMessages([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const getVerdictStyle = (verdict, risk) => {
    if (risk === 'HIGH') return { color: 'var(--red)' };
    if (risk === 'MEDIUM') return { color: 'var(--amber)' };
    return { color: 'var(--green)' };
  };

  return (
    <div className="forensics-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', height: 'calc(100vh - 140px)', padding: '4px', textAlign: 'left' }}>
      
      {/* LEFT PANEL: Dropzone and Archive List */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflow: 'hidden' }}>
        <div className="card-head" style={{ marginBottom: 4 }}>
          <h3>Drop Document</h3>
        </div>
        
        <div 
          className={`dropzone ${isDragOver ? 'drag' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ padding: '24px 10px', flexShrink: 0, minHeight: '120px', cursor: 'pointer', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
        >
          <div className="dz-icon" style={{ fontSize: '26px', marginBottom: '4px', color: 'var(--accent)' }}>⇩</div>
          <div style={{ fontSize: '11px', textAlign: 'center' }}>
            Drop PDF or Image here<br />
            <span className="muted" style={{ fontSize: '10px' }}>or click to browse</span>
          </div>
          {uploadStatus && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{uploadStatus}</div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFileUpload(e.target.files?.[0])} 
            accept=".pdf,.png,.jpg,.jpeg" 
            hidden 
          />
        </div>

        <div className="card-head" style={{ marginTop: '10px', marginBottom: '4px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Forensics Archive</h3>
          <button className="btn-ghost" onClick={loadSources} style={{ padding: '4px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={10} /> Reload
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {sources.map(source => {
            const isActive = activeDoc && activeDoc.id === source.id;
            return (
              <div 
                key={source.id} 
                className={`card ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectDoc(source)}
                style={{ 
                  padding: '8px 12px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: isActive ? 'rgba(56,189,248,0.1)' : 'rgba(0,0,0,0.15)',
                  borderColor: isActive ? 'var(--accent)' : 'var(--border)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '500', color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{source.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{source.type.toUpperCase()} · Chunks: {source.chunk_count}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button 
                    onClick={(e) => handleDeleteSource(source.id, e)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', opacity: 0.7, padding: '4px' }}
                    title="Delete Archive"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
          {sources.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '20px 0', fontSize: '11px' }}>No records found</div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Report Dashboard and Chat side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '16px', height: '100%', overflow: 'hidden' }}>
        
        {/* REPORT DASHBOARD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '16px' }}>
          <div className="card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', flexShrink: 0, marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Forensic Scan Report</h2>
            <span className="badge" style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>
              {activeDoc ? activeDoc.name : 'No File Selected'}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Case A: Empty State */}
            {!activeDoc && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', animation: 'pulse 2s infinite' }}>🕵️‍♂️</div>
                <h3 style={{ fontFamily: 'var(--display)', color: 'var(--cyan)', marginBottom: '6px' }}>AI Forensic Inspector</h3>
                <p className="muted" style={{ maxWidth: '280px', fontSize: '11px', lineHeight: '1.45' }}>
                  Upload a file on the left panel to execute an agent-based authenticity sweep, ELA heatmaps, signature checks, and entity parsing.
                </p>
              </div>
            )}

            {/* Case B: Loading Loader */}
            {activeDoc && isAnalyzing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '40px 20px' }}>
                <div className="streaming-cursor" style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--cyan)' }}>▌</div>
                <h4 style={{ fontFamily: 'var(--mono)', color: 'var(--cyan)', marginBottom: '4px' }}>{analysisStatus}</h4>
                <p className="muted" style={{ maxWidth: '240px', fontSize: '10.5px', fontFamily: 'var(--mono)' }}>Contacting cognitive node...</p>
              </div>
            )}

            {/* Case C: Dashboard Content */}
            {activeDoc && !isAnalyzing && report && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Scores Verdict Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContext: 'space-between', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--muted)', letterSpacing: '1px', fontFamily: 'var(--mono)' }}>FORENSIC VERDICT</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: '14px', fontWeight: '700', marginTop: '1px', ...getVerdictStyle(report.verdict, report.risk_level) }}>
                      {report.verdict || 'UNKNOWN'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--muted)', letterSpacing: '1px', fontFamily: 'var(--mono)' }}>SECURITY SCORE</div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: '16px', color: '#ffffff', fontWeight: '700', marginTop: '1px' }}>
                      {(report.score || 0).toFixed(1)} <span style={{ fontSize: '10px', color: 'var(--muted)' }}>/ 100</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Image */}
                {report.dashboard_image && (
                  <div className="card" style={{ padding: '8px', background: 'rgba(0,0,0,0.15)', borderColor: 'var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent)', textAlign: 'left', marginBottom: '4px', fontFamily: 'var(--mono)' }}>FORENSIC CHART OVERVIEW</div>
                    <img 
                      src={`/api/analysis/image/${report.dashboard_image}?t=${Date.now()}`} 
                      alt="Forensic Analysis Chart" 
                      style={{ maxWidth: '100%', borderRadius: '4px', border: '1px solid var(--border)' }}
                    />
                  </div>
                )}

                {/* ELA Image with contrast slider */}
                {report.ela_image && (
                  <div className="card" style={{ padding: '8px', background: 'rgba(0,0,0,0.15)', borderColor: 'var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent)', textAlign: 'left', marginBottom: '4px', fontFamily: 'var(--mono)' }}>ERROR LEVEL ANALYSIS (ELA)</div>
                    <img 
                      src={`/api/analysis/image/${report.ela_image}?t=${Date.now()}`} 
                      alt="Error Level Heatmap" 
                      style={{ maxWidth: '100%', borderRadius: '4px', border: '1px solid var(--border)', filter: `brightness(${elaContrast})` }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '9.5px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                      <span>Contrast:</span>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="3.0" 
                        step="0.1" 
                        value={elaContrast} 
                        onChange={(e) => setElaContrast(parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--accent)' }} 
                      />
                      <span>{elaContrast.toFixed(1)}x</span>
                    </div>
                  </div>
                )}

                {/* AI Document Summary */}
                {report.report?.ai_analysis?.summary && (
                  <div className="card" style={{ padding: '10px', borderColor: 'var(--border)' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '4px', letterSpacing: '1px', fontFamily: 'var(--mono)' }}>AI DOCUMENT SUMMARY</div>
                    <div 
                      style={{ fontSize: '11px', lineHeight: '1.45', color: 'var(--text)' }}
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(report.report.ai_analysis.summary) }}
                    />
                  </div>
                )}

                {/* Forensics Expert View */}
                {report.report?.ai_analysis?.expert_view && (
                  <div className="card" style={{ padding: '10px', borderLeft: '3px solid var(--accent)', borderColor: 'var(--border)' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '4px', letterSpacing: '1px', fontFamily: 'var(--mono)' }}>FORENSICS EXPERT VIEW</div>
                    <div 
                      style={{ fontSize: '11px', lineHeight: '1.45', color: 'var(--text)', fontStyle: 'italic' }}
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(report.report.ai_analysis.expert_view) }}
                    />
                  </div>
                )}

                {/* Forensic Checklist */}
                {report.report?.authenticity?.layer_scores && (
                  <div className="card" style={{ padding: '10px', borderColor: 'var(--border)' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '6px', letterSpacing: '1px', fontFamily: 'var(--mono)' }}>FORENSIC CHECKLIST</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {Object.entries(report.report.authenticity.layer_scores).map(([layerName, layerScore]) => {
                        let icon = '✓';
                        let colorClass = 'pass';
                        if (layerScore < 60) {
                          icon = '✕';
                          colorClass = 'fail';
                        } else if (layerScore < 85) {
                          icon = '⚠';
                          colorClass = 'warning';
                        }

                        // Extract relevant flags
                        const layerFlags = report.report.flags ? report.report.flags.filter(f => {
                          const lLower = layerName.toLowerCase();
                          if (lLower.includes('metadata') && (f.toLowerCase().includes('meta') || f.toLowerCase().includes('save') || f.toLowerCase().includes('tool') || f.toLowerCase().includes('edit'))) return true;
                          if (lLower.includes('ela') && (f.toLowerCase().includes('ela') || f.toLowerCase().includes('tamper') || f.toLowerCase().includes('hotspot'))) return true;
                          if (lLower.includes('signature') && (f.toLowerCase().includes('sig') || f.toLowerCase().includes('pkcs') || f.toLowerCase().includes('unsigned'))) return true;
                          if (lLower.includes('text') && (f.toLowerCase().includes('aadhaar') || f.toLowerCase().includes('pan') || f.toLowerCase().includes('keyword') || f.toLowerCase().includes('administrative'))) return true;
                          if (lLower.includes('qr') && (f.toLowerCase().includes('qr') || f.toLowerCase().includes('domain') || f.toLowerCase().includes('code'))) return true;
                          return false;
                        }) : [];

                        return (
                          <div key={layerName} className="check-item-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div className="check-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                              <div className="check-item-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className={`check-item-icon ${colorClass}`} style={{ fontWeight: 'bold' }}>{icon}</span>
                                <span className="check-item-name" style={{ fontSize: '11px', fontWeight: '500' }}>{layerName}</span>
                              </div>
                              <span className="check-item-score" style={{ fontSize: '10.5px', fontFamily: 'var(--mono)' }}>{layerScore} / 100</span>
                            </div>
                            {layerFlags.length > 0 && (
                              <div className="check-item-flags" style={{ paddingLeft: '14px', fontSize: '10px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {layerFlags.map((f, i) => <span key={i}>• {f}</span>)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Extracted Entities */}
                {report.report?.ai_analysis?.entities && (
                  <div className="card" style={{ padding: '10px', borderColor: 'var(--border)' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '6px', letterSpacing: '1px', fontFamily: 'var(--mono)' }}>EXTRACTED ENTITIES</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10.5px', fontFamily: 'var(--mono)' }}>
                      {Object.entries(report.report.ai_analysis.entities).map(([cat, list]) => {
                        if (!list || list.length === 0) return null;
                        return (
                          <div key={cat} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--cyan)', width: '90px', textTransform: 'uppercase', fontWeight: 'bold' }}>{cat}:</span>
                            <span style={{ color: 'var(--text)', flex: 1 }}>{list.join(', ')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                {report.report?.ai_analysis?.insights && (
                  <div className="card" style={{ padding: '10px', borderColor: 'var(--border)' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '6px', letterSpacing: '1px', fontFamily: 'var(--mono)' }}>AI INSIGHTS &amp; ALERTS</div>
                    <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11px', color: 'var(--text)', lineHeight: '1.45', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {report.report.ai_analysis.insights.map((insight, i) => (
                        <li key={i}>{insight}</li>
                      ))}
                      {report.report.ai_analysis.insights.length === 0 && (
                        <li className="muted" style={{ fontStyle: 'italic' }}>// no AI insights generated</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Metadata Table */}
                {report.report?.extraction && (
                  <div className="card" style={{ padding: '10px', borderColor: 'var(--border)' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px', letterSpacing: '1px', fontFamily: 'var(--mono)' }}>FILE METADATA PROPERTIES</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: '10px', lineHeight: '1.45' }}>
                      <tbody>
                        <tr><td style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>Filename</td><td style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{report.report.file_name}</td></tr>
                        <tr><td style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>Format</td><td style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{report.report.file_type?.toUpperCase()}</td></tr>
                        <tr><td style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>Extract Method</td><td style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{report.report.extraction.method || 'N/A'}</td></tr>
                        <tr><td style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>Page Count</td><td style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{report.report.extraction.pages || 1}</td></tr>
                        <tr><td style={{ padding: '4px 0', color: 'var(--muted)' }}>Text Size</td><td style={{ padding: '4px 0', textAlign: 'right' }}>{report.report.extraction.text_length || 0} chars</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CHAT ANALYST */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '16px' }}>
          <div className="card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', flexShrink: 0, marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--display)', color: 'var(--accent)' }}>Document Chat Analyst</h3>
            <button 
              className="btn-ghost" 
              onClick={handleClearChat}
              disabled={!activeDoc}
              style={{ fontSize: '9.5px', color: 'var(--red)', borderColor: 'rgba(255,77,109,.3)', padding: '3px 6px' }}
            >
              ✕ Clear
            </button>
          </div>

          {/* Chat Messages Feed */}
          <div 
            ref={chatFeedRef}
            style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}
          >
            {chatMessages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', width: '100%' }}>
                  <div style={{ fontSize: '9.5px', color: 'var(--muted)', marginBottom: '3px', textAlign: isUser ? 'right' : 'left' }}>
                    {isUser ? '👤 You' : `🤖 Forensics Agent`}
                  </div>
                  <div 
                    style={{
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      lineHeight: '1.55',
                      border: '1px solid',
                      background: isUser ? 'rgba(56,189,248,.1)' : 'rgba(52,211,153,.05)',
                      borderColor: isUser ? 'rgba(56,189,248,.3)' : 'var(--border)'
                    }}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                  />
                </div>
              );
            })}
            
            {chatStreamingText && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                <div style={{ fontSize: '9.5px', color: 'var(--muted)', marginBottom: '3px' }}>
                  🤖 Forensics Agent (typing)
                </div>
                <div 
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    lineHeight: '1.55',
                    border: '1px solid var(--border)',
                    background: 'rgba(52,211,153,.05)'
                  }}
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(chatStreamingText) }}
                />
              </div>
            )}

            {!activeDoc && (
              <div className="muted" style={{ textAlign: 'center', padding: '40px', fontSize: '11px' }}>// Select or upload a file to start chat analysis</div>
            )}
          </div>

          {/* Chat Input row */}
          <div className="chat-input" style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', gap: '6px', flexShrink: 0, marginTop: 'auto' }}>
            <textarea 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSend();
                }
              }}
              placeholder={activeDoc ? "Ask anything about this document..." : "Select document first..."}
              disabled={!activeDoc || isChatStreaming}
              rows={2}
              style={{ flex: 1, resize: 'none', background: 'rgba(0,0,0,0.25)', fontSize: '11.5px', minHeight: '38px', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px' }}
            />
            <button 
              className="btn-primary"
              onClick={handleChatSend}
              disabled={!activeDoc || isChatStreaming || !chatInput.trim()}
              style={{ padding: '0 14px', fontSize: '10.5px', height: '38px' }}
            >
              SEND →
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
