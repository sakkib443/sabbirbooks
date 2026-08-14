'use client';

/**
 * Rich text editor for answer bodies.
 *
 * Stores HTML, because that is what BookQuestion.answerHtml already holds and
 * what the reader page renders.
 *
 * Two things it has to get right:
 *
 * 1. Pasting from Word keeps the formatting. The extension list below is not
 *    decoration — every mark here is one the paste cleaner may produce, and a
 *    mark the editor cannot hold is a mark that silently disappears the moment
 *    it is pasted. Colour, size, font and highlight are all carried on TextStyle.
 *
 * 2. Images never live in the document as base64. A pasted screenshot is easily
 *    several megabytes; inlined, it would be re-sent on every read of that
 *    question and would push the save past the API's 10mb JSON limit. Everything
 *    is uploaded and referenced by URL.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Extension } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { TableKit } from '@tiptap/extension-table';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
  FiLink,
  FiImage,
  FiRotateCcw,
  FiRotateCw,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiAlignJustify,
  FiCode,
  FiLoader,
  FiGrid,
  FiDroplet,
  FiMinus,
} from 'react-icons/fi';
import {
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuListOrdered,
  LuQuote,
  LuRemoveFormatting,
  LuSubscript,
  LuSuperscript,
  LuStrikethrough,
  LuHighlighter,
} from 'react-icons/lu';
import { captureClipboardImages, cleanWordHtml, rehostPastedImages } from './wordPaste';
import { isImageFile } from '@/components/shared/uploadMedia';

/**
 * Node types that may carry text formatting of their own.
 *
 * TipTap's TextStyle mark only ever looks at <span>, but Word puts colour, font
 * and spacing on the paragraph, the list item or the table cell at least as
 * often — a whole-paragraph or whole-cell format would otherwise evaporate the
 * moment it was pasted, which is exactly what "not quite like Word" looked like.
 */
const STYLED_BLOCKS = ['paragraph', 'heading', 'listItem', 'tableCell', 'tableHeader'];
const STYLE_TARGETS = ['textStyle', ...STYLED_BLOCKS];

const styleAttribute = (name, css) => ({
  default: null,
  parseHTML: element => element.style[name] || null,
  renderHTML: attributes => (attributes[name] ? { style: `${css}: ${attributes[name]}` } : {}),
});

/**
 * Indentation is the one part of Word's paragraph formatting TipTap ships no
 * extension for, so an indented paragraph used to arrive flush against the
 * margin. These two properties are the whole of what Word means by "indent".
 */
const WordIndent = Extension.create({
  name: 'wordIndent',
  addGlobalAttributes() {
    return [
      {
        types: STYLED_BLOCKS,
        attributes: {
          marginLeft: styleAttribute('marginLeft', 'margin-left'),
          textIndent: styleAttribute('textIndent', 'text-indent'),
        },
      },
    ];
  },
});

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

/** POST one file to our own server, resolving to its public URL. */
async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API}/book-content/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}` },
    body: fd,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.message || 'আপলোড ব্যর্থ হয়েছে');
  return body.data.fileUrl;
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px'];
const FONT_FAMILIES = [
  { label: 'ডিফল্ট', value: '' },
  { label: 'Hind Siliguri (বাংলা)', value: 'Hind Siliguri' },
  { label: 'SolaimanLipi (বাংলা)', value: 'SolaimanLipi' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Courier New', value: 'Courier New' },
];
const TEXT_COLORS = [
  '#0f172a', '#dc2626', '#ea580c', '#ca8a04',
  '#16a34a', '#0891b2', '#2563eb', '#7c3aed',
];
const HIGHLIGHTS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e9d5ff'];

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()} // keep the selection while clicking
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 rounded flex items-center justify-center text-[15px] transition disabled:opacity-30 ${
        active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="w-px h-5 bg-slate-300 mx-1" />;

/** Small popover of colour swatches. */
function ColorMenu({ icon, title, colors, onPick, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <span ref={ref} className="relative">
      <ToolbarButton onClick={() => setOpen(o => !o)} active={open} title={title}>
        {icon}
      </ToolbarButton>
      {open && (
        <div className="absolute z-30 top-9 left-0 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-[148px]">
          <div className="grid grid-cols-4 gap-1.5">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className="w-7 h-7 rounded border border-slate-200 hover:scale-110 transition"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            className="mt-2 w-full text-[11px] text-slate-500 hover:text-slate-800 py-1 rounded hover:bg-slate-100"
          >
            মুছে ফেলুন
          </button>
        </div>
      )}
    </span>
  );
}

export default function RichTextEditor({ value, onChange, placeholder = 'উত্তর লিখুন…' }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null);

  const editor = useEditor({
    // Next renders this on the server first; without it React hydration warns.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Level 1 included because Word documents start with one. Without it
        // the title of a pasted answer is demoted to a plain paragraph.
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      // Carries colour, background, font family, size and line spacing as inline
      // styles — exactly the shape the Word cleaner emits — on spans AND on the
      // blocks Word formats directly, including table cells, whose shading has
      // nowhere else to live.
      TextStyleKit.configure({
        color: { types: STYLE_TARGETS },
        backgroundColor: { types: STYLE_TARGETS },
        fontFamily: { types: STYLE_TARGETS },
        fontSize: { types: STYLE_TARGETS },
        lineHeight: { types: STYLE_TARGETS },
      }),
      WordIndent,
      Highlight.configure({ multicolor: true }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: true } }),
      Subscript,
      Superscript,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[280px] px-4 py-3 focus:outline-none prose-headings:font-semibold prose-p:my-2 sb-answer-editor',
      },
      // Word's pictures are not in the HTML flavour of the clipboard at all —
      // that flavour only points at files on the author's own disk. The bytes
      // live in the RTF flavour, and this is the one hook that sees the paste
      // event itself, before ProseMirror throws the other flavours away.
      handleDOMEvents: {
        paste: (view, event) => {
          captureClipboardImages(event.clipboardData);
          return false;
        },
      },
      // The one hook that runs on the clipboard's HTML before ProseMirror parses
      // it. Everything the paste cleaner does has to happen here.
      transformPastedHTML: html => cleanWordHtml(html),
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // TipTap's "empty" document still serialises to <p></p>; report that as
      // empty so the answered/unanswered counters stay honest.
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // After a paste settles, move any inline/base64 images onto our own server.
  useEffect(() => {
    if (!editor) return;

    const handlePaste = () => {
      // Let ProseMirror finish inserting before walking the document.
      setTimeout(async () => {
        setUploading(true);
        try {
          const { uploaded, kept, removed } = await rehostPastedImages(editor, uploadFile);
          if (!uploaded && !kept && !removed) return;
          // A picture that could not be recovered has been taken out of the
          // document. Saying so plainly — and saying what to do instead — beats
          // letting the author discover the hole after publishing.
          const lost = kept + removed;
          setNotice({
            tone: lost ? 'warn' : 'ok',
            text: [
              uploaded ? `${uploaded}টি ছবি সার্ভারে আপলোড হয়েছে` : '',
              removed
                ? `${removed}টি ছবি ওয়ার্ড থেকে আনা যায়নি — ওয়ার্ডে ছবির উপর রাইট-ক্লিক করে "Save as Picture" দিয়ে সেভ করুন, তারপর টুলবারের ছবি বোতাম দিয়ে আপলোড করুন`
                : '',
              kept ? `${kept}টি ছবি আপলোড হয়নি — সেভ করার আগে আবার চেষ্টা করুন` : '',
            ]
              .filter(Boolean)
              .join(' · '),
          });
          setTimeout(() => setNotice(null), lost ? 15000 : 6000);
        } finally {
          setUploading(false);
        }
      }, 60);
    };

    const dom = editor.view.dom;
    dom.addEventListener('paste', handlePaste);
    return () => dom.removeEventListener('paste', handlePaste);
  }, [editor]);

  const uploadImages = useCallback(
    async files => {
      const list = Array.from(files || []).filter(isImageFile);
      if (!list.length || !editor) return;
      setUploading(true);
      try {
        for (const file of list) {
          const url = await uploadFile(file);
          editor.chain().focus().setImage({ src: url }).run();
        }
      } catch (err) {
        window.alert(err.message || 'ছবি আপলোড হয়নি');
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('লিংক দিন', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="rounded-lg border border-slate-300 min-h-[300px] flex items-center justify-center text-sm text-slate-400">
        এডিটর লোড হচ্ছে…
      </div>
    );
  }

  const selectCls =
    'h-8 rounded border border-slate-300 bg-white text-[12px] text-slate-600 px-1.5 outline-none focus:border-slate-400';

  return (
    <div className="rounded-lg border border-slate-300 overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        <select
          className={selectCls}
          title="ফন্ট"
          value={editor.getAttributes('textStyle').fontFamily || ''}
          onChange={e => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontFamily(v).run();
            else editor.chain().focus().unsetFontFamily().run();
          }}
        >
          {FONT_FAMILIES.map(f => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          className={`${selectCls} w-[68px]`}
          title="অক্ষরের আকার"
          value={editor.getAttributes('textStyle').fontSize || ''}
          onChange={e => {
            const v = e.target.value;
            if (v) editor.chain().focus().setFontSize(v).run();
            else editor.chain().focus().unsetFontSize().run();
          }}
        >
          <option value="">আকার</option>
          {FONT_SIZES.map(s => (
            <option key={s} value={s}>
              {parseInt(s, 10)}
            </option>
          ))}
        </select>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="বোল্ড"
        >
          <FiBold />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="ইটালিক"
        >
          <FiItalic />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="আন্ডারলাইন"
        >
          <FiUnderline />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="কাটা দাগ"
        >
          <LuStrikethrough />
        </ToolbarButton>

        <ColorMenu
          icon={<FiDroplet />}
          title="লেখার রঙ"
          colors={TEXT_COLORS}
          onPick={c => editor.chain().focus().setColor(c).run()}
          onClear={() => editor.chain().focus().unsetColor().run()}
        />
        <ColorMenu
          icon={<LuHighlighter />}
          title="হাইলাইট"
          colors={HIGHLIGHTS}
          onPick={c => editor.chain().focus().setHighlight({ color: c }).run()}
          onClear={() => editor.chain().focus().unsetHighlight().run()}
        />

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="প্রধান শিরোনাম"
        >
          <LuHeading1 />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="বড় শিরোনাম"
        >
          <LuHeading2 />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="ছোট শিরোনাম"
        >
          <LuHeading3 />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="বুলেট তালিকা"
        >
          <FiList />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="নম্বর তালিকা"
        >
          <LuListOrdered />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="উদ্ধৃতি"
        >
          <LuQuote />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="কোড"
        >
          <FiCode />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="আড়াআড়ি দাগ"
        >
          <FiMinus />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          active={editor.isActive('subscript')}
          title="নিচের লেখা (H₂O)"
        >
          <LuSubscript />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          active={editor.isActive('superscript')}
          title="উপরের লেখা (cm²)"
        >
          <LuSuperscript />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="বাঁয়ে"
        >
          <FiAlignLeft />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="মাঝে"
        >
          <FiAlignCenter />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="ডানে"
        >
          <FiAlignRight />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={editor.isActive({ textAlign: 'justify' })}
          title="দুই পাশে সমান"
        >
          <FiAlignJustify />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="লিংক">
          <FiLink />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          title="টেবিল যোগ করুন"
        >
          <FiGrid />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="ছবি আপলোড (একাধিক বাছাই করা যায়)"
        >
          {uploading ? <FiLoader className="animate-spin" /> : <FiImage />}
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="ফরম্যাট মুছুন"
        >
          <LuRemoveFormatting />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="আগের অবস্থা"
        >
          <FiRotateCcw />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="পরের অবস্থা"
        >
          <FiRotateCw />
        </ToolbarButton>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={e => {
            const files = e.target.files;
            uploadImages(files);
            e.target.value = '';
          }}
        />
      </div>

      {editor.isActive('table') && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-b border-slate-200 bg-amber-50/70 text-[11px]">
          <span className="text-amber-800 font-medium mr-1">টেবিল:</span>
          {[
            ['কলাম যোগ', () => editor.chain().focus().addColumnAfter().run()],
            ['কলাম মুছুন', () => editor.chain().focus().deleteColumn().run()],
            ['সারি যোগ', () => editor.chain().focus().addRowAfter().run()],
            ['সারি মুছুন', () => editor.chain().focus().deleteRow().run()],
            ['ঘর জোড়া', () => editor.chain().focus().mergeCells().run()],
            ['টেবিল মুছুন', () => editor.chain().focus().deleteTable().run()],
          ].map(([label, fn]) => (
            <button
              key={label}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={fn}
              className="px-2 py-1 rounded bg-white border border-amber-200 text-amber-800 hover:bg-amber-100"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {notice && (
        <p
          className={`px-3 py-1.5 text-[11px] border-b ${
            notice.tone === 'warn'
              ? 'text-amber-900 bg-amber-50 border-amber-200 font-medium'
              : 'text-emerald-700 bg-emerald-50 border-emerald-100'
          }`}
        >
          {notice.text}
        </p>
      )}

      <div
        className="relative"
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          const files = Array.from(e.dataTransfer?.files || []);
          if (!files.length) return;
          // Claim the drop only when every file is an image we can actually
          // inline. A PDF or a video landing on the editor belongs in the
          // page's attachment / video list, and a preventDefault here would
          // swallow it — the page-wide drop zone never sees an event that was
          // already handled, so the file would vanish with no error at all.
          // Leaving it unhandled lets it bubble up and get sorted properly.
          if (!files.every(isImageFile)) return;
          e.preventDefault();
          uploadImages(files);
        }}
      >
        <EditorContent editor={editor} />
        {editor.isEmpty && (
          <p className="absolute top-3 left-4 text-sm text-slate-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
      </div>

      <p className="px-3 py-1.5 text-[11px] text-slate-400 border-t border-slate-100 bg-slate-50/60">
        ওয়ার্ড ফাইল থেকে সরাসরি কপি-পেস্ট করুন — লেখার রঙ, আকার, বোল্ড, তালিকা ও টেবিল সবই
        ঠিক থাকবে। ছবিসহ পেস্ট করলে ছবিগুলো নিজে থেকেই সার্ভারে জমা হবে।
      </p>

      {/* Table borders are invisible without this; TipTap ships no CSS. */}
      <style jsx global>{`
        .sb-answer-editor table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.75rem 0;
          table-layout: fixed;
        }
        .sb-answer-editor th,
        .sb-answer-editor td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
          vertical-align: top;
          position: relative;
        }
        .sb-answer-editor th {
          background: #f1f5f9;
          font-weight: 600;
        }
        .sb-answer-editor .selectedCell:after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(37, 99, 235, 0.12);
          pointer-events: none;
        }
        .sb-answer-editor .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #2563eb;
          cursor: col-resize;
        }
        .sb-answer-editor img {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
}
