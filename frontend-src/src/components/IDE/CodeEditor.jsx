import React from 'react';
import CodeMirror, { oneDark } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/* ─── Custom light theme for DevHunt Light mode ─── */
const lightHighlight = HighlightStyle.define([
  { tag: t.comment,      color: '#64748b', fontStyle: 'italic' },
  { tag: t.variableName, color: '#0f172a' },
  { tag: t.string,       color: '#0f766e' },
  { tag: t.number,       color: '#b45309' },
  { tag: t.keyword,      color: '#4f46e5', fontWeight: 'bold' },
  { tag: t.operator,     color: '#0ea5e9' },
  { tag: t.className,    color: '#0d9488' },
  { tag: t.typeName,     color: '#0d9488' },
]);

const lightEditorTheme = EditorView.theme({
  '&': { backgroundColor: '#ffffff', color: '#0f172a', height: '100%' },
  '.cm-gutters': { backgroundColor: '#f8fafc', color: '#64748b', border: 'none', borderRight: '1px solid #e2e8f0' },
  '.cm-activeLineGutter': { backgroundColor: '#f1f5f9' },
  '.cm-activeLine': { backgroundColor: '#f1f5f9' },
  '.cm-selectionBackground': { backgroundColor: '#cbd5e1 !important' },
  '.cm-focused .cm-selectionBackground': { backgroundColor: '#cbd5e1 !important' },
  '.cm-cursor': { borderLeftColor: '#4f46e5' },
  '.cm-scroller': { fontFamily: 'var(--mono)', fontSize: '12px' },
}, { dark: false });

const lightTheme = [lightEditorTheme, syntaxHighlighting(lightHighlight)];

/* ─── Custom Devil/Neon dark theme ─── */
const darkHighlight = HighlightStyle.define([
  { tag: t.comment,      color: '#71717a', fontStyle: 'italic' },
  { tag: t.variableName, color: '#f4f4f5' },
  { tag: t.string,       color: '#34d399' },
  { tag: t.number,       color: '#fbbf24' },
  { tag: t.keyword,      color: '#f87171', fontWeight: 'bold' },
  { tag: t.operator,     color: '#38bdf8' },
  { tag: t.className,    color: '#38bdf8' },
  { tag: t.typeName,     color: '#38bdf8' },
]);

const darkDevilEditorTheme = EditorView.theme({
  '&': { backgroundColor: 'var(--bg-editor)', color: '#f4f4f5', height: '100%' },
  '.cm-gutters': { backgroundColor: 'rgba(0,0,0,0.15)', color: '#a1a1aa', border: 'none', borderRight: '1px solid rgba(244,244,245,0.1)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.03)' },
  '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(255,255,255,0.1) !important' },
  '.cm-cursor': { borderLeftColor: '#f4f4f5' },
  '.cm-scroller': { fontFamily: 'var(--mono)', fontSize: '12px' },
}, { dark: true });

const darkDevilTheme = [darkDevilEditorTheme, syntaxHighlighting(darkHighlight)];

/* ─── Slate / Neon base style for oneDark ─── */
const slateBase = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': { fontFamily: 'var(--mono)', fontSize: '12px' },
});

/* ─── Language detector ─── */
function getExtensions(filepath) {
  if (!filepath) return [];
  const ext = filepath.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js': case 'jsx': case 'ts': case 'tsx': case 'json':
      return [javascript({ jsx: true })];
    case 'py':   return [python()];
    case 'html': return [html()];
    case 'md': case 'markdown': return [markdown()];
    default:     return [];
  }
}

/* ─── Theme resolver ─── */
function getTheme(theme) {
  if (theme === 'light') return lightTheme;
  if (theme === 'devil') return darkDevilTheme;
  // slate & neon → oneDark + base sizing
  return [oneDark, slateBase];
}

/* ═══════════════════════════════════════════
   CODE EDITOR COMPONENT
═══════════════════════════════════════════ */
export default function CodeEditor({ fileContent, activeFile, onChange, theme, readOnly, wordWrap }) {
  const extensions = [...getExtensions(activeFile), EditorView.contentAttributes.of({ spellcheck: "true" })];
  if (wordWrap) {
    extensions.push(EditorView.lineWrapping);
  }

  return (
    <CodeMirror
      value={fileContent}
      height="100%"
      theme={getTheme(theme)}
      extensions={extensions}
      onChange={onChange}
      readOnly={readOnly}
      placeholder="// Select a file from the Explorer Sidebar or click File → New File to begin…"
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        history: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        syntaxHighlighting: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: false,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        defaultKeymap: true,
        searchKeymap: true,
        historyKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: false,
      }}
      style={{
        height: '100%',
        width: '100%',
        fontSize: '12px',
        fontFamily: 'var(--mono)',
        textAlign: 'left',
      }}
    />
  );
}
