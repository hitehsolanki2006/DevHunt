const API_BASE = '/api';

/* ========== Sidebar navigation ========== */
(() => {
  const c = document.getElementById('dragon-bg');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, nodes = [];
  function resize(){
    W = c.width = window.innerWidth * devicePixelRatio;
    H = c.height = window.innerHeight * devicePixelRatio;
  }
  resize(); window.addEventListener('resize', resize);

  const N = 80;
  for (let i=0;i<N;i++) nodes.push({
    x: Math.random()*W, y: Math.random()*H,
    vx: (Math.random()-.5)*.3, vy: (Math.random()-.5)*.3,
    r: Math.random()*1.6+.4
  });

  // Dragon silhouette path points (stylized)
  const dragon = [
    [.15,.7],[.22,.55],[.30,.58],[.36,.45],[.45,.40],[.52,.30],
    [.60,.25],[.68,.30],[.74,.42],[.80,.40],[.86,.50],[.82,.62],
    [.74,.66],[.66,.60],[.58,.66],[.50,.62],[.42,.70],[.34,.68],
    [.26,.76],[.18,.78]
  ];

  let t = 0;
  function loop(){
    t += .005;
    ctx.clearRect(0,0,W,H);

    // dragon glow
    ctx.save();
    ctx.translate(W*0.05, H*0.05);
    ctx.scale(0.9, 0.9);
    ctx.beginPath();
    dragon.forEach((p,i)=>{
      const x = p[0]*W + Math.sin(t+i*.3)*4*devicePixelRatio;
      const y = p[1]*H + Math.cos(t+i*.4)*4*devicePixelRatio;
      i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,255,163,0.35)';
    ctx.lineWidth = 1.2*devicePixelRatio;
    ctx.shadowColor = '#00ffa3';
    ctx.shadowBlur = 25*devicePixelRatio;
    ctx.stroke();
    ctx.restore();

    // nodes + connections
    for (const n of nodes){
      n.x += n.vx*devicePixelRatio; n.y += n.vy*devicePixelRatio;
      if (n.x<0||n.x>W) n.vx*=-1;
      if (n.y<0||n.y>H) n.vy*=-1;
      ctx.beginPath();
      ctx.arc(n.x,n.y,n.r*devicePixelRatio,0,Math.PI*2);
      ctx.fillStyle='rgba(0,212,255,0.7)';
      ctx.shadowColor='#00d4ff';ctx.shadowBlur=8*devicePixelRatio;
      ctx.fill();
    }
    ctx.shadowBlur=0;
    for (let i=0;i<nodes.length;i++){
      for (let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j];
        const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
        if (d<140*devicePixelRatio){
          ctx.strokeStyle=`rgba(0,255,163,${.15*(1-d/(140*devicePixelRatio))})`;
          ctx.lineWidth=.5*devicePixelRatio;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
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
  if (panelId === 'history') loadHistoryPanel();
  if (panelId === 'terminal') initTerminal();
  if (panelId === 'stats') {
    loadProfileAndSettings();
    loadAnalytics();
  }
  if (panelId === 'settings') {
    loadKeys();
    checkUpdates();
    loadAIMemory();
  }
  if (panelId === 'notifications') {
    loadNotifications(true);
  }
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    switchPanel(item.dataset.panel);
  });
});

const toggleSidebarBtn = document.getElementById('toggle-sidebar');
if (toggleSidebarBtn) {
  toggleSidebarBtn.addEventListener('click', () => {
    document.body.classList.toggle('collapsed');
  });
}

/* ========== Mini Markdown renderer ========== */
function md(src){
  if (!src) return '';
  let s = src
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // code fences
  s = s.replace(/```(\w+)?\n([\s\S]*?)```/g, (_,lang,code)=>
    `<pre><code class="lang-${lang||''}">${code.trim()}</code></pre>`);
  // headings
  s = s.replace(/^### (.*)$/gm,'<h3>$1</h3>')
       .replace(/^## (.*)$/gm,'<h2>$1</h2>')
       .replace(/^# (.*)$/gm,'<h1>$1</h1>');
  // inline code
  s = s.replace(/`([^`]+)`/g,'<code>$1</code>');
  // bold + italic
  s = s.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>');
  // bullets
  s = s.replace(/(^|\n)([-*] .+(?:\n[-*] .+)*)/g, (_,pre,block)=>{
    const items = block.split('\n').map(l=>`<li>${l.replace(/^[-*] /,'')}</li>`).join('');
    return pre+`<ul>${items}</ul>`;
  });
  // paragraphs
  s = s.split(/\n{2,}/).map(p => /^<(h\d|ul|pre|blockquote)/.test(p)?p:`<p>${p.replace(/\n/g,'<br/>')}</p>`).join('');
  return s;
}

/* ========== AI Mentor chat ========== */
const feed = document.getElementById('chat-feed');
const inputEl = document.getElementById('chat-input');
const sendBtn = document.getElementById('chat-send');

function addMsg(role, text, meta){
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

async function sendChatMessage(){
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
        .map(([k,v]) => `${k}: ${v}`)
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
  const feed       = document.getElementById('history-feed');
  const statsEl    = document.getElementById('history-stats');
  if (!feed) return;

  const sessionId = sessionSel ? sessionSel.value : 'default_session';
  feed.innerHTML = '<div class="muted">// loading history...</div>';

  try {
    const res  = await fetch(`${API_BASE}/chat/history?session_id=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!data.success) { feed.innerHTML = '<div class="muted">// failed to load</div>'; return; }

    const msgs = data.history;

    // Stats bar
    const userMsgs = msgs.filter(m => m.role === 'user');
    const aiMsgs   = msgs.filter(m => m.role === 'assistant');
    const models   = [...new Set(aiMsgs.map(m => m.model_used).filter(Boolean))];
    if (statsEl) {
      statsEl.innerHTML = `
        <span>Messages: <b>${msgs.length}</b></span>
        <span>User: <b>${userMsgs.length}</b></span>
        <span>AI: <b>${aiMsgs.length}</b></span>
        <span>Models: <b>${models.join(', ') || 'N/A'}</b></span>
        ${msgs.length ? `<span>First: <b>${msgs[0].timestamp?.slice(0,16)}</b></span>` : ''}
        ${msgs.length ? `<span>Last: <b>${msgs[msgs.length-1].timestamp?.slice(0,16)}</b></span>` : ''}
      `;
    }

    if (!msgs.length) {
      feed.innerHTML = '<div class="muted" style="text-align:center;padding:40px">// no messages in this session</div>';
      return;
    }

    feed.innerHTML = msgs.map(msg => {
      const isUser = msg.role === 'user';
      const ts     = msg.timestamp?.slice(0, 16) || '';
      const model  = msg.model_used || '';
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
  const sessionId  = sessionSel ? sessionSel.value : 'default_session';
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
  return src.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
      } catch (e) {}
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

