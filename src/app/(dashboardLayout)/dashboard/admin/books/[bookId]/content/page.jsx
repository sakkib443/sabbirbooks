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
} from 'react-icons/fi';

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

const formatSize = bytes => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
};

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
  const [busyUpload, setBusyUpload] = useState(null); // 'video' | 'file' | null
  const [uploadPct, setUploadPct] = useState(null);

  // Videos sit on the VPS disk alongside everything else, so a soft cap keeps
  // one careless 500MB lecture recording from filling the volume. Long videos
  // belong on YouTube; this is for short clips.
  const VIDEO_SOFT_LIMIT_MB = 100;

  const handleVideoUpload = async file => {
    if (!file) return;
    const mb = file.size / (1024 * 1024);
    if (mb > VIDEO_SOFT_LIMIT_MB) {
      setFlash(
        `ভিডিওটি ${mb.toFixed(0)}MB — ${VIDEO_SOFT_LIMIT_MB}MB পর্যন্ত সার্ভারে রাখা ভালো। বড় ভিডিও ইউটিউবে দিয়ে লিংক বসান।`
      );
      return;
    }
    setBusyUpload('video');
    setUploadPct(0);
    setFlash('');
    try {
      const data = await uploadToServer(file, setUploadPct);
      setDraft(d => ({
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
      setFlash('ভিডিও আপলোড হয়েছে — সংরক্ষণ করতে ভুলবেন না');
    } catch (err) {
      setFlash(err.message);
    } finally {
      setBusyUpload(null);
      setUploadPct(null);
    }
  };

  const handleFileUpload = async file => {
    if (!file) return;
    setBusyUpload('file');
    setFlash('');
    try {
      const data = await uploadToServer(file);
      setDraft(d => ({
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
      setFlash('ফাইল আপলোড হয়েছে — সংরক্ষণ করতে ভুলবেন না');
    } catch (err) {
      setFlash(err.message);
    } finally {
      setBusyUpload(null);
    }
  };

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
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              বইয়ের কাঠামো
            </p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto py-1">
            {tree?.parts?.map(part => (
              <div key={part._id}>
                <button
                  onClick={() => toggle(part._id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left"
                >
                  {expanded[part._id] ? (
                    <FiChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <FiChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-slate-800">{part.title}</span>
                </button>

                {expanded[part._id] &&
                  part.chapters.map(chapter => (
                    <div key={chapter._id}>
                      <button
                        onClick={() => toggle(chapter._id)}
                        className="w-full flex items-center gap-2 pl-7 pr-3 py-2 hover:bg-slate-50 text-left"
                      >
                        {expanded[chapter._id] ? (
                          <FiChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <FiChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="text-sm text-slate-700 truncate">
                          {chapter.chapterNo}. {chapter.title}
                        </span>
                      </button>

                      {expanded[chapter._id] &&
                        chapter.topics.map(topic => {
                          const done =
                            topic.totalQuestions > 0 &&
                            topic.answeredQuestions === topic.totalQuestions;
                          return (
                            <button
                              key={topic._id}
                              onClick={() => openTopic(topic)}
                              className={`w-full flex items-center justify-between gap-2 pl-12 pr-3 py-1.5 text-left transition ${
                                activeTopic?._id === topic._id
                                  ? 'bg-blue-50 border-l-2 border-blue-500'
                                  : 'hover:bg-slate-50 border-l-2 border-transparent'
                              }`}
                            >
                              <span className="text-[13px] text-slate-600 truncate">
                                {topic.isImplicit ? '(সরাসরি প্রশ্ন)' : `${topic.topicNo} ${topic.title}`}
                              </span>
                              <span
                                className={`text-[11px] tabular-nums shrink-0 ${
                                  done ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                              >
                                {topic.answeredQuestions}/{topic.totalQuestions}
                              </span>
                            </button>
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

                  {/* Videos — a YouTube link, or a file that lands on our server */}
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <FiVideo className="w-3.5 h-3.5" /> ভিডিও
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
                      <div className="mb-3">
                        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${uploadPct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">আপলোড হচ্ছে {uploadPct}%</p>
                      </div>
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

                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                    hidden
                    onChange={e => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      handleVideoUpload(f);
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,image/*"
                    hidden
                    onChange={e => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      handleFileUpload(f);
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
    </div>
  );
}
