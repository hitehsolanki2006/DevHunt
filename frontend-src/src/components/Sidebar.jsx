import React, { useState, useEffect } from 'react';
import { 
  Terminal, Folder, FileText, BarChart3, Settings, 
  MessageSquare, Map, CheckSquare, Shield, Bell, Share2,
  FilePlus, ChevronLeft, Music, Gamepad2, FolderOpen, ShieldAlert
} from 'lucide-react';
import { getFileIcon, getFolderIcon } from '../utils/iconTheme.jsx';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isSidebarMinimized, 
  setIsSidebarMinimized,
  fileTree,
  refreshFileTree,
  activeFilePath,
  openFileInEditor,
  outlineSymbols,
  scrollToLine,
  unreadNotifications,
  expandedDirs,
  setExpandedDirs,
  showNewFileInput,
  setShowNewFileInput,
  onOpenLocalFolder,
  featureToggles,
  iconTheme
}) {
  const [newFileName, setNewFileName] = useState('');
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(true);

  const allNavItems = [
    { id: 'editor', label: 'Code Editor', icon: Folder },
    { id: 'search', label: 'Search & Replace', icon: FileText },
    { id: 'mentor', label: 'AI Assistant', icon: MessageSquare },
    { id: 'path', label: 'Hunt Path', icon: Map },
    { id: 'quests', label: 'Quest Board', icon: CheckSquare },
    { id: 'vault', label: 'Intel Vault', icon: Shield },
    { id: 'stats', label: 'Terminal Stats', icon: BarChart3 },
    { id: 'music', label: 'Music Player', icon: Music },
    { id: 'arcade', label: 'Game Arcade', icon: Gamepad2 },
    { id: 'terminal', label: 'Hunt Terminal', icon: Terminal },
    { id: 'notifications', label: 'System Messages', icon: Bell, badge: unreadNotifications },
    { id: 'doc-analysis', label: 'Doc Forensics', icon: ShieldAlert },
    { id: 'linkedin', label: 'LinkedIn Drafts', icon: Share2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const toggles = featureToggles || {};
  const navItems = allNavItems.filter(item => {
    if (item.id === 'path') return toggles.path !== false;
    if (item.id === 'quests') return toggles.quests !== false;
    if (item.id === 'vault') return toggles.vault !== false;
    if (item.id === 'music') return toggles.music !== false;
    if (item.id === 'arcade') return toggles.arcade !== false;
    if (item.id === 'doc-analysis') return toggles['doc-analysis'] !== false;
    if (item.id === 'linkedin') return toggles.linkedin !== false;
    if (item.id === 'search') return toggles.search !== false;
    if (item.id === 'stats') return toggles.stats !== false;
    if (item.id === 'terminal') return toggles.terminal !== false;
    if (item.id === 'notifications') return toggles.notifications !== false;
    return true;
  });


  const handleToggleDirectory = (path, e) => {
    e.stopPropagation();
    const currentExpanded = (expandedDirs instanceof Set) ? expandedDirs : new Set();
    const newExpanded = new Set(currentExpanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const handleCreateFile = async (e) => {
    if (e.key === 'Enter') {
      const trimmedName = newFileName.trim();
      if (trimmedName) {
        setShowNewFileInput(false);
        setNewFileName('');
        try {
          const res = await fetch('/api/ide/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: trimmedName, content: '' })
          });
          const data = await res.json();
          if (data.success) {
            refreshFileTree();
            openFileInEditor(trimmedName);
          }
        } catch (err) {
          console.error('Failed to create file', err);
        }
      } else {
        setShowNewFileInput(false);
      }
    } else if (e.key === 'Escape') {
      setShowNewFileInput(false);
      setNewFileName('');
    }
  };

  const renderFileTreeNode = (node) => {
    if (node.isDir) {
      const isExpanded = (expandedDirs instanceof Set) ? expandedDirs.has(node.path) : false;
      return (
        <div key={node.path} className="file-tree-item-wrapper" style={{ textAlign: 'left' }}>
          <div 
            className="file-tree-node directory" 
            onClick={(e) => handleToggleDirectory(node.path, e)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '2px 4px' }}
          >
            <span className="folder-arrow">{isExpanded ? '▼' : '▶'}</span>
            <span className="folder-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {getFolderIcon(node.name, isExpanded, iconTheme)}
            </span>
            <span className="node-name">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div className="file-tree-children" style={{ paddingLeft: '14px', borderLeft: '1px dotted var(--border)', marginLeft: '6px' }}>
              {node.children.map(renderFileTreeNode)}
            </div>
          )}
        </div>
      );
    } else {
      const isActive = activeFilePath === node.path;
      return (
        <div 
          key={node.path} 
          className={`file-tree-node file ${isActive ? 'active' : ''}`}
          onClick={() => openFileInEditor(node.path)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('devhunt/filepath', node.path);
            e.dataTransfer.setData('text/plain', node.path);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          title={`Drag to terminal to insert path\nDouble-click to open in editor`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'grab', padding: '2px 4px' }}
        >
          <span className="file-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
            {getFileIcon(node.name, iconTheme)}
          </span>
          <span className="node-name">{node.name}</span>
        </div>
      );
    }
  };

  const showFileExplorer = activeTab === 'editor' || activeTab === 'search';

  return (
    <>
      {/* 1. SLIM ACTIVITY BAR (Far Left) */}
      <aside className="activity-bar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div 
              key={item.id} 
              className={`activity-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
            >
              <Icon size={18} />
              {item.badge > 0 && (
                <span className="activity-badge">{item.badge}</span>
              )}
            </div>
          );
        })}
      </aside>

      {/* 2. EXPLORER SIDEBAR */}
      <aside className={`explorer-sidebar ${(!showFileExplorer || isSidebarMinimized) ? 'collapsed' : ''}`}>
        <div className="explorer-header">
          <span id="explorer-title">EXPLORER: DEVHUNT</span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button 
              className="explorer-action-btn" 
              onClick={() => setShowNewFileInput(true)}
              title="New File"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
            >
              <FilePlus size={14} />
            </button>
            <button 
              className="explorer-action-btn" 
              onClick={onOpenLocalFolder}
              title="Open Folder"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
            >
              <FolderOpen size={14} />
            </button>
            <button 
              className="explorer-action-btn" 
              onClick={() => setIsSidebarMinimized(true)}
              title="Collapse Explorer"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        <div className="explorer-content">
          <div className="file-tree" style={{ padding: '4px 10px' }}>
            {showNewFileInput && (
              <div className="file-tree-node file temp-input-node" style={{ paddingLeft: '10px', display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                <span className="file-icon">📄</span>
                <input 
                  id="inline-new-file-input" 
                  type="text" 
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={handleCreateFile}
                  onBlur={() => setTimeout(() => setShowNewFileInput(false), 200)}
                  placeholder="filename.txt" 
                  autoFocus
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border-hot)',
                    color: 'var(--text)',
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    width: 'calc(100% - 30px)',
                    outline: 'none',
                  }} 
                />
              </div>
            )}
            
            {fileTree && fileTree.length > 0 ? (
              fileTree.map(renderFileTreeNode)
            ) : (
              <div className="muted">// scanning workspace...</div>
            )}
          </div>
        </div>

        {/* Outline scanner section if active file has symbols */}
        {activeFilePath && (
          <div className="sidebar-outline-section" style={{ display: 'block', borderTop: '1px solid var(--border)' }}>
            <div 
              className="outline-header" 
              onClick={() => setIsOutlineExpanded(!isOutlineExpanded)}
              style={{ cursor: 'pointer', display: 'flex', justifyContext: 'space-between', padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--muted)', userSelect: 'none' }}
            >
              <span>Outline / Symbols</span>
              <span className="muted" style={{ fontSize: '8px', marginLeft: 'auto' }}>
                {isOutlineExpanded ? 'Collapse' : 'Expand'}
              </span>
            </div>
            {isOutlineExpanded && (
              <div className="outline-content-tree" style={{ maxHeight: '180px', overflowY: 'auto', padding: '4px 10px', fontSize: '11.5px', fontFamily: 'var(--mono)', textAlign: 'left' }}>
                {outlineSymbols && outlineSymbols.length > 0 ? (
                  outlineSymbols.map((sym, i) => {
                    const icon = sym.type === 'class' ? '🧩' : (sym.type === 'heading' ? '🔖' : '⚡');
                    const paddingLeft = sym.type === 'heading' ? (sym.level - 1) * 8 : 0;
                    return (
                      <div 
                        key={i} 
                        className="outline-item" 
                        onClick={() => scrollToLine(sym.line)}
                        style={{ paddingLeft: `${paddingLeft}px`, cursor: 'pointer', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span className="outline-icon">{icon}</span>
                        <span>{sym.name}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="muted" style={{ fontStyle: 'italic', fontSize: '10px' }}>No symbols scanned</div>
                )}
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
