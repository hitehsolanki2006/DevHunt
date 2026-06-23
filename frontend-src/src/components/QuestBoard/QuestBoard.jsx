import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';

export default function QuestBoard() {
  const [todos, setTodos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTags, setNewTags] = useState('');

  useEffect(() => {
    loadTodos();
    window.addEventListener('devhunt-refresh-quests', loadTodos);
    return () => {
      window.removeEventListener('devhunt-refresh-quests', loadTodos);
    };
  }, []);

  const loadTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      if (data.success) {
        setTodos(data.todos || []);
      }
    } catch (err) {
      console.error('Failed to load todos', err);
    }
  };

  const handleCreateTodo = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          priority: newPriority,
          due_date: newDueDate || null,
          tags: newTags ? newTags.split(',').map(t => t.trim()).filter(Boolean) : []
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setNewTitle('');
        setNewDesc('');
        setNewPriority('medium');
        setNewDueDate('');
        setNewTags('');
        loadTodos();
      }
    } catch (err) {
      console.error('Create todo failed', err);
    }
  };

  const handleMoveTodo = async (id, currentStatus) => {
    let nextStatus = 'pending';
    if (currentStatus === 'pending') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress') nextStatus = 'done';
    else if (currentStatus === 'done') nextStatus = 'pending';

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        loadTodos();
      }
    } catch (err) {
      console.error('Move todo failed', err);
    }
  };

  const handleCompleteTodo = async (id) => {
    try {
      const res = await fetch(`/api/todos/${id}/complete`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        loadTodos();
      }
    } catch (err) {
      console.error('Complete todo failed', err);
    }
  };

  const handleDeleteTodo = async (id) => {
    if (!confirm('Are you sure you want to delete this quest?')) return;
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        loadTodos();
      }
    } catch (err) {
      console.error('Delete todo failed', err);
    }
  };

  const renderColumn = (status, title, accentColor) => {
    const list = todos.filter(t => t.status === status);
    
    return (
      <div 
        key={status}
        className="kanban-col card" 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '280px', height: '100%', borderTop: `4px solid ${accentColor}`, background: 'var(--panel)', padding: '12px' }}
      >
        <div className="card-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ textTransform: 'uppercase', color: 'var(--text)' }}>
            {title} <span className="muted" style={{ fontSize: '10px', marginLeft: '4px' }}>({list.length})</span>
          </h3>
        </div>
        
        <div 
          className="kanban-cards-wrapper" 
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {list.map(t => (
            <div 
              key={t.id}
              className="card todo-card" 
              onClick={() => handleMoveTodo(t.id, t.status)}
              style={{
                background: 'var(--bg-2)', 
                border: '1px solid var(--border)', 
                borderRadius: '6px', 
                padding: '10px',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <span className={`tag tag-${t.priority.toLowerCase()}`}>{t.priority}</span>
                {t.tags && t.tags.length > 0 && t.tags.map((tag, idx) => (
                  <span key={idx} className="tag tag-med" style={{ filter: 'grayscale(0.5)' }}>{tag}</span>
                ))}
              </div>
              <h4 style={{ fontSize: '12.5px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '4px' }}>{t.title}</h4>
              {t.description && <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 6px 0', lineHeight: '1.4' }}>{t.description}</p>}
              {t.due_date && <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>📅 Due: {t.due_date}</div>}
              
              <div 
                className="card-actions" 
                style={{ display: 'flex', gap: '6px', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '6px', justifyContent: 'flex-end' }}
                onClick={(e) => e.stopPropagation()}
              >
                {t.status !== 'done' ? (
                  <button 
                    onClick={() => handleCompleteTodo(t.id)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: '2px' }}
                    title="Complete Quest"
                  >
                    <CheckCircle2 size={14} />
                  </button>
                ) : (
                  <button 
                    onClick={() => handleMoveTodo(t.id, 'done')} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px' }}
                    title="Re-open Quest"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                <button 
                  onClick={() => handleDeleteTodo(t.id)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '2px' }}
                  title="Delete Quest"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>No active quests</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Quest Board</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + New Quest
        </button>
      </div>

      <div 
        className="kanban-wrapper" 
        style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 180px)', overflowX: 'auto', paddingBottom: '10px', marginTop: '10px' }}
      >
        {renderColumn('pending', 'Todo', 'var(--cyan)')}
        {renderColumn('in_progress', 'In Progress', 'var(--amber)')}
        {renderColumn('done', 'Completed', 'var(--green)')}
      </div>

      {/* CREATE QUEST MODAL DIALOG */}
      {showModal && (
        <div 
          className="modal-overlay" 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowModal(false)}
        >
          <div 
            className="card" 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '400px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', textAlign: 'left' }}
          >
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '14px' }}>
              <h2>Embark on a New Quest</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '16px' }}>✕</button>
            </div>
            
            <form onSubmit={handleCreateTodo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>QUEST TITLE *</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  placeholder="Task title..." 
                  required 
                  autoFocus
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>DESCRIPTION (OPTIONAL)</label>
                <textarea 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)} 
                  placeholder="Short quest description..." 
                  rows="3"
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>PRIORITY</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>DUE DATE</label>
                  <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>TAGS (COMMA SEPARATED)</label>
                <input 
                  type="text" 
                  value={newTags} 
                  onChange={(e) => setNewTags(e.target.value)} 
                  placeholder="git, backend, bug" 
                />
              </div>
              
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                ADD QUEST TO BOARD
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
