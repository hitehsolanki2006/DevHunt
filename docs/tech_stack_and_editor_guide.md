# 🧬 DevHunt: Final Tech Stack & Editor Integration Guide

This guide details the final architecture, explains communication protocols (REST vs. SSE), reviews issues in your current text editor, and compares integrating **Monaco Editor** against lightweight alternatives.

---

## 🛰️ Part 1: The Final Tech Stack & REST Analysis

### 1. Are we using REST?
**Yes, heavily.** The communication between the frontend and the Python backend relies on a mix of two protocols:
1.  **REST API (HTTP `GET`, `POST`, `PUT`, `DELETE`)**: Used for 90% of the application. It handles user settings, importing files, deleting knowledge bases, database storage, and retrieving analytics. All data is passed as standard JSON.
2.  **SSE (Server-Sent Events)**: Used specifically for the AI Chat interface (`/api/chat/stream`). This allows the local Python backend to stream response tokens (words) to the React frontend in real-time, rather than making the user wait for the whole answer to compile.

### 2. Complete Proposed Tech Stack

| Layer | Component | Technology Used | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React** | Node.js component-based SPA framework. | Breaks down the massive index page into maintainable files. |
| **Frontend Tooling** | **Vite** | Ultra-fast JS bundler and dev server. | Directs code reloading and packages static assets for Tauri. |
| **Styling** | **Vanilla CSS** | Core layout stylesheets. | Provides theme styling (Slate, Neon, Light) without Tailwind overhead. |
| **Backend Framework** | **Python (Flask)** | Local REST & SSE web server. | Manages the Gemini client API, SQLite records, and CLI tools. |
| **Database** | **SQLite** | Embedded database engine (`devhunt.db`). | Stores local facts, conversation histories, and Kanban todos. |
| **Desktop Wrapper** | **Tauri (Rust)** | Core OS hook framework. | Creates the native window and controls background Python sidecar processes. |
| **OS WebView** | **WebView2** | Windows Edge rendering engine. | Displays the compiled HTML assets natively without bundling Chrome. |
| **Python Packager** | **PyInstaller** | Python executable compiler. | Packages the Flask server and dependencies into a single `.exe` file. |

---

## 📝 Part 2: Issues in Your Current Code Editor

Your current code editor in `frontend/app.js` is a plain HTML `<textarea>` element (`#editor-textarea`). It suffers from several issues:

1.  **No Syntax Highlighting**: Code is displayed as simple monochromatic text. It makes reading Python, Javascript, CSS, and Markdown extremely difficult.
2.  **Unreliable Line Numbers**: Line numbering is done via a separate `div` that listens to the `scroll` event of the textarea. This scroll-synchronization often lags, leading to misaligned line numbers when scrolling fast.
3.  **Basic Tab Handling**: Tabs are handled by intercepting key inputs and inserting spaces programmatically. It lacks smart indentations (like auto-indenting on newline after a colon `:` in Python).
4.  **No Code Assistance**: There is no bracket-matching, auto-closing braces/quotes, code folding, or auto-complete/IntelliSense.

---

## 💻 Part 3: Integrating Monaco Editor (VS Code Engine)

Integrating Microsoft's [Monaco Editor](https://github.com/microsoft/monaco-editor.git) into the proposed React + Vite app is highly feasible but introduces distinct trade-offs.

### 1. How the Code Changes
Instead of manipulating textarea values directly, you would use a wrapper like `@monaco-editor/react`.

#### Before (Vanilla Javascript `<textarea>`):
```javascript
// Load
document.getElementById('editor-textarea').value = fileContent;
// Read
const savedContent = document.getElementById('editor-textarea').value;
```

#### After (React Component with Monaco):
```jsx
import Editor from '@monaco-editor/react';

fn CodeEditor({ fileContent, activeFile, onChange }) {
  // Get language from extension (e.g. app.py -> "python")
  const getLanguage = (filepath) => filepath.split('.').pop() || 'plaintext';

  return (
    <Editor
      height="100vh"
      theme="vs-dark"
      language={getLanguage(activeFile)}
      value={fileContent}
      onChange={onChange}
      options={{
        fontSize: 14,
        minimap: { enabled: true },
        automaticLayout: true,
      }}
    />
  );
}
```

### 2. Issues & Challenges Created by Monaco
*   **🔴 High Memory/Resource Footprint**: Monaco is heavy. It runs parsing and language servers directly inside your frontend browser processes. This can add **50MB to 100MB+ of RAM usage** to your application, violating your goal of "lowest possible resources".
*   **🔴 Large Bundle Size**: Monaco is massive (~5MB - 8MB code bundle). This significantly increases the binary size of your application.
*   **🔴 Worker Configuration Complexity**: Monaco relies on Web Workers to perform syntax diagnostics and auto-complete in background threads. Setting this up under local `file://` or Tauri environments requires complex Vite worker configs to avoid load blocks.

---

## ⚡ Part 4: Recommended Lightweight Alternative: CodeMirror 6

For a low-resource desktop application, **CodeMirror 6** is the industry standard alternative to Monaco.

### Comparison: CodeMirror 6 vs. Monaco Editor

| Metric | CodeMirror 6 (Recommended) | Monaco Editor (VS Code Engine) |
| :--- | :--- | :--- |
| **Size on Disk** | ⚡ **~200KB - 500KB** | 🔴 **~5MB - 10MB** |
| **Memory Footprint** | ⚡ **Very Low (~5MB - 15MB RAM)** | 🔴 **High (~50MB - 100MB RAM)** |
| **Startup Speed** | ⚡ **Instant** | ⚠️ **Slight lag on low-end machines** |
| **Syntax Highlighting** | Excellent (via Lezer parsers) | Superior (runs full languages checks) |
| **Integration Ease** | Simple React wrappers available | Complex Web Worker dependencies |

### React CodeMirror 6 Recipe
Using `@uiw/react-codemirror`, integrating a fully highlighted, modern editor is simple and lightweight:

```jsx
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@uiw/theme-one-dark';

fn CodeEditor({ fileContent, activeFile, onChange }) {
  const getExtensions = (filepath) => {
    const ext = filepath.split('.').pop();
    if (ext === 'js' || ext === 'jsx') return [javascript({ jsx: true })];
    if (ext === 'py') return [python()];
    return [];
  };

  return (
    <CodeMirror
      value={fileContent}
      height="100%"
      extensions={getExtensions(activeFile)}
      theme={oneDark}
      onChange={onChange}
    />
  );
}
```

This alternative provides **line numbering, bracket matching, autocomplete, code folding, themes, and syntax highlighting**, while keeping your app extremely light and fast.
