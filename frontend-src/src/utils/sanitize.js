const ALLOWED_TAGS = new Set(['SPAN', 'B', 'STRONG', 'I', 'EM', 'BR', 'CODE', 'PRE', 'MARK']);
const ALLOWED_ATTRS = new Set(['class']);

export function mdEscape(src) {
  if (!src) return '';
  return String(src)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function filterAttributes(element) {
  for (const attr of Array.from(element.attributes)) {
    if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) {
      element.removeAttribute(attr.name);
    }
  }
}

function processChildNode(child) {
  if (child.nodeType === Node.TEXT_NODE) {
    return;
  }
  if (child.nodeType !== Node.ELEMENT_NODE) {
    child.remove();
    return;
  }
  if (!ALLOWED_TAGS.has(child.tagName)) {
    child.replaceWith(document.createTextNode(child.textContent || ''));
    return;
  }
  filterAttributes(child);
  cleanNode(child);
}

function cleanNode(node) {
  for (const child of Array.from(node.childNodes)) {
    processChildNode(child);
  }
}

export function sanitizeHtml(html) {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch {
    return mdEscape(html);
  }
}

