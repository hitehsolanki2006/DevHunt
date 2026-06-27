import { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';

import Sidebar from './components/Sidebar.jsx';
import ChatPanel from './components/Chat/ChatPanel.jsx';
import QuestBoard from './components/QuestBoard/QuestBoard.jsx';
import IntelVault from './components/IntelVault/IntelVault.jsx';
import IDEWorkspace from './components/IDE/IDEWorkspace.jsx';
import Arcade from './components/Arcade/Arcade.jsx';
import Settings from './components/Settings/Settings.jsx';
import DocForensics from './components/DocForensics/DocForensics.jsx';

// Global fetch interceptor to append secure API token header
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenParam = urlParams.get('token');
  if (tokenParam) {
    localStorage.setItem('X-DevHunt-Token', tokenParam);
    window.__DEVHUNT_TOKEN__ = tokenParam;
  } else {
    window.__DEVHUNT_TOKEN__ = localStorage.getItem('X-DevHunt-Token') || '';
  }

  const originalFetch = window.fetch;
  window.fetch = async function (url, options = {}) {
    if (typeof url === 'string' && url.startsWith('/api/')) {
      options.headers = options.headers || {};
      const token = window.__DEVHUNT_TOKEN__;
      if (token) {
        if (options.headers instanceof Headers) {
          options.headers.set('X-DevHunt-Token', token);
        } else if (Array.isArray(options.headers)) {
          const hasToken = options.headers.some(([k]) => k.toLowerCase() === 'x-devhunt-token');
          if (!hasToken) {
            options.headers.push(['X-DevHunt-Token', token]);
          }
        } else {
          options.headers['X-DevHunt-Token'] = token;
        }
      }
    }
    return originalFetch(url, options);
  };
})();


/* ───────────────────────────────
   THEME HELPERS
─────────────────────────────── */
const VALID_THEMES = ['slate', 'neon', 'light', 'devil'];

function applyTheme(theme) {
  const t = VALID_THEMES.includes(theme) ? theme : 'slate';
  document.body.className = `theme-${t}`;
  localStorage.setItem('devhunt-theme', t);
}

/* ───────────────────────────────
   TOP MENU BAR
─────────────────────────────── */
function MenuBar({ 
  setActiveTab, 
  setIsSidebarMinimized, 
  setTheme,
  onNewFile,
  onSaveFile,
  onOpenLocalFile,
  onOpenLocalFolder,
  onRefreshExplorer,
  onClearEditor,
  onFormatDocument,
  setNotificationsSubTab
}) {
  const switchTheme = (t) => { setTheme(t); applyTheme(t); };

  return (
    <div className="menu-bar">
      {[
        {
          label: 'File',
          items: [
            { id: 'menu-new-file', text: 'New File', onClick: onNewFile },
            { id: 'menu-save-file', text: 'Save File (Ctrl+S)', onClick: onSaveFile },
            { divider: true },
            { id: 'menu-open-local-folder', text: 'Open Local Folder (Ctrl+Alt+O)', onClick: onOpenLocalFolder },
            { id: 'menu-open-local-file', text: 'Open Local File (Ctrl+O)', onClick: onOpenLocalFile },
            { divider: true },
            { id: 'menu-refresh-files', text: 'Refresh Explorer', onClick: onRefreshExplorer },
          ],
        },
        {
          label: 'Edit',
          items: [
            { id: 'menu-clear-editor', text: 'Clear Editor', onClick: onClearEditor },
            { id: 'menu-format-doc', text: 'Format Document (Shift+Alt+F)', onClick: onFormatDocument },
          ],
        },
        {
          label: 'View',
          items: [
            { text: 'Toggle Sidebar (Ctrl+B)', onClick: () => setIsSidebarMinimized(p => !p) },
            { divider: true },
            { text: 'Industrial Slate Theme', onClick: () => switchTheme('slate') },
            { text: 'Deep Space Dark Theme',  onClick: () => switchTheme('neon')  },
            { text: 'Minimalist Light Theme', onClick: () => switchTheme('light') },
            { text: 'Devil Theme',            onClick: () => switchTheme('devil') },
          ],
        },
        {
          label: 'Terminal',
          items: [{ text: 'Open Terminal', onClick: () => setActiveTab('terminal') }],
        },
        {
          label: 'Help',
          items: [
            { text: 'Documentation', href: 'https://github.com/hitehsolanki2006/DevHunt#readme', target: '_blank' },
            { text: 'System Logs', onClick: () => { setNotificationsSubTab('logs'); setActiveTab('notifications'); } },
          ],
        },
      ].map(menu => (
        <div className="menu-item" key={menu.label}>
          <span>{menu.label}</span>
          <div className="dropdown-menu">
            {menu.items.map((item, i) =>
              item.divider
                ? <div key={i} className="dropdown-divider" />
                : (
                  <a
                    key={item.id || item.text}
                    id={item.id}
                    className="dropdown-link"
                    href={item.href || '#'}
                    target={item.target}
                    onClick={item.onClick ? (e) => { e.preventDefault(); item.onClick(); } : undefined}
                  >
                    {item.text}
                  </a>
                )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────────
   TOPBAR MUSIC DECK
─────────────────────────────── */
function MusicDeck({ musicState, musicControls, onDeckClick }) {
  return (
    <div id="topbar-music-deck" className="music-deck-horizontal" style={{ cursor: 'pointer' }} onClick={onDeckClick}>
      <span id="top-music-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {musicState?.title || 'No track selected'}
      </span>
      <div className="music-controls-mini" style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
        <button id="top-music-prev" className="music-btn" title="Previous" onClick={(e) => { e.stopPropagation(); musicControls?.prev(); }}>⏮</button>
        <button
          id="top-music-play"
          className="music-btn"
          style={{ color: 'var(--accent)' }}
          title="Play/Pause"
          onClick={(e) => { e.stopPropagation(); musicControls?.toggle(); }}
        >
          {musicState?.playing ? '⏸' : '▶'}
        </button>
        <button id="top-music-next" className="music-btn" title="Next" onClick={(e) => { e.stopPropagation(); musicControls?.next(); }}>⏭</button>
      </div>
      <span id="top-music-time" style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>{musicState?.time || '0:00'}</span>
    </div>
  );
}

/* ───────────────────────────────
   PANEL: HUNT PATH
─────────────────────────────── */
function HuntPath() {
  const [loading, setLoading] = useState(false);
  const [pathData, setPathData] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [expandedDays, setExpandedDays] = useState(new Set());

  const loadPath = async () => {
    try {
      const res = await fetch('/api/path');
      const d = await res.json();
      if (d.success && d.path) {
        setPathData(d.path);
        const currentDay = d.path.current_day || 1;
        const phases = d.path.phases || [];
        const activePhase = phases.find(p => (p.days || []).some(dayObj => dayObj.day === currentDay));
        if (activePhase) {
          setExpandedPhases(prev => new Set([...prev, activePhase.title]));
        }
      }
    } catch (err) {
      console.error('Failed to load roadmap path', err);
    }
  };

  useEffect(() => {
    loadPath();
  }, []);

  const togglePhase = (phaseTitle) => {
    setExpandedPhases(prev => {
      const s = new Set(prev);
      s.has(phaseTitle) ? s.delete(phaseTitle) : s.add(phaseTitle);
      return s;
    });
  };

  const toggleDay = (dayNum) => {
    setExpandedDays(prev => {
      const s = new Set(prev);
      s.has(dayNum) ? s.delete(dayNum) : s.add(dayNum);
      return s;
    });
  };

  const updateDayStatus = async (dayNum, status) => {
    try {
      const res = await fetch('/api/path/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: dayNum, status })
      });
      const data = await res.json();
      if (data.success) {
        loadPath();
      } else {
        alert('Failed to update status: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating status');
    }
  };

  const regeneratePath = async () => {
    if (!window.confirm('Are you sure you want to regenerate your learning path? This will reset all current progress.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/path/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const d = await res.json();
      if (d.success) {
        setPathData(d.path);
        setExpandedDays(new Set());
        alert('✓ Hunt Path roadmap successfully regenerated!');
      } else {
        alert('✕ Failed to regenerate: ' + d.error);
      }
    } catch (err) {
      console.error(err);
      alert('Network error generating path');
    } finally {
      setLoading(false);
    }
  };

  const addQuest = async (taskTitle, dayNum, dayTitle) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          description: `Day ${dayNum}: ${dayTitle}`,
          priority: 'medium',
          tags: [`Day ${dayNum}`, 'Roadmap']
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✓ Added task to Quest Board: "${taskTitle}"`);
      } else {
        alert(`✕ Error adding task: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error adding task');
    }
  };

  const copyToClipboard = (text, message = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    alert(message);
  };

  const goal = pathData?.goal || 'DevOps Roadmap';
  const phases = pathData?.phases || [];
  const currentDay = pathData?.current_day || 1;

  const allDays = phases.flatMap(p => p.days || []);
  const totalDays = allDays.length;
  const completedDays = allDays.filter(d => d.status === 'completed').length;
  const progress = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
      <div className="card-head" style={{ padding: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '15px', letterSpacing: '0.5px' }}>⚡ Hunt Path Roadmap</h2>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', fontFamily: 'var(--mono)' }}>
            GOAL: {goal}
          </div>
        </div>
        <div className="row gap" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 120, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--green), var(--cyan))', borderRadius: 4 }} />
          </div>
          <span className="muted" style={{ fontSize: '11px', fontFamily: 'var(--mono)' }} id="roadmap-progress-text">{progress}% complete</span>
          <button className="btn-primary" style={{ fontSize: '10px', padding: '4px 10px' }} onClick={regeneratePath} disabled={loading}>
            {loading ? 'Generating...' : '⚡ Regenerate Path'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }} id="phases">
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', fontFamily: 'var(--mono)', color: 'var(--cyan)' }}>
            <div className="spinning-loader" style={{ margin: '0 auto 12px' }} />
            Analyzing profile metrics and generating path via Gemini...
          </div>
        )}

        {!loading && phases.length === 0 && (
          <div className="muted" style={{ padding: '40px', textAlign: 'center', fontStyle: 'italic', fontFamily: 'var(--mono)' }}>
            // No roadmap path found. Click the Regenerate button to create one!
          </div>
        )}

        {!loading && phases.map((phase, pIdx) => {
          const isPhaseExpanded = expandedPhases.has(phase.title);
          const phaseDays = phase.days || [];
          const phaseCompleted = phaseDays.filter(d => d.status === 'completed').length;
          const phaseProgress = phaseDays.length > 0 ? Math.round((phaseCompleted / phaseDays.length) * 100) : 0;

          return (
            <div key={pIdx} style={{ marginBottom: '14px', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-2)' }}>
              <div
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: 'var(--panel-2)', userSelect: 'none' }}
                onClick={() => togglePhase(phase.title)}
              >
                <span style={{ color: 'var(--cyan)', fontFamily: 'var(--mono)', fontSize: '10px' }}>
                  {isPhaseExpanded ? '▼' : '▶'}
                </span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <strong style={{ fontSize: '12px', color: 'var(--text)' }}>{phase.title}</strong>
                  {phase.description && <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{phase.description}</div>}
                </div>
                <span className="badge" style={{ fontSize: '9px', borderColor: 'var(--green)', color: 'var(--green)' }}>{phaseProgress}%</span>
              </div>

              {isPhaseExpanded && (
                <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {phaseDays.length === 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic', padding: '8px' }}>
                      No days defined in this phase.
                    </div>
                  )}

                  {phaseDays.map((dObj) => {
                    const isDayExpanded = expandedDays.has(dObj.day);
                    const isActiveDay = dObj.day === currentDay;
                    
                    let statusColor = 'var(--muted)';
                    let borderLeftStyle = '4px solid var(--border)';
                    let dayBg = 'transparent';
                    if (dObj.status === 'completed') {
                      statusColor = 'var(--green)';
                      borderLeftStyle = '4px solid var(--green)';
                      dayBg = 'rgba(52, 211, 153, 0.02)';
                    } else if (dObj.status === 'skipped') {
                      statusColor = 'var(--amber)';
                      borderLeftStyle = '4px solid var(--amber)';
                      dayBg = 'rgba(245, 158, 11, 0.02)';
                    } else if (isActiveDay) {
                      statusColor = 'var(--cyan)';
                      borderLeftStyle = '4px solid var(--cyan)';
                      dayBg = 'rgba(6, 182, 212, 0.05)';
                    }

                    return (
                      <div 
                        key={dObj.day} 
                        style={{ 
                          border: '1px solid var(--border)', 
                          borderLeft: borderLeftStyle,
                          borderRadius: '6px', 
                          background: dayBg, 
                          overflow: 'hidden'
                        }}
                      >
                        <div 
                          style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => toggleDay(dObj.day)}
                        >
                          <span style={{ color: statusColor, fontFamily: 'var(--mono)', fontSize: '10px' }}>
                            {isDayExpanded ? '▼' : '▶'}
                          </span>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: '600', color: isActiveDay ? 'var(--cyan)' : 'var(--text)' }}>
                              Day {dObj.day}: {dObj.title}
                            </span>
                            {isActiveDay && <span className="badge" style={{ fontSize: '8px', padding: '0px 4px', background: 'var(--cyan)', color: '#000', border: 'none', fontWeight: 'bold' }}>ACTIVE</span>}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {dObj.estimated_time && (
                              <span style={{ fontSize: '9.5px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginRight: '6px' }}>
                                ⏱ {dObj.estimated_time}m
                              </span>
                            )}
                            <span 
                              className="badge" 
                              style={{ 
                                fontSize: '8.5px', 
                                color: statusColor, 
                                borderColor: statusColor,
                                textTransform: 'uppercase'
                              }}
                            >
                              {dObj.status || 'pending'}
                            </span>
                          </div>
                        </div>

                        {isDayExpanded && (
                          <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid var(--border)', fontSize: '11px', textAlign: 'left' }}>
                            {dObj.explanation && (
                              <div style={{ margin: '12px 0 10px', lineHeight: '1.5', color: 'var(--text)', background: 'var(--panel-2)', padding: '10px', borderRadius: '4px', borderLeft: '2px solid var(--accent)' }}>
                                {dObj.explanation}
                              </div>
                            )}

                            {dObj.topics && dObj.topics.length > 0 && (
                              <div style={{ margin: '12px 0' }}>
                                <strong style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>✓ KEY SUBJECTS</strong>
                                <ul style={{ margin: '6px 0 0 16px', padding: 0, listStyleType: 'square', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {dObj.topics.map((t, idx) => (
                                    <li key={idx} style={{ color: 'var(--text)' }}>{t}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {dObj.commands && dObj.commands.length > 0 && (
                              <div style={{ margin: '12px 0' }}>
                                <strong style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>📟 ESSENTIAL COMMANDS</strong>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden', marginTop: '6px' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', fontFamily: 'var(--mono)' }}>
                                    <thead>
                                      <tr style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)', width: '35%' }}>COMMAND</th>
                                        <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)' }}>DESCRIPTION</th>
                                        <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--muted)', width: '12%' }}>ACTION</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dObj.commands.map((cmdObj, idx) => (
                                        <tr key={idx} style={{ borderBottom: idx < dObj.commands.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                          <td style={{ padding: '6px 8px', color: 'var(--cyan)', fontWeight: 'bold' }}>{cmdObj.cmd}</td>
                                          <td style={{ padding: '6px 8px', color: 'var(--text)' }}>{cmdObj.desc}</td>
                                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                            <button 
                                              className="btn-ghost" 
                                              style={{ padding: '2px 6px', fontSize: '9px' }} 
                                              onClick={() => copyToClipboard(cmdObj.cmd, 'Command copied!')}
                                            >
                                              Copy
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {dObj.setup_script && (
                              <div style={{ margin: '12px 0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyTarget: 'space-between', marginBottom: '4px' }}>
                                  <strong style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>⚙ SANDBOX SETUP SCRIPT</strong>
                                  <button 
                                    className="btn-ghost" 
                                    style={{ padding: '2px 8px', fontSize: '9.5px' }}
                                    onClick={() => copyToClipboard(dObj.setup_script, 'Setup script copied!')}
                                  >
                                    📋 Copy Script
                                  </button>
                                </div>
                                <pre style={{ background: '#0a0d10', color: 'var(--green)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: '10px', overflowX: 'auto', maxHeight: '120px', margin: 0, whiteSpace: 'pre-wrap' }}>
                                  {dObj.setup_script}
                                </pre>
                              </div>
                            )}

                            {dObj.resources && dObj.resources.length > 0 && (
                              <div style={{ margin: '12px 0' }}>
                                <strong style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>📚 STUDY RESOURCES</strong>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  {dObj.resources.map((resObj, idx) => (
                                    <a 
                                      key={idx} 
                                      href={resObj.url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="btn-ghost"
                                      style={{ padding: '4px 10px', fontSize: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      🔗 {resObj.title}
                                    </a>
                                  ))}
                                  {dObj.killercoda_url && (
                                    <a 
                                      href={dObj.killercoda_url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="btn-ghost"
                                      style={{ padding: '4px 10px', fontSize: '10px', textDecoration: 'none', color: 'var(--amber)', borderColor: 'rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      ⚡ KillerCoda Scenario
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {dObj.tasks && dObj.tasks.length > 0 && (
                              <div style={{ margin: '12px 0' }}>
                                <strong style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>🎯 DAILY QUESTS</strong>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                  {dObj.tasks.map((taskText, idx) => (
                                    <div 
                                      key={idx} 
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', borderRadius: '4px' }}
                                    >
                                      <span style={{ color: 'var(--text)' }}>• {taskText}</span>
                                      <button 
                                        className="btn-ghost" 
                                        style={{ padding: '2px 8px', fontSize: '9px', borderColor: 'var(--cyan)', color: 'var(--cyan)' }}
                                        onClick={() => addQuest(taskText, dObj.day, dObj.title)}
                                      >
                                        + Add Board
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '14px', justifyContent: 'flex-end' }}>
                              {dObj.status !== 'completed' && (
                                <button 
                                  className="btn-primary" 
                                  style={{ padding: '4px 12px', fontSize: '10px', background: 'var(--green)', borderColor: 'var(--green)', color: '#000', fontWeight: 'bold' }}
                                  onClick={() => updateDayStatus(dObj.day, 'completed')}
                                >
                                  ✓ Complete Day
                                </button>
                              )}
                              {dObj.status !== 'skipped' && dObj.status !== 'completed' && (
                                <button 
                                  className="btn-ghost" 
                                  style={{ padding: '4px 12px', fontSize: '10px', color: 'var(--amber)', borderColor: 'var(--amber)' }}
                                  onClick={() => updateDayStatus(dObj.day, 'skipped')}
                                >
                                  ⤼ Skip Day
                                </button>
                              )}
                              {(dObj.status === 'completed' || dObj.status === 'skipped') && (
                                <button 
                                  className="btn-ghost" 
                                  style={{ padding: '4px 12px', fontSize: '10px', color: 'var(--red)', borderColor: 'var(--red)' }}
                                  onClick={() => updateDayStatus(dObj.day, 'pending')}
                                >
                                  ↺ Reset Day
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────────────
   PANEL: GLOBAL SEARCH & REPLACE
─────────────────────────────── */
function SearchPanel() {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('');
  const [opts, setOpts] = useState({ case: false, word: false, regex: false });

  const toggleOpt = (k) => setOpts(p => ({ ...p, [k]: !p[k] }));

  const runSearch = async () => {
    if (!query.trim()) return;
    setStatus('Searching…');
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, matchCase: opts.case, wholeWord: opts.word, useRegex: opts.regex }),
      });
      const d = await res.json();
      setResults(d.results || []);
      setStatus(`${d.total || 0} matches in ${d.files || 0} files`);
    } catch { setStatus('Search failed'); }
  };

  const runReplace = async () => {
    if (!query.trim()) return;
    setStatus('Replacing…');
    try {
      const res = await fetch('/api/search/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, replacement, matchCase: opts.case, wholeWord: opts.word, useRegex: opts.regex }),
      });
      const d = await res.json();
      setStatus(`Replaced ${d.count || 0} occurrences`);
      setResults([]);
    } catch { setStatus('Replace failed'); }
  };

  const OPT_BTNS = [
    ['case', 'Aa', 'Match Case'],
    ['word', 'ab', 'Match Whole Word'],
    ['regex', '.*', 'Use Regular Expression'],
  ];

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-head">
        <h2>Find &amp; Replace in All Files</h2>
        <div className="hud">
          <span className="hud-pill"><i className="dot dot-green" /> NOTEPAD++ ENGINE</span>
        </div>
      </div>
      <div style={{ padding: '12px 0' }}>
        <label style={{ marginBottom: 6 }}>Find</label>
        <div className="form-row" style={{ marginBottom: 10 }}>
          <input id="global-search-input" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder="Text to search…" autoComplete="off" />
          <button className="btn-primary" id="global-search-btn"
            style={{ padding: '6px 14px', fontSize: 11 }} onClick={runSearch}>Search</button>
        </div>
        <label style={{ marginBottom: 6 }}>Replace With</label>
        <div className="form-row" style={{ marginBottom: 10 }}>
          <input id="global-replace-input" value={replacement} onChange={e => setReplacement(e.target.value)}
            placeholder="Replacement text…" autoComplete="off" />
          <button className="btn-ghost" id="global-replace-btn"
            style={{ padding: '6px 14px', fontSize: 11, color: 'var(--red)', borderColor: 'rgba(255,77,109,0.3)' }}
            onClick={runReplace}>Replace All</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {OPT_BTNS.map(([k, label, title]) => (
            <button key={k} title={title} onClick={() => toggleOpt(k)}
              style={{
                padding: '3px 8px', border: `1px solid ${opts[k] ? 'var(--accent)' : 'var(--border)'}`,
                background: opts[k] ? 'rgba(59,130,246,0.15)' : 'transparent', borderRadius: 4,
                cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11,
                color: opts[k] ? 'var(--accent)' : 'var(--muted)',
              }}>{label}</button>
          ))}
          <span className="muted" id="global-search-status"
            style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10.5 }}>{status}</span>
        </div>
      </div>
      <div id="global-search-results" style={{ flex: 1, overflowY: 'auto' }}>
        {results.length === 0
          ? <div className="muted" style={{ textAlign: 'center', padding: '40px 0' }}>// Enter a query and run Search</div>
          : results.map((r, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--cyan)', marginBottom: 4, padding: '4px 8px', background: 'var(--panel-2)', borderRadius: 4 }}>
                📄 {r.file}
              </div>
              {r.matches?.map((m, j) => (
                <div key={j} style={{ padding: '3px 16px', fontFamily: 'var(--mono)', fontSize: 11 }}>
                  <span style={{ color: 'var(--muted)', marginRight: 8 }}>L{m.line}:</span>
                  <span dangerouslySetInnerHTML={{ __html: m.content }} />
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

function fmtNum(n) {
  if (n === undefined || n === null) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function drawBarChart(canvas, labels, values, colors, theme) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 400;
  const H = canvas.offsetHeight || 160;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const isLight = theme === 'light';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255,255,255,0.06)';
  const labelColor = isLight ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255,255,255,0.3)';
  const xAxisLabelColor = isLight ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255,255,255,0.45)';
  const emptyColor = isLight ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255,255,255,0.15)';

  if (!values.length || Math.max(...values) === 0) {
    ctx.fillStyle = emptyColor;
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No data yet — send a chat message', W / 2, H / 2);
    return;
  }

  const padding = { top: 16, right: 10, bottom: 36, left: 36 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;
  const maxVal = Math.max(...values) * 1.15 || 1;
  const barGap = 10;
  const barW = Math.max(12, (chartW - (labels.length - 1) * barGap) / labels.length);

  // Grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(padding.left + chartW, y); ctx.stroke();
    ctx.fillStyle = labelColor;
    ctx.font = `9px JetBrains Mono, monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(fmtNum(Math.round(maxVal * (1 - i / 4))), padding.left - 4, y + 3);
  }

  // Bars
  labels.forEach((label, i) => {
    const barX = padding.left + i * (barW + barGap);
    const barH = (values[i] / maxVal) * chartH;
    const barY = padding.top + chartH - barH;
    const color = colors[i % colors.length];

    // Gradient fill
    const grad = ctx.createLinearGradient(0, barY, 0, barY + barH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '44');
    ctx.fillStyle = grad;

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = isLight ? 1 : 8;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Value on top of bar
    ctx.fillStyle = color;
    ctx.font = `bold 9px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(fmtNum(values[i]), barX + barW / 2, barY - 3);

    // X-axis label
    ctx.fillStyle = xAxisLabelColor;
    ctx.font = `9px JetBrains Mono, monospace`;
    const shortLabel = label.length > 14 ? label.slice(0, 12) + '…' : label;
    ctx.save();
    ctx.translate(barX + barW / 2, padding.top + chartH + 6);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = 'right';
    ctx.fillText(shortLabel, 0, 0);
    ctx.restore();
  });
}

function drawDailyChart(canvas, days, messages, theme) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 500;
  const H = canvas.offsetHeight || 140;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padding = { top: 14, right: 10, bottom: 30, left: 32 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  const isLight = theme === 'light';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255,255,255,0.05)';
  const labelColor = isLight ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255,255,255,0.25)';
  const dayLabelColor = isLight ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255,255,255,0.35)';
  const emptyColor = isLight ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255,255,255,0.15)';
  
  const isNeon = theme === 'neon';
  const isDevil = theme === 'devil';
  const chartColor = isLight ? '#4f46e5' : (isNeon ? '#34d399' : (isDevil ? '#f4f4f5' : '#6366f1'));
  const chartColorLight = isLight ? 'rgba(79, 70, 229, 0.15)' : (isNeon ? '#34d39933' : (isDevil ? 'rgba(244, 244, 245, 0.15)' : 'rgba(99, 102, 241, 0.15)'));
  const chartLineColor = isLight ? '#4f46e5cc' : (isNeon ? '#34d399bb' : (isDevil ? '#f4f4f5cc' : '#6366f1cc'));

  if (!messages.length || Math.max(...messages) === 0) {
    ctx.fillStyle = emptyColor;
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No activity in the last 14 days', W / 2, H / 2);
    return;
  }

  const maxVal = Math.max(...messages) * 1.2 || 1;
  const barW = Math.max(8, chartW / days.length - 4);
  const barGap = (chartW - barW * days.length) / (days.length - 1 || 1);

  // Grid lines
  ctx.strokeStyle = gridColor;
  for (let i = 0; i <= 3; i++) {
    const y = padding.top + (chartH / 3) * i;
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(padding.left + chartW, y); ctx.stroke();
    ctx.fillStyle = labelColor;
    ctx.font = `9px JetBrains Mono, monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(fmtNum(Math.round(maxVal * (1 - i / 3))), padding.left - 4, y + 3);
  }

  const points = [];
  days.forEach((day, i) => {
    const x = padding.left + i * (barW + barGap);
    const bH = (messages[i] / maxVal) * chartH;
    const y = padding.top + chartH - bH;

    const grad = ctx.createLinearGradient(0, y, 0, y + bH);
    grad.addColorStop(0, chartColor);
    grad.addColorStop(1, chartColorLight);
    ctx.shadowColor = chartColor; ctx.shadowBlur = isLight ? 1 : 6;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bH, 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    points.push({ x: x + barW / 2, y });

    if (i % 2 === 0) {
      ctx.fillStyle = dayLabelColor;
      ctx.font = `8.5px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      const d = day ? day.slice(5) : '';
      ctx.fillText(d, x + barW / 2, padding.top + chartH + 14);
    }
  });

  if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const cpx = (points[i - 1].x + points[i].x) / 2;
      ctx.bezierCurveTo(cpx, points[i - 1].y, cpx, points[i].y, points[i].x, points[i].y);
    }
    ctx.strokeStyle = chartLineColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = chartColor; ctx.shadowBlur = isLight ? 1 : 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = chartColor;
      ctx.shadowColor = chartColor; ctx.shadowBlur = isLight ? 1 : 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }
}

function drawDonutChart(canvas, values, labels, colors, theme) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 140;
  const H = canvas.offsetHeight || 140;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const isLight = theme === 'light';
  const emptyColor = isLight ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255,255,255,0.15)';
  const donutHoleBg = isLight ? '#ffffff' : '#0c0f12';
  const donutCenterText = isLight ? '#0f172a' : '#ffffff';
  const donutTotalLabel = isLight ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255,255,255,0.4)';

  const total = values.reduce((a, b) => a + b, 0);
  if (!total) {
    ctx.fillStyle = emptyColor;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No data', W / 2, H / 2 + 4);
    return;
  }

  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 10, innerR = r * 0.55;
  let startAngle = -Math.PI / 2;

  values.forEach((v, i) => {
    if (!v) return;
    const sweep = (v / total) * Math.PI * 2;
    const color = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isLight ? 1 : 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    startAngle += sweep;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = donutHoleBg;
  ctx.fill();

  ctx.fillStyle = donutCenterText;
  const labelFont = isLight ? 'bold 13px Inter, monospace' : 'bold 13px Orbitron, monospace';
  ctx.font = labelFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtNum(total), cx, cy);
  ctx.font = `9px JetBrains Mono, monospace`;
  ctx.fillStyle = donutTotalLabel;
  ctx.fillText('total', cx, cy + 14);
  ctx.textBaseline = 'alphabetic';
}

function TerminalStats({ theme }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ name: '', goal: '', target: 240, startDate: '2025-09-01' });

  const dailyCanvasRef = useRef(null);
  const modelsCanvasRef = useRef(null);
  const keysCanvasRef = useRef(null);
  const roleCanvasRef = useRef(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/stats');
      setStats(await r.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    fetch('/api/profile').then(r => r.json()).then(d => { if (d) setProfile(d); }).catch(() => {});
  }, [fetchStats]);

  useEffect(() => {
    if (!stats) return;

    // Daily activity
    const dayMap = {};
    (stats.daily_activity || []).forEach(r => { dayMap[r.day] = r.messages; });
    const today = new Date();
    const dailyDays = [], dailyMsgs = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      dailyDays.push(key);
      dailyMsgs.push(dayMap[key] || 0);
    }
    drawDailyChart(dailyCanvasRef.current, dailyDays, dailyMsgs, theme);

    // Palettes
    const isLight = theme === 'light';
    const isNeon = theme === 'neon';
    const isDevil = theme === 'devil';

    const STATS_PALETTE_LIGHT = ['#4f46e5', '#10b981', '#f59e0b', '#d946ef', '#0ea5e9', '#ef4444', '#8b5cf6', '#ec4899'];
    const STATS_PALETTE_NEON = ['#34d399', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'];
    const STATS_PALETTE_SLATE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e'];
    const STATS_PALETTE_DEVIL = ['#f4f4f5', '#e4e4e7', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b'];
    const palette = isLight ? STATS_PALETTE_LIGHT : (isNeon ? STATS_PALETTE_NEON : (isDevil ? STATS_PALETTE_DEVIL : STATS_PALETTE_SLATE));

    // Model Distribution
    const modelLabels = (stats.model_distribution || []).map(m => m.model || 'Unknown');
    const modelReqs = (stats.model_distribution || []).map(m => m.requests);
    drawBarChart(modelsCanvasRef.current, modelLabels, modelReqs, palette, theme);

    // Keys Workload
    const keyLabels = (stats.key_workload || []).map(k => k.label || k.masked || 'Key');
    const keyReqs = (stats.key_workload || []).map(k => k.requests);
    const KEY_COLORS = isLight 
      ? ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6'] 
      : (isNeon ? ['#38bdf8', '#60a5fa', '#a78bfa', '#f472b6'] : (isDevil ? ['#f4f4f5', '#cbd5e1', '#94a3b8', '#475569'] : ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6']));
    drawBarChart(keysCanvasRef.current, keyLabels, keyReqs, KEY_COLORS, theme);

    // Role Split
    const userCount = stats.role_split?.user || 0;
    const aiCount = stats.role_split?.assistant || 0;
    const donutColors = isLight 
      ? ['#10b981', '#4f46e5'] 
      : (isNeon ? ['#34d399', '#38bdf8'] : (isDevil ? ['#f4f4f5', '#475569'] : ['#10b981', '#6366f1']));
    drawDonutChart(roleCanvasRef.current, [userCount, aiCount], ['User', 'AI'], donutColors, theme);

  }, [stats, theme]);

  const saveProfile = async () => {
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
    } catch {}
  };

  const getInsights = () => {
    let peakDay = 'None';
    let peakMsgs = 0;
    if (stats?.daily_activity && stats.daily_activity.length > 0) {
      stats.daily_activity.forEach(r => {
        if (r.messages > peakMsgs) {
          peakMsgs = r.messages;
          peakDay = r.day;
        }
      });
    }
    const savingsStr = typeof stats?.est_savings === 'number' ? stats.est_savings.toFixed(3) : '0.000';
    const avgTokensStr = typeof stats?.avg_tokens === 'number' ? stats.avg_tokens.toFixed(1) : '0.0';
    const activeSessStr = typeof stats?.active_sessions_count === 'number' ? stats.active_sessions_count : '0';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
          <span className="muted" style={{ fontSize: 10 }}>TOKEN EFFICIENCY</span>
          <span style={{ color: 'var(--cyan)', fontWeight: 'bold', fontSize: 11 }}>{avgTokensStr} tok/msg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
          <span className="muted" style={{ fontSize: 10 }}>CLOUD COST SAVED</span>
          <span style={{ color: 'var(--green)', fontWeight: 'bold', fontSize: 11 }}>${savingsStr}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
          <span className="muted" style={{ fontSize: 10 }}>ACTIVE SESSIONS</span>
          <span style={{ color: 'var(--amber)', fontWeight: 'bold', fontSize: 11 }}>{activeSessStr} active</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
          <span className="muted" style={{ fontSize: 10 }}>PEAK ACTIVITY DAY</span>
          <span style={{ color: 'var(--magenta)', fontWeight: 'bold', fontSize: 11 }}>{peakDay} ({peakMsgs} msg)</span>
        </div>
      </div>
    );
  };

  const renderTokenBars = () => {
    if (!stats || !stats.model_distribution || stats.model_distribution.length === 0) {
      return <div style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>No token data yet</div>;
    }
    const maxTok = Math.max(...stats.model_distribution.map(m => m.tokens), 1);
    const progressBg = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    const isLight = theme === 'light';
    const isNeon = theme === 'neon';
    const isDevil = theme === 'devil';

    const STATS_PALETTE_LIGHT = ['#4f46e5', '#10b981', '#f59e0b', '#d946ef', '#0ea5e9', '#ef4444', '#8b5cf6', '#ec4899'];
    const STATS_PALETTE_NEON = ['#34d399', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'];
    const STATS_PALETTE_SLATE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e'];
    const STATS_PALETTE_DEVIL = ['#f4f4f5', '#e4e4e7', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b'];
    const palette = isLight ? STATS_PALETTE_LIGHT : (isNeon ? STATS_PALETTE_NEON : (isDevil ? STATS_PALETTE_DEVIL : STATS_PALETTE_SLATE));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stats.model_distribution.map((m, i) => {
          const pct = maxTok > 0 ? Math.max(2, (m.tokens / maxTok) * 100) : 0;
          const color = palette[i % palette.length];
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--mono)', marginBottom: 4 }}>
                <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{m.model || 'Unknown'}</span>
                <span style={{ color: color, fontWeight: 'bold' }}>{fmtNum(m.tokens)} tok</span>
              </div>
              <div style={{ height: 8, background: progressBg, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 4, boxShadow: `0 0 6px ${color}55`, transition: 'width 0.6s ease' }}></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const isLight = theme === 'light';
  const isNeon = theme === 'neon';
  const isDevil = theme === 'devil';

  const STATS_PALETTE_LIGHT = ['#4f46e5', '#10b981', '#f59e0b', '#d946ef', '#0ea5e9', '#ef4444', '#8b5cf6', '#ec4899'];
  const STATS_PALETTE_NEON = ['#34d399', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'];
  const STATS_PALETTE_SLATE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e'];
  const STATS_PALETTE_DEVIL = ['#f4f4f5', '#e4e4e7', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b'];
  const palette = isLight ? STATS_PALETTE_LIGHT : (isNeon ? STATS_PALETTE_NEON : (isDevil ? STATS_PALETTE_DEVIL : STATS_PALETTE_SLATE));
  
  const KEY_COLORS = isLight 
    ? ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6'] 
    : (isNeon ? ['#38bdf8', '#60a5fa', '#a78bfa', '#f472b6'] : (isDevil ? ['#f4f4f5', '#cbd5e1', '#94a3b8', '#475569'] : ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6']));

  const donutColors = isLight 
    ? ['#10b981', '#4f46e5'] 
    : (isNeon ? ['#34d399', '#38bdf8'] : (isDevil ? ['#f4f4f5', '#475569'] : ['#10b981', '#6366f1']));

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingBottom: 20 }}>
      {/* Top stat boxes */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { id: 'stat-hours',       num: stats?.study_hours     ?? '0.0', label: 'Study Hours'      },
          { id: 'stat-quests',      num: stats?.completed_quests ?? '0',  label: 'Completed Quests' },
          { id: 'stat-streak',      num: (stats?.streak         ?? '0') + '🔥', label: 'Daily Streak' },
          { id: 'stat-consistency', num: (stats?.consistency    ?? '0') + '%',  label: 'Consistency'  },
        ].map(s => (
          <div key={s.id} className="stat-card" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 18, textAlign: 'center' }}>
            <div id={s.id} className="stat-num" style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>{s.num}</div>
            <div className="stat-label" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* Profile editor */}
        <div className="card">
          <div className="card-head"><h3>Profile Editor</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
            <label>Display name
              <input id="profile-name" value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </label>
            <label>Career goal
              <input id="profile-goal" value={profile.goal}
                onChange={e => setProfile(p => ({ ...p, goal: e.target.value }))} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <label>Daily target (min)
              <input id="profile-target" type="number" value={profile.target}
                onChange={e => setProfile(p => ({ ...p, target: e.target.value }))} />
            </label>
            <label>Start date
              <input id="profile-start-date" type="date" value={profile.startDate}
                onChange={e => setProfile(p => ({ ...p, startDate: e.target.value }))} />
            </label>
          </div>
          <button className="btn-primary" id="profile-save" style={{ width: '100%' }} onClick={saveProfile}>
            Save Profile
          </button>
        </div>

        {/* KPI row */}
        <div className="card">
          <div className="card-head">
            <h3>API &amp; Token Metrics</h3>
            <button className="btn-ghost" id="stats-refresh-btn"
              style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }} onClick={fetchStats}>
              <span id="stats-refresh-icon">{loading ? '↻' : '⟳'}</span> Refresh Data
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} id="stats-kpi-row">
            {[
              { label: 'TOTAL MESSAGES', value: stats?.total_messages ?? '—', sub: 'exchanges logged' },
              { label: 'EST. TOKENS USED', value: stats?.total_tokens ?? '—',  sub: '≈ chars ÷ 4'    },
              { label: 'ACTIVE MODELS',  value: stats?.model_distribution?.length  ?? '—', sub: 'model variants'  },
              { label: 'API KEYS ACTIVE', value: stats?.key_workload?.length   ?? '—', sub: 'registered keys'  },
            ].map(k => (
              <div key={k.label} style={{ textAlign: 'center', padding: '12px', background: 'var(--panel-2)', borderRadius: 6 }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: 1.5, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--accent)', fontWeight: 700 }}>{k.value}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14, marginBottom: 20 }}>
        {/* Daily message volume */}
        <div className="card">
          <div className="card-head">
            <h3>Daily Conversation Volume</h3>
            <span className="badge" style={{ fontSize: 9 }}>last 14 days</span>
          </div>
          <div style={{ position: 'relative', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <canvas ref={dailyCanvasRef} height="140" style={{ width: '100%', height: '140px' }}></canvas>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* Model distribution */}
        <div className="card">
          <div className="card-head">
            <h3>Model Requests Split</h3>
            <span className="badge" style={{ fontSize: 9 }}>by messages</span>
          </div>
          <div style={{ position: 'relative', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <canvas ref={modelsCanvasRef} height="160" style={{ width: '100%', height: '160px' }}></canvas>
          </div>
          <div id="model-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 9, fontFamily: 'var(--mono)', marginTop: 8, justifyContent: 'center' }}>
            {(stats?.model_distribution || []).map((m, i) => (
              <span key={i} style={{ color: palette[i % palette.length] }}>■ {m.model || 'Unknown'}: {m.requests} req</span>
            ))}
          </div>
        </div>

        {/* Key workload */}
        <div className="card">
          <div className="card-head">
            <h3>API Key Workload</h3>
            <span className="badge" style={{ fontSize: 9 }}>by requests</span>
          </div>
          <div style={{ position: 'relative', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <canvas ref={keysCanvasRef} height="160" style={{ width: '100%', height: '160px' }}></canvas>
          </div>
          <div id="key-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 9, fontFamily: 'var(--mono)', marginTop: 8, justifyContent: 'center' }}>
            {(stats?.key_workload || []).map((k, i) => (
              <span key={i} style={{ color: KEY_COLORS[i % KEY_COLORS.length] }}>■ {k.label || k.masked}: {k.requests} req</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* Role distribution */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-head">
            <h3>Role Distribution</h3>
            <span className="badge" style={{ fontSize: 9 }}>user vs assistant</span>
          </div>
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: '10px 0' }}>
            <canvas ref={roleCanvasRef} width="140" height="140" style={{ width: '140px', height: '140px' }}></canvas>
            <div id="role-legend" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, fontFamily: 'var(--mono)' }}>
              <span style={{ color: donutColors[0] }}>■ User: {stats?.role_split?.user || 0}</span>
              <span style={{ color: donutColors[1] }}>■ AI: {stats?.role_split?.assistant || 0}</span>
            </div>
          </div>
        </div>

        {/* Token per Model & Advanced Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="card-head"><h3>Token Usage per Model</h3></div>
            <div id="token-model-bars">{renderTokenBars()}</div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Advanced Insights</h3></div>
            <div id="advanced-insights-content">{getInsights()}</div>
          </div>
        </div>
      </div>

      {/* Sessions table */}
      {stats?.top_sessions?.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-head">
            <h3 style={{ fontSize: 12, letterSpacing: 1 }}>TOP SESSIONS</h3>
            <span className="badge" style={{ fontSize: 9 }}>by volume</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['SESSION ID', 'MSGS', '~TOKENS'].map(h => (
                  <th key={h} style={{ padding: '6px 6px', color: 'var(--muted)', fontSize: 9, textAlign: h === 'SESSION ID' ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody id="sessions-table-body">
              {stats.top_sessions.slice(0, 10).map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 6px', color: 'var(--cyan)' }}>{s.session?.slice(0, 8)}…</td>
                  <td style={{ padding: '6px 6px', textAlign: 'right' }}>{s.messages}</td>
                  <td style={{ padding: '6px 6px', textAlign: 'right' }}>{s.tokens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ textAlign: 'right', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 4 }}>
        <span id="stats-last-updated">
          {stats ? `// Last updated: ${new Date().toLocaleTimeString()}` : '// Not yet loaded'}
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────────────
   PANEL: NOTIFICATIONS
─────────────────────────────── */
function NotificationsPanel({ notifications, onClear, activeSubTab, setActiveSubTab }) {
  const [rawLogs, setRawLogs] = useState('Loading logs...');
  const logsEndRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs/raw?limit=150');
      const text = await res.text();
      setRawLogs(text || 'No logs available.');
    } catch (err) {
      setRawLogs(`Failed to load logs: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === 'logs') {
      fetchLogs();
      const interval = setInterval(fetchLogs, 2500);
      return () => clearInterval(interval);
    }
  }, [activeSubTab, fetchLogs]);

  useEffect(() => {
    if (activeSubTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rawLogs, activeSubTab]);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '15px' }}>
          <h2 
            style={{ 
              cursor: 'pointer', 
              opacity: activeSubTab === 'notifications' ? 1 : 0.5,
              borderBottom: activeSubTab === 'notifications' ? '2px solid var(--cyan)' : 'none',
              paddingBottom: '4px'
            }}
            onClick={() => setActiveSubTab('notifications')}
          >
            Notifications
          </h2>
          <h2 
            style={{ 
              cursor: 'pointer', 
              opacity: activeSubTab === 'logs' ? 1 : 0.5,
              borderBottom: activeSubTab === 'logs' ? '2px solid var(--cyan)' : 'none',
              paddingBottom: '4px'
            }}
            onClick={() => setActiveSubTab('logs')}
          >
            Live Server Logs
          </h2>
        </div>
        {activeSubTab === 'notifications' ? (
          <button className="btn-ghost"
            style={{ fontSize: 10, color: 'var(--red)', borderColor: 'rgba(255,77,109,.3)' }}
            onClick={onClear}>✕ Clear All</button>
        ) : (
          <button className="btn-ghost"
            style={{ fontSize: 10, color: 'var(--cyan)', borderColor: 'rgba(6,182,212,.3)' }}
            onClick={fetchLogs}>↻ Refresh</button>
        )}
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px 0' }}>
        {activeSubTab === 'notifications' ? (
          notifications.length === 0
            ? <div className="muted" style={{ padding: '30px', textAlign: 'center', fontStyle: 'italic' }}>No new notifications</div>
            : notifications.map((n, i) => (
              <div key={i} style={{ marginBottom: 8, padding: '10px 12px', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 6, borderLeft: `3px solid ${n.type === 'error' ? 'var(--red)' : n.type === 'warn' ? 'var(--amber)' : 'var(--cyan)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{n.time}</span>
                  <span className="badge" style={{ fontSize: 9, color: n.type === 'error' ? 'var(--red)' : n.type === 'warn' ? 'var(--amber)' : 'var(--cyan)' }}>
                    {(n.type || 'INFO').toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 12 }}>{n.message}</div>
              </div>
            ))
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <pre style={{
              flex: 1,
              background: '#090d16',
              color: '#a9b1d6',
              padding: '12px',
              borderRadius: '6px',
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              lineHeight: '1.4',
              overflow: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              border: '1px solid var(--border)',
              maxHeight: 'calc(100vh - 250px)'
            }}>
              {rawLogs}
              <div ref={logsEndRef} />
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────
   PANEL: LINKEDIN DRAFTS
─────────────────────────────── */
function LinkedInPanel() {
  const [drafts, setDrafts] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [refiningId, setRefiningId] = useState(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const loadDrafts = useCallback(() => {
    fetch('/api/linkedin/drafts').then(r => r.json()).then(d => setDrafts(d.drafts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadDrafts();
    window.addEventListener('devhunt-refresh-linkedin', loadDrafts);
    return () => {
      window.removeEventListener('devhunt-refresh-linkedin', loadDrafts);
    };
  }, [loadDrafts]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/linkedin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const d = await res.json();
      if (d.content) {
        const nd = { id: Date.now(), content: d.content, created: new Date().toISOString() };
        setDrafts(prev => [nd, ...prev]);
      }
    } catch {}
    setGenerating(false);
  };

  const saveDraft = async () => {
    await fetch('/api/linkedin/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, content: editText }),
    });
    setDrafts(prev => prev.map(d => d.id === editingId ? { ...d, content: editText } : d));
    setEditingId(null);
    setEditText('');
  };

  const handleRefine = async (id, currentContent) => {
    if (!refinePrompt.trim()) return;
    setIsRefining(true);
    try {
      const res = await fetch('/api/linkedin/drafts/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentContent, refinement_prompt: refinePrompt })
      });
      const data = await res.json();
      if (data.success && data.refined_content) {
        const updateRes = await fetch(`/api/linkedin/drafts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: data.refined_content })
        });
        const updateData = await updateRes.json();
        if (updateData.success) {
          setDrafts(prev => prev.map(draft => draft.id === id ? { ...draft, content: data.refined_content } : draft));
          alert('✓ Draft refined and updated successfully!');
        } else {
          alert('✕ Failed to save refined draft: ' + updateData.error);
        }
        setRefiningId(null);
        setRefinePrompt('');
      } else {
        alert('✕ Refinement failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Network error refining draft');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card">
        <div className="card-head"><h2>LinkedIn Drafts</h2></div>
        <label>AI Post Generator</label>
        <div className="form-row">
          <input value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the post (e.g. 'Docker networking lesson')"
            onKeyDown={e => e.key === 'Enter' && generate()} />
          <button className="btn-primary" style={{ fontSize: 11, padding: '6px 14px', whiteSpace: 'nowrap' }}
            onClick={generate} disabled={generating}>
            {generating ? '⟳ Generating…' : '✦ Generate'}
          </button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="card-head"><h3>Saved Drafts ({drafts.length})</h3></div>
        {drafts.length === 0 && (
          <div className="muted" style={{ textAlign: 'center', padding: 20, fontStyle: 'italic' }}>
            No drafts yet — generate one above
          </div>
        )}
        {drafts.map(d => (
          <div key={d.id} style={{ marginBottom: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--panel-2)' }}>
            {editingId === d.id ? (
              <>
                <textarea value={editText} onChange={e => setEditText(e.target.value)}
                  rows={6} style={{ marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ fontSize: 11 }} onClick={saveDraft}>Save</button>
                  <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                  {d.content}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 9, fontFamily: 'var(--mono)' }}>
                    {new Date(d.created).toLocaleDateString()}
                  </span>
                  <button className="btn-ghost" style={{ fontSize: 10, marginLeft: 'auto' }}
                    onClick={() => { setEditingId(d.id); setEditText(d.content); }}>✎ Edit</button>
                  <button className="btn-ghost" style={{ fontSize: 10, color: 'var(--cyan)' }}
                    onClick={() => navigator.clipboard.writeText(d.content)}>📋 Copy</button>
                  <button className="btn-ghost" style={{ fontSize: 10, color: 'var(--amber)' }}
                    onClick={() => { setRefiningId(d.id); setRefinePrompt(''); }}>🪄 Refine</button>
                </div>
                {refiningId === d.id && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg-3)', borderRadius: '6px', border: '1px dashed var(--border)', textAlign: 'left' }}>
                    <label style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold' }}>Refine Draft with AI</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <input 
                        placeholder="e.g. 'Make it shorter', 'Add emojis', 'Make it more professional'..."
                        value={refinePrompt}
                        onChange={e => setRefinePrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRefine(d.id, d.content)}
                        style={{ flex: 1, fontSize: '11px', padding: '6px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', outline: 'none' }}
                      />
                      <button 
                        className="btn-primary" 
                        onClick={() => handleRefine(d.id, d.content)} 
                        disabled={isRefining}
                        style={{ fontSize: '10.5px', padding: '4px 12px' }}
                      >
                        {isRefining ? 'Refining...' : 'Refine'}
                      </button>
                      <button 
                        className="btn-ghost" 
                        onClick={() => { setRefiningId(null); setRefinePrompt(''); }} 
                        style={{ fontSize: '10.5px', padding: '4px 10px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────────
   PANEL: MUSIC PLAYER (full)
─────────────────────────────── */
function MusicPlayer({ musicState, musicControls }) {
  const fileInputRef = useRef(null);
  const [ytUrl, setYtUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // File Upload
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    for (const file of files) {
      musicControls.setUploadStatus(`↻ Uploading ${file.name}...`);
      const fd = new FormData();
      fd.append('file', file);
      try {
        const r = await fetch('/api/music/upload', { method: 'POST', body: fd });
        const contentType = r.headers.get("content-type");
        if (!r.ok || !contentType || !contentType.includes("application/json")) {
          const text = await r.text();
          musicControls.setUploadStatus(`✕ Upload failed (${r.status}): ${text.slice(0, 100) || 'Server error'}`);
          continue;
        }
        const d = await r.json();
        if (d.success) {
          musicControls.setUploadStatus(`✓ Added: ${d.track.title}`);
          await musicControls.loadTracks();
        } else {
          musicControls.setUploadStatus(`✕ ${d.error}`);
        }
      } catch (e) {
        musicControls.setUploadStatus(`✕ Upload failed: ${e.message}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files);
    }
  };

  // YouTube Convert
  const handleYtConvert = async () => {
    const url = ytUrl.trim();
    if (!url) return;
    musicControls.setYtLoading(true);
    musicControls.setYtStatus(`⏳ Downloading & converting audio… this may take 30–90s...`);
    try {
      const r = await fetch('/api/music/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const contentType = r.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const d = await r.json();
        if (d.success) {
          musicControls.setYtStatus(`✓ Added: ${d.youtube_title || d.track.title}`);
          setYtUrl('');
          await musicControls.loadTracks();
        } else {
          let errMsg = d.error || "Failed to convert URL";
          if (errMsg.toLowerCase().includes("not a valid url") || errMsg.toLowerCase().includes("invalid url")) {
            errMsg = "Please enter a valid YouTube URL";
          }
          musicControls.setYtStatus(`✕ ${errMsg}`);
        }
      } else {
        const text = await r.text();
        musicControls.setYtStatus(`✕ Error (${r.status}): ${text.slice(0, 100) || 'Invalid server response'}`);
      }
    } catch (e) {
      musicControls.setYtStatus(`✕ Network error: ${e.message}`);
    }
    musicControls.setYtLoading(false);
  };

  const getExtIcon = (ext) => {
    const icons = { '.mp3':'🎵', '.wav':'🎶', '.ogg':'🎼', '.flac':'🎸', '.aac':'🎤', '.m4a':'🎹', '.webm':'📻', '.opus':'🎙' };
    return icons[ext] || '♪';
  };

  // Filtering
  const filteredTracks = (musicState.tracks || []).filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProgressClick = (e) => {
    if (!musicState.rawDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    musicControls.seek(pct);
  };

  const progressPct = musicState.rawDuration 
    ? (musicState.currentTime / musicState.rawDuration) * 100 
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px', overflow: 'hidden' }}>
      
      {/* Top: Input Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', flexShrink: 0 }}>
        {/* Upload Audio File */}
        <div className="card" style={{ padding: '16px' }}>
          <div className="card-head" style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '12px', letterSpacing: '1px' }}>♪ UPLOAD AUDIO FILE</h3>
            <span className="badge" style={{ fontSize: '9px' }}>local</span>
          </div>
          <div 
            className="dropzone" 
            id="music-dropzone" 
            style={{ 
              padding: '20px 14px', 
              cursor: 'pointer', 
              borderRadius: '6px',
              border: dragActive ? '2px dashed var(--cyan)' : '1px dashed var(--border)',
              background: dragActive ? 'rgba(56, 189, 248, 0.05)' : 'rgba(0, 0, 0, 0.15)',
              textAlign: 'center'
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div style={{ fontSize: '26px', marginBottom: '6px' }}>{dragActive ? '📥' : '🎵'}</div>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', lineHeight: '1.4' }}>
              {dragActive ? "Drop to Upload!" : "Drop audio file here"}
              <br />
              <span className="muted" style={{ fontSize: '9.5px' }}>MP3, WAV, OGG, FLAC, AAC, M4A</span>
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              hidden 
              accept=".mp3,.wav,.ogg,.flac,.aac,.m4a,.opus" 
              multiple 
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>
          <div 
            style={{ 
              marginTop: '8px', 
              fontSize: '10.5px', 
              fontFamily: 'var(--mono)', 
              color: musicState.uploadStatus.startsWith('✓') ? 'var(--green)' : musicState.uploadStatus.startsWith('✕') ? 'var(--red)' : 'var(--cyan)', 
              minHeight: '16px' 
            }}
          >
            {musicState.uploadStatus}
          </div>
        </div>

        {/* YouTube Converter */}
        <div className="card" style={{ padding: '16px' }}>
          <div className="card-head" style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '12px', letterSpacing: '1px' }}>▶ YOUTUBE → AUDIO</h3>
            <span className="badge" style={{ fontSize: '9px' }}>convert</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input 
              placeholder="https://youtube.com/watch?v=..."
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleYtConvert()}
              style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '6px', padding: '9px 11px', background: 'rgba(0,0,0,0.35)', color: 'var(--text)', outline: 'none' }}
              disabled={musicState.ytLoading}
            />
            <button 
              className="btn-primary" 
              onClick={handleYtConvert}
              style={{ whiteSpace: 'nowrap', fontSize: '11px', padding: '0 14px' }}
              disabled={musicState.ytLoading}
            >
              {musicState.ytLoading ? 'Convert...' : '⬇ Convert'}
            </button>
          </div>
          <div 
            style={{ 
              fontSize: '10.5px', 
              fontFamily: 'var(--mono)', 
              color: musicState.ytStatus.startsWith('✓') ? 'var(--green)' : musicState.ytStatus.startsWith('✕') ? 'var(--red)' : 'var(--cyan)', 
              minHeight: '16px', 
              lineHeight: '1.5' 
            }}
          >
            {musicState.ytStatus}
          </div>
          <div
            style={{ 
              fontSize: '9.5px', 
              color: 'var(--muted)', 
              marginTop: '8px', 
              fontFamily: 'var(--mono)', 
              borderTop: '1px solid var(--border)', 
              paddingTop: '8px' 
            }}
          >
            ⚠ Requires <span style={{ color: 'var(--accent)' }}>ffmpeg</span> installed and in PATH.
          </div>
        </div>
      </div>

      {/* Playback Controls & Track Info card */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
        
        {/* Track Info Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Album Art Icon */}
          <div 
            className={`top-music-art ${musicState.playing ? 'spinning-art' : ''}`}
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              border: '2px solid var(--border)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '20px',
              background: 'var(--bg-2)',
              flexShrink: 0
            }}
          >
            {musicState.currentTrack ? getExtIcon(musicState.currentTrack.ext) : '♪'}
          </div>

          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div 
              style={{ 
                fontFamily: 'var(--display)', 
                fontSize: '13px', 
                fontWeight: 'bold', 
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {musicState.title}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
              {musicState.currentTrack 
                ? `${musicState.currentTrack.ext.toUpperCase().replace('.', '')} · ${musicState.currentTrack.size_kb >= 1024 ? (musicState.currentTrack.size_kb/1024).toFixed(1)+'MB' : musicState.currentTrack.size_kb+'KB'}`
                : "Hunt Terminal Music Player"
              }
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="music-btn" style={{ fontSize: '18px' }} onClick={musicControls.prev} title="Previous">⏮</button>
            <button 
              className="btn-primary"
              style={{ 
                fontSize: '14px', 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: 0
              }}
              onClick={musicControls.toggle}
              title="Play/Pause"
            >
              {musicState.playing ? '⏸' : '▶'}
            </button>
            <button className="music-btn" style={{ fontSize: '18px' }} onClick={musicControls.next} title="Next">⏭</button>
          </div>
        </div>

        {/* Progress Seek Track */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--muted)', width: '28px', textAlign: 'right' }}>
            {musicState.time}
          </span>
          <div 
            id="music-progress-track" 
            onClick={handleProgressClick}
            style={{ 
              flex: 1, 
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div 
              id="music-progress-fill" 
              style={{ 
                height: '100%', 
                width: `${progressPct}%`, 
                background: 'var(--green)',
                borderRadius: '4px',
                boxShadow: '0 0 8px var(--green)'
              }} 
            />
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--muted)', width: '28px' }}>
            {musicState.duration}
          </span>
        </div>

        {/* Mode Selector and Volume Controls Row */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '1px' }}>PLAYBACK MODE:</span>
          {['sequential', 'shuffle', 'repeat', 'repeat-all'].map(m => (
            <button 
              key={m}
              className={`btn-ghost music-mode-btn ${musicState.playMode === m ? 'active' : ''}`}
              onClick={() => musicControls.setPlayMode(m)}
              style={{ fontSize: '10px', padding: '4px 10px', textTransform: 'capitalize' }}
            >
              {m === 'sequential' && '⟶ Sequential'}
              {m === 'shuffle' && '⇌ Shuffle'}
              {m === 'repeat' && '↺ Repeat One'}
              {m === 'repeat-all' && '↻ Repeat All'}
            </button>
          ))}
          
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '9.5px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>VOL</span>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.02" 
              value={musicState.volume}
              onChange={(e) => musicControls.setVolume(parseFloat(e.target.value))}
              style={{ width: '80px', accentColor: 'var(--accent)' }} 
            />
            <span style={{ fontSize: '9.5px', color: 'var(--accent)', fontFamily: 'var(--mono)', width: '28px' }}>
              {Math.round(musicState.volume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom: Track Library */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div 
          className="card-head" 
          style={{ 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border)', 
            flexShrink: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '12px', letterSpacing: '1px' }}>TRACK LIBRARY</h3>
            <span className="badge" style={{ fontSize: '9px' }}>
              {musicState.tracks.length} track{musicState.tracks.length !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Enhanced Search Input */}
          <input 
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '180px', 
              fontSize: '11px', 
              padding: '4px 8px', 
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filteredTracks.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: '40px 0', fontFamily: 'var(--mono)', fontSize: '11px' }}>
              // No matching tracks found
            </div>
          ) : (
            filteredTracks.map((t, idx) => {
              const originalIdx = musicState.tracks.findIndex(x => x.filename === t.filename);
              const isActive = originalIdx === musicState.currentIndex;
              return (
                <div 
                  key={t.filename} 
                  className={`music-track-row ${isActive ? 'active' : ''}`}
                  onClick={() => musicControls.play(originalIdx)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '8px 10px', 
                    borderRadius: '5px', 
                    cursor: 'pointer',
                    marginBottom: '4px'
                  }}
                >
                  <div style={{ width: '28px', textAlign: 'center', fontSize: '14px', color: isActive ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}>
                    {isActive && musicState.playing ? '⏸' : isActive ? '▶' : (originalIdx + 1)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: isActive ? 'var(--cyan)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: '9.5px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: '2px' }}>
                      {t.ext.toUpperCase().replace('.', '')} · {t.size_kb >= 1024 ? (t.size_kb/1024).toFixed(1)+'MB' : t.size_kb+'KB'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => musicControls.play(originalIdx)}
                      className="btn-ghost"
                      style={{ border: '1px solid rgba(52,211,153,0.25)', color: 'var(--green)', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px' }}
                      title={isActive && musicState.playing ? "Pause" : "Play"}
                    >
                      {isActive && musicState.playing ? '⏸' : '▶'}
                    </button>
                    <a 
                      href={`/api/music/download/${encodeURIComponent(t.filename)}`}
                      className="btn-ghost"
                      style={{ border: '1px solid rgba(56,189,248,0.25)', color: 'var(--cyan)', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px', textDecoration: 'none', display: 'inline-block' }}
                      title="Download" 
                      download
                    >
                      ⬇
                    </a>
                    <button 
                      onClick={() => musicControls.deleteTrack(originalIdx)}
                      className="btn-ghost"
                      style={{ border: '1px solid rgba(255,77,109,0.25)', color: 'var(--red)', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px' }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────
   PANEL: STANDALONE TERMINAL
─────────────────────────────── */
/* ── Terminal Helpers ───────────────── */
export function playTerminalBeep(enabled) {
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
}

export function formatPrompt(cwd, settings) {
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
}

/* ───────────────────────────────
   PANEL: STANDALONE TERMINAL
─────────────────────────────── */
function StandaloneTerminal({ profileSettings, terminalCwd, setTerminalCwd, terminalHistory, setTerminalHistory }) {
  const [output, setOutput] = useState([
    { text: 'DevHunt Terminal Core v1.0', cls: 'ansi-cyan' },
    { text: 'Detected Environment: <span class="ansi-yellow" id="terminal-detected-os">Detecting platform...</span>', cls: '' },
    { text: 'Type <span class="ansi-green">hunt help</span> to see all available commands.', cls: '' },
    { text: '─'.repeat(80), cls: 'ansi-muted' },
  ]);
  const [input, setInput] = useState('');
  const [histIdx, setHistIdx] = useState(-1);
  const [osName, setOsName] = useState('Detecting platform...');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const initTerm = async () => {
      try {
        const res = await fetch('/api/terminal/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'hunt neofetch', cwd: '' })
        });
        const data = await res.json();
        if (data.success) {
          setTerminalCwd(data.cwd || '');
          let os = "Unknown Node";
          if (data.output.includes("Windows")) os = "Windows Node";
          else if (data.output.includes("Linux")) os = "Linux Node";
          else if (data.output.includes("Darwin")) os = "macOS Node";
          setOsName(os);
        }
      } catch (e) {
        console.error("Failed terminal greetings:", e);
        setOsName("Offline Node");
      }
    };
    initTerm();
  }, [setTerminalCwd]);

  useEffect(() => {
    if (osName !== 'Detecting platform...') {
      setOutput(prev => prev.map(line => {
        if (line.text.includes('Detecting platform...')) {
          return { ...line, text: `Detected Environment: <span class="ansi-yellow">${osName}</span>` };
        }
        return line;
      }));
    }
  }, [osName]);

  const promptStr = formatPrompt(terminalCwd, profileSettings);

  const mdEscape = (src) => {
    if (!src) return "";
    return src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  const runCmd = async () => {
    const cmd = input.trim();
    if (!cmd) return;
    
    setOutput(o => [...o, { text: `<span class="terminal-prompt">${promptStr}</span> <span class="ansi-cyan">${mdEscape(cmd)}</span>`, cls: '' }]);
    setTerminalHistory(h => [cmd, ...h]);
    setHistIdx(-1);
    setInput('');
    
    const trimmed = cmd.trim();
    if (trimmed.toLowerCase() === "clear" || trimmed.toLowerCase() === "hunt clear") {
      setOutput([]);
      return;
    }

    try {
      const res = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, cwd: terminalCwd }),
      });
      const d = await res.json();
      if (d.success) {
        if (d.output === "CLEAR_SIGNAL") {
          setOutput([]);
        } else {
          const lines = (d.output || '').split('\n');
          setOutput(o => [...o, ...lines.map(l => ({ text: l, cls: '' }))]);
        }
        if (d.cwd) {
          setTerminalCwd(d.cwd);
        }
      } else {
        setOutput(o => [...o, { text: `<span class="ansi-red">Error: ${mdEscape(d.error)}</span>`, cls: '' }]);
        playTerminalBeep(profileSettings?.terminal_sound);
      }
    } catch (err) {
      setOutput(o => [...o, { text: `<span class="ansi-red">Error: Connection lost to DevHunt core backend node.</span>`, cls: '' }]);
      playTerminalBeep(profileSettings?.terminal_sound);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') { 
      runCmd(); 
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (terminalHistory.length === 0) return;
      const ni = Math.min(histIdx + 1, terminalHistory.length - 1);
      setHistIdx(ni); 
      setInput(terminalHistory[ni] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const ni = Math.max(histIdx - 1, -1);
      setHistIdx(ni); 
      setInput(ni === -1 ? '' : terminalHistory[ni]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const val = input;
      const HUNT_COMMANDS = [
        "hunt help", "hunt neofetch", "hunt pwd", "hunt ls", "hunt cd",
        "hunt cat", "hunt mkdir", "hunt rm", "hunt ping", "hunt dns",
        "hunt dig", "hunt whois", "hunt ssl", "hunt headers", "hunt port",
        "hunt portscan", "hunt localports", "hunt myip", "hunt trace",
        "hunt subdomains", "hunt git", "hunt python", "hunt calc",
        "hunt quest", "hunt keys", "hunt memory", "hunt backup", "hunt history", "hunt stats", "hunt notifications", "hunt config", "hunt shortcut",
        "clear"
      ];
      if (!val) {
        setOutput(o => [...o, { text: `<span class="ansi-muted">Possible commands:<br/>  ${HUNT_COMMANDS.join('    ')}</span>`, cls: '' }]);
        return;
      }
      const matches = HUNT_COMMANDS.filter(c => c.startsWith(val.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0] + " ");
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
          setInput(lcp);
        } else {
          setOutput(o => [...o, { text: `<span class="ansi-muted">Possible commands:<br/>  ${matches.join('    ')}</span>`, cls: '' }]);
        }
      }
    }
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [output]);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0c0f12' }}>
      <div className="card-head" style={{ background: 'var(--bg-2)', marginBottom: 0, padding: '6px 12px' }}>
        <span style={{ fontWeight: 'bold', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11 }}>📟 HUNT TERMINAL</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ padding: '2px 6px', fontSize: 10 }}
            onClick={() => setOutput([{ text: '<span class="ansi-muted">Terminal cleared.</span>', cls: '' }])}>Clear</button>
        </div>
      </div>
      <div id="editor-terminal-body" onClick={() => inputRef.current?.focus()} style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.5, cursor: 'text' }}>
        <div id="editor-terminal-output">
          {output.map((line, i) => (
            <div 
              key={i} 
              className={`terminal-line ${line.cls || ''}`} 
              style={{
                color: line.cls === 'ansi-cyan' ? 'var(--cyan)' : line.cls === 'ansi-muted' ? 'var(--muted)' : line.cls === 'ansi-red' ? 'var(--red)' : '#fff',
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all',
              }}
              dangerouslySetInnerHTML={{ __html: line.text }}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="terminal-input-line" style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', borderTop: '1px solid var(--border)', background: '#080b0e' }}>
        <span id="editor-terminal-prompt" className="terminal-prompt"
          style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)', marginRight: 8, flexShrink: 0 }}>
          {promptStr}
        </span>
        <input 
          ref={inputRef}
          id="editor-terminal-input" 
          type="text" 
          className="terminal-input"
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={handleKey}
          autoComplete="off" 
          spellCheck={false} 
          placeholder="Enter command…"
          style={{ flex: 1, border: 'none', background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', outline: 'none', marginLeft: 6 }} 
        />
      </div>
    </div>
  );
}

/* ───────────────────────────────
   STATUS BAR
─────────────────────────────── */
function StatusBar({ activeTab, activeFilePath, theme }) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleOpenDocs = async (e) => {
    e.preventDefault();
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open('https://dev-hunt-local.netlify.app/docs.html');
    } catch (err) {
      window.open('https://dev-hunt-local.netlify.app/docs.html', '_blank');
    }
  };

  return (
    <div className="status-bar-bottom">
      <div className="status-bar-left">
        <span><span className="status-indicator-dot" />CONNECTED</span>
        <span className="status-bar-sep">|</span>
        <span>PANEL: {activeTab?.toUpperCase()}</span>
        {activeFilePath && (
          <>
            <span className="status-bar-sep">|</span>
            <span style={{ fontStyle: 'italic' }}>{activeFilePath}</span>
          </>
        )}
      </div>
      <div className="status-bar-right">
        <span>THEME: {theme?.toUpperCase()}</span>
        <span className="status-bar-sep">|</span>
        <span>{time}</span>
        <span className="status-bar-sep">|</span>
        <a href="https://dev-hunt-local.netlify.app/docs.html" onClick={handleOpenDocs} style={{ color: 'rgba(255,255,255,0.8)' }}>Docs</a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════ */
export default function App() {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [toasts, setToasts] = useState([]);
  const originalContentRef = useRef(null);

  useEffect(() => {
    // Clean up empty drafts caused by the previous state race bug
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('devhunt_draft_')) {
          const val = localStorage.getItem(key);
          if (val === '' || val === null || val === undefined) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Draft cleanup failed:', e);
    }
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const [profileSettings, setProfileSettings] = useState({
    terminal_username: 'guest',
    terminal_hostname: 'devhunt',
    terminal_prompt_symbol: '$',
    terminal_sound: true,
    canvas_particles: true,
    sound_effects: true,
    shortcuts: {},
    icon_theme: 'emoji',
    feature_toggles: {
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
    }
  });
  const [terminalCwd, setTerminalCwd] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([]);

  /* ── Theme ────────────────────────────── */
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('devhunt-theme');
    return VALID_THEMES.includes(saved) ? saved : 'slate';
  });

  /* ── Navigation ───────────────────────── */
  const [activeTab, setActiveTab] = useState('mentor');
  const [notificationsSubTab, setNotificationsSubTab] = useState('notifications');

  /* ── Sidebar / File Tree ──────────────── */
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [fileTree, setFileTree] = useState([]);
  const [openTabs, setOpenTabs] = useState(() => {
    const saved = localStorage.getItem('devhunt_open_tabs');
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [activeFilePath, setActiveFilePath] = useState(() => {
    return localStorage.getItem('devhunt_active_file_path') || null;
  });
  const [fileContent, setFileContent] = useState('');
  const [outlineSymbols, setOutlineSymbols] = useState([]);
  const [expandedDirs, setExpandedDirs] = useState(new Set());
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [wordWrap, setWordWrap] = useState(() => {
    return localStorage.getItem('devhunt_word_wrap') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('devhunt_open_tabs', JSON.stringify(openTabs));
  }, [openTabs]);

  useEffect(() => {
    if (activeFilePath) {
      localStorage.setItem('devhunt_active_file_path', activeFilePath);
    } else {
      localStorage.removeItem('devhunt_active_file_path');
    }
  }, [activeFilePath]);

  useEffect(() => {
    if (activeFilePath && originalContentRef.current !== null) {
      if (fileContent !== originalContentRef.current) {
        localStorage.setItem(`devhunt_draft_${activeFilePath}`, fileContent);
      } else {
        localStorage.removeItem(`devhunt_draft_${activeFilePath}`);
      }
    }
  }, [activeFilePath, fileContent]);

  useEffect(() => {
    localStorage.setItem('devhunt_word_wrap', wordWrap);
  }, [wordWrap]);

  useEffect(() => {
    if (terminalCwd) {
      localStorage.setItem('devhunt_last_workspace', terminalCwd);
    }
  }, [terminalCwd]);

  /* ── Header badges ────────────────────── */
  const [activeModel, setActiveModel] = useState('OFFLINE · NO KEY');
  const [activeKey, setActiveKey]     = useState('KEY · None');
  const [hasUpdate, setHasUpdate]     = useState(false);

  /* ── Notifications ────────────────────── */
  const [notifications, setNotifications] = useState([]);

  /* ── Music (upgraded) ──────────────────── */
  const audioRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playMode, setPlayMode] = useState('sequential'); // sequential | shuffle | repeat | repeat-all
  const [volume, setVolume] = useState(0.8);
  const [uploadStatus, setUploadStatus] = useState('');
  const [ytStatus, setYtStatus] = useState('');
  const [ytLoading, setYtLoading] = useState(false);

  const loadTracks = useCallback(async () => {
    try {
      const r = await fetch('/api/music/list');
      const d = await r.json();
      if (d.success) {
        setTracks(d.tracks || []);
      }
    } catch (e) {
      console.error('Failed to load tracks', e);
    }
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const playTrack = useCallback((index) => {
    if (index < 0 || index >= tracks.length) return;
    setCurrentIndex(index);
    setPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = `/api/music/stream/${encodeURIComponent(tracks[index].filename)}`;
      audioRef.current.volume = volume;
      audioRef.current.play().catch(err => console.warn('Play error:', err));
    }
  }, [tracks, volume]);

  const togglePlay = useCallback(() => {
    if (tracks.length === 0) return;
    if (currentIndex === -1) {
      playTrack(0);
      return;
    }
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.warn('Play error:', err));
      setPlaying(true);
    }
  }, [currentIndex, playing, tracks, playTrack]);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    if (playMode === 'repeat') {
      playTrack(currentIndex);
      return;
    }
    if (playMode === 'shuffle') {
      let next = Math.floor(Math.random() * tracks.length);
      if (tracks.length > 1) {
        while (next === currentIndex) {
          next = Math.floor(Math.random() * tracks.length);
        }
      }
      playTrack(next);
      return;
    }
    // sequential or repeat-all
    let next = currentIndex + 1;
    if (next >= tracks.length) {
      if (playMode === 'repeat-all') {
        next = 0;
      } else {
        setPlaying(false);
        return; // stop
      }
    }
    playTrack(next);
  }, [tracks, currentIndex, playMode, playTrack]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    if (playMode === 'shuffle') {
      let prev = Math.floor(Math.random() * tracks.length);
      if (tracks.length > 1) {
        while (prev === currentIndex) {
          prev = Math.floor(Math.random() * tracks.length);
        }
      }
      playTrack(prev);
      return;
    }
    let prev = currentIndex - 1;
    if (prev < 0) {
      prev = tracks.length - 1;
    }
    playTrack(prev);
  }, [tracks, currentIndex, playMode, playTrack]);

  const deleteTrack = useCallback(async (index) => {
    const track = tracks[index];
    if (!track) return;
    if (!window.confirm(`Delete "${track.title}"?`)) return;
    try {
      const r = await fetch(`/api/music/delete/${encodeURIComponent(track.filename)}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) {
        if (currentIndex === index) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
          }
          setPlaying(false);
          setCurrentIndex(-1);
          setCurrentTime(0);
          setDuration(0);
        } else if (currentIndex > index) {
          setCurrentIndex(c => c - 1);
        }
        loadTracks();
      }
    } catch (e) {
      console.error('Failed to delete track', e);
    }
  }, [tracks, currentIndex, loadTracks]);

  const handleVolumeChange = useCallback((v) => {
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  }, []);

  const fmtTime = (s) => {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      setCurrentTime(el.currentTime);
    };
    const handleDurationChange = () => {
      setDuration(el.duration);
    };
    const handleEnded = () => {
      nextTrack();
    };
    const handlePlayEvent = () => {
      setPlaying(true);
    };
    const handlePauseEvent = () => {
      setPlaying(false);
    };
    const handleError = () => {
      let msg = 'Audio playback failed.';
      if (el.error) {
        if (el.error.code === 1) msg = 'Playback aborted.';
        else if (el.error.code === 2) msg = 'Network error during audio load.';
        else if (el.error.code === 3) msg = 'Audio decoding failed. Format might not be supported.';
        else if (el.error.code === 4) msg = 'Audio source not supported.';
      }
      showToast(msg, 'error');
      setPlaying(false);
    };

    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('durationchange', handleDurationChange);
    el.addEventListener('ended', handleEnded);
    el.addEventListener('play', handlePlayEvent);
    el.addEventListener('pause', handlePauseEvent);
    el.addEventListener('error', handleError);

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('durationchange', handleDurationChange);
      el.removeEventListener('ended', handleEnded);
      el.removeEventListener('play', handlePlayEvent);
      el.removeEventListener('pause', handlePauseEvent);
      el.removeEventListener('error', handleError);
    };
  }, [nextTrack]);

  const currentTrack = currentIndex !== -1 ? tracks[currentIndex] : null;
  const musicState = {
    tracks,
    currentIndex,
    currentTrack,
    playing,
    title: currentTrack ? currentTrack.title : 'No track selected',
    time: fmtTime(currentTime),
    duration: fmtTime(duration),
    currentTime,
    rawDuration: duration,
    playMode,
    volume,
    uploadStatus,
    ytStatus,
    ytLoading
  };

  const musicControls = {
    toggle: togglePlay,
    prev: prevTrack,
    next: nextTrack,
    play: playTrack,
    deleteTrack,
    setPlayMode,
    setVolume: handleVolumeChange,
    loadTracks,
    setUploadStatus,
    setYtStatus,
    setYtLoading,
    seek: (pct) => {
      if (audioRef.current && duration) {
        audioRef.current.currentTime = pct * duration;
        setCurrentTime(pct * duration);
      }
    }
  };

  /* ── Apply theme on mount / change ───── */
  useEffect(() => { applyTheme(theme); }, [theme]);

  /* ── File tree ────────────────────────── */
  const refreshFileTree = useCallback(async () => {
    try {
      const r = await fetch('/api/ide/files');
      const d = await r.json();
      setFileTree(d.files || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === 'editor') refreshFileTree();
  }, [activeTab, refreshFileTree]);

  useEffect(() => {
    const loadStartupData = async () => {
      try {
        const lastWorkspace = localStorage.getItem('devhunt_last_workspace');
        if (lastWorkspace) {
          const res = await fetch('/api/ide/workspace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: lastWorkspace })
          });
          const data = await res.json();
          if (data.success) {
            setTerminalCwd(lastWorkspace);
          }
        } else {
          // Retrieve default workspace folder path
          const res = await fetch('/api/ide/workspace');
          const data = await res.json();
          if (data.success && data.workspace) {
            setTerminalCwd(data.workspace);
            localStorage.setItem('devhunt_last_workspace', data.workspace);
          }
        }
      } catch (err) {
        console.error('Failed to restore workspace:', err);
      }

      const savedPath = localStorage.getItem('devhunt_active_file_path');
      if (savedPath) {
        const draft = localStorage.getItem(`devhunt_draft_${savedPath}`);
        if (draft !== null) {
          setFileContent(draft);
        } else {
          if (!savedPath.startsWith('Untitled-')) {
            try {
              const res = await fetch(`/api/ide/file?path=${encodeURIComponent(savedPath)}`);
              const data = await res.json();
              if (data.success) {
                setFileContent(data.content);
              }
            } catch (err) {
              console.error('Failed to load active file content:', err);
            }
          } else {
            setFileContent('');
          }
        }
      }
      refreshFileTree();
    };
    loadStartupData();
  }, [refreshFileTree]);

  // Centralized active file content loader
  useEffect(() => {
    if (!activeFilePath) {
      setFileContent('');
      return;
    }

    setOpenTabs(prev => {
      if (!prev.includes(activeFilePath)) {
        return [...prev, activeFilePath];
      }
      return prev;
    });

    const draft = localStorage.getItem(`devhunt_draft_${activeFilePath}`);
    if (draft !== null) {
      setFileContent(draft);
    }

    if (activeFilePath.startsWith('Untitled-')) {
      originalContentRef.current = '';
      if (draft === null) {
        setFileContent('');
      }
      return;
    }

    let active = true;
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/ide/file?path=${encodeURIComponent(activeFilePath)}`);
        const data = await res.json();
        if (data.success && active) {
          originalContentRef.current = data.content;
          if (draft === null) {
            setFileContent(data.content);
          }
        } else if (!data.success && active) {
          if (draft === null) {
            setFileContent('');
          }
          showToast(`Failed to load file: ${data.error}`, 'error');
        }
      } catch (err) {
        if (active) {
          if (draft === null) {
            setFileContent('');
          }
          console.error(err);
        }
      }
    };

    fetchContent();
    return () => { active = false; };
  }, [activeFilePath, showToast]);

  useEffect(() => {
    originalContentRef.current = null;
  }, [activeFilePath]);

  // Startup Backend connection checker and window.alert override
  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok && active) {
          setIsBackendReady(true);
        } else {
          throw new Error('Not ready');
        }
      } catch (err) {
        if (active) {
          setConnectionRetries(c => c + 1);
          setTimeout(checkConnection, 500);
        }
      }
    };
    checkConnection();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const isSuccess = msg.startsWith('✓') || msg.toLowerCase().includes('success') || msg.toLowerCase().includes('successfully') || msg.toLowerCase().includes('passed');
      const isError = msg.startsWith('✕') || msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('error');
      const type = isSuccess ? 'success' : (isError ? 'error' : 'info');
      showToast(msg, type);
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [showToast]);

  /* ── Settings badges ──────────────────── */
  const loadSettingsBadges = useCallback(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const keys = d.api_keys || [];
        const hasKeys = keys.length > 0;
        setActiveKey(hasKeys ? `KEY · ${keys.length} active` : 'KEY · None');
        if (hasKeys && d.active_model) {
          setActiveModel(`GEMINI · ${d.active_model.split('-').slice(-2).join(' ').toUpperCase()}`);
        } else {
          setActiveModel('OFFLINE · NO KEY');
        }
      })
      .catch(() => {});
  }, []);

  const loadProfileSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setProfileSettings({
          terminal_username: s.terminal_username || 'guest',
          terminal_hostname: s.terminal_hostname || 'devhunt',
          terminal_prompt_symbol: s.terminal_prompt_symbol || '$',
          terminal_sound: s.terminal_sound !== false,
          canvas_particles: s.canvas_particles !== false,
          sound_effects: s.sound_effects !== false,
          shortcuts: s.shortcuts || {},
          icon_theme: s.icon_theme || 'emoji',
          feature_toggles: s.feature_toggles || {
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
          }
        });

        // Sync local theme state with backend theme settings
        if (s.theme && s.theme !== theme) {
          setTheme(s.theme);
          applyTheme(s.theme);
        }

        // Dynamically apply selected typography options
        const fontSys = s.font_family_system || 'Inter';
        const fontEd = s.font_family_editor || 'JetBrains Mono';
        const fontTerm = s.font_family_terminal || 'JetBrains Mono';
        const sizeEd = s.font_size_editor || 14;
        const sizeTerm = s.font_size_terminal || 13;

        document.documentElement.style.setProperty('--display', `'${fontSys}', 'Outfit', 'Inter', sans-serif`);
        document.documentElement.style.setProperty('--mono', `'${fontEd}', 'JetBrains Mono', monospace`);
        document.documentElement.style.setProperty('--font-terminal', `'${fontTerm}', 'JetBrains Mono', monospace`);
        document.documentElement.style.setProperty('--editor-font-size', `${sizeEd}px`);
        document.documentElement.style.setProperty('--terminal-font-size', `${sizeTerm}px`);
      }
    } catch (err) {
      console.error(err);
    }
  }, [theme]);

  useEffect(() => {
    loadSettingsBadges();
    loadProfileSettings();
  }, [loadSettingsBadges, loadProfileSettings]);

  const handleSettingsRefresh = useCallback(() => {
    loadSettingsBadges();
    loadProfileSettings();
  }, [loadSettingsBadges, loadProfileSettings]);

  /* ── Update check ─────────────────────── */
  useEffect(() => {
    fetch('/api/check-update')
      .then(r => r.json())
      .then(d => { if (d.update_available) setHasUpdate(true); })
      .catch(() => {});
  }, []);

  // Keyboard shortcuts moved below helpers to resolve Temporal Dead Zone (TDZ) initialization order

  /* ── Helpers ──────────────────────────── */
  const handleNewFile = useCallback(() => {
    setActiveTab('editor');
    setIsSidebarMinimized(false);
    
    let num = 1;
    while (openTabs.includes(`Untitled-${num}`)) {
      num++;
    }
    const newName = `Untitled-${num}`;
    
    setOpenTabs(prev => [...prev, newName]);
    setActiveFilePath(newName);
    setFileContent('');
  }, [openTabs]);

  const handleSaveFile = useCallback(() => {
    window.dispatchEvent(new CustomEvent('devhunt-save-file'));
  }, []);

  const handleFormatDoc = useCallback(() => {
    window.dispatchEvent(new CustomEvent('devhunt-format-document'));
  }, []);

  const handleOpenLocalFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const content = await file.text();
          setActiveFilePath(file.name);
          setFileContent(content);
          setOpenTabs(prev => {
            if (!prev.includes(file.name)) {
              return [...prev, file.name];
            }
            return prev;
          });
          setActiveTab('editor');
        } catch (err) {
          alert('Failed to read file: ' + err.message);
        }
      }
    };
    input.click();
  }, []);

  const changeWorkspace = useCallback(async (path) => {
    try {
      const res = await fetch('/api/ide/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      if (data.success) {
        setTerminalCwd(path);
        setFileTree(data.files || []);
        localStorage.setItem('devhunt_last_workspace', path);
        alert(`Workspace changed to: ${path}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend to change workspace.');
    }
  }, []);

  const handleOpenLocalFolder = useCallback(async () => {
    if (window.__TAURI__) {
      try {
        const { open } = window.__TAURI__.dialog || {};
        if (open) {
          const selected = await open({
            directory: true,
            multiple: false,
            title: 'Select Workspace Folder'
          });
          if (selected && typeof selected === 'string') {
            await changeWorkspace(selected);
          }
          return;
        }
      } catch (err) {
        console.error('Tauri open folder dialog failed:', err);
      }
    }
    
    const path = prompt('Enter absolute path to workspace folder:', terminalCwd || '');
    if (path) {
      await changeWorkspace(path);
    }
  }, [terminalCwd, changeWorkspace]);

  const handleRefreshExplorer = useCallback(() => {
    refreshFileTree();
    alert('Explorer refreshed');
  }, [refreshFileTree]);

  const handleClearEditor = useCallback(() => {
    setFileContent('');
    setActiveFilePath(null);
  }, []);

  /* ── Keyboard shortcuts ───────────────── */
  useEffect(() => {
    const handler = (e) => {
      const activeEl = document.activeElement;
      const isEditing = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );

      const key = e.key;
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
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
      const pressedCombo = parts.join('+').toLowerCase();

      const defaultShortcuts = {
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

      const userShortcuts = profileSettings.shortcuts || {};
      const shortcuts = { ...defaultShortcuts, ...userShortcuts };

      let matchedAction = null;
      for (const [actionId, combo] of Object.entries(shortcuts)) {
        if (combo && combo.trim().toLowerCase() === pressedCombo) {
          matchedAction = actionId;
          break;
        }
      }

      if (matchedAction) {
        const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
        const isFuncKey = /^F[1-9][0-2]?$/.test(keyName) || keyName === 'Escape';

        if (isEditing && !hasModifier && !isFuncKey) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        switch (matchedAction) {
          case 'toggleSidebar':
            setIsSidebarMinimized(p => !p);
            break;
          case 'saveFile':
            handleSaveFile();
            break;
          case 'focusChat':
            setActiveTab('mentor');
            setTimeout(() => {
              const ci = document.getElementById('chat-input');
              if (ci) ci.focus();
            }, 50);
            break;
          case 'newFile':
            handleNewFile();
            break;
          case 'openTerminal':
            setActiveTab('terminal');
            break;
          case 'clearEditor':
            handleClearEditor();
            break;
          case 'refreshExplorer':
            refreshFileTree();
            break;
          case 'openLocalFolder':
            handleOpenLocalFolder();
            break;
          case 'openLocalFile':
            handleOpenLocalFile();
            break;
          case 'formatDocument':
            handleFormatDoc();
            break;
          case 'globalSearch':
            setActiveTab('search');
            setTimeout(() => {
              const gsi = document.getElementById('global-search-input');
              if (gsi) { gsi.focus(); gsi.select(); }
            }, 50);
            break;
          default:
            break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    profileSettings, 
    openTabs, 
    activeFilePath, 
    fileContent, 
    handleNewFile, 
    handleSaveFile, 
    handleOpenLocalFolder, 
    handleOpenLocalFile, 
    handleClearEditor, 
    handleFormatDoc, 
    refreshFileTree
  ]);

  /* ── Tab cycling shortcut ── */
  useEffect(() => {
    const handleTabCycling = (e) => {
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        
        if (openTabs.length <= 1) return;

        const currentIdx = openTabs.indexOf(activeFilePath);
        let nextIdx;
        
        if (e.shiftKey) {
          // Ctrl+Shift+Tab: Cycle backward
          nextIdx = (currentIdx - 1 + openTabs.length) % openTabs.length;
        } else {
          // Ctrl+Tab: Cycle forward
          nextIdx = (currentIdx + 1) % openTabs.length;
        }
        
        // Update active file focus
        setActiveFilePath(openTabs[nextIdx]);
      }
    };

    window.addEventListener('keydown', handleTabCycling, true);
    return () => window.removeEventListener('keydown', handleTabCycling, true);
  }, [openTabs, activeFilePath]);

  /* ── Canvas particles network loop ── */
  useEffect(() => {
    const canvas = document.getElementById('dragon-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let W, H;
    let nodes = [];

    const resize = () => {
      W = canvas.width = window.innerWidth * devicePixelRatio;
      H = canvas.height = window.innerHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    const N = 80;
    nodes = [];
    for (let i = 0; i < N; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.6 + 0.4
      });
    }

    const dragon = [
      [0.15, 0.7], [0.22, 0.55], [0.30, 0.58], [0.36, 0.45], [0.45, 0.40], [0.52, 0.30],
      [0.60, 0.25], [0.68, 0.30], [0.74, 0.42], [0.80, 0.40], [0.86, 0.50], [0.82, 0.62],
      [0.74, 0.66], [0.66, 0.60], [0.58, 0.66], [0.50, 0.62], [0.42, 0.70], [0.34, 0.68],
      [0.26, 0.76], [0.18, 0.78]
    ];

    let t = 0;
    const loop = () => {
      if (theme !== 'neon' || profileSettings?.canvas_particles === false) {
        ctx.clearRect(0, 0, W, H);
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      t += 0.005;
      ctx.clearRect(0, 0, W, H);

      // dragon glow
      ctx.save();
      ctx.translate(W * 0.05, H * 0.05);
      ctx.scale(0.9, 0.9);
      ctx.beginPath();
      dragon.forEach((p, i) => {
        const x = p[0] * W + Math.sin(t + i * 0.3) * 4 * devicePixelRatio;
        const y = p[1] * H + Math.cos(t + i * 0.4) * 4 * devicePixelRatio;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(52,211,153,0.35)';
      ctx.lineWidth = 1.2 * devicePixelRatio;
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 25 * devicePixelRatio;
      ctx.stroke();
      ctx.restore();

      // nodes + connections
      for (const n of nodes) {
        n.x += n.vx * devicePixelRatio;
        n.y += n.vy * devicePixelRatio;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56,189,248,0.7)';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8 * devicePixelRatio;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
          if (d < 140 * devicePixelRatio) {
            ctx.strokeStyle = `rgba(52,211,153,${0.15 * (1 - d / (140 * devicePixelRatio))})`;
            ctx.lineWidth = 0.5 * devicePixelRatio;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, profileSettings?.canvas_particles]);

  const openFileInEditor = useCallback((path) => {
    setActiveFilePath(path);
    setActiveTab('editor');
  }, []);

  const addNotification = useCallback((message, type = 'info') => {
    setNotifications(n => [
      { message, type, time: new Date().toLocaleTimeString() },
      ...n.slice(0, 49),
    ]);
  }, []);

  /* ── Panel map ────────────────────────── */
  const PANELS = {
    editor: (
      <IDEWorkspace
        activeFilePath={activeFilePath}
        setActiveFilePath={setActiveFilePath}
        fileContent={fileContent}
        setFileContent={setFileContent}
        openTabs={openTabs}
        setOpenTabs={setOpenTabs}
        fileTree={fileTree}
        refreshFileTree={refreshFileTree}
        theme={theme}
        setOutlineSymbols={setOutlineSymbols}
        profileSettings={profileSettings}
        terminalCwd={terminalCwd}
        setTerminalCwd={setTerminalCwd}
        terminalHistory={terminalHistory}
        setTerminalHistory={setTerminalHistory}
        wordWrap={wordWrap}
        setWordWrap={setWordWrap}
        iconTheme={profileSettings?.icon_theme}
      />
    ),
    search:        <SearchPanel />,
    mentor:        <ChatPanel addNotification={addNotification} />,
    path:          <HuntPath />,
    quests:        <QuestBoard />,
    vault:         <IntelVault />,
    stats:         <TerminalStats theme={theme} />,
    music:         <MusicPlayer musicState={musicState} musicControls={musicControls} />,
    arcade:        <Arcade />,
    terminal: (
      <StandaloneTerminal
        profileSettings={profileSettings}
        terminalCwd={terminalCwd}
        setTerminalCwd={setTerminalCwd}
        terminalHistory={terminalHistory}
        setTerminalHistory={setTerminalHistory}
      />
    ),
    notifications: (
      <NotificationsPanel 
        notifications={notifications} 
        onClear={() => setNotifications([])} 
        activeSubTab={notificationsSubTab}
        setActiveSubTab={setNotificationsSubTab}
      />
    ),
    docAnalysis:   <DocForensics />,
    linkedin:      <LinkedInPanel />,
    settings: (
      <Settings
        theme={theme}
        setTheme={(t) => { setTheme(t); applyTheme(t); }}
        onRefreshHeader={handleSettingsRefresh}
        setActiveTab={setActiveTab}
        setNotificationsSubTab={setNotificationsSubTab}
      />
    ),
  };

  const allTabs = [
    { id: 'editor',        label: 'Code Editor'       },
    { id: 'search',        label: 'Search & Replace'  },
    { id: 'mentor',        label: 'AI Assistant'      },
    { id: 'path',          label: 'Hunt Path'         },
    { id: 'quests',        label: 'Quest Board'       },
    { id: 'vault',         label: 'Intel Vault'       },
    { id: 'stats',         label: 'Terminal Stats'    },
    { id: 'music',         label: 'Music Player'      },
    { id: 'arcade',        label: 'Game Arcade'       },
    { id: 'terminal',      label: 'Hunt Terminal'     },
    {
      id: 'notifications',
      label: (
        <span id="nav-notifications">
          System Messages{' '}
          {notifications.length > 0 && (
            <span id="notification-unread-count" className="badge" style={{
              marginLeft: 6, background: 'var(--red)', color: '#fff',
              borderColor: 'var(--red)', fontWeight: 'bold', fontSize: 9,
              padding: '1px 4px', borderRadius: 10,
            }}>
              {notifications.length}
            </span>
          )}
        </span>
      ),
    },
    { id: 'doc-analysis',  label: 'Doc Forensics'     },
    { id: 'linkedin',      label: 'LinkedIn Drafts'   },
    { id: 'settings',      label: 'Settings'          },
  ];

  const toggles = profileSettings?.feature_toggles || {};
  const TABS = allTabs.filter(tab => {
    if (tab.id === 'path') return toggles.path !== false;
    if (tab.id === 'quests') return toggles.quests !== false;
    if (tab.id === 'vault') return toggles.vault !== false;
    if (tab.id === 'music') return toggles.music !== false;
    if (tab.id === 'arcade') return toggles.arcade !== false;
    if (tab.id === 'doc-analysis') return toggles['doc-analysis'] !== false;
    if (tab.id === 'linkedin') return toggles.linkedin !== false;
    if (tab.id === 'search') return toggles.search !== false;
    if (tab.id === 'stats') return toggles.stats !== false;
    if (tab.id === 'terminal') return toggles.terminal !== false;
    if (tab.id === 'notifications') return toggles.notifications !== false;
    return true;
  });

  // Map data panel IDs to their panel content JSX
  const panelRenderMap = {
    editor: PANELS.editor,
    search: PANELS.search,
    mentor: PANELS.mentor,
    path: PANELS.path,
    quests: PANELS.quests,
    vault: PANELS.vault,
    stats: PANELS.stats,
    music: PANELS.music,
    arcade: PANELS.arcade,
    terminal: PANELS.terminal,
    notifications: PANELS.notifications,
    'doc-analysis': PANELS.docAnalysis,
    linkedin: PANELS.linkedin,
    settings: PANELS.settings,
  };

  /* ── RENDER ───────────────────────────── */
  if (!isBackendReady) {
    return (
      <div className="initial-loader-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#0b0f14',
        color: '#10b981',
        fontFamily: 'var(--mono)',
        fontSize: '13px',
        letterSpacing: '2px',
      }}>
        <div className="cyber-spinner" style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(16, 185, 129, 0.1)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
        }}></div>
        <div className="loader-text">SYNCHRONIZING WITH DEVHUNT CORES... ({connectionRetries})</div>
      </div>
    );
  }

  return (
    <>
      {/* Neon theme background canvas */}
      <canvas id="dragon-bg" />

      {/* ══ TOP HEADER ══════════════════════ */}
      <header className="topbar-main">

        {/* Brand */}
        <div className="brand">
          <img className="logo-svg" src="/logo.png" alt="DevHunt Logo" />
          <span className="brand-name">DevHunt</span>
        </div>

        {/* Menu bar */}
        <MenuBar
          setActiveTab={setActiveTab}
          setIsSidebarMinimized={setIsSidebarMinimized}
          setTheme={setTheme}
          onNewFile={handleNewFile}
          onSaveFile={handleSaveFile}
          onOpenLocalFile={handleOpenLocalFile}
          onOpenLocalFolder={handleOpenLocalFolder}
          onRefreshExplorer={handleRefreshExplorer}
          onClearEditor={handleClearEditor}
          onFormatDocument={handleFormatDoc}
          setNotificationsSubTab={setNotificationsSubTab}
        />

        {/* Center window title */}
        <div className="topbar-center-title" id="topbar-center-title">DevHunt</div>

        {/* Right: music + badges */}
        <div className="topbar-right">
          <MusicDeck musicState={musicState} musicControls={musicControls} onDeckClick={() => setActiveTab('music')} />
          {hasUpdate && (
            <span className="badge" id="header-update-badge"
              style={{ cursor: 'pointer', color: 'var(--amber)', borderColor: 'var(--amber)' }}>
              ✦ UPDATE AVAILABLE
            </span>
          )}
          <span className="badge" id="header-active-model">{activeModel}</span>
          <span className="badge" id="header-active-key">{activeKey}</span>
          <kbd className="kbd">⌘K</kbd>
        </div>
      </header>

      {/* ══ WORKSPACE ═══════════════════════ */}
      <div className="app-workspace">

        {/* Sidebar: activity bar + file explorer */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarMinimized={isSidebarMinimized}
          setIsSidebarMinimized={setIsSidebarMinimized}
          fileTree={fileTree}
          refreshFileTree={refreshFileTree}
          activeFilePath={activeFilePath}
          openFileInEditor={openFileInEditor}
          outlineSymbols={outlineSymbols}
          scrollToLine={() => {}}
          unreadNotifications={notifications.length}
          expandedDirs={expandedDirs}
          setExpandedDirs={setExpandedDirs}
          showNewFileInput={showNewFileInput}
          setShowNewFileInput={setShowNewFileInput}
          onOpenLocalFolder={handleOpenLocalFolder}
          featureToggles={profileSettings?.feature_toggles}
          iconTheme={profileSettings?.icon_theme}
        />

        {/* Main content */}
        <div className="main-content-pane">

          {/* Tab bar */}
          <div className="panel-tabs-bar" id="panel-tabs-bar">
            {TABS.map(tab => (
              <div
                key={tab.id}
                className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                data-panel={tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </div>
            ))}
          </div>

          {/* Panels */}
          <main className="panels-container">
            {TABS.map(tab => (
              <section
                key={tab.id}
                className={`panel ${activeTab === tab.id ? 'active' : ''}`}
                id={`panel-${tab.id}`}
              >
                {/* Lazy-mount: only render when active */}
                {activeTab === tab.id ? panelRenderMap[tab.id] : null}
              </section>
            ))}
          </main>
        </div>
      </div>

      {/* ══ STATUS BAR ══════════════════════ */}
      <StatusBar activeTab={activeTab} activeFilePath={activeFilePath} theme={theme} />
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Toast Notification Container */}
      <div className="toast-container" style={{
        position: 'fixed',
        bottom: '36px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast-card toast-${t.type}`} style={{
            pointerEvents: 'auto',
            background: 'rgba(30, 30, 40, 0.85)',
            backdropFilter: 'blur(12px)',
            borderLeft: `4px solid ${t.type === 'error' ? 'var(--red)' : t.type === 'success' ? 'var(--green)' : 'var(--accent)'}`,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '6px',
            padding: '12px 18px',
            color: 'var(--text)',
            fontSize: '12px',
            fontFamily: 'var(--display)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            minWidth: '260px',
            maxWidth: '380px',
            animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <span>{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '0 4px'
            }}>✕</button>
          </div>
        ))}
      </div>
    </>
  );
}
