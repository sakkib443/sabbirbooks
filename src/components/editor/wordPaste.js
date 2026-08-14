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
 * and rebuild the structures Word fakes (lists, style-driven bold, raised and
 * lowered text, highlighting) as real HTML the editor can hold onto.
 *
 * The one thing HTML alone cannot carry is the pictures: on Windows, Word points
 * at them with `file:///` paths into its own temp folder. Those are unreachable
 * from a web page, so `captureClipboardImages` grabs the RTF flavour of the same
 * paste — which does carry the bytes — and `rehostPastedImages` pairs them back
 * up.
 */

// CSS properties worth keeping. Anything not on this list is Word's internal
// state (mso-*), layout noise that fights our own stylesheet (page widths,
// A4 margins), or a security risk.
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
  'line-height',
  'margin-left',
  'text-indent',
]);

// Properties whose value is a length and therefore needs converting.
const LENGTH_STYLE = new Set(['font-size', 'line-height', 'margin-left', 'text-indent']);

const UNIT_PX = { pt: 96 / 72, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, pc: 16 };

// Word measures in points and inches; the web thinks in pixels. Without this a
// 12pt body paragraph renders as 12px — noticeably smaller than the text around
// it — and a `.5in` indent is discarded outright as an unknown unit.
const toPx = (value) =>
  String(value).replace(/(-?[\d.]+)\s*(pt|in|cm|mm|pc)\b/gi, (whole, n, unit) => {
    const px = parseFloat(n) * UNIT_PX[unit.toLowerCase()];
    return Number.isFinite(px) ? `${Math.round(px * 10) / 10}px` : whole;
  });

/** A bare colour, as opposed to a full `background` shorthand we cannot reuse. */
const COLOR_VALUE = /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\([^)]*\)|hsla?\([^)]*\))$/i;

/** Parse a style attribute into a Map, dropping everything not worth keeping. */
function filterStyle(raw) {
  const kept = new Map();
  for (const decl of String(raw || '').split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    let prop = decl.slice(0, idx).trim().toLowerCase();
    let value = decl.slice(idx + 1).trim();
    if (!prop || !value) continue;
    // Word writes highlighting with the `background` shorthand and never with
    // `background-color`. Treating those as two unrelated properties is why
    // highlighted text used to arrive completely plain.
    if (prop === 'background' && COLOR_VALUE.test(value)) prop = 'background-color';
    // Google Docs indents with padding where Word uses a margin; both mean the
    // same thing to a reader.
    if (prop === 'padding-left') prop = 'margin-left';
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
    if (LENGTH_STYLE.has(prop)) {
      value = toPx(value);
      // Word restates the default on every paragraph — `margin-left:0in`,
      // `text-indent:0in`. A zero is not formatting, it is Word being verbose.
      if (/^-?0(\.0+)?(px|%)?$/.test(value)) continue;
      // A negative text-indent is the hanging indent of a bullet. Once the
      // bullet is gone it just drags the first line into the margin.
      if (prop === 'text-indent' && value.startsWith('-')) continue;
    }
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

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };

/**
 * "3." → 3, "c)" → 3, "iii." → 3.
 *
 * A list that Word interrupted with a plain paragraph resumes its numbering
 * where it left off; rebuilt as a fresh <ol> it would silently restart at 1, so
 * the marker Word typed is the only record of where the author actually was.
 */
function markerToNumber(text) {
  const t = text.replace(/[()\s.]/g, '').toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  if (ROMAN[t]) return ROMAN[t];
  if (/^[a-z]$/.test(t)) return t.charCodeAt(0) - 96;
  return 0;
}

/** The HTML `type` an <ol> needs to reproduce the marker Word drew. */
function markerToListType(text) {
  const t = text.replace(/[()\s.]/g, '');
  if (/^\d+$/.test(t)) return null; // decimal is the default
  if (ROMAN[t.toLowerCase()]) return t === t.toLowerCase() ? 'i' : 'I';
  if (/^[a-z]$/.test(t)) return 'a';
  if (/^[A-Z]$/.test(t)) return 'A';
  return null;
}

/**
 * The literal "1." / "·" Word typed into the paragraph, or null when there is
 * none. Only the first non-empty span can be a marker — a later one is content.
 */
function findMarkerSpan(p) {
  for (const span of p.querySelectorAll('span')) {
    const text = (span.textContent || '').replace(/ /g, ' ').trim();
    if (!text) continue;
    return LIST_MARKER.test(text) ? span : null;
  }
  return null;
}

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
    for (;;) {
      const next = node.nextElementSibling;
      if (!next || !next.hasAttribute('data-mso-list')) break;
      run.push(next);
      node = next;
    }
    i += run.length;

    // A stack of open lists, one entry per indent level, plus the top-level
    // lists this run produced — a run can need more than one of those when the
    // author switched between bullets and numbers at the outermost level.
    const stack = [];
    const roots = [];

    for (const p of run) {
      const level = Number(p.getAttribute('data-mso-level')) || 1;
      const ordered = p.getAttribute('data-mso-ordered') === '1';
      const startAt = Number(p.getAttribute('data-mso-start')) || 0;
      const listType = p.getAttribute('data-mso-type') || '';
      const wanted = ordered ? 'ol' : 'ul';

      while (stack.length > level) stack.pop();

      // A level can change kind halfway down: Word is happy to number the first
      // three children of a bullet and dash the rest. One <ul> cannot hold both,
      // so close it and open a sibling of the right kind.
      if (stack.length === level && stack[level - 1].tagName.toLowerCase() !== wanted) {
        stack.pop();
      }

      while (stack.length < level) {
        // Only the level this item actually sits on gets its kind and numbering;
        // any levels invented to bridge a jump from 1 straight to 3 are scaffold.
        const isTarget = stack.length === level - 1;
        const list = doc.createElement(isTarget ? wanted : 'ul');
        if (isTarget && wanted === 'ol') {
          if (startAt > 1) list.setAttribute('start', String(startAt));
          if (listType) list.setAttribute('type', listType);
        }
        if (stack.length === 0) {
          roots.push(list);
        } else {
          // Nested lists belong INSIDE the previous <li>, not beside it.
          const parentList = stack[stack.length - 1];
          const lastLi = parentList.lastElementChild;
          (lastLi || parentList).appendChild(list);
        }
        stack.push(list);
      }

      const li = doc.createElement('li');
      // Colour and font set on the paragraph belong to the item, and the <p>
      // itself is about to be thrown away. The indent does NOT come along: Word
      // spells out how far a level-3 bullet sits from the margin, and the nested
      // <ul> already indents it that far by itself.
      const carried = filterStyle(p.getAttribute('style'));
      carried.delete('margin-left');
      carried.delete('text-indent');
      if (carried.size) {
        li.setAttribute(
          'style',
          Array.from(carried.entries())
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ')
        );
      }
      while (p.firstChild) li.appendChild(p.firstChild);
      stack[stack.length - 1].appendChild(li);
    }

    if (roots.length) {
      roots.forEach((list) => start.parentNode.insertBefore(list, start));
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
    const hasMsoList = /mso-list\s*:/i.test(style);
    if (!hasMsoList && !/MsoListParagraph/i.test(cls)) return;

    // The visible "1." / "·" is a real span Word typed in. Find it, decide
    // ordered vs bulleted from its text, then delete it — the <li> supplies its
    // own marker and we would otherwise render "1. 1. Item".
    const marker = findMarkerSpan(p);

    // `MsoListParagraph` on its own proves nothing: Word stamps that class on
    // any paragraph the author merely indented with the toolbar button. Turning
    // those into <li> invents bullets that were never in the document, so a real
    // marker or a real `mso-list` is required before we believe it.
    if (!hasMsoList && !marker) return;

    const levelMatch = style.match(/level\s*(\d+)/i);
    p.setAttribute('data-mso-list', '1');
    p.setAttribute('data-mso-level', levelMatch ? levelMatch[1] : '1');

    let ordered = false;
    if (marker) {
      const text = (marker.textContent || '').replace(/ /g, ' ').trim();
      ordered = isOrderedMarker(text);
      if (ordered) {
        const number = markerToNumber(text);
        if (number > 1) p.setAttribute('data-mso-start', String(number));
        const type = markerToListType(text);
        if (type) p.setAttribute('data-mso-type', type);
      }
      marker.remove();
    }
    p.setAttribute('data-mso-ordered', ordered ? '1' : '0');

    // Word pads after the marker with non-breaking spaces.
    if (p.firstChild && p.firstChild.nodeType === 3) {
      p.firstChild.nodeValue = p.firstChild.nodeValue.replace(/^[\s ]+/, '');
    }
  });
}

/**
 * Word's footnote and endnote references are anchors into bookmarks that do not
 * survive the paste — the editor keeps no element ids, so the jump target is
 * gone whatever we do. What the reader actually sees is a raised "[1]", so keep
 * that and drop the link rather than leaving a dead one behind.
 */
function flattenFootnoteLinks(root, doc) {
  let separated = false;
  root.querySelectorAll('div[style*="mso-element:footnote"], div[style*="mso-element:endnote"]').forEach((div) => {
    if (separated) return;
    // Word draws a rule between the body and its notes; without it the notes
    // read as an extra paragraph of the answer.
    div.parentNode.insertBefore(doc.createElement('hr'), div);
    separated = true;
  });

  root.querySelectorAll('a[href^="#_ftn"], a[href^="#_edn"]').forEach((a) => {
    const sup = doc.createElement('sup');
    while (a.firstChild) sup.appendChild(a.firstChild);
    a.replaceWith(sup);
  });
}

/** Tags whose background is highlighting of text, not shading of a block. */
const INLINE_TAGS = new Set(['span', 'font', 'a', 'b', 'i', 'u', 'em', 'strong', 's', 'strike']);

/**
 * Word and Google Docs both express bold/italic/underline, superscript and
 * highlighting as CSS on a <span>. TipTap's marks only recognise the real tags,
 * so unless these become <strong>/<sup>/<mark> the formatting is silently lost.
 */
function promoteStyleToTags(el, doc) {
  const tag = el.tagName.toLowerCase();
  const style = filterStyle(el.getAttribute('style'));
  // Outermost first.
  const wraps = [];

  // Left as a raw background this is a coloured slab the editor cannot toggle,
  // and on the dark reader page pale yellow behind pale text is unreadable. As a
  // <mark> both TipTap and the reader stylesheet know what they are looking at.
  if (INLINE_TAGS.has(tag) && style.has('background-color')) {
    wraps.push({ tag: 'mark', style: `background-color: ${style.get('background-color')}` });
    style.delete('background-color');
  }

  const raised = (style.get('vertical-align') || '').toLowerCase();
  if (raised === 'super' || raised === 'sub') {
    wraps.push({ tag: raised === 'super' ? 'sup' : 'sub' });
    style.delete('vertical-align');
    // <sup>/<sub> shrink the text themselves; keeping Word's 7.5pt on top of
    // that shrinks it twice and the digit in H₂O becomes unreadable.
    style.delete('font-size');
  }

  if (isBoldWeight(style.get('font-weight'))) {
    wraps.push({ tag: 'strong' });
    style.delete('font-weight');
  }
  if (/^(italic|oblique)$/i.test(style.get('font-style') || '')) {
    wraps.push({ tag: 'em' });
    style.delete('font-style');
  }
  const decoration = `${style.get('text-decoration') || ''} ${style.get('text-decoration-line') || ''}`;
  if (/underline/i.test(decoration)) wraps.push({ tag: 'u' });
  if (/line-through/i.test(decoration)) wraps.push({ tag: 's' });
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

  // Nest the wrappers and move the children inside, so
  // <span style="font-weight:bold; color:red"> becomes
  // <span style="color:red"><strong>…</strong></span> — both survive.
  let outermost = null;
  let cursor = null;
  for (const wrap of wraps) {
    const node = doc.createElement(wrap.tag);
    if (wrap.style) node.setAttribute('style', wrap.style);
    if (cursor) cursor.appendChild(node);
    else outermost = node;
    cursor = node;
  }
  while (el.firstChild) cursor.appendChild(el.firstChild);
  el.appendChild(outermost);
  return el;
}

/** Tags that carry no meaning we can use, and whose children should survive. */
const UNWRAP = new Set(['font', 'div', 'section', 'article', 'header', 'footer', 'main', 'nav']);
/** Tags dropped whole, contents and all. */
const DROP = new Set(['script', 'style', 'meta', 'link', 'title', 'xml', 'o:p', 'v:shapetype']);

/**
 * Fingerprints of an office suite's clipboard HTML. Desktop Word leaves `mso-`
 * everywhere; Word for the web leaves `SCXW`-suffixed classes and `data-ccp-`
 * attributes instead, and Google Docs leaves a guid.
 */
const OFFICE_MARKERS =
  /class=["']?Mso|\bMso[A-Z]|mso-|urn:schemas-microsoft-com|<o:p|docs-internal-guid|data-ccp-|\bSCXW\d|class=["'][^"']*\b(?:TextRun|EOP|OutlineElement|WACImage)|content=["']?(?:Microsoft Word|LibreOffice|OpenOffice)/i;

/**
 * Newer Word builds can hand over clipboard HTML with none of those markers at
 * all — just <span style="…"> and <p style="…">. Sniffing for `mso-` alone let
 * those pastes through completely unprocessed, which is exactly why some Word
 * documents came out looking right and others did not.
 *
 * So the real question is not "did this come from Word" but "does this format
 * itself with presentational HTML", which is what the cleaner is for. Genuinely
 * semantic markup — a snippet off a normal web page — is already what the editor
 * wants and is handed straight back.
 */
const PRESENTATIONAL = /<(?:p|span|div|td|th|li|h[1-6])\b[^>]*\bstyle\s*=|<font\b/i;

export function cleanWordHtml(html) {
  if (!html || typeof window === 'undefined') return html;

  // Content copied out of this very editor is already exactly what the schema
  // wants, and ProseMirror's own `data-pm-slice` carries the open/close depths
  // it needs to merge the fragment back in. Cleaning it would throw that away
  // and turn a half-copied list item into a stray paragraph.
  if (html.includes('data-pm-slice')) return html;

  if (!OFFICE_MARKERS.test(html) && !PRESENTATIONAL.test(html)) return html;

  // Conditional comments carry a second, uglier copy of the same content.
  const source = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<\/?(?:o|v|w|m|st1):[^>]*>/gi, '');

  const doc = new DOMParser().parseFromString(source, 'text/html');
  const body = doc.body;
  if (!body) return html;

  tagWordLists(body);
  flattenFootnoteLinks(body, doc);

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

  // A <span> that lost every attribute to the style filter held nothing but
  // Word's bookkeeping; left in place it only gets in the way of the marks the
  // promotion pass just created.
  body.querySelectorAll('span').forEach((el) => {
    if (!el.attributes.length) el.replaceWith(...el.childNodes);
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
    el.removeAttribute('data-mso-start');
    el.removeAttribute('data-mso-type');
  });

  return body.innerHTML;
}

/* ------------------------------------------------------------------ images */

/**
 * On Windows, Word does not put its pictures in the HTML flavour of the
 * clipboard at all — it writes `<img src="file:///…/clip_image001.png">`,
 * a path into its own temp folder. A page served over http cannot read a file:
 * URL (the browser blocks it, deliberately), so from the HTML alone every figure
 * in a Word document is unrecoverable and used to be deleted without a word.
 *
 * The RTF flavour of the very same clipboard does carry the bytes, hex-encoded
 * inside `\pict` groups and in document order. That is the only copy we can get
 * at, so grab it while the paste event is still alive.
 */
let clipboardPictures = [];
let clipboardFiles = [];

export function captureClipboardImages(clipboardData) {
  clipboardPictures = [];
  clipboardFiles = [];
  if (!clipboardData) return;
  try {
    const rtf = clipboardData.getData('text/rtf') || '';
    if (rtf) clipboardPictures = extractRtfPictures(rtf);
  } catch {
    // Firefox refuses flavours it does not recognise; the file pool still works.
  }
  try {
    clipboardFiles = Array.from(clipboardData.files || []).filter((f) => /^image\//i.test(f.type));
  } catch {
    clipboardFiles = [];
  }
}

/** Index of the closing brace of the RTF group starting at `start`. */
function matchBrace(s, start) {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i + 1;
  }
  return -1;
}

function removeGroups(s, marker) {
  let out = s;
  for (;;) {
    const at = out.indexOf(marker);
    if (at < 0) return out;
    const end = matchBrace(out, at);
    if (end < 0) return out;
    out = out.slice(0, at) + out.slice(end);
  }
}

// Only the formats a browser can actually display; a Windows metafile is of no
// use to us, but it still has to be counted (see below).
const PICT_MIME = [
  [/\\pngblip/, 'image/png'],
  [/\\jpegblip/, 'image/jpeg'],
];

/**
 * Pull every picture out of RTF clipboard data, in document order.
 *
 * Unreadable ones (metafiles) come back as null rather than being skipped:
 * position is how a picture is matched to its <img>, so a dropped entry would
 * shift every later image onto the wrong slot.
 */
export function extractRtfPictures(rtf) {
  // Word emits each picture twice — a modern PNG inside {\*\shppict …} and a
  // Windows-metafile fallback inside {\nonshppict …}. Counting both would double
  // the pictures and destroy the pairing.
  const source = removeGroups(String(rtf), '{\\nonshppict');

  const out = [];
  let at = 0;
  for (;;) {
    at = source.indexOf('{\\pict', at);
    if (at < 0) return out;
    const end = matchBrace(source, at);
    if (end < 0) return out;
    out.push(decodePict(source.slice(at, end)));
    at = end;
  }
}

function decodePict(group) {
  const match = PICT_MIME.find(([re]) => re.test(group));
  if (!match) return null;

  // Sub-groups such as {\*\blipuid 0100…} hold a hex id that is not image data.
  // The group's own braces come off first or it would match as a sub-group too.
  let body = group.slice(1, -1);
  for (let guard = 0; guard < 40; guard++) {
    const next = body.replace(/\{[^{}]*\}/g, '');
    if (next === body) break;
    body = next;
  }
  // Everything after the last control word is the payload.
  const lastWord = body.lastIndexOf('\\');
  const hex = (lastWord < 0 ? body : body.slice(lastWord))
    .replace(/^\\[a-z]+-?\d*\s?/i, '')
    .replace(/[^0-9a-f]/gi, '');
  if (hex.length < 32 || hex.length % 2) return null;

  return { mime: match[1], hex };
}

function hexToFile({ mime, hex }, index) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
  return new File([bytes], `word-${Date.now()}-${index}.${ext}`, { type: mime });
}

/**
 * The clipboard's own copy of the image that the nth unreachable <img> refers
 * to, or null when this paste simply does not contain one.
 */
function clipboardImageFile(index, total) {
  const picture = clipboardPictures[index];
  if (picture) return hexToFile(picture, index);
  // Chrome also hands over a real File when the clipboard holds a single
  // bitmap. Use it only when the counts line up, so a mismatch can never put
  // the wrong picture in the wrong place.
  if (clipboardFiles.length === total) return clipboardFiles[index] || null;
  return null;
}

async function fetchAsFile(src) {
  const blob = await (await fetch(src)).blob();
  const ext = (blob.type.split('/')[1] || 'png').replace('+xml', '');
  return new File([blob], `pasted-${Date.now()}.${ext}`, { type: blob.type });
}

/**
 * Move every pasted image onto our own server.
 *
 * Data URIs would otherwise be stored verbatim inside answerHtml — a single
 * screenshot can be several megabytes, which bloats every read of that question
 * and blows past the API's 10mb JSON body limit. `file:///` and `blob:` sources
 * point at the author's own machine and render as a broken icon for everybody
 * else, so those are rebuilt from the clipboard's RTF copy where one exists.
 *
 * Async, hence separate from the synchronous cleaner above.
 */
export async function rehostPastedImages(editor, upload) {
  const empty = { uploaded: 0, kept: 0, removed: 0 };
  if (!editor) return empty;

  const targets = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'image') return;
    const src = node.attrs.src || '';
    if (src.startsWith('data:image/')) targets.push({ pos, src, kind: 'data' });
    else if (/^(file:|about:|blob:)/i.test(src)) targets.push({ pos, src, kind: 'clipboard' });
  });
  if (!targets.length) return empty;

  // Numbered in document order, which is the order Word wrote them to the RTF.
  let unreachable = 0;
  for (const target of targets) {
    if (target.kind === 'clipboard') target.index = unreachable++;
  }

  let uploaded = 0;
  let kept = 0;
  let removed = 0;

  // Descending order: replacing a node shifts every position after it.
  for (const target of targets.sort((a, b) => b.pos - a.pos)) {
    let file = null;
    try {
      file =
        target.kind === 'data'
          ? await fetchAsFile(target.src)
          : clipboardImageFile(target.index, unreachable) || (await fetchAsFile(target.src));
    } catch {
      file = null;
    }

    if (file) {
      try {
        const url = await upload(file);
        if (!url) throw new Error('upload returned no url');
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(target.pos, undefined, {
            ...editor.state.doc.nodeAt(target.pos).attrs,
            src: url,
          })
        );
        uploaded++;
        continue;
      } catch {
        // Fall through and report it rather than pretending the paste worked.
      }
    }

    if (target.kind === 'data') {
      // Leave the data URI in place rather than destroying the author's image;
      // the caller warns them so they can re-add it deliberately.
      kept++;
    } else {
      // A file:/// path into somebody's Documents folder is a broken image for
      // every reader, so it cannot stay — but the caller has to say so out loud.
      editor.view.dispatch(editor.state.tr.delete(target.pos, target.pos + 1));
      removed++;
    }
  }

  clipboardPictures = [];
  clipboardFiles = [];
  return { uploaded, kept, removed };
}
