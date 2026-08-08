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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiChevronDown,
  FiChevronRight,
  FiSave,
  FiPlus,
  FiTrash2,
  FiGrid,
  FiSkipForward,
} from 'react-icons/fi';

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const hdrs = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
});

const EMPTY_VIDEO = { title: '', url: '', provider: 'youtube' };
const EMPTY_ATTACHMENT = { title: '', fileUrl: '', fileType: 'pdf' };

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
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      উত্তর <span className="text-slate-400">(HTML চলবে)</span>
                    </label>
                    <textarea
                      value={draft.answerHtml}
                      onChange={e => setDraft(d => ({ ...d, answerHtml: e.target.value }))}
                      rows={10}
                      placeholder="<p>উত্তর…</p>"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>

                  {/* Videos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-600">ভিডিও</label>
                      <button
                        onClick={() => setDraft(d => ({ ...d, videos: [...d.videos, { ...EMPTY_VIDEO }] }))}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        + যোগ করুন
                      </button>
                    </div>
                    {draft.videos.map((v, i) => (
                      <div key={i} className="flex gap-2 mb-2">
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
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
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

                  {/* Attachments */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-600">PDF / ফাইল</label>
                      <button
                        onClick={() =>
                          setDraft(d => ({
                            ...d,
                            attachments: [...d.attachments, { ...EMPTY_ATTACHMENT }],
                          }))
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        + যোগ করুন
                      </button>
                    </div>
                    {draft.attachments.map((a, i) => (
                      <div key={i} className="flex gap-2 mb-2">
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
                          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <input
                          value={a.fileUrl}
                          onChange={e =>
                            setDraft(d => {
                              const attachments = [...d.attachments];
                              attachments[i] = { ...attachments[i], fileUrl: e.target.value };
                              return { ...d, attachments };
                            })
                          }
                          placeholder="https://…/file.pdf"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
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
