import React from 'react';
import { 
  File, FileCode, FileJson, FileText, FileImage, 
  Folder, FolderOpen, Terminal, Settings 
} from 'lucide-react';
import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';

// CDN for vscode-icons SVGs
const VSCODE_ICONS_CDN = 'https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@latest/icons/';

export function getFileIcon(filename, themeSetting = 'emoji') {
  if (!filename) return themeSetting === 'emoji' ? '📄' : <File size={14} />;

  // 1. VS Code Material Icons Theme
  if (themeSetting === 'vscode') {
    const iconName = getIconForFile(filename);
    const url = `${VSCODE_ICONS_CDN}${iconName}`;
    return (
      <img 
        src={url} 
        alt="" 
        onError={(e) => {
          // Fallback if image fails to load
          e.target.style.display = 'none';
        }}
        style={{ width: '15px', height: '15px', objectFit: 'contain', flexShrink: 0 }} 
      />
    );
  }

  // 2. Minimalist Outlines Theme
  if (themeSetting === 'minimal') {
    const ext = filename.split('.').pop().toLowerCase();
    const props = { size: 14, style: { flexShrink: 0 } };
    
    switch (ext) {
      case 'py':
        return <FileCode color="#3b82f6" {...props} />;
      case 'js':
      case 'jsx':
        return <FileCode color="#eab308" {...props} />;
      case 'ts':
      case 'tsx':
        return <FileCode color="#3b82f6" {...props} />;
      case 'html':
        return <FileCode color="#f97316" {...props} />;
      case 'css':
        return <FileCode color="#ec4899" {...props} />;
      case 'json':
        return <FileJson color="#22c55e" {...props} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage color="#a855f7" {...props} />;
      case 'md':
      case 'markdown':
      case 'txt':
        return <FileText color="#94a3b8" {...props} />;
      default:
        return <File color="#94a3b8" {...props} />;
    }
  }

  // 3. Cyberpunk Emojis Theme (Default)
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'py': return '🐍';
    case 'js':
    case 'jsx': return '🟨';
    case 'ts':
    case 'tsx': return '🟦';
    case 'html': return '🌐';
    case 'css': return '🎨';
    case 'json': return '⚙️';
    case 'rs': return '🦀';
    case 'bat':
    case 'sh': return '🐚';
    default: return '📄';
  }
}

export function getFolderIcon(folderName, isExpanded, themeSetting = 'emoji') {
  // 1. VS Code Material Icons Theme
  if (themeSetting === 'vscode') {
    const iconName = isExpanded 
      ? getIconForOpenFolder(folderName) 
      : getIconForFolder(folderName);
    const url = `${VSCODE_ICONS_CDN}${iconName}`;
    return (
      <img 
        src={url} 
        alt="" 
        onError={(e) => {
          e.target.style.display = 'none';
        }}
        style={{ width: '15px', height: '15px', objectFit: 'contain', flexShrink: 0 }} 
      />
    );
  }

  // 2. Minimalist Outlines Theme
  if (themeSetting === 'minimal') {
    const props = { size: 14, color: 'var(--accent)', style: { flexShrink: 0 } };
    return isExpanded ? <FolderOpen {...props} /> : <Folder {...props} />;
  }

  // 3. Cyberpunk Emojis Theme (Default)
  return isExpanded ? '📂' : '📁';
}
