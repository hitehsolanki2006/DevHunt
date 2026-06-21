import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from './CodeEditor';
import { Terminal, Save, X, RefreshCw, Plus, Search, Check, FolderOpen } from 'lucide-react';
import { getFileIcon } from '../../utils/iconTheme.jsx';

export default function IDEWorkspace({ 
  theme, 
  activeFilePath, 
  setActiveFilePath, 
  fileContent, 
  setFileContent,
  refreshFileTree,
  openTabs,
  setOpenTabs,
  expandedDirs,
  setExpandedDirs,
  showNewFileInput,
  setShowNewFileInput,
  outlineSymbols,
  setOutlineSymbols,
  profileSettings,
  terminalCwd,
  setTerminalCwd,
  terminalHistory,
  setTerminalHistory,
  wordWrap,
  setWordWrap,
  iconTheme
}) {
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([
    { text: 'DevHunt Integrated Terminal v1.0', type: 'cyan' },
    { text: '----------------------------------------------------------------------------------------------------', type: 'muted' },
    { text: '💡 Tip: Drag files from Explorer sidebar → drop here to paste path  |  Type: open &lt;file&gt; to open in editor', type: 'muted' }
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistoryIdx, setTerminalHistoryIdx] = useState(-1);
  const [saveStatus, setSaveStatus] = useState('Save File (Ctrl+S)');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Floating Find Widget State
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  
  const terminalBodyRef = useRef(null);

  useEffect(() => {
    if (activeFilePath && fileContent !== undefined) {
      scanSymbols(fileContent, activeFilePath);
    } else {
      setOutlineSymbols([]);
    }
  }, [activeFilePath, fileContent]);

  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const scanSymbols = (content, filepath) => {
    if (!content) {
      setOutlineSymbols([]);
      return;
    }
    const ext = filepath.split('.').pop().toLowerCase();
    const lines = content.split('\n');
    const symbols = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (ext === 'py') {
        if (trimmed.startsWith('def ') || trimmed.startsWith('class ')) {
          const type = trimmed.startsWith('class ') ? 'class' : 'method';
          const parts = trimmed.split(' ');
          if (parts.length > 1) {
            const name = parts[1].split('(')[0].split(':')[0];
            symbols.push({ name, line: idx + 1, type });
          }
        }
      } else if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx') {
        if (trimmed.startsWith('function ') || trimmed.startsWith('class ') || trimmed.includes(' = () =>') || trimmed.includes(' = function(')) {
          let name = '';
          let type = 'method';
          if (trimmed.startsWith('function ')) {
            const parts = trimmed.split(' ');
            if (parts.length > 1) name = parts[1].split('(')[0];
          } else if (trimmed.startsWith('class ')) {
            const parts = trimmed.split(' ');
            if (parts.length > 1) {
              name = parts[1].split('{')[0].trim();
              type = 'class';
            }
          } else {
            name = trimmed.split(/[ =]/)[0];
          }
          if (name) symbols.push({ name, line: idx + 1, type });
        }
      } else if (ext === 'md' || ext === 'markdown') {
        if (trimmed.startsWith('#')) {
          const m = trimmed.match(/^#+/);
          if (m) {
            const level = m[0].length;
            const name = trimmed.replace(/^#+/, '').trim();
            symbols.push({ name, line: idx + 1, type: 'heading', level });
          }
        }
      } else if (ext === 'html') {
        if (trimmed.startsWith('<div') && trimmed.includes('id=')) {
          const idMatch = trimmed.match(/id=["']([^"']+)["']/);
          if (idMatch) {
            symbols.push({ name: '#' + idMatch[1], line: idx + 1, type: 'element' });
          }
        }
      }
    });

    setOutlineSymbols(symbols);
  };

  const handleSelectTab = (path) => {
    // Open in editor
    openFile(path);
  };

  const openFile = async (path) => {
    // Check draft first
    const draft = localStorage.getItem(`devhunt_draft_${path}`);
    if (draft !== null) {
      setActiveFilePath(path);
      setFileContent(draft);
      if (!openTabs.includes(path)) {
        setOpenTabs(prev => [...prev, path]);
      }
      return;
    }

    if (path.startsWith('Untitled-')) {
      setActiveFilePath(path);
      setFileContent('');
      if (!openTabs.includes(path)) {
        setOpenTabs(prev => [...prev, path]);
      }
      return;
    }

    try {
      const res = await fetch(`/api/ide/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.success) {
        setActiveFilePath(path);
        setFileContent(data.content);
        if (!openTabs.includes(path)) {
          setOpenTabs(prev => [...prev, path]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseTab = (path, e) => {
    e.stopPropagation();
    
    // Check if there are unsaved changes
    const draft = localStorage.getItem(`devhunt_draft_${path}`);
    if (draft !== null) {
      const confirmClose = window.confirm(`File "${path}" has unsaved changes. Do you want to close it anyway?`);
      if (!confirmClose) return;
    }
    
    // Remove draft on close
    localStorage.removeItem(`devhunt_draft_${path}`);

    const newTabs = openTabs.filter(t => t !== path);
    setOpenTabs(newTabs);

    if (activeFilePath === path) {
      if (newTabs.length > 0) {
        handleSelectTab(newTabs[newTabs.length - 1]);
      } else {
        setActiveFilePath(null);
        setFileContent('');
      }
    }
  };

  const handleSave = async () => {
    if (!activeFilePath || isSaving) return;

    let targetPath = activeFilePath;
    const isUntitled = activeFilePath.startsWith('Untitled-');
    
    if (isUntitled) {
      const promptName = prompt('Enter file path to save as (relative to workspace root, e.g. src/index.js):');
      if (!promptName) return;
      targetPath = promptName.trim();
    }

    setIsSaving(true);
    setSaveStatus('Saving...');

    try {
      const res = await fetch('/api/ide/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: targetPath,
          content: fileContent
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('✓ Saved');
        
        // Remove draft of old file
        localStorage.removeItem(`devhunt_draft_${activeFilePath}`);

        if (isUntitled) {
          setOpenTabs(prev => {
            const updated = prev.map(t => t === activeFilePath ? targetPath : t);
            localStorage.setItem('devhunt_open_tabs', JSON.stringify(updated));
            return updated;
          });
          setActiveFilePath(targetPath);
        }
        
        refreshFileTree();
        
        setTimeout(() => {
          setSaveStatus('Save File (Ctrl+S)');
          setIsSaving(false);
        }, 1500);
      } else {
        alert(`Failed to save: ${data.error}`);
        setSaveStatus('Error');
        setIsSaving(false);
      }
    } catch (err) {
      console.error(err);
      alert('Connection error saving file');
      setSaveStatus('Error');
      setIsSaving(false);
    }
  };

  const handleFormatDocument = () => {
    if (!activeFilePath || !fileContent) return;
    const ext = activeFilePath.split('.').pop().toLowerCase();
    let formatted = fileContent;
    try {
      if (ext === 'json') {
        const parsed = JSON.parse(fileContent);
        formatted = JSON.stringify(parsed, null, 2);
      } else if (['js', 'jsx', 'ts', 'tsx', 'css', 'html'].includes(ext)) {
        const lines = fileContent.split('\n');
        let indentLevel = 0;
        const indentString = '  ';
        const formattedLines = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          
          const startsWithClosing = /^[}\]>]|^<\/|^else/.test(trimmed);
          if (startsWithClosing && indentLevel > 0) {
            indentLevel--;
          }
          
          const currentIndent = indentString.repeat(indentLevel);
          
          const openBraces = (trimmed.match(/[{[(]/g) || []).length;
          const closeBraces = (trimmed.match(/[}\right)]/g) || []).length;
          
          const openTags = (trimmed.match(/<[a-zA-Z0-9\-]+(?:\s+[^>]*[^/>])?>/g) || []).length;
          const closeTags = (trimmed.match(/<\/[a-zA-Z0-9\-]+>/g) || []).length;
          
          const netBraces = openBraces - closeBraces;
          const netTags = openTags - closeTags;
          
          indentLevel = Math.max(0, indentLevel + netBraces + netTags);
          return currentIndent + trimmed;
        });
        formatted = formattedLines.join('\n');
      }
      setFileContent(formatted);
    } catch (err) {
      console.error('Format document error:', err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFormatDocument();
      }
    };

    const handleSaveEvent = () => {
      handleSave();
    };

    const handleFormatEvent = () => {
      handleFormatDocument();
    };

    // Handle open-file events dispatched from terminal `open <path>` command
    const handleOpenFileEvent = (e) => {
      const path = e.detail?.path;
      if (path) {
        openFile(path);
        // Also make the IDE tab visible if terminal is covering it
        setShowTerminal(false);
        setTimeout(() => setShowTerminal(true), 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('devhunt-save-file', handleSaveEvent);
    window.addEventListener('devhunt-format-document', handleFormatEvent);
    window.addEventListener('devhunt-open-file', handleOpenFileEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('devhunt-save-file', handleSaveEvent);
      window.removeEventListener('devhunt-format-document', handleFormatEvent);
      window.removeEventListener('devhunt-open-file', handleOpenFileEvent);
    };
  }, [activeFilePath, fileContent, isSaving]);

  const playTerminalBeep = (enabled) => {
    if (enabled === false) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('AudioContext beep failed:', e);
    }
  };

  const mdEscape = (src) => {
    if (!src) return "";
    return src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  const formatPrompt = (cwd, settings) => {
    const username = settings?.terminal_username || 'guest';
    const hostname = settings?.terminal_hostname || 'devhunt';
    const symbol = settings?.terminal_prompt_symbol || '$';
    
    let displayCwd = cwd || '';
    const rootIndex = displayCwd.indexOf("DevHunt");
    if (rootIndex !== -1) {
      const subPath = displayCwd.substring(rootIndex + 7).replace(/\\/g, '/');
      displayCwd = "~" + subPath;
    } else {
      const parts = displayCwd.split(/[\\/]/);
      displayCwd = parts[parts.length - 1] || displayCwd;
    }
    if (displayCwd.endsWith("/empty_workspace") || displayCwd === 'empty_workspace') {
      displayCwd = "~";
    }
    return `${username}@${hostname}:${displayCwd || '/'}${symbol}`;
  };

  const promptStr = formatPrompt(terminalCwd, profileSettings);
  const terminalInputRef = useRef(null);

  const handleTerminalKeyDown = async (e) => {
    if (e.key === 'Enter') {
      const command = terminalInput.trim();
      if (!command) return;

      // Add input line
      setTerminalOutput(prev => [...prev, { text: `<span class="terminal-prompt">${promptStr}</span> <span class="ansi-cyan">${mdEscape(command)}</span>`, type: 'prompt' }]);
      setTerminalHistory(prev => [command, ...prev]);
      setTerminalHistoryIdx(-1);
      setTerminalInput('');

      if (command === 'clear') {
        setTerminalOutput([]);
        return;
      }

      // ── Built-in: open / edit <filepath> ─────────────────────────────────────
      const openMatch = command.match(/^(?:open|edit)\s+(.+)$/);
      if (openMatch) {
        const filePath = openMatch[1].trim().replace(/["']/g, '');
        setTerminalOutput(prev => [...prev, {
          text: `<span class="ansi-cyan">📂 Opening <b>${mdEscape(filePath)}</b> in editor...</span>`,
          type: 'output'
        }]);
        // Trigger file open in editor via custom event
        window.dispatchEvent(new CustomEvent('devhunt-open-file', { detail: { path: filePath } }));
        return;
      }

      try {
        const res = await fetch('/api/terminal/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command, cwd: terminalCwd })
        });
        const data = await res.json();
        if (data.success) {
          if (data.output === "CLEAR_SIGNAL") {
            setTerminalOutput([]);
          } else {
            const lines = (data.output || '').split('\n');
            setTerminalOutput(prev => [
              ...prev,
              ...lines.map(l => ({ text: l, type: 'output' }))
            ]);
          }
          if (data.cwd) {
            setTerminalCwd(data.cwd);
          }
        } else {
          setTerminalOutput(prev => [...prev, { text: `<span class="ansi-red">Error: ${mdEscape(data.error || 'Command execution failed')}</span>`, type: 'error' }]);
          playTerminalBeep(profileSettings?.terminal_sound);
        }
      } catch (err) {
        console.error(err);
        setTerminalOutput(prev => [...prev, { text: '<span class="ansi-red">Network connection error executing command</span>', type: 'error' }]);
        playTerminalBeep(profileSettings?.terminal_sound);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (terminalHistory.length === 0) return;
      const ni = Math.min(terminalHistoryIdx + 1, terminalHistory.length - 1);
      setTerminalHistoryIdx(ni);
      setTerminalInput(terminalHistory[ni] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const ni = Math.max(terminalHistoryIdx - 1, -1);
      setTerminalHistoryIdx(ni);
      setTerminalInput(ni === -1 ? '' : terminalHistory[ni]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const val = terminalInput;
      const HUNT_COMMANDS = [
        "open", "edit",
        "hunt help", "hunt neofetch", "hunt pwd", "hunt ls", "hunt cd",
        "hunt cat", "hunt mkdir", "hunt rm", "hunt ping", "hunt dns",
        "hunt dig", "hunt whois", "hunt ssl", "hunt headers", "hunt port",
        "hunt portscan", "hunt localports", "hunt myip", "hunt trace",
        "hunt subdomains", "hunt git", "hunt python", "hunt calc",
        "hunt quest", "hunt keys", "hunt memory", "hunt backup", "hunt history", "hunt stats", "hunt notifications", "hunt config", "hunt shortcut",
        "clear"
      ];
      if (!val) {
        setTerminalOutput(prev => [...prev, { text: `<span class="ansi-muted">Possible commands:<br/>  ${HUNT_COMMANDS.join('    ')}</span>`, type: 'output' }]);
        return;
      }
      const matches = HUNT_COMMANDS.filter(c => c.startsWith(val.toLowerCase()));
      if (matches.length === 1) {
        setTerminalInput(matches[0] + " ");
      } else if (matches.length > 1) {
        // Calculate longest common prefix
        let lcp = matches[0];
        for (let i = 1; i < matches.length; i++) {
          let j = 0;
          while (j < lcp.length && j < matches[i].length && lcp[j] === matches[i][j]) {
            j++;
          }
          lcp = lcp.slice(0, j);
        }
        if (lcp.length > val.length) {
          setTerminalInput(lcp);
        } else {
          setTerminalOutput(prev => [...prev, { text: `<span class="ansi-muted">Possible commands:<br/>  ${matches.join('    ')}</span>`, type: 'output' }]);
        }
      }
    }
  };

  return (
    <div className="editor-workspace" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Editor Tabs Bar */}
      <div className="editor-tabs-bar" style={{ display: 'flex', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', overflowX: 'auto', height: '35px', flexShrink: 0 }}>
        {openTabs.map(path => {
          const filename = path.split('/').pop();
          const isActive = path === activeFilePath;
          const icon = getFileIcon(filename, iconTheme);
          const hasDraft = localStorage.getItem(`devhunt_draft_${path}`) !== null;
          return (
            <div 
              key={path}
              className={`tab-item ${isActive ? 'active' : ''}`} 
              onClick={() => handleSelectTab(path)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '100%', padding: '0 12px', borderRight: '1px solid var(--border)', cursor: 'pointer', fontSize: '11.5px', userSelect: 'none' }}
            >
              <span className="file-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                {icon}
              </span>
              <span>{filename}</span>
              {hasDraft && <span style={{ color: '#f59e0b', fontSize: '12px', marginLeft: '2px' }} title="Unsaved changes">●</span>}
              <X 
                size={12} 
                className="editor-tab-close" 
                onClick={(e) => handleCloseTab(path, e)}
                style={{ marginLeft: '4px', cursor: 'pointer', color: 'var(--muted)' }}
              />
            </div>
          );
        })}
      </div>

      {/* Editor Header Control Bar */}
      <div className="editor-header-bar" style={{ height: '32px', display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', fontSize: '11px', flexShrink: 0 }}>
        <span className="active-file-path" style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
          {activeFilePath || '// Select a file from the explorer sidebar to begin editing'}
        </span>
        
        {activeFilePath && (
          <>
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={isSaving}
              style={{ padding: '4px 10px', fontSize: '10px', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Save size={12} />
              {saveStatus}
            </button>
            
            <button 
              className="btn-ghost" 
              onClick={() => setWordWrap(!wordWrap)}
              style={{ padding: '4px 10px', fontSize: '10px', marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px', borderColor: wordWrap ? 'var(--green)' : 'rgba(255,255,255,0.15)', color: wordWrap ? 'var(--green)' : 'inherit' }}
              title="Toggle Word Wrap (Alt+Z)"
            >
              <span>{wordWrap ? 'Wrap: On' : 'Wrap: Off'}</span>
            </button>

            <button 
              className="btn-ghost" 
              onClick={() => setShowTerminal(!showTerminal)}
              style={{ padding: '4px 10px', fontSize: '10px', marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Terminal size={12} />
              📟 Terminal
            </button>
          </>
        )}
      </div>

      {/* Main Code Editing Canvas */}
      <div className="editor-container-inner" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <CodeEditor 
          fileContent={fileContent}
          activeFile={activeFilePath}
          onChange={setFileContent}
          theme={theme}
          readOnly={!activeFilePath}
          wordWrap={wordWrap}
        />
      </div>

      {/* Embedded Integrated Terminal Panel */}
      {showTerminal && (
        <div 
          className="editor-bottom-terminal" 
          style={{ display: 'flex', height: '240px', borderTop: '1px solid var(--border)', flexDirection: 'column', flexShrink: 0 }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOver(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const filePath = e.dataTransfer.getData('devhunt/filepath') || e.dataTransfer.getData('text/plain');
            if (filePath) {
              setTerminalInput(prev => prev + '"' + filePath + '"');
              setTerminalOutput(prev => [...prev, {
                text: `<span class="ansi-muted">📌 Dropped: <b>${mdEscape(filePath)}</b> — path pasted into input. Press Enter or type <b>open "${mdEscape(filePath)}"</b> to open in editor.</span>`,
                type: 'output'
              }]);
              setTimeout(() => terminalInputRef.current?.focus(), 50);
            }
          }}
        >
          <div 
            className="editor-terminal-header" 
            style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: isDragOver ? 'rgba(0,212,170,0.12)' : 'var(--bg-2)', borderBottom: '1px solid var(--border)', fontSize: '11px', transition: 'background 0.15s' }}
          >
            <span style={{ fontWeight: 'bold', color: isDragOver ? 'var(--green)' : 'var(--accent)' }}>
              {isDragOver ? '📂 Drop to paste file path...' : '📟 INTEGRATED TERMINAL'}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-ghost" 
                onClick={() => setTerminalOutput([])}
                style={{ padding: '2px 6px', fontSize: '9.5px', borderColor: 'rgba(255,255,255,0.15)' }}
              >
                Clear
              </button>
              <button 
                className="btn-ghost" 
                onClick={() => setShowTerminal(false)}
                style={{ padding: '2px 6px', fontSize: '9.5px', color: 'var(--red)', borderColor: 'rgba(255,77,109,0.25)' }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div 
            className="terminal-body" 
            ref={terminalBodyRef}
            onClick={() => terminalInputRef.current?.focus()}
            style={{ 
              flex: 1, overflowY: 'auto', padding: '10px', fontFamily: 'var(--mono)', fontSize: '11.5px', 
              lineHeight: '1.4', background: isDragOver ? '#0f1a16' : '#0c0f12', color: '#fff', 
              textAlign: 'left', cursor: 'text',
              boxShadow: isDragOver ? 'inset 0 0 0 2px rgba(0,212,170,0.5)' : 'none',
              transition: 'background 0.15s, box-shadow 0.15s'
            }}
          >
            <div className="terminal-output">
              {terminalOutput.map((l, i) => {
                let colorClass = 'ansi-white';
                if (l.type === 'cyan') colorClass = 'ansi-cyan';
                if (l.type === 'muted') colorClass = 'ansi-muted';
                if (l.type === 'error') colorClass = 'ansi-red';
                if (l.type === 'prompt') colorClass = 'ansi-green';
                
                return (
                  <div 
                    key={i} 
                    className={`terminal-line ${colorClass}`}
                    dangerouslySetInnerHTML={{ __html: l.text }}
                  />
                );
              })}
            </div>
            <div className="terminal-input-line" style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
              <span className="terminal-prompt" style={{ color: 'var(--green)', fontWeight: 'bold' }}>{promptStr}</span>
              <input 
                ref={terminalInputRef}
                type="text" 
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleTerminalKeyDown}
                className="terminal-input" 
                autocomplete="off" 
                spellcheck="false" 
                placeholder="Enter command..." 
                style={{ flex: 1, border: 'none', background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', outline: 'none', marginLeft: '6px', padding: '0' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
