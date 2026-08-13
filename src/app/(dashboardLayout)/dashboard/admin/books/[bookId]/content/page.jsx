'use client';

/**
 * Admin book-content editor.
 *
 * Left: the Part → Chapter → Topic tree with per-topic answer progress.
 * Right: the selected topic's questions and the answer form.
 *
 * There are 381 placeholder questions in Anatomy MAGIC VIVA, so the progress
 * counters and the "next unanswered" jump are what make finishing the book
 * feasible — they are not decoration.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  FiChevronDown,
  FiChevronRight,
  FiSave,
  FiPlus,
  FiTrash2,
  FiGrid,
  FiSkipForward,
  FiUpload,
  FiLoader,
  FiFileText,
  FiVideo,
  FiYoutube,
  FiExternalLink,
  FiEdit2,
  FiX,
  FiImage,
  FiChevronLeft,
  FiEye,
} from 'react-icons/fi';
import FileDropZone from '@/components/shared/FileDropZone';

// The editor touches window/document on mount, so it must not be part of the
// server bundle.
const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-slate-300 min-h-[300px] flex items-center justify-center text-sm text-slate-400">
      এডিটর লোড হচ্ছে…
    </div>
  ),
});

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const hdrs = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
});

const EMPTY_VIDEO = { title: '', url: '', provider: 'youtube' };

// Both halves matter: a file dragged off the desktop sometimes arrives with an
// empty `type` (Windows does this for less common extensions), and a file
// picked through the dialog sometimes has a type but a name we do not know.
const isImage = f =>
  f.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.test(f.name || '');

const isVideo = f =>
  f.type?.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(f.name || '');

const formatSize = bytes => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
};

/** Progress for the file currently going up, plus its place in the queue. */
function UploadBar({ pct, queue }) {
  return (
    <div className="mb-3">
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-500 mt-1">
        {queue ? `${queue.index}/${queue.total} — ` : ''}আপলোড হচ্ছে {pct}%
      </p>
    </div>
  );
}

/**
 * Uploads a PDF or answer video to our own server.
 *
 * XHR rather than fetch because a 50MB video needs a progress bar, and fetch
 * still cannot report upload progress.
 */
function uploadToServer(file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/book-content/upload`);
    xhr.setRequestHeader(
      'Authorization',
      `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`
    );

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error('নেটওয়ার্ক সমস্যা — আপলোড হয়নি'));
    xhr.onload = () => {
      let body;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Nginx/Traefik rejects an oversized body before Express sees it, and
        // answers with HTML rather than JSON.
        return reject(
          new Error(
            xhr.status === 413
              ? 'ফাইলটি সার্ভারের সীমার চেয়ে বড়'
              : `আপলোড ব্যর্থ (HTTP ${xhr.status})`
          )
        );
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.success) resolve(body.data);
      else reject(new Error(body.message || 'আপলোড ব্যর্থ হয়েছে'));
    };

    xhr.send(fd);
  });
}

export default function BookContentEditorPage() {
  const { bookId } = useParams();

  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [expanded, setExpanded] = useState({});
  const [activeTopic, setActiveTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');

  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [busyUpload, setBusyUpload] = useState(null); // 'video' | 'file' | 'image' | null
  const [uploadPct, setUploadPct] = useState(null);
  // "3 of 7" while a multi-file selection uploads.
  const [uploadQueue, setUploadQueue] = useState(null);
  const [imageDragging, setImageDragging] = useState(false);

  // { level: 'part'|'chapter'|'topic', mode: 'create'|'edit',
  //   parent?: { partId?, chapterId? }, node?, values }
  const [nodeModal, setNodeModal] = useState(null);
  const [nodeSaving, setNodeSaving] = useState(false);
  const [nodeError, setNodeError] = useState('');

  // Videos sit on the VPS disk alongside everything else, so a soft cap keeps
  // one careless 500MB lecture recording from filling the volume. Long videos
  // belong on YouTube; this is for short clips.
  const VIDEO_SOFT_LIMIT_MB = 100;

  /**
   * Upload a whole selection, one file at a time, appending each result to the
   * draft as it lands.
   *
   * Sequential rather than parallel on purpose: these are 50MB videos going up a
   * home broadband connection, and six at once means six that all crawl and one
   * useless progress bar. One at a time gives an honest "3 of 7 · 62%", and a
   * failure half way through keeps everything already uploaded.
   */
  const uploadMany = async (files, kind, toEntry) => {
    const list = Array.from(files || []);
    if (!list.length) return;

    setBusyUpload(kind);
    setFlash('');
    const failures = [];
    let done = 0;

    for (const [index, file] of list.entries()) {
      setUploadQueue(list.length > 1 ? { index: index + 1, total: list.length } : null);
      setUploadPct(0);
      try {
        const data = await uploadToServer(file, setUploadPct);
        // The admin can click away to another question mid-upload, which nulls
        // the draft — dropping the result beats throwing on `d.videos`.
        setDraft(d => (d ? toEntry(d, data) : d));
        done++;
      } catch (err) {
        failures.push(`${file.name}: ${err.message}`);
      }
    }

    setBusyUpload(null);
    setUploadPct(null);
    setUploadQueue(null);

    if (failures.length) {
      setFlash(
        `${done}টি আপলোড হয়েছে, ${failures.length}টি হয়নি — ${failures[0]}`
      );
    } else {
      setFlash(`${done}টি ফাইল আপলোড হয়েছে — সংরক্ষণ করতে ভুলবেন না`);
      setTimeout(() => setFlash(''), 4000);
    }
  };

  const handleVideoUpload = async files => {
    const list = Array.from(files || []);
    const tooBig = list.filter(f => f.size / (1024 * 1024) > VIDEO_SOFT_LIMIT_MB);
    const ok = list.filter(f => f.size / (1024 * 1024) <= VIDEO_SOFT_LIMIT_MB);

    if (tooBig.length) {
      setFlash(
        `${tooBig.length}টি ভিডিও ${VIDEO_SOFT_LIMIT_MB}MB-এর চেয়ে বড় বলে বাদ গেছে (${tooBig[0].name})। বড় ভিডিও ইউটিউবে দিয়ে লিংক বসান।`
      );
    }
    if (!ok.length) return;

    await uploadMany(ok, 'video', (d, data) => ({
      ...d,
      videos: [
        ...d.videos,
        {
          title: data.fileName?.replace(/\.[^.]+$/, '') || 'ভিডিও',
          url: data.fileUrl,
          provider: 'upload',
          fileName: data.fileName,
          fileSize: data.size,
        },
      ],
    }));
  };

  const handleFileUpload = files =>
    uploadMany(files, 'file', (d, data) => ({
      ...d,
      attachments: [
        ...d.attachments,
        {
          title: data.fileName?.replace(/\.[^.]+$/, '') || 'ফাইল',
          fileUrl: data.fileUrl,
          fileType: data.fileType,
          fileSize: data.size,
        },
      ],
    }));

  const handleImageUpload = files => {
    const images = Array.from(files || []).filter(isImage);
    if (!images.length) {
      setFlash('শুধু ছবি ফাইল (JPG, PNG, WebP) দেওয়া যাবে');
      return;
    }
    return uploadMany(images, 'image', (d, data) => ({
      ...d,
      images: [...(d.images || []), data.fileUrl],
    }));
  };

  /**
   * A drop anywhere on the page, sorted into the three buckets by file type —
   * so a mixed selection of scans, a clip and a PDF lands where each belongs
   * without the admin aiming at three separate boxes.
   *
   * Sequential because uploadMany owns a single progress bar and a single
   * busyUpload flag; running the buckets concurrently would have them
   * overwrite each other's percentage.
   */
  const handleDroppedFiles = async files => {
    const list = Array.from(files || []);
    if (!list.length) return;

    const images = list.filter(isImage);
    const videos = list.filter(isVideo);
    const rest = list.filter(f => !isImage(f) && !isVideo(f));

    if (images.length) await handleImageUpload(images);
    if (videos.length) await handleVideoUpload(videos);
    if (rest.length) await handleFileUpload(rest);
  };

  /** Move an image one slot left/right — reader sees them in this order. */
  const moveImage = (from, to) =>
    setDraft(d => {
      const images = [...(d.images || [])];
      if (to < 0 || to >= images.length) return d;
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      return { ...d, images };
    });

  // ─── Load tree ────────────────────────────────────────────
  const loadTree = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/book-content/tree/${bookId}`, { headers: hdrs() });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'Could not load book');
      setTree(body.data);
      // Open the first part so the editor is never a blank slate.
      const first = body.data?.parts?.[0];
      if (first) setExpanded(e => ({ ...e, [first._id]: true }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // ─── Load one topic's questions ───────────────────────────
  const openTopic = useCallback(async topic => {
    setActiveTopic(topic);
    setActiveQuestionId(null);
    setDraft(null);
    try {
      const res = await fetch(`${API}/book-content/questions/topic/${topic._id}`, {
        headers: hdrs(),
      });
      const body = await res.json();
      setQuestions(body.data || []);
    } catch {
      setQuestions([]);
    }
  }, []);

  const openQuestion = q => {
    setActiveQuestionId(q._id);
    setDraft({
      questionNo: q.questionNo || '',
      questionText: q.questionText || '',
      answerHtml: q.answerHtml || '',
      videos: q.videos?.length ? q.videos : [],
      attachments: q.attachments?.length ? q.attachments : [],
      // The model has always had an images array and the reader has always
      // rendered it; this form simply never filled it in, so the gallery was
      // permanently empty no matter what the admin uploaded.
      images: q.images?.length ? q.images : [],
    });
  };

  const saveQuestion = async () => {
    if (!activeQuestionId || !draft) return;
    setSaving(true);
    setFlash('');
    try {
      const res = await fetch(`${API}/book-content/questions/${activeQuestionId}`, {
        method: 'PATCH',
        headers: hdrs(),
        body: JSON.stringify({
          ...draft,
          // Drop half-filled rows rather than storing blank urls.
          videos: draft.videos.filter(v => v.url?.trim()),
          attachments: draft.attachments.filter(a => a.fileUrl?.trim()),
          images: (draft.images || []).filter(src => String(src || '').trim()),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'Save failed');

      setQuestions(qs => qs.map(q => (q._id === activeQuestionId ? body.data : q)));
      setFlash('সংরক্ষিত হয়েছে');
      // Progress counters live on the tree, so it has to be refetched.
      loadTree();
      setTimeout(() => setFlash(''), 2500);
    } catch (err) {
      setFlash(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = async () => {
    if (!activeTopic) return;
    const nextNo = String(questions.length + 1);
    const res = await fetch(`${API}/book-content/questions`, {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({
        bookId,
        chapterId: activeTopic.chapterId,
        topicId: activeTopic._id,
        questionNo: nextNo,
        order: questions.length + 1,
      }),
    });
    const body = await res.json();
    if (body.success) {
      setQuestions(qs => [...qs, body.data]);
      openQuestion(body.data);
      loadTree();
    }
  };

  const deleteQuestion = async id => {
    if (!window.confirm('এই প্রশ্নটি মুছে ফেলবেন?')) return;
    await fetch(`${API}/book-content/questions/${id}`, { method: 'DELETE', headers: hdrs() });
    setQuestions(qs => qs.filter(q => q._id !== id));
    if (activeQuestionId === id) {
      setActiveQuestionId(null);
      setDraft(null);
    }
    loadTree();
  };

  /** Jump to the next question anywhere in the book that still has no answer. */
  const jumpToNextUnanswered = async () => {
    const res = await fetch(`${API}/book-content/next-unanswered/${bookId}`, { headers: hdrs() });
    const body = await res.json();
    const next = body.data;
    if (!next) {
      setFlash('সব প্রশ্নের উত্তর দেওয়া হয়ে গেছে 🎉');
      setTimeout(() => setFlash(''), 3000);
      return;
    }
    const topic = allTopics.find(t => String(t._id) === String(next.topicId));
    if (topic) {
      setExpanded(e => ({ ...e, [topic.partId]: true, [topic.chapterId]: true }));
      await openTopic(topic);
      openQuestion(next);
    }
  };

  const allTopics = useMemo(() => {
    if (!tree) return [];
    return tree.parts.flatMap(p => p.chapters.flatMap(c => c.topics));
  }, [tree]);

  const totals = useMemo(() => {
    const t = allTopics.reduce(
      (acc, topic) => {
        acc.total += topic.totalQuestions || 0;
        acc.answered += topic.answeredQuestions || 0;
        return acc;
      },
      { total: 0, answered: 0 }
    );
    return { ...t, topics: allTopics.length };
  }, [allTopics]);

  const toggle = id => setExpanded(e => ({ ...e, [id]: !e[id] }));

  // ─── Tree CRUD (part / chapter / topic) ───────────────────
  const openCreate = (level, parent = {}) => {
    setNodeError('');
    setNodeModal({
      level,
      mode: 'create',
      parent,
      values:
        level === 'part'
          ? { title: '', titleBn: '', order: '' }
          : level === 'chapter'
          ? { chapterNo: '', title: '', titleBn: '', order: '' }
          : { topicNo: '', title: '', titleBn: '', order: '' },
    });
  };

  const openEdit = (level, node) => {
    setNodeError('');
    setNodeModal({
      level,
      mode: 'edit',
      node,
      values: {
        chapterNo: node.chapterNo || '',
        topicNo: node.topicNo || '',
        title: node.title || '',
        titleBn: node.titleBn || '',
        order: node.order ?? '',
      },
    });
  };

  const closeNodeModal = () => {
    setNodeModal(null);
    setNodeError('');
    setNodeSaving(false);
  };

  const submitNodeModal = async () => {
    if (!nodeModal) return;
    const { level, mode, parent, node, values } = nodeModal;
    if (!values.title?.trim()) {
      setNodeError('শিরোনাম দিতে হবে');
      return;
    }
    setNodeSaving(true);
    setNodeError('');
    try {
      const url =
        mode === 'create'
          ? `${API}/book-content/${level}s`
          : `${API}/book-content/${level}s/${node._id}`;

      const payload = {
        title: values.title.trim(),
        titleBn: values.titleBn?.trim() || undefined,
        ...(level !== 'part' && {
          [level === 'chapter' ? 'chapterNo' : 'topicNo']:
            (level === 'chapter' ? values.chapterNo : values.topicNo)?.trim() || undefined,
        }),
        ...(values.order !== '' && values.order !== undefined
          ? { order: Number(values.order) }
          : {}),
      };

      if (mode === 'create') {
        payload.bookId = bookId;
        if (level === 'chapter') payload.partId = parent.partId;
        if (level === 'topic') {
          payload.partId = parent.partId;
          payload.chapterId = parent.chapterId;
        }
        if (payload.order === undefined) {
          // Default: place at end
          const siblings =
            level === 'part'
              ? tree.parts
              : level === 'chapter'
              ? tree.parts.find(p => String(p._id) === String(parent.partId))?.chapters || []
              : tree.parts
                  .flatMap(p => p.chapters)
                  .find(c => String(c._id) === String(parent.chapterId))?.topics || [];
          payload.order = siblings.length + 1;
        }
      }

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: hdrs(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'সংরক্ষণ ব্যর্থ');

      // Auto-open the parent so the new row is visible
      if (mode === 'create') {
        if (level === 'chapter' && parent.partId) {
          setExpanded(e => ({ ...e, [parent.partId]: true }));
        }
        if (level === 'topic' && parent.chapterId) {
          setExpanded(e => ({
            ...e,
            [parent.partId]: true,
            [parent.chapterId]: true,
          }));
        }
      }

      await loadTree();
      closeNodeModal();
    } catch (err) {
      setNodeError(err.message);
    } finally {
      setNodeSaving(false);
    }
  };

  const deleteNode = async (level, node) => {
    const label = level === 'part' ? 'বোর্ড' : level === 'chapter' ? 'অধ্যায়' : 'টপিক';
    const warn =
      level === 'topic'
        ? `"${node.title}" টপিকটি মুছে ফেলবেন? ছাপা QR কোডটি আর কাজ করবে না।`
        : `"${node.title}" ${label} এবং এর ভেতরের সবকিছু মুছে ফেলবেন?`;
    if (!window.confirm(warn)) return;
    try {
      const res = await fetch(`${API}/book-content/${level}s/${node._id}`, {
        method: 'DELETE',
        headers: hdrs(),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'ডিলিট ব্যর্থ');

      // Clear editor if the currently-open topic was deleted (directly or by
      // deleting its ancestor chapter/part).
      if (level === 'topic' && activeTopic?._id === node._id) {
        setActiveTopic(null);
        setQuestions([]);
        setDraft(null);
        setActiveQuestionId(null);
      }
      if (level === 'chapter' && activeTopic?.chapterId === node._id) {
        setActiveTopic(null);
        setQuestions([]);
        setDraft(null);
        setActiveQuestionId(null);
      }
      if (level === 'part' && activeTopic?.partId === node._id) {
        setActiveTopic(null);
        setQuestions([]);
        setDraft(null);
        setActiveQuestionId(null);
      }

      await loadTree();
    } catch (err) {
      setFlash(err.message);
      setTimeout(() => setFlash(''), 3000);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">লোড হচ্ছে…</div>;
  }
  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600 mb-3">{error}</p>
        <button onClick={loadTree} className="text-sm text-blue-600 hover:underline">
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Drop files anywhere on the page — sorted into ছবি / ভিডিও / ফাইল by
          type. Dropping onto the answer editor still inlines the image into
          the text instead, because that handler runs first. */}
      <FileDropZone
        onFiles={handleDroppedFiles}
        disabled={!draft || Boolean(busyUpload)}
        disabledMessage={
          busyUpload ? 'আগের আপলোড শেষ হলে দিন' : 'আগে বাঁ পাশ থেকে একটি প্রশ্ন বেছে নিন'
        }
        title="ছেড়ে দিলেই আপলোড শুরু"
        hint="ছবি → ছবির ঘরে, ভিডিও → ভিডিওতে, বাকি ফাইল → অ্যাটাচমেন্টে যাবে"
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{tree?.book?.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totals.topics} টপিক · {totals.answered}/{totals.total} প্রশ্নের উত্তর দেওয়া হয়েছে
            {totals.total > 0 && (
              <span className="ml-2 text-slate-400">
                ({Math.round((totals.answered / totals.total) * 100)}%)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={jumpToNextUnanswered}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white text-sm px-4 py-2 hover:bg-slate-800 transition"
          >
            <FiSkipForward className="w-4 h-4" /> পরের অসম্পূর্ণ প্রশ্ন
          </button>
          <Link
            href={`/dashboard/admin/books/${bookId}/qr-sheet`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 text-sm px-4 py-2 hover:bg-slate-50 transition"
          >
            <FiGrid className="w-4 h-4" /> QR শিট
          </Link>
        </div>
      </div>

      {flash && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2.5">
          {flash}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* ─── Tree ──────────────────────────────────────── */}
        <aside className="rounded-xl border border-slate-200 bg-white overflow-hidden self-start">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              বইয়ের কাঠামো
            </p>
            <button
              onClick={() => openCreate('part')}
              title="নতুন বোর্ড যোগ করুন"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
            >
              <FiPlus className="w-3.5 h-3.5" /> বোর্ড
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto py-1">
            {tree?.parts?.length === 0 && (
              <p className="px-4 py-6 text-xs text-slate-400 text-center">
                এখনো কোনো বোর্ড নেই। উপরে থেকে যোগ করুন।
              </p>
            )}
            {tree?.parts?.map(part => (
              <div key={part._id}>
                <div className="group relative flex items-center hover:bg-slate-50">
                  <button
                    onClick={() => toggle(part._id)}
                    className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 text-left"
                  >
                    {expanded[part._id] ? (
                      <FiChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <FiChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {part.title}
                    </span>
                  </button>
                  <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openCreate('chapter', { partId: part._id })}
                      title="নতুন অধ্যায় যোগ"
                      className="p-1.5 rounded hover:bg-blue-100 text-slate-500 hover:text-blue-700"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEdit('part', part)}
                      title="বোর্ড এডিট"
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteNode('part', part)}
                      title="বোর্ড ডিলিট"
                      className="p-1.5 rounded hover:bg-red-100 text-slate-500 hover:text-red-700"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {expanded[part._id] && part.chapters.length === 0 && (
                  <p className="pl-10 pr-3 py-2 text-[11px] text-slate-400">
                    কোনো অধ্যায় নেই।
                  </p>
                )}

                {expanded[part._id] &&
                  part.chapters.map(chapter => (
                    <div key={chapter._id}>
                      <div className="group relative flex items-center hover:bg-slate-50">
                        <button
                          onClick={() => toggle(chapter._id)}
                          className="flex-1 min-w-0 flex items-center gap-2 pl-7 pr-3 py-2 text-left"
                        >
                          {expanded[chapter._id] ? (
                            <FiChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <FiChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="text-sm text-slate-700 truncate">
                            {chapter.chapterNo ? `${chapter.chapterNo}. ` : ''}
                            {chapter.title}
                          </span>
                        </button>
                        <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() =>
                              openCreate('topic', {
                                partId: part._id,
                                chapterId: chapter._id,
                              })
                            }
                            title="নতুন টপিক যোগ"
                            className="p-1.5 rounded hover:bg-blue-100 text-slate-500 hover:text-blue-700"
                          >
                            <FiPlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEdit('chapter', chapter)}
                            title="অধ্যায় এডিট"
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteNode('chapter', chapter)}
                            title="অধ্যায় ডিলিট"
                            className="p-1.5 rounded hover:bg-red-100 text-slate-500 hover:text-red-700"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {expanded[chapter._id] && chapter.topics.length === 0 && (
                        <p className="pl-14 pr-3 py-1.5 text-[11px] text-slate-400">
                          কোনো টপিক নেই।
                        </p>
                      )}

                      {expanded[chapter._id] &&
                        chapter.topics.map(topic => {
                          const done =
                            topic.totalQuestions > 0 &&
                            topic.answeredQuestions === topic.totalQuestions;
                          const isActive = activeTopic?._id === topic._id;
                          return (
                            <div
                              key={topic._id}
                              className={`group relative flex items-center transition ${
                                isActive
                                  ? 'bg-blue-50 border-l-2 border-blue-500'
                                  : 'hover:bg-slate-50 border-l-2 border-transparent'
                              }`}
                            >
                              <button
                                onClick={() => openTopic(topic)}
                                className="flex-1 min-w-0 flex items-center justify-between gap-2 pl-12 pr-2 py-1.5 text-left"
                              >
                                <span className="text-[13px] text-slate-600 truncate">
                                  {topic.isImplicit
                                    ? '(সরাসরি প্রশ্ন)'
                                    : `${topic.topicNo || ''} ${topic.title}`}
                                </span>
                                <span
                                  className={`text-[11px] tabular-nums shrink-0 ${
                                    done ? 'text-emerald-600' : 'text-slate-400'
                                  }`}
                                >
                                  {topic.answeredQuestions}/{topic.totalQuestions}
                                </span>
                              </button>
                              <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition">
                                <button
                                  onClick={() => openEdit('topic', topic)}
                                  title="টপিক এডিট"
                                  className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                                >
                                  <FiEdit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteNode('topic', topic)}
                                  title="টপিক ডিলিট"
                                  className="p-1.5 rounded hover:bg-red-100 text-slate-500 hover:text-red-700"
                                >
                                  <FiTrash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </aside>

        {/* ─── Editor ────────────────────────────────────── */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 lg:p-5">
          {!activeTopic ? (
            <p className="text-sm text-slate-500 py-16 text-center">
              বাঁ পাশ থেকে একটি টপিক বেছে নিন।
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {activeTopic.isImplicit
                      ? activeTopic.title
                      : `${activeTopic.topicNo} ${activeTopic.title}`}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    QR কোড: <code className="font-mono text-slate-700">{activeTopic.qrCode}</code>
                    <span className="ml-2 text-slate-400">(ছাপা হয়ে গেলে আর বদলানো যাবে না)</span>
                  </p>
                </div>
                <button
                  onClick={addQuestion}
                  className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  <FiPlus className="w-4 h-4" /> প্রশ্ন যোগ
                </button>
              </div>

              {/* Question numbers */}
              <div className="flex flex-wrap gap-1.5 py-4">
                {questions.map(q => {
                  const answered = Boolean(q.answerHtml?.trim());
                  return (
                    <button
                      key={q._id}
                      onClick={() => openQuestion(q)}
                      title={q.questionText || `প্রশ্ন ${q.questionNo}`}
                      className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium border transition ${
                        activeQuestionId === q._id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : answered
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {q.questionNo}
                    </button>
                  );
                })}
                {questions.length === 0 && (
                  <p className="text-sm text-slate-500">এই টপিকে এখনো কোনো প্রশ্ন নেই।</p>
                )}
              </div>

              {/* Form */}
              {draft && (
                <div className="space-y-4 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">নম্বর</label>
                      <input
                        value={draft.questionNo}
                        onChange={e => setDraft(d => ({ ...d, questionNo: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">প্রশ্ন</label>
                      <input
                        value={draft.questionText}
                        onChange={e => setDraft(d => ({ ...d, questionText: e.target.value }))}
                        placeholder="প্রশ্নটি লিখুন"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">উত্তর</label>
                    {/* Remounted per question: the editor keeps its own document
                        state, so without the key it would keep showing the
                        previous question's answer. */}
                    <RichTextEditor
                      key={activeQuestionId}
                      value={draft.answerHtml}
                      onChange={html => setDraft(d => ({ ...d, answerHtml: html }))}
                    />
                  </div>

                  {/* Images — the reader shows these right after the answer text */}
                  <div
                    className={`rounded-lg border p-3 transition ${
                      imageDragging
                        ? 'border-blue-400 bg-blue-50/60'
                        : 'border-slate-200'
                    }`}
                    onDragOver={e => {
                      e.preventDefault();
                      setImageDragging(true);
                    }}
                    onDragLeave={() => setImageDragging(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setImageDragging(false);
                      if (e.dataTransfer?.files?.length) handleImageUpload(e.dataTransfer.files);
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <FiImage className="w-3.5 h-3.5" /> ছবি
                        {draft.images?.length > 0 && (
                          <span className="text-slate-400">({draft.images.length}টি)</span>
                        )}
                      </label>
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={busyUpload === 'image'}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        {busyUpload === 'image' ? (
                          <FiLoader className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FiUpload className="w-3.5 h-3.5" />
                        )}
                        ছবি আপলোড
                      </button>
                    </div>

                    {busyUpload === 'image' && uploadPct !== null && (
                      <UploadBar pct={uploadPct} queue={uploadQueue} />
                    )}

                    {draft.images?.length ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {draft.images.map((src, i) => (
                          <div
                            key={`${src}-${i}`}
                            className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`ছবি ${i + 1}`}
                              className="w-full h-full object-cover"
                              onError={e => {
                                e.currentTarget.style.opacity = 0.25;
                              }}
                            />
                            <span className="absolute top-1 left-1 text-[10px] bg-slate-900/70 text-white rounded px-1.5 py-0.5">
                              {i + 1}
                            </span>
                            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-slate-900/70 opacity-0 group-hover:opacity-100 transition">
                              <button
                                title="আগে সরান"
                                disabled={i === 0}
                                onClick={() => moveImage(i, i - 1)}
                                className="p-1 text-white disabled:opacity-30 hover:bg-white/20"
                              >
                                <FiChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="বড় করে দেখুন"
                                className="p-1 text-white hover:bg-white/20"
                              >
                                <FiEye className="w-3.5 h-3.5" />
                              </a>
                              <button
                                title="মুছে ফেলুন"
                                onClick={() =>
                                  setDraft(d => ({
                                    ...d,
                                    images: d.images.filter((_, j) => j !== i),
                                  }))
                                }
                                className="p-1 text-white hover:bg-red-500/70"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="পরে সরান"
                                disabled={i === draft.images.length - 1}
                                onClick={() => moveImage(i, i + 1)}
                                className="p-1 text-white disabled:opacity-30 hover:bg-white/20 rotate-180"
                              >
                                <FiChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        কোনো ছবি যোগ করা হয়নি। একসাথে কয়েকটা ছবি বাছাই করতে পারেন, বা এখানে
                        টেনে এনে ছাড়তে পারেন।
                      </p>
                    )}
                  </div>

                  {/* Videos — a YouTube link, or a file that lands on our server */}
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <FiVideo className="w-3.5 h-3.5" /> ভিডিও
                        {draft.videos?.length > 0 && (
                          <span className="text-slate-400">({draft.videos.length}টি)</span>
                        )}
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setDraft(d => ({ ...d, videos: [...d.videos, { ...EMPTY_VIDEO }] }))
                          }
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <FiYoutube className="w-3.5 h-3.5" /> ইউটিউব লিংক
                        </button>
                        <button
                          onClick={() => videoInputRef.current?.click()}
                          disabled={busyUpload === 'video'}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                        >
                          {busyUpload === 'video' ? (
                            <FiLoader className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FiUpload className="w-3.5 h-3.5" />
                          )}
                          ভিডিও আপলোড
                        </button>
                      </div>
                    </div>

                    {uploadPct !== null && busyUpload === 'video' && (
                      <UploadBar pct={uploadPct} queue={uploadQueue} />
                    )}

                    {draft.videos.length === 0 && (
                      <p className="text-xs text-slate-400">কোনো ভিডিও যোগ করা হয়নি।</p>
                    )}

                    {draft.videos.map((v, i) => (
                      <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
                        <span
                          className={`text-[10px] px-2 py-1 rounded font-medium shrink-0 ${
                            v.provider === 'upload'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {v.provider === 'upload' ? 'সার্ভারে' : 'ইউটিউব'}
                        </span>
                        <input
                          value={v.title || ''}
                          onChange={e =>
                            setDraft(d => {
                              const videos = [...d.videos];
                              videos[i] = { ...videos[i], title: e.target.value };
                              return { ...d, videos };
                            })
                          }
                          placeholder="শিরোনাম"
                          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        {v.provider === 'upload' ? (
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-0 text-sm text-slate-600 truncate hover:text-blue-600 flex items-center gap-1.5"
                          >
                            <FiExternalLink className="w-3.5 h-3.5 shrink-0" />
                            {v.fileName || v.url}
                            {v.fileSize ? (
                              <span className="text-slate-400">({formatSize(v.fileSize)})</span>
                            ) : null}
                          </a>
                        ) : (
                          <input
                            value={v.url}
                            onChange={e =>
                              setDraft(d => {
                                const videos = [...d.videos];
                                videos[i] = { ...videos[i], url: e.target.value };
                                return { ...d, videos };
                              })
                            }
                            placeholder="https://youtube.com/watch?v=…"
                            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                        )}
                        <button
                          onClick={() =>
                            setDraft(d => ({ ...d, videos: d.videos.filter((_, j) => j !== i) }))
                          }
                          className="text-slate-400 hover:text-red-600 px-2"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* PDFs / files — uploaded, not pasted */}
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <FiFileText className="w-3.5 h-3.5" /> PDF / ফাইল
                      </label>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busyUpload === 'file'}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        {busyUpload === 'file' ? (
                          <FiLoader className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FiUpload className="w-3.5 h-3.5" />
                        )}
                        ফাইল আপলোড
                      </button>
                    </div>

                    {uploadPct !== null && busyUpload === 'file' && (
                      <UploadBar pct={uploadPct} queue={uploadQueue} />
                    )}

                    {draft.attachments.length === 0 && (
                      <p className="text-xs text-slate-400">কোনো ফাইল যোগ করা হয়নি।</p>
                    )}

                    {draft.attachments.map((a, i) => (
                      <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
                        <span className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium uppercase shrink-0">
                          {a.fileType}
                        </span>
                        <input
                          value={a.title}
                          onChange={e =>
                            setDraft(d => {
                              const attachments = [...d.attachments];
                              attachments[i] = { ...attachments[i], title: e.target.value };
                              return { ...d, attachments };
                            })
                          }
                          placeholder="শিরোনাম"
                          className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <a
                          href={a.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0 text-sm text-slate-500 truncate hover:text-blue-600 flex items-center gap-1.5"
                        >
                          <FiExternalLink className="w-3.5 h-3.5 shrink-0" />
                          {a.fileUrl.split('/').pop()}
                          {a.fileSize ? (
                            <span className="text-slate-400">({formatSize(a.fileSize)})</span>
                          ) : null}
                        </a>
                        <button
                          onClick={() =>
                            setDraft(d => ({
                              ...d,
                              attachments: d.attachments.filter((_, j) => j !== i),
                            }))
                          }
                          className="text-slate-400 hover:text-red-600 px-2"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* All three accept a whole selection — `multiple` is the fix
                      for "একাধিক ছবি বা ভিডিও আপলোড দেওয়ার অপশন". */}
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                    multiple
                    hidden
                    onChange={e => {
                      const files = e.target.files;
                      handleVideoUpload(files);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt"
                    multiple
                    hidden
                    onChange={e => {
                      const files = e.target.files;
                      handleFileUpload(files);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={e => {
                      const files = e.target.files;
                      handleImageUpload(files);
                      e.target.value = '';
                    }}
                  />

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={saveQuestion}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm px-5 py-2.5 hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      <FiSave className="w-4 h-4" /> {saving ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ'}
                    </button>
                    <button
                      onClick={() => deleteQuestion(activeQuestionId)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      মুছে ফেলুন
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ─── Add / Edit modal for part / chapter / topic ─── */}
      {nodeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeNodeModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">
                {nodeModal.mode === 'create' ? 'নতুন ' : ''}
                {nodeModal.level === 'part'
                  ? 'বোর্ড'
                  : nodeModal.level === 'chapter'
                  ? 'অধ্যায়'
                  : 'টপিক'}
                {nodeModal.mode === 'edit' ? ' এডিট' : ' যোগ'}
              </h3>
              <button
                onClick={closeNodeModal}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {nodeModal.level === 'chapter' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    অধ্যায় নম্বর
                  </label>
                  <input
                    value={nodeModal.values.chapterNo}
                    onChange={e =>
                      setNodeModal(m => ({
                        ...m,
                        values: { ...m.values, chapterNo: e.target.value },
                      }))
                    }
                    placeholder="যেমন: ১, ২.১"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              {nodeModal.level === 'topic' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    টপিক নম্বর
                  </label>
                  <input
                    value={nodeModal.values.topicNo}
                    onChange={e =>
                      setNodeModal(m => ({
                        ...m,
                        values: { ...m.values, topicNo: e.target.value },
                      }))
                    }
                    placeholder="যেমন: ১.১"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  শিরোনাম <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={nodeModal.values.title}
                  onChange={e =>
                    setNodeModal(m => ({
                      ...m,
                      values: { ...m.values, title: e.target.value },
                    }))
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !nodeSaving) submitNodeModal();
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  বাংলা শিরোনাম
                </label>
                <input
                  value={nodeModal.values.titleBn}
                  onChange={e =>
                    setNodeModal(m => ({
                      ...m,
                      values: { ...m.values, titleBn: e.target.value },
                    }))
                  }
                  placeholder="ঐচ্ছিক"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  ক্রম (order)
                </label>
                <input
                  type="number"
                  value={nodeModal.values.order}
                  onChange={e =>
                    setNodeModal(m => ({
                      ...m,
                      values: { ...m.values, order: e.target.value },
                    }))
                  }
                  placeholder="খালি রাখলে শেষে যোগ হবে"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              {nodeError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {nodeError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                onClick={closeNodeModal}
                className="text-sm px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200"
              >
                বাতিল
              </button>
              <button
                onClick={submitNodeModal}
                disabled={nodeSaving}
                className="inline-flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <FiSave className="w-3.5 h-3.5" />
                {nodeSaving ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
