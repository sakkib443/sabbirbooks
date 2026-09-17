/**
 * The Book Orders PDF list, made in the browser and saved straight to a file.
 *
 * Why pictures of pages and not PDF text: names, addresses and districts here
 * are Bengali, and the JavaScript PDF writers do not shape Bengali — the
 * conjuncts and vowel signs come apart. A canvas does shape it, exactly as the
 * screen does, so every page is drawn on a canvas and stored in the PDF as a
 * JPEG. The text cannot be selected; in return the file downloads in one click,
 * several files can download from one click, and it reads correctly everywhere.
 *
 * The PDF around the images is written by hand: a catalogue, and one page per
 * image. That much needs no library.
 *
 * Browser only — it needs `document` and a canvas.
 */

import { PAYMENT_LABEL } from '@/lib/orderList';

// A4 in PDF points, drawn at PX_PER_PT canvas pixels a point (180 dpi — sharp on paper, light enough for WhatsApp).
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const PX_PER_PT = 2.5;
const MARGIN_X = 28;
const MARGIN_TOP = 34;
const MARGIN_BOTTOM = 44; // the page number sits in here
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const PAD_X = 5;
const PAD_Y = 4;

// English, as the shop asked: the buyers' own names and addresses stay in
// whatever they typed, but everything the list itself says is English — and
// English text is the text a reader can select and copy (see the text layer).
const COLUMNS = [
  { key: 'n', label: '#', share: 0.05, alignRight: true },
  { key: 'name', label: 'Name', share: 0.16 },
  { key: 'phone', label: 'Mobile', share: 0.13 },
  { key: 'college', label: 'Medical college', share: 0.16 },
  { key: 'address', label: 'Address', share: 0.275 },
  // Beside the payment, because these two are what the packer acts on: how
  // many copies go in the parcel, and how much comes back. Wide enough for the
  // word "Books" to stay on one line.
  { key: 'books', label: 'Books', share: 0.075, alignRight: true },
  { key: 'payment', label: 'Payment', share: 0.15 },
];

const STYLES = {
  title: { size: 15, weight: 700, color: '#111111' },
  heading: { size: 12, weight: 700, color: '#111111' },
  meta: { size: 9, weight: 400, color: '#444444' },
  th: { size: 9, weight: 700, color: '#111111' },
  td: { size: 10, weight: 400, color: '#111111' },
  num: { size: 10, weight: 400, color: '#555555' },
  sub: { size: 9, weight: 400, color: '#555555' },
  pay: { size: 10, weight: 600, color: '#111111' },
  foot: { size: 8, weight: 400, color: '#666666' },
};

/** The page's Bengali face (next/font gives it a generated family name). */
function resolveFamily() {
  const probe = document.createElement('span');
  probe.className = 'hind-siliguri';
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily || 'sans-serif';
  probe.remove();
  return family;
}

/** Makes sure the face is loaded before anything is drawn with it. */
async function loadFaces(family) {
  if (!document.fonts?.load) return;
  await Promise.all(
    ['400', '600', '700'].map((weight) => document.fonts.load(`${weight} 12px ${family}`, 'নাম ঠিকানা Name 0123'))
  ).catch(() => {});
}

const graphemes = (word) =>
  typeof Intl !== 'undefined' && Intl.Segmenter
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word), (s) => s.segment)
    : Array.from(word);

/**
 * Lines of `text` that fit `width` in the context's current font. Breaks at
 * spaces; a word wider than the column (an email, say) breaks between letters —
 * whole letters, so a Bengali conjunct is never split in two.
 */
function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    if (ctx.measureText(word).width <= width) {
      line = word;
      continue;
    }
    for (const letter of graphemes(word)) {
      if (line && ctx.measureText(line + letter).width > width) {
        lines.push(line);
        line = letter;
      } else {
        line += letter;
      }
    }
  }
  lines.push(line);
  return lines;
}

/** Sets the font and colour for a style; returns its line box. */
function applyStyle(ctx, family, style) {
  ctx.font = `${style.weight} ${style.size}px ${family}`;
  ctx.fillStyle = style.color;
  const m = ctx.measureText('অA');
  const ascent = m.fontBoundingBoxAscent ?? style.size * 0.95;
  const descent = m.fontBoundingBoxDescent ?? style.size * 0.4;
  const lineHeight = Math.max(style.size * 1.45, ascent + descent);
  return { lineHeight, baseline: (lineHeight - ascent - descent) / 2 + ascent };
}

/** Wrapped text blocks for a width: [{ style, lines }]. */
function measureBlocks(ctx, family, parts, width) {
  return parts.map(([text, styleName]) => {
    const style = STYLES[styleName];
    const box = applyStyle(ctx, family, style);
    return { style, box, lines: wrap(ctx, text, width) };
  });
}

const blocksHeight = (blocks) => blocks.reduce((h, b) => h + b.lines.length * b.box.lineHeight, 0);

function drawBlocks(ctx, family, blocks, x, y, width, alignRight = false, collect) {
  let top = y;
  for (const block of blocks) {
    applyStyle(ctx, family, block.style);
    for (const line of block.lines) {
      const drawn = ctx.measureText(line).width;
      const left = alignRight ? x + width - drawn : x;
      ctx.fillText(line, left, top + block.box.baseline);
      collect?.({ text: line, x: left, baseline: top + block.box.baseline, size: block.style.size, width: drawn });
      top += block.box.lineHeight;
    }
  }
}

const cellParts = (row, index) => ({
  n: [[String(index + 1), 'num']],
  name: [[row.name || '-', 'td']],
  phone: [[row.phone || '-', 'td'], ...(row.altPhone ? [[row.altPhone, 'sub']] : [])],
  college: [[row.college || '-', 'td']],
  address: [[row.address || (row.digital ? 'Digital book - nothing to ship' : '-'), 'td']],
  books: [[String(row.books || 1), 'td']],
  // Under the words, the money: what this buyer hands over, or already has.
  payment: [[PAYMENT_LABEL[row.payment] || '-', 'pay'], ...(row.amount ? [[row.amount, 'sub']] : [])],
});

const columnWidths = () => COLUMNS.map((c) => c.share * CONTENT_W);

/** A JPEG of one page canvas, as bytes. */
async function jpegOf(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  if (!blob) throw new Error('Could not draw the PDF page');
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * The list as a PDF Blob.
 * @param title    top line, e.g. "Magic Viva — অর্ডার লিস্ট"
 * @param heading  optional bold second line, e.g. "মেডিকেল কলেজ: Dhaka Medical College"
 * @param filters  lines naming the filters used, joined into one paragraph
 * @param summary  count / when it was made
 * @param footer   small text beside the page number on every page
 * @param rows     printRowOf() rows
 */
export async function buildOrderListPdf({ title, heading = '', filters = [], summary = '', footer = '', rows }) {
  const family = resolveFamily();
  await loadFaces(family);

  // Measuring needs a context with the fonts; a small one will do.
  const measure = document.createElement('canvas').getContext('2d');
  const widths = columnWidths();

  // The header above the table, on the first page only.
  const header = [
    ...measureBlocks(measure, family, [[title, 'title']], CONTENT_W),
    ...(heading ? measureBlocks(measure, family, [[heading, 'heading']], CONTENT_W) : []),
    ...(filters.length ? measureBlocks(measure, family, [[filters.join('   ·   '), 'meta']], CONTENT_W) : []),
    ...(summary ? measureBlocks(measure, family, [[summary, 'meta']], CONTENT_W) : []),
  ];
  const headerHeight = blocksHeight(header) + 8;

  const headCells = COLUMNS.map((c, i) => measureBlocks(measure, family, [[c.label, 'th']], widths[i] - PAD_X * 2));
  const headRowHeight = Math.max(...headCells.map(blocksHeight)) + PAD_Y * 2;

  const laidRows = rows.map((row, index) => {
    const parts = cellParts(row, index);
    const cells = COLUMNS.map((c, i) => measureBlocks(measure, family, parts[c.key], widths[i] - PAD_X * 2));
    return { cells, height: Math.max(...cells.map(blocksHeight)) + PAD_Y * 2 };
  });

  // Rows onto pages; the table's head repeats at the top of every page.
  const bodyBottom = PAGE_H - MARGIN_BOTTOM;
  const pages = [{ tableTop: MARGIN_TOP + headerHeight, rows: [] }];
  let y = pages[0].tableTop + headRowHeight;
  laidRows.forEach((row, index) => {
    const page = pages[pages.length - 1];
    if (y + row.height > bodyBottom && page.rows.length > 0) {
      pages.push({ tableTop: MARGIN_TOP, rows: [] });
      y = MARGIN_TOP + headRowHeight;
    }
    pages[pages.length - 1].rows.push({ ...row, index, y });
    y += row.height;
  });

  const images = [];
  for (let p = 0; p < pages.length; p += 1) {
    const page = pages[p];
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(PAGE_W * PX_PER_PT);
    canvas.height = Math.round(PAGE_H * PX_PER_PT);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(PX_PER_PT, 0, 0, PX_PER_PT, 0, 0);

    // Every line drawn is also kept, to be laid invisibly over the picture so
    // the list can be selected and copied — see textLayer().
    const runs = [];
    const collect = (run) => runs.push(run);

    if (p === 0) drawBlocks(ctx, family, header, MARGIN_X, MARGIN_TOP, CONTENT_W, false, collect);

    const drawRow = (cells, top, height, fill) => {
      let x = MARGIN_X;
      cells.forEach((blocks, i) => {
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fillRect(x, top, widths[i], height);
        }
        ctx.strokeStyle = '#9a9a9a';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(x, top, widths[i], height);
        drawBlocks(ctx, family, blocks, x + PAD_X, top + PAD_Y, widths[i] - PAD_X * 2, COLUMNS[i].alignRight, collect);
        x += widths[i];
      });
    };

    drawRow(headCells, page.tableTop, headRowHeight, '#ececec');
    for (const row of page.rows) drawRow(row.cells, row.y, row.height, row.index % 2 === 1 ? '#f6f6f6' : null);

    const footBox = applyStyle(ctx, family, STYLES.foot);
    const footY = PAGE_H - MARGIN_BOTTOM + 14 + footBox.baseline;
    if (footer) {
      ctx.fillText(footer, MARGIN_X, footY);
      collect({ text: footer, x: MARGIN_X, baseline: footY, size: STYLES.foot.size, width: ctx.measureText(footer).width });
    }
    const pageLabel = `Page ${p + 1} / ${pages.length}`;
    const pageLabelWidth = ctx.measureText(pageLabel).width;
    ctx.fillText(pageLabel, PAGE_W - MARGIN_X - pageLabelWidth, footY);
    collect({ text: pageLabel, x: PAGE_W - MARGIN_X - pageLabelWidth, baseline: footY, size: STYLES.foot.size, width: pageLabelWidth });

    images.push({ bytes: await jpegOf(canvas), width: canvas.width, height: canvas.height, runs });
    canvas.width = 0; // let the browser drop the bitmap now, not at collection time
    canvas.height = 0;
  }

  return pdfOfImages(images, title);
}

// ── A PDF of full-page JPEGs ─────────────────────────────────────────────────

const latin1 = (text) => Uint8Array.from(text, (ch) => ch.charCodeAt(0) & 0xff);

// Helvetica's own character widths (per 1000 units), so the invisible text can
// be stretched to sit exactly under the picture's words.
const HELVETICA_W = {};
'278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584'
  .split(' ')
  .forEach((w, i) => {
    HELVETICA_W[String.fromCharCode(32 + i)] = Number(w);
  });

/**
 * Text a standard PDF font can hold: Latin-1, which WinAnsiEncoding covers
 * (the "·" between the heading's parts included). Bengali lines stay
 * picture-only — see the note at the top of this file.
 */
const isLatin = (text) => /^[\x20-\x7e\xa0-\xff]+$/.test(text);

const helveticaWidth = (text, size) =>
  Array.from(text).reduce((w, ch) => w + (HELVETICA_W[ch] ?? 556), 0) * (size / 1000);

const escapePdfText = (text) =>
  Array.from(text)
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (ch === '\\' || ch === '(' || ch === ')') return `\\${ch}`;
      return code > 0x7e ? `\\${code.toString(8).padStart(3, '0')}` : ch;
    })
    .join('');

/**
 * The page's words again, this time as real PDF text: invisible (Tr 3), laid
 * over the picture of them and stretched (Tz) to the width they were drawn at.
 * This is what lets a reader select, copy and search the list — the same trick
 * a scanner uses when it puts OCR text under a scan.
 */
function textLayer(runs) {
  const ops = ['BT', '3 Tr'];
  for (const run of runs) {
    if (!isLatin(run.text)) continue;
    const natural = helveticaWidth(run.text, run.size);
    if (natural <= 0) continue;
    ops.push(`/F1 ${run.size.toFixed(2)} Tf`);
    ops.push(`${((run.width / natural) * 100).toFixed(2)} Tz`);
    ops.push(`1 0 0 1 ${run.x.toFixed(2)} ${(PAGE_H - run.baseline).toFixed(2)} Tm`);
    ops.push(`(${escapePdfText(run.text)}) Tj`);
  }
  ops.push('ET');
  return ops.length > 3 ? ops.join('\n') : '';
}

/** A PDF text string for any Unicode text: UTF-16BE, hex, with its BOM. */
const pdfTextString = (text) =>
  `<FEFF${Array.from(String(text), (ch) => ch.split('').map((u) => u.charCodeAt(0).toString(16).padStart(4, '0')).join('')).join('').toUpperCase()}>`;

function pdfOfImages(images, title) {
  const chunks = [];
  const offsets = [];
  let length = 0;
  const push = (part) => {
    const bytes = typeof part === 'string' ? latin1(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id, ...parts) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    parts.forEach(push);
    push('\nendobj\n');
  };

  // 1 catalogue, 2 page tree, 3 info, 4 the font the text layer is written in;
  // then page, image and contents for each page.
  const pageId = (i) => 5 + i * 3;
  const size = 5 + images.length * 3;

  push('%PDF-1.4\n%âãÏÓ\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Count ${images.length} /Kids [${images.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] >>`);
  const now = new Date(Date.now() + 6 * 3600e3).toISOString().replace(/[-:T]/g, '').slice(0, 14);
  object(3, `<< /Title ${pdfTextString(title)} /Producer (Magic Viva admin) /CreationDate (D:${now}+06'00') >>`);
  object(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  images.forEach((image, i) => {
    const id = pageId(i);
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /XObject << /Im0 ${id + 1} 0 R >> /Font << /F1 4 0 R >> /ProcSet [/PDF /ImageC /Text] >> ` +
        `/Contents ${id + 2} 0 R >>`
    );
    object(
      id + 1,
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
      image.bytes,
      '\nendstream'
    );
    const draw = `q\n${PAGE_W} 0 0 ${PAGE_H} 0 0 cm\n/Im0 Do\nQ\n${textLayer(image.runs || [])}`;
    object(id + 2, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
  });

  const xref = length;
  push(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (let id = 1; id < size; id += 1) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${size} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
}

/** Saves a Blob as a file download. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Long enough for a slow download to have started reading it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
