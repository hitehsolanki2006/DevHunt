export function mdEscape(src) {
  if (!src) return '';
  return String(src)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHtml(html) {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const allowedTags = new Set(['SPAN', 'B', 'STRONG', 'I', 'EM', 'BR', 'CODE', 'PRE', 'MARK']);
    const allowedAttrs = new Set(['class']);

    const cleanNode = (node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.TEXT_NODE) {
          continue;
        }
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (!allowedTags.has(child.tagName)) {
            const text = document.createTextNode(child.textContent || '');
            node.replaceChild(text, child);
          } else {
            for (const attr of Array.from(child.attributes)) {
              if (!allowedAttrs.has(attr.name.toLowerCase())) {
                child.removeAttribute(attr.name);
              }
            }
            cleanNode(child);
          }
        } else {
          node.removeChild(child);
        }
      }
    };

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch {
    return mdEscape(html);
  }
}
