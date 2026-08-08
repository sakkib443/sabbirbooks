'use client';

/**
 * WordPress-style rich text editor for answer bodies.
 *
 * Stores HTML, because that is what BookQuestion.answerHtml already holds and
 * what the reader page renders.
 *
 * Images pasted or picked here are uploaded to our own server through
 * /book-content/upload and referenced by URL — never inlined as base64, which
 * would bloat every question document and blow past the 10mb JSON body limit.
 */

import { useCallback, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
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
  FiCode,
  FiLoader,
} from 'react-icons/fi';
import { LuHeading2, LuHeading3, LuListOrdered, LuQuote, LuRemoveFormatting } from 'react-icons/lu';

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

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

export default function RichTextEditor({ value, onChange, placeholder = 'উত্তর লিখুন…' }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    // Next renders this on the server first; without it React hydration warns.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[260px] px-4 py-3 focus:outline-none prose-headings:font-semibold prose-p:my-2',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // TipTap's "empty" document still serialises to <p></p>; report that as
      // empty so the answered/unanswered counters stay honest.
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  const uploadImage = useCallback(
    async file => {
      if (!file || !editor) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API}/book-content/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}` },
          body: fd,
        });
        const body = await res.json();
        if (body.success) {
          editor.chain().focus().setImage({ src: body.data.fileUrl }).run();
        } else {
          window.alert(body.message || 'ছবি আপলোড হয়নি');
        }
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

  return (
    <div className="rounded-lg border border-slate-300 overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
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

        <Divider />

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

        <Divider />

        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="লিংক">
          <FiLink />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="ছবি আপলোড"
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
          hidden
          onChange={e => {
            const f = e.target.files?.[0];
            e.target.value = '';
            uploadImage(f);
          }}
        />
      </div>

      <div className="relative">
        <EditorContent editor={editor} />
        {editor.isEmpty && (
          <p className="absolute top-3 left-4 text-sm text-slate-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
}
