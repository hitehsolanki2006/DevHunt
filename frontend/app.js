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
    if (!document.body.classList.contains('theme-neon') || window.canvasParticlesEnabled === false) {
      ctx.clearRect(0, 0, W, H);
      requestAnimationFrame(loop);
      return;
    }
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
    ctx.strokeStyle = 'rgba(52,211,153,0.35)';
    ctx.lineWidth = 1.2 * devicePixelRatio;
    ctx.shadowColor = '#34d399';
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
      ctx.fillStyle = 'rgba(56,189,248,0.7)';
      ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 8 * devicePixelRatio;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < 140 * devicePixelRatio) {
          ctx.strokeStyle = `rgba(52,211,153,${.15 * (1 - d / (140 * devicePixelRatio))})`;
          ctx.lineWidth = .5 * devicePixelRatio;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ========== Sidebar navigation & Themes ========== */
// Apply initial theme from localStorage immediately to prevent FOUC
const initialTheme = localStorage.getItem('devhunt-theme') || 'slate';
document.body.classList.remove('theme-slate', 'theme-neon', 'theme-light', 'theme-devil');
if (initialTheme === 'neon') {
  document.body.classList.add('theme-neon');
} else if (initialTheme === 'light') {
  document.body.classList.add('theme-light');
} else if (initialTheme === 'devil') {
  document.body.classList.add('theme-devil');
  document.addEventListener('DOMContentLoaded', () => {
    const brandName = document.querySelector('.topbar-main .brand-name');
    if (brandName) brandName.textContent = 'Devil';
  });
} else {
  document.body.classList.add('theme-slate');
}

const panels = document.querySelectorAll('.panel');
const crumb = document.getElementById('crumb-current');

window.setAppTheme = async (themeName, saveToBackend = true) => {
  const body = document.body;
  body.classList.remove('theme-slate', 'theme-neon', 'theme-light', 'theme-devil');
  if (themeName === 'neon') {
    body.classList.add('theme-neon');
  } else if (themeName === 'light') {
    body.classList.add('theme-light');
  } else if (themeName === 'devil') {
    body.classList.add('theme-devil');
  } else {
    body.classList.add('theme-slate');
  }

  
  // Update brand logo text dynamically
  const brandName = document.querySelector('.topbar-main .brand-name');
  if (brandName) {
    if (themeName === 'devil') {
      brandName.textContent = 'Devil';
    } else {
      brandName.textContent = 'DevHunt';
    }
  }

  // Update select dropdown if present
  const selector = document.getElementById('theme-selector');
  if (selector) {
    selector.value = themeName;
  }
  
  // Store in localStorage
  localStorage.setItem('devhunt-theme', themeName);
  
  if (saveToBackend) {
    try {
      await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { theme: themeName }
        })
      });
    } catch (error) {
      console.error('Failed to save theme setting to backend', error);
    }
  }
};

function updateTopbarTitle(path) {
  const topbarTitle = document.getElementById('topbar-center-title');
  if (topbarTitle) {
    if (path) {
      topbarTitle.textContent = `${path} - DevHunt`;
    } else {
      topbarTitle.textContent = 'DevHunt';
    }
  }
}

function switchPanel(panelId) {
  // Collapse/Hide sidebar automatically if switching to any panel other than 'editor'
  if (panelId === 'editor') {
    toggleExplorerSidebar(false); // Expand
  } else {
    toggleExplorerSidebar(true); // Collapse
  }

  document.querySelectorAll('.activity-item').forEach(item => {
    const active = item.dataset.tabPanel === panelId;
    item.classList.toggle('active', active);
  });
  document.querySelectorAll('.tab-item').forEach(item => {
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
  if (panelId === 'linkedin') {
    loadLinkedInDrafts();
  }
  if (panelId === 'arcade') {
    if (typeof window.initArcadePanel === 'function') window.initArcadePanel();
  } else {
    if (typeof window.stopArcadePanel === 'function') window.stopArcadePanel();
  }
}

document.querySelectorAll('.activity-item').forEach(item => {
  item.addEventListener('click', () => {
    const targetPanelId = item.dataset.tabPanel;
    const isCurrentActive = item.classList.contains('active');
    if (targetPanelId === 'editor') {
      if (isCurrentActive) {
        toggleExplorerSidebar();
      } else {
        switchPanel('editor');
        toggleExplorerSidebar(false); // Expand
      }
    } else {
      switchPanel(targetPanelId);
      toggleExplorerSidebar(true); // Collapse/Hide explorer sidebar since we are not in Editor
    }
  });
});

document.querySelectorAll('.tab-item').forEach(item => {
  item.addEventListener('click', () => {
    switchPanel(item.dataset.panel);
  });
});

window.triggerPanelSwitch = (panelId) => {
  switchPanel(panelId);
};

// Collapsible Explorer Sidebar
function toggleExplorerSidebar(forceState) {
  const sidebar = document.getElementById('explorer-sidebar');
  if (!sidebar) return;
  const isCollapsed = forceState !== undefined ? forceState : !sidebar.classList.contains('collapsed');
  
  if (isCollapsed) {
    sidebar.classList.add('collapsed');
  } else {
    sidebar.classList.remove('collapsed');
  }
  
  localStorage.setItem('explorer-collapsed', isCollapsed);
  
  const sidebarCollapseToggle = document.getElementById('sidebar-collapse-toggle');
  if (sidebarCollapseToggle) {
    sidebarCollapseToggle.checked = isCollapsed;
  }
}

// Apply initial explorer sidebar state immediately
const explorerCollapsed = localStorage.getItem('explorer-collapsed') === 'true';
const explorerSidebar = document.getElementById('explorer-sidebar');
if (explorerSidebar) {
  if (explorerCollapsed) {
    explorerSidebar.classList.add('collapsed');
  } else {
    explorerSidebar.classList.remove('collapsed');
  }
}
const sidebarCollapseToggle = document.getElementById('sidebar-collapse-toggle');
if (sidebarCollapseToggle) {
  sidebarCollapseToggle.checked = explorerCollapsed;
}

// Explorer collapse button click
const explorerCollapseBtn = document.getElementById('explorer-collapse-btn');
if (explorerCollapseBtn) {
  explorerCollapseBtn.addEventListener('click', () => {
    toggleExplorerSidebar();
  });
}

// Menu view toggle sidebar action
const menuToggleSidebar = document.getElementById('menu-toggle-sidebar');
if (menuToggleSidebar) {
  menuToggleSidebar.addEventListener('click', (e) => {
    e.preventDefault();
    toggleExplorerSidebar();
  });
}

// Settings toggle switch checkbox
if (sidebarCollapseToggle) {
  sidebarCollapseToggle.addEventListener('change', (e) => {
    toggleExplorerSidebar(e.target.checked);
  });
}

// Keyboard shortcut (Ctrl+B) removed in favor of centralized registry

/* ========== Mini Markdown renderer ========== */
function md(src) {
  if (!src) return '';
  
  // Normalize Windows/Mac line endings to standard Unix line endings \n
  let s = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Escape HTML characters
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // 1. Extract and protect code blocks
  const codeBlocks = [];
  s = s.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code class="lang-${lang || ''}">${code.trim()}</code></pre>`);
    return `\n\n${id}\n\n`;
  });
  
  // 2. Headings (add spacing around them to make them block elements)
  s = s.replace(/^### (.*)$/gm, '\n\n<h3>$1</h3>\n\n')
       .replace(/^## (.*)$/gm, '\n\n<h2>$1</h2>\n\n')
       .replace(/^# (.*)$/gm, '\n\n<h1>$1</h1>\n\n');
  
  // 3. Bullets (add spacing around them to make them block elements)
  s = s.replace(/(^|\n)([-*] .+(?:\n[-*] .+)*)/g, (_, pre, block) => {
    const items = block.split('\n').map(l => {
      const clean = l.replace(/^[-*] /, '');
      return `<li>${clean}</li>`;
    }).join('');
    return `${pre}\n\n<ul>${items}</ul>\n\n`;
  });
  
  // 4. Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 5. Bold + Italic
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
       .replace(/\*(.+?)\*/g, '<i>$1</i>');
  
  // 6. Paragraphs (split by double newlines)
  s = s.split(/\n{2,}/)
       .map(p => {
         const trimmed = p.trim();
         if (!trimmed) return '';
         // If it's a block element or placeholder, return as is
         if (/^<(h\d|ul|pre|blockquote)/.test(trimmed) || trimmed.startsWith('__CODE_BLOCK_')) {
           return trimmed;
         }
         // Otherwise wrap in paragraph tag, converting single newlines to <br/>
         return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
       })
       .filter(Boolean)
       .join('\n');
  
  // 7. Restore protected code blocks
  codeBlocks.forEach((html, i) => {
    s = s.replace(new RegExp(`__CODE_BLOCK_${i}__`, 'g'), html);
  });
  
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

  if (meta && meta.timestamp) {
    body += `<span class="msg-time">${meta.timestamp}</span>`;
  }

  div.innerHTML = body;

  // Save to LinkedIn Drafts button injection
  if (role === 'assistant' && text && text.toLowerCase().includes('linkedin')) {
    const chatSaveBtn = document.createElement('button');
    chatSaveBtn.className = 'btn-ghost btn-xs';
    chatSaveBtn.style.marginTop = '8px';
    chatSaveBtn.style.display = 'inline-flex';
    chatSaveBtn.style.alignItems = 'center';
    chatSaveBtn.style.gap = '6px';
    chatSaveBtn.style.fontFamily = 'var(--mono)';
    chatSaveBtn.innerHTML = `💼 Save to LinkedIn Drafts`;
    chatSaveBtn.addEventListener('click', async () => {
      chatSaveBtn.disabled = true;
      chatSaveBtn.textContent = 'Saving to drafts...';
      try {
        const res = await fetch('/api/linkedin/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Saved from Chat',
            content: text,
            status: 'draft'
          })
        });
        const data = await res.json();
        if (data.success) {
          chatSaveBtn.innerHTML = `✓ Saved to LinkedIn Drafts`;
          chatSaveBtn.style.color = 'var(--green)';
          const activeTab = document.querySelector('.tab-item.active');
          if (activeTab && activeTab.dataset.panel === 'linkedin') {
            loadLinkedInDrafts();
          }
        } else {
          chatSaveBtn.textContent = 'Failed to Save';
          chatSaveBtn.disabled = false;
        }
      } catch (err) {
        console.error(err);
        chatSaveBtn.textContent = 'Error Saving';
        chatSaveBtn.disabled = false;
      }
    });
    div.appendChild(chatSaveBtn);
  }

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

// Active chat session state tracking
window.currentChatSessionId = localStorage.getItem('devhunt-current-session') || 'default_session';

// Parsing SQLite CURRENT_TIMESTAMP strings to local Date objects
function parseUtcTimestamp(utcStr) {
  if (!utcStr) return new Date();
  const isoStr = utcStr.replace(' ', 'T') + 'Z';
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? new Date(utcStr) : d;
}

// Custom date separator string builder
function getLocalDateString(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// Generate a unique timestamped session name
function generateNewSessionId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `Chat - ${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// Toggle history sidebar inside mentor panel
window.toggleMentorHistorySidebar = (forceState) => {
  const sidebar = document.getElementById('mentor-history-sidebar');
  if (!sidebar) return;
  const isCollapsed = forceState !== undefined ? forceState : !sidebar.classList.contains('collapsed');
  if (isCollapsed) {
    sidebar.classList.add('collapsed');
  } else {
    sidebar.classList.remove('collapsed');
  }
  localStorage.setItem('mentor-history-collapsed', isCollapsed);
};

// Select a session from history
window.selectSession = (sessionId) => {
  window.currentChatSessionId = sessionId;
  localStorage.setItem('devhunt-current-session', sessionId);
  window.loadSessionHistoryToFeed(sessionId);
  window.loadSessionList();
};

// Delete a session from history
window.deleteSessionFromSidebar = async (sessionId) => {
  if (!confirm(`Delete conversation "${sessionId}"?`)) return;
  try {
    const res = await fetch(`${API_BASE}/chat/history?session_id=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      if (sessionId === window.currentChatSessionId) {
        window.currentChatSessionId = 'default_session';
        localStorage.setItem('devhunt-current-session', 'default_session');
        window.loadSessionHistoryToFeed('default_session');
      }
      window.loadSessionList();
    }
  } catch (err) {
    console.error('Failed to delete session', err);
  }
};

// Load session messages to chat feed
window.loadSessionHistoryToFeed = async (sessionId) => {
  const chatFeed = document.getElementById('chat-feed');
  if (!chatFeed) return;
  chatFeed.innerHTML = '<div class="muted">// loading conversation history...</div>';
  try {
    const res = await fetch(`${API_BASE}/chat/history?session_id=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!data.success) {
      chatFeed.innerHTML = '<div class="muted">// failed to load history</div>';
      return;
    }
    const messages = data.history || [];
    chatFeed.innerHTML = '';
    if (messages.length === 0) {
      addMsg('assistant', seedAI);
      return;
    }
    let lastDateStr = null;
    messages.forEach(msg => {
      const msgDate = parseUtcTimestamp(msg.timestamp);
      const dateStr = getLocalDateString(msgDate);
      if (dateStr !== lastDateStr) {
        const separator = document.createElement('div');
        separator.className = 'chat-date-separator';
        separator.innerHTML = `<span>${dateStr}</span>`;
        chatFeed.appendChild(separator);
        lastDateStr = dateStr;
      }
      const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      addMsg(msg.role, msg.content, {
        timestamp: timeStr,
        model_used: msg.model_used,
        key_used: msg.key_used
      });
    });
    chatFeed.scrollTop = chatFeed.scrollHeight;
  } catch (err) {
    console.error('Failed to load session history', err);
    chatFeed.innerHTML = '<div class="muted">// error communicating with backend</div>';
  }
};

// Load list of all sessions in sidebar
window.loadSessionList = async () => {
  const listContainer = document.getElementById('mentor-history-sessions-list');
  if (!listContainer) return;
  try {
    const res = await fetch(`${API_BASE}/chat/sessions`);
    const data = await res.json();
    if (!data.success) return;
    const sessions = data.sessions || [];
    const groups = {
      today: [],
      yesterday: [],
      last7Days: [],
      older: {}
    };
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    sessions.forEach(sess => {
      const timeStr = sess.last_msg_time || sess.first_msg_time;
      const date = parseUtcTimestamp(timeStr);
      if (date.toDateString() === today.toDateString()) {
        groups.today.push({ sess, date });
      } else if (date.toDateString() === yesterday.toDateString()) {
        groups.yesterday.push({ sess, date });
      } else if (date >= sevenDaysAgo) {
        groups.last7Days.push({ sess, date });
      } else {
        const monthYear = date.toLocaleDateString([], { month: 'long', year: 'numeric' });
        if (!groups.older[monthYear]) {
          groups.older[monthYear] = [];
        }
        groups.older[monthYear].push({ sess, date });
      }
    });
    listContainer.innerHTML = '';
    const renderGroup = (title, items) => {
      if (items.length === 0) return;
      const groupDiv = document.createElement('div');
      groupDiv.className = 'history-group';
      const header = document.createElement('div');
      header.className = 'history-group-header';
      header.textContent = title;
      groupDiv.appendChild(header);
      items.forEach(({ sess, date }) => {
        const isActive = sess.session_id === window.currentChatSessionId;
        const activeClass = isActive ? 'active' : '';
        let displayTitle = sess.title || sess.session_id;
        if (displayTitle.length > 28) {
          displayTitle = displayTitle.slice(0, 26) + '…';
        }
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const item = document.createElement('div');
        item.className = `session-item ${activeClass}`;
        item.dataset.sessionId = sess.session_id;
        item.innerHTML = `
          <div class="session-title" title="${sess.title || sess.session_id}">${mdEscape(displayTitle)}</div>
          <div class="session-meta">
            <span>${timeStr}</span>
            <span>·</span>
            <span>${sess.msg_count} msgs</span>
          </div>
          <button class="session-delete-btn" title="Delete conversation" onclick="event.stopPropagation(); window.deleteSessionFromSidebar('${sess.session_id}')">✕</button>
        `;
        item.addEventListener('click', () => {
          window.selectSession(sess.session_id);
        });
        groupDiv.appendChild(item);
      });
      listContainer.appendChild(groupDiv);
    };
    renderGroup('Today', groups.today);
    renderGroup('Yesterday', groups.yesterday);
    renderGroup('Last 7 Days', groups.last7Days);
    const sortedMonths = Object.keys(groups.older).sort((a, b) => new Date(b) - new Date(a));
    sortedMonths.forEach(month => {
      renderGroup(month, groups.older[month]);
    });
    if (sessions.length === 0) {
      listContainer.innerHTML = '<div class="muted" style="text-align:center; padding: 20px 0; font-size:11px;">No previous chats</div>';
    }
  } catch (err) {
    console.error('Failed to load sessions list', err);
  }
};

async function sendChatMessage() {
  if (!inputEl) return;
  const message = inputEl.value.trim();
  if (!message) return;

  const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  addMsg('user', message, { timestamp: userTime });
  inputEl.value = '';

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
      body: JSON.stringify({ message, session_id: window.currentChatSessionId })
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

          } else if (data.type === 'done') {
            metaInfo = data;
            const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            metaInfo.timestamp = aiTime;

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

            if (aiTime) {
              body += `<span class="msg-time">${aiTime}</span>`;
            }

            aiDiv.innerHTML = body;
            feed.scrollTop = feed.scrollHeight;

            loadRoadmap();
            loadActiveStateHeader();
            if (data.todo_detected) {
              loadTodos();
            }
            window.loadSessionList();

          } else if (data.type === 'error') {
            aiDiv.innerHTML = `⚠️ **Error transmitting query**: ${data.error}`;
          }
        } catch (e) {
          // ignore
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

// Bind history toggler and new chat button
document.addEventListener('click', (e) => {
  if (e.target && (e.target.id === 'btn-toggle-history' || e.target.closest('#btn-toggle-history'))) {
    window.toggleMentorHistorySidebar();
  }
  if (e.target && e.target.id === 'mentor-new-chat-btn') {
    const newSessionId = generateNewSessionId();
    window.selectSession(newSessionId);
  }
});

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
  if (
    event.target.tagName === 'BUTTON' ||
    event.target.tagName === 'A' ||
    event.target.tagName === 'INPUT' ||
    event.target.closest('button') ||
    event.target.closest('a') ||
    event.target.closest('input') ||
    event.target.closest('.cmd-copy-btn') ||
    event.target.closest('.script-copy-btn')
  ) {
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

window.copyToClipboard = (event, text) => {
  event.stopPropagation();
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.currentTarget || event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1500);
  }).catch(err => {
    console.error('Failed to copy to clipboard', err);
  });
};

window.toggleTaskChecked = (checkbox, dayNum, taskIdx) => {
  localStorage.setItem(`task-${dayNum}-${taskIdx}`, checkbox.checked ? 'true' : 'false');
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

        const maxTagsToShow = 3;
        const slicedTopics = (day.topics || []).slice(0, maxTagsToShow);
        let topicsBadges = slicedTopics.map(t => `<span class="node-topic-tag">${t}</span>`).join('');
        if ((day.topics || []).length > maxTagsToShow) {
          topicsBadges += `<span class="node-topic-tag">+${day.topics.length - maxTagsToShow} more</span>`;
        }

        const rCount = day.resources ? day.resources.length : 0;
        const tCount = day.tasks ? day.tasks.length : 0;
        const isExpanded = expandedDays.has(day.day);

        let displayStatus = day.status || 'pending';
        if (day.day === path.current_day && displayStatus === 'pending') {
          displayStatus = 'active';
        }

        const leftStripHtml = `<div class="node-left-strip status-${displayStatus}"></div>`;
        const dayBadgeHtml = `<div class="node-day-badge">DAY ${String(day.day).padStart(2, '0')}</div>`;
        const statusBadgeHtml = `<span class="node-status-badge status-${displayStatus}">${displayStatus}</span>`;

        return `
          <div class="node ${isExpanded ? 'expanded' : ''}" data-day="${day.day}">
            ${leftStripHtml}
            <div class="node-header" onclick="toggleRoadmapDay(event, ${day.day})">
              <div class="node-main-info">
                ${dayBadgeHtml}
                <div class="node-header-center">
                  <div class="node-title">${day.title}</div>
                  <div class="node-topics-list">${topicsBadges}</div>
                </div>
                <div class="node-header-right">
                  <span class="node-meta-pill">⏱ ${day.estimated_time || 60}m</span>
                  <span class="node-meta-pill">📚 ${rCount} resources</span>
                  <span class="node-meta-pill">✅ ${tCount} tasks</span>
                  ${statusBadgeHtml}
                </div>
              </div>
              <div class="node-toggle-icon">${isExpanded ? '▲' : '▼'}</div>
            </div>
            
            <div class="node-details">
              <!-- Column 1: Overview & Commands -->
              <div style="display:flex; flex-direction:column; gap:16px;">
                <div>
                  <div class="detail-section-title">📘 Overview</div>
                  <div class="day-explanation">${day.explanation || 'Master the essential skills and concepts for this day.'}</div>
                  <div class="node-topics-list" style="margin-bottom:12px;">${(day.topics || []).map(t => `<span class="node-topic-tag">${t}</span>`).join('')}</div>
                </div>
                
                <div>
                  <div class="detail-section-title">⌨️ Commands to Master</div>
                  ${day.commands && day.commands.length > 0 ? `
                    <table class="cmd-table">
                      <thead>
                        <tr>
                          <th>Command</th>
                          <th>Description</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        ${day.commands.map(cmd => `
                          <tr>
                            <td><code class="cmd-code" title="${cmd.cmd}">${cmd.cmd}</code></td>
                            <td class="cmd-desc">${cmd.desc}</td>
                            <td class="cmd-actions">
                              <button class="cmd-copy-btn" onclick="copyToClipboard(event, '${cmd.cmd.replace(/'/g, "\\'")}')">Copy</button>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  ` : `<div class="muted" style="font-size:11px;">No commands defined for this day.</div>`}
                </div>
              </div>
              
              <!-- Column 2: Practice on KillerCoda -->
              <div style="display:flex; flex-direction:column; gap:16px;">
                <div>
                  <div class="detail-section-title">🧪 Practice Playground</div>
                  <p style="font-size:11.5px; line-height:1.4; margin-bottom:12px; color:var(--text);">
                    Practice in an interactive sandbox. Log in to KillerCoda, click below, and paste the setup script into your terminal.
                  </p>
                  <a href="${day.killercoda_url || 'https://killercoda.com/'}" target="_blank" class="killercoda-btn">Open KillerCoda Playground ↗</a>
                  
                  ${day.setup_script ? `
                    <div class="script-container">
                      <div class="script-header">
                        <span>Setup Script</span>
                        <button class="script-copy-btn" onclick="copyToClipboard(event, '${day.setup_script.replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}')">Copy</button>
                      </div>
                      <pre class="script-pre"><code>${day.setup_script}</code></pre>
                    </div>
                  ` : ''}
                </div>
                
                <div>
                  <div class="detail-section-title">📚 Study Resources</div>
                  <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:6px;">
                    ${(day.resources || []).map(r => {
                      const isLink = r.url && (r.url.startsWith('http://') || r.url.startsWith('https://'));
                      return `
                        <li style="font-size:11.5px;">
                          ${isLink ? `<a href="${r.url}" target="_blank" class="resource-link">🔗 ${r.title}</a>` : `<span class="resource-text">🔗 ${r.title} (${r.url || 'No URL'})</span>`}
                        </li>
                      `;
                    }).join('') || '<li class="muted">No resources listed</li>'}
                  </ul>
                </div>
              </div>
              
              <!-- Column 3: Hands-on Quests -->
              <div style="display:flex; flex-direction:column; justify-content:space-between; height:100%; gap:16px;">
                <div>
                  <div class="detail-section-title">✅ Hands-on Quests</div>
                  <div class="task-checklist">
                    ${(day.tasks || []).map((t, tIdx) => {
                      const isChecked = localStorage.getItem(`task-${day.day}-${tIdx}`) === 'true';
                      const taskId = `task-${day.day}-${tIdx}`;
                      return `
                        <div class="task-item-row">
                          <input type="checkbox" id="${taskId}" ${isChecked ? 'checked' : ''} onchange="toggleTaskChecked(this, ${day.day}, ${tIdx})">
                          <label for="${taskId}">
                            <span class="task-checkbox-custom"></span>
                            <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
                              <span class="task-title-text">${t}</span>
                              <div>
                                <button class="btn btn-ghost btn-xs btn-add-quest" onclick="addRoadmapQuest(event, '${t.replace(/'/g, "\\'")}', ${day.day}, '${day.title.replace(/'/g, "\\'")}')">+ Add Quest Board</button>
                              </div>
                            </div>
                          </label>
                        </div>
                      `;
                    }).join('') || '<div class="muted">No tasks listed</div>'}
                  </div>
                </div>
                
                <div class="node-action-buttons">
                  ${day.status !== 'completed' ? `<button class="node-action-btn btn-complete" onclick="event.stopPropagation(); updateRoadmapDay(${day.day}, 'completed')">✓ Complete Day</button>` : ''}
                  ${day.status === 'completed' ? `<button class="node-action-btn btn-reset" onclick="event.stopPropagation(); updateRoadmapDay(${day.day}, 'pending')">↺ Reset Day</button>` : ''}
                  ${day.status !== 'skipped' ? `<button class="node-action-btn btn-skip" onclick="event.stopPropagation(); updateRoadmapDay(${day.day}, 'skipped')">⤼ Skip Day</button>` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      const phaseHtml = `
        <div class="phase">
          <div class="phase-header">
            <span class="phase-badge">Phase ${pIdx + 1}</span>
            <div class="phase-info">
              <div class="phase-title">${phase.title}</div>
              <div class="phase-desc">${phase.description || ''}</div>
            </div>
          </div>
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

window.jumpToRoadmapDay = (dayNum) => {
  // 1. Switch to Hunt Path panel
  switchPanel('path');

  // 2. Expand this day node if not already expanded
  const card = document.querySelector(`.node[data-day="${dayNum}"]`);
  if (card) {
    if (!expandedDays.has(dayNum)) {
      expandedDays.add(dayNum);
      card.classList.add('expanded');
      const toggleIcon = card.querySelector('.node-toggle-icon');
      if (toggleIcon) toggleIcon.textContent = '▲';
    }
    // 3. Scroll to the card smoothly
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 4. Temporarily add a visual highlight/pulse effect
    card.classList.add('pulse-highlight');
    setTimeout(() => {
      card.classList.remove('pulse-highlight');
    }, 2000);
  }
};

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
      `<li class="touchable-target" onclick="window.jumpToRoadmapDay(${activeDay.day})">
        <span class="tag tag-active">ACTIVE</span>
        <span class="target-text">${topic}</span>
        <span class="target-arrow">→</span>
      </li>`
    ).join('');

    const tasksHtml = (activeDay.tasks || []).map(task =>
      `<li class="touchable-target" onclick="window.jumpToRoadmapDay(${activeDay.day})">
        <span class="tag tag-task">TASK</span>
        <span class="target-text">${task}</span>
        <span class="target-arrow">→</span>
      </li>`
    ).join('');

    listEl.innerHTML = `
      <div class="target-day-card" onclick="window.jumpToRoadmapDay(${activeDay.day})">
        <div class="target-day-badge">Day ${activeDay.day}</div>
        <div class="target-day-info">
          <div class="target-day-title">${activeDay.title}</div>
          <div class="target-day-action">View in Hunt Path →</div>
        </div>
      </div>
      <div class="target-items-container">
        ${topicsHtml}
        ${tasksHtml}
      </div>
    `;
  } else {
    listEl.innerHTML = `<li class="muted" style="font-size:11px; padding:10px; text-align:center;">No targets active. Complete/regenerate Hunt Path.</li>`;
  }
}

/* ========== Quest Board (Todo Kanban) ========== */
function formatDescriptionWithLinks(text) {
  if (!text) return '';
  const escaped = mdEscape(text);
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return escaped.replace(urlRegex, url => `<a href="${url}" target="_blank" class="qc-desc-link">${url}</a>`);
}

window.goToRoadmapDay = async (dayNum) => {
  expandedDays.add(dayNum);
  switchPanel('path');
  await loadRoadmap();
  const card = document.querySelector(`.node[data-day="${dayNum}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('pulse-highlight');
    setTimeout(() => card.classList.remove('pulse-highlight'), 3000);
  }
};

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
        const tagBadges = (q.tags || []).map(t => `<span>#${mdEscape(t)}</span>`).join('');
        const isAi = q.source === 'ai_detected';

        let dayNum = null;
        if (q.tags && q.tags.length > 0) {
          for (const tag of q.tags) {
            const match = tag.match(/^day-(\d+)$/i);
            if (match) {
              dayNum = parseInt(match[1], 10);
              break;
            }
          }
        }

        const roadmapLinkHtml = dayNum !== null ? `<a href="#" class="qc-link-btn" onclick="event.preventDefault(); goToRoadmapDay(${dayNum})">🗺 Open Roadmap Day ${dayNum} ↗</a>` : '';

        return `
          <div class="quest-card">
            <div class="qc-title">${mdEscape(q.title)}</div>
            ${q.description ? `<div class="qc-desc">${formatDescriptionWithLinks(q.description)}</div>` : ''}
            ${roadmapLinkHtml}
            <div class="qc-tags">${tagBadges}</div>
            <div class="qc-meta">
              <span>📅 ${mdEscape(q.due_date || 'No Date')}</span>
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
      `<li class="quest-mini-item">
        <input type="checkbox" id="quest-check-${q.id}" onclick="completeQuest(${q.id})"/>
        <label for="quest-check-${q.id}">
          <span class="checkbox-box"></span>
          <span class="quest-mini-title">${q.title}</span>
        </label>
      </li>`
    ).join('');
  } else {
    miniList.innerHTML = `<li class="muted" style="font-size:11px; padding:10px; text-align:center;">No active quests. Add some via Quest Board!</li>`;
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

    // Load Theme setting
    if (settings.theme) {
      setAppTheme(settings.theme, false);
    }

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
      arcade: true,
      linkedin: true
    };
    const toggles = settings.feature_toggles || defaultToggles;
    
    // Apply defaults to any missing keys
    for (const key in defaultToggles) {
      if (toggles[key] === undefined) {
        toggles[key] = defaultToggles[key];
      }
    }
    
    // Check checkboxes and apply visibility
    const featureKeys = ['music', 'path', 'quests', 'vault', 'doc-analysis', 'arcade', 'linkedin'];
    featureKeys.forEach(key => {
      const chk = document.getElementById(`toggle-feat-${key}`);
      if (chk) {
        chk.checked = toggles[key];
      }
      updateFeatureVisibility(key, toggles[key]);
    });

    // Font parameters loading and live variables override
    const fontEditor = settings.font_family_editor || 'JetBrains Mono';
    const fontTerminal = settings.font_family_terminal || 'JetBrains Mono';
    const sizeEditor = settings.font_size_editor || 14;
    const sizeTerminal = settings.font_size_terminal || 13;

    const editorFamilySelect = document.getElementById('font-family-editor');
    const editorSizeSlider = document.getElementById('font-size-editor');
    const editorSizeVal = document.getElementById('font-size-editor-val');
    
    if (editorFamilySelect) editorFamilySelect.value = fontEditor;
    if (editorSizeSlider) editorSizeSlider.value = sizeEditor;
    if (editorSizeVal) editorSizeVal.textContent = `${sizeEditor}px`;

    const terminalFamilySelect = document.getElementById('font-family-terminal');
    const terminalSizeSlider = document.getElementById('font-size-terminal');
    const terminalSizeVal = document.getElementById('font-size-terminal-val');
    
    if (terminalFamilySelect) terminalFamilySelect.value = fontTerminal;
    if (terminalSizeSlider) terminalSizeSlider.value = sizeTerminal;
    if (terminalSizeVal) terminalSizeVal.textContent = `${sizeTerminal}px`;

    document.documentElement.style.setProperty('--editor-font-size', sizeEditor + 'px');
    document.documentElement.style.setProperty('--editor-font-family', fontEditor);
    document.documentElement.style.setProperty('--terminal-font-size', sizeTerminal + 'px');
    document.documentElement.style.setProperty('--terminal-font-family', fontTerminal);

    // Canvas Particles Animation toggles
    const particlesCheckbox = document.getElementById('toggle-canvas-particles');
    const particlesEnabled = settings.canvas_particles !== false;
    if (particlesCheckbox) particlesCheckbox.checked = particlesEnabled;
    window.canvasParticlesEnabled = particlesEnabled;

    // Interface Sound effects toggles
    const soundCheckbox = document.getElementById('toggle-sound-effects');
    const soundEnabled = settings.sound_effects !== false;
    if (soundCheckbox) soundCheckbox.checked = soundEnabled;
    window.soundEffectsEnabled = soundEnabled;

    // Terminal customized settings
    const termUsernameInput = document.getElementById('terminal-username-input');
    const termHostnameInput = document.getElementById('terminal-hostname-input');
    const termPromptSymbol = document.getElementById('terminal-prompt-symbol');
    const termSoundCheckbox = document.getElementById('terminal-sound-toggle');

    if (termUsernameInput) termUsernameInput.value = settings.terminal_username || 'guest';
    if (termHostnameInput) termHostnameInput.value = settings.terminal_hostname || 'devhunt';
    if (termPromptSymbol) termPromptSymbol.value = settings.terminal_prompt_symbol || '$';
    if (termSoundCheckbox) termSoundCheckbox.checked = settings.terminal_sound !== false;

    window.terminalUsername = settings.terminal_username || 'guest';
    window.terminalHostname = settings.terminal_hostname || 'devhunt';
    window.terminalPromptSymbol = settings.terminal_prompt_symbol || '$';
    window.terminalSoundEnabled = settings.terminal_sound !== false;
    
    // Refresh terminal prompt elements
    const termPromptEl = document.getElementById('terminal-prompt-el');
    if (termPromptEl) {
      updatePrompt(termPromptEl);
    }

    // AI Configuration loading
    const aiModelSelect = document.getElementById('ai-model-select');
    const aiTempSlider = document.getElementById('ai-temp-slider');
    const aiTempVal = document.getElementById('ai-temp-val');
    const aiMaxTokensSlider = document.getElementById('ai-max-tokens-slider');
    const aiMaxTokensVal = document.getElementById('ai-max-tokens-val');
    const aiSystemPrompt = document.getElementById('ai-system-prompt');

    if (aiModelSelect) aiModelSelect.value = settings.selected_model || 'auto';
    
    const tempVal = settings.temperature !== undefined ? settings.temperature : 0.7;
    if (aiTempSlider) aiTempSlider.value = tempVal;
    if (aiTempVal) aiTempVal.textContent = tempVal;

    const maxToks = settings.max_tokens !== undefined ? settings.max_tokens : 2048;
    if (aiMaxTokensSlider) aiMaxTokensSlider.value = maxToks;
    if (aiMaxTokensVal) aiMaxTokensVal.textContent = maxToks;

    if (aiSystemPrompt) aiSystemPrompt.value = settings.system_prompt || '';

    // Shortcuts registry rendering
    const shortcutsList = document.getElementById('shortcuts-mapping-list');
    if (shortcutsList) {
      shortcutsList.innerHTML = '';
      const action_names = {
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
      
      const currentShortcuts = settings.shortcuts || {};
      for (const [actionId, combo] of Object.entries(default_shortcuts)) {
        if (currentShortcuts[actionId] === undefined) {
          currentShortcuts[actionId] = combo;
        }
      }
      window.hotkeys = currentShortcuts;
      
      // Update topbar dropdown labels
      const sidebarMenuText = document.getElementById('menu-toggle-sidebar');
      if (sidebarMenuText) sidebarMenuText.textContent = `Toggle Sidebar (${currentShortcuts.toggleSidebar || 'None'})`;
      
      const saveMenuText = document.getElementById('menu-save-file');
      if (saveMenuText) saveMenuText.textContent = `Save File (${currentShortcuts.saveFile || 'None'})`;

      for (const [actionId, actionLabel] of Object.entries(action_names)) {
        const binding = currentShortcuts[actionId] || 'None';
        const row = document.createElement('div');
        row.className = 'shortcut-row';
        row.innerHTML = `
          <span class="shortcut-label">${actionLabel}</span>
          <div class="shortcut-binding-container">
            <kbd id="kbd-${actionId}">${binding}</kbd>
            <button class="btn-ghost btn-sm record-shortcut-btn" data-action="${actionId}">Edit</button>
            <button class="btn-ghost btn-sm delete-shortcut-btn" data-action="${actionId}" style="color:var(--red); border-color:rgba(255,77,109,.2); padding: 4px 8px; font-size:10px;">✕</button>
          </div>
        `;
        shortcutsList.appendChild(row);
      }
      
      if (typeof window.bindShortcutsUIRecorders === 'function') {
        window.bindShortcutsUIRecorders();
      }
    }

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
  // 1. Hide/show left activity bar icon
  const activityItem = document.querySelector(`.activity-item[data-tab-panel="${key}"]`);
  if (activityItem) {
    activityItem.style.display = enabled ? 'flex' : 'none';
  }

  // 2. Hide/show main editor tab bar item
  const tabItem = document.querySelector(`.tab-item[data-panel="${key}"]`);
  if (tabItem) {
    // tab-items are display: block or inline-block in CSS, we use '' to let CSS control display
    tabItem.style.display = enabled ? '' : 'none';
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
  const activeActivityItem = document.querySelector('.activity-item.active');
  if (activeActivityItem && activeActivityItem.dataset.tabPanel === key && !enabled) {
    switchPanel('mentor');
  }
}

// Bind feature toggle event listeners
const featureKeys = ['music', 'path', 'quests', 'vault', 'doc-analysis', 'arcade', 'linkedin'];
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
    g += `<line x1="${pad}" y1="${yy}" x2="${W - pad / 2}" y2="${yy}" stroke="rgba(52,211,153,.08)" />`;
  }

  // axes labels
  days.forEach((d, i) => {
    g += `<text x="${x(i)}" y="${H - 8}" fill="#6c8290" font-size="9" text-anchor="middle" font-family="JetBrains Mono">${d}</text>`;
  });

  // lines paths
  const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  g += `<path d="${path(q)}" stroke="#34d399" stroke-width="2" fill="none" filter="drop-shadow(0 0 6px #34d399)"/>`;
  g += `<path d="${path(t)}" stroke="#38bdf8" stroke-width="2" fill="none" filter="drop-shadow(0 0 6px #38bdf8)"/>`;

  // node dots
  q.forEach((v, i) => {
    g += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#34d399"/>`;
  });
  t.forEach((v, i) => {
    g += `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#38bdf8"/>`;
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

  // Apply initial mentor history sidebar state
  const mentorHistoryCollapsed = localStorage.getItem('mentor-history-collapsed') === 'true';
  window.toggleMentorHistorySidebar(mentorHistoryCollapsed);
  
  // Load conversation history and list
  window.loadSessionHistoryToFeed(window.currentChatSessionId);
  window.loadSessionList();
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
          ? 'background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.3);'
          : 'background:rgba(52,211,153,.05);border:1px solid var(--border);'}
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
          
          const cmdLower = cmd.trim().toLowerCase();
          if (cmdLower.startsWith("hunt config") || cmdLower.startsWith("hunt shortcut")) {
            loadProfileAndSettings();
          }
        } else {
          lineResult.innerHTML = `<span class="ansi-red">Error: ${mdEscape(data.error)}</span>`;
          outputEl.appendChild(lineResult);
          playTerminalBeep();
        }
      } catch (err) {
        if (outputEl.contains(lineLoader)) {
          outputEl.removeChild(lineLoader);
        }
        const lineResult = document.createElement('div');
        lineResult.className = 'terminal-line ansi-red';
        lineResult.innerHTML = `Error: Connection lost to DevHunt core backend node.`;
        outputEl.appendChild(lineResult);
        playTerminalBeep();
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

  if (displayCwd.endsWith("/empty_workspace")) {
    displayCwd = "~";
  }

  const username = window.terminalUsername || 'guest';
  const hostname = window.terminalHostname || 'devhunt';
  const symbol = window.terminalPromptSymbol || '$';

  promptEl.textContent = `${username}@${hostname}:${displayCwd || '/'}${symbol}`;
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

    // Clear read notifications button
    const clearReadNotifBtn = document.getElementById('btn-notifications-clear-read');
    if (clearReadNotifBtn) {
      clearReadNotifBtn.addEventListener('click', async () => {
        try {
          const profileRes = await fetch(`${API_BASE}/profile`);
          const profileData = await profileRes.json();
          if (profileData.success) {
            const readIds = profileData.settings.read_notifications || [];
            const dismissedIds = profileData.settings.dismissed_notifications || [];
            const readNotifIds = currentNotificationsList
              .map(n => n.id)
              .filter(id => readIds.includes(id));
              
            if (readNotifIds.length > 0) {
              const newDismissed = Array.from(new Set([...dismissedIds, ...readNotifIds]));
              const res = await fetch(`${API_BASE}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  settings: { dismissed_notifications: newDismissed }
                })
              });
              const data = await res.json();
              if (data.success) {
                loadNotifications(false);
              }
            }
          }
        } catch (e) {
          console.error("Failed to clear read notifications", e);
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

    // Theme selector dropdown listener
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
      themeSelector.addEventListener('change', (e) => {
        setAppTheme(e.target.value);
      });
    }
  });
})();

/* ========== System Notifications & Messages Controller ========== */
let currentNotificationsList = [];

async function loadNotifications(autoMarkRead = false) {
  const container = document.getElementById('notifications-feed-container');
  const badge = document.getElementById('notification-unread-count');
  const activityBadge = document.getElementById('activity-notifications-badge');
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

    const displayVal = unreadCount > 0 ? 'inline-block' : 'none';
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = displayVal;
    }
    if (activityBadge) {
      activityBadge.textContent = unreadCount;
      activityBadge.style.display = displayVal;
    }

    // Auto-mark as read if viewing panel
    if (autoMarkRead && unreadCount > 0) {
      await markNotificationsAsRead(unreadNotifications.map(n => n.id), readIds);
    }

    // Toggle Clear Read button visibility
    const clearReadNotifBtn = document.getElementById('btn-notifications-clear-read');
    if (clearReadNotifBtn) {
      const hasRead = currentNotificationsList.some(n => readIds.includes(n.id));
      clearReadNotifBtn.style.display = hasRead ? 'inline-block' : 'none';
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
          <button class="notification-dismiss-btn" title="Dismiss" onclick="dismissNotification('${n.id}', event)">✕</button>
          <div class="notification-header">
            <div style="padding-right: 20px;">
              <span class="notification-tag">${typeTag}</span>
              <span class="notification-title">${mdEscape(n.title)}</span>
            </div>
            <span class="notification-time" style="margin-right: 18px;">${n.timestamp}</span>
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
      const activityBadge = document.getElementById('activity-notifications-badge');
      if (badge) badge.style.display = 'none';
      if (activityBadge) activityBadge.style.display = 'none';
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
  const activityBadge = document.getElementById('activity-notifications-badge');
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
            const displayVal = unreadItems.length > 0 ? 'inline-block' : 'none';
            if (badge) {
              badge.textContent = unreadItems.length;
              badge.style.display = displayVal;
            }
            if (activityBadge) {
              activityBadge.textContent = unreadItems.length;
              activityBadge.style.display = displayVal;
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

async function dismissNotification(id, event) {
  if (event) {
    event.stopPropagation();
  }
  try {
    const profileRes = await fetch(`${API_BASE}/profile`);
    const profileData = await profileRes.json();
    if (profileData.success) {
      const dismissedIds = profileData.settings.dismissed_notifications || [];
      if (!dismissedIds.includes(id)) {
        dismissedIds.push(id);
        const res = await fetch(`${API_BASE}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { dismissed_notifications: dismissedIds }
          })
        });
        const data = await res.json();
        if (data.success) {
          loadNotifications(false);
        }
      }
    }
  } catch (e) {
    console.error("Failed to dismiss notification", e);
  }
}

// Bind globally for inline HTML click handlers
window.triggerUpdateFromNotification = triggerUpdateFromNotification;
window.loadNotifications = loadNotifications;
window.openNotificationDetail = openNotificationDetail;
window.closeNotificationDetailModal = closeNotificationDetailModal;
window.dismissNotification = dismissNotification;
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
            style="background:none;border:1px solid rgba(52,211,153,0.25);color:var(--green);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;"
            title="Play">▶</button>
          <a href="/api/music/download/${encodeURIComponent(t.filename)}"
            onclick="event.stopPropagation()"
            style="background:none;border:1px solid rgba(56,189,248,0.25);color:var(--cyan);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;text-decoration:none;"
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
      const topTime = document.getElementById('top-music-time');
      
      const pct = el.duration ? ((el.currentTime / el.duration) * 100) + '%' : '0%';
      if (fill) fill.style.width = pct;
      if (sideFill) sideFill.style.width = pct;
      
      const curFormatted = fmtTime(el.currentTime);
      if (cur) cur.textContent = curFormatted;
      if (sideTime) sideTime.textContent = curFormatted;
      if (dur) dur.textContent = fmtTime(el.duration);
      if (topTime) topTime.textContent = curFormatted;
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
            if ((currentIndex === -1 || !el.src) && tracks.length) play(0);
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
  '#34d399', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'
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

  const isLight = document.body.classList.contains('theme-light');
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
    // Grid label
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

  const isLight = document.body.classList.contains('theme-light');
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255,255,255,0.05)';
  const labelColor = isLight ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255,255,255,0.25)';
  const dayLabelColor = isLight ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255,255,255,0.35)';
  const emptyColor = isLight ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255,255,255,0.15)';
  
  const isNeon = document.body.classList.contains('theme-neon');
  const isDevil = document.body.classList.contains('theme-devil');
  const chartColor = isLight ? '#4f46e5' : (isNeon ? '#34d399' : (isDevil ? '#ef4444' : '#6366f1'));
  const chartColorLight = isLight ? 'rgba(79, 70, 229, 0.15)' : (isNeon ? '#34d39933' : (isDevil ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)'));
  const chartLineColor = isLight ? '#4f46e5cc' : (isNeon ? '#34d399bb' : (isDevil ? '#ef4444cc' : '#6366f1cc'));

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

  // Draw bars + line overlay
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

    // Day label (show only every other day for readability)
    if (i % 2 === 0) {
      ctx.fillStyle = dayLabelColor;
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
    ctx.strokeStyle = chartLineColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = chartColor; ctx.shadowBlur = isLight ? 1 : 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dots
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

  const isLight = document.body.classList.contains('theme-light');
  const emptyColor = isLight ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255,255,255,0.15)';
  const donutHoleBg = isLight ? '#ffffff' : '#0b0f14';
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

  // Inner donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = donutHoleBg;
  ctx.fill();

  // Center text
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

    // ── Theme-Aware Palettes ───────────────────────────────────────────
    const isLight = document.body.classList.contains('theme-light');
    const isNeon = document.body.classList.contains('theme-neon');
    const isDevil = document.body.classList.contains('theme-devil');

    const STATS_PALETTE_LIGHT = [
      '#4f46e5', '#10b981', '#f59e0b', '#d946ef', '#0ea5e9', '#ef4444', '#8b5cf6', '#ec4899'
    ];
    const STATS_PALETTE_NEON = [
      '#34d399', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'
    ];
    const STATS_PALETTE_SLATE = [
      '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e'
    ];
    const STATS_PALETTE_DEVIL = [
      '#ef4444', '#f43f5e', '#d946ef', '#a855f7', '#fb7185', '#f472b6', '#fda4af', '#fca5a5'
    ];

    const palette = isLight ? STATS_PALETTE_LIGHT : (isNeon ? STATS_PALETTE_NEON : (isDevil ? STATS_PALETTE_DEVIL : STATS_PALETTE_SLATE));

    // ── Model Distribution Bar Chart ────────────────────────────────────────
    const modelLabels = d.model_distribution.map(m => m.model || 'Unknown');
    const modelReqs = d.model_distribution.map(m => m.requests);
    
    drawBarChart('chart-models', modelLabels, modelReqs, palette);

    // Model Legend
    const modelLegend = document.getElementById('model-legend');
    if (modelLegend) {
      modelLegend.innerHTML = d.model_distribution.map((m, i) =>
        `<span style="color:${palette[i % palette.length]}">■ ${m.model || 'Unknown'}: ${m.requests} req</span>`
      ).join('');
    }

    // ── API Key Workload Bar Chart ───────────────────────────────────────────
    const keyLabels = d.key_workload.map(k => k.label || k.masked || 'Key');
    const keyReqs = d.key_workload.map(k => k.requests);
    const KEY_COLORS = isLight 
      ? ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6'] 
      : (isNeon ? ['#38bdf8', '#60a5fa', '#a78bfa', '#f472b6'] : (isDevil ? ['#ef4444', '#f43f5e', '#d946ef', '#fbbf24'] : ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6']));
    drawBarChart('chart-keys', keyLabels, keyReqs, KEY_COLORS);

    const keyLegend = document.getElementById('key-legend');
    if (keyLegend) {
      keyLegend.innerHTML = d.key_workload.map((k, i) =>
        `<span style="color:${KEY_COLORS[i % KEY_COLORS.length]}">■ ${k.label || k.masked}: ${k.requests} req</span>`
      ).join('');
    }

    // ── Daily Activity Chart ─────────────────────────────────────────────────
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
    const donutColors = isLight 
      ? ['#10b981', '#4f46e5'] 
      : (isNeon ? ['#34d399', '#38bdf8'] : (isDevil ? ['#f43f5e', '#d946ef'] : ['#10b981', '#6366f1']));
    drawDonutChart('chart-role', [userCount, aiCount], ['User', 'AI'], donutColors);
    const roleLegend = document.getElementById('role-legend');
    if (roleLegend) {
      roleLegend.innerHTML = `
        <span style="color:${donutColors[0]}">■ User: ${userCount}</span>
        <span style="color:${donutColors[1]}">■ AI: ${aiCount}</span>
      `;
    }

    // ── Token Usage per Model (Horizontal Bars) ──────────────────────────────
    const tokenBarsEl = document.getElementById('token-model-bars');
    if (tokenBarsEl) {
      const maxTok = Math.max(...d.model_distribution.map(m => m.tokens), 1);
      const progressBg = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
      tokenBarsEl.innerHTML = d.model_distribution.length > 0
        ? d.model_distribution.map((m, i) => {
            const pct = maxTok > 0 ? Math.max(2, (m.tokens / maxTok) * 100) : 0;
            const color = palette[i % palette.length];
            return `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:10px; font-family:var(--mono); margin-bottom:4px;">
                  <span style="color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">${m.model || 'Unknown'}</span>
                  <span style="color:${color}; font-weight:bold;">${fmtNum(m.tokens)} tok</span>
                </div>
                <div style="height:8px; background:${progressBg}; border-radius:4px; overflow:hidden;">
                  <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, ${color}, ${color}88); border-radius:4px; box-shadow:0 0 6px ${color}55; transition:width 0.6s ease;"></div>
                </div>
              </div>`;
          }).join('')
        : '<div style="color:var(--muted); font-size:11px; text-align:center; padding:20px 0;">No token data yet</div>';
    }

    // ── Top Sessions Table ────────────────────────────────────────────────────
    const sessBody = document.getElementById('sessions-table-body');
    if (sessBody) {
      const rowBorderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
      sessBody.innerHTML = d.top_sessions.length > 0
        ? d.top_sessions.map((s, i) => `
            <tr style="border-bottom:1px solid ${rowBorderColor};">
              <td style="padding:6px 6px; color:var(--cyan); font-family:var(--mono); font-size:10px; max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '} ${s.session}
              </td>
              <td style="padding:6px 6px; text-align:right; color:var(--green); font-weight:bold;">${s.messages}</td>
              <td style="padding:6px 6px; text-align:right; color:var(--amber);">${fmtNum(s.tokens)}</td>
            </tr>`).join('')
        : '<tr><td colspan="3" style="text-align:center; color:var(--muted); padding:20px; font-family:var(--mono); font-size:11px;">No sessions found</td></tr>';
    }

    // ── Advanced Insights Rendering ──────────────────────────────────────────
    let peakDay = 'None';
    let peakMsgs = 0;
    if (d.daily_activity && d.daily_activity.length > 0) {
      d.daily_activity.forEach(r => {
        if (r.messages > peakMsgs) {
          peakMsgs = r.messages;
          peakDay = r.day;
        }
      });
    }

    const insightsContent = document.getElementById('advanced-insights-content');
    if (insightsContent) {
      const savingsStr = typeof d.est_savings === 'number' ? d.est_savings.toFixed(3) : '0.000';
      const avgTokensStr = typeof d.avg_tokens === 'number' ? d.avg_tokens.toFixed(1) : '0.0';
      const activeSessStr = typeof d.active_sessions_count === 'number' ? d.active_sessions_count : '0';
      
      insightsContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed var(--border);">
          <span class="muted">TOKEN EFFICIENCY</span>
          <span style="color:var(--cyan); font-weight:bold;">${avgTokensStr} tok/msg</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed var(--border);">
          <span class="muted">CLOUD COST SAVED</span>
          <span style="color:var(--green); font-weight:bold;">$${savingsStr}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed var(--border);">
          <span class="muted">ACTIVE SESSIONS</span>
          <span style="color:var(--amber); font-weight:bold;">${activeSessStr} active</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:6px 0;">
          <span class="muted">PEAK ACTIVITY DAY</span>
          <span style="color:var(--magenta); font-weight:bold;">${peakDay} (${peakMsgs} msg)</span>
        </div>
      `;
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
  
  // Topbar music deck redirect
  const topbarMusicDeck = document.getElementById('topbar-music-deck');
  if (topbarMusicDeck) {
    topbarMusicDeck.addEventListener('click', (e) => {
      if (e.target.closest('.music-btn')) return;
      switchPanel('music');
    });
  }

  // Explorer New File button click
  const expNewFileBtn = document.getElementById('explorer-new-file-btn');
  if (expNewFileBtn) {
    expNewFileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.showInlineNewFileInput();
    });
  }
  
  // Initialize explorer tree
  window.refreshExplorer();
  
  // Textarea scroll and input listeners for line numbers
  const textarea = document.getElementById('editor-textarea');
  const lineNumbers = document.getElementById('editor-line-numbers');
  if (textarea && lineNumbers) {
    textarea.addEventListener('scroll', () => {
      lineNumbers.scrollTop = textarea.scrollTop;
    });
    textarea.addEventListener('input', () => {
      window.updateEditorLineNumbers();
    });
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const spaces = "    ";
        textarea.value = textarea.value.substring(0, start) + spaces + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
        window.updateEditorLineNumbers();
      }
    });
  }
  
  // Save button in editor
  const editorSaveBtn = document.getElementById('editor-save-btn');
  if (editorSaveBtn) {
    editorSaveBtn.addEventListener('click', () => {
      window.saveActiveFile();
    });
  }
  
  // Topbar Menu bindings
  const newFileBtn = document.getElementById('menu-new-file');
  if (newFileBtn) {
    newFileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.showInlineNewFileInput();
    });
  }
  
  const menuSaveBtn = document.getElementById('menu-save-file');
  if (menuSaveBtn) {
    menuSaveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.saveActiveFile();
    });
  }
  
  const menuRefreshBtn = document.getElementById('menu-refresh-files');
  if (menuRefreshBtn) {
    menuRefreshBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.refreshExplorer();
    });
  }
  
  const menuClearBtn = document.getElementById('menu-clear-editor');
  if (menuClearBtn) {
    menuClearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const textarea = document.getElementById('editor-textarea');
      const activeFilePath = document.getElementById('active-file-path');
      window.activeEditingFilePath = null;
      if (textarea) {
        textarea.value = '';
        textarea.disabled = true;
        window.updateEditorLineNumbers();
      }
      if (activeFilePath) {
        activeFilePath.textContent = '// Select a file from the explorer sidebar to begin editing';
      }
      const saveBtn = document.getElementById('editor-save-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
      }
      document.querySelectorAll('.file-tree-node.file').forEach(el => {
        el.classList.remove('active');
      });
      updateTopbarTitle(null);
    });
  }
});

// Hardcoded Ctrl+S/K/N listeners removed in favor of centralized global keyboard shortcuts system

// IDE Explorer & Editor Implementation
window.expandedExplorerDirs = window.expandedExplorerDirs || new Set();
window.activeEditingFilePath = window.activeEditingFilePath || null;
window.explorerTreeData = window.explorerTreeData || null;

function renderFileNode(node) {
  if (node.isDir) {
    const isExpanded = window.expandedExplorerDirs.has(node.path);
    const childrenHtml = isExpanded && node.children
      ? `<div class="file-tree-children">${node.children.map(renderFileNode).join('')}</div>`
      : '';
    const arrow = isExpanded ? '▼' : '▶';
    return `
      <div class="file-tree-item" data-path="${node.path}">
        <div class="file-tree-node directory" data-path="${node.path}">
          <span class="folder-arrow">${arrow}</span>
          <span class="folder-icon">📁</span>
          <span class="node-name">${node.name}</span>
        </div>
        ${childrenHtml}
      </div>
    `;
  } else {
    const isActive = window.activeEditingFilePath === node.path;
    const activeClass = isActive ? 'active' : '';
    return `
      <div class="file-tree-node file ${activeClass}" data-path="${node.path}">
        <span class="file-icon">📄</span>
        <span class="node-name">${node.name}</span>
      </div>
    `;
  }
}

window.refreshExplorer = async () => {
  const treeContainer = document.getElementById('file-explorer-tree');
  if (!treeContainer) return;
  
  treeContainer.innerHTML = `<div class="muted">// scanning workspace...</div>`;
  
  try {
    const res = await fetch(`${API_BASE}/ide/files`);
    const data = await res.json();
    if (data.success) {
      window.explorerTreeData = data.files;
      window.renderExplorerTree();
    } else {
      treeContainer.innerHTML = `<div class="error">Error listing files: ${data.error}</div>`;
    }
  } catch (error) {
    console.error('Failed to load explorer tree', error);
    treeContainer.innerHTML = `<div class="error">Connection failed</div>`;
  }
};

window.renderExplorerTree = () => {
  const treeContainer = document.getElementById('file-explorer-tree');
  if (!treeContainer || !window.explorerTreeData) return;
  
  if (window.explorerTreeData.length === 0) {
    treeContainer.innerHTML = `<div class="muted">// empty workspace</div>`;
    return;
  }
  
  treeContainer.innerHTML = window.explorerTreeData.map(renderFileNode).join('');
  
  // Wire up click event handlers on nodes
  treeContainer.querySelectorAll('.file-tree-node.directory').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = el.dataset.path;
      if (window.expandedExplorerDirs.has(path)) {
        window.expandedExplorerDirs.delete(path);
      } else {
        window.expandedExplorerDirs.add(path);
      }
      window.renderExplorerTree();
    });
  });
  
  treeContainer.querySelectorAll('.file-tree-node.file').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = el.dataset.path;
      window.openFileInEditor(path);
    });
  });
};

window.openFileInEditor = async (path) => {
  const editorTextarea = document.getElementById('editor-textarea');
  const lineNumbers = document.getElementById('editor-line-numbers');
  const activeFilePath = document.getElementById('active-file-path');
  const saveBtn = document.getElementById('editor-save-btn');
  
  if (!editorTextarea || !lineNumbers || !activeFilePath || !saveBtn) return;
  
  editorTextarea.disabled = true;
  saveBtn.disabled = true;
  activeFilePath.textContent = `// Loading ${path}...`;
  updateTopbarTitle(path);
  
  try {
    const res = await fetch(`${API_BASE}/ide/file?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data.success) {
      window.activeEditingFilePath = path;
      editorTextarea.value = data.content;
      editorTextarea.disabled = false;
      saveBtn.disabled = false;
      activeFilePath.textContent = path;
      updateTopbarTitle(path);
      
      document.querySelectorAll('.file-tree-node.file').forEach(el => {
        el.classList.toggle('active', el.dataset.path === path);
      });
      
      window.updateEditorLineNumbers();
      switchPanel('editor');
    } else {
      activeFilePath.textContent = `// Error loading file: ${data.error}`;
      editorTextarea.value = '';
      updateTopbarTitle(null);
    }
  } catch (error) {
    console.error('Failed to read file', error);
    activeFilePath.textContent = `// Connection error loading file`;
    editorTextarea.value = '';
    updateTopbarTitle(null);
  }
};

window.showInlineNewFileInput = () => {
  const treeContainer = document.getElementById('file-explorer-tree');
  if (!treeContainer) return;

  // Check if an input is already open to avoid multiples
  if (document.getElementById('inline-new-file-input')) {
    document.getElementById('inline-new-file-input').focus();
    return;
  }

  // Ensure Code Editor is active and sidebar is expanded
  switchPanel('editor');
  toggleExplorerSidebar(false);

  // Create input wrapper styled like a file-tree-node
  const wrapper = document.createElement('div');
  wrapper.className = 'file-tree-node file temp-input-node';
  wrapper.style.paddingLeft = '10px';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '6px';
  wrapper.style.margin = '4px 0';

  wrapper.innerHTML = `
    <span class="file-icon">📄</span>
    <input id="inline-new-file-input" type="text" placeholder="filename.txt" style="
      background: var(--bg);
      border: 1px solid var(--border-hot);
      color: var(--text);
      font-family: var(--mono);
      font-size: 11px;
      padding: 2px 4px;
      border-radius: 3px;
      width: calc(100% - 30px);
      outline: none;
    " />
  `;

  // Insert at the top of the tree container
  treeContainer.insertBefore(wrapper, treeContainer.firstChild);
  const input = document.getElementById('inline-new-file-input');
  if (input) {
    input.focus();

    // Key events
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (val) {
          wrapper.remove();
          await createNewFile(val);
        } else {
          wrapper.remove();
        }
      } else if (e.key === 'Escape') {
        wrapper.remove();
      }
    });

    // Cancel on blur
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (wrapper.parentNode) {
          wrapper.remove();
        }
      }, 200);
    });
  }
};

async function createNewFile(path) {
  window.activeEditingFilePath = path;
  const editorTextarea = document.getElementById('editor-textarea');
  const activeFilePath = document.getElementById('active-file-path');
  const saveBtn = document.getElementById('editor-save-btn');
  if (editorTextarea && activeFilePath && saveBtn) {
    editorTextarea.value = '';
    editorTextarea.disabled = false;
    saveBtn.disabled = false;
    activeFilePath.textContent = window.activeEditingFilePath;
    updateTopbarTitle(window.activeEditingFilePath);
    window.updateEditorLineNumbers();
    switchPanel('editor');
    try {
      await fetch(`${API_BASE}/ide/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: window.activeEditingFilePath,
          content: ''
        })
      });
      window.refreshExplorer();
    } catch (err) {
      console.error('Failed to create empty file on disk', err);
    }
  }
}

window.updateEditorLineNumbers = () => {
  const textarea = document.getElementById('editor-textarea');
  const lineNumbers = document.getElementById('editor-line-numbers');
  if (!textarea || !lineNumbers) return;
  
  const lines = textarea.value.split('\n');
  const lineCount = Math.max(lines.length, 1);
  let numbersHtml = '';
  for (let i = 1; i <= lineCount; i++) {
    numbersHtml += `<div>${i}</div>`;
  }
  lineNumbers.innerHTML = numbersHtml;
};

window.saveActiveFile = async () => {
  if (!window.activeEditingFilePath) return;
  
  const saveBtn = document.getElementById('editor-save-btn');
  const textarea = document.getElementById('editor-textarea');
  if (!saveBtn || !textarea) return;
  
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  
  try {
    const res = await fetch(`${API_BASE}/ide/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: window.activeEditingFilePath,
        content: textarea.value
      })
    });
    const data = await res.json();
    if (data.success) {
      saveBtn.textContent = '✓ Saved';
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }, 1500);
    } else {
      alert(`Failed to save: ${data.error}`);
      saveBtn.textContent = 'Error';
      saveBtn.disabled = false;
    }
  } catch (error) {
    console.error('Failed to save file', error);
    alert('Connection error saving file');
    saveBtn.textContent = 'Error';
    saveBtn.disabled = false;
  }
};

window.triggerUpdateFromNotification = triggerUpdateFromNotification;
window.loadNotifications = loadNotifications;
window.openNotificationDetail = openNotificationDetail;
window.closeNotificationDetailModal = closeNotificationDetailModal;
window.loadTerminalStats = loadTerminalStats;


/* ========== Redesigned Settings & Keybindings Execution API ========== */

// Settings Tab Selector
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.dataset.settingsTab;
      
      document.querySelectorAll('.settings-nav-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      
      document.querySelectorAll('.settings-pane').forEach(el => el.classList.remove('active'));
      const activePane = document.getElementById(`settings-pane-${tabName}`);
      if (activePane) activePane.classList.add('active');
    });
  });

  // Typography Customization Listeners
  const editorFamily = document.getElementById('font-family-editor');
  const editorSize = document.getElementById('font-size-editor');
  const editorSizeVal = document.getElementById('font-size-editor-val');

  if (editorFamily) {
    editorFamily.addEventListener('change', async (e) => {
      document.documentElement.style.setProperty('--editor-font-family', e.target.value);
      await saveSettingsAPI({ font_family_editor: e.target.value });
    });
  }
  if (editorSize) {
    editorSize.addEventListener('input', (e) => {
      if (editorSizeVal) editorSizeVal.textContent = `${e.target.value}px`;
      document.documentElement.style.setProperty('--editor-font-size', e.target.value + 'px');
    });
    editorSize.addEventListener('change', async (e) => {
      await saveSettingsAPI({ font_size_editor: parseInt(e.target.value, 10) });
    });
  }

  const terminalFamily = document.getElementById('font-family-terminal');
  const terminalSize = document.getElementById('font-size-terminal');
  const terminalSizeVal = document.getElementById('font-size-terminal-val');

  if (terminalFamily) {
    terminalFamily.addEventListener('change', async (e) => {
      document.documentElement.style.setProperty('--terminal-font-family', e.target.value);
      await saveSettingsAPI({ font_family_terminal: e.target.value });
    });
  }
  if (terminalSize) {
    terminalSize.addEventListener('input', (e) => {
      if (terminalSizeVal) terminalSizeVal.textContent = `${e.target.value}px`;
      document.documentElement.style.setProperty('--terminal-font-size', e.target.value + 'px');
    });
    terminalSize.addEventListener('change', async (e) => {
      await saveSettingsAPI({ font_size_terminal: parseInt(e.target.value, 10) });
    });
  }

  // Live Canvas Particles toggle
  const canvasParticles = document.getElementById('toggle-canvas-particles');
  if (canvasParticles) {
    canvasParticles.addEventListener('change', async (e) => {
      window.canvasParticlesEnabled = e.target.checked;
      await saveSettingsAPI({ canvas_particles: e.target.checked });
    });
  }

  // Sound effects toggle
  const soundEffects = document.getElementById('toggle-sound-effects');
  if (soundEffects) {
    soundEffects.addEventListener('change', async (e) => {
      window.soundEffectsEnabled = e.target.checked;
      await saveSettingsAPI({ sound_effects: e.target.checked });
    });
  }

  // Terminal customization save
  const termSaveBtn = document.getElementById('terminal-save-btn');
  if (termSaveBtn) {
    termSaveBtn.addEventListener('click', async () => {
      const username = document.getElementById('terminal-username-input').value.trim() || 'guest';
      const hostname = document.getElementById('terminal-hostname-input').value.trim() || 'devhunt';
      const symbol = document.getElementById('terminal-prompt-symbol').value.trim() || '$';
      const sound = document.getElementById('terminal-sound-toggle').checked;
      
      termSaveBtn.textContent = 'Saving...';
      try {
        await saveSettingsAPI({
          terminal_username: username,
          terminal_hostname: hostname,
          terminal_prompt_symbol: symbol,
          terminal_sound: sound
        });
        
        window.terminalUsername = username;
        window.terminalHostname = hostname;
        window.terminalPromptSymbol = symbol;
        window.terminalSoundEnabled = sound;
        
        const termPromptEl = document.getElementById('terminal-prompt-el');
        if (termPromptEl) {
          updatePrompt(termPromptEl);
        }
        alert('Terminal prompt preferences applied successfully.');
      } catch (err) {
        console.error('Failed to save terminal settings', err);
      } finally {
        termSaveBtn.textContent = 'Apply Prompt Settings';
      }
    });
  }

  // Terminal customization reset
  const termResetBtn = document.getElementById('terminal-reset-btn');
  if (termResetBtn) {
    termResetBtn.addEventListener('click', async () => {
      if (confirm('Reset prompt parameters to default values?')) {
        termResetBtn.textContent = 'Resetting...';
        try {
          await saveSettingsAPI({
            terminal_username: 'guest',
            terminal_hostname: 'devhunt',
            terminal_prompt_symbol: '$',
            terminal_sound: true
          });
          loadProfileAndSettings();
          alert('Prompt parameters restored to defaults.');
        } catch (err) {
          console.error(err);
        } finally {
          termResetBtn.textContent = 'Reset Prompt Defaults';
        }
      }
    });
  }

  // Reset all keybindings
  const shortcutResetBtn = document.getElementById('shortcut-reset-btn');
  if (shortcutResetBtn) {
    shortcutResetBtn.addEventListener('click', async () => {
      if (confirm('Reset all keyboard shortcuts to default factory bindings?')) {
        shortcutResetBtn.textContent = 'Resetting...';
        try {
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
          await saveSettingsAPI({ shortcuts: default_shortcuts });
          loadProfileAndSettings();
          alert('All hotkeys reset to defaults successfully.');
        } catch (e) {
          console.error(e);
        } finally {
          shortcutResetBtn.textContent = 'Reset All Keybindings';
        }
      }
    });
  }

  // AI Configuration change handlers
  const aiModelSelect = document.getElementById('ai-model-select');
  if (aiModelSelect) {
    aiModelSelect.addEventListener('change', async (e) => {
      await saveSettingsAPI({ selected_model: e.target.value });
      loadActiveStateHeader();
    });
  }

  const aiTempSlider = document.getElementById('ai-temp-slider');
  const aiTempVal = document.getElementById('ai-temp-val');
  if (aiTempSlider) {
    aiTempSlider.addEventListener('input', (e) => {
      if (aiTempVal) aiTempVal.textContent = e.target.value;
    });
    aiTempSlider.addEventListener('change', async (e) => {
      await saveSettingsAPI({ temperature: parseFloat(e.target.value) });
    });
  }

  const aiMaxTokensSlider = document.getElementById('ai-max-tokens-slider');
  const aiMaxTokensVal = document.getElementById('ai-max-tokens-val');
  if (aiMaxTokensSlider) {
    aiMaxTokensSlider.addEventListener('input', (e) => {
      if (aiMaxTokensVal) aiMaxTokensVal.textContent = e.target.value;
    });
    aiMaxTokensSlider.addEventListener('change', async (e) => {
      await saveSettingsAPI({ max_tokens: parseInt(e.target.value, 10) });
    });
  }

  const aiSystemPromptSave = document.getElementById('ai-system-prompt-save-btn');
  if (aiSystemPromptSave) {
    aiSystemPromptSave.addEventListener('click', async () => {
      const promptVal = document.getElementById('ai-system-prompt').value;
      aiSystemPromptSave.textContent = 'Saving...';
      try {
        await saveSettingsAPI({ system_prompt: promptVal });
        alert('System prompt instructions saved successfully.');
      } catch (e) {
        console.error(e);
      } finally {
        aiSystemPromptSave.textContent = 'Save Instructions';
      }
    });
  }
});

async function saveSettingsAPI(settingsObj) {
  try {
    await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: settingsObj
      })
    });
  } catch (err) {
    console.error('saveSettingsAPI failed:', err);
    throw err;
  }
}

// Global recording state
let recordingAction = null;
let recordingBtn = null;

function bindShortcutsUIRecorders() {
  document.querySelectorAll('.record-shortcut-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      if (recordingAction) {
        stopRecording();
      }
      startRecording(action, btn);
    });
  });

  document.querySelectorAll('.delete-shortcut-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      if (confirm(`Clear shortcut for ${action}?`)) {
        await saveRecordedShortcut(action, 'None');
      }
    });
  });
}

function startRecording(action, btn) {
  recordingAction = action;
  recordingBtn = btn;
  btn.textContent = 'Press keys...';
  btn.classList.add('recording');
  window.addEventListener('keydown', handleRecordingKeydown, true);
}

function handleRecordingKeydown(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const key = e.key;
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    return; // wait for actual key
  }
  
  if (key === 'Escape' || key === 'Delete') {
    saveRecordedShortcut(recordingAction, 'None');
    stopRecording();
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
  
  saveRecordedShortcut(recordingAction, combo);
  stopRecording();
}

function stopRecording() {
  if (recordingBtn) {
    recordingBtn.textContent = 'Edit';
    recordingBtn.classList.remove('recording');
  }
  window.removeEventListener('keydown', handleRecordingKeydown, true);
  recordingAction = null;
  recordingBtn = null;
}

async function saveRecordedShortcut(action, combo) {
  try {
    const profileRes = await fetch(`${API_BASE}/profile`);
    const profileData = await profileRes.json();
    if (profileData.success) {
      const currentSettings = profileData.settings || {};
      const currentShortcuts = currentSettings.shortcuts || {};
      currentShortcuts[action] = combo;
      
      const res = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { shortcuts: currentShortcuts }
        })
      });
      const data = await res.json();
      if (data.success) {
        loadProfileAndSettings();
      }
    }
  } catch (error) {
    console.error('Failed to save shortcut', error);
  }
}

// Synthesize short retro bip/beep on terminal alert
function playTerminalBeep() {
  if (window.terminalSoundEnabled === false) return;
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

// Centralized keyboard shortcuts matcher
window.addEventListener('keydown', (e) => {
  if (recordingAction) return;

  // Bypass global shortcuts when playing in the Game Arcade
  const activePanel = document.querySelector('.panel.active');
  if (activePanel && activePanel.id === 'panel-arcade') {
    return;
  }

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
  const pressedCombo = parts.join('+');

  if (window.hotkeys) {
    let matchedActionId = null;
    for (const [actionId, combo] of Object.entries(window.hotkeys)) {
      if (combo && combo.trim().toLowerCase() === pressedCombo.toLowerCase()) {
        matchedActionId = actionId;
        break;
      }
    }

    if (matchedActionId) {
      const shortcutActions = {
        toggleSidebar: () => toggleExplorerSidebar(),
        saveFile: () => { if (window.activeEditingFilePath) window.saveActiveFile(); },
        focusChat: () => { switchPanel('mentor'); const ci = document.getElementById('chat-input'); if (ci) ci.focus(); },
        newFile: () => window.showInlineNewFileInput(),
        openTerminal: () => switchPanel('terminal'),
        clearEditor: () => { const clearBtn = document.getElementById('menu-clear-editor'); if (clearBtn) clearBtn.click(); },
        refreshExplorer: () => { if (typeof window.refreshExplorer === 'function') window.refreshExplorer(); },
        openLocalFolder: () => { if (typeof window.openLocalFolder === 'function') window.openLocalFolder(); },
        openLocalFile: () => { if (typeof window.openLocalFile === 'function') window.openLocalFile(); },
        formatDocument: () => { if (typeof window.formatActiveDocument === 'function') window.formatActiveDocument(); },
        globalSearch: () => { switchPanel('search'); const gsi = document.getElementById('global-search-input'); if (gsi) { gsi.focus(); gsi.select(); } }
      };

      if (shortcutActions[matchedActionId]) {
        const isEditing = document.activeElement && (
          document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA' || 
          document.activeElement.isContentEditable
        );

        const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
        const isFuncKey = /^F[1-9][0-2]?$/.test(keyName) || keyName === 'Escape';

        if (isEditing && !hasModifier && !isFuncKey) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        shortcutActions[matchedActionId]();
      }
    }
  }
});

// Expose internal components globally
window.bindShortcutsUIRecorders = bindShortcutsUIRecorders;
window.playTerminalBeep = playTerminalBeep;

/* ========== LinkedIn Drafts Feature ========== */
window.activeLinkedInDraft = null;

window.loadLinkedInDrafts = async () => {
  const draftsList = document.getElementById('linkedin-drafts-list');
  if (!draftsList) return;
  
  try {
    const res = await fetch(`${API_BASE}/linkedin/drafts`);
    const data = await res.json();
    if (!data.success) {
      draftsList.innerHTML = `<div class="muted" style="text-align:center; padding:20px; font-family:var(--mono);">Failed to load drafts</div>`;
      return;
    }
    
    const drafts = data.drafts || [];
    if (drafts.length === 0) {
      draftsList.innerHTML = `<div class="muted" style="text-align:center; padding:20px; font-family:var(--mono);">// No drafts found</div>`;
      return;
    }
    
    // Group drafts by date
    const groups = {};
    drafts.forEach(draft => {
      const date = parseUtcTimestamp(draft.created_at || draft.updated_at);
      const groupName = getLocalDateString(date);
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(draft);
    });
    
    draftsList.innerHTML = '';
    
    const escapeHtml = (str) => str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") : '';
    
    for (const [groupName, groupDrafts] of Object.entries(groups)) {
      const header = document.createElement('div');
      header.className = 'linkedin-date-group-header';
      header.textContent = groupName;
      draftsList.appendChild(header);
      
      groupDrafts.forEach(draft => {
        const item = document.createElement('div');
        const isActive = window.activeLinkedInDraft && window.activeLinkedInDraft.id === draft.id;
        item.className = `linkedin-draft-item${isActive ? ' active' : ''}`;
        
        const snippet = draft.content ? draft.content.substring(0, 100) + (draft.content.length > 100 ? '...' : '') : 'Empty content';
        
        item.innerHTML = `
          <div class="linkedin-draft-title">${escapeHtml(draft.title || 'Untitled Draft')}</div>
          <div class="linkedin-draft-snippet">${escapeHtml(snippet)}</div>
        `;
        
        item.addEventListener('click', () => {
          window.selectLinkedInDraft(draft);
        });
        
        draftsList.appendChild(item);
      });
    }
  } catch (err) {
    console.error('Error loading LinkedIn drafts:', err);
    draftsList.innerHTML = `<div class="muted" style="text-align:center; padding:20px; font-family:var(--mono);">Error loading drafts</div>`;
  }
};

window.selectLinkedInDraft = (draft) => {
  window.activeLinkedInDraft = draft;
  
  const emptyState = document.getElementById('linkedin-editor-empty');
  const activeState = document.getElementById('linkedin-editor-active');
  
  if (emptyState) emptyState.style.display = 'none';
  if (activeState) activeState.style.display = 'flex';
  
  const titleInput = document.getElementById('linkedin-draft-title');
  const contentTextarea = document.getElementById('linkedin-draft-content');
  const dateSpan = document.getElementById('linkedin-draft-date');
  const refinePrompt = document.getElementById('linkedin-refine-prompt');
  
  if (titleInput) titleInput.value = draft.title || '';
  if (contentTextarea) contentTextarea.value = draft.content || '';
  if (refinePrompt) refinePrompt.value = '';
  
  if (dateSpan) {
    if (draft.created_at) {
      const date = parseUtcTimestamp(draft.created_at);
      dateSpan.textContent = date.toLocaleString();
    } else {
      dateSpan.textContent = 'New Draft';
    }
  }
  
  document.querySelectorAll('.linkedin-draft-item').forEach(item => {
    item.classList.remove('active');
  });
  
  document.querySelectorAll('.linkedin-draft-item').forEach(item => {
    const titleEl = item.querySelector('.linkedin-draft-title');
    if (titleEl && titleEl.textContent === draft.title) {
      item.classList.add('active');
    }
  });
};

window.saveLinkedInDraft = async () => {
  const titleInput = document.getElementById('linkedin-draft-title');
  const contentTextarea = document.getElementById('linkedin-draft-content');
  if (!titleInput || !contentTextarea) return;
  
  const title = titleInput.value.trim() || 'Untitled Draft';
  const content = contentTextarea.value;
  
  if (!content) {
    alert('Please enter some content for the post.');
    return;
  }
  
  const saveBtn = document.getElementById('btn-linkedin-save');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }
  
  try {
    const isNew = !window.activeLinkedInDraft || !window.activeLinkedInDraft.id;
    const url = isNew ? `${API_BASE}/linkedin/drafts` : `${API_BASE}/linkedin/drafts/${window.activeLinkedInDraft.id}`;
    const method = isNew ? 'POST' : 'PUT';
    
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, status: 'draft' })
    });
    
    const data = await res.json();
    if (data.success) {
      if (isNew) {
        window.activeLinkedInDraft = data.draft;
      } else {
        window.activeLinkedInDraft.title = title;
        window.activeLinkedInDraft.content = content;
      }
      
      if (saveBtn) {
        saveBtn.textContent = 'Saved!';
        saveBtn.style.color = 'var(--green)';
        setTimeout(() => {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Draft';
          saveBtn.style.color = '';
        }, 1500);
      }
      
      await window.loadLinkedInDrafts();
      window.selectLinkedInDraft(window.activeLinkedInDraft);
    } else {
      alert('Failed to save draft: ' + (data.error || 'unknown error'));
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Draft';
      }
    }
  } catch (err) {
    console.error('Error saving draft:', err);
    alert('Failed to save draft due to connection error.');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Draft';
    }
  }
};

window.deleteLinkedInDraft = async () => {
  if (!window.activeLinkedInDraft || !window.activeLinkedInDraft.id) return;
  if (!confirm('Are you sure you want to delete this draft?')) return;
  
  const deleteBtn = document.getElementById('btn-linkedin-delete');
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';
  }
  
  try {
    const res = await fetch(`${API_BASE}/linkedin/drafts/${window.activeLinkedInDraft.id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      window.activeLinkedInDraft = null;
      const emptyState = document.getElementById('linkedin-editor-empty');
      const activeState = document.getElementById('linkedin-editor-active');
      if (emptyState) emptyState.style.display = 'block';
      if (activeState) activeState.style.display = 'none';
      
      await window.loadLinkedInDrafts();
    } else {
      alert('Failed to delete draft: ' + (data.error || 'unknown error'));
    }
  } catch (err) {
    console.error('Error deleting draft:', err);
    alert('Failed to delete draft due to connection error.');
  } finally {
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.textContent = 'Delete';
    }
  }
};

window.refineLinkedInDraft = async () => {
  const contentTextarea = document.getElementById('linkedin-draft-content');
  const promptInput = document.getElementById('linkedin-refine-prompt');
  if (!contentTextarea || !promptInput) return;
  
  const content = contentTextarea.value;
  const prompt = promptInput.value.trim();
  
  if (!content) {
    alert('Please enter some content to refine.');
    return;
  }
  if (!prompt) {
    alert('Please provide instructions for the AI refinement.');
    return;
  }
  
  const refineBtn = document.getElementById('btn-linkedin-refine');
  const titleInput = document.getElementById('linkedin-draft-title');
  
  if (refineBtn) {
    refineBtn.disabled = true;
    refineBtn.textContent = 'Refining...';
  }
  if (contentTextarea) contentTextarea.disabled = true;
  if (promptInput) promptInput.disabled = true;
  if (titleInput) titleInput.disabled = true;
  
  try {
    const res = await fetch(`${API_BASE}/linkedin/drafts/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, prompt })
    });
    const data = await res.json();
    if (data.success) {
      contentTextarea.value = data.refined_content;
      promptInput.value = '';
      if (refineBtn) {
        refineBtn.textContent = 'Refined!';
        refineBtn.style.color = 'var(--green)';
        setTimeout(() => {
          refineBtn.textContent = 'Refine Post';
          refineBtn.style.color = '';
        }, 1500);
      }
    } else {
      alert('AI Refinement failed: ' + (data.error || 'unknown error'));
    }
  } catch (err) {
    console.error('Error refining draft:', err);
    alert('AI Refinement failed due to connection error.');
  } finally {
    if (refineBtn) refineBtn.disabled = false;
    if (contentTextarea) contentTextarea.disabled = false;
    if (promptInput) promptInput.disabled = false;
    if (titleInput) titleInput.disabled = false;
  }
};

// Bind LinkedIn action triggers
document.addEventListener('DOMContentLoaded', () => {
  const newBtn = document.getElementById('btn-linkedin-new');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      window.selectLinkedInDraft({
        title: 'New Post Draft',
        content: '',
        status: 'draft'
      });
      window.activeLinkedInDraft = null; // Mark as unsaved
      const dateSpan = document.getElementById('linkedin-draft-date');
      if (dateSpan) dateSpan.textContent = 'Unsaved Draft';
    });
  }
  
  const saveBtn = document.getElementById('btn-linkedin-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', window.saveLinkedInDraft);
  }
  
  const deleteBtn = document.getElementById('btn-linkedin-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', window.deleteLinkedInDraft);
  }
  
  const refineBtn = document.getElementById('btn-linkedin-refine');
  if (refineBtn) {
    refineBtn.addEventListener('click', window.refineLinkedInDraft);
  }

  const refinePromptInput = document.getElementById('linkedin-refine-prompt');
  if (refinePromptInput) {
    refinePromptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.refineLinkedInDraft();
      }
    });
  }
});


/* ========== ADVANCED IDE WORKSPACE IMPLEMENTATION ========== */

// Core state
window.isUsingLocalFolder = false;
window.localFolderHandle = null;
window.localFileHandles = {};
window.localDirHandles = {};
window.localActiveFileHandle = null;
window.openTabs = [];
window.activeTabPath = null;
window.editorIndentSize = 4;
window.lastGlobalSearchResults = null;

// Original function wrappers
const originalOpenFile = window.openFileInEditor;
window.openFileInEditor = async (path) => {
  if (window.isUsingLocalFolder) {
    await window.openLocalFileInEditor(path);
  } else {
    await originalOpenFile(path);
    await window.triggerGitDiffHighlight(path);
  }
  window.scanCodeOutline();
};

const originalSaveFile = window.saveActiveFile;
window.saveActiveFile = async () => {
  if (window.isUsingLocalFolder) {
    await window.saveLocalActiveFile();
  } else {
    await originalSaveFile();
    if (window.activeEditingFilePath) {
      await window.triggerGitDiffHighlight(window.activeEditingFilePath);
    }
  }
  window.scanCodeOutline();
};

const originalRefreshExplorer = window.refreshExplorer;
window.refreshExplorer = async () => {
  const treeContainer = document.getElementById('file-explorer-tree');
  if (!treeContainer) return;
  
  if (window.isUsingLocalFolder && window.localFolderHandle) {
    treeContainer.innerHTML = `<div class="muted">// scanning local folder...</div>`;
    try {
      window.localFileHandles = {};
      window.localDirHandles = {};
      window.localDirHandles[''] = window.localFolderHandle;
      
      const tree = await buildLocalTree(window.localFolderHandle);
      window.explorerTreeData = tree;
      window.renderExplorerTree();
    } catch (err) {
      treeContainer.innerHTML = `<div class="error" style="color:var(--red);">Scan failed: ${err.message}</div>`;
    }
  } else {
    await originalRefreshExplorer();
  }
};

const originalRenderExplorerTree = window.renderExplorerTree;
window.renderExplorerTree = () => {
  originalRenderExplorerTree();
  
  const treeContainer = document.getElementById('file-explorer-tree');
  if (!treeContainer) return;
  
  treeContainer.querySelectorAll('.file-tree-node').forEach(el => {
    el.addEventListener('contextmenu', (e) => {
      const path = el.dataset.path;
      const isDir = el.classList.contains('directory');
      window.showExplorerContextMenu(e, path, isDir);
    });
  });
  
  treeContainer.querySelectorAll('.file-tree-node.file').forEach(el => {
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    
    clone.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = clone.dataset.path;
      window.addTab(path);
    });
    
    clone.addEventListener('contextmenu', (e) => {
      const path = clone.dataset.path;
      window.showExplorerContextMenu(e, path, false);
    });
  });
};

// Local Folder filesystem builder
async function buildLocalTree(dirHandle, relativePath = '') {
  const children = [];
  for await (const entry of dirHandle.values()) {
    const entryPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    if (entry.kind === 'directory') {
      if (['node_modules', '.git', '.venv', 'venv', '__pycache__', '.idea', '.vscode'].includes(entry.name)) {
        continue;
      }
      const subTree = await buildLocalTree(entry, entryPath);
      children.push({
        name: entry.name,
        path: entryPath,
        isDir: true,
        children: subTree
      });
      window.localDirHandles[entryPath] = entry;
    } else {
      children.push({
        name: entry.name,
        path: entryPath,
        isDir: false
      });
      window.localFileHandles[entryPath] = entry;
    }
  }
  
  children.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
  return children;
}

// Local File Open & Folder Open
window.openLocalFolder = async () => {
  try {
    const dirHandle = await window.showDirectoryPicker();
    window.localFolderHandle = dirHandle;
    window.localFileHandles = {};
    window.localDirHandles = {};
    window.isUsingLocalFolder = true;
    
    window.openTabs = [];
    window.activeTabPath = null;
    window.renderTabs();
    
    window.localDirHandles[''] = dirHandle;
    
    const menuCloseLocal = document.getElementById('menu-close-local');
    if (menuCloseLocal) menuCloseLocal.style.display = 'block';
    
    const explTitle = document.getElementById('explorer-title');
    if (explTitle) explTitle.textContent = `EXPLORER: LOCAL [${dirHandle.name}]`;
    
    await window.refreshExplorer();
  } catch (err) {
    if (err.name !== 'AbortError') {
      alert('Error opening folder: ' + err.message);
    }
  }
};

window.openLocalFile = async () => {
  try {
    const [fileHandle] = await window.showOpenFilePicker();
    const file = await fileHandle.getFile();
    const content = await file.text();
    
    window.isUsingLocalFolder = true;
    window.localFileHandles[file.name] = fileHandle;
    window.addTab(file.name);
    
    window.explorerTreeData = [{
      name: file.name,
      path: file.name,
      isDir: false
    }];
    window.renderExplorerTree();
  } catch (err) {
    if (err.name !== 'AbortError') {
      alert('Error opening file: ' + err.message);
    }
  }
};

window.closeLocalFolder = () => {
  window.isUsingLocalFolder = false;
  window.localFolderHandle = null;
  window.localFileHandles = {};
  window.localDirHandles = {};
  window.openTabs = [];
  window.activeTabPath = null;
  
  const menuCloseLocal = document.getElementById('menu-close-local');
  if (menuCloseLocal) menuCloseLocal.style.display = 'none';
  
  const explTitle = document.getElementById('explorer-title');
  if (explTitle) explTitle.textContent = `EXPLORER: LOCAL-AI`;
  
  window.renderTabs();
  window.refreshExplorer();
};

window.openLocalFileInEditor = async (path) => {
  const handle = window.localFileHandles[path];
  if (!handle) return;
  
  const editorTextarea = document.getElementById('editor-textarea');
  const lineNumbers = document.getElementById('editor-line-numbers');
  const activeFilePath = document.getElementById('active-file-path');
  const saveBtn = document.getElementById('editor-save-btn');
  
  if (!editorTextarea || !lineNumbers || !activeFilePath || !saveBtn) return;
  
  editorTextarea.disabled = true;
  saveBtn.disabled = true;
  activeFilePath.textContent = `// Loading ${path}...`;
  updateTopbarTitle(path);
  
  try {
    const file = await handle.getFile();
    const content = await file.text();
    
    window.activeEditingFilePath = path;
    window.localActiveFileHandle = handle;
    
    editorTextarea.value = content;
    editorTextarea.disabled = false;
    saveBtn.disabled = false;
    activeFilePath.textContent = `Local File: ${path}`;
    updateTopbarTitle(path);
    
    document.querySelectorAll('.file-tree-node.file').forEach(el => {
      el.classList.toggle('active', el.dataset.path === path);
    });
    
    window.updateEditorLineNumbers();
    switchPanel('editor');
  } catch (err) {
    activeFilePath.textContent = `// Error loading file: ${err.message}`;
  }
};

window.saveLocalActiveFile = async () => {
  if (!window.activeEditingFilePath || !window.localActiveFileHandle) return;
  
  const saveBtn = document.getElementById('editor-save-btn');
  const textarea = document.getElementById('editor-textarea');
  if (!saveBtn || !textarea) return;
  
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  
  try {
    const writable = await window.localActiveFileHandle.createWritable();
    await writable.write(textarea.value);
    await writable.close();
    
    saveBtn.textContent = '✓ Saved';
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }, 1500);
  } catch (err) {
    alert('Failed to save file: ' + err.message);
    saveBtn.textContent = 'Save Failed';
    saveBtn.disabled = false;
  }
};

// Workspace Tabs Management
window.addTab = (path) => {
  if (!window.openTabs.includes(path)) {
    window.openTabs.push(path);
  }
  window.selectTab(path);
};

window.selectTab = async (path) => {
  window.activeTabPath = path;
  window.renderTabs();
  await window.openFileInEditor(path);
  if (!window.isUsingLocalFolder) {
    window.recoverDraft(path);
  }
};

window.closeTab = (path, event) => {
  if (event) event.stopPropagation();
  window.openTabs = window.openTabs.filter(p => p !== path);
  
  if (window.activeTabPath === path) {
    if (window.openTabs.length > 0) {
      window.selectTab(window.openTabs[window.openTabs.length - 1]);
    } else {
      window.activeTabPath = null;
      window.activeEditingFilePath = null;
      const textarea = document.getElementById('editor-textarea');
      const activeFilePath = document.getElementById('active-file-path');
      if (textarea) {
        textarea.value = '';
        textarea.disabled = true;
        window.updateEditorLineNumbers();
      }
      if (activeFilePath) {
        activeFilePath.textContent = '// Select a file from the explorer sidebar to begin editing';
      }
      const saveBtn = document.getElementById('editor-save-btn');
      if (saveBtn) saveBtn.disabled = true;
      document.querySelectorAll('.file-tree-node.file').forEach(el => el.classList.remove('active'));
      
      const outlineSection = document.getElementById('sidebar-outline-section');
      if (outlineSection) outlineSection.style.display = 'none';
      updateTopbarTitle(null);
    }
  }
  window.renderTabs();
};

window.renderTabs = () => {
  const tabsBar = document.getElementById('editor-tabs-bar');
  if (!tabsBar) return;
  
  if (window.openTabs.length === 0) {
    tabsBar.innerHTML = '';
    return;
  }
  
  tabsBar.innerHTML = window.openTabs.map(path => {
    const filename = path.split('/').pop();
    const isActive = path === window.activeTabPath;
    const activeClass = isActive ? 'active' : '';
    return `
      <div class="editor-tab-item ${activeClass}" onclick="window.selectTab('${path}')">
        <span>📄 ${filename}</span>
        <span class="editor-tab-close" onclick="window.closeTab('${path}', event)">✕</span>
      </div>
    `;
  }).join('');
};

// Context Menu Operations
document.addEventListener('click', () => {
  const existingMenu = document.getElementById('explorer-context-menu');
  if (existingMenu) existingMenu.remove();
});

window.showExplorerContextMenu = (e, path, isDir) => {
  e.preventDefault();
  e.stopPropagation();
  
  const existingMenu = document.getElementById('explorer-context-menu');
  if (existingMenu) existingMenu.remove();
  
  const menu = document.createElement('ul');
  menu.id = 'explorer-context-menu';
  menu.className = 'context-menu';
  menu.style.top = `${e.pageY}px`;
  menu.style.left = `${e.pageX}px`;
  
  const items = [
    { label: '📄 New File', action: () => window.createNewItemPrompt(path, 'file', isDir) },
    { label: '📁 New Folder', action: () => window.createNewItemPrompt(path, 'directory', isDir) },
    { label: '✏️ Rename', action: () => window.renameItemPrompt(path) },
    { label: '🗑️ Delete', action: () => window.deleteItemConfirm(path, isDir) }
  ];
  
  menu.innerHTML = items.map((item, idx) => `
    <li class="context-menu-item" onclick="window.runContextAction(${idx})">${item.label}</li>
  `).join('');
  
  window.currentContextActions = items.map(item => item.action);
  document.body.appendChild(menu);
};

window.runContextAction = (idx) => {
  if (window.currentContextActions && window.currentContextActions[idx]) {
    window.currentContextActions[idx]();
  }
  const existingMenu = document.getElementById('explorer-context-menu');
  if (existingMenu) existingMenu.remove();
};

window.createNewItemPrompt = async (parentPath, type, parentIsDir) => {
  const name = prompt(`Enter new ${type} name:`);
  if (!name) return;
  
  let targetPath = parentPath;
  if (!parentIsDir && parentPath) {
    const parts = parentPath.split('/');
    parts.pop();
    targetPath = parts.join('/');
  }
  
  const finalPath = targetPath ? `${targetPath}/${name}` : name;
  
  if (window.isUsingLocalFolder) {
    try {
      const parentDirHandle = window.localDirHandles[targetPath] || window.localFolderHandle;
      if (type === 'directory') {
        const handle = await parentDirHandle.getDirectoryHandle(name, { create: true });
        window.localDirHandles[finalPath] = handle;
      } else {
        const handle = await parentDirHandle.getFileHandle(name, { create: true });
        window.localFileHandles[finalPath] = handle;
        const writable = await handle.createWritable();
        await writable.write('');
        await writable.close();
      }
      await window.refreshExplorer();
    } catch (err) {
      alert('Failed to create local item: ' + err.message);
    }
  } else {
    try {
      const res = await fetch(`${API_BASE}/ide/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: finalPath, type })
      });
      const data = await res.json();
      if (data.success) {
        await window.refreshExplorer();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (err) {
      alert('Connection error');
    }
  }
};

window.renameItemPrompt = async (path) => {
  const parts = path.split('/');
  const oldName = parts.pop();
  const parentPath = parts.join('/');
  
  const newName = prompt(`Rename "${oldName}" to:`, oldName);
  if (!newName || newName === oldName) return;
  
  const newPath = parentPath ? `${parentPath}/${newName}` : newName;
  
  if (window.isUsingLocalFolder) {
    try {
      const parentDirHandle = window.localDirHandles[parentPath] || window.localFolderHandle;
      const fileHandle = window.localFileHandles[path];
      if (fileHandle) {
        const newFileHandle = await parentDirHandle.getFileHandle(newName, { create: true });
        const file = await fileHandle.getFile();
        const text = await file.text();
        const writable = await newFileHandle.createWritable();
        await writable.write(text);
        await writable.close();
        
        await parentDirHandle.removeEntry(oldName);
        delete window.localFileHandles[path];
        window.localFileHandles[newPath] = newFileHandle;
        
        if (window.openTabs.includes(path)) {
          window.openTabs = window.openTabs.map(p => p === path ? newPath : p);
          if (window.activeTabPath === path) window.activeTabPath = newPath;
        }
      }
      await window.refreshExplorer();
    } catch (e) {
      alert('Error renaming: ' + e.message);
    }
  } else {
    try {
      const res = await fetch(`${API_BASE}/ide/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_path: path, new_path: newPath })
      });
      const data = await res.json();
      if (data.success) {
        if (window.openTabs.includes(path)) {
          window.openTabs = window.openTabs.map(p => p === path ? newPath : p);
          if (window.activeTabPath === path) window.activeTabPath = newPath;
        }
        await window.refreshExplorer();
      } else {
        alert('Rename failed: ' + data.error);
      }
    } catch (e) {
      alert('Connection lost');
    }
  }
};

window.deleteItemConfirm = async (path, isDir) => {
  if (!confirm(`Are you sure you want to delete "${path}"?`)) return;
  
  const parts = path.split('/');
  const name = parts.pop();
  const parentPath = parts.join('/');
  
  if (window.isUsingLocalFolder) {
    try {
      const parentDirHandle = window.localDirHandles[parentPath] || window.localFolderHandle;
      await parentDirHandle.removeEntry(name, { recursive: isDir });
      delete window.localFileHandles[path];
      delete window.localDirHandles[path];
      
      if (window.openTabs.includes(path)) {
        window.closeTab(path);
      }
      await window.refreshExplorer();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  } else {
    try {
      const res = await fetch(`${API_BASE}/ide/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      if (data.success) {
        if (window.openTabs.includes(path)) {
          window.closeTab(path);
        }
        await window.refreshExplorer();
      } else {
        alert('Delete failed: ' + data.error);
      }
    } catch (err) {
      alert('Connection lost');
    }
  }
};

// Git Diff Highlights Gutter
window.triggerGitDiffHighlight = async (path) => {
  const lineNumbers = document.getElementById('editor-line-numbers');
  if (!lineNumbers || window.isUsingLocalFolder) return;
  
  try {
    const res = await fetch(`${API_BASE}/ide/gitdiff?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (data.success) {
      const added = new Set(data.added || []);
      const modified = new Set(data.modified || []);
      const deleted = new Set(data.deleted || []);
      
      const lines = lineNumbers.children;
      for (let i = 0; i < lines.length; i++) {
        const lineDiv = lines[i];
        const lineNum = i + 1;
        lineDiv.classList.remove('line-added', 'line-modified', 'line-deleted');
        if (added.has(lineNum)) {
          lineDiv.classList.add('line-added');
        } else if (modified.has(lineNum)) {
          lineDiv.classList.add('line-modified');
        } else if (deleted.has(lineNum)) {
          lineDiv.classList.add('line-deleted');
        }
      }
    }
  } catch (error) {
    console.error('Failed to load git diff details', error);
  }
};

// Code Outline Symbol Scanner
window.scanCodeOutline = () => {
  const textarea = document.getElementById('editor-textarea');
  const outlineSection = document.getElementById('sidebar-outline-section');
  const outlineTree = document.getElementById('outline-content-tree');
  if (!textarea || !outlineSection || !outlineTree || !window.activeEditingFilePath) return;
  
  outlineSection.style.display = 'block';
  const content = textarea.value;
  const ext = window.activeEditingFilePath.split('.').pop().toLowerCase();
  
  let symbols = [];
  const lines = content.split('\n');
  
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
    } else if (ext === 'js' || ext === 'ts' || ext === 'javascript' || ext === 'json') {
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
  
  if (symbols.length === 0) {
    outlineTree.innerHTML = `<div class="muted" style="font-size: 10px; font-style: italic;">No symbols found</div>`;
    return;
  }
  
  outlineTree.innerHTML = symbols.map(sym => {
    let padding = 0;
    if (sym.type === 'heading') {
      padding = (sym.level - 1) * 8;
    }
    const icon = sym.type === 'class' ? '🧩' : (sym.type === 'heading' ? '🔖' : '⚡');
    return `
      <div class="outline-item" style="padding-left: ${padding}px" onclick="window.scrollToEditorLine(${sym.line})">
        <span class="outline-icon">${icon}</span>
        <span>${sym.name}</span>
      </div>
    `;
  }).join('');
};

// Document Indentation Formatter
window.formatBracketsIndentation = (text, indentStr) => {
  const lines = text.split('\n');
  let level = 0;
  return lines.map(line => {
    let trimmed = line.trim();
    if (trimmed.startsWith('}') || trimmed.startsWith(']')) {
      level = Math.max(0, level - 1);
    }
    const indented = indentStr.repeat(level) + trimmed;
    if (trimmed.endsWith('{') || trimmed.endsWith('[')) {
      level++;
    }
    return indented;
  }).join('\n');
};

window.formatHTMLIndentation = (text, indentStr) => {
  const lines = text.split('\n');
  let level = 0;
  return lines.map(line => {
    let trimmed = line.trim();
    if (trimmed.startsWith('</')) {
      level = Math.max(0, level - 1);
    }
    const indented = indentStr.repeat(level) + trimmed;
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</') && !trimmed.startsWith('<!')) {
      const parts = trimmed.split(/[ >]/);
      if (parts.length > 0) {
        const tagName = parts[0].substring(1);
        const selfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName.toLowerCase());
        if (!selfClosing) {
          level++;
        }
      }
    }
    return indented;
  }).join('\n');
};

window.formatPythonIndentation = (text, indentStr) => {
  const lines = text.split('\n');
  let level = 0;
  return lines.map(line => {
    let trimmed = line.trim();
    const indented = indentStr.repeat(level) + trimmed;
    if (trimmed.endsWith(':')) {
      level++;
    } else if (trimmed === 'break' || trimmed === 'return' || trimmed.startsWith('return ') || trimmed === 'pass' || trimmed === 'continue') {
      level = Math.max(0, level - 1);
    }
    return indented;
  }).join('\n');
};

window.formatActiveDocument = () => {
  const textarea = document.getElementById('editor-textarea');
  if (!textarea || textarea.disabled || !window.activeEditingFilePath) return;
  
  const content = textarea.value;
  const ext = window.activeEditingFilePath.split('.').pop().toLowerCase();
  const indentType = document.getElementById('status-bar-select-indent').value;
  
  let indentStr = '    ';
  if (indentType === '2') indentStr = '  ';
  else if (indentType === 'tab') indentStr = '\t';
  
  let formatted = content;
  
  try {
    if (ext === 'json') {
      const obj = JSON.parse(content);
      formatted = JSON.stringify(obj, null, indentStr === '\t' ? '\t' : parseInt(indentType));
    } else if (ext === 'js' || ext === 'javascript' || ext === 'ts') {
      formatted = window.formatBracketsIndentation(content, indentStr);
    } else if (ext === 'css') {
      formatted = window.formatBracketsIndentation(content, indentStr);
    } else if (ext === 'html') {
      formatted = window.formatHTMLIndentation(content, indentStr);
    } else if (ext === 'py') {
      formatted = window.formatPythonIndentation(content, indentStr);
    }
    
    textarea.value = formatted;
    window.updateEditorLineNumbers();
    
    const saveBtn = document.getElementById('editor-save-btn');
    if (saveBtn) {
      const origText = saveBtn.textContent;
      saveBtn.textContent = '✓ Formatted';
      setTimeout(() => { saveBtn.textContent = origText; }, 1000);
    }
  } catch (err) {
    alert('Failed to format document: ' + err.message);
  }
};

// In-File Find Widget
window.findMatches = [];
window.findMatchIndex = -1;

window.toggleFindWidget = () => {
  const widget = document.getElementById('editor-find-widget');
  if (!widget) return;
  
  const isActive = widget.classList.contains('active');
  if (isActive) {
    widget.classList.remove('active');
  } else {
    widget.classList.add('active');
    const input = document.getElementById('find-input');
    if (input) {
      input.focus();
      input.select();
      window.runFindSearch();
    }
  }
};

window.runFindSearch = () => {
  const textarea = document.getElementById('editor-textarea');
  const query = document.getElementById('find-input').value;
  const stats = document.getElementById('find-widget-stats');
  if (!textarea || !stats) return;
  
  if (!query) {
    window.findMatches = [];
    window.findMatchIndex = -1;
    stats.textContent = '0 of 0';
    return;
  }
  
  const content = textarea.value;
  window.findMatches = [];
  
  let index = 0;
  while ((index = content.toLowerCase().indexOf(query.toLowerCase(), index)) !== -1) {
    window.findMatches.push(index);
    index += query.length;
  }
  
  if (window.findMatches.length > 0) {
    window.findMatchIndex = 0;
    stats.textContent = `1 of ${window.findMatches.length}`;
    window.highlightFindMatch();
  } else {
    window.findMatchIndex = -1;
    stats.textContent = '0 of 0';
  }
};

window.highlightFindMatch = () => {
  const textarea = document.getElementById('editor-textarea');
  const query = document.getElementById('find-input').value;
  if (!textarea || window.findMatchIndex === -1 || window.findMatches.length === 0) return;
  
  const startChar = window.findMatches[window.findMatchIndex];
  const endChar = startChar + query.length;
  
  textarea.focus();
  textarea.selectionStart = startChar;
  textarea.selectionEnd = endChar;
  
  const linesBefore = textarea.value.substring(0, startChar).split('\n').length;
  const lineHeight = 19.2;
  textarea.scrollTop = (linesBefore - 1) * lineHeight - (textarea.clientHeight / 2);
};

window.findNextMatch = () => {
  if (window.findMatches.length === 0) return;
  window.findMatchIndex = (window.findMatchIndex + 1) % window.findMatches.length;
  document.getElementById('find-widget-stats').textContent = `${window.findMatchIndex + 1} of ${window.findMatches.length}`;
  window.highlightFindMatch();
};

window.findPrevMatch = () => {
  if (window.findMatches.length === 0) return;
  window.findMatchIndex = (window.findMatchIndex - 1 + window.findMatches.length) % window.findMatches.length;
  document.getElementById('find-widget-stats').textContent = `${window.findMatchIndex + 1} of ${window.findMatches.length}`;
  window.highlightFindMatch();
};

window.replaceCurrentMatch = () => {
  const textarea = document.getElementById('editor-textarea');
  const replaceVal = document.getElementById('replace-input').value;
  const query = document.getElementById('find-input').value;
  if (!textarea || window.findMatchIndex === -1 || window.findMatches.length === 0) return;
  
  const startChar = window.findMatches[window.findMatchIndex];
  const endChar = startChar + query.length;
  
  const content = textarea.value;
  textarea.value = content.substring(0, startChar) + replaceVal + content.substring(endChar);
  window.updateEditorLineNumbers();
  window.runFindSearch();
};

window.replaceAllMatches = () => {
  const textarea = document.getElementById('editor-textarea');
  const replaceVal = document.getElementById('replace-input').value;
  const query = document.getElementById('find-input').value;
  if (!textarea || !query) return;
  
  const content = textarea.value;
  const regex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
  textarea.value = content.replace(regex, replaceVal);
  window.updateEditorLineNumbers();
  window.runFindSearch();
};

// Global Workspace Search & Replace
window.runGlobalSearch = async () => {
  const query = document.getElementById('global-search-input').value.trim();
  const resultsContainer = document.getElementById('global-search-results');
  const statusEl = document.getElementById('global-search-status');
  if (!resultsContainer || !statusEl) return;
  
  if (!query) {
    resultsContainer.innerHTML = `<div class="muted" style="text-align: center; padding: 40px 0;">// Enter a query and run Search</div>`;
    statusEl.textContent = '';
    return;
  }
  
  resultsContainer.innerHTML = `<div class="muted" style="text-align: center; padding: 40px 0;">// searching files...</div>`;
  statusEl.textContent = 'Searching...';
  
  const isCase = document.getElementById('search-opt-case').classList.contains('active');
  const isWord = document.getElementById('search-opt-word').classList.contains('active');
  const isRegex = document.getElementById('search-opt-regex').classList.contains('active');
  
  let results = [];
  
  if (window.isUsingLocalFolder) {
    results = await runLocalGlobalSearch(query, isCase, isWord, isRegex);
  } else {
    try {
      const res = await fetch(`${API_BASE}/ide/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          case_sensitive: isCase,
          whole_word: isWord,
          regex: isRegex
        })
      });
      const data = await res.json();
      if (data.success) {
        results = data.results || [];
      } else {
        resultsContainer.innerHTML = `<div class="error" style="color:var(--red); padding: 20px 0;">Search failed: ${data.error}</div>`;
        statusEl.textContent = 'Error';
        return;
      }
    } catch (err) {
      resultsContainer.innerHTML = `<div class="error" style="color:var(--red); padding: 20px 0;">Connection lost</div>`;
      statusEl.textContent = 'Failed';
      return;
    }
  }
  
  window.lastGlobalSearchResults = results;
  window.renderGlobalSearchResults();
};

async function runLocalGlobalSearch(query, isCase, isWord, isRegex) {
  const results = [];
  const filesList = Object.entries(window.localFileHandles);
  
  let regex;
  try {
    if (isRegex) {
      regex = new RegExp(query, isCase ? '' : 'i');
    } else {
      let escaped = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      if (isWord) escaped = `\\b${escaped}\\b`;
      regex = new RegExp(escaped, isCase ? '' : 'i');
    }
  } catch (err) {
    alert('Invalid search query: ' + err.message);
    return [];
  }
  
  for (const [path, handle] of filesList) {
    try {
      const file = await handle.getFile();
      const text = await file.text();
      const lines = text.split('\n');
      lines.forEach((line, idx) => {
        if (regex.test(line)) {
          results.push({
            path,
            line: idx + 1,
            content: line.trim()
          });
        }
      });
    } catch (e) {}
  }
  return results;
}

window.renderGlobalSearchResults = () => {
  const resultsContainer = document.getElementById('global-search-results');
  const statusEl = document.getElementById('global-search-status');
  const query = document.getElementById('global-search-input').value;
  if (!resultsContainer || !window.lastGlobalSearchResults) return;
  
  const results = window.lastGlobalSearchResults;
  statusEl.textContent = `${results.length} matches found`;
  
  if (results.length === 0) {
    resultsContainer.innerHTML = `<div class="muted" style="text-align: center; padding: 40px 0;">No matches found</div>`;
    return;
  }
  
  const groups = {};
  results.forEach(res => {
    groups[res.path] = groups[res.path] || [];
    groups[res.path].push(res);
  });
  
  resultsContainer.innerHTML = Object.entries(groups).map(([path, matches]) => {
    const matchesHtml = matches.map(match => {
      const escapedLine = match.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let highlighted = escapedLine;
      try {
        const regex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        highlighted = escapedLine.replace(regex, m => `<span class="search-result-highlight">${m}</span>`);
      } catch (e) {}
      
      return `
        <div class="search-result-match" onclick="window.openFileAndScrollToLine('${path}', ${match.line})">
          <span class="search-result-line-num">${match.line}:</span> ${highlighted}
        </div>
      `;
    }).join('');
    
    return `
      <div class="search-results-group">
        <div class="search-results-file-header" onclick="window.openFileInEditor('${path}')">📁 ${path}</div>
        ${matchesHtml}
      </div>
    `;
  }).join('');
};

window.openFileAndScrollToLine = async (path, line) => {
  window.addTab(path);
  setTimeout(() => {
    window.scrollToEditorLine(line);
  }, 300);
};

window.scrollToEditorLine = (lineNumber) => {
  const textarea = document.getElementById('editor-textarea');
  if (!textarea) return;
  
  const lines = textarea.value.split('\n');
  if (lineNumber < 1 || lineNumber > lines.length) return;
  
  let charIndex = 0;
  for (let i = 0; i < lineNumber - 1; i++) {
    charIndex += lines[i].length + 1;
  }
  
  textarea.focus();
  textarea.selectionStart = charIndex;
  textarea.selectionEnd = charIndex + lines[lineNumber - 1].length;
  
  const lineHeight = 19.2;
  textarea.scrollTop = (lineNumber - 1) * lineHeight - (textarea.clientHeight / 2);
};

window.runGlobalReplace = async () => {
  const query = document.getElementById('global-search-input').value.trim();
  const replaceTerm = document.getElementById('global-replace-input').value;
  if (!query) return;
  
  if (!confirm(`Are you sure you want to replace all occurrences of "${query}" with "${replaceTerm}"?`)) return;
  
  const isCase = document.getElementById('search-opt-case').classList.contains('active');
  const isWord = document.getElementById('search-opt-word').classList.contains('active');
  const isRegex = document.getElementById('search-opt-regex').classList.contains('active');
  
  if (window.isUsingLocalFolder) {
    let count = 0;
    let regex;
    try {
      if (isRegex) {
        regex = new RegExp(query, 'g' + (isCase ? '' : 'i'));
      } else {
        let escaped = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        if (isWord) escaped = `\\b${escaped}\\b`;
        regex = new RegExp(escaped, 'g' + (isCase ? '' : 'i'));
      }
    } catch (e) {
      alert('Invalid regex query.');
      return;
    }
    
    for (const [path, handle] of Object.entries(window.localFileHandles)) {
      try {
        const file = await handle.getFile();
        const text = await file.text();
        if (regex.test(text)) {
          const newText = text.replace(regex, replaceTerm);
          const writable = await handle.createWritable();
          await writable.write(newText);
          await writable.close();
          count++;
          if (window.activeEditingFilePath === path) {
            const textarea = document.getElementById('editor-textarea');
            if (textarea) {
              textarea.value = newText;
              window.updateEditorLineNumbers();
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    alert(`Successfully replaced in ${count} files.`);
    window.runGlobalSearch();
  } else {
    try {
      const res = await fetch(`${API_BASE}/ide/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          replace: replaceTerm,
          case_sensitive: isCase,
          whole_word: isWord,
          regex: isRegex
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully replaced in ${data.modified_count} files.`);
        if (window.activeEditingFilePath) {
          window.openFileInEditor(window.activeEditingFilePath);
        }
        window.runGlobalSearch();
      } else {
        alert('Replacement failed: ' + data.error);
      }
    } catch (err) {
      alert('Connection lost to DevHunt server');
    }
  }
};

// Draft recovery & Auto-Save
setInterval(() => {
  if (window.activeEditingFilePath && !window.isUsingLocalFolder) {
    const textarea = document.getElementById('editor-textarea');
    if (textarea && !textarea.disabled) {
      const val = textarea.value;
      localStorage.setItem(`devhunt-draft-${window.activeEditingFilePath}`, val);
    }
  }
}, 4000);

window.recoverDraft = (path) => {
  const draft = localStorage.getItem(`devhunt-draft-${path}`);
  if (draft) {
    const textarea = document.getElementById('editor-textarea');
    if (textarea && confirm(`Recover unsaved draft changes for "${path}"?`)) {
      textarea.value = draft;
      window.updateEditorLineNumbers();
    }
  }
};

// Integrated Editor Bottom Terminal functions
let editorTerminalInitialized = false;

window.toggleEditorTerminal = () => {
  const term = document.getElementById('editor-bottom-terminal');
  if (!term) return;
  const isHidden = term.style.display === 'none';
  if (isHidden) {
    term.style.display = 'flex';
    window.initEditorTerminal();
    const input = document.getElementById('editor-terminal-input');
    if (input) {
      input.focus();
    }
  } else {
    term.style.display = 'none';
  }
};

window.initEditorTerminal = () => {
  const inputEl = document.getElementById('editor-terminal-input');
  const outputEl = document.getElementById('editor-terminal-output');
  const promptEl = document.getElementById('editor-terminal-prompt');
  const bodyEl = document.getElementById('editor-terminal-body');
  
  if (!inputEl || !outputEl) return;
  
  // Sync prompt initially
  window.updatePrompt(promptEl);
  
  if (editorTerminalInitialized) return;
  editorTerminalInitialized = true;
  
  if (bodyEl) {
    bodyEl.addEventListener('click', () => {
      inputEl.focus();
    });
  }
  
  inputEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const cmd = inputEl.value;
      if (!cmd.trim()) return;
      
      inputEl.value = "";
      
      // Append prompt and command to history
      const linePrompt = document.createElement('div');
      linePrompt.className = 'terminal-line';
      linePrompt.innerHTML = `<span class="terminal-prompt">${promptEl.textContent}</span> <span class="ansi-cyan">${mdEscape(cmd)}</span>`;
      outputEl.appendChild(linePrompt);
      
      terminalHistory.push(cmd);
      terminalHistoryIndex = terminalHistory.length;
      
      const trimmed = cmd.trim();
      if (trimmed.toLowerCase() === "clear" || trimmed.toLowerCase() === "hunt clear") {
        outputEl.innerHTML = "";
        scrollToBottom(bodyEl);
        return;
      }
      
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
            // Sync prompts in both terminals
            window.updatePrompt(promptEl);
            const mainPromptEl = document.getElementById('terminal-prompt');
            if (mainPromptEl) window.updatePrompt(mainPromptEl);
          }
        } else {
          lineResult.innerHTML = `<span class="ansi-red">Error: ${mdEscape(data.error)}</span>`;
          outputEl.appendChild(lineResult);
          playTerminalBeep();
        }
      } catch (err) {
        if (outputEl.contains(lineLoader)) {
          outputEl.removeChild(lineLoader);
        }
        const lineResult = document.createElement('div');
        lineResult.className = 'terminal-line ansi-red';
        lineResult.innerHTML = `Error: Connection lost to DevHunt core backend node.`;
        outputEl.appendChild(lineResult);
        playTerminalBeep();
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
        printHelpAutocomplete(outputEl, HUNT_COMMANDS);
        scrollToBottom(bodyEl);
        return;
      }
      const matches = HUNT_COMMANDS.filter(c => c.startsWith(val.toLowerCase()));
      if (matches.length === 1) {
        inputEl.value = matches[0] + " ";
      } else if (matches.length > 1) {
        printHelpAutocomplete(outputEl, matches);
        scrollToBottom(bodyEl);
      }
    }
  });
};

// Wire up events
document.addEventListener('DOMContentLoaded', () => {
  const openFolderBtn = document.getElementById('menu-open-local-folder');
  if (openFolderBtn) openFolderBtn.addEventListener('click', (e) => { e.preventDefault(); window.openLocalFolder(); });
  
  const openFileBtn = document.getElementById('menu-open-local-file');
  if (openFileBtn) openFileBtn.addEventListener('click', (e) => { e.preventDefault(); window.openLocalFile(); });
  
  const closeLocalBtn = document.getElementById('menu-close-local');
  if (closeLocalBtn) closeLocalBtn.addEventListener('click', (e) => { e.preventDefault(); window.closeLocalFolder(); });
  
  const formatDocBtn = document.getElementById('menu-format-doc');
  if (formatDocBtn) formatDocBtn.addEventListener('click', (e) => { e.preventDefault(); window.formatActiveDocument(); });
  
  const globalSearchBtn = document.getElementById('global-search-btn');
  if (globalSearchBtn) globalSearchBtn.addEventListener('click', window.runGlobalSearch);
  
  const globalReplaceBtn = document.getElementById('global-replace-btn');
  if (globalReplaceBtn) globalReplaceBtn.addEventListener('click', window.runGlobalReplace);
  
  const findNextBtn = document.getElementById('find-next');
  if (findNextBtn) findNextBtn.addEventListener('click', window.findNextMatch);
  
  const findPrevBtn = document.getElementById('find-prev');
  if (findPrevBtn) findPrevBtn.addEventListener('click', window.findPrevMatch);
  
  const findCloseBtn = document.getElementById('find-close');
  if (findCloseBtn) findCloseBtn.addEventListener('click', window.toggleFindWidget);
  
  const replaceBtn = document.getElementById('replace-btn');
  if (replaceBtn) replaceBtn.addEventListener('click', window.replaceCurrentMatch);
  
  const replaceAllBtn = document.getElementById('replace-all-btn');
  if (replaceAllBtn) replaceAllBtn.addEventListener('click', window.replaceAllMatches);
  
  const indentSelect = document.getElementById('status-bar-select-indent');
  if (indentSelect) {
    indentSelect.addEventListener('change', (e) => {
      window.editorIndentSize = e.target.value;
    });
  }
  
  ['search-opt-case', 'search-opt-word', 'search-opt-regex'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        window.runGlobalSearch();
      });
    }
  });
  
  const globalSearchInput = document.getElementById('global-search-input');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.runGlobalSearch();
      }
    });
  }
  
  const globalReplaceInput = document.getElementById('global-replace-input');
  if (globalReplaceInput) {
    globalReplaceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.runGlobalReplace();
      }
    });
  }
  
  const findInput = document.getElementById('find-input');
  if (findInput) {
    findInput.addEventListener('input', () => {
      window.runFindSearch();
    });
    findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          window.findPrevMatch();
        } else {
          window.findNextMatch();
        }
      } else if (e.key === 'Escape') {
        window.toggleFindWidget();
      }
    });
  }
  
  const replaceInput = document.getElementById('replace-input');
  if (replaceInput) {
    replaceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.replaceCurrentMatch();
      }
    });
  }
  
  const textarea = document.getElementById('editor-textarea');
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        window.toggleFindWidget();
      }
    });
  }
  
  const toggleTermBtn = document.getElementById('editor-toggle-terminal-btn');
  if (toggleTermBtn) toggleTermBtn.addEventListener('click', () => { window.toggleEditorTerminal(); });
  
  const closeTermBtn = document.getElementById('editor-terminal-close-btn');
  if (closeTermBtn) closeTermBtn.addEventListener('click', () => { window.toggleEditorTerminal(); });
  
  const clearTermBtn = document.getElementById('editor-terminal-clear-btn');
  if (clearTermBtn) clearTermBtn.addEventListener('click', () => {
    const out = document.getElementById('editor-terminal-output');
    if (out) out.innerHTML = "";
  });
});
