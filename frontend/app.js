const API_BASE = '/api';

/* ========== Sidebar navigation ========== */
(() => {
  const c = document.getElementById('dragon-bg');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, nodes = [];
  function resize() {
    W = c.width = window.innerWidth * devicePixelRatio;
    H = c.height = window.innerHeight * devicePixelRatio;
  }
  resize(); window.addEventListener('resize', resize);

  const N = 80;
  for (let i = 0; i < N; i++) nodes.push({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
    r: Math.random() * 1.6 + .4
  });

  // Dragon silhouette path points (stylized)
  const dragon = [
    [.15, .7], [.22, .55], [.30, .58], [.36, .45], [.45, .40], [.52, .30],
    [.60, .25], [.68, .30], [.74, .42], [.80, .40], [.86, .50], [.82, .62],
    [.74, .66], [.66, .60], [.58, .66], [.50, .62], [.42, .70], [.34, .68],
    [.26, .76], [.18, .78]
  ];

  let t = 0;
  function loop() {
    t += .005;
    ctx.clearRect(0, 0, W, H);

    // dragon glow
    ctx.save();
    ctx.translate(W * 0.05, H * 0.05);
    ctx.scale(0.9, 0.9);
    ctx.beginPath();
    dragon.forEach((p, i) => {
      const x = p[0] * W + Math.sin(t + i * .3) * 4 * devicePixelRatio;
      const y = p[1] * H + Math.cos(t + i * .4) * 4 * devicePixelRatio;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,255,163,0.35)';
    ctx.lineWidth = 1.2 * devicePixelRatio;
    ctx.shadowColor = '#00ffa3';
    ctx.shadowBlur = 25 * devicePixelRatio;
    ctx.stroke();
    ctx.restore();

    // nodes + connections
    for (const n of nodes) {
      n.x += n.vx * devicePixelRatio; n.y += n.vy * devicePixelRatio;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * devicePixelRatio, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,212,255,0.7)';
      ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8 * devicePixelRatio;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < 140 * devicePixelRatio) {
          ctx.strokeStyle = `rgba(0,255,163,${.15 * (1 - d / (140 * devicePixelRatio))})`;
          ctx.lineWidth = .5 * devicePixelRatio;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ========== Sidebar navigation ========== */
const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.panel');
const crumb = document.getElementById('crumb-current');

function switchPanel(panelId) {
  navItems.forEach(item => {
    const active = item.dataset.panel === panelId;
    item.classList.toggle('active', active);
  });
  panels.forEach(panel => {
    const active = panel.id === `panel-${panelId}`;
    panel.classList.toggle('active', active);
  });
  if (crumb) crumb.textContent = panelId;

  // Refresh content on view switch
  if (panelId === 'path') loadRoadmap();
  if (panelId === 'quests') loadTodos();
  if (panelId === 'vault') loadSources();
  if (panelId === 'doc-analysis') loadForensicsRecords();
  if (panelId === 'history') loadHistoryPanel();
  if (panelId === 'terminal') initTerminal();
  if (panelId === 'stats') {
    loadProfileAndSettings();
    loadAnalytics();
    loadTerminalStats();
  }
  if (panelId === 'settings') {
    loadKeys();
    checkUpdates();
    loadAIMemory();
  }
  if (panelId === 'notifications') {
    loadNotifications(true);
  }
  if (panelId === 'music') {
    initMusicPlayer();
  }
  if (panelId === 'arcade') {
    if (typeof window.initArcadePanel === 'function') window.initArcadePanel();
  } else {
    if (typeof window.stopArcadePanel === 'function') window.stopArcadePanel();
  }
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    switchPanel(item.dataset.panel);
  });
});

const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const sidebarCollapseToggle = document.getElementById('sidebar-collapse-toggle');

// Helper to toggle sidebar state and sync toggle checkbox + localStorage
function toggleSidebarState(forceState) {
  const isCollapsed = forceState !== undefined ? forceState : !document.body.classList.contains('collapsed');
  
  if (isCollapsed) {
    document.body.classList.add('collapsed');
  } else {
    document.body.classList.remove('collapsed');
  }
  
  localStorage.setItem('sidebar-collapsed', isCollapsed);
  if (sidebarCollapseToggle) {
    sidebarCollapseToggle.checked = isCollapsed;
  }
}

// Apply initial collapsed state immediately
const savedCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
if (savedCollapsed) {
  document.body.classList.add('collapsed');
}
if (sidebarCollapseToggle) {
  sidebarCollapseToggle.checked = savedCollapsed;
}

// Sidebar toggle button click (Header hamburger button)
if (toggleSidebarBtn) {
  toggleSidebarBtn.addEventListener('click', () => {
    toggleSidebarState();
  });
}

// Settings toggle switch checkbox
if (sidebarCollapseToggle) {
  sidebarCollapseToggle.addEventListener('change', (e) => {
    toggleSidebarState(e.target.checked);
  });
}

// Keyboard shortcut (Ctrl+B / Cmd+B) to toggle sidebar minimized state
window.addEventListener('keydown', (e) => {
  // Avoid interrupting typing if user is focused inside input elements
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) {
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    toggleSidebarState();
  }
});

/* ========== Mini Markdown renderer ========== */
function md(src) {
  if (!src) return '';
  let s = src
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // code fences
  s = s.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang || ''}">${code.trim()}</code></pre>`);
  // headings
  s = s.replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>');
  // inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold + italic
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
  // bullets
  s = s.replace(/(^|\n)([-*] .+(?:\n[-*] .+)*)/g, (_, pre, block) => {
    const items = block.split('\n').map(l => `<li>${l.replace(/^[-*] /, '')}</li>`).join('');
    return pre + `<ul>${items}</ul>`;
  });
  // paragraphs
  s = s.split(/\n{2,}/).map(p => /^<(h\d|ul|pre|blockquote)/.test(p) ? p : `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
  return s;
}

/* ========== AI Mentor chat ========== */
const feed = document.getElementById('chat-feed');
const inputEl = document.getElementById('chat-input');
const sendBtn = document.getElementById('chat-send');

function addMsg(role, text, meta) {
  if (!feed) return;
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'assistant' ? 'ai' : role);
  let body = '';

  // English correction block injection
  if (role === 'assistant' && meta && meta.grammarTip) {
    body += `<div class="callout"><div class="callout-title">✎ GRAMMAR &amp; PHRASING TIP</div>
      <i>${meta.grammarTip}</i></div>`;
  }

  body += md(text);

  // Citations and metadata block
  if (role === 'assistant' && meta) {
    const keyStr = meta.key_used || 'None';
    const modelStr = meta.model_used || 'Gemini';
    const citationsHtml = (meta.citations || []).map(c =>
      `<span class="citation">📄 ${c.source_name} (${c.source_type}) · ${Math.round(c.similarity * 100)}% match</span>`
    ).join('');

    body += `<div class="meta-hud">
      <span><i class="dot dot-green"></i> MODEL: ${modelStr}</span>
      <span><i class="dot dot-cyan"></i> KEY: ${keyStr}</span>
      ${citationsHtml}
    </div>`;
  }

  div.innerHTML = body;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

const seedAI = `### Welcome to DevHunt 👋

You're connected to **DevHunt AI**. I can help with problem solving, debugging, learning, and any questions you have.

Try asking:
- *"How do I fix a 502 bad gateway error?"*
- *"Explain how DNS works"*
- *"Write a Python script to rename files"*

\`\`\`bash
# example: check running processes
ps aux | grep python
\`\`\`
`;

if (feed) {
  // Initialize with seed message
  addMsg('assistant', seedAI);
}

async function sendChatMessage() {
  if (!inputEl) return;
  const message = inputEl.value.trim();
  if (!message) return;

  addMsg('user', message);
  inputEl.value = '';

  // Create the AI message bubble immediately — we'll fill it as tokens stream in
  const aiDiv = document.createElement('div');
  aiDiv.className = 'msg ai';
  aiDiv.innerHTML = `<span class="muted streaming-cursor">// transmitting query to cognitive core...</span>`;
  feed.appendChild(aiDiv);
  feed.scrollTop = feed.scrollHeight;

  let fullText = '';
  let metaInfo = null;

  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: 'default_session' })
    });

    if (!response.ok) {
      aiDiv.innerHTML = `⚠️ **Server error**: ${response.status}`;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Clear the "transmitting..." placeholder on first token
    let firstToken = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));

          if (data.type === 'token') {
            if (firstToken) {
              aiDiv.innerHTML = '';
              firstToken = false;
            }
            fullText += data.text;
            // Render markdown progressively
            aiDiv.innerHTML = md(fullText) + '<span class="streaming-cursor">▌</span>';
            feed.scrollTop = feed.scrollHeight;

          } else if (data.type === 'done') {
            metaInfo = data;
            // Final render — remove cursor, add meta HUD
            let grammarTip = null;
            let cleanResponse = fullText;
            const grammarMatch = cleanResponse.match(/^>\s*\*Grammar Tip:\s*(.*?)\*\s*\n?/);
            if (grammarMatch) {
              grammarTip = grammarMatch[1];
              cleanResponse = cleanResponse.replace(/^>\s*\*Grammar Tip:\s*(.*?)\*\s*\n?/, '').trim();
            }

            let body = '';
            if (grammarTip) {
              body += `<div class="callout"><div class="callout-title">✎ GRAMMAR &amp; PHRASING TIP</div><i>${grammarTip}</i></div>`;
            }
            body += md(cleanResponse);

            if (data.todo_detected) {
              const td = data.todo_detected;
              if (td.action === 'add') {
                body += `<div class="callout" style="border-left-color: var(--cyan); background: rgba(0, 212, 255, 0.08); color: #ffd99a; margin-top: 12px;">
                  <div class="callout-title" style="color: var(--cyan);">✦ QUEST AUTO-ADDED</div>
                  Quest <b>${td.todo.title}</b> has been added to your Quest Board (${td.todo.priority} priority).
                </div>`;
              } else if (td.action === 'complete') {
                body += `<div class="callout" style="border-left-color: var(--green); background: rgba(0, 255, 163, 0.08); color: #ffd99a; margin-top: 12px;">
                  <div class="callout-title" style="color: var(--green);">✦ QUEST COMPLETED</div>
                  Quest <b>${td.todo.title}</b> has been marked completed.
                </div>`;
              } else if (td.action === 'delete') {
                body += `<div class="callout" style="border-left-color: #ff3e3e; background: rgba(255, 62, 62, 0.08); color: #ffd99a; margin-top: 12px;">
                  <div class="callout-title" style="color: #ff3e3e;">✦ QUEST REMOVED</div>
                  Quest <b>${td.todo.title}</b> has been removed from your Quest Board.
                </div>`;
              } else if (td.action === 'multi') {
                body += `<div class="callout" style="border-left-color: var(--cyan); background: rgba(0, 212, 255, 0.08); color: #ffd99a; margin-top: 12px;">
                  <div class="callout-title" style="color: var(--cyan);">✦ QUEST BOARD UPDATES</div>
                  <ul style="margin: 4px 0 0 16px; padding: 0; list-style-type: disc;">`;
                td.items.forEach(item => {
                  if (item.action === 'add') {
                    body += `<li style="margin-bottom: 2px;">Added: <b>${item.todo.title}</b> (${item.todo.priority} priority)</li>`;
                  } else if (item.action === 'complete') {
                    body += `<li style="margin-bottom: 2px;">Completed: <b>${item.todo.title}</b></li>`;
                  } else if (item.action === 'delete') {
                    body += `<li style="margin-bottom: 2px;">Removed: <b>${item.todo.title}</b></li>`;
                  }
                });
                body += `</ul></div>`;
              }
            }

            const keyStr = data.key_used || 'None';
            const modelStr = data.model_used || 'Gemini';
            const citationsHtml = (data.citations || []).map(c =>
              `<span class="citation">📄 ${c.source_name} (${c.source_type}) · ${Math.round(c.similarity * 100)}% match</span>`
            ).join('');
            body += `<div class="meta-hud">
              <span><i class="dot dot-green"></i> MODEL: ${modelStr}</span>
              <span><i class="dot dot-cyan"></i> KEY: ${keyStr}</span>
              ${citationsHtml}
            </div>`;
            aiDiv.innerHTML = body;
            feed.scrollTop = feed.scrollHeight;

            loadRoadmap();
            loadActiveStateHeader();
            if (data.todo_detected) {
              loadTodos();
            }

          } else if (data.type === 'error') {
            aiDiv.innerHTML = `⚠️ **Error transmitting query**: ${data.error}`;
          }
        } catch (e) {
          // skip malformed SSE line
        }
      }
    }

  } catch (error) {
    aiDiv.innerHTML = `⚠️ **Network Connection Failed**. Verify Flask API is active on localhost:5000.`;
  }
}

if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
if (inputEl) {
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}

// Quick query buttons
window.sendQuickQuery = (queryText) => {
  if (inputEl) {
    inputEl.value = queryText;
    switchPanel('mentor');
    sendChatMessage();
  }
};

/* ========== Hunt Path (Roadmap) ========== */
const expandedDays = new Set();

window.toggleRoadmapDay = (event, dayNum) => {
  if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A' || event.target.closest('button') || event.target.closest('a')) {
    return;
  }

  const card = document.querySelector(`.node[data-day="${dayNum}"]`);
  if (!card) return;

  if (expandedDays.has(dayNum)) {
    expandedDays.delete(dayNum);
    card.classList.remove('expanded');
    const toggleIcon = card.querySelector('.node-toggle-icon');
    if (toggleIcon) toggleIcon.textContent = '▼';
  } else {
    expandedDays.add(dayNum);
    card.classList.add('expanded');
    const toggleIcon = card.querySelector('.node-toggle-icon');
    if (toggleIcon) toggleIcon.textContent = '▲';
  }
};

window.addRoadmapQuest = async (event, taskTitle, dayNum, dayTitle) => {
  event.stopPropagation();
  const btn = event.currentTarget;
  if (btn.disabled) return;

  btn.textContent = 'Adding...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `[Day ${dayNum}] ${taskTitle}`,
        description: `Hands-on task from Hunt Path Roadmap Day ${dayNum} (${dayTitle})`,
        priority: 'medium',
        tags: ['roadmap', `day-${dayNum}`]
      })
    });

    const result = await res.json();
    if (result.success) {
      btn.textContent = '✓ Added';
      btn.classList.add('added');
      loadTodos();
    } else {
      btn.textContent = 'Error';
      btn.disabled = false;
    }
  } catch (err) {
    console.error('Failed to add roadmap task as todo', err);
    btn.textContent = 'Error';
    btn.disabled = false;
  }
};

async function loadRoadmap() {
  const container = document.getElementById('phases');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/path`);
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `<div class="muted">// failed loading roadmap</div>`;
      return;
    }

    const path = data.path;
    let totalDays = 0;
    let completedDays = 0;

    container.innerHTML = '';

    if (!path.phases || path.phases.length === 0) {
      container.innerHTML = `<div class="muted">// hunt path empty. click regenerate.</div>`;
      return;
    }

    path.phases.forEach((phase, pIdx) => {
      const daysHtml = (phase.days || []).map(day => {
        totalDays++;
        if (day.status === 'completed') completedDays++;

        const topicsBadges = (day.topics || []).map(t => `<span>${t}</span>`).join('');
        const rCount = day.resources ? day.resources.length : 0;
        const tCount = day.tasks ? day.tasks.length : 0;
        const isExpanded = expandedDays.has(day.day);

        return `
          <div class="node ${day.status || 'upcoming'} ${isExpanded ? 'expanded' : ''}" data-day="${day.day}" onclick="toggleRoadmapDay(event, ${day.day})">
            <div class="node-header">
              <div class="node-header-main">
                <div class="node-day">DAY ${String(day.day).padStart(2, '0')}</div>
                <div class="node-title">${day.title}</div>
              </div>
              <div class="node-toggle-icon">${isExpanded ? '▲' : '▼'}</div>
            </div>
            <div class="node-topics">${topicsBadges}</div>
            <div class="node-meta">⏱ ${day.estimated_time || 60}m · 🔗 ${rCount} resource(s) · ✓ ${tCount} task(s)</div>
            
            <div class="node-details">
              <div class="detail-section">
                <h4>What to Learn</h4>
                <ul>
                  ${(day.topics || []).map(t => `<li>${t}</li>`).join('') || '<li class="muted">No topics listed</li>'}
                </ul>
              </div>
              
              <div class="detail-section">
                <h4>Study Resources</h4>
                <ul>
                  ${(day.resources || []).map(r => {
          const isLink = r.url && (r.url.startsWith('http://') || r.url.startsWith('https://'));
          return `
                      <li>
                        ${isLink ? `<a href="${r.url}" target="_blank" class="resource-link">🔗 ${r.title}</a>` : `<span class="resource-text">🔗 ${r.title} (${r.url || 'No URL'})</span>`}
                      </li>
                    `;
        }).join('') || '<li class="muted">No resources listed</li>'}
                </ul>
              </div>
              
              <div class="detail-section">
                <h4>Hands-on Quests</h4>
                <ul>
                  ${(day.tasks || []).map(t => `
                    <li>
                      <span class="task-text">${t}</span>
                      <button class="btn-ghost btn-xs btn-add-quest" onclick="addRoadmapQuest(event, '${t.replace(/'/g, "\\'")}', ${day.day}, '${day.title.replace(/'/g, "\\'")}')">+ Add Quest</button>
                    </li>
                  `).join('') || '<li class="muted">No tasks listed</li>'}
                </ul>
              </div>
            </div>
            
            <div class="node-actions">
              ${day.status !== 'completed' ? `<button class="btn-ghost" onclick="updateRoadmapDay(${day.day}, 'completed')">✓ Complete</button>` : ''}
              ${day.status === 'completed' ? `<button class="btn-ghost" onclick="updateRoadmapDay(${day.day}, 'pending')">↺ Reset</button>` : ''}
              ${day.status !== 'skipped' ? `<button class="btn-ghost" onclick="updateRoadmapDay(${day.day}, 'skipped')">⤼ Skip</button>` : ''}
            </div>
          </div>
        `;
      }).join('');

      const phaseHtml = `
        <div class="phase">
          <div class="phase-title">${phase.title.toUpperCase()}</div>
          <div class="timeline">
            ${daysHtml}
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', phaseHtml);
    });

    const pct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
    const bar = document.getElementById('roadmap-progress-bar');
    const txt = document.getElementById('roadmap-progress-text');

    if (bar) bar.style.width = `${pct}%`;
    if (txt) txt.textContent = `${pct}% complete (${completedDays}/${totalDays} days)`;

    updateChatSidebarTargets(path);

  } catch (error) {
    container.innerHTML = `<div class="muted">// error communicating with API</div>`;
  }
}

async function updateRoadmapDay(day, status) {
  try {
    const res = await fetch(`${API_BASE}/path/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, status })
    });
    const result = await res.json();
    if (result.success) {
      loadRoadmap();
      loadAnalytics();
    }
  } catch (error) {
    console.error('Roadmap update failure', error);
  }
}

async function regenerateRoadmap() {
  const btn = document.getElementById('regenerate-path');
  if (btn) btn.textContent = 'Generating...';

  try {
    const res = await fetch(`${API_BASE}/path/generate`, { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      loadRoadmap();
    }
  } catch (error) {
    console.error('Regenerate path failure', error);
  } finally {
    if (btn) btn.textContent = '⟳ Regenerate Hunt Path';
  }
}

const regenPathBtn = document.getElementById('regenerate-path');
if (regenPathBtn) regenPathBtn.addEventListener('click', regenerateRoadmap);

const expandAllPathBtn = document.getElementById('expand-all-path');
if (expandAllPathBtn) {
  expandAllPathBtn.addEventListener('click', () => {
    const allCards = document.querySelectorAll('.node');
    allCards.forEach(card => {
      const dayNum = parseInt(card.dataset.day);
      if (!isNaN(dayNum)) {
        expandedDays.add(dayNum);
        card.classList.add('expanded');
        const toggleIcon = card.querySelector('.node-toggle-icon');
        if (toggleIcon) toggleIcon.textContent = '▲';
      }
    });
  });
}

const collapseAllPathBtn = document.getElementById('collapse-all-path');
if (collapseAllPathBtn) {
  collapseAllPathBtn.addEventListener('click', () => {
    const allCards = document.querySelectorAll('.node');
    allCards.forEach(card => {
      const dayNum = parseInt(card.dataset.day);
      if (!isNaN(dayNum)) {
        expandedDays.delete(dayNum);
        card.classList.remove('expanded');
        const toggleIcon = card.querySelector('.node-toggle-icon');
        if (toggleIcon) toggleIcon.textContent = '▼';
      }
    });
  });
}

function updateChatSidebarTargets(path) {
  const listEl = document.querySelector('.target-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  // Find current active day topics
  let activeDay = null;
  for (const phase of (path.phases || [])) {
    for (const day of (phase.days || [])) {
      if (day.status === 'active' || day.status === 'pending') {
        activeDay = day;
        break;
      }
    }
    if (activeDay) break;
  }

  if (activeDay) {
    const topicsHtml = (activeDay.topics || []).map(topic =>
      `<li><span class="tag tag-high">ACTIVE</span> ${topic}</li>`
    ).join('');

    const tasksHtml = (activeDay.tasks || []).map(task =>
      `<li><span class="tag tag-med">TASK</span> ${task}</li>`
    ).join('');

    listEl.innerHTML = `
      <div style="font-weight:700; font-size:11px; margin-bottom:6px; color:var(--neon-cyan)">
        Day ${activeDay.day}: ${activeDay.title}
      </div>
      ${topicsHtml}
      ${tasksHtml}
    `;
  } else {
    listEl.innerHTML = `<li class="muted">No targets active. Complete/regenerate Hunt Path.</li>`;
  }
}

/* ========== Quest Board (Todo Kanban) ========== */
async function loadTodos() {
  const kanban = document.getElementById('kanban');
  if (!kanban) return;

  try {
    const res = await fetch(`${API_BASE}/todos`);
    const data = await res.json();

    if (!data.success) {
      kanban.innerHTML = `<div class="muted">// failed loading quests</div>`;
      return;
    }

    const list = data.todos;
    const columns = ['high', 'medium', 'low'];

    kanban.innerHTML = columns.map(c => {
      const colList = list.filter(q => q.priority.toLowerCase() === c);

      // Update header counters
      const counterEl = document.getElementById(`todo-count-${c}`);
      if (counterEl) counterEl.textContent = colList.length;

      const cardsHtml = colList.map(q => {
        const tagBadges = (q.tags || []).map(t => `<span>#${t}</span>`).join('');
        const isAi = q.source === 'ai_detected';

        return `
          <div class="quest-card">
            <div class="qc-title">${q.title}</div>
            ${q.description ? `<div class="qc-desc">${q.description}</div>` : ''}
            <div class="qc-tags">${tagBadges}</div>
            <div class="qc-meta">
              <span>📅 ${q.due_date || 'No Date'}</span>
              <span class="src-pill ${isAi ? 'src-ai' : 'src-manual'}">${isAi ? 'AI-Detected' : 'Manual'}</span>
            </div>
            <div class="qc-actions">
              ${q.status !== 'done' ? `<button class="btn-ghost" onclick="completeQuest(${q.id})">✓ Done</button>` : ''}
              <button class="btn-danger" onclick="deleteQuest(${q.id})">✕</button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="column col-${c}">
          <div class="col-head">
            <div class="col-title">${c.toUpperCase()} PRIORITY</div>
            <div class="col-count" id="todo-count-${c}">${colList.length}</div>
          </div>
          ${cardsHtml || '<div class="muted" style="text-align:center;padding:20px">// no quests</div>'}
        </div>
      `;
    }).join('');

    // Update Chat Sidebar Mini Quest list
    updateChatSidebarQuests(list);

  } catch (error) {
    kanban.innerHTML = `<div class="muted">// error communicating with API</div>`;
  }
}

window.completeQuest = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/todos/${id}/complete`, { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      loadTodos();
      loadAnalytics(); // Refresh completed counts
    }
  } catch (error) {
    console.error('Quest completion failure', error);
  }
};

window.deleteQuest = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/todos/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) loadTodos();
  } catch (error) {
    console.error('Quest delete failure', error);
  }
};

function updateChatSidebarQuests(todos) {
  const miniList = document.querySelector('.quest-mini');
  if (!miniList) return;

  const activeQuests = todos.filter(t => t.status !== 'done').slice(0, 4);

  if (activeQuests.length > 0) {
    miniList.innerHTML = activeQuests.map(q =>
      `<li><label><input type="checkbox" onclick="completeQuest(${q.id})"/> ${q.title}</label></li>`
    ).join('');
  } else {
    miniList.innerHTML = `<li class="muted">No active quests. Add some via Quest Board!</li>`;
  }
}

// Quest Modal management
const qModal = document.getElementById('quest-modal');
const openModalBtn = document.getElementById('open-quest-modal');
const closeModalBtn = document.getElementById('close-modal');
const saveQuestBtn = document.getElementById('q-save');

if (openModalBtn) openModalBtn.addEventListener('click', () => qModal.classList.add('show'));
if (closeModalBtn) closeModalBtn.addEventListener('click', () => qModal.classList.remove('show'));

if (saveQuestBtn) {
  saveQuestBtn.addEventListener('click', async () => {
    const title = document.getElementById('q-title').value.trim();
    if (!title) return;

    const description = document.getElementById('q-desc').value.trim();
    const priority = document.getElementById('q-prio').value.toLowerCase();
    const due_date = document.getElementById('q-due').value;
    const tagsStr = document.getElementById('q-tags').value;
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

    try {
      const res = await fetch(`${API_BASE}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, priority, due_date, tags })
      });
      const result = await res.json();
      if (result.success) {
        qModal.classList.remove('show');
        // Reset inputs
        ['q-title', 'q-desc', 'q-due', 'q-tags'].forEach(i => document.getElementById(i).value = '');
        loadTodos();
      }
    } catch (error) {
      console.error('Failed creating todo', error);
    }
  });
}

/* ========== Intel Vault (Knowledge Base) ========== */
async function loadSources() {
  const table = document.getElementById('vault-table');
  if (!table) return;

  try {
    const res = await fetch(`${API_BASE}/knowledge`);
    const data = await res.json();

    if (!data.success) {
      table.innerHTML = `<tr><td class="muted">Failed to load sources</td></tr>`;
      return;
    }

    const list = data.sources;

    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Chunks</th>
          <th>Status</th>
          <th>Created</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${list.map(s => `
          <tr>
            <td><a class="doc-link" onclick="openDocViewer(event, ${s.id})"><b>${s.name}</b></a></td>
            <td><span class="badge">${s.type.toUpperCase()}</span></td>
            <td>${s.chunk_count}</td>
            <td>
              <span class="st st-${s.status.toLowerCase()}">
                ${s.status === 'indexed' ? '● Indexed' : s.status === 'pending' ? '◐ Indexing' : '✕ Error'}
              </span>
            </td>
            <td>${s.created_at.slice(0, 10)}</td>
            <td><button class="btn-danger" onclick="deleteSource(${s.id})">Delete</button></td>
          </tr>
        `).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:20px">// no sources indexed</td></tr>'}
      </tbody>
    `;
  } catch (error) {
    table.innerHTML = `<tr><td class="muted">Connection error</td></tr>`;
  }
}

window.deleteSource = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/knowledge/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) loadSources();
  } catch (error) {
    console.error('Source delete failure', error);
  }
};

/* ========== Document Viewer & Analyst Chat ========== */
window.activeDocSourceId = null;
window.activeDocSessionId = null;

function addDocMsg(role, text) {
  const docFeed = document.getElementById('doc-chat-feed');
  if (!docFeed) return;
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'assistant' ? 'ai' : role);
  div.innerHTML = md(text);
  docFeed.appendChild(div);
  docFeed.scrollTop = docFeed.scrollHeight;
}

window.openDocViewer = async (event, sourceId) => {
  if (event) event.preventDefault();

  const vaultGrid = document.getElementById('vault-grid');
  const viewerGrid = document.getElementById('vault-viewer-grid');
  const docTitle = document.getElementById('doc-viewer-title');
  const docContent = document.getElementById('doc-viewer-content');
  const docFeed = document.getElementById('doc-chat-feed');

  if (!viewerGrid || !vaultGrid) return;

  docContent.innerHTML = `<span class="muted">// retrieving document from local vaults...</span>`;
  docFeed.innerHTML = '';

  vaultGrid.style.display = 'none';
  viewerGrid.style.display = 'grid';

  window.activeDocSourceId = sourceId;
  window.activeDocSessionId = `doc_chat_${sourceId}`;

  try {
    const res = await fetch(`${API_BASE}/knowledge/${sourceId}/content`);
    const data = await res.json();

    if (data.success) {
      docTitle.textContent = data.name;
      docContent.textContent = data.content || '// Document has no text content.';
    } else {
      docContent.innerHTML = `<span style="color:var(--red);">Error: ${data.error || 'failed to load document content'}</span>`;
    }
  } catch (err) {
    console.error(err);
    docContent.innerHTML = `<span style="color:var(--red);">Error: Failed to fetch document content.</span>`;
  }

  try {
    const res = await fetch(`${API_BASE}/chat/history?session_id=${window.activeDocSessionId}`);
    const data = await res.json();
    if (data.success && data.history) {
      if (data.history.length === 0) {
        addDocMsg('assistant', `### Document Analyst Active 🧐\nI've loaded this document and am ready to answer any questions you have about it! Ask me anything.`);
      } else {
        data.history.forEach(m => {
          addDocMsg(m.role, m.content);
        });
      }
    }
  } catch (err) {
    console.error('Failed to load doc chat history', err);
  }
};

window.closeDocViewer = () => {
  const vaultGrid = document.getElementById('vault-grid');
  const viewerGrid = document.getElementById('vault-viewer-grid');
  if (vaultGrid && viewerGrid) {
    viewerGrid.style.display = 'none';
    vaultGrid.style.display = 'grid';
  }
  window.activeDocSourceId = null;
  window.activeDocSessionId = null;
};

/* ========== Dedicated Document Forensics Tab logic ========== */
window.activeForensicsSourceId = null;
window.activeForensicsSessionId = null;

window.adjustForensicsElaContrast = (val) => {
  const img = document.getElementById('f-ela-img');
  const txt = document.getElementById('f-ela-contrast-val');
  if (img) img.style.filter = `brightness(${val})`;
  if (txt) txt.textContent = `${val}x`;
};

function addForensicsDocMsg(role, text) {
  const feed = document.getElementById('f-chat-feed');
  if (!feed) return;
  const div = document.createElement('div');
  div.className = 'msg ' + (role === 'assistant' ? 'ai' : role);
  div.innerHTML = md(text);
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

window.loadForensicsRecords = async () => {
  const listContainer = document.getElementById('forensics-history-list');
  if (!listContainer) return;
  listContainer.innerHTML = '<div class="muted" style="text-align:center;padding:10px">// loading archive...</div>';

  try {
    const res = await fetch(`${API_BASE}/knowledge`);
    const data = await res.json();
    if (data.success) {
      // Filter PDFs and images
      const docs = data.sources.filter(s => ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(s.type.toLowerCase()));
      listContainer.innerHTML = '';
      
      if (docs.length === 0) {
        listContainer.innerHTML = '<div class="muted" style="text-align:center;padding:15px">// no documents uploaded yet</div>';
        return;
      }
      
      for (const d of docs) {
        // Fetch if it has analysis data
        const aRes = await fetch(`${API_BASE}/knowledge/${d.id}/analysis`);
        const aData = await aRes.json();
        
        const row = document.createElement('div');
        row.style.padding = '8px 10px';
        row.style.background = 'rgba(0,0,0,0.25)';
        row.style.border = '1px solid var(--border)';
        row.style.borderRadius = '5px';
        row.style.cursor = 'pointer';
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '4px';
        row.style.transition = '0.2s';
        
        let scorePill = '';
        if (aData.success && aData.analyzed) {
          const score = aData.score || 0;
          const risk = aData.risk_level || 'LOW';
          const badgeClass = risk === 'HIGH' ? 'tag-high' : risk === 'MEDIUM' ? 'tag-med' : 'tag-low';
          scorePill = `<span class="tag ${badgeClass}" style="margin-left: auto;">${score.toFixed(0)}/100</span>`;
        } else {
          scorePill = `<span class="tag tag-low" style="background:rgba(255,255,255,0.05);color:var(--muted);border-color:transparent;margin-left:auto;">Unscanned</span>`;
        }

        row.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <b style="font-size:11.5px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;">${d.name}</b>
            ${scorePill}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted)">
            <span>${d.type.toUpperCase()} · ${d.created_at.slice(0, 10)}</span>
          </div>
        `;
        
        row.addEventListener('click', () => {
          // highlight active record
          const siblings = listContainer.children;
          for (const s of siblings) s.style.borderColor = 'var(--border)';
          row.style.borderColor = 'var(--green)';
          
          window.selectForensicsDoc(d.id, d.name);
        });
        
        listContainer.appendChild(row);
      }
    }
  } catch (err) {
    console.error(err);
    listContainer.innerHTML = '<div class="muted" style="text-align:center;padding:10px">// error loading archive</div>';
  }
};

window.selectForensicsDoc = async (sourceId, name) => {
  window.activeForensicsSourceId = sourceId;
  window.activeForensicsSessionId = `doc_forensics_${sourceId}`;

  const badge = document.getElementById('forensics-file-badge');
  if (badge) {
    badge.textContent = name;
    badge.style.borderColor = 'var(--green)';
    badge.style.color = 'var(--green)';
  }

  // Clear chat feed and load placeholder or history
  const feed = document.getElementById('f-chat-feed');
  if (feed) feed.innerHTML = '<div class="muted">// loading conversation...</div>';

  try {
    const res = await fetch(`${API_BASE}/chat/history?session_id=${window.activeForensicsSessionId}`);
    const data = await res.json();
    if (data.success && data.history) {
      feed.innerHTML = '';
      if (data.history.length === 0) {
        addForensicsDocMsg('assistant', `### Document Chat active 🧐\nAsk me anything about **${name}**! I will use semantic context search inside this file.`);
      } else {
        data.history.forEach(m => {
          addForensicsDocMsg(m.role, m.content);
        });
      }
    }
  } catch (err) {
    console.error(err);
  }

  // Check analysis report
  const emptyState = document.getElementById('forensics-state-empty');
  const loaderState = document.getElementById('forensics-state-loading');
  const reportState = document.getElementById('forensics-state-report');

  emptyState.style.display = 'none';
  loaderState.style.display = 'flex';
  reportState.style.display = 'none';
  document.getElementById('forensics-loading-title').textContent = 'Fetching report...';
  document.getElementById('forensics-loading-subtitle').textContent = 'Reading database records...';

  try {
    const res = await fetch(`${API_BASE}/knowledge/${sourceId}/analysis`);
    const data = await res.json();
    if (data.success && data.analyzed) {
      renderForensicsDashboard(data);
    } else {
      // Trigger pipeline automatically!
      window.runForensicsAnalysis(sourceId);
    }
  } catch (err) {
    console.error(err);
    loaderState.style.display = 'none';
    emptyState.style.display = 'flex';
  }
};

window.runForensicsAnalysis = async (sourceId) => {
  const loaderState = document.getElementById('forensics-state-loading');
  const reportState = document.getElementById('forensics-state-report');
  const emptyState = document.getElementById('forensics-state-empty');

  emptyState.style.display = 'none';
  loaderState.style.display = 'flex';
  reportState.style.display = 'none';

  const loadingTitle = document.getElementById('forensics-loading-title');
  const loadingSubtitle = document.getElementById('forensics-loading-subtitle');
  
  loadingTitle.textContent = 'Orchestrating Forensic Agents...';
  loadingSubtitle.textContent = 'Launching cognitive agent cluster...';

  const steps = [
    "ExtractorAgent: Reading files and indexing layout structures...",
    "VerifierAgent: Running ELA tampering checks...",
    "VerifierAgent: Matching regulatory keywords and signature checks...",
    "AnalystAgent: Transmitting queries to Gemini cognitive node...",
    "ReporterAgent: Formatting gauge outputs and matplotlib visualizer..."
  ];
  
  let currentStep = 0;
  const progressTimer = setInterval(() => {
    if (currentStep < steps.length) {
      loadingSubtitle.textContent = steps[currentStep];
      currentStep++;
    }
  }, 2500);

  try {
    const res = await fetch(`${API_BASE}/knowledge/${sourceId}/analyze`, { method: 'POST' });
    const data = await res.json();
    clearInterval(progressTimer);
    
    if (data.success) {
      renderForensicsDashboard(data);
      // Reload the archive list to update the score tags
      loadForensicsRecords();
    } else {
      alert(`Forensics Failed: ${data.error}`);
      loaderState.style.display = 'none';
      emptyState.style.display = 'flex';
    }
  } catch (err) {
    clearInterval(progressTimer);
    console.error(err);
    alert(`Forensics Error: ${err.message}`);
    loaderState.style.display = 'none';
    emptyState.style.display = 'flex';
  }
};

window.renderForensicsDashboard = (data) => {
  document.getElementById('forensics-state-loading').style.display = 'none';
  document.getElementById('forensics-state-report').style.display = 'flex';

  const score = data.score || 0;
  const verdict = data.verdict || 'Unknown';
  const risk = data.risk_level || 'LOW';

  const scoreEl = document.getElementById('f-score-text');
  const verdictEl = document.getElementById('f-verdict-text');
  if (scoreEl) scoreEl.innerHTML = `${score.toFixed(1)} <span style="font-size: 10px; color: var(--muted);">/ 100</span>`;
  if (verdictEl) {
    verdictEl.textContent = verdict;
    if (risk === 'HIGH') verdictEl.style.color = 'var(--red)';
    else if (risk === 'MEDIUM') verdictEl.style.color = 'var(--amber)';
    else verdictEl.style.color = 'var(--green)';
  }

  // Visual dashboard img
  const chartImg = document.getElementById('f-chart-img');
  if (chartImg) {
    chartImg.src = `${API_BASE}/analysis/image/${data.dashboard_image}?t=${Date.now()}`;
  }

  // ELA image
  const elaCard = document.getElementById('f-ela-card');
  const elaImg = document.getElementById('f-ela-img');
  if (data.ela_image) {
    if (elaCard) elaCard.style.display = 'block';
    if (elaImg) {
      elaImg.src = `${API_BASE}/analysis/image/${data.ela_image}?t=${Date.now()}`;
      const slider = document.getElementById('f-ela-contrast-range');
      if (slider) slider.value = 1.0;
      adjustForensicsElaContrast(1.0);
    }
  } else {
    if (elaCard) elaCard.style.display = 'none';
  }

  // AI summary & expert view
  const summaryEl = document.getElementById('f-summary');
  const expertEl = document.getElementById('f-expert-view');
  if (summaryEl) summaryEl.innerHTML = md(data.report.ai_analysis.summary || 'No summary generated.');
  if (expertEl) expertEl.innerHTML = md(data.report.ai_analysis.expert_view || 'No expert opinion generated.');

  // Render checklist
  const checklistEl = document.getElementById('f-checklist');
  if (checklistEl && data.report.authenticity && data.report.authenticity.layer_scores) {
    checklistEl.innerHTML = '';
    const layers = data.report.authenticity.layer_scores;
    
    Object.entries(layers).forEach(([layerName, layerScore]) => {
      let icon = '✓';
      let iconClass = 'pass';
      if (layerScore < 60) {
        icon = '✕';
        iconClass = 'fail';
      } else if (layerScore < 85) {
        icon = '⚠';
        iconClass = 'warning';
      }

      const layerFlags = data.report.flags ? data.report.flags.filter(f => {
        const lLower = layerName.toLowerCase();
        if (lLower.includes('metadata') && (f.toLowerCase().includes('meta') || f.toLowerCase().includes('save') || f.toLowerCase().includes('tool') || f.toLowerCase().includes('edit'))) return true;
        if (lLower.includes('ela') && (f.toLowerCase().includes('ela') || f.toLowerCase().includes('tamper') || f.toLowerCase().includes('hotspot'))) return true;
        if (lLower.includes('signature') && (f.toLowerCase().includes('sig') || f.toLowerCase().includes('pkcs') || f.toLowerCase().includes('unsigned'))) return true;
        if (lLower.includes('text') && (f.toLowerCase().includes('aadhaar') || f.toLowerCase().includes('pan') || f.toLowerCase().includes('keyword') || f.toLowerCase().includes('administrative'))) return true;
        if (lLower.includes('qr') && (f.toLowerCase().includes('qr') || f.toLowerCase().includes('domain') || f.toLowerCase().includes('code'))) return true;
        return false;
      }) : [];

      let flagsHtml = '';
      if (layerFlags.length > 0) {
        flagsHtml = `<div class="check-item-flags">${layerFlags.map(f => `<span>• ${f}</span>`).join('')}</div>`;
      }

      const itemDiv = document.createElement('div');
      itemDiv.className = 'check-item-container';
      itemDiv.innerHTML = `
        <div class="check-item">
          <div class="check-item-left">
            <span class="check-item-icon ${iconClass}">${icon}</span>
            <span class="check-item-name">${layerName}</span>
          </div>
          <span class="check-item-score">${layerScore} / 100</span>
        </div>
        ${flagsHtml}
      `;
      checklistEl.appendChild(itemDiv);
    });
  }

  // Entities
  const entitiesEl = document.getElementById('f-entities');
  if (entitiesEl) {
    entitiesEl.innerHTML = '';
    const ent = data.report.ai_analysis.entities || {};
    let hasEntities = false;
    Object.entries(ent).forEach(([cat, list]) => {
      if (list && list.length > 0) {
        hasEntities = true;
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.marginBottom = '4px';
        row.innerHTML = `
          <span style="color:var(--cyan);width:90px;text-transform:uppercase;font-weight:bold;">${cat}:</span>
          <span style="color:var(--text);flex:1;">${list.join(', ')}</span>
        `;
        entitiesEl.appendChild(row);
      }
    });
    if (!hasEntities) entitiesEl.innerHTML = '<span class="muted">// no significant entities extracted</span>';
  }

  // Insights
  const insightsEl = document.getElementById('f-insights');
  if (insightsEl) {
    insightsEl.innerHTML = '';
    const ins = data.report.ai_analysis.insights || [];
    if (ins.length > 0) {
      ins.forEach(i => {
        const li = document.createElement('li');
        li.textContent = i;
        insightsEl.appendChild(li);
      });
    } else {
      insightsEl.innerHTML = '<li class="muted">// no AI insights generated</li>';
    }
  }

  // Metadata Inspector Table
  const metaCard = document.getElementById('f-meta-card');
  const metaTable = document.getElementById('f-metadata-table');
  if (metaTable) {
    metaTable.innerHTML = '';
    let hasMeta = false;
    if (data.report.extraction) {
      hasMeta = true;
      metaTable.innerHTML += `<tr><td>Filename</td><td>${data.report.file_name}</td></tr>`;
      metaTable.innerHTML += `<tr><td>Format</td><td>${data.report.file_type.toUpperCase()}</td></tr>`;
      metaTable.innerHTML += `<tr><td>Extract Method</td><td>${data.report.extraction.method || 'N/A'}</td></tr>`;
      metaTable.innerHTML += `<tr><td>Page Count</td><td>${data.report.extraction.pages || 1}</td></tr>`;
      metaTable.innerHTML += `<tr><td>Text Size</td><td>${data.report.extraction.text_length || 0} characters</td></tr>`;
    }
    if (hasMeta) {
      if (metaCard) metaCard.style.display = 'block';
    } else {
      if (metaCard) metaCard.style.display = 'none';
    }
  }
};

window.sendForensicsDocChatMessage = async () => {
  const input = document.getElementById('f-chat-input');
  const feed = document.getElementById('f-chat-feed');
  if (!input || !feed || !window.activeForensicsSourceId) return;

  const message = input.value.trim();
  if (!message) return;

  addForensicsDocMsg('user', message);
  input.value = '';

  const aiDiv = document.createElement('div');
  aiDiv.className = 'msg ai';
  aiDiv.innerHTML = `<span class="muted streaming-cursor">// consulting forensic database...</span>`;
  feed.appendChild(aiDiv);
  feed.scrollTop = feed.scrollHeight;

  let fullText = '';

  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: window.activeForensicsSessionId,
        source_id: window.activeForensicsSourceId
      })
    });

    if (!response.ok) {
      aiDiv.innerHTML = `⚠️ **Server error**: ${response.status}`;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let firstToken = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'token') {
            if (firstToken) {
              aiDiv.innerHTML = '';
              firstToken = false;
            }
            fullText += data.text;
            aiDiv.innerHTML = md(fullText) + '<span class="streaming-cursor">▌</span>';
            feed.scrollTop = feed.scrollHeight;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    aiDiv.innerHTML = md(fullText);
    feed.scrollTop = feed.scrollHeight;
  } catch (err) {
    console.error(err);
    aiDiv.innerHTML = `⚠️ **Connection failed**: ${err.message}`;
  }
};

window.clearForensicsDocChatHistory = async () => {
  if (!window.activeForensicsSessionId) return;
  if (confirm('Clear chat history for this document?')) {
    try {
      const res = await fetch(`${API_BASE}/chat/history?session_id=${window.activeForensicsSessionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        const feed = document.getElementById('f-chat-feed');
        if (feed) {
          feed.innerHTML = '';
          addForensicsDocMsg('assistant', `### History Cleared\nAsk me anything about this document.`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
};

// Bind Forensics events
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'f-chat-send') {
    window.sendForensicsDocChatMessage();
  }
  if (e.target && e.target.id === 'f-chat-clear') {
    window.clearForensicsDocChatHistory();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target && e.target.id === 'f-chat-input') {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      window.sendForensicsDocChatMessage();
    }
  }
});

// Dropzone for dedicated Forensics Tab
document.addEventListener('DOMContentLoaded', () => {
  const fDropzone = document.getElementById('forensics-dropzone');
  const fFilein = document.getElementById('forensics-filein');
  
  if (fDropzone && fFilein) {
    fDropzone.addEventListener('click', () => fFilein.click());
    fDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fDropzone.classList.add('drag');
    });
    fDropzone.addEventListener('dragleave', () => fDropzone.classList.remove('drag'));
    
    fDropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      fDropzone.classList.remove('drag');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        window.uploadForensicsFile(files[0]);
      }
    });
    
    fFilein.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        window.uploadForensicsFile(files[0]);
      }
    });
  }
});

window.uploadForensicsFile = async (file) => {
  const emptyState = document.getElementById('forensics-state-empty');
  const loaderState = document.getElementById('forensics-state-loading');
  const reportState = document.getElementById('forensics-state-report');

  emptyState.style.display = 'none';
  loaderState.style.display = 'flex';
  reportState.style.display = 'none';
  document.getElementById('forensics-loading-title').textContent = 'Uploading Document...';
  document.getElementById('forensics-loading-subtitle').textContent = `Transmitting ${file.name} to secure storage...`;

  const form = new FormData();
  form.append('file', file);
  
  try {
    const res = await fetch(`${API_BASE}/knowledge/upload`, {
      method: 'POST',
      body: form
    });
    const result = await res.json();
    if (result.success) {
      const sourceId = result.source_id;
      // Triggers analysis automatically!
      window.selectForensicsDoc(sourceId, file.name);
    } else {
      alert(`Upload Failed: ${result.error}`);
      loaderState.style.display = 'none';
      emptyState.style.display = 'flex';
    }
  } catch (err) {
    console.error(err);
    alert(`Upload Error: ${err.message}`);
    loaderState.style.display = 'none';
    emptyState.style.display = 'flex';
  }
};


window.sendDocChatMessage = async () => {
  const input = document.getElementById('doc-chat-input');
  const docFeed = document.getElementById('doc-chat-feed');
  if (!input || !docFeed || !window.activeDocSourceId) return;

  const message = input.value.trim();
  if (!message) return;

  addDocMsg('user', message);
  input.value = '';

  const aiDiv = document.createElement('div');
  aiDiv.className = 'msg ai';
  aiDiv.innerHTML = `<span class="muted streaming-cursor">// consulting document segments...</span>`;
  docFeed.appendChild(aiDiv);
  docFeed.scrollTop = docFeed.scrollHeight;

  let fullText = '';

  try {
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: window.activeDocSessionId,
        source_id: window.activeDocSourceId
      })
    });

    if (!response.ok) {
      aiDiv.innerHTML = `⚠️ **Server error**: ${response.status}`;
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let firstToken = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'token') {
            if (firstToken) {
              aiDiv.innerHTML = '';
              firstToken = false;
            }
            fullText += data.text;
            aiDiv.innerHTML = md(fullText) + '<span class="streaming-cursor">▌</span>';
            docFeed.scrollTop = docFeed.scrollHeight;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    aiDiv.innerHTML = md(fullText);
    docFeed.scrollTop = docFeed.scrollHeight;
  } catch (err) {
    console.error('Doc chat stream failure', err);
    aiDiv.innerHTML = `⚠️ **Connection failed**: ${err.message}`;
  }
};

window.clearDocChatHistory = async () => {
  if (!window.activeDocSessionId) return;
  if (confirm('Clear chat history for this document?')) {
    try {
      const res = await fetch(`${API_BASE}/chat/history?session_id=${window.activeDocSessionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        const docFeed = document.getElementById('doc-chat-feed');
        if (docFeed) {
          docFeed.innerHTML = '';
          addDocMsg('assistant', `### History Cleared\nAsk me anything about this document.`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }
};

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'doc-chat-send') {
    window.sendDocChatMessage();
  }
  if (e.target && e.target.id === 'doc-chat-clear') {
    window.clearDocChatHistory();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target && e.target.id === 'doc-chat-input') {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      window.sendDocChatMessage();
    }
  }
});

// URL Scraping
const urlBtn = document.getElementById('url-btn');
if (urlBtn) {
  urlBtn.addEventListener('click', async () => {
    const input = document.getElementById('url-in');
    const url = input.value.trim();
    if (!url) return;

    urlBtn.textContent = 'Scraping...';
    try {
      const res = await fetch(`${API_BASE}/knowledge/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const result = await res.json();
      if (result.success) {
        input.value = '';
        loadSources();
      } else {
        alert(`Indexing Failed: ${result.error}`);
      }
    } catch (error) {
      console.error('URL indexing failed', error);
    } finally {
      urlBtn.textContent = 'Index';
    }
  });
}

// Save Custom Note
const noteBtn = document.getElementById('note-btn');
if (noteBtn) {
  noteBtn.addEventListener('click', async () => {
    const titleInput = document.getElementById('note-title');
    const bodyInput = document.getElementById('note-body');
    const title = titleInput.value.trim();
    const content = bodyInput.value.trim();

    if (!title || !content) return;

    noteBtn.textContent = 'Saving...';
    try {
      const res = await fetch(`${API_BASE}/knowledge/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      const result = await res.json();
      if (result.success) {
        titleInput.value = '';
        bodyInput.value = '';
        loadSources();
      } else {
        alert(`Note Save Failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Note indexing failed', error);
    } finally {
      noteBtn.textContent = 'Save Note';
    }
  });
}

// Drag and Drop files
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('filein');

if (dropzone && fileInput) {
  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('drag');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));

  const handleFilesUpload = async (files) => {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE}/knowledge/upload`, {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        if (result.success) {
          loadSources();
        } else {
          alert(`File upload failed: ${result.error}`);
        }
      } catch (error) {
        console.error('File index exception', error);
      }
    }
  };

  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag');
    handleFilesUpload(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', e => {
    handleFilesUpload(e.target.files);
  });
}

/* ========== Terminal Stats (Profile & Analytics) ========== */
async function loadProfileAndSettings() {
  try {
    const res = await fetch(`${API_BASE}/profile`);
    const data = await res.json();

    if (!data.success) return;

    const profile = data.profile;
    const settings = data.settings;

    // Header & Info HUDs
    const streakDays = profile.streak_counter || 0;
    const streakEl = document.getElementById('stat-streak');
    if (streakEl) streakEl.textContent = `${streakDays}🔥`;

    const hStreak = document.getElementById('header-streak');
    if (hStreak) hStreak.textContent = `${streakDays} day${streakDays !== 1 ? 's' : ''}`;

    // Load inputs in Profile Editor
    const nameInput = document.getElementById('profile-name');
    const goalInput = document.getElementById('profile-goal');
    const targetInput = document.getElementById('profile-target');
    const dateInput = document.getElementById('profile-start-date');

    if (nameInput) nameInput.value = profile.name || '';
    if (goalInput) goalInput.value = profile.goal || '';
    if (targetInput) targetInput.value = profile.daily_study_time || 60;
    if (dateInput) dateInput.value = profile.start_date || '';

    // Load Settings Toggles
    const toggle = document.getElementById('grammar-toggle');
    if (toggle) toggle.checked = settings.english_correction || false;

    // Load Feature Toggles
    const defaultToggles = {
      music: true,
      path: true,
      quests: true,
      vault: true,
      'doc-analysis': true,
      arcade: true
    };
    const toggles = settings.feature_toggles || defaultToggles;
    
    // Apply defaults to any missing keys
    for (const key in defaultToggles) {
      if (toggles[key] === undefined) {
        toggles[key] = defaultToggles[key];
      }
    }
    
    // Check checkboxes and apply visibility
    const featureKeys = ['music', 'path', 'quests', 'vault', 'doc-analysis', 'arcade'];
    featureKeys.forEach(key => {
      const chk = document.getElementById(`toggle-feat-${key}`);
      if (chk) {
        chk.checked = toggles[key];
      }
      updateFeatureVisibility(key, toggles[key]);
    });

  } catch (error) {
    console.error('Failed to load profile', error);
  }
}

// Update Profile Form Submit
const saveProfileBtn = document.getElementById('profile-save');
if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', async () => {
    const name = document.getElementById('profile-name').value.trim();
    const goal = document.getElementById('profile-goal').value.trim();
    const daily_study_time = parseInt(document.getElementById('profile-target').value, 10) || 60;
    const start_date = document.getElementById('profile-start-date').value;

    saveProfileBtn.textContent = 'Saving...';
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { name, goal, daily_study_time, start_date }
        })
      });
      const result = await res.json();
      if (result.success) {
        alert('Profile saved successfully! Hunt path regenerated.');
        loadProfileAndSettings();
        loadRoadmap(); // Refresh roadmap
      }
    } catch (error) {
      console.error('Profile save exception', error);
    } finally {
      saveProfileBtn.textContent = 'Save Profile';
    }
  });
}

// Toggle English mode
window.toggleEnglishMode = async (checkbox) => {
  // Empty, handled by grammar-toggle event listener
};

const grammarToggle = document.getElementById('grammar-toggle');
if (grammarToggle) {
  grammarToggle.addEventListener('change', async (e) => {
    const active = e.target.checked;
    try {
      await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { english_correction: active }
        })
      });
    } catch (error) {
      console.error('Settings save exception', error);
    }
  });
}

// Toggle feature access visibility in layout and switch panels if necessary
function updateFeatureVisibility(key, enabled) {
  const navItem = document.querySelector(`.nav-item[data-panel="${key}"]`);
  if (navItem) {
    navItem.style.display = enabled ? 'flex' : 'none';
  }
  
  // Special handling for Music Player: also hide the topbar/sidebar widgets
  if (key === 'music') {
    const sideDeck = document.getElementById('sidebar-music-deck');
    const topDeck = document.getElementById('topbar-music-deck');
    if (sideDeck) sideDeck.style.display = enabled ? 'flex' : 'none';
    if (topDeck) topDeck.style.display = enabled ? 'flex' : 'none';
    
    // If music player is disabled, pause the audio if playing
    if (!enabled) {
      const audioEl = document.getElementById('music-audio-el');
      if (audioEl && !audioEl.paused) {
        audioEl.pause();
        const sidePlayBtn = document.getElementById('side-music-play');
        const topPlayBtn = document.getElementById('top-music-play');
        const playPauseBtn = document.getElementById('music-play-pause');
        if (sidePlayBtn) sidePlayBtn.textContent = '▶';
        if (topPlayBtn) topPlayBtn.textContent = '▶';
        if (playPauseBtn) playPauseBtn.textContent = '▶';
      }
    }
  }
  
  // Special handling for Arcade
  if (key === 'arcade') {
    if (!enabled && typeof window.stopArcadePanel === 'function') {
      window.stopArcadePanel();
    }
  }
  
  // If active panel is the disabled one, fallback to AI Assistant (mentor)
  const activeNavItem = document.querySelector('.nav-item.active');
  if (activeNavItem && activeNavItem.dataset.panel === key && !enabled) {
    switchPanel('mentor');
  }
}

// Bind feature toggle event listeners
const featureKeys = ['music', 'path', 'quests', 'vault', 'doc-analysis', 'arcade'];
featureKeys.forEach(key => {
  const chk = document.getElementById(`toggle-feat-${key}`);
  if (chk) {
    chk.addEventListener('change', async (e) => {
      const active = e.target.checked;
      
      // Update UI state immediately
      updateFeatureVisibility(key, active);
      
      try {
        const profileRes = await fetch(`${API_BASE}/profile`);
        const profileData = await profileRes.json();
        if (profileData.success) {
          const currentSettings = profileData.settings || {};
          const currentToggles = currentSettings.feature_toggles || {};
          currentToggles[key] = active;
          
          await fetch(`${API_BASE}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              settings: {
                feature_toggles: currentToggles
              }
            })
          });
        }
      } catch (error) {
        console.error(`Failed to save feature toggle for ${key}`, error);
      }
    });
  }
});

async function loadAnalytics() {
  // 1. Overview cards
  try {
    const resOverview = await fetch(`${API_BASE}/analytics/overview`);
    const dataOverview = await resOverview.json();

    if (dataOverview.success) {
      const stats = dataOverview.overview;
      const hoursEl = document.getElementById('stat-hours');
      const questsEl = document.getElementById('stat-quests');
      const consistencyEl = document.getElementById('stat-consistency');

      if (hoursEl) hoursEl.textContent = stats.study_hours;
      if (questsEl) questsEl.textContent = stats.completed_todos;
      if (consistencyEl) consistencyEl.textContent = `${stats.consistency_score}%`;
    }
  } catch (e) {
    console.error('Analytics overview load failure', e);
  }

  // 2. Skills matrix
  try {
    const resSkills = await fetch(`${API_BASE}/analytics/skills`);
    const dataSkills = await resSkills.json();

    if (dataSkills.success) {
      const list = dataSkills.skills;
      const skillsContainer = document.getElementById('skills');
      if (skillsContainer) {
        skillsContainer.innerHTML = list.map(s => `
          <div class="skill">
            <div class="skill-row"><span>${s.skill}</span><b>${s.level} (${s.progress}%)</b></div>
            <div class="skill-bar"><i style="width:${s.progress}%"></i></div>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    console.error('Skills load failure', e);
  }

  // 3. Render 7-day SVG chart
  try {
    const resWeekly = await fetch(`${API_BASE}/analytics/weekly`);
    const dataWeekly = await resWeekly.json();

    if (dataWeekly.success) {
      const list = dataWeekly.weekly;
      renderSVGChart(list);
    }
  } catch (e) {
    console.error('Weekly progress load failure', e);
  }
}

function renderSVGChart(weeklyData) {
  const svg = document.getElementById('chart');
  if (!svg || !weeklyData || weeklyData.length === 0) return;

  const days = weeklyData.map(d => d.day.toUpperCase());
  const q = weeklyData.map(d => d.questions);
  const t = weeklyData.map(d => d.tasks_completed);

  const W = 420, H = 200, pad = 28;
  const max = Math.max(...q, ...t, 5) + 2; // Default scale height at least 5

  const x = i => pad + (i * (W - pad * 2) / (days.length - 1));
  const y = v => H - pad - (v / max) * (H - pad * 2);

  let g = '';
  // grid lines
  for (let i = 0; i < 5; i++) {
    const yy = pad + i * (H - pad * 2) / 4;
    g += `<line x1="${pad}" y1="${yy}" x2="${W - pad / 2}" y2="${yy}" stroke="rgba(0,255,163,.08)" />`;
  }

  // axes labels
  days.forEach((d, i) => {
    g += `<text x="${x(i)}" y="${H - 8}" fill="#6c8290" font-size="9" text-anchor="middle" font-family="JetBrains Mono">${d}</text>`;
  });

  // lines paths
  const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  g += `<path d="${path(q)}" stroke="#00ffa3" stroke-width="2" fill="none" filter="drop-shadow(0 0 6px #00ffa3)"/>`;
  g += `<path d="${path(t)}" stroke="#00d4ff" stroke-width="2" fill="none" filter="drop-shadow(0 0 6px #00d4ff)"/>`;

  // node dots
  q.forEach((v, i) => {
    g += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#00ffa3"/>`;
  });
  t.forEach((v, i) => {
    g += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#00d4ff"/>`;
  });

  svg.innerHTML = g;
}

/* ========== Settings (Key Pool Manager) ========== */
async function loadKeys() {
  const table = document.getElementById('keys-table');
  if (!table) return;

  try {
    const res = await fetch(`${API_BASE}/keys`);
    const data = await res.json();

    if (!data.success) return;

    const list = data.keys;
    table.innerHTML = `
      <thead>
        <tr>
          <th>Label</th>
          <th>Key (masked)</th>
          <th>Status</th>
          <th>Requests</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${list.map(k => {
      let stLabel = k.status;
      if (k.status === 'Cooling Down') {
        const left = Math.max(0, Math.round((k.cooldown_until - Date.now() / 1000)));
        stLabel = `Cooling (${left}s)`;
      }
      return `
            <tr id="key-row-${k.id}">
              <td><b>${k.label}</b></td>
              <td style="font-size:11px">${k.masked_key}</td>
              <td><span class="st st-${k.status.toLowerCase().replace(' ', '')}">${stLabel}</span></td>
              <td>${k.request_count} / <span style="color:#ff4d6a">${k.error_count}</span></td>
              <td style="display:flex;gap:6px">
                <button class="btn-ghost" style="font-size:10px;padding:3px 8px" onclick="testKey('${k.id}')">⚡ Test</button>
                <button class="btn-danger" style="font-size:10px;padding:3px 8px" onclick="deleteKey('${k.id}')">✕</button>
              </td>
            </tr>
            <tr id="test-result-${k.id}" style="display:none">
              <td colspan="5" id="test-msg-${k.id}" style="padding:6px 12px;font-size:11px"></td>
            </tr>
          `;
    }).join('') || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">// no keys registered</td></tr>'}
      </tbody>
    `;

    // Automatically update the top active key HUD
    const activeKeyInfo = list.find(k => k.status === 'Active');
    const headerKey = document.getElementById('header-active-key');
    if (headerKey) {
      headerKey.textContent = activeKeyInfo ? activeKeyInfo.masked_key : 'None';
    }
  } catch (error) {
    console.error('Keys load failure', error);
  }
}

window.deleteKey = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/keys/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) loadKeys();
  } catch (error) {
    console.error('Key delete failure', error);
  }
};

window.testKey = async (id) => {
  const btn = document.querySelector(`#key-row-${id} button`);
  const resultRow = document.getElementById(`test-result-${id}`);
  const msgEl = document.getElementById(`test-msg-${id}`);
  if (!msgEl) return;

  if (btn) { btn.textContent = '⏳ Testing...'; btn.disabled = true; }
  resultRow.style.display = 'table-row';
  msgEl.innerHTML = `<span style="color:var(--muted)">// calling API...</span>`;

  try {
    const r = await fetch(`${API_BASE}/keys/${id}/test`, { method: 'POST' });
    const d = await r.json();

    if (d.success) {
      msgEl.innerHTML = `<span style="color:var(--green)">✓ WORKING — ${d.duration_ms}ms — reply: "${d.reply}"</span>`;
    } else {
      const colors = { quota_exceeded: 'var(--amber)', invalid_key: 'var(--red)', error: 'var(--red)' };
      const col = colors[d.status] || 'var(--red)';
      const labels = { quota_exceeded: '⚠ QUOTA EXCEEDED', invalid_key: '✕ INVALID KEY', error: '✕ ERROR' };
      msgEl.innerHTML = `<span style="color:${col}">${labels[d.status] || '✕ FAILED'} — ${d.error}</span>`;
    }
    loadKeys(); // refresh status/error counts
  } catch (e) {
    msgEl.innerHTML = `<span style="color:var(--red)">✕ Network error: ${e.message}</span>`;
  }

  if (btn) { btn.textContent = '⚡ Test'; btn.disabled = false; }
};

const registerKeyBtn = document.getElementById('add-key');
if (registerKeyBtn) {
  registerKeyBtn.addEventListener('click', async () => {
    const keyInput = document.getElementById('new-key');
    const labelInput = document.getElementById('new-label');
    const key = keyInput.value.trim();
    const label = labelInput.value.trim() || 'unnamed';

    if (!key) return;

    try {
      const res = await fetch(`${API_BASE}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, label })
      });
      const result = await res.json();
      if (result.success) {
        keyInput.value = '';
        labelInput.value = '';
        loadKeys();
      } else {
        alert(`Failed adding key: ${result.error}`);
      }
    } catch (error) {
      console.error('Key add failed', error);
    }
  });
}

// Active key / model header updating
async function loadActiveStateHeader() {
  try {
    const resKeys = await fetch(`${API_BASE}/keys`);
    const dataKeys = await resKeys.json();

    if (dataKeys.success) {
      const list = dataKeys.keys;
      const activeKeyInfo = list.find(k => k.status === 'Active');
      const headerKey = document.getElementById('header-active-key');
      if (headerKey) {
        headerKey.textContent = activeKeyInfo ? activeKeyInfo.masked_key : 'None';
      }
    }

    const resProfile = await fetch(`${API_BASE}/profile`);
    const dataProfile = await resProfile.json();
    if (dataProfile.success) {
      const modelOverride = dataProfile.settings.selected_model || 'auto';
      const headerModel = document.getElementById('header-active-model');
      if (headerModel) {
        headerModel.textContent = modelOverride === 'auto' ? 'GEMINI · AUTO' : modelOverride.toUpperCase();
      }
    }
  } catch (e) {
    console.error('Header load failure', e);
  }
}

// Cooldown countdown timer loop (runs every 5s on keys status table, not every 1s)
setInterval(() => {
  const settingsPanelActive = document.getElementById('panel-settings').classList.contains('active');
  if (settingsPanelActive) {
    loadKeys();
  }
}, 5000);

/* ========== App Initialization ========== */
window.addEventListener('DOMContentLoaded', () => {
  // Load core structures
  loadProfileAndSettings();
  loadActiveStateHeader();
  loadRoadmap();
  loadTodos();
  loadSources();
  loadAnalytics();
  loadKeys();
  // Check updates in background on load
  checkUpdates();
});




/* ========== Backup & Restore ========== */
window.importBackupFromSettings = async (input) => {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('backup-status');
  if (statusEl) statusEl.textContent = '// importing backup...';

  const form = new FormData();
  form.append('file', file);
  try {
    const r = await fetch(`${API_BASE}/backup/import`, { method: 'POST', body: form });
    const d = await r.json();
    if (d.success) {
      const summary = Object.entries(d.restored || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--green)">✓ Restored — ${summary}</span>`;
      // Reload UI
      loadKeys();
      loadProfileAndSettings();
      loadRoadmap();
      loadTodos();
    } else {
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--red)">✕ Import failed: ${d.error}</span>`;
    }
  } catch (e) {
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--red)">✕ Error: ${e.message}</span>`;
  }
  input.value = '';
};


/* ========== Chat History Viewer ========== */
async function loadHistoryPanel() {
  const sessionSel = document.getElementById('history-session-select');
  const feed = document.getElementById('history-feed');
  const statsEl = document.getElementById('history-stats');
  if (!feed) return;

  const sessionId = sessionSel ? sessionSel.value : 'default_session';
  feed.innerHTML = '<div class="muted">// loading history...</div>';

  try {
    const res = await fetch(`${API_BASE}/chat/history?session_id=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!data.success) { feed.innerHTML = '<div class="muted">// failed to load</div>'; return; }

    const msgs = data.history;

    // Stats bar
    const userMsgs = msgs.filter(m => m.role === 'user');
    const aiMsgs = msgs.filter(m => m.role === 'assistant');
    const models = [...new Set(aiMsgs.map(m => m.model_used).filter(Boolean))];
    if (statsEl) {
      statsEl.innerHTML = `
        <span>Messages: <b>${msgs.length}</b></span>
        <span>User: <b>${userMsgs.length}</b></span>
        <span>AI: <b>${aiMsgs.length}</b></span>
        <span>Models: <b>${models.join(', ') || 'N/A'}</b></span>
        ${msgs.length ? `<span>First: <b>${msgs[0].timestamp?.slice(0, 16)}</b></span>` : ''}
        ${msgs.length ? `<span>Last: <b>${msgs[msgs.length - 1].timestamp?.slice(0, 16)}</b></span>` : ''}
      `;
    }

    if (!msgs.length) {
      feed.innerHTML = '<div class="muted" style="text-align:center;padding:40px">// no messages in this session</div>';
      return;
    }

    feed.innerHTML = msgs.map(msg => {
      const isUser = msg.role === 'user';
      const ts = msg.timestamp?.slice(0, 16) || '';
      const model = msg.model_used || '';
      return `
        <div style="display:flex;flex-direction:column;align-items:${isUser ? 'flex-end' : 'flex-start'}">
          <div style="font-size:10px;color:var(--muted);margin-bottom:3px;${isUser ? 'text-align:right' : ''}">
            ${isUser ? '👤 You' : '🤖 DevHunt' + (model ? ` · ${model}` : '')} · ${ts}
          </div>
          <div style="
            max-width:85%; padding:10px 14px; border-radius:8px; font-size:13px; line-height:1.55;
            ${isUser
          ? 'background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.3);'
          : 'background:rgba(0,255,163,.05);border:1px solid var(--border);'}
          ">${md(msg.content || '')}</div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    feed.scrollTop = feed.scrollHeight;

  } catch (e) {
    feed.innerHTML = `<div class="muted">// error: ${e.message}</div>`;
  }
}

window.clearSessionHistory = async () => {
  const sessionSel = document.getElementById('history-session-select');
  const sessionId = sessionSel ? sessionSel.value : 'default_session';
  if (!confirm(`Clear history for session "${sessionId}"?`)) return;
  try {
    await fetch(`${API_BASE}/chat/history?session_id=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
    loadHistoryPanel();
  } catch (e) {
    console.error(e);
  }
};

window.clearChatHistory = async () => {
  if (!confirm('Clear ALL chat history for default_session?')) return;
  try {
    await fetch(`${API_BASE}/chat/history?session_id=default_session`, { method: 'DELETE' });
    const statusEl = document.getElementById('danger-status');
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--green)">✓ Chat history cleared</span>';
  } catch (e) { console.error(e); }
};

/* ========== Danger Zone — Reset Everything ========== */
window.clearAllData = async () => {
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

  const statusEl = document.getElementById('danger-status');
  if (statusEl) statusEl.innerHTML = '<span style="color:var(--amber)">// resetting...</span>';

  try {
    const r = await fetch(`${API_BASE}/reset`, { method: 'POST' });
    const d = await r.json();
    if (d.success) {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--green)">✓ Everything cleared. Reload the page.</span>';
      setTimeout(() => location.reload(), 2000);
    } else {
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--red)">✕ ${d.error}</span>`;
    }
  } catch (e) {
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--red)">✕ Error: ${e.message}</span>`;
  }
};

/* ========== Hunt Terminal Engine ========== */
let terminalCwd = "";
const terminalHistory = [];
let terminalHistoryIndex = -1;
let terminalInitialized = false;

const HUNT_COMMANDS = [
  "hunt help", "hunt neofetch", "hunt pwd", "hunt ls", "hunt cd",
  "hunt cat", "hunt mkdir", "hunt rm", "hunt ping", "hunt dns",
  "hunt dig", "hunt whois", "hunt ssl", "hunt headers", "hunt port",
  "hunt portscan", "hunt localports", "hunt myip", "hunt trace",
  "hunt subdomains", "hunt git", "hunt python", "hunt calc",
  "hunt quest", "hunt keys", "hunt memory", "hunt backup", "hunt history", "hunt notifications",
  "clear"
];

function initTerminal() {
  const container = document.querySelector('.terminal-container');
  const inputEl = document.getElementById('terminal-input');
  const outputEl = document.getElementById('terminal-output');
  const promptEl = document.getElementById('terminal-prompt');
  const osEl = document.getElementById('terminal-detected-os');
  const bodyEl = document.getElementById('terminal-body');

  if (!inputEl || !outputEl) return;

  // Focus input
  inputEl.focus();

  // If clicked inside body, auto-focus input
  if (bodyEl) {
    bodyEl.addEventListener('click', () => {
      inputEl.focus();
    });
  }

  if (terminalInitialized) return;
  terminalInitialized = true;

  // Perform initial ping/system check to populate OS and cwd
  (async () => {
    try {
      const res = await fetch(`${API_BASE}/terminal/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: "hunt neofetch", cwd: "" })
      });
      const data = await res.json();
      if (data.success) {
        // Find CWD
        terminalCwd = data.cwd;
        updatePrompt(promptEl);

        // Find OS in output or extract it
        if (osEl) {
          const raw = data.output;
          let osName = "Unknown Node";
          if (raw.includes("Windows")) osName = "Windows Node";
          else if (raw.includes("Linux")) osName = "Linux Node";
          else if (raw.includes("Darwin")) osName = "macOS Node";
          osEl.innerHTML = `<span class="ansi-yellow">${osName}</span>`;
        }
      }
    } catch (e) {
      console.error("Failed terminal greetings:", e);
      if (osEl) osEl.textContent = "Offline Node (Connection error)";
    }
  })();

  // Handle keys
  inputEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const cmd = inputEl.value;
      if (!cmd.trim()) return;

      inputEl.value = "";

      // Append prompt and command to history output
      const linePrompt = document.createElement('div');
      linePrompt.className = 'terminal-line';
      linePrompt.innerHTML = `<span class="terminal-prompt">${promptEl.textContent}</span> <span class="ansi-cyan">${mdEscape(cmd)}</span>`;
      outputEl.appendChild(linePrompt);

      // Save to history
      terminalHistory.push(cmd);
      terminalHistoryIndex = terminalHistory.length;

      // Handle local commands
      const trimmed = cmd.trim();
      if (trimmed.toLowerCase() === "clear" || trimmed.toLowerCase() === "hunt clear") {
        outputEl.innerHTML = "";
        scrollToBottom(bodyEl);
        return;
      }

      // Show loader
      const lineLoader = document.createElement('div');
      lineLoader.className = 'terminal-line ansi-muted';
      lineLoader.innerHTML = `// running task...`;
      outputEl.appendChild(lineLoader);
      scrollToBottom(bodyEl);

      try {
        const res = await fetch(`${API_BASE}/terminal/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd, cwd: terminalCwd })
        });
        const data = await res.json();

        // Remove loader
        if (outputEl.contains(lineLoader)) {
          outputEl.removeChild(lineLoader);
        }

        const lineResult = document.createElement('div');
        lineResult.className = 'terminal-line';

        if (data.success) {
          if (data.output === "CLEAR_SIGNAL") {
            outputEl.innerHTML = "";
          } else {
            lineResult.innerHTML = data.output;
            outputEl.appendChild(lineResult);
          }
          if (data.cwd) {
            terminalCwd = data.cwd;
            updatePrompt(promptEl);
          }
        } else {
          lineResult.innerHTML = `<span class="ansi-red">Error: ${mdEscape(data.error)}</span>`;
          outputEl.appendChild(lineResult);
        }
      } catch (err) {
        if (outputEl.contains(lineLoader)) {
          outputEl.removeChild(lineLoader);
        }
        const lineResult = document.createElement('div');
        lineResult.className = 'terminal-line ansi-red';
        lineResult.innerHTML = `Error: Connection lost to DevHunt core backend node.`;
        outputEl.appendChild(lineResult);
      }
      scrollToBottom(bodyEl);
    }

    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (terminalHistory.length === 0) return;
      if (terminalHistoryIndex > 0) {
        terminalHistoryIndex--;
        inputEl.value = terminalHistory[terminalHistoryIndex];
      }
    }

    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (terminalHistoryIndex < terminalHistory.length - 1) {
        terminalHistoryIndex++;
        inputEl.value = terminalHistory[terminalHistoryIndex];
      } else {
        terminalHistoryIndex = terminalHistory.length;
        inputEl.value = "";
      }
    }

    else if (e.key === 'Tab') {
      e.preventDefault();
      const val = inputEl.value;
      if (!val) {
        // Print all available commands if empty tab
        printHelpAutocomplete(outputEl, HUNT_COMMANDS);
        scrollToBottom(bodyEl);
        return;
      }

      const matches = HUNT_COMMANDS.filter(c => c.startsWith(val.toLowerCase()));
      if (matches.length === 1) {
        inputEl.value = matches[0] + " ";
      } else if (matches.length > 1) {
        // print matched choices
        printHelpAutocomplete(outputEl, matches);
        scrollToBottom(bodyEl);
      }
    }
  });
}

function updatePrompt(promptEl) {
  if (!promptEl) return;
  // Format CWD cleanly: show ~ if inside workspace root
  let displayCwd = terminalCwd;

  // Try to find the root folder path and substitute with ~
  const rootIndex = terminalCwd.indexOf("Local-AI");
  if (rootIndex !== -1) {
    const subPath = terminalCwd.substring(rootIndex + 8).replace(/\\/g, '/');
    displayCwd = "~" + subPath;
  } else {
    // If not matching, just display basename
    const parts = terminalCwd.split(/[\\/]/);
    displayCwd = parts[parts.length - 1] || terminalCwd;
  }

  promptEl.textContent = `guest@devhunt:${displayCwd || '/'}$`;
}

function printHelpAutocomplete(outputEl, list) {
  const line = document.createElement('div');
  line.className = 'terminal-line ansi-muted';
  line.innerHTML = `Possible commands:\n  ${list.join('    ')}`;
  outputEl.appendChild(line);
}

function scrollToBottom(el) {
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}

function mdEscape(src) {
  if (!src) return "";
  return src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ========== Auto-Update Checker ========== */
let latestUpdateInfo = null;

async function checkUpdates(isManual = false) {
  const statusText = document.getElementById('update-status-text');
  const versionText = document.getElementById('update-version-text');
  const badge = document.getElementById('header-update-badge');
  const applyBtn = document.getElementById('apply-update-btn');
  const detailsBox = document.getElementById('update-details-box');
  const commitsList = document.getElementById('update-commits-list');
  const modalCommitsList = document.getElementById('modal-update-commits-list');

  if (isManual && statusText) {
    statusText.textContent = 'Checking remote repository...';
  }

  try {
    const res = await fetch(`${API_BASE}/updates/check`);
    const data = await res.json();

    if (!data.success) {
      if (statusText) statusText.innerHTML = `<span style="color:var(--red)">✕ Error: ${data.error}</span>`;
      if (versionText) versionText.textContent = 'Unable to check version details.';
      if (badge) badge.style.display = 'none';
      if (applyBtn) applyBtn.style.display = 'none';
      if (detailsBox) detailsBox.style.display = 'none';
      return;
    }

    latestUpdateInfo = data;

    if (versionText) {
      versionText.innerHTML = `Local commit: <span style="color:var(--cyan); font-family:var(--mono);">${data.current_commit || 'unknown'}</span>${data.current_branch ? ` (${data.current_branch})` : ''}`;
    }

    // Fetch user settings to check if the latest update was already dismissed
    let dismissedUpdate = null;
    try {
      const resProfile = await fetch(`${API_BASE}/profile`);
      const dataProfile = await resProfile.json();
      if (dataProfile.success) {
        dismissedUpdate = dataProfile.settings.dismissed_update || null;
      }
    } catch (e) {
      console.error("Failed to load settings in checkUpdates", e);
    }

    if (data.update_available) {
      if (statusText) statusText.innerHTML = `<span style="color:var(--amber)">⚡ Update available (latest: ${data.latest_commit})</span>`;

      // Only show the header notification badge if not explicitly dismissed
      if (badge) {
        if (data.latest_commit === dismissedUpdate) {
          badge.style.display = 'none';
        } else {
          badge.style.display = 'inline-block';
        }
      }

      if (applyBtn) applyBtn.style.display = 'inline-block';

      const commitsHtml = (data.commits || []).map(c =>
        `<li><span style="color:var(--cyan);">${c.hash}</span>: ${mdEscape(c.message)} <span class="muted">(${mdEscape(c.author)})</span></li>`
      ).join('');

      if (commitsList) commitsList.innerHTML = commitsHtml;
      if (modalCommitsList) modalCommitsList.innerHTML = commitsHtml;
      if (detailsBox) detailsBox.style.display = 'block';
    } else {
      if (statusText) statusText.innerHTML = `<span style="color:var(--green)">✓ System is up to date</span>`;
      if (badge) badge.style.display = 'none';
      if (applyBtn) applyBtn.style.display = 'none';
      if (detailsBox) detailsBox.style.display = 'none';
    }
  } catch (err) {
    console.error("Failed to check for updates:", err);
    if (statusText) statusText.innerHTML = `<span style="color:var(--red)">✕ Connection error</span>`;
  }
}

async function applyUpdate() {
  const applyBtn = document.getElementById('apply-update-btn');
  const modalApplyBtn = document.getElementById('modal-apply-update-btn');
  const progressInfo = document.getElementById('update-progress-info');
  const modalProgress = document.getElementById('modal-update-progress');
  const statusText = document.getElementById('update-status-text');

  if (confirm("Apply updates? This will pull remote commits and restart the server node. Your settings/keys will be preserved.")) {
    if (applyBtn) applyBtn.disabled = true;
    if (modalApplyBtn) modalApplyBtn.disabled = true;

    if (progressInfo) progressInfo.style.display = 'block';
    if (modalProgress) modalProgress.style.display = 'block';
    if (statusText) statusText.textContent = 'Applying update codebase...';

    try {
      const res = await fetch(`${API_BASE}/updates/apply`, { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        let msg = "✓ Update applied successfully!";
        if (data.conflict) {
          msg += " Note: Local merge conflicts were found and stashed; check status.";
        }
        alert(msg + " Reloading DevHunt workspace.");
        location.reload();
      } else {
        alert(`Failed to apply updates: ${data.error}`);
        if (applyBtn) applyBtn.disabled = false;
        if (modalApplyBtn) modalApplyBtn.disabled = false;
        if (progressInfo) progressInfo.style.display = 'none';
        if (modalProgress) modalProgress.style.display = 'none';
        checkUpdates();
      }
    } catch (err) {
      if (statusText) statusText.innerHTML = `<span style="color:var(--cyan)">✓ Server reloading with new updates...</span>`;
      setTimeout(() => {
        location.reload();
      }, 4000);
    }
  }
}

// Bind Update Event Listeners
(() => {
  const updateModal = document.getElementById('update-modal');
  const headerBadge = document.getElementById('header-update-badge');
  const closeUpdateModalBtn = document.getElementById('close-update-modal');
  const cancelUpdateBtn = document.getElementById('cancel-update-btn');
  const manualCheckBtn = document.getElementById('manual-check-update-btn');
  const applyBtn = document.getElementById('apply-update-btn');
  const modalApplyBtn = document.getElementById('modal-apply-update-btn');

  const dismissUpdate = async () => {
    if (latestUpdateInfo && latestUpdateInfo.latest_commit) {
      try {
        await fetch(`${API_BASE}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { dismissed_update: latestUpdateInfo.latest_commit }
          })
        });
        const badge = document.getElementById('header-update-badge');
        if (badge) badge.style.display = 'none';
      } catch (e) {
        console.error("Failed to save update dismissal", e);
      }
    }
  };

  if (headerBadge) {
    headerBadge.addEventListener('click', () => {
      if (updateModal) updateModal.classList.add('show');
    });
  }

  if (closeUpdateModalBtn) {
    closeUpdateModalBtn.addEventListener('click', () => {
      if (updateModal) updateModal.classList.remove('show');
      dismissUpdate();
    });
  }

  if (cancelUpdateBtn) {
    cancelUpdateBtn.addEventListener('click', () => {
      if (updateModal) updateModal.classList.remove('show');
      dismissUpdate();
    });
  }

  if (manualCheckBtn) {
    manualCheckBtn.addEventListener('click', async () => {
      // Clear dismissed state upon manual update check request
      try {
        await fetch(`${API_BASE}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { dismissed_update: null }
          })
        });
      } catch (e) { }
      checkUpdates(true);
    });
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', applyUpdate);
  }

  if (modalApplyBtn) {
    modalApplyBtn.addEventListener('click', applyUpdate);
  }
})();

/* ========== AI Core Memory management ========== */
async function loadAIMemory() {
  const memoryTextarea = document.getElementById('ai-memory-text');
  const memoryStatus = document.getElementById('memory-status');
  if (!memoryTextarea) return;

  memoryStatus.textContent = '// fetching cognitive core memory...';
  try {
    const res = await fetch(`${API_BASE}/memory?session_id=default_session`);
    const data = await res.json();
    if (data.success) {
      const memories = data.memories || [];
      if (memories.length > 0) {
        // Format as bullet points in the textarea
        memoryTextarea.value = memories.map(m => `- ${m}`).join('\n');
        memoryStatus.innerHTML = `<span style="color:var(--green)">✓ Core memories retrieved (${memories.length} facts)</span>`;
      } else {
        memoryTextarea.value = '';
        memoryStatus.innerHTML = '<span style="color:var(--muted)">No memories consolidated yet.</span>';
      }
    } else {
      memoryStatus.innerHTML = `<span style="color:var(--red)">✕ Failed to load: ${data.error}</span>`;
    }
  } catch (e) {
    memoryStatus.innerHTML = `<span style="color:var(--red)">✕ Network error: ${e.message}</span>`;
  }
}

// Wire up AI Core Memory Buttons
(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-memory-btn');
    const refineBtn = document.getElementById('refine-memory-btn');
    const clearBtn = document.getElementById('clear-memory-btn');
    const memoryTextarea = document.getElementById('ai-memory-text');
    const memoryStatus = document.getElementById('memory-status');

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const text = memoryTextarea.value.trim();
        // Parse lines. Split by newline, strip leading bullet points (- or *), and filter empty lines
        const memories = text.split('\n')
          .map(line => line.replace(/^[\s\-\*]+/, '').trim())
          .filter(Boolean);

        saveBtn.textContent = 'Saving...';
        memoryStatus.textContent = '// transmitting updated memories...';
        try {
          const res = await fetch(`${API_BASE}/memory`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: 'default_session', memories })
          });
          const data = await res.json();
          if (data.success) {
            memoryStatus.innerHTML = `<span style="color:var(--green)">✓ Memories saved successfully (${memories.length} facts)</span>`;
            loadAIMemory();
          } else {
            memoryStatus.innerHTML = `<span style="color:var(--red)">✕ Save failed: ${data.error}</span>`;
          }
        } catch (e) {
          memoryStatus.innerHTML = `<span style="color:var(--red)">✕ Error: ${e.message}</span>`;
        } finally {
          saveBtn.textContent = 'Save Changes';
        }
      });
    }

    if (refineBtn) {
      refineBtn.addEventListener('click', async () => {
        refineBtn.textContent = 'Refining...';
        memoryStatus.textContent = '// running cognitive consolidation on chat history...';
        try {
          const res = await fetch(`${API_BASE}/memory/refine`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: 'default_session' })
          });
          const data = await res.json();
          if (data.success) {
            memoryStatus.innerHTML = `<span style="color:var(--green)">✓ Refinement complete! Loaded updated facts.</span>`;
            loadAIMemory();
          } else {
            memoryStatus.innerHTML = `<span style="color:var(--red)">✕ Refinement failed: ${data.error}</span>`;
          }
        } catch (e) {
          memoryStatus.innerHTML = `<span style="color:var(--red)">✕ Error: ${e.message}</span>`;
        } finally {
          refineBtn.textContent = 'Refine Now';
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (!confirm("Are you sure you want to clear AI's memories? This cannot be undone.")) return;
        clearBtn.textContent = 'Clearing...';
        memoryStatus.textContent = '// deleting memories...';
        try {
          const res = await fetch(`${API_BASE}/memory?session_id=default_session`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            memoryStatus.innerHTML = `<span style="color:var(--green)">✓ Core memories cleared successfully</span>`;
            memoryTextarea.value = '';
          } else {
            memoryStatus.innerHTML = `<span style="color:var(--red)">✕ Clear failed: ${data.error}</span>`;
          }
        } catch (e) {
          memoryStatus.innerHTML = `<span style="color:var(--red)">✕ Error: ${e.message}</span>`;
        } finally {
          clearBtn.textContent = 'Clear Memory';
        }
      });
    }

    // Load system notifications and set unread badge initially
    loadNotifications(false);

    // Refresh notifications button
    const refreshNotifBtn = document.getElementById('btn-notifications-refresh');
    if (refreshNotifBtn) {
      refreshNotifBtn.addEventListener('click', () => {
        loadNotifications(true);
      });
    }

    // Mark all as read button
    const readAllNotifBtn = document.getElementById('btn-notifications-read-all');
    if (readAllNotifBtn) {
      readAllNotifBtn.addEventListener('click', async () => {
        const unreadIds = currentNotificationsList.map(n => n.id);
        if (unreadIds.length > 0) {
          await markNotificationsAsRead(unreadIds, []);
          loadNotifications(false);
        }
      });
    }

    // Closing notification detail modal
    const closeNotifDetailBtn = document.getElementById('close-notif-detail-modal');
    if (closeNotifDetailBtn) {
      closeNotifDetailBtn.addEventListener('click', closeNotificationDetailModal);
    }
    const closeNotifDetailBtn2 = document.getElementById('btn-close-notif-detail');
    if (closeNotifDetailBtn2) {
      closeNotifDetailBtn2.addEventListener('click', closeNotificationDetailModal);
    }
  });
})();

/* ========== System Notifications & Messages Controller ========== */
let currentNotificationsList = [];

async function loadNotifications(autoMarkRead = false) {
  const container = document.getElementById('notifications-feed-container');
  const badge = document.getElementById('notification-unread-count');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/notifications`);
    const data = await res.json();
    if (!data.success) {
      container.innerHTML = `<div style="color:var(--red); text-align:center; padding:20px;">Error loading messages: ${data.error}</div>`;
      return;
    }

    currentNotificationsList = data.notifications || [];
    const readIds = data.read_notifications || [];

    // Compute unread count
    const unreadNotifications = currentNotificationsList.filter(n => !readIds.includes(n.id));
    const unreadCount = unreadNotifications.length;

    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    // Auto-mark as read if viewing panel
    if (autoMarkRead && unreadCount > 0) {
      await markNotificationsAsRead(unreadNotifications.map(n => n.id), readIds);
    }

    if (currentNotificationsList.length === 0) {
      container.innerHTML = `<div class="muted" style="text-align:center; padding:40px;">No system messages or notifications.</div>`;
      return;
    }

    // Render notifications
    container.innerHTML = currentNotificationsList.map(n => {
      const isUnread = !readIds.includes(n.id) && !autoMarkRead;
      let typeTag = n.type;
      let actionBtnHtml = '';

      if (n.type === 'update') {
        typeTag = 'update';
        actionBtnHtml = `<button class="btn-ghost notification-action-btn" onclick="triggerUpdateFromNotification()" style="font-size:10px; padding:3px 8px; margin-top:6px;">View Update Dialog</button>`;
      } else if (n.type === 'log_error') {
        typeTag = 'error';
      } else if (n.type === 'log_warn') {
        typeTag = 'warning';
      }

      return `
        <div class="notification-item ${isUnread ? 'unread' : ''} type-${n.type}" onclick="openNotificationDetail('${n.id}', event)">
          <div class="notification-header">
            <div>
              <span class="notification-tag">${typeTag}</span>
              <span class="notification-title">${mdEscape(n.title)}</span>
            </div>
            <span class="notification-time">${n.timestamp}</span>
          </div>
          <div class="notification-msg">${mdEscape(n.message)}</div>
          ${actionBtnHtml}
        </div>
      `;
    }).join('');

    // Auto trigger popups on startup/page load (once per browser tab session)
    if (!sessionStorage.getItem('notif_popup_shown')) {
      sessionStorage.setItem('notif_popup_shown', 'true');

      const importantUnread = currentNotificationsList.find(n => !readIds.includes(n.id) && (n.type === 'update' || n.type === 'release' || n.type === 'news'));
      if (importantUnread) {
        if (importantUnread.type === 'update') {
          const updateBadge = document.getElementById('header-update-badge');
          if (updateBadge) updateBadge.click();
        } else {
          openNotificationDetail(importantUnread.id);
        }
      }
    }

  } catch (e) {
    container.innerHTML = `<div style="color:var(--red); text-align:center; padding:20px;">Network error loading messages: ${e.message}</div>`;
  }
}

async function markNotificationsAsRead(newReadIds, existingReadIds) {
  const mergedReadIds = Array.from(new Set([...existingReadIds, ...newReadIds]));
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: { read_notifications: mergedReadIds }
      })
    });
    const data = await res.json();
    if (data.success) {
      const badge = document.getElementById('notification-unread-count');
      if (badge) badge.style.display = 'none';
    }
  } catch (e) {
    console.error("Failed to mark notifications as read", e);
  }
}

function triggerUpdateFromNotification() {
  const badge = document.getElementById('header-update-badge');
  if (badge) {
    badge.click();
  } else {
    switchPanel('settings');
  }
}

function openNotificationDetail(id, event) {
  // Prevent click on action button from opening detail overlay twice
  if (event && event.target && event.target.tagName.toLowerCase() === 'button') {
    return;
  }

  const notif = currentNotificationsList.find(n => n.id === id);
  if (!notif) return;

  const modal = document.getElementById('notification-detail-modal');
  const titleEl = document.getElementById('notif-detail-title');
  const metaEl = document.getElementById('notif-detail-meta');
  const msgEl = document.getElementById('notif-detail-message');
  const metaContainer = document.getElementById('notif-detail-metadata-container');
  const metaPre = document.getElementById('notif-detail-metadata');
  const actionBtn = document.getElementById('btn-action-notif-detail');

  if (!modal) return;

  titleEl.textContent = notif.title;
  metaEl.textContent = `Category: ${notif.type.toUpperCase()} | Timestamp: ${notif.timestamp || 'N/A'}`;
  msgEl.textContent = notif.message;

  if (notif.metadata && Object.keys(notif.metadata).length > 0) {
    metaContainer.style.display = 'block';
    metaPre.textContent = JSON.stringify(notif.metadata, null, 2);
  } else {
    metaContainer.style.display = 'none';
    metaPre.textContent = '';
  }

  if (notif.type === 'update') {
    actionBtn.style.display = 'inline-block';
    actionBtn.textContent = 'Update Now';
    actionBtn.onclick = () => {
      closeNotificationDetailModal();
      triggerUpdateFromNotification();
    };
  } else {
    actionBtn.style.display = 'none';
    actionBtn.onclick = null;
  }

  modal.classList.add('show');

  // Mark read in background
  const badge = document.getElementById('notification-unread-count');
  fetch(`${API_BASE}/profile`)
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        const readIds = data.settings.read_notifications || [];
        if (!readIds.includes(id)) {
          markNotificationsAsRead([id], readIds).then(() => {
            // Un-mark unread class locally
            const items = document.querySelectorAll('.notification-item');
            items.forEach(el => {
              if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(id)) {
                el.classList.remove('unread');
              }
            });
            // Recalculate badge
            const unreadItems = currentNotificationsList.filter(item => item.id !== id && !readIds.includes(item.id));
            if (badge) {
              if (unreadItems.length > 0) {
                badge.textContent = unreadItems.length;
                badge.style.display = 'inline-block';
              } else {
                badge.style.display = 'none';
              }
            }
          });
        }
      }
    });
}

function closeNotificationDetailModal() {
  const modal = document.getElementById('notification-detail-modal');
  if (modal) modal.classList.remove('show');
}

// Bind globally for inline HTML click handlers
window.triggerUpdateFromNotification = triggerUpdateFromNotification;
window.loadNotifications = loadNotifications;
window.openNotificationDetail = openNotificationDetail;
window.closeNotificationDetailModal = closeNotificationDetailModal;
window.loadTerminalStats = loadTerminalStats;


/* ========== MUSIC PLAYER ========== */
const MusicPlayer = (() => {
  let tracks = [];
  let currentIndex = -1;
  let playMode = 'sequential'; // sequential | shuffle | repeat | repeat-all
  let playerInited = false;

  const audio = () => document.getElementById('music-audio-el');
  const fmtTime = s => {
    if (isNaN(s) || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Render track list ──────────────────────────────────────────────────────
  function renderTracks() {
    const list = document.getElementById('music-track-list');
    const countEl = document.getElementById('music-track-count');
    if (!list) return;
    if (countEl) countEl.textContent = `${tracks.length} track${tracks.length !== 1 ? 's' : ''}`;
    if (!tracks.length) {
      list.innerHTML = '<div class="muted" style="text-align:center;padding:40px 0;font-family:var(--mono);font-size:11px;">// No tracks yet — upload a file or paste a YouTube link above</div>';
      return;
    }
    list.innerHTML = tracks.map((t, i) => `
      <div class="music-track-row${i === currentIndex ? ' active' : ''}" id="mtr-${i}" data-idx="${i}"
        style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:5px; cursor:pointer;">
        <div style="width:28px; text-align:center; font-size:14px; color:${i===currentIndex?'var(--green)':'var(--muted)'}; flex-shrink:0;">
          ${i === currentIndex ? '▶' : (i+1)}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-family:var(--mono); font-size:11px; color:${i===currentIndex?'var(--cyan)':'var(--text)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${t.title}
          </div>
          <div style="font-size:9.5px; color:var(--muted); font-family:var(--mono); margin-top:2px;">
            ${t.ext.toUpperCase().replace('.','').trim()} · ${t.size_kb >= 1024 ? (t.size_kb/1024).toFixed(1)+'MB' : t.size_kb+'KB'}
          </div>
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          <button onclick="event.stopPropagation(); MusicPlayer.play(${i})"
            style="background:none;border:1px solid rgba(0,255,163,0.25);color:var(--green);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;"
            title="Play">▶</button>
          <a href="/api/music/download/${encodeURIComponent(t.filename)}"
            onclick="event.stopPropagation()"
            style="background:none;border:1px solid rgba(0,212,255,0.25);color:var(--cyan);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;text-decoration:none;"
            title="Download" download>⬇</a>
          <button onclick="event.stopPropagation(); MusicPlayer.deleteTrack(${i})"
            style="background:none;border:1px solid rgba(255,77,109,0.25);color:var(--red);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;"
            title="Delete">✕</button>
        </div>
      </div>`).join('');

    // Click on row to play
    list.querySelectorAll('.music-track-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
        play(parseInt(row.dataset.idx));
      });
    });
  }

  // ── Load track list from API ───────────────────────────────────────────────
  async function loadTracks() {
    try {
      const r = await fetch(`${API_BASE}/music/list`);
      const d = await r.json();
      if (d.success) {
        tracks = d.tracks;
        renderTracks();
      }
    } catch (e) {
      console.error('Music list error:', e);
    }
  }

  // ── Play a track by index ──────────────────────────────────────────────────
  function play(idx) {
    if (idx < 0 || idx >= tracks.length) return;
    currentIndex = idx;
    const t = tracks[idx];
    const el = audio();
    if (!el) return;

    el.src = `/api/music/stream/${encodeURIComponent(t.filename)}`;
    el.volume = parseFloat(document.getElementById('music-volume')?.value || 0.8);
    el.play().catch(err => console.warn('Play error:', err));

    // Update player bar
    const titleEl = document.getElementById('music-now-title');
    const metaEl = document.getElementById('music-now-meta');
    if (titleEl) titleEl.textContent = t.title;
    if (metaEl) metaEl.textContent = `${t.ext.toUpperCase().replace('.','').trim()} · ${t.size_kb >= 1024 ? (t.size_kb/1024).toFixed(1)+'MB' : t.size_kb+'KB'}`;
    const ppBtn = document.getElementById('music-play-pause');
    if (ppBtn) ppBtn.textContent = '⏸';

    // Global items updates
    const topTitle = document.getElementById('top-music-title');
    if (topTitle) topTitle.textContent = t.title;
    const sideTitle = document.getElementById('side-music-title');
    if (sideTitle) sideTitle.textContent = t.title;
    
    const topPlay = document.getElementById('top-music-play');
    if (topPlay) topPlay.textContent = '⏸';
    const sidePlay = document.getElementById('side-music-play');
    if (sidePlay) sidePlay.textContent = '⏸';

    updateAlbumArt(t);
    renderTracks(); // Re-render to highlight
  }

  function updateAlbumArt(track) {
    const icons = { '.mp3':'🎵', '.wav':'🎶', '.ogg':'🎼', '.flac':'🎸', '.aac':'🎤', '.m4a':'🎹', '.webm':'📻', '.opus':'🎙' };
    const icon = icons[track.ext] || '♪';
    
    const art = document.getElementById('music-album-art');
    if (art) art.textContent = icon;
    
    const topArt = document.getElementById('top-music-art');
    if (topArt) topArt.textContent = icon;
    
    const sideArt = document.getElementById('side-music-art');
    if (sideArt) sideArt.textContent = icon;
  }

  // ── Next track logic ───────────────────────────────────────────────────────
  function nextTrack() {
    if (!tracks.length) return;
    if (playMode === 'repeat') {
      play(currentIndex);
      return;
    }
    if (playMode === 'shuffle') {
      let next = Math.floor(Math.random() * tracks.length);
      if (tracks.length > 1) while (next === currentIndex) next = Math.floor(Math.random() * tracks.length);
      play(next);
      return;
    }
    // sequential or repeat-all
    let next = currentIndex + 1;
    if (next >= tracks.length) {
      if (playMode === 'repeat-all') next = 0;
      else return; // stop
    }
    play(next);
  }

  function prevTrack() {
    if (!tracks.length) return;
    if (playMode === 'shuffle') {
      let p = Math.floor(Math.random() * tracks.length);
      if (tracks.length > 1) while (p === currentIndex) p = Math.floor(Math.random() * tracks.length);
      play(p); return;
    }
    let p = currentIndex - 1;
    if (p < 0) p = tracks.length - 1;
    play(p);
  }

  // ── Delete a track ─────────────────────────────────────────────────────────
  async function deleteTrack(idx) {
    const t = tracks[idx];
    if (!confirm(`Delete "${t.title}"?`)) return;
    try {
      const r = await fetch(`${API_BASE}/music/delete/${encodeURIComponent(t.filename)}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) {
        if (currentIndex === idx) {
          audio().pause();
          audio().src = '';
          currentIndex = -1;
          const pp = document.getElementById('music-play-pause');
          if (pp) pp.textContent = '▶';
          const nt = document.getElementById('music-now-title');
          if (nt) nt.textContent = 'No track selected';

          const topPlay = document.getElementById('top-music-play');
          if (topPlay) topPlay.textContent = '▶';
          const sidePlay = document.getElementById('side-music-play');
          if (sidePlay) sidePlay.textContent = '▶';
          
          const topTitle = document.getElementById('top-music-title');
          if (topTitle) topTitle.textContent = 'No track selected';
          const sideTitle = document.getElementById('side-music-title');
          if (sideTitle) sideTitle.textContent = 'No track selected';
          
          const topArt = document.getElementById('top-music-art');
          if (topArt) topArt.textContent = '♪';
          const sideArt = document.getElementById('side-music-art');
          if (sideArt) sideArt.textContent = '♪';
        } else if (currentIndex > idx) {
          currentIndex--;
        }
        await loadTracks();
      }
    } catch (e) { console.error('Delete error:', e); }
  }

  // ── Wire up audio events ───────────────────────────────────────────────────
  function bindAudioEvents() {
    const el = audio();
    if (!el) return;

    el.addEventListener('timeupdate', () => {
      const fill = document.getElementById('music-progress-fill');
      const sideFill = document.getElementById('side-music-progress-fill');
      const cur = document.getElementById('music-time-cur');
      const sideTime = document.getElementById('side-music-time');
      const dur = document.getElementById('music-time-dur');
      
      const pct = el.duration ? ((el.currentTime / el.duration) * 100) + '%' : '0%';
      if (fill) fill.style.width = pct;
      if (sideFill) sideFill.style.width = pct;
      
      const curFormatted = fmtTime(el.currentTime);
      if (cur) cur.textContent = curFormatted;
      if (sideTime) sideTime.textContent = curFormatted;
      if (dur) dur.textContent = fmtTime(el.duration);
    });

    el.addEventListener('ended', () => {
      const pp = document.getElementById('music-play-pause');
      if (pp) pp.textContent = '▶';
      const topPlay = document.getElementById('top-music-play');
      if (topPlay) topPlay.textContent = '▶';
      const sidePlay = document.getElementById('side-music-play');
      if (sidePlay) sidePlay.textContent = '▶';
      
      const art = document.getElementById('music-album-art');
      if (art) art.classList.remove('spinning-art');
      const topArt = document.getElementById('top-music-art');
      if (topArt) topArt.classList.remove('spinning-art');
      const sideArt = document.getElementById('side-music-art');
      if (sideArt) sideArt.classList.remove('spinning-art');
      
      nextTrack();
    });

    el.addEventListener('play', () => {
      const pp = document.getElementById('music-play-pause');
      if (pp) pp.textContent = '⏸';
      const topPlay = document.getElementById('top-music-play');
      if (topPlay) topPlay.textContent = '⏸';
      const sidePlay = document.getElementById('side-music-play');
      if (sidePlay) sidePlay.textContent = '⏸';
      
      const art = document.getElementById('music-album-art');
      if (art) art.classList.add('spinning-art');
      const topArt = document.getElementById('top-music-art');
      if (topArt) topArt.classList.add('spinning-art');
      const sideArt = document.getElementById('side-music-art');
      if (sideArt) sideArt.classList.add('spinning-art');
    });
    el.addEventListener('pause', () => {
      const pp = document.getElementById('music-play-pause');
      if (pp) pp.textContent = '▶';
      const topPlay = document.getElementById('top-music-play');
      if (topPlay) topPlay.textContent = '▶';
      const sidePlay = document.getElementById('side-music-play');
      if (sidePlay) sidePlay.textContent = '▶';
      
      const art = document.getElementById('music-album-art');
      if (art) art.classList.remove('spinning-art');
      const topArt = document.getElementById('top-music-art');
      if (topArt) topArt.classList.remove('spinning-art');
      const sideArt = document.getElementById('side-music-art');
      if (sideArt) sideArt.classList.remove('spinning-art');
    });

    // Seeking via progress bar clicks
    const pTrack = document.getElementById('music-progress-track');
    if (pTrack) {
      pTrack.addEventListener('click', e => {
        if (!el.duration) return;
        const rect = pTrack.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        el.currentTime = pct * el.duration;
      });
    }
    const sideProgressTrack = document.getElementById('side-music-progress-track');
    if (sideProgressTrack) {
      sideProgressTrack.addEventListener('click', e => {
        if (!el.duration) return;
        const rect = sideProgressTrack.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        el.currentTime = pct * el.duration;
      });
    }
  }

  // ── Wire up static controls ────────────────────────────────────────────────
  function bindControls() {
    // Play/Pause toggles
    const bindPlayToggle = btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          const el = audio();
          if (!el) return;
          if (el.paused) {
            if (!el.src && tracks.length) play(0);
            else el.play();
          } else {
            el.pause();
          }
        });
      }
    };
    bindPlayToggle('music-play-pause');
    bindPlayToggle('top-music-play');
    bindPlayToggle('side-music-play');

    // Prev / Next controls
    const bindAction = (btnId, actionFn) => {
      const btn = document.getElementById(btnId);
      if (btn) btn.addEventListener('click', actionFn);
    };
    bindAction('music-prev', prevTrack);
    bindAction('top-music-prev', prevTrack);
    bindAction('side-music-prev', prevTrack);
    
    bindAction('music-next', nextTrack);
    bindAction('top-music-next', nextTrack);
    bindAction('side-music-next', nextTrack);

    // Volume
    const vol = document.getElementById('music-volume');
    const volLabel = document.getElementById('music-vol-label');
    if (vol) {
      vol.addEventListener('input', () => {
        const el = audio();
        if (el) el.volume = parseFloat(vol.value);
        if (volLabel) volLabel.textContent = Math.round(vol.value * 100) + '%';
      });
    }

    // Playback mode buttons
    document.querySelectorAll('.music-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.music-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playMode = btn.dataset.mode;
      });
    });

    // Refresh button
    const rfBtn = document.getElementById('music-refresh-btn');
    if (rfBtn) rfBtn.addEventListener('click', loadTracks);

    // File upload
    const fileIn = document.getElementById('music-filein');
    if (fileIn) fileIn.addEventListener('change', async () => {
      const statusEl = document.getElementById('music-upload-status');
      for (const file of fileIn.files) {
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--cyan);">↻ Uploading ${file.name}...</span>`;
        const fd = new FormData();
        fd.append('file', file);
        try {
          const r = await fetch(`${API_BASE}/music/upload`, { method: 'POST', body: fd });
          const d = await r.json();
          if (d.success) {
            if (statusEl) statusEl.innerHTML = `<span style="color:var(--green);">✓ Added: ${d.track.title}</span>`;
            await loadTracks();
          } else {
            if (statusEl) statusEl.innerHTML = `<span style="color:var(--red);">✕ ${d.error}</span>`;
          }
        } catch (e) {
          if (statusEl) statusEl.innerHTML = `<span style="color:var(--red);">✕ Upload failed: ${e.message}</span>`;
        }
      }
      fileIn.value = '';
    });

    // Drag & drop on dropzone
    const dz = document.getElementById('music-dropzone');
    if (dz) {
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.borderColor='var(--cyan)'; });
      dz.addEventListener('dragleave', () => { dz.style.borderColor=''; });
      dz.addEventListener('drop', async e => {
        e.preventDefault();
        dz.style.borderColor = '';
        const statusEl = document.getElementById('music-upload-status');
        for (const file of e.dataTransfer.files) {
          if (statusEl) statusEl.innerHTML = `<span style="color:var(--cyan);">↻ Uploading ${file.name}...</span>`;
          const fd = new FormData();
          fd.append('file', file);
          try {
            const r = await fetch(`${API_BASE}/music/upload`, { method: 'POST', body: fd });
            const d = await r.json();
            if (d.success) {
              if (statusEl) statusEl.innerHTML = `<span style="color:var(--green);">✓ Added: ${d.track.title}</span>`;
              await loadTracks();
            } else {
              if (statusEl) statusEl.innerHTML = `<span style="color:var(--red);">✕ ${d.error}</span>`;
            }
          } catch (e2) {
            if (statusEl) statusEl.innerHTML = `<span style="color:var(--red);">✕ ${e2.message}</span>`;
          }
        }
      });
    }

    // YouTube Converter
    const ytBtn = document.getElementById('music-yt-btn');
    const ytInput = document.getElementById('music-yt-url');
    const ytStatus = document.getElementById('music-yt-status');
    if (ytBtn && ytInput) {
      ytBtn.addEventListener('click', async () => {
        const url = ytInput.value.trim();
        if (!url) return;
        ytBtn.disabled = true;
        ytBtn.textContent = '↻ Converting...';
        if (ytStatus) ytStatus.innerHTML = `<span style="color:var(--cyan);">⏳ Downloading &amp; converting audio… this may take 30–90s...</span>`;
        try {
          const r = await fetch(`${API_BASE}/music/youtube`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          const d = await r.json();
          if (d.success) {
            if (ytStatus) ytStatus.innerHTML = `<span style="color:var(--green);">✓ Added: <b>${d.youtube_title || d.track.title}</b></span>`;
            ytInput.value = '';
            await loadTracks();
          } else {
            if (ytStatus) ytStatus.innerHTML = `<span style="color:var(--red);">✕ ${d.error}</span>`;
          }
        } catch (e) {
          if (ytStatus) ytStatus.innerHTML = `<span style="color:var(--red);">✕ Network error: ${e.message}</span>`;
        }
        ytBtn.disabled = false;
        ytBtn.textContent = '⬇ Convert';
      });
      // Allow Enter key in URL input
      ytInput.addEventListener('keydown', e => { if (e.key === 'Enter') ytBtn.click(); });
    }
  }

  // ── Public init ────────────────────────────────────────────────────────────
  function init() {
    if (!playerInited) {
      bindAudioEvents();
      bindControls();
      playerInited = true;
    }
    loadTracks();
  }

  return { init, play, prevTrack, nextTrack, deleteTrack, loadTracks };
})();

function initMusicPlayer() {
  MusicPlayer.init();
}

window.MusicPlayer = MusicPlayer;
window.initMusicPlayer = initMusicPlayer;


/* ========== TERMINAL STATS VISUALIZATION ========== */
const STATS_PALETTE = [
  '#00ffa3', '#00d4ff', '#ffb547', '#ff4d6d', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'
];

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function drawBarChart(canvasId, labels, values, colors, yLabel='') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 400;
  const H = parseInt(canvas.getAttribute('height')) || 160;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  if (!values.length || Math.max(...values) === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
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
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(padding.left + chartW, y); ctx.stroke();
    // Grid label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
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
    ctx.shadowBlur = 8;
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
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
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

function drawDailyChart(canvasId, days, messages) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 500;
  const H = parseInt(canvas.getAttribute('height')) || 140;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const padding = { top: 14, right: 10, bottom: 30, left: 32 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  if (!messages.length || Math.max(...messages) === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No activity in the last 14 days', W / 2, H / 2);
    return;
  }

  const maxVal = Math.max(...messages) * 1.2 || 1;
  const barW = Math.max(8, chartW / days.length - 4);
  const barGap = (chartW - barW * days.length) / (days.length - 1 || 1);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i <= 3; i++) {
    const y = padding.top + (chartH / 3) * i;
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(padding.left + chartW, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `9px JetBrains Mono, monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(fmtNum(Math.round(maxVal * (1 - i / 3))), padding.left - 4, y + 3);
  }

  // Draw bars + line overlay
  const points = [];
  days.forEach((day, i) => {
    const x = padding.left + i * (barW + barGap);
    const bH = (messages[i] / maxVal) * chartH;
    const y = padding.top + chartH - bH;

    const grad = ctx.createLinearGradient(0, y, 0, y + bH);
    grad.addColorStop(0, '#00ffa3');
    grad.addColorStop(1, '#00ffa333');
    ctx.shadowColor = '#00ffa3'; ctx.shadowBlur = 6;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bH, 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    points.push({ x: x + barW / 2, y });

    // Day label (show only every other day for readability)
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `8.5px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      const d = day ? day.slice(5) : '';
      ctx.fillText(d, x + barW / 2, padding.top + chartH + 14);
    }
  });

  // Smooth line overlay
  if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const cpx = (points[i - 1].x + points[i].x) / 2;
      ctx.bezierCurveTo(cpx, points[i - 1].y, cpx, points[i].y, points[i].x, points[i].y);
    }
    ctx.strokeStyle = '#00ffa3bb';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00ffa3'; ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dots
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffa3';
      ctx.shadowColor = '#00ffa3'; ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }
}

function drawDonutChart(canvasId, values, labels, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = parseInt(canvas.getAttribute('width')) || 140;
  const H = parseInt(canvas.getAttribute('height')) || 140;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const total = values.reduce((a, b) => a + b, 0);
  if (!total) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
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
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    startAngle += sweep;
  });

  // Inner donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0f14';
  ctx.fill();

  // Center text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 13px Orbitron, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtNum(total), cx, cy);
  ctx.font = `9px JetBrains Mono, monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('total', cx, cy + 14);
  ctx.textBaseline = 'alphabetic';
}

async function loadTerminalStats() {
  const refreshIcon = document.getElementById('stats-refresh-icon');
  const lastUpdated = document.getElementById('stats-last-updated');
  if (refreshIcon) refreshIcon.textContent = '↻';

  try {
    const res = await fetch(`${API_BASE}/stats`);
    const d = await res.json();
    if (!d.success) throw new Error(d.error);

    // ── KPIs ────────────────────────────────────────────────────────────────
    const kpiMsgs = document.getElementById('kpi-total-msgs');
    const kpiToks = document.getElementById('kpi-total-tokens');
    const kpiModels = document.getElementById('kpi-models');
    const kpiKeys = document.getElementById('kpi-keys');
    if (kpiMsgs) kpiMsgs.textContent = fmtNum(d.total_messages);
    if (kpiToks) kpiToks.textContent = fmtNum(d.total_tokens);
    if (kpiModels) kpiModels.textContent = d.model_distribution.length;
    if (kpiKeys) kpiKeys.textContent = d.key_workload.length;

    // ── Model Distribution Bar Chart ────────────────────────────────────────
    const modelLabels = d.model_distribution.map(m => m.model || 'Unknown');
    const modelReqs = d.model_distribution.map(m => m.requests);
    drawBarChart('chart-models', modelLabels, modelReqs, STATS_PALETTE);

    // Model Legend
    const modelLegend = document.getElementById('model-legend');
    if (modelLegend) {
      modelLegend.innerHTML = d.model_distribution.map((m, i) =>
        `<span style="color:${STATS_PALETTE[i % STATS_PALETTE.length]}">■ ${m.model || 'Unknown'}: ${m.requests} req</span>`
      ).join('');
    }

    // ── API Key Workload Bar Chart ───────────────────────────────────────────
    const keyLabels = d.key_workload.map(k => k.label || k.masked || 'Key');
    const keyReqs = d.key_workload.map(k => k.requests);
    const KEY_COLORS = ['#00d4ff', '#60a5fa', '#a78bfa', '#f472b6'];
    drawBarChart('chart-keys', keyLabels, keyReqs, KEY_COLORS);

    const keyLegend = document.getElementById('key-legend');
    if (keyLegend) {
      keyLegend.innerHTML = d.key_workload.map((k, i) =>
        `<span style="color:${KEY_COLORS[i % KEY_COLORS.length]}">■ ${k.label || k.masked}: ${k.requests} req</span>`
      ).join('');
    }

    // ── Daily Activity Chart ─────────────────────────────────────────────────
    // Fill in missing days in last 14 days
    const dayMap = {};
    d.daily_activity.forEach(r => { dayMap[r.day] = r.messages; });
    const today = new Date();
    const dailyDays = [], dailyMsgs = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      dailyDays.push(key);
      dailyMsgs.push(dayMap[key] || 0);
    }
    drawDailyChart('chart-daily', dailyDays, dailyMsgs);

    // ── Role Split Donut ─────────────────────────────────────────────────────
    const userCount = d.role_split['user'] || 0;
    const aiCount = d.role_split['assistant'] || 0;
    drawDonutChart('chart-role', [userCount, aiCount], ['User', 'AI'], ['#00ffa3', '#00d4ff']);
    const roleLegend = document.getElementById('role-legend');
    if (roleLegend) {
      roleLegend.innerHTML = `
        <span style="color:#00ffa3">■ User: ${userCount}</span>
        <span style="color:#00d4ff">■ AI: ${aiCount}</span>
      `;
    }

    // ── Token Usage per Model (Horizontal Bars) ──────────────────────────────
    const tokenBarsEl = document.getElementById('token-model-bars');
    if (tokenBarsEl) {
      const maxTok = Math.max(...d.model_distribution.map(m => m.tokens), 1);
      tokenBarsEl.innerHTML = d.model_distribution.length > 0
        ? d.model_distribution.map((m, i) => {
            const pct = maxTok > 0 ? Math.max(2, (m.tokens / maxTok) * 100) : 0;
            const color = STATS_PALETTE[i % STATS_PALETTE.length];
            return `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:10px; font-family:var(--mono); margin-bottom:4px;">
                  <span style="color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">${m.model || 'Unknown'}</span>
                  <span style="color:${color}; font-weight:bold;">${fmtNum(m.tokens)} tok</span>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
                  <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, ${color}, ${color}88); border-radius:4px; box-shadow:0 0 6px ${color}55; transition:width 0.6s ease;"></div>
                </div>
              </div>`;
          }).join('')
        : '<div style="color:var(--muted); font-size:11px; text-align:center; padding:20px 0;">No token data yet</div>';
    }

    // ── Top Sessions Table ────────────────────────────────────────────────────
    const sessBody = document.getElementById('sessions-table-body');
    if (sessBody) {
      sessBody.innerHTML = d.top_sessions.length > 0
        ? d.top_sessions.map((s, i) => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:6px 6px; color:var(--cyan); font-family:var(--mono); font-size:10px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '} ${s.session}
              </td>
              <td style="padding:6px 6px; text-align:right; color:var(--green); font-weight:bold;">${s.messages}</td>
              <td style="padding:6px 6px; text-align:right; color:var(--amber);">${fmtNum(s.tokens)}</td>
            </tr>`).join('')
        : '<tr><td colspan="3" style="text-align:center; color:var(--muted); padding:20px; font-family:var(--mono); font-size:11px;">No sessions found</td></tr>';
    }

    if (lastUpdated) {
      lastUpdated.textContent = `// Last updated: ${new Date().toLocaleTimeString()}`;
    }

  } catch (err) {
    console.error('Stats load error:', err);
    if (lastUpdated) lastUpdated.textContent = `// Error loading stats: ${err.message}`;
  }

  if (refreshIcon) refreshIcon.textContent = '⟳';
}

// Refresh button binding
document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('stats-refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadTerminalStats);
});

window.triggerUpdateFromNotification = triggerUpdateFromNotification;
window.loadNotifications = loadNotifications;
window.openNotificationDetail = openNotificationDetail;
window.closeNotificationDetailModal = closeNotificationDetailModal;
window.loadTerminalStats = loadTerminalStats;
