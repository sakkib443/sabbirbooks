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
  FiMenu,
  FiMove,
  FiHash,
  FiRotateCcw,
  FiCheck,
  FiLock,
} from 'react-icons/fi';
// First framer-motion use in this project — the rest of the app animates with
// CSS keyframes. It is here for Reorder, which owns the measure/swap/settle
// dance that hand-rolled drag reordering always gets subtly wrong on touch.
import { MotionConfig, Reorder, useDragControls } from 'framer-motion';
import FileDropZone from '@/components/shared/FileDropZone';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { currentCan } from '@/lib/permissions';

// The editor touches window/document on mount, so it must not be part of the
// server bundle.
const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-dash-line-strong min-h-[300px] flex items-center justify-center text-sm text-dash-mute2">
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

// How long the "ফিরিয়ে আনুন" bar stays up after a delete. Long enough to read
// the toast, notice the mistake and reach for it on a tablet.
const UNDO_WINDOW_MS = 20000;

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

// ─── Question serials ───────────────────────────────────────
//
// A serial may be typed as "12", "১২" or "১২ক". The server owns the placement
// rule; everything here only mirrors it, so the admin can see what a number is
// about to do to its neighbours before committing to it.

const BN_ZERO = 0x09e6;

const asciiDigits = value =>
  String(value ?? '').replace(/[০-৯]/g, d => String(d.charCodeAt(0) - BN_ZERO));

const bengaliDigits = n => String(n).replace(/\d/g, d => String.fromCharCode(BN_ZERO + Number(d)));

const sameSerial = (a, b) =>
  asciiDigits(a).trim().toLowerCase() === asciiDigits(b).trim().toLowerCase();

/** Leading integer of a serial — "১২ক" → 12 — or null when it has none. */
const serialValue = value => {
  const match = /^\s*(\d+)/.exec(asciiDigits(value));
  return match ? Number(match[1]) : null;
};

const bumpSerial = questionNo => {
  const value = serialValue(questionNo);
  return /[০-৯]/.test(questionNo) ? bengaliDigits(value + 1) : String(value + 1);
};

const isPlainSerial = value => /^\s*\d+\s*$/.test(asciiDigits(value));

/** Where this number would land, and who it would push down to get there. */
const previewPlacement = (questions, questionNo) => {
  const no = String(questionNo || '').trim();
  if (!no) return null;

  const clash = questions.find(q => sameSerial(q.questionNo, no));
  if (clash) {
    const moved = questions
      .slice(questions.indexOf(clash))
      .filter(q => isPlainSerial(q.questionNo))
      .map(q => `${q.questionNo} → ${bumpSerial(q.questionNo)}`);
    return {
      kind: 'shift',
      at: clash.questionNo,
      moved: moved.slice(0, 3).join(', ') + (moved.length > 3 ? ' …' : ''),
    };
  }

  const value = serialValue(no);
  const next =
    value === null
      ? undefined
      : questions.find(q => {
          const v = serialValue(q.questionNo);
          return v !== null && v > value;
        });

  return next ? { kind: 'gap', before: next.questionNo } : { kind: 'append' };
};

/** Serial to prefill the add dialog with — one past the highest already used. */
const nextSerial = questions => {
  let best = null;
  for (const q of questions) {
    const value = serialValue(q.questionNo);
    if (value !== null && (best === null || value >= best.value)) {
      best = { value, source: q.questionNo };
    }
  }
  return best ? bumpSerial(best.source) : String(questions.length + 1);
};

/**
 * The serials this topic would carry if renumbered 1…n down the list as it now
 * stands, listing only the rows that would actually change.
 *
 * Script follows whatever the topic already uses: a book printed with ১২ must
 * not come back renumbered as 12.
 */
const renumberPlan = questions => {
  const bengali = questions.some(q => /[০-৯]/.test(String(q.questionNo ?? '')));
  return questions
    .map((q, i) => ({
      _id: q._id,
      from: String(q.questionNo ?? ''),
      to: bengali ? bengaliDigits(i + 1) : String(i + 1),
    }))
    .filter(p => p.from !== p.to);
};

/**
 * What a delete would take with it, in words.
 *
 * The old window.confirm could only ask "sure?", so an admin clearing out a
 * numbering mistake had no way to notice they were also deleting an answer
 * with six figures attached to it.
 */
const describeContents = q => {
  const carried = [];
  if (q.answerHtml?.trim()) carried.push('লেখা উত্তর');
  if (q.images?.length) carried.push(`${q.images.length}টি ছবি`);
  if (q.videos?.length) carried.push(`${q.videos.length}টি ভিডিও`);
  if (q.attachments?.length) carried.push(`${q.attachments.length}টি ফাইল`);
  return carried;
};

/**
 * Where the board / chapter / topic edit button used to be.
 *
 * A padlock rather than a disabled pencil: a greyed-out button reads as "not
 * allowed right now" and invites a support message asking to be given the
 * permission. Nobody has this permission — the names and numbers are printed in
 * a book that has already shipped, and the QR codes on those pages point at
 * these rows. The server refuses the write too; this is only what makes the
 * refusal visible before it is attempted.
 */
const LockedStructure = ({ label }) => (
  <span
    title={`${label}ের নাম ও নম্বর স্থায়ী — ছাপা বইয়ের QR কোড এগুলোর সাথেই বাঁধা। ভেতরের প্রশ্ন এডিট করা যাবে।`}
    className="p-1.5 rounded text-dash-mute2 cursor-help"
  >
    <FiLock className="w-3.5 h-3.5" />
  </span>
);

/**
 * One draggable row while the list is being rearranged.
 *
 * The gesture starts from the handle alone (`dragListener={false}` plus
 * dragControls). That is not styling: handing the whole row to the drag makes
 * framer-motion set `touch-action: pan-x` on it, and a tablet then cannot
 * scroll the page past a long topic. Confining it to the handle leaves normal
 * scrolling — and the row's own click — working.
 */
function QuestionOrderRow({
  question,
  active,
  canDelete,
  locked,
  onOpen,
  onDelete,
  onDragStart,
  onDrop,
}) {
  const controls = useDragControls();
  const answered = Boolean(question.answerHtml?.trim());

  return (
    <Reorder.Item
      as="div"
      value={question}
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDrop}
      className={`flex items-center gap-2 rounded-lg border bg-dash-card pr-1.5 py-1.5 select-none ${
        active ? 'border-blue-500 ring-1 ring-blue-200' : 'border-dash-line'
      }`}
    >
      <button
        type="button"
        aria-label={`প্রশ্ন ${question.questionNo} সরান`}
        title={locked ? 'আগের ক্রম সংরক্ষণ হচ্ছে…' : 'ধরে টেনে ক্রম বদলান'}
        disabled={locked}
        // A second drag started while the first is still being saved would race
        // the two writes, and the loser silently wins on the server.
        onPointerDown={e => {
          if (!locked) controls.start(e);
        }}
        // touch-none on the handle only: without it the browser claims the
        // gesture as a page scroll before framer-motion ever sees it.
        className="shrink-0 touch-none p-2 rounded-md text-dash-mute2 hover:text-dash-ink3 hover:bg-dash-soft cursor-grab active:cursor-grabbing disabled:cursor-wait disabled:opacity-40"
      >
        <FiMenu className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
      >
        <span
          className={`min-w-9 h-8 px-2 inline-flex items-center justify-center rounded-lg text-sm font-medium border shrink-0 ${
            active
              ? 'bg-blue-600 text-white border-blue-600'
              : answered
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-dash-card text-dash-mute border-dash-line'
          }`}
        >
          {question.questionNo}
        </span>
        <span className="flex-1 min-w-0 truncate text-[13px] text-dash-ink4">
          {question.questionText || <span className="text-dash-mute2">প্রশ্নের লেখা নেই</span>}
        </span>
      </button>

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          title={`প্রশ্ন ${question.questionNo} মুছে ফেলুন`}
          aria-label={`প্রশ্ন ${question.questionNo} মুছে ফেলুন`}
          className="shrink-0 p-2 rounded-md text-dash-mute2 hover:text-red-600 hover:bg-red-50 transition"
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      )}
    </Reorder.Item>
  );
}

/** Progress for the file currently going up, plus its place in the queue. */
function UploadBar({ pct, queue }) {
  return (
    <div className="mb-3">
      <div className="h-1.5 rounded-full bg-dash-soft3 overflow-hidden">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-dash-mute mt-1">
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
  // The banner carries failures as well as successes — "could not save the new
  // order" printed in the success green is a message that reads as its own
  // opposite, so the tone travels with the text.
  const [flash, setFlash] = useState(null); // { text, tone: 'success' | 'error' }
  const flashTimer = useRef(null);

  const notify = useCallback((text, tone = 'success', ms = 2500) => {
    clearTimeout(flashTimer.current);
    setFlash(text ? { text, tone } : null);
    if (text && ms) flashTimer.current = setTimeout(() => setFlash(null), ms);
  }, []);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // Read after mount: currentCan() reads localStorage, so deciding during the
  // server render would hydrate a different tree.
  const [canDelete, setCanDelete] = useState(false);
  useEffect(() => setCanDelete(currentCan('records.delete')), []);

  const { confirm, confirmNode } = useConfirm();

  // Drag-to-reorder is a mode rather than always-on: these chips are how the
  // admin navigates 381 questions, and a click that lands as a two-pixel drag
  // would rewrite a printed book's order by accident.
  const [reordering, setReordering] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [renumbering, setRenumbering] = useState(false);
  // The order as it stood when the drag began, to put back if the save fails.
  const orderBeforeDrag = useRef(null);

  // A delete is soft server-side, so a misclick is recoverable — but only for
  // as long as the admin is still being offered the way back.
  const [undo, setUndo] = useState(null); // { id, questionNo, topicId }
  const [restoring, setRestoring] = useState(false);
  const undoTimer = useRef(null);

  const armUndo = useCallback(entry => {
    clearTimeout(undoTimer.current);
    setUndo(entry);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_WINDOW_MS);
  }, []);

  const dismissUndo = useCallback(() => {
    clearTimeout(undoTimer.current);
    setUndo(null);
  }, []);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

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

  // { questionNo } — the serial a new question is being inserted at.
  const [addModal, setAddModal] = useState(null);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

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
    notify('');
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
      notify(`${done}টি আপলোড হয়েছে, ${failures.length}টি হয়নি — ${failures[0]}`, 'error', 0);
    } else {
      notify(`${done}টি ফাইল আপলোড হয়েছে — সংরক্ষণ করতে ভুলবেন না`, 'success', 4000);
    }
  };

  const handleVideoUpload = async files => {
    const list = Array.from(files || []);
    const tooBig = list.filter(f => f.size / (1024 * 1024) > VIDEO_SOFT_LIMIT_MB);
    const ok = list.filter(f => f.size / (1024 * 1024) <= VIDEO_SOFT_LIMIT_MB);

    if (tooBig.length) {
      notify(
        `${tooBig.length}টি ভিডিও ${VIDEO_SOFT_LIMIT_MB}MB-এর চেয়ে বড় বলে বাদ গেছে (${tooBig[0].name})। বড় ভিডিও ইউটিউবে দিয়ে লিংক বসান।`,
        'error',
        0
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
      notify('শুধু ছবি ফাইল (JPG, PNG, WebP) দেওয়া যাবে', 'error', 4000);
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
  const loadQuestions = useCallback(async topicId => {
    try {
      const res = await fetch(`${API}/book-content/questions/topic/${topicId}`, {
        headers: hdrs(),
      });
      const body = await res.json();
      setQuestions(body.data || []);
    } catch {
      setQuestions([]);
    }
  }, []);

  const openTopic = useCallback(
    async topic => {
      setActiveTopic(topic);
      setActiveQuestionId(null);
      setDraft(null);
      // Rearranging is per-topic; carrying the mode across would put the next
      // topic straight into drag mode nobody asked for.
      setReordering(false);
      await loadQuestions(topic._id);
    },
    [loadQuestions]
  );

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
    notify('');
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
      notify('সংরক্ষিত হয়েছে');
      // Progress counters live on the tree, so it has to be refetched.
      loadTree();
    } catch (err) {
      notify(err.message, 'error', 0);
    } finally {
      setSaving(false);
    }
  };

  const openAddQuestion = () => {
    if (!activeTopic) return;
    setAddError('');
    setAddModal({ questionNo: nextSerial(questions) });
  };

  const closeAddQuestion = () => {
    setAddModal(null);
    setAddError('');
    setAddSaving(false);
  };

  const submitAddQuestion = async () => {
    if (!activeTopic || !addModal) return;
    const questionNo = addModal.questionNo.trim();
    if (!questionNo) {
      setAddError('প্রশ্নের নম্বর দিতে হবে');
      return;
    }
    setAddSaving(true);
    setAddError('');
    try {
      const res = await fetch(`${API}/book-content/questions`, {
        method: 'POST',
        headers: hdrs(),
        // No `order` is sent: the server derives it from this number, which is
        // what makes the typed serial the position the question lands in.
        body: JSON.stringify({
          bookId,
          chapterId: activeTopic.chapterId,
          topicId: activeTopic._id,
          questionNo,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'প্রশ্ন যোগ করা যায়নি');

      // An insert renumbers its neighbours server-side, so the list in hand is
      // stale the moment it lands — refetch rather than splice into it.
      await loadQuestions(activeTopic._id);
      openQuestion(body.data);
      closeAddQuestion();
      loadTree();
    } catch (err) {
      setAddError(err.message);
      setAddSaving(false);
    }
  };

  /**
   * Delete a question, having first said out loud what it contains.
   *
   * The delete still leaves its serial gap behind, and createQuestion is what
   * puts a re-added question back into it.
   */
  const deleteQuestion = async id => {
    const q = questions.find(x => String(x._id) === String(id));
    if (!q) return;

    const carried = describeContents(q);
    const ok = await confirm({
      title: `প্রশ্ন ${q.questionNo} মুছে ফেলবেন?`,
      message: [
        q.questionText ? `“${q.questionText.slice(0, 80)}${q.questionText.length > 80 ? '…' : ''}”` : '',
        carried.length
          ? `এর সাথে ${carried.join(', ')} মুছে যাবে।`
          : 'এতে এখনো কোনো উত্তর বা ফাইল নেই।',
        'ভুল হলে সাথে সাথেই “ফিরিয়ে আনুন” চেপে পুরোটা ফেরত পাবেন।',
      ]
        .filter(Boolean)
        .join(' '),
      confirmText: 'মুছে ফেলুন',
      cancelText: 'থাক',
    });
    if (!ok) return;

    try {
      const res = await fetch(`${API}/book-content/questions/${id}`, {
        method: 'DELETE',
        headers: hdrs(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) throw new Error(body.message || 'মুছে ফেলা যায়নি');
    } catch (err) {
      notify(err.message, 'error', 0);
      return;
    }

    setQuestions(qs => qs.filter(x => String(x._id) !== String(id)));
    if (String(activeQuestionId) === String(id)) {
      setActiveQuestionId(null);
      setDraft(null);
    }
    armUndo({ id, questionNo: q.questionNo, topicId: activeTopic?._id });
    loadTree();
  };

  /**
   * Put back the question that was just deleted.
   *
   * The delete is soft server-side, so this restores the answer and every
   * attached file with it — and back at its own place in the topic, which is
   * why the list is refetched rather than having the row pushed onto the end.
   */
  const restoreDeleted = async () => {
    if (!undo) return;
    const target = undo;
    dismissUndo();
    setRestoring(true);
    try {
      const res = await fetch(`${API}/book-content/questions/${target.id}/restore`, {
        method: 'PATCH',
        headers: hdrs(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || 'ফিরিয়ে আনা যায়নি');

      if (activeTopic && String(activeTopic._id) === String(target.topicId)) {
        await loadQuestions(target.topicId);
      }
      notify(`প্রশ্ন ${target.questionNo} ফিরে এসেছে`, 'success', 3000);
      loadTree();
    } catch (err) {
      // Hand the button back: the question is still deleted, and a failed undo
      // that also swallows the offer to retry leaves nothing to do about it.
      armUndo(target);
      notify(err.message, 'error', 0);
    } finally {
      setRestoring(false);
    }
  };

  /**
   * Persist the order the chips are now in.
   *
   * Only `order` moves. `questionNo` is the serial printed beside the question
   * on paper, so a drag must never touch it — renumberSerials below is the one
   * place that may, and only when asked.
   */
  const saveOrder = async (next, previous) => {
    setSavingOrder(true);
    try {
      const res = await fetch(`${API}/book-content/reorder/questions`, {
        method: 'PATCH',
        headers: hdrs(),
        body: JSON.stringify({
          // The topic the client believes it is reordering. The server refuses
          // the write if the ids do not all belong to it.
          scopeId: activeTopic?._id,
          items: next.map((q, i) => ({ _id: q._id, order: i + 1 })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || 'ক্রম সংরক্ষণ হয়নি');
      notify('নতুন ক্রম সংরক্ষিত হয়েছে', 'success', 2000);
    } catch (err) {
      // Straight back to where it was. A list left showing an order the server
      // rejected is worse than not having moved at all.
      setQuestions(previous);
      notify(`ক্রম বদলানো যায়নি, আগের ক্রমে ফিরিয়ে আনা হলো — ${err.message}`, 'error', 0);
    } finally {
      setSavingOrder(false);
    }
  };

  const beginDrag = () => {
    orderBeforeDrag.current = questions;
  };

  /** Save on drop — there is no separate "save order" button to forget. */
  const endDrag = () => {
    const previous = orderBeforeDrag.current;
    orderBeforeDrag.current = null;
    if (!previous) return;

    const unmoved =
      previous.length === questions.length &&
      previous.every((q, i) => String(q._id) === String(questions[i]._id));
    if (unmoved) return;

    saveOrder(questions, previous);
  };

  /**
   * Renumber the visible serials 1…n down the list as it now stands.
   *
   * Deliberately a button of its own, never a side effect of the drag: this is
   * the number printed next to the question in the physical book, and a reader
   * holding the paper copy finds nothing if the two stop agreeing.
   */
  const renumberSerials = async () => {
    const planned = renumberPlan(questions);
    if (!planned.length) {
      notify('নম্বরগুলো ইতিমধ্যেই ১ থেকে ক্রমানুসারে আছে', 'success', 2500);
      return;
    }

    const sample = planned
      .slice(0, 3)
      .map(p => `${p.from} → ${p.to}`)
      .join(', ');
    const ok = await confirm({
      title: `${planned.length}টি প্রশ্নের ছাপা নম্বর বদলাবে`,
      message: `এখনকার ক্রম অনুযায়ী নম্বর ১ থেকে ${questions.length} পর্যন্ত বসবে (${sample}${
        planned.length > 3 ? ' …' : ''
      })। এই নম্বরটাই বইয়ের পাতায় প্রশ্নের পাশে ছাপা — ছাপা কপির সাথে না মিললে পাঠক প্রশ্ন খুঁজে পাবে না।`,
      confirmText: 'নম্বর বসান',
      cancelText: 'থাক',
    });
    if (!ok) return;

    setRenumbering(true);
    try {
      // One at a time: a half-applied renumbering has to be visible in the list
      // the admin is looking at, and the catch below refetches to show exactly
      // how far it got.
      for (const p of planned) {
        const res = await fetch(`${API}/book-content/questions/${p._id}`, {
          method: 'PATCH',
          headers: hdrs(),
          body: JSON.stringify({ questionNo: p.to }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) throw new Error(body.message || 'নম্বর বদলানো যায়নি');
      }
      await loadQuestions(activeTopic._id);
      notify(`${planned.length}টি প্রশ্নের নম্বর বদলানো হয়েছে`, 'success', 3000);
    } catch (err) {
      await loadQuestions(activeTopic._id);
      notify(`নম্বর বদলানো সম্পূর্ণ হয়নি — ${err.message}`, 'error', 0);
    } finally {
      setRenumbering(false);
    }
  };

  /** Jump to the next question anywhere in the book that still has no answer. */
  const jumpToNextUnanswered = async () => {
    const res = await fetch(`${API}/book-content/next-unanswered/${bookId}`, { headers: hdrs() });
    const body = await res.json();
    const next = body.data;
    if (!next) {
      notify('সব প্রশ্নের উত্তর দেওয়া হয়ে গেছে 🎉', 'success', 3000);
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

  const addPlacement = addModal ? previewPlacement(questions, addModal.questionNo) : null;

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
          ? { chapterNo: '', title: '', titleBn: '', order: '', isFree: false }
          : { topicNo: '', title: '', titleBn: '', order: '' },
    });
  };

  const closeNodeModal = () => {
    setNodeModal(null);
    setNodeError('');
    setNodeSaving(false);
  };

  const submitNodeModal = async () => {
    if (!nodeModal) return;
    const { level, parent, values } = nodeModal;
    if (!values.title?.trim()) {
      setNodeError('শিরোনাম দিতে হবে');
      return;
    }
    setNodeSaving(true);
    setNodeError('');
    try {
      // Create only. Editing a board, chapter or topic no longer exists —
      // their names and numbers are printed alongside the QR codes, so the
      // server refuses the write and there is no dialog left that attempts it.
      const url = `${API}/book-content/${level}s`;

      const payload = {
        title: values.title.trim(),
        titleBn: values.titleBn?.trim() || undefined,
        ...(level !== 'part' && {
          [level === 'chapter' ? 'chapterNo' : 'topicNo']:
            (level === 'chapter' ? values.chapterNo : values.topicNo)?.trim() || undefined,
        }),
        ...(level === 'chapter' ? { isFree: Boolean(values.isFree) } : {}),
        ...(values.order !== '' && values.order !== undefined
          ? { order: Number(values.order) }
          : {}),
      };

      {
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
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'সংরক্ষণ ব্যর্থ');

      // Auto-open the parent so the new row is visible
      {
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

  // Part/chapter/topic have no delete: once created they carry (or transitively
  // carry) a QR code that may already be printed. Editing text is fine — the
  // QR does not change.

  if (loading) {
    return <div className="p-8 text-dash-mute">লোড হচ্ছে…</div>;
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
          <h1 className="text-xl font-semibold text-dash-ink">{tree?.book?.title}</h1>
          <p className="text-sm text-dash-mute mt-0.5">
            {totals.topics} টপিক · {totals.answered}/{totals.total} প্রশ্নের উত্তর দেওয়া হয়েছে
            {totals.total > 0 && (
              <span className="ml-2 text-dash-mute2">
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
            className="inline-flex items-center gap-2 rounded-lg border border-dash-line-strong text-sm px-4 py-2 hover:bg-dash-soft transition"
          >
            <FiGrid className="w-4 h-4" /> QR শিট
          </Link>
        </div>
      </div>

      {flash && (
        <div
          role="status"
          className={`mb-4 rounded-lg border text-sm px-4 py-2.5 ${
            flash.tone === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {flash.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* ─── Tree ──────────────────────────────────────── */}
        <aside className="rounded-xl border border-dash-line bg-dash-card overflow-hidden self-start">
          <div className="px-4 py-3 border-b border-dash-line bg-dash-soft flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-dash-mute">
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
              <p className="px-4 py-6 text-xs text-dash-mute2 text-center">
                এখনো কোনো বোর্ড নেই। উপরে থেকে যোগ করুন।
              </p>
            )}
            {tree?.parts?.map(part => (
              <div key={part._id}>
                <div className="group relative flex items-center hover:bg-dash-soft">
                  <button
                    onClick={() => toggle(part._id)}
                    className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 text-left"
                  >
                    {expanded[part._id] ? (
                      <FiChevronDown className="w-4 h-4 text-dash-mute2 shrink-0" />
                    ) : (
                      <FiChevronRight className="w-4 h-4 text-dash-mute2 shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-dash-ink2 truncate">
                      {part.title}
                    </span>
                  </button>
                  <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 touch-always-visible transition">
                    <button
                      onClick={() => openCreate('chapter', { partId: part._id })}
                      title="নতুন অধ্যায় যোগ"
                      className="p-1.5 rounded hover:bg-blue-100 text-dash-mute hover:text-blue-700"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                    </button>
                    <LockedStructure label="বোর্ড" />
                  </div>
                </div>

                {expanded[part._id] && part.chapters.length === 0 && (
                  <p className="pl-10 pr-3 py-2 text-[11px] text-dash-mute2">
                    কোনো অধ্যায় নেই।
                  </p>
                )}

                {expanded[part._id] &&
                  part.chapters.map(chapter => (
                    <div key={chapter._id}>
                      <div className="group relative flex items-center hover:bg-dash-soft">
                        <button
                          onClick={() => toggle(chapter._id)}
                          className="flex-1 min-w-0 flex items-center gap-2 pl-7 pr-3 py-2 text-left"
                        >
                          {expanded[chapter._id] ? (
                            <FiChevronDown className="w-3.5 h-3.5 text-dash-mute2 shrink-0" />
                          ) : (
                            <FiChevronRight className="w-3.5 h-3.5 text-dash-mute2 shrink-0" />
                          )}
                          <span className="text-sm text-dash-ink3 truncate">
                            {chapter.chapterNo ? `${chapter.chapterNo}. ` : ''}
                            {chapter.title}
                          </span>
                          {chapter.isFree && (
                            <span className="ml-1 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                              ফ্রি
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 touch-always-visible transition">
                          <button
                            onClick={() =>
                              openCreate('topic', {
                                partId: part._id,
                                chapterId: chapter._id,
                              })
                            }
                            title="নতুন টপিক যোগ"
                            className="p-1.5 rounded hover:bg-blue-100 text-dash-mute hover:text-blue-700"
                          >
                            <FiPlus className="w-3.5 h-3.5" />
                          </button>
                          <LockedStructure label="অধ্যায়" />
                        </div>
                      </div>

                      {expanded[chapter._id] && chapter.topics.length === 0 && (
                        <p className="pl-14 pr-3 py-1.5 text-[11px] text-dash-mute2">
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
                                  : 'hover:bg-dash-soft border-l-2 border-transparent'
                              }`}
                            >
                              <button
                                onClick={() => openTopic(topic)}
                                className="flex-1 min-w-0 flex items-center justify-between gap-2 pl-12 pr-2 py-1.5 text-left"
                              >
                                <span className="text-[13px] text-dash-ink4 truncate">
                                  {topic.isImplicit
                                    ? '(সরাসরি প্রশ্ন)'
                                    : `${topic.topicNo || ''} ${topic.title}`}
                                </span>
                                <span
                                  className={`text-[11px] tabular-nums shrink-0 ${
                                    done ? 'text-emerald-600' : 'text-dash-mute2'
                                  }`}
                                >
                                  {topic.answeredQuestions}/{topic.totalQuestions}
                                </span>
                              </button>
                              <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 touch-always-visible transition">
                                <LockedStructure label="টপিক" />
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
        <section className="rounded-xl border border-dash-line bg-dash-card p-4 lg:p-5">
          {!activeTopic ? (
            <p className="text-sm text-dash-mute py-16 text-center">
              বাঁ পাশ থেকে একটি টপিক বেছে নিন।
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-dash-line">
                <div>
                  <h2 className="font-semibold text-dash-ink">
                    {activeTopic.isImplicit
                      ? activeTopic.title
                      : `${activeTopic.topicNo} ${activeTopic.title}`}
                  </h2>
                  <p className="text-xs text-dash-mute mt-1">
                    QR কোড: <code className="font-mono text-dash-ink3">{activeTopic.qrCode}</code>
                    <span className="ml-2 text-dash-mute2">(ছাপা হয়ে গেলে আর বদলানো যাবে না)</span>
                  </p>
                </div>
                <button
                  onClick={openAddQuestion}
                  title="নম্বর দিয়ে নির্দিষ্ট জায়গায় প্রশ্ন যোগ করুন"
                  className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-dash-line-strong px-3 py-1.5 hover:bg-dash-soft"
                >
                  <FiPlus className="w-4 h-4" /> প্রশ্ন যোগ
                </button>
              </div>

              {/* Question numbers */}
              <div className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-dash-mute">
                    প্রশ্ন{questions.length > 0 ? ` (${questions.length}টি)` : ''}
                    {savingOrder && (
                      <span className="ml-2 normal-case tracking-normal text-dash-mute2">
                        ক্রম সংরক্ষণ হচ্ছে…
                      </span>
                    )}
                  </p>

                  {/* `|| reordering` so deleting down to a single question
                      cannot strand the admin inside a mode with no way out. */}
                  {(questions.length > 1 || reordering) && (
                    <div className="flex items-center gap-2">
                      {/* Only offered while rearranging — this rewrites what is
                          printed on paper, so it does not belong in reach of an
                          everyday click. */}
                      {reordering && (
                        <button
                          onClick={renumberSerials}
                          disabled={renumbering || savingOrder}
                          title="এখনকার ক্রম অনুযায়ী ছাপা নম্বর ১…n বসিয়ে দিন"
                          className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-amber-300 bg-amber-50 text-amber-800 px-2.5 py-1.5 hover:bg-amber-100 disabled:opacity-50 transition"
                        >
                          <FiHash className="w-3.5 h-3.5" />
                          {renumbering ? 'বসছে…' : `ছাপা নম্বর ১…${questions.length} করুন`}
                        </button>
                      )}
                      <button
                        onClick={() => setReordering(v => !v)}
                        disabled={savingOrder}
                        title={
                          reordering
                            ? 'সাজানো শেষ করে নম্বরের তালিকায় ফিরুন'
                            : 'হাতল ধরে টেনে প্রশ্নের ক্রম বদলান'
                        }
                        className={`inline-flex items-center gap-1.5 text-xs rounded-lg border px-2.5 py-1.5 transition disabled:opacity-50 ${
                          reordering
                            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                            : 'border-dash-line-strong text-dash-ink4 hover:bg-dash-soft'
                        }`}
                      >
                        {reordering ? (
                          <>
                            <FiCheck className="w-3.5 h-3.5" /> সাজানো শেষ
                          </>
                        ) : (
                          <>
                            <FiMove className="w-3.5 h-3.5" /> ক্রম সাজান
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {questions.length === 0 ? (
                  <p className="text-sm text-dash-mute">এই টপিকে এখনো কোনো প্রশ্ন নেই।</p>
                ) : reordering ? (
                  <>
                    <p className="text-[11px] text-dash-mute mb-2 leading-relaxed">
                      হাতল <FiMenu className="inline w-3 h-3 -mt-0.5" /> ধরে উপরে-নিচে টানুন — ছেড়ে
                      দিলেই ক্রম সংরক্ষিত হয়ে যাবে। <strong>ছাপা নম্বর বদলাবে না</strong>, শুধু
                      দেখানোর ক্রম বদলাবে।
                    </p>
                    {/* reducedMotion="user" is the whole prefers-reduced-motion
                        story for framer: the drag still tracks the finger, but
                        the reflow and the settle-back stop animating. */}
                    <MotionConfig reducedMotion="user">
                      <Reorder.Group
                        as="div"
                        axis="y"
                        values={questions}
                        onReorder={setQuestions}
                        className="space-y-1.5"
                      >
                        {questions.map(q => (
                          <QuestionOrderRow
                            key={q._id}
                            question={q}
                            active={String(activeQuestionId) === String(q._id)}
                            canDelete={canDelete}
                            locked={savingOrder || renumbering}
                            onOpen={() => openQuestion(q)}
                            onDelete={() => deleteQuestion(q._id)}
                            onDragStart={beginDrag}
                            onDrop={endDrag}
                          />
                        ))}
                      </Reorder.Group>
                    </MotionConfig>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {questions.map(q => {
                      const answered = Boolean(q.answerHtml?.trim());
                      return (
                        <div key={q._id} className="relative group">
                          <button
                            onClick={() => openQuestion(q)}
                            title={q.questionText || `প্রশ্ন ${q.questionNo}`}
                            className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium border transition ${
                              activeQuestionId === q._id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : answered
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-dash-card text-dash-mute border-dash-line hover:bg-dash-soft'
                            }`}
                          >
                            {q.questionNo}
                          </button>
                          {/* On the chip, not buried in the form below it: the
                              shop owner never found the old text link beside
                              the save button. Dimmed rather than hover-only, so
                              it is still there to be found on a tablet. */}
                          {canDelete && (
                            <button
                              onClick={() => deleteQuestion(q._id)}
                              title={`প্রশ্ন ${q.questionNo} মুছে ফেলুন`}
                              aria-label={`প্রশ্ন ${q.questionNo} মুছে ফেলুন`}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-dash-card border border-red-200 text-red-500 flex items-center justify-center shadow-sm opacity-60 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500 hover:text-white hover:border-red-500 transition"
                            >
                              <FiX className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form */}
              {draft && (
                <div className="space-y-4 pt-2 border-t border-dash-line">
                  <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-3">
                    <div>
                      <label className="block text-xs font-medium text-dash-ink4 mb-1">নম্বর</label>
                      <input
                        value={draft.questionNo}
                        onChange={e => setDraft(d => ({ ...d, questionNo: e.target.value }))}
                        className="w-full rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                      />
                      {/* Editing renames only. Moving a question is done by
                          adding it at the number you want. */}
                      <p className="text-[11px] text-dash-mute2 mt-1">
                        এখানে বদলালে ক্রম বদলাবে না
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-dash-ink4 mb-1">প্রশ্ন</label>
                      <input
                        value={draft.questionText}
                        onChange={e => setDraft(d => ({ ...d, questionText: e.target.value }))}
                        placeholder="প্রশ্নটি লিখুন"
                        className="w-full rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-dash-ink4 mb-1">উত্তর</label>
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
                        : 'border-dash-line'
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
                      <label className="text-xs font-medium text-dash-ink4 flex items-center gap-1.5">
                        <FiImage className="w-3.5 h-3.5" /> ছবি
                        {draft.images?.length > 0 && (
                          <span className="text-dash-mute2">({draft.images.length}টি)</span>
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
                            className="group relative aspect-square rounded-lg overflow-hidden border border-dash-line bg-dash-soft"
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
                            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-slate-900/70 opacity-0 group-hover:opacity-100 touch-always-visible transition">
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
                      <p className="text-xs text-dash-mute2">
                        কোনো ছবি যোগ করা হয়নি। একসাথে কয়েকটা ছবি বাছাই করতে পারেন, বা এখানে
                        টেনে এনে ছাড়তে পারেন।
                      </p>
                    )}
                  </div>

                  {/* Videos — a YouTube link, or a file that lands on our server */}
                  <div className="rounded-lg border border-dash-line p-3">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-dash-ink4 flex items-center gap-1.5">
                        <FiVideo className="w-3.5 h-3.5" /> ভিডিও
                        {draft.videos?.length > 0 && (
                          <span className="text-dash-mute2">({draft.videos.length}টি)</span>
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
                      <p className="text-xs text-dash-mute2">কোনো ভিডিও যোগ করা হয়নি।</p>
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
                          className="w-40 rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                        />
                        {v.provider === 'upload' ? (
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 min-w-0 text-sm text-dash-ink4 truncate hover:text-blue-600 flex items-center gap-1.5"
                          >
                            <FiExternalLink className="w-3.5 h-3.5 shrink-0" />
                            {v.fileName || v.url}
                            {v.fileSize ? (
                              <span className="text-dash-mute2">({formatSize(v.fileSize)})</span>
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
                            className="flex-1 min-w-[200px] rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                          />
                        )}
                        <button
                          onClick={() =>
                            setDraft(d => ({ ...d, videos: d.videos.filter((_, j) => j !== i) }))
                          }
                          className="text-dash-mute2 hover:text-red-600 px-2"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* PDFs / files — uploaded, not pasted */}
                  <div className="rounded-lg border border-dash-line p-3">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-dash-ink4 flex items-center gap-1.5">
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
                      <p className="text-xs text-dash-mute2">কোনো ফাইল যোগ করা হয়নি।</p>
                    )}

                    {draft.attachments.map((a, i) => (
                      <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
                        <span className="text-[10px] px-2 py-1 rounded bg-dash-soft2 text-dash-ink4 font-medium uppercase shrink-0">
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
                          className="w-56 rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                        />
                        <a
                          href={a.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0 text-sm text-dash-mute truncate hover:text-blue-600 flex items-center gap-1.5"
                        >
                          <FiExternalLink className="w-3.5 h-3.5 shrink-0" />
                          {a.fileUrl.split('/').pop()}
                          {a.fileSize ? (
                            <span className="text-dash-mute2">({formatSize(a.fileSize)})</span>
                          ) : null}
                        </a>
                        <button
                          onClick={() =>
                            setDraft(d => ({
                              ...d,
                              attachments: d.attachments.filter((_, j) => j !== i),
                            }))
                          }
                          className="text-dash-mute2 hover:text-red-600 px-2"
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
                    {/* Deleting needs records.delete; the add-and-edit manager
                        role does not have it, and the API would refuse anyway. */}
                    {canDelete && (
                      <button
                        onClick={() => deleteQuestion(activeQuestionId)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        মুছে ফেলুন
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ─── Add question at a chosen serial ─────────────── */}
      {addModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeAddQuestion}
        >
          <div
            className="w-full max-w-md rounded-xl bg-dash-card shadow-xl border border-dash-line"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-dash-line">
              <h3 className="text-sm font-semibold text-dash-ink2">নতুন প্রশ্ন যোগ</h3>
              <button
                onClick={closeAddQuestion}
                className="p-1 text-dash-mute2 hover:text-dash-ink3"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-dash-ink4 mb-1">
                  প্রশ্নের নম্বর <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={addModal.questionNo}
                  onChange={e => setAddModal(m => ({ ...m, questionNo: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !addSaving) submitAddQuestion();
                  }}
                  placeholder="যেমন: ৩, 3, ১২ক"
                  className="w-full rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-dash-mute mt-1.5 leading-relaxed">
                  যে নম্বর দেবেন প্রশ্নটি ঠিক সেখানেই বসবে। ওই নম্বরে আগে থেকে প্রশ্ন থাকলে সেটি ও
                  তার পরের সবগুলো এক ধাপ করে নিচে সরে যাবে।
                </p>
              </div>

              {addPlacement?.kind === 'shift' && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 leading-relaxed">
                  <strong>{addPlacement.at}</strong> নম্বরে ইতিমধ্যে একটি প্রশ্ন আছে। নতুনটি ওই
                  জায়গায় বসবে, আর ওটা সহ পরের সব প্রশ্নের নম্বর এক ধাপ করে বেড়ে যাবে
                  {addPlacement.moved ? ` — ${addPlacement.moved}` : ''}।
                </p>
              )}

              {addPlacement?.kind === 'gap' && (
                <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded px-3 py-2 leading-relaxed">
                  <strong>{addPlacement.before}</strong> নম্বরের ঠিক আগে বসবে। অন্য কোনো প্রশ্নের
                  নম্বর বদলাবে না।
                </p>
              )}

              {addPlacement?.kind === 'append' && (
                <p className="text-xs text-dash-ink4 bg-dash-soft border border-dash-line rounded px-3 py-2">
                  তালিকার শেষে যোগ হবে।
                </p>
              )}

              {addError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {addError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-dash-line bg-dash-soft rounded-b-xl">
              <button
                onClick={closeAddQuestion}
                className="text-sm px-3 py-1.5 rounded-lg text-dash-ink4 hover:bg-dash-soft3"
              >
                বাতিল
              </button>
              <button
                onClick={submitAddQuestion}
                disabled={addSaving}
                className="inline-flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <FiPlus className="w-3.5 h-3.5" />
                {addSaving ? 'যোগ হচ্ছে…' : 'যোগ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add / Edit modal for part / chapter / topic ─── */}
      {nodeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeNodeModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-dash-card shadow-xl border border-dash-line"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-dash-line">
              <h3 className="text-sm font-semibold text-dash-ink2">
                নতুন{' '}
                {nodeModal.level === 'part'
                  ? 'বোর্ড'
                  : nodeModal.level === 'chapter'
                  ? 'অধ্যায়'
                  : 'টপিক'}{' '}
                যোগ
              </h3>
              <button
                onClick={closeNodeModal}
                className="p-1 text-dash-mute2 hover:text-dash-ink3"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {nodeModal.level === 'chapter' && (
                <div>
                  <label className="block text-xs font-medium text-dash-ink4 mb-1">
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
                    className="w-full rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                  />
                </div>
              )}

              {nodeModal.level === 'topic' && (
                <div>
                  <label className="block text-xs font-medium text-dash-ink4 mb-1">
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
                    className="w-full rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-dash-ink4 mb-1">
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
                  className="w-full rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-dash-ink4 mb-1">
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
                  className="w-full rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-dash-ink4 mb-1">
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
                  className="w-full rounded-lg border border-dash-line-strong px-3 py-2 text-sm"
                />
              </div>

              {nodeModal.level === 'chapter' && (
                <label className="flex items-start gap-2.5 rounded-lg border border-dash-line-strong bg-dash-soft/50 px-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(nodeModal.values.isFree)}
                    onChange={e =>
                      setNodeModal(m => ({
                        ...m,
                        values: { ...m.values, isFree: e.target.checked },
                      }))
                    }
                    className="mt-0.5 accent-emerald-600"
                  />
                  <span className="text-xs text-dash-ink4">
                    <span className="font-medium text-dash-ink2">ফ্রি অধ্যায়</span> — এই অধ্যায়ের QR
                    স্ক্যান করলে যেকোনো সাইন-ইন করা ইউজার বই না কিনেই দেখতে পারবে (স্যাম্পল/ট্রায়াল হিসেবে)।
                  </span>
                </label>
              )}

              {nodeError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {nodeError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-dash-line bg-dash-soft rounded-b-xl">
              <button
                onClick={closeNodeModal}
                className="text-sm px-3 py-1.5 rounded-lg text-dash-ink4 hover:bg-dash-soft3"
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

      {/* ─── Undo the last delete ───────────────────────── */}
      {/* Fixed, not in the page flow: after deleting a chip the admin may well
          have scrolled on, and an undo they cannot see is no undo at all.
          z below the confirm modal's 110 so it never covers a dialog. */}
      {undo && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-xl bg-[#14100c] text-white text-sm px-4 py-3 shadow-2xl max-w-[calc(100vw-2rem)]"
        >
          <span className="truncate">
            প্রশ্ন <strong>{undo.questionNo}</strong> মুছে ফেলা হয়েছে
          </span>
          <button
            onClick={restoreDeleted}
            disabled={restoring}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 font-semibold disabled:opacity-50 transition"
          >
            <FiRotateCcw className="w-3.5 h-3.5" />
            {restoring ? 'ফিরছে…' : 'ফিরিয়ে আনুন'}
          </button>
          <button
            onClick={dismissUndo}
            aria-label="বন্ধ করুন"
            className="shrink-0 p-1 text-white/50 hover:text-white transition"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {confirmNode}
    </div>
  );
}
