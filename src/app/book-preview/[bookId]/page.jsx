'use client';

/**
 * Standalone book content player — same shell as the recorded-course learn
 * page (full viewport, no site/admin chrome). Light theme.
 *
 * Right sticky curriculum: Part → Chapter → Topic → Question accordion.
 * Admin-only (uses book-content/tree which requires admin auth).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiArrowLeft,
  FiBook,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiList,
  FiLoader,
  FiPlus,
  FiMinus,
  FiSearch,
  FiX,
} from 'react-icons/fi';

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const hdrs = () => ({
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
});

function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
  } catch {
    /* raw */
  }
  return url;
}

function matchesQuery(text, q) {
  if (!q) return true;
  return (text || '').toLowerCase().includes(q.toLowerCase());
}

export default function BookPreviewPlayerPage() {
  const { bookId } = useParams();
  const router = useRouter();

  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [openParts, setOpenParts] = useState(() => new Set());
  const [openChapters, setOpenChapters] = useState(() => new Set());
  const [openTopics, setOpenTopics] = useState(() => new Set());

  const [activeTopic, setActiveTopic] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);
  const [activePart, setActivePart] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qLoading, setQLoading] = useState(false);
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [bootstrapped, setBootstrapped] = useState(false);

  const openTopic = useCallback(async (part, chapter, topic, questionIndex = 0) => {
    setActivePart(part);
    setActiveChapter(chapter);
    setActiveTopic(topic);
    setOpenTopics(prev => new Set(prev).add(topic._id));
    setQLoading(true);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    try {
      const res = await fetch(`${API}/book-content/questions/topic/${topic._id}`, {
        headers: hdrs(),
      });
      const body = await res.json();
      const list = body.data || [];
      setQuestions(list);
      setActiveQIndex(
        list.length ? Math.min(Math.max(questionIndex, 0), list.length - 1) : 0
      );
    } catch {
      setQuestions([]);
      setActiveQIndex(0);
    } finally {
      setQLoading(false);
    }
  }, []);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError('');
    setBootstrapped(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(`/book-preview/${bookId}`)}`);
      return;
    }

    try {
      const res = await fetch(`${API}/book-content/tree/${bookId}`, { headers: hdrs() });
      if (res.status === 401 || res.status === 403) {
        router.replace(`/login?redirect=${encodeURIComponent(`/book-preview/${bookId}`)}`);
        return;
      }
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'লোড হয়নি');
      setTree(body.data);

      const firstPart = body.data?.parts?.[0];
      if (firstPart) {
        setOpenParts(new Set([firstPart._id]));
        const firstChapter = firstPart.chapters?.[0];
        if (firstChapter) {
          setOpenChapters(new Set([firstChapter._id]));
          const firstTopic = firstChapter.topics?.[0];
          if (firstTopic) {
            setOpenTopics(new Set([firstTopic._id]));
            setActivePart(firstPart);
            setActiveChapter(firstChapter);
            setActiveTopic(firstTopic);
          }
        }
      }
      setBootstrapped(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [bookId, router]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    if (!bootstrapped || !activeTopic || !activePart || !activeChapter) return;
    if (questions.length > 0 || qLoading) return;
    openTopic(activePart, activeChapter, activeTopic, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapped]);

  const totals = useMemo(() => {
    if (!tree) return { parts: 0, chapters: 0, topics: 0, questions: 0, answered: 0 };
    let chapters = 0;
    let topics = 0;
    let questionsCount = 0;
    let answered = 0;
    for (const p of tree.parts || []) {
      chapters += p.chapters?.length || 0;
      for (const c of p.chapters || []) {
        topics += c.topics?.length || 0;
        for (const t of c.topics || []) {
          questionsCount += t.totalQuestions || 0;
          answered += t.answeredQuestions || 0;
        }
      }
    }
    return {
      parts: tree.parts?.length || 0,
      chapters,
      topics,
      questions: questionsCount,
      answered,
    };
  }, [tree]);

  const progressPct = totals.questions
    ? Math.round((totals.answered / totals.questions) * 100)
    : 0;

  const filteredParts = useMemo(() => {
    if (!tree?.parts) return [];
    const q = search.trim();
    if (!q) return tree.parts;

    return tree.parts
      .map(part => {
        const partHit = matchesQuery(part.title, q) || matchesQuery(part.titleBn, q);
        const chapters = (part.chapters || [])
          .map(ch => {
            const chHit =
              matchesQuery(ch.title, q) ||
              matchesQuery(ch.titleBn, q) ||
              matchesQuery(ch.chapterNo, q);
            const topics = (ch.topics || []).filter(
              t =>
                matchesQuery(t.title, q) ||
                matchesQuery(t.titleBn, q) ||
                matchesQuery(t.topicNo, q) ||
                partHit ||
                chHit
            );
            if (partHit || chHit || topics.length) {
              return { ...ch, topics: partHit || chHit ? ch.topics : topics };
            }
            return null;
          })
          .filter(Boolean);
        if (partHit || chapters.length) {
          return { ...part, chapters: partHit ? part.chapters : chapters };
        }
        return null;
      })
      .filter(Boolean);
  }, [tree, search]);

  useEffect(() => {
    if (!search.trim() || !filteredParts.length) return;
    const parts = new Set();
    const chapters = new Set();
    const topics = new Set();
    for (const p of filteredParts) {
      parts.add(p._id);
      for (const c of p.chapters || []) {
        chapters.add(c._id);
        for (const t of c.topics || []) topics.add(t._id);
      }
    }
    setOpenParts(parts);
    setOpenChapters(chapters);
    setOpenTopics(topics);
  }, [search, filteredParts]);

  const toggleSet = (setter, id) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectQuestion = (part, chapter, topic, index) => {
    if (String(activeTopic?._id) === String(topic._id)) {
      setActiveQIndex(index);
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
      return;
    }
    openTopic(part, chapter, topic, index);
  };

  const activeQuestion = questions[activeQIndex];
  const bookTitle = tree?.book?.title || 'বুক প্রিভিউ';

  const crumb = [
    activePart?.title,
    activeChapter && `${activeChapter.chapterNo ?? ''} ${activeChapter.title}`.trim(),
    activeTopic &&
      (activeTopic.isImplicit
        ? null
        : `${activeTopic.topicNo ?? ''} ${activeTopic.title}`.trim()),
  ]
    .filter(Boolean)
    .join(' › ');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f5f8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-[3px] border-slate-200 rounded-full" />
            <div className="absolute inset-0 border-[3px] border-transparent border-t-violet-500 rounded-full animate-spin" />
          </div>
          <p className="text-slate-500 text-sm font-medium">বুক লোড হচ্ছে…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f5f8] flex flex-col items-center justify-center px-4">
        <FiBook size={40} className="text-slate-300 mb-4" />
        <p className="text-rose-600 font-medium mb-4">{error}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={loadTree}
            className="rounded-xl bg-violet-600 text-white px-4 py-2.5 text-sm font-medium"
          >
            আবার চেষ্টা
          </button>
          <Link
            href="/dashboard/admin/book-preview"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600"
          >
            ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-[#f4f5f8] flex flex-col">
      {/* Top bar — same role as course learn header */}
      <header className="bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-3 shrink-0 z-30">
        <Link
          href="/dashboard/admin/book-preview"
          className="flex items-center gap-2 text-slate-500 hover:text-violet-700 transition text-sm font-medium"
        >
          <FiArrowLeft size={18} />
          <span className="hidden sm:inline">Back</span>
        </Link>

        <div className="w-px h-6 bg-slate-200" />

        <div className="flex-1 min-w-0">
          <h1 className="text-slate-800 font-semibold text-sm truncate max-w-[280px] lg:max-w-[520px]">
            {bookTitle}
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold tabular-nums min-w-[36px]">
              {progressPct}%
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {totals.answered}/{totals.questions} answers
          </span>
        </div>

        <Link
          href={`/dashboard/admin/books/${bookId}/content`}
          className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <FiEdit3 size={13} /> Edit
        </Link>

        <button
          type="button"
          onClick={() => setSidebarOpen(v => !v)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-violet-700 hover:bg-violet-50 transition"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <FiList size={18} />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Content */}
        <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
          <div className="px-5 lg:px-10 py-6 lg:py-8">
            {!activeTopic ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center max-w-2xl mx-auto">
                <FiBook className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">ডান পাশ থেকে টপিক বেছে নিন।</p>
              </div>
            ) : qLoading ? (
              <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
                <FiLoader className="w-5 h-5 animate-spin" /> প্রশ্ন লোড হচ্ছে…
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center max-w-2xl mx-auto">
                <p className="text-slate-500 text-sm">এই টপিকে কোনো প্রশ্ন নেই।</p>
              </div>
            ) : (
              activeQuestion && (
                <div className="max-w-3xl mx-auto">
                  {crumb && (
                    <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2 truncate">
                      {crumb}
                    </p>
                  )}

                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <p className="text-amber-600 text-xs font-semibold uppercase tracking-wider mb-1">
                        প্রশ্ন {activeQuestion.questionNo}
                      </p>
                      <h2 className="text-slate-800 text-xl font-bold leading-relaxed">
                        {activeQuestion.questionText || (
                          <span className="text-slate-400 italic font-medium text-base">
                            প্রশ্নটি এখনো যোগ করা হয়নি
                          </span>
                        )}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={activeQIndex === 0}
                        onClick={() => setActiveQIndex(i => Math.max(0, i - 1))}
                        className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition"
                      >
                        <FiChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        disabled={activeQIndex >= questions.length - 1}
                        onClick={() =>
                          setActiveQIndex(i => Math.min(questions.length - 1, i + 1))
                        }
                        className="w-10 h-10 rounded-lg bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-30 transition"
                      >
                        <FiChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mb-5">
                    Question {activeQIndex + 1} of {questions.length}
                  </p>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 overflow-hidden">
                    <div className="px-5 lg:px-7 py-6 space-y-5">
                      {activeQuestion.videos?.map((v, i) => (
                        <div key={v._id ?? i}>
                          {v.title && (
                            <p className="text-sm text-slate-500 mb-2">{v.title}</p>
                          )}
                          {v.provider === 'upload' ? (
                            <>
                              <video
                                src={v.url}
                                controls
                                preload="metadata"
                                playsInline
                                className="w-full rounded-xl bg-slate-900"
                              />
                              <a
                                href={v.url}
                                download
                                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 mt-2 transition"
                              >
                                <FiDownload className="w-3.5 h-3.5" /> ভিডিও ডাউনলোড
                              </a>
                            </>
                          ) : (
                            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900">
                              <iframe
                                src={toEmbedUrl(v.url)}
                                title={v.title || `video-${i}`}
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {activeQuestion.answerHtml?.trim() ? (
                        <div
                          className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: activeQuestion.answerHtml }}
                        />
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                          <p className="text-sm text-slate-400">উত্তরটি এখনো যোগ করা হয়নি।</p>
                        </div>
                      )}

                      {activeQuestion.images?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeQuestion.images.map((src, i) => (
                            <div
                              key={i}
                              className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-100 bg-slate-50"
                            >
                              <Image
                                src={src}
                                alt={`figure ${i + 1}`}
                                fill
                                className="object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {activeQuestion.attachments?.length > 0 && (
                        <div className="space-y-2">
                          {activeQuestion.attachments.map((a, i) => (
                            <a
                              key={a._id ?? i}
                              href={a.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 px-4 py-3 transition"
                            >
                              <FiFileText className="w-4 h-4 text-violet-500 shrink-0" />
                              <span className="text-sm text-slate-700 truncate">{a.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {questions.length > 1 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {questions.map((q, i) => (
                        <button
                          key={q._id}
                          type="button"
                          onClick={() => setActiveQIndex(i)}
                          className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition ${
                            i === activeQIndex
                              ? 'bg-violet-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600'
                          }`}
                        >
                          {q.questionNo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </main>

        {/* Sticky right curriculum — same pattern as learn player */}
        <aside
          className={`${
            sidebarOpen ? 'w-[360px]' : 'w-0'
          } bg-white border-l border-slate-200 shrink-0 overflow-hidden transition-all duration-300 flex flex-col fixed lg:relative right-0 top-0 h-full z-20`}
        >
          <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <FiBook size={15} className="text-violet-600" />
              <h3 className="text-slate-800 font-semibold text-sm">Book Content</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">
                {totals.answered}/{totals.questions}
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>

          <div className="px-3 py-3 border-b border-slate-100 shrink-0">
            <div className="relative">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search chapter / topic…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto book-preview-scroll">
            {filteredParts.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">কোনো ম্যাচ নেই</p>
            )}

            {filteredParts.map((part, partIdx) => {
              const partOpen = openParts.has(part._id);
              const partQ = (part.chapters || []).reduce(
                (acc, c) =>
                  acc + (c.topics || []).reduce((a, t) => a + (t.totalQuestions || 0), 0),
                0
              );
              const partA = (part.chapters || []).reduce(
                (acc, c) =>
                  acc + (c.topics || []).reduce((a, t) => a + (t.answeredQuestions || 0), 0),
                0
              );

              return (
                <div key={part._id} className="border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => toggleSet(setOpenParts, part._id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                          {String(partIdx + 1).padStart(2, '0')}
                        </span>
                        <p className="text-[13px] font-semibold truncate bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-transparent">
                          {part.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-7">
                        <span className="text-[11px] text-slate-400">
                          {(part.chapters || []).length} অধ্যায় · {partA}/{partQ}
                        </span>
                      </div>
                    </div>
                    {partOpen ? (
                      <FiChevronUp className="text-slate-400" size={14} />
                    ) : (
                      <FiChevronDown className="text-slate-400" size={14} />
                    )}
                  </button>

                  {partOpen && (
                    <div className="bg-[#fafbfd]">
                      {(part.chapters || []).map(chapter => {
                        const chOpen = openChapters.has(chapter._id);
                        const chQ = (chapter.topics || []).reduce(
                          (a, t) => a + (t.totalQuestions || 0),
                          0
                        );
                        const chA = (chapter.topics || []).reduce(
                          (a, t) => a + (t.answeredQuestions || 0),
                          0
                        );

                        return (
                          <div key={chapter._id} className="border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => toggleSet(setOpenChapters, chapter._id)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white transition text-left"
                            >
                              <span className="flex-1 min-w-0">
                                <span className="block text-[12.5px] font-semibold text-slate-700 truncate">
                                  {chapter.chapterNo ? `${chapter.chapterNo}. ` : ''}
                                  {chapter.title}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {(chapter.topics || []).length} টপিক · {chA}/{chQ}
                                </span>
                              </span>
                              {chOpen ? (
                                <FiMinus size={11} className="text-slate-400" />
                              ) : (
                                <FiPlus size={11} className="text-slate-400" />
                              )}
                            </button>

                            {chOpen && (
                              <div className="pb-1">
                                {(chapter.topics || []).map(topic => {
                                  const tOpen = openTopics.has(topic._id);
                                  const isActive =
                                    String(activeTopic?._id) === String(topic._id);
                                  const label = topic.isImplicit
                                    ? 'সব প্রশ্ন'
                                    : `${topic.topicNo ? `${topic.topicNo}. ` : ''}${topic.title}`;

                                  return (
                                    <div key={topic._id}>
                                      <div className="flex items-stretch">
                                        <button
                                          type="button"
                                          onClick={() => openTopic(part, chapter, topic)}
                                          className={`flex-1 min-w-0 text-left px-4 py-2.5 text-[12.5px] transition truncate border-l-[3px] ${
                                            isActive
                                              ? 'bg-violet-50 text-violet-800 font-semibold border-violet-500'
                                              : 'text-slate-600 hover:bg-white border-transparent'
                                          }`}
                                        >
                                          {label}
                                          <span className="text-[10px] text-slate-400 ml-1">
                                            {topic.answeredQuestions || 0}/
                                            {topic.totalQuestions || 0}
                                          </span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            toggleSet(setOpenTopics, topic._id);
                                            if (!tOpen) openTopic(part, chapter, topic);
                                          }}
                                          className="px-2 text-slate-400 hover:text-violet-600"
                                        >
                                          {tOpen ? <FiMinus size={10} /> : <FiPlus size={10} />}
                                        </button>
                                      </div>

                                      {tOpen && isActive && (
                                        <div className="bg-white/80 pb-1">
                                          {questions.map((q, i) => {
                                            const qActive = i === activeQIndex;
                                            return (
                                              <button
                                                key={q._id}
                                                type="button"
                                                onClick={() =>
                                                  handleSelectQuestion(part, chapter, topic, i)
                                                }
                                                className={`w-full text-left pl-7 pr-4 py-2 text-[11.5px] flex gap-2 transition border-l-[3px] ${
                                                  qActive
                                                    ? 'bg-violet-600 text-white border-violet-700'
                                                    : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700 border-transparent'
                                                }`}
                                              >
                                                <span
                                                  className={`shrink-0 font-semibold ${
                                                    qActive ? 'text-violet-100' : 'text-violet-500'
                                                  }`}
                                                >
                                                  Q{q.questionNo}
                                                </span>
                                                <span className="truncate">
                                                  {q.questionText || 'শিরোনাম নেই'}
                                                </span>
                                              </button>
                                            );
                                          })}
                                          {!qLoading && questions.length === 0 && (
                                            <p className="pl-7 pr-4 py-2 text-[11px] text-slate-400">
                                              প্রশ্ন নেই
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 lg:hidden z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      <style jsx global>{`
        .book-preview-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .book-preview-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .book-preview-scroll::-webkit-scrollbar-thumb {
          background: #c4b5fd;
          border-radius: 10px;
        }
        .book-preview-scroll::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
        }
      `}</style>
    </div>
  );
}
