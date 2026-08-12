'use client';

/**
 * Turn the HTML Microsoft Word (and Google Docs) put on the clipboard into
 * clean HTML that keeps the way the text LOOKED.
 *
 * The editor used to run pasted content straight through TipTap's default
 * parser, which understands <strong>/<em>/<ul> and throws away everything else.
 * Word does almost none of its formatting with those tags — it uses inline
 * styles on <span>, fake bullet paragraphs, and about forty `mso-` properties of
 * private bookkeeping. So a carefully formatted answer arrived as a wall of
 * undifferentiated text.
 *
 * The job here is subtractive, not destructive: throw out Word's private
 * bookkeeping, keep the handful of CSS properties that carry actual appearance,
 * and rebuild the two structures Word fakes (lists and style-driven bold) as
 * real HTML the editor can hold onto.
 */

// CSS properties worth keeping. Anything not on this list is Word's internal
// state (mso-*), layout noise that fights our own stylesheet (margins, widths,
// line-height copied from an A4 page), or a security risk.
const KEEP_STYLE = new Set([
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-decoration-line',
  'text-align',
  'vertical-align',
]);

// Word measures in points; the web thinks in pixels. Without this, a 12pt body
// paragraph renders as 12px — noticeably smaller than the surrounding text.
const ptToPx = (value) =>
  value.replace(/([\d.]+)\s*pt\b/gi, (_, n) => `${Math.round(parseFloat(n) * (96 / 72) * 10) / 10}px`);

/** Parse a style attribute into a Map, dropping everything not worth keeping. */
function filterStyle(raw) {
  const kept = new Map();
  for (const decl of String(raw || '').split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    let value = decl.slice(idx + 1).trim();
    if (!prop || !value) continue;
    if (!KEEP_STYLE.has(prop)) continue;
    // `mso-` values sneak into otherwise-legitimate properties.
    if (/mso-|expression\(|javascript:/i.test(value)) continue;
    // Word writes `color: windowtext` for "no explicit colour" — honouring it
    // would paint every pasted answer black on our dark reader page.
    if (/^(windowtext|auto|initial|inherit)$/i.test(value)) continue;
    // Same trap, spelled differently: Word states plain body text as explicitly
    // black, and the reader page has a near-black background. Black-on-black is
    // never what the author meant, and dropping it just restores the theme's own
    // text colour. Deliberate colours (red, blue) are untouched.
    if (prop === 'color' && isDefaultBlack(value)) continue;
    // Likewise "white paper" backgrounds, which would paint an opaque slab
    // behind the text.
    if (prop === 'background-color' && /^(white|#fff(fff)?|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|transparent)$/i.test(value)) {
      continue;
    }
    if (prop === 'font-size') value = ptToPx(value);
    if (prop === 'font-family') value = value.replace(/["']/g, '').split(',')[0].trim();
    kept.set(prop, value);
  }
  return kept;
}

const isBoldWeight = (v) => /^(bold(er)?|[6-9]00)$/i.test(String(v || '').trim());

/** Black, or dark enough that Word meant "default body text", not a colour. */
function isDefaultBlack(value) {
  const v = String(value).trim().toLowerCase();
  if (v === 'black') return true;

  let r;
  let g;
  let b;
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else {
    const rgb = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
    if (!rgb) return false;
    [r, g, b] = rgb.slice(1, 4).map(Number);
  }
  // #222 and below — anything a reader could not tell apart from black.
  return r <= 34 && g <= 34 && b <= 34;
}

/** A Word list marker: "1.", "a)", "·", "o", "§", "-" and friends. */
const LIST_MARKER = /^\s*([·•●▪§ovO*\-–]|\(?[0-9]{1,3}[.)]|\(?[a-zA-Z][.)]|\(?[ivxIVX]{1,5}[.)])\s*$/;

const isOrderedMarker = (text) => /[0-9a-zA-Z]/.test(text.replace(/[()\s.]/g, ''));

/**
 * Word writes list items as ordinary paragraphs carrying `mso-list:` plus a
 * literal "1." typed into a span. Detect those, strip the fake marker, and
 * rebuild real <ul>/<ol> — nested by the `level N` in the mso-list value.
 */
function rebuildWordLists(root, doc) {
  const paragraphs = Array.from(root.querySelectorAll('p[data-mso-list]'));
  if (!paragraphs.length) return;

  let i = 0;
  while (i < paragraphs.length) {
    const start = paragraphs[i];

    // Collect the run of consecutive list paragraphs (siblings in document
    // order, uninterrupted by ordinary content).
    const run = [start];
    let node = start;
    while (true) {
      let next = node.nextElementSibling;
      if (!next || !next.hasAttribute('data-mso-list')) break;
      run.push(next);
      node = next;
    }
    i += run.length;

    // A stack of open lists, one entry per indent level.
    const stack = [];
    let rootList = null;

    for (const p of run) {
      const level = Number(p.getAttribute('data-mso-level')) || 1;
      const ordered = p.getAttribute('data-mso-ordered') === '1';

      while (stack.length > level) stack.pop();

      if (stack.length < level) {
        while (stack.length < level) {
          const list = doc.createElement(ordered ? 'ol' : 'ul');
          if (stack.length === 0) {
            rootList = list;
          } else {
            // Nested lists belong INSIDE the previous <li>, not beside it.
            const parentList = stack[stack.length - 1];
            const lastLi = parentList.lastElementChild;
            (lastLi || parentList).appendChild(list);
          }
          stack.push(list);
        }
      }

      const li = doc.createElement('li');
      while (p.firstChild) li.appendChild(p.firstChild);
      stack[stack.length - 1].appendChild(li);
    }

    if (rootList) {
      start.parentNode.insertBefore(rootList, start);
      run.forEach((p) => p.remove());
    }
  }
}

/**
 * Mark up Word's list paragraphs before the generic cleanup runs, while the
 * `mso-list` style and the literal marker span are both still present.
 */
function tagWordLists(root) {
  root.querySelectorAll('p').forEach((p) => {
    const style = p.getAttribute('style') || '';
    const cls = p.getAttribute('class') || '';
    const looksLikeList = /mso-list\s*:/i.test(style) || /MsoListParagraph/i.test(cls);
    if (!looksLikeList) return;

    const levelMatch = style.match(/level\s*(\d+)/i);
    p.setAttribute('data-mso-list', '1');
    p.setAttribute('data-mso-level', levelMatch ? levelMatch[1] : '1');

    // The visible "1." / "·" is a real span Word typed in. Find it, decide
    // ordered vs bulleted from its text, then delete it — the <li> supplies its
    // own marker and we would otherwise render "1. 1. Item".
    let ordered = false;
    const spans = Array.from(p.querySelectorAll('span'));
    for (const span of spans) {
      const text = (span.textContent || '').replace(/ /g, ' ').trim();
      if (!text) continue;
      if (LIST_MARKER.test(text)) {
        ordered = isOrderedMarker(text);
        span.remove();
      }
      break; // only the FIRST non-empty span can be the marker
    }
    p.setAttribute('data-mso-ordered', ordered ? '1' : '0');

    // Word pads after the marker with non-breaking spaces.
    if (p.firstChild && p.firstChild.nodeType === 3) {
      p.firstChild.nodeValue = p.firstChild.nodeValue.replace(/^[\s ]+/, '');
    }
  });
}

/**
 * Word and Google Docs both express bold/italic/underline as CSS on a <span>.
 * TipTap's Bold mark only recognises <strong>/<b> (and font-weight on those),
 * so unless these become real tags the emphasis is silently dropped.
 */
function promoteStyleToTags(el, doc) {
  const style = filterStyle(el.getAttribute('style'));
  const wraps = [];

  if (isBoldWeight(style.get('font-weight'))) {
    wraps.push('strong');
    style.delete('font-weight');
  }
  if (/^italic|oblique$/i.test(style.get('font-style') || '')) {
    wraps.push('em');
    style.delete('font-style');
  }
  const decoration = `${style.get('text-decoration') || ''} ${style.get('text-decoration-line') || ''}`;
  if (/underline/i.test(decoration)) wraps.push('u');
  if (/line-through/i.test(decoration)) wraps.push('s');
  style.delete('text-decoration');
  style.delete('text-decoration-line');

  // `font-weight: normal` inside an inherited-bold context is Google Docs'
  // signature wrapper; keeping it would fight the marks we just created.
  if (/^(normal|400)$/i.test(style.get('font-weight') || '')) style.delete('font-weight');

  if (style.size) {
    el.setAttribute(
      'style',
      Array.from(style.entries())
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ')
    );
  } else {
    el.removeAttribute('style');
  }

  if (!wraps.length) return el;

  // Wrap the element's children so <span style="font-weight:bold; color:red">
  // becomes <span style="color:red"><strong>…</strong></span> — both survive.
  let inner = doc.createElement(wraps[0]);
  for (let i = 1; i < wraps.length; i++) {
    const next = doc.createElement(wraps[i]);
    next.appendChild(inner);
    inner = next;
  }
  const deepest = wraps.length > 1 ? inner.querySelector(wraps[0]) || inner : inner;
  while (el.firstChild) deepest.appendChild(el.firstChild);
  el.appendChild(inner);
  return el;
}

/** Tags that carry no meaning we can use, and whose children should survive. */
const UNWRAP = new Set(['font', 'div', 'section', 'article', 'header', 'footer', 'main', 'nav']);
/** Tags dropped whole, contents and all. */
const DROP = new Set(['script', 'style', 'meta', 'link', 'title', 'xml', 'o:p', 'v:shapetype']);

export function cleanWordHtml(html) {
  if (!html || typeof window === 'undefined') return html;

  // Only intervene for office-suite paste. A snippet copied from a normal web
  // page is already sane HTML and should not be put through this.
  const fromOffice =
    /class=["']?Mso|mso-|urn:schemas-microsoft-com|<o:p|docs-internal-guid/i.test(html);
  if (!fromOffice) return html;

  // Conditional comments carry a second, uglier copy of the same content.
  let source = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<\/?(?:o|v|w|m|st1):[^>]*>/gi, '');

  const doc = new DOMParser().parseFromString(source, 'text/html');
  const body = doc.body;
  if (!body) return html;

  tagWordLists(body);

  body.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase();

    if (DROP.has(tag) || tag.includes(':')) {
      el.remove();
      return;
    }

    // Word links every heading to a bookmark; anchors with no href are noise.
    if (tag === 'a' && !el.getAttribute('href')) {
      el.replaceWith(...el.childNodes);
      return;
    }

    // Strip everything except the few attributes that mean something.
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const keep =
        name === 'style' ||
        name === 'src' ||
        name === 'alt' ||
        name === 'colspan' ||
        name === 'rowspan' ||
        (name === 'href' && tag === 'a') ||
        name.startsWith('data-mso-');
      // Inline event handlers must never survive a paste.
      if (!keep || name.startsWith('on')) el.removeAttribute(attr.name);
    }

    if (el.hasAttribute('style')) promoteStyleToTags(el, doc);
  });

  rebuildWordLists(body, doc);

  // Unwrap layout containers after the list rebuild, which relies on structure.
  body.querySelectorAll(Array.from(UNWRAP).join(',')).forEach((el) => {
    el.replaceWith(...el.childNodes);
  });

  // Word leaves behind empty paragraphs used purely as page spacing.
  body.querySelectorAll('p, span').forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('img, br, table')) el.remove();
  });

  // Attributes used only to drive the list rebuild.
  body.querySelectorAll('[data-mso-list], [data-mso-level], [data-mso-ordered]').forEach((el) => {
    el.removeAttribute('data-mso-list');
    el.removeAttribute('data-mso-level');
    el.removeAttribute('data-mso-ordered');
  });

  return body.innerHTML;
}

/**
 * Images pasted from Word arrive either as base64 data URIs or as `file:///`
 * paths into the author's own machine. Data URIs would be stored verbatim inside
 * answerHtml — a single screenshot can be several megabytes, which bloats every
 * read of that question and blows past the API's 10mb JSON body limit. The
 * file:/// ones are simply broken for everyone but the author.
 *
 * So: hand the data URIs to `upload` and swap in the returned URL, and drop the
 * unreachable ones. Async, hence separate from the synchronous cleaner above.
 */
export async function rehostPastedImages(editor, upload) {
  if (!editor) return { uploaded: 0, dropped: 0 };

  const targets = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'image') return;
    const src = node.attrs.src || '';
    if (src.startsWith('data:image/')) targets.push({ pos, src, kind: 'data' });
    else if (/^(file:|about:|blob:)/i.test(src)) targets.push({ pos, src, kind: 'dead' });
  });
  if (!targets.length) return { uploaded: 0, dropped: 0 };

  let uploaded = 0;
  let dropped = 0;

  // Descending order: replacing a node shifts every position after it.
  for (const target of targets.sort((a, b) => b.pos - a.pos)) {
    if (target.kind === 'dead') {
      editor.view.dispatch(
        editor.state.tr.delete(target.pos, target.pos + 1)
      );
      dropped++;
      continue;
    }

    try {
      const blob = await (await fetch(target.src)).blob();
      const ext = (blob.type.split('/')[1] || 'png').replace('+xml', '');
      const file = new File([blob], `pasted-${Date.now()}.${ext}`, { type: blob.type });
      const url = await upload(file);
      if (!url) throw new Error('upload returned no url');

      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(target.pos, undefined, {
          ...editor.state.doc.nodeAt(target.pos).attrs,
          src: url,
        })
      );
      uploaded++;
    } catch {
      // Leave the data URI in place rather than destroying the author's image;
      // the caller warns them so they can re-add it deliberately.
      dropped++;
    }
  }

  return { uploaded, dropped };
}
