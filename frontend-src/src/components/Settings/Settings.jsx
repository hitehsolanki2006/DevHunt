import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Key, Palette, Keyboard, 
  Brain, Terminal, RefreshCw, Download, Upload, AlertTriangle, 
  Play, Trash2 
} from 'lucide-react';

export default function Settings({ theme, setTheme, onRefreshHeader, setActiveTab, setNotificationsSubTab }) {
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [keysList, setKeysList] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  
  // Settings values
  const [sysFontFamily, setSysFontFamily] = useState('Inter');
  const [editorFontFamily, setEditorFontFamily] = useState('JetBrains Mono');
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [termFontFamily, setTermFontFamily] = useState('JetBrains Mono');
  const [termFontSize, setTermFontSize] = useState(13);
  
  const [termUser, setTermUser] = useState('guest');
  const [termHost, setTermHost] = useState('devhunt');
  const [termSymbol, setTermSymbol] = useState('$');
  const [termSound, setTermSound] = useState(true);
  
  const [englishCorrection, setEnglishCorrection] = useState(false);
  const [minimizeSidebar, setMinimizeSidebar] = useState(false);
  const [canvasParticles, setCanvasParticles] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [iconThemeSetting, setIconThemeSetting] = useState('emoji');
  const [featureToggles, setFeatureToggles] = useState({
    music: true,
    path: true,
    quests: true,
    vault: true,
    'doc-analysis': true,
    arcade: true,
    linkedin: true,
    search: true,
    stats: true,
    terminal: true,
    notifications: true
  });
  
  const [selectedModel, setSelectedModel] = useState('auto');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [systemPrompt, setSystemPrompt] = useState('');
  
  // AI Memory state
  const [memoryText, setMemoryText] = useState('');
  const [memoryStatus, setMemoryStatus] = useState('');
  
  // Shortcuts state
  const [hotkeys, setHotkeys] = useState({});
  const [recordingShortcutAction, setRecordingShortcutAction] = useState(null);

  // Updates state
  const [updateStatus, setUpdateStatus] = useState('Checking updates...');
  const [updateVersion, setUpdateVersion] = useState('Current version: N/A');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateCommits, setUpdateCommits] = useState([]);
  const [latestCommit, setLatestCommit] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Backup & Danger zone state
  const [backupStatus, setBackupStatus] = useState('');
  const [dangerStatus, setDangerStatus] = useState('');

  useEffect(() => {
    loadSettings();
    loadKeys();
    checkUpdates();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'ai') {
      loadAIMemory();
    }
  }, [activeSubTab]);

  // Handle shortcut recording keydown listener
  useEffect(() => {
    if (!recordingShortcutAction) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const key = e.key;
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        return; // Wait for active key
      }

      if (key === 'Escape' || key === 'Delete') {
        saveShortcut(recordingShortcutAction, 'None');
        setRecordingShortcutAction(null);
        return;
      }

      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Meta');

      let keyName = key;
      if (key === ' ') keyName = 'Space';
      else if (key.length === 1) keyName = key.toUpperCase();

      parts.push(keyName);
      const combo = parts.join('+');

      saveShortcut(recordingShortcutAction, combo);
      setRecordingShortcutAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingShortcutAction, hotkeys]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.success) {
        const s = data.settings || {};
        setSysFontFamily(s.font_family_system || 'Inter');
        setEditorFontFamily(s.font_family_editor || 'JetBrains Mono');
        setEditorFontSize(s.font_size_editor || 14);
        setTermFontFamily(s.font_family_terminal || 'JetBrains Mono');
        setTermFontSize(s.font_size_terminal || 13);
        
        setTermUser(s.terminal_username || 'guest');
        setTermHost(s.terminal_hostname || 'devhunt');
        setTermSymbol(s.terminal_prompt_symbol || '$');
        setTermSound(s.terminal_sound !== false);

        setEnglishCorrection(s.english_correction || false);
        setMinimizeSidebar(s.minimize_sidebar || false);
        setCanvasParticles(s.canvas_particles !== false);
        setSoundEffects(s.sound_effects !== false);
        setIconThemeSetting(s.icon_theme || 'emoji');
        
        if (s.feature_toggles) {
          setFeatureToggles({
            music: s.feature_toggles.music !== false,
            path: s.feature_toggles.path !== false,
            quests: s.feature_toggles.quests !== false,
            vault: s.feature_toggles.vault !== false,
            'doc-analysis': s.feature_toggles['doc-analysis'] !== false,
            arcade: s.feature_toggles.arcade !== false,
            linkedin: s.feature_toggles.linkedin !== false,
            search: s.feature_toggles.search !== false,
            stats: s.feature_toggles.stats !== false,
            terminal: s.feature_toggles.terminal !== false,
            notifications: s.feature_toggles.notifications !== false
          });
        }
        
        setSelectedModel(s.selected_model || 'auto');
        setTemperature(s.temperature !== undefined ? s.temperature : 0.7);
        setMaxTokens(s.max_tokens !== undefined ? s.max_tokens : 2048);
        setSystemPrompt(s.system_prompt || '');
        setHotkeys(s.shortcuts || {});
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      if (data.success) {
        setKeysList(data.keys || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveSettings = async (updates) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates })
      });
      const data = await res.json();
      if (data.success) {
        loadSettings();
        if (onRefreshHeader) onRefreshHeader();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Feature Toggle Handler
  const handleFeatureToggle = (key, val) => {
    const updatedToggles = { ...featureToggles, [key]: val };
    setFeatureToggles(updatedToggles);
    saveSettings({ feature_toggles: updatedToggles });
  };

  // AI Core Memory methods
  const loadAIMemory = async () => {
    setMemoryStatus('// fetching cognitive core memory...');
    try {
      const res = await fetch('/api/memory?session_id=default_session');
      const data = await res.json();
      if (data.success) {
        const memories = data.memories || [];
        if (memories.length > 0) {
          setMemoryText(memories.map(m => `- ${m}`).join('\n'));
          setMemoryStatus(`✓ Core memories retrieved (${memories.length} facts)`);
        } else {
          setMemoryText('');
          setMemoryStatus('No memories consolidated yet.');
        }
      } else {
        setMemoryStatus(`✕ Failed to load: ${data.error}`);
      }
    } catch (err) {
      setMemoryStatus(`✕ Error: ${err.message}`);
    }
  };

  const handleSaveMemory = async () => {
    setMemoryStatus('// transmitting updated memories...');
    try {
      const memories = memoryText.split('\n')
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean);

      const res = await fetch('/api/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memories })
      });
      const data = await res.json();
      if (data.success) {
        setMemoryStatus(`✓ Memories saved successfully (${memories.length} facts)`);
        loadAIMemory();
      } else {
        setMemoryStatus(`✕ Save failed: ${data.error}`);
      }
    } catch (err) {
      setMemoryStatus(`✕ Error: ${err.message}`);
    }
  };

  const handleRefineMemory = async () => {
    setMemoryStatus('// running cognitive consolidation on chat history...');
    try {
      const res = await fetch('/api/memory/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: 'default_session' })
      });
      const data = await res.json();
      if (data.success) {
        setMemoryStatus('✓ Refinement complete! Loaded updated facts.');
        loadAIMemory();
      } else {
        setMemoryStatus(`✕ Refinement failed: ${data.error}`);
      }
    } catch (err) {
      setMemoryStatus(`✕ Error: ${err.message}`);
    }
  };

  const handleClearMemory = async () => {
    if (!confirm('Clear all consolidate cognitive memories? This cannot be undone.')) return;
    setMemoryStatus('// deleting memories...');
    try {
      const res = await fetch('/api/memory?session_id=default_session', {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setMemoryStatus('✓ Core memories cleared successfully');
        setMemoryText('');
      } else {
        setMemoryStatus(`✕ Clear failed: ${data.error}`);
      }
    } catch (err) {
      setMemoryStatus(`✕ Error: ${err.message}`);
    }
  };

  // Keyboard binding methods
  const saveShortcut = async (action, combo) => {
    const updatedShortcuts = { ...hotkeys, [action]: combo };
    setHotkeys(updatedShortcuts);
    await saveSettings({ shortcuts: updatedShortcuts });
  };

  const handleDeleteShortcut = async (action) => {
    if (confirm(`Clear shortcut binding for ${action}?`)) {
      await saveShortcut(action, 'None');
    }
  };

  const handleResetShortcuts = async () => {
    if (!confirm('Reset all keyboard shortcuts to default factory bindings?')) return;
    const default_shortcuts = {
      "toggleSidebar": "Ctrl+B",
      "saveFile": "Ctrl+S",
      "focusChat": "Ctrl+K",
      "newFile": "Ctrl+N",
      "openTerminal": "Ctrl+Shift+P",
      "clearEditor": "Ctrl+Alt+C",
      "refreshExplorer": "Ctrl+Alt+R",
      "openLocalFolder": "Ctrl+Alt+O",
      "openLocalFile": "Ctrl+O",
      "formatDocument": "Shift+Alt+F",
      "globalSearch": "Ctrl+Alt+F"
    };
    setHotkeys(default_shortcuts);
    await saveSettings({ shortcuts: default_shortcuts });
    alert('All hotkeys reset to defaults successfully.');
  };

  // Terminal resets
  const handleResetTerminalDefaults = async () => {
    if (!confirm('Reset terminal prompt parameters to default values?')) return;
    setTermUser('guest');
    setTermHost('devhunt');
    setTermSymbol('$');
    setTermSound(true);
    await saveSettings({
      terminal_username: 'guest',
      terminal_hostname: 'devhunt',
      terminal_prompt_symbol: '$',
      terminal_sound: true
    });
    alert('Prompt parameters restored to defaults.');
  };

  // Update checking methods
  const checkUpdates = async (isManual = false) => {
    if (isManual) {
      setUpdateStatus('Checking remote repository...');
      // Dismiss state wipe
      try {
        await saveSettings({ dismissed_update: null });
      } catch (e) {}
    }
    try {
      const res = await fetch('/api/updates/check');
      const data = await res.json();
      if (data.success) {
        setUpdateVersion(`Local commit: ${data.current_commit || 'unknown'} (${data.current_branch || 'main'})`);
        setLatestCommit(data.latest_commit);
        if (data.update_available) {
          setUpdateStatus(`⚡ Update available (latest: ${data.latest_commit})`);
          setUpdateAvailable(true);
          setUpdateCommits(data.commits || []);
        } else {
          setUpdateStatus('✓ System is up to date');
          setUpdateAvailable(false);
          setUpdateCommits([]);
        }
      } else {
        setUpdateStatus(`✕ Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setUpdateStatus('✕ Connection error');
    }
  };

  const handleApplyUpdate = async () => {
    if (!confirm("Apply updates? This will pull remote commits and restart the server node. Your settings/keys will be preserved.")) return;
    setIsUpdating(true);
    setUpdateStatus('Applying update codebase...');
    try {
      const res = await fetch('/api/updates/apply', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        let msg = "✓ Update applied successfully!";
        if (data.conflict) {
          msg += " Note: Local merge conflicts were found and stashed; check status.";
        }
        alert(msg + " Reloading DevHunt workspace.");
        window.location.reload();
      } else {
        alert(`Failed to apply updates: ${data.error}`);
        setIsUpdating(false);
        checkUpdates();
      }
    } catch (err) {
      setUpdateStatus('✓ Server reloading with new updates...');
      setTimeout(() => {
        window.location.reload();
      }, 4000);
    }
  };

  // Backup import handler
  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupStatus('// importing backup...');

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const summary = Object.entries(data.restored || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ');
        setBackupStatus(`✓ Restored — ${summary}`);
        loadSettings();
        loadKeys();
        if (onRefreshHeader) onRefreshHeader();
      } else {
        setBackupStatus(`✕ Import failed: ${data.error}`);
      }
    } catch (err) {
      setBackupStatus(`✕ Error: ${err.message}`);
    }
    e.target.value = '';
  };

  // Danger zone reset methods
  const handleClearHistory = async () => {
    if (!confirm('Clear ALL chat history for default_session?')) return;
    try {
      const res = await fetch('/api/chat/history?session_id=default_session', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDangerStatus('✓ Chat history cleared');
      } else {
        setDangerStatus(`✕ Clear failed: ${data.error}`);
      }
    } catch (err) {
      setDangerStatus(`✕ Error: ${err.message}`);
    }
  };

  const handleResetEverything = async () => {
    const confirmed = confirm(
      '⚠️ RESET EVERYTHING?\n\n' +
      'This will delete:\n' +
      '• All API keys\n' +
      '• All chat history\n' +
      '• All todos/quests\n' +
      '• All knowledge base\n' +
      '• Profile & settings\n\n' +
      'This CANNOT be undone. Export a backup first!\n\nType OK to confirm.'
    );
    if (!confirmed) return;

    setDangerStatus('// resetting...');
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDangerStatus('✓ Everything cleared. Reloading workspace...');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setDangerStatus(`✕ Reset failed: ${data.error}`);
      }
    } catch (err) {
      setDangerStatus(`✕ Error: ${err.message}`);
    }
  };

  const handleAddKey = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim(), label: newKeyLabel.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setNewKey('');
        setNewKeyLabel('');
        loadKeys();
        if (onRefreshHeader) onRefreshHeader();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleKey = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Disabled' : 'Active';
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        loadKeys();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteKey = async (id) => {
    if (!confirm('Are you sure you want to delete this API Key?')) return;
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadKeys();
        if (onRefreshHeader) onRefreshHeader();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestKey = async (id) => {
    alert('Testing connection to Google Gemini API... check response.');
    try {
      const res = await fetch(`/api/keys/${id}/test`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        alert(`Test passed! API Connection working. Response: ${data.reply}`);
      } else {
        alert(`Test failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    document.body.className = `theme-${newTheme}`;
    saveSettings({ theme: newTheme });
  };

  const shortcutActionNames = {
    "toggleSidebar": "Toggle Explorer Sidebar",
    "saveFile": "Save Active File",
    "focusChat": "Focus AI Assistant Chat",
    "newFile": "Show New File Inline",
    "openTerminal": "Switch to Terminal Panel",
    "clearEditor": "Clear Editor Content",
    "refreshExplorer": "Refresh File Explorer",
    "openLocalFolder": "Open Local Folder",
    "openLocalFile": "Open Local File",
    "formatDocument": "Format Active Document",
    "globalSearch": "Global Search & Replace"
  };

  return (
    <div className="card" style={{ height: '100%', overflow: 'hidden', padding: '0', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
      <div className="settings-dashboard-container" style={{ display: 'flex', height: '100%', width: '100%', flex: 1 }}>
        
        {/* Settings Tab Sidebar Navigation */}
        <aside className="settings-nav-sidebar" style={{ width: '240px', background: 'var(--bg-2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '12px', gap: '4px', flexShrink: 0 }}>
          <div className={`settings-nav-item ${activeSubTab === 'general' ? 'active' : ''}`} onClick={() => setActiveSubTab('general')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
            <Palette size={14} />
            <span className="settings-nav-label">Appearance &amp; UI</span>
          </div>
          <div className={`settings-nav-item ${activeSubTab === 'terminal' ? 'active' : ''}`} onClick={() => setActiveSubTab('terminal')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
            <Terminal size={14} />
            <span className="settings-nav-label">Terminal Prompt</span>
          </div>
          <div className={`settings-nav-item ${activeSubTab === 'shortcuts' ? 'active' : ''}`} onClick={() => setActiveSubTab('shortcuts')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
            <Keyboard size={14} />
            <span className="settings-nav-label">Key Bindings</span>
          </div>
          <div className={`settings-nav-item ${activeSubTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveSubTab('ai')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
            <Brain size={14} />
            <span className="settings-nav-label">AI Execution</span>
          </div>
          <div className={`settings-nav-item ${activeSubTab === 'system' ? 'active' : ''}`} onClick={() => setActiveSubTab('system')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
            <SettingsIcon size={14} />
            <span className="settings-nav-label">System &amp; Keys</span>
          </div>
        </aside>

        {/* Settings Scrollable Content Area */}
        <div className="settings-content-area" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          
          {/* TAB 1: APPEARANCE & THEMES */}
          {activeSubTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card">
                <div className="card-head">
                  <h2>Theme &amp; Layout</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  <div className="toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="toggle-title" style={{ fontWeight: 'bold', fontSize: '12px' }}>Select UI Theme</div>
                      <div className="muted" style={{ fontSize: '11px', color: 'var(--muted)' }}>Switch between Slate, Deep Space Dark, Minimalist Light and Devil themes.</div>
                    </div>
                    <div style={{ width: '180px', flexShrink: 0 }}>
                      <select 
                        value={theme} 
                        onChange={(e) => handleThemeChange(e.target.value)}
                        style={{ width: '100%', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                      >
                        <option value="slate">Industrial Slate</option>
                        <option value="neon">Deep Space Dark</option>
                        <option value="light">Minimalist Light</option>
                        <option value="devil">Devil</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <div>
                      <div className="toggle-title" style={{ fontWeight: 'bold', fontSize: '12px' }}>File Icon Theme</div>
                      <div className="muted" style={{ fontSize: '11px', color: 'var(--muted)' }}>Switch between Cyberpunk Emojis, VS Code SVG icons, and Minimalist Outlines.</div>
                    </div>
                    <div style={{ width: '180px', flexShrink: 0 }}>
                      <select 
                        value={iconThemeSetting} 
                        onChange={(e) => { setIconThemeSetting(e.target.value); saveSettings({ icon_theme: e.target.value }); }}
                        style={{ width: '100%', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                      >
                        <option value="emoji">Cyberpunk Emojis</option>
                        <option value="vscode">VS Code SVGs</option>
                        <option value="minimal">Minimalist Outlines</option>
                      </select>
                    </div>
                  </div>

                  <div className="toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <div>
                      <div className="toggle-title" style={{ fontWeight: 'bold', fontSize: '12px' }}>English Communication Helper</div>
                      <div className="muted" style={{ fontSize: '11px', color: 'var(--muted)' }}>Prepends a "Grammar &amp; Phrasing Tip" callout to every AI response.</div>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={englishCorrection} onChange={(e) => { setEnglishCorrection(e.target.checked); saveSettings({ english_correction: e.target.checked }); }} />
                      <span></span>
                    </label>
                  </div>

                  <div className="toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <div>
                      <div className="toggle-title" style={{ fontWeight: 'bold', fontSize: '12px' }}>Minimize Sidebar Panel</div>
                      <div className="muted" style={{ fontSize: '11px', color: 'var(--muted)' }}>Collapse the left file explorer panel into a hidden state.</div>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={minimizeSidebar} onChange={(e) => { setMinimizeSidebar(e.target.checked); saveSettings({ minimize_sidebar: e.target.checked }); }} />
                      <span></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <h2>Typography &amp; Environment</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                  <div className="toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="toggle-title" style={{ fontWeight: 'bold', fontSize: '12px' }}>Canvas Particles Animation</div>
                      <div className="muted" style={{ fontSize: '11px', color: 'var(--muted)' }}>Toggle the glowing network animation in Deep Space Dark Theme (save CPU).</div>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={canvasParticles} onChange={(e) => { setCanvasParticles(e.target.checked); saveSettings({ canvas_particles: e.target.checked }); }} />
                      <span></span>
                    </label>
                  </div>

                  <div className="toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <div>
                      <div className="toggle-title" style={{ fontWeight: 'bold', fontSize: '12px' }}>Interface Sound Effects</div>
                      <div className="muted" style={{ fontSize: '11px', color: 'var(--muted)' }}>Play micro-feedback audio sounds during clicks and key events in Game Arcade or Vault.</div>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={soundEffects} onChange={(e) => { setSoundEffects(e.target.checked); saveSettings({ sound_effects: e.target.checked }); }} />
                      <span></span>
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <div>
                      <label className="toggle-title" style={{ marginBottom: '6px', display: 'block', fontWeight: 'bold', fontSize: '11px' }}>SYSTEM UI FONT</label>
                      <select 
                        value={sysFontFamily} 
                        onChange={(e) => { setSysFontFamily(e.target.value); saveSettings({ font_family_system: e.target.value }); }}
                        style={{ width: '100%', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                      >
                        <option value="Inter">Inter (Modern Sans)</option>
                        <option value="Outfit">Outfit (Round Geometric)</option>
                        <option value="Roboto">Roboto (Clean Tech)</option>
                        <option value="Fira Sans">Fira Sans</option>
                        <option value="IBM Plex Sans">IBM Plex Sans</option>
                        <option value="Orbitron">Orbitron (Futuristic Display)</option>
                        <option value="Caveat">Caveat (Playful Cursive)</option>
                        <option value="JetBrains Mono">JetBrains Mono (Monospace)</option>
                        <option value="system-ui, -apple-system, BlinkMacSystemFont, sans-serif">System Default</option>
                      </select>
                    </div>

                    <div>
                      <label className="toggle-title" style={{ marginBottom: '6px', display: 'block', fontWeight: 'bold', fontSize: '11px' }}>CODE EDITOR FONT</label>
                      <select 
                        value={editorFontFamily} 
                        onChange={(e) => { setEditorFontFamily(e.target.value); saveSettings({ font_family_editor: e.target.value }); }}
                        style={{ width: '100%', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', marginBottom: '10px' }}
                      >
                        <option value="JetBrains Mono">JetBrains Mono (Sleek)</option>
                        <option value="Orbitron">Orbitron (Retro Tech)</option>
                        <option value="Outfit">Outfit</option>
                        <option value="Inter">Inter</option>
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="range" 
                          min="11" 
                          max="22" 
                          step="1" 
                          value={editorFontSize} 
                          onChange={(e) => { setEditorFontSize(parseInt(e.target.value)); saveSettings({ font_size_editor: parseInt(e.target.value) }); }}
                          style={{ flex: 1, accentColor: 'var(--accent)' }} 
                        />
                        <span className="badge" style={{ width: '36px', textAlign: 'center' }}>{editorFontSize}px</span>
                      </div>
                    </div>

                    <div>
                      <label className="toggle-title" style={{ marginBottom: '6px', display: 'block', fontWeight: 'bold', fontSize: '11px' }}>TERMINAL FONT</label>
                      <select 
                        value={termFontFamily} 
                        onChange={(e) => { setTermFontFamily(e.target.value); saveSettings({ font_family_terminal: e.target.value }); }}
                        style={{ width: '100%', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', marginBottom: '10px' }}
                      >
                        <option value="JetBrains Mono">JetBrains Mono (Sleek)</option>
                        <option value="Orbitron">Orbitron (Retro Tech)</option>
                        <option value="Outfit">Outfit</option>
                        <option value="Inter">Inter</option>
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="range" 
                          min="10" 
                          max="20" 
                          step="1" 
                          value={termFontSize} 
                          onChange={(e) => { setTermFontSize(parseInt(e.target.value)); saveSettings({ font_size_terminal: parseInt(e.target.value) }); }}
                          style={{ flex: 1, accentColor: 'var(--accent)' }} 
                        />
                        <span className="badge" style={{ width: '36px', textAlign: 'center' }}>{termFontSize}px</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FEATURE MODULE TOGGLES */}
              <div className="card">
                <div className="card-head">
                  <h2>Feature Access Toggles</h2>
                </div>
                <p className="muted" style={{ marginBottom: '12px', fontFamily: 'var(--mono)', fontSize: '10.5px' }}>
                  // Enable/disable specific application modules dynamically (changes hide/show elements in UI)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { key: 'music', label: 'Music Player & Widgets', desc: 'Toggle display of the Music tab and global topbar/sidebar playback controllers.' },
                    { key: 'path', label: 'Hunt Path Roadmap', desc: 'Toggle display of curriculum map tracks, study milestones, and progress meters.' },
                    { key: 'quests', label: 'Quest Board', desc: 'Toggle display of developer quest cards, priority queues, and Kanban columns.' },
                    { key: 'vault', label: 'Intel Vault (RAG)', desc: 'Toggle display of text/PDF upload dropzones and similarity matching chat references.' },
                    { key: 'doc-analysis', label: 'Doc Forensics', desc: 'Toggle display of Error Level Analysis (ELA) scanners, metadata verifiers, and PII alerts.' },
                    { key: 'arcade', label: 'Game Arcade', desc: 'Toggle display of the Game Arcade tab containing offline developer games.' },
                    { key: 'linkedin', label: 'LinkedIn Drafts', desc: 'Access drafts, schedule, and refine LinkedIn content.' },
                    { key: 'search', label: 'Global Search & Replace', desc: 'Toggle display of the Search & Replace tab.' },
                    { key: 'stats', label: 'Terminal Stats & Analytics', desc: 'Toggle display of the Terminal Stats tab.' },
                    { key: 'terminal', label: 'Standalone Terminal Shell', desc: 'Toggle display of the Hunt Terminal tab.' },
                    { key: 'notifications', label: 'System Messages Logs', desc: 'Toggle display of the System Messages/Notifications tab.' }
                  ].map(feat => (
                    <div key={feat.key} className="toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="toggle-title" style={{ fontWeight: 'bold', fontSize: '12px' }}>{feat.label}</div>
                        <div className="muted" style={{ fontSize: '11px', color: 'var(--muted)' }}>{feat.desc}</div>
                      </div>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={featureToggles[feat.key]} 
                          onChange={(e) => handleFeatureToggle(feat.key, e.target.checked)} 
                        />
                        <span></span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TERMINAL PREFERENCES */}
          {activeSubTab === 'terminal' && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="card-head">
                <h2>Terminal Customization</h2>
              </div>
              <p className="muted" style={{ fontFamily: 'var(--mono)' }}>// Customize your shell prompt configurations. Prompts reflect: user@hostname:cwd symbol</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '8px' }}>
                <div>
                  <label className="toggle-title" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '11px' }}>TERMINAL USERNAME</label>
                  <input 
                    type="text" 
                    value={termUser} 
                    onChange={(e) => setTermUser(e.target.value)} 
                    style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }} 
                  />
                </div>
                <div>
                  <label className="toggle-title" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '11px' }}>TERMINAL HOSTNAME</label>
                  <input 
                    type="text" 
                    value={termHost} 
                    onChange={(e) => setTermHost(e.target.value)} 
                    style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }} 
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '8px' }}>
                <div>
                  <label className="toggle-title" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '11px' }}>PROMPT END SYMBOL</label>
                  <input 
                    type="text" 
                    value={termSymbol} 
                    onChange={(e) => setTermSymbol(e.target.value)} 
                    style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }} 
                  />
                </div>
                <div>
                  <label className="toggle-title" style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', fontSize: '11px' }}>SYSTEM ERROR BEEP ALERT</label>
                  <div style={{ paddingTop: '4px' }}>
                    <label className="switch">
                      <input type="checkbox" checked={termSound} onChange={(e) => setTermSound(e.target.checked)} />
                      <span></span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => saveSettings({
                    terminal_username: termUser,
                    terminal_hostname: termHost,
                    terminal_prompt_symbol: termSymbol,
                    terminal_sound: termSound
                  })}
                  style={{ padding: '6px 14px', fontSize: '11px' }}
                >
                  Apply Prompt Settings
                </button>
                <button 
                  className="btn-ghost" 
                  onClick={handleResetTerminalDefaults}
                  style={{ padding: '6px 14px', fontSize: '11px' }}
                >
                  Reset Prompt Defaults
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: KEYBOARD SHORTCUTS */}
          {activeSubTab === 'shortcuts' && (
            <div className="card">
              <div className="card-head">
                <h2>IDE Keyboard Bindings</h2>
              </div>
              <p className="muted" style={{ marginBottom: '16px' }}>
                Customize global workspace shortcuts. Click <b>Edit</b> to map keys (press escape/delete to skip), or <b>Reset</b> back to standard mappings.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                {Object.entries(shortcutActionNames).map(([actionId, actionLabel]) => {
                  const binding = hotkeys[actionId] || 'None';
                  const isRecordingThis = recordingShortcutAction === actionId;

                  return (
                    <div 
                      key={actionId} 
                      className="shortcut-row" 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '6px 10px', 
                        background: 'rgba(0,0,0,0.15)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '4px' 
                      }}
                    >
                      <span className="shortcut-label" style={{ fontSize: '11.5px', fontWeight: '500' }}>{actionLabel}</span>
                      <div className="shortcut-binding-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <kbd style={{ 
                          background: 'rgba(255,255,255,0.08)', 
                          border: '1px solid var(--border)', 
                          padding: '2px 6px', 
                          borderRadius: '3px', 
                          fontFamily: 'var(--mono)', 
                          fontSize: '10px',
                          color: isRecordingThis ? 'var(--accent)' : 'var(--text)'
                        }}>
                          {isRecordingThis ? 'Press keys...' : binding}
                        </kbd>
                        <button 
                          className={`btn-ghost btn-sm ${isRecordingThis ? 'active' : ''}`} 
                          onClick={() => setRecordingShortcutAction(isRecordingThis ? null : actionId)}
                          style={{ padding: '3px 8px', fontSize: '10px' }}
                        >
                          {isRecordingThis ? 'Cancel' : 'Edit'}
                        </button>
                        <button 
                          className="btn-ghost btn-sm" 
                          onClick={() => handleDeleteShortcut(actionId)}
                          style={{ color: 'var(--red)', borderColor: 'rgba(255,77,109,.2)', padding: '3px 8px', fontSize: '10px' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <button 
                  className="btn-primary" 
                  onClick={handleResetShortcuts}
                  style={{ padding: '6px 14px', fontSize: '11px' }}
                >
                  Reset All Keybindings
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: AI PREFERENCES & CORE COGNITIVE MEMORY */}
          {activeSubTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* AI Parameters */}
              <div className="card">
                <div className="card-head">
                  <h2>AI Execution Parameters</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                  <div className="toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="toggle-title" style={{ fontWeight: 'bold', fontSize: '12px' }}>Active AI Model Override</div>
                      <div className="muted" style={{ fontSize: '11px', color: 'var(--muted)' }}>Change the generation LLM node directly. Auto matches the active pool.</div>
                    </div>
                    <div style={{ width: '180px', flexShrink: 0 }}>
                      <select 
                        value={selectedModel} 
                        onChange={(e) => { setSelectedModel(e.target.value); saveSettings({ selected_model: e.target.value }); }}
                        style={{ width: '100%', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                      >
                        <option value="auto">Auto Pool Decider</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      </select>
                    </div>
                  </div>

                  <div className="toggle-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div className="toggle-title" style={{ fontWeight: 'bold', fontSize: '12px' }}>Creativity Temperature</div>
                      <span className="badge">{temperature.toFixed(1)}</span>
                    </div>
                    <div className="muted" style={{ fontSize: '11px', color: 'var(--muted)' }}>Controls response variety. Lower values are deterministic, higher values are creative.</div>
                    <input 
                      type="range" 
                      min="0.0" 
                      max="1.5" 
                      step="0.1" 
                      value={temperature} 
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      onMouseUp={() => saveSettings({ temperature })}
                      onTouchEnd={() => saveSettings({ temperature })}
                      style={{ width: '100%', accentColor: 'var(--accent)' }} 
                    />
                  </div>

                  <div className="toggle-row" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div className="toggle-title" style={{ fontWeight: 'bold', fontSize: '12px' }}>Max Response Token Limit</div>
                      <span className="badge">{maxTokens}</span>
                    </div>
                    <div className="muted" style={{ fontSize: '11px', color: 'var(--muted)' }}>Limits the maximum generated length size of LLM assistant messages.</div>
                    <input 
                      type="range" 
                      min="512" 
                      max="8192" 
                      step="256" 
                      value={maxTokens} 
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      onMouseUp={() => saveSettings({ max_tokens: maxTokens })}
                      onTouchEnd={() => saveSettings({ max_tokens: maxTokens })}
                      style={{ width: '100%', accentColor: 'var(--accent)' }} 
                    />
                  </div>
                </div>
              </div>

              {/* Custom System Prompt */}
              <div className="card">
                <div className="card-head">
                  <h2>Custom System Instructions</h2>
                </div>
                <p className="muted" style={{ marginBottom: '10px' }}>
                  Prepend tailored instructions to guide how DevHunt AI profiles code, explanations, and advice.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea 
                    value={systemPrompt} 
                    onChange={(e) => setSystemPrompt(e.target.value)} 
                    rows="5"
                    placeholder="E.g., You are an expert system administrator. Provide shell command script samples in every single reply."
                    style={{ width: '100%', fontFamily: 'var(--display)', fontSize: '12px', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', resize: 'vertical' }}
                  />
                  <div>
                    <button className="btn-primary" onClick={() => saveSettings({ system_prompt: systemPrompt })} style={{ padding: '6px 14px', fontSize: '11px' }}>
                      Save Instructions
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Memory Manager */}
              <div className="card">
                <div className="card-head">
                  <h2>AI Core Memory</h2>
                </div>
                <p className="muted" style={{ marginBottom: '12px' }}>
                  View and manage the facts, preferences, and project context that DevHunt AI automatically learns and updates about you daily. Each line represents a distinct fact.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea 
                    value={memoryText} 
                    onChange={(e) => setMemoryText(e.target.value)} 
                    rows="8"
                    placeholder="No memories consolidated yet. Click 'Refine Now' or start chatting!"
                    style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: '12px', lineBreak: 'anywhere', lineHeight: '1.5', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                  />

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn-primary" onClick={handleSaveMemory} style={{ padding: '6px 14px', fontSize: '11px' }}>Save Changes</button>
                    <button className="btn-ghost" onClick={handleRefineMemory} style={{ padding: '6px 14px', fontSize: '11px' }}>Refine Now</button>
                    <button className="btn-ghost" onClick={handleClearMemory} style={{ color: 'var(--red)', borderColor: 'rgba(255,77,109,.4)', padding: '6px 14px', fontSize: '11px' }}>Clear Memory</button>
                  </div>
                  {memoryStatus && (
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{memoryStatus}</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: SYSTEM & KEYS (Key manager, updates, backup, danger zone) */}
          {activeSubTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Gemini Key manager */}
              <div className="card">
                <div className="card-head">
                  <h2>Key Pool Manager</h2>
                </div>
                <form onSubmit={handleAddKey} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <input 
                    type="password" 
                    value={newKey} 
                    onChange={(e) => setNewKey(e.target.value)} 
                    placeholder="AIzaSy••• Gemini API key"
                    style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                  />
                  <input 
                    type="text" 
                    value={newKeyLabel} 
                    onChange={(e) => setNewKeyLabel(e.target.value)} 
                    placeholder="Label (e.g. primary)"
                    style={{ width: '180px', fontFamily: 'var(--mono)', fontSize: '12px', padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '6px 14px', fontSize: '11px' }}>+ Register Key</button>
                </form>

                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '16px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>LABEL</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>MASKED KEY</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>STATUS</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>TEST</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>DELETE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keysList.map(k => (
                      <tr key={k.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>{k.label || 'Unnamed Key'}</td>
                        <td style={{ padding: '8px', fontFamily: 'var(--mono)' }}>{k.masked_key}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button 
                            className={`btn-ghost ${k.status === 'Active' ? 'active' : ''}`}
                            onClick={() => handleToggleKey(k.id, k.status)}
                            style={{ padding: '3px 8px', fontSize: '10px' }}
                          >
                            {k.status}
                          </button>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button onClick={() => handleTestKey(k.id)} className="btn-ghost" style={{ padding: '4px' }}>
                            <Play size={12} />
                          </button>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button onClick={() => handleDeleteKey(k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {keysList.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
                          No API keys registered. Key rotation is currently disabled.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* System Updates */}
              <div className="card">
                <div className="card-head">
                  <h2>System Updates</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--text)' }}>{updateStatus}</div>
                      <div className="muted" style={{ marginTop: '2px', fontSize: '11px', color: 'var(--muted)' }} dangerouslySetInnerHTML={{ __html: updateVersion }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-ghost" onClick={() => checkUpdates(true)} style={{ padding: '6px 12px', fontSize: '11px' }}>Check Updates</button>
                      {updateAvailable && (
                        <button 
                          className="btn-primary" 
                          onClick={handleApplyUpdate} 
                          disabled={isUpdating}
                          style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          Apply Update
                        </button>
                      )}
                    </div>
                  </div>

                  {updateAvailable && updateCommits.length > 0 && (
                    <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', maxHeight: '160px', overflowY: 'auto', marginTop: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--cyan)', marginBottom: '6px', letterSpacing: '1px' }}>
                        UPDATE DETAILS (WHAT'S NEW):
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontFamily: 'var(--mono)', fontSize: '11.5px', color: 'var(--text)', lineHeight: '1.55' }}>
                        {updateCommits.map((c, idx) => (
                          <li key={idx}>
                            <span style={{ color: 'var(--cyan)' }}>{c.hash}</span>: {c.message} <span className="muted">({c.author})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {isUpdating && (
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                      <span className="streaming-cursor">▌</span> Updating codebase. Do not close the window...
                    </div>
                  )}
                </div>
              </div>

              {/* Backup & Restore */}
              <div className="card">
                <div className="card-head">
                  <h2>Backup &amp; Restore</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <a 
                    href="/api/backup/export" 
                    className="btn-primary" 
                    style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={12} /> Full Backup
                  </a>
                  <a 
                    href="/api/history/export" 
                    className="btn-ghost" 
                    style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={12} /> Chat History JSON
                  </a>
                  <label className="btn-ghost" style={{ cursor: 'pointer', padding: '8px 14px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Upload size={12} /> Import Backup
                    <input 
                      type="file" 
                      accept=".json" 
                      hidden 
                      onChange={handleImportBackup} 
                    />
                  </label>
                  <button 
                    onClick={() => {
                      if (setActiveTab) setActiveTab('notifications');
                      if (setNotificationsSubTab) setNotificationsSubTab('logs');
                    }}
                    className="btn-ghost" 
                    style={{ padding: '8px 14px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    ◎ Logs
                  </button>
                </div>
                {backupStatus && (
                  <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{backupStatus}</div>
                )}
              </div>

              {/* Danger Zone */}
              <div className="card" style={{ borderColor: 'rgba(255,77,106,.3)' }}>
                <div className="card-head">
                  <h2 style={{ color: 'var(--red)' }}>⚠️ Danger Zone</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <button 
                    className="btn-ghost" 
                    onClick={handleClearHistory}
                    style={{ borderColor: 'rgba(255,77,106,.4)', color: 'var(--red)', padding: '6px 14px', fontSize: '11px' }}
                  >
                    ✕ Clear Chat History
                  </button>
                  <button 
                    className="btn-ghost" 
                    onClick={handleResetEverything}
                    style={{ borderColor: 'rgba(255,77,106,.6)', color: 'var(--red)', fontWeight: '700', padding: '6px 14px', fontSize: '11px' }}
                  >
                    ☢ Reset Everything
                  </button>
                </div>
                <div className="muted" style={{ marginTop: '8px', fontSize: '11px' }}>
                  Reset Everything clears all keys, chat history, todos, knowledge base and profile. Cannot be undone. Export backup first.
                </div>
                {dangerStatus && (
                  <div style={{ marginTop: '8px', fontSize: '11px', fontFamily: 'var(--mono)' }}>{dangerStatus}</div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
