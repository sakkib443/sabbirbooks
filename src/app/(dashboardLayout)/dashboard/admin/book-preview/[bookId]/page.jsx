'use client';

/**
 * Admin full-book content preview.
 *
 * Layout mirrors the course player (content left, curriculum right) but in a
 * light theme. The right accordion walks the full printed-book tree:
 * Part → Chapter → Topic → Question — all unlocked for admin review.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiLoader,
  FiPlus,
  FiMinus,
  FiSearch,
  FiBookOpen,
  FiEdit3,
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
    /* use raw url */
  }
  return url;
}

function matchesQuery(text, q) {
  if (!q) return true;
  return (text || '').toLowerCase().includes(q.toLowerCase());
}

function SidebarPanel({
  totals,
  progressPct,
  search,
  setSearch,
  filteredParts,
  openParts,
  openChapters,
  openTopics,
  togglePart,
  toggleChapter,
  toggleTopic,
  openTopic,
  activeTopicId,
  activeQuestionId,
  questionsCache,
  onSelectQuestion,
}) {
  return (
    <>
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs font-semibold text-slate-500">
            Progress · {totals.answered}/{totals.questions}
          </p>
          <span className="text-[11px] font-bold text-emerald-600">{progressPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          {totals.parts} পার্ট · {totals.chapters} অধ্যায় · {totals.topics} টপিক
        </p>
      </div>

      <div className="shrink-0 px-4 py-3 border-b border-slate-100">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chapter / topic…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 preview-scroll">
        {filteredParts.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">কোনো ম্যাচ নেই</p>
        )}

        {filteredParts.map(part => {
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
            <div
              key={part._id}
              className="rounded-xl border border-slate-200 bg-[#fafbfd] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => togglePart(part._id)}
                className="w-full flex items-start gap-2 px-3.5 py-3 text-left hover:bg-violet-50/60 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold leading-snug bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-transparent">
                    {part.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {(part.chapters || []).length} অধ্যায় · {partA}/{partQ}
                  </p>
                </div>
                <span className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                  {partOpen ? <FiMinus size={12} /> : <FiPlus size={12} />}
                </span>
              </button>

              {partOpen && (
                <div className="border-t border-slate-100 px-2 pb-2 pt-1 space-y-1">
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
                      <div key={chapter._id} className="rounded-lg">
                        <button
                          type="button"
                          onClick={() => toggleChapter(chapter._id)}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-white transition"
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
                          <span className="text-slate-400 shrink-0">
                            {chOpen ? <FiMinus size={11} /> : <FiPlus size={11} />}
                          </span>
                        </button>

                        {chOpen && (
                          <div className="ml-2 pl-2 border-l border-violet-100 space-y-0.5 mb-1">
                            {(chapter.topics || []).map(topic => {
                              const tOpen = openTopics.has(topic._id);
                              const isActive = String(activeTopicId) === String(topic._id);
                              const label = topic.isImplicit
                                ? 'সব প্রশ্ন'
                                : `${topic.topicNo ? `${topic.topicNo}. ` : ''}${topic.title}`;

                              return (
                                <div key={topic._id}>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openTopic(part, chapter, topic)}
                                      className={`flex-1 min-w-0 text-left px-2.5 py-1.5 rounded-md text-[12px] transition truncate ${
                                        isActive
                                          ? 'bg-violet-100 text-violet-800 font-semibold'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      {label}
                                      <span className="text-[10px] text-slate-400 ml-1">
                                        {topic.answeredQuestions || 0}/{topic.totalQuestions || 0}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        toggleTopic(topic._id);
                                        if (!tOpen) openTopic(part, chapter, topic);
                                      }}
                                      className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-400 hover:text-violet-600 shrink-0"
                                    >
                                      {tOpen ? <FiMinus size={10} /> : <FiPlus size={10} />}
                                    </button>
                                  </div>

                                  {tOpen &&
                                    isActive &&
                                    questionsCache?.topicId === topic._id && (
                                      <div className="ml-1 mt-0.5 mb-1 space-y-0.5">
                                        {(questionsCache.questions || []).map((q, i) => {
                                          const qActive =
                                            String(activeQuestionId) === String(q._id);
                                          return (
                                            <button
                                              key={q._id}
                                              type="button"
                                              onClick={() =>
                                                onSelectQuestion(part, chapter, topic, i)
                                              }
                                              className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11.5px] flex gap-2 transition ${
                                                qActive
                                                  ? 'bg-violet-600 text-white'
                                                  : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700'
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
                                        {questionsCache.questions?.length === 0 && (
                                          <p className="px-2.5 py-1 text-[11px] text-slate-400">
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

      <style jsx global>{`
        .preview-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .preview-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .preview-scroll::-webkit-scrollbar-thumb {
          background: #c4b5fd;
          border-radius: 10px;
        }
        .preview-scroll::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
        }
      `}</style>
    </>
  );
}

export default function BookPreviewViewerPage() {
  const { bookId } = useParams();

  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [openParts, setOpenParts] = useState(() => new Set());
  const [openChapters, setOpenChapters] = useState(() => new Set());
  const [openTopics, setOpenTopics] = useState(() => new Set());

  const [activeTopic, setActiveTopic] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);
  const [activePart, setActivePart] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qLoading, setQLoading] = useState(false);
  const [activeQIndex, setActiveQIndex] = useState(0);

  const [mobileNav, setMobileNav] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  const openTopic = useCallback(async (part, chapter, topic, questionIndex = 0) => {
    setActivePart(part);
    setActiveChapter(chapter);
    setActiveTopic(topic);
    setOpenTopics(prev => new Set(prev).add(topic._id));
    setQLoading(true);
    setMobileNav(false);
    try {
      const res = await fetch(`${API}/book-content/questions/topic/${topic._id}`, {
        headers: hdrs(),
      });
      const body = await res.json();
      const list = body.data || [];
      setQuestions(list);
      const idx = list.length
        ? Math.min(Math.max(questionIndex, 0), list.length - 1)
        : 0;
      setActiveQIndex(idx);
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
    try {
      const res = await fetch(`${API}/book-content/tree/${bookId}`, { headers: hdrs() });
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
  }, [bookId]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // After tree bootstrap, load the first topic's questions once.
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
      setMobileNav(false);
      return;
    }
    openTopic(part, chapter, topic, index);
  };

  const activeQuestion = questions[activeQIndex];

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

  const sidebarProps = {
    totals,
    progressPct,
    search,
    setSearch,
    filteredParts,
    openParts,
    openChapters,
    openTopics,
    togglePart: id => toggleSet(setOpenParts, id),
    toggleChapter: id => toggleSet(setOpenChapters, id),
    toggleTopic: id => toggleSet(setOpenTopics, id),
    openTopic,
    activeTopicId: activeTopic?._id,
    activeQuestionId: activeQuestion?._id,
    questionsCache: activeTopic ? { topicId: activeTopic._id, questions } : null,
    onSelectQuestion: handleSelectQuestion,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <FiLoader className="w-5 h-5 animate-spin" /> লোড হচ্ছে…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
        <p className="text-rose-600 font-medium">{error}</p>
        <button
          onClick={loadTree}
          className="mt-4 text-sm text-rose-700 underline hover:no-underline"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  const bookTitle = tree?.book?.title || 'বুক প্রিভিউ';

  return (
    <div className="-m-4 lg:-m-6 xl:-m-7 min-h-[calc(100vh-64px)] flex flex-col bg-[#f4f5f8]">
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/admin/book-preview"
            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-violet-600 transition shrink-0"
          >
            <FiArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base lg:text-lg font-semibold text-violet-700 truncate">
              {bookTitle}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              অ্যাডমিন প্রিভিউ · পুরো বইয়ের কনটেন্ট
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileNav(true)}
            className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
          >
            <FiBookOpen size={14} /> কনটেন্ট
          </button>
          <Link
            href={`/dashboard/admin/books/${bookId}/content`}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            <FiEdit3 size={14} /> এডিট
          </Link>
        </div>
      </div>

      <div className="flex-1 flex min-h-0" style={{ height: 'calc(100vh - 64px - 57px)' }}>
        <main className="flex-1 min-w-0 overflow-y-auto px-4 lg:px-8 py-5 lg:py-7">
          {!activeTopic ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <FiBookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                ডান পাশ থেকে একটি টপিক বা প্রশ্ন বেছে নিন।
              </p>
            </div>
          ) : qLoading ? (
            <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
              <FiLoader className="w-5 h-5 animate-spin" /> প্রশ্ন লোড হচ্ছে…
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
              <p className="text-slate-500 text-sm">এই টপিকে এখনো কোনো প্রশ্ন নেই।</p>
            </div>
          ) : (
            activeQuestion && (
              <div className="max-w-3xl">
                {crumb && (
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2 truncate">
                    {crumb}
                  </p>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 overflow-hidden">
                  <div className="px-5 lg:px-7 pt-5 lg:pt-6 pb-2">
                    <p className="text-sm font-semibold text-amber-600 mb-2">
                      প্রশ্ন {activeQuestion.questionNo}
                    </p>
                    {activeQuestion.questionText ? (
                      <h2 className="text-lg lg:text-xl font-semibold text-slate-800 leading-relaxed">
                        {activeQuestion.questionText}
                      </h2>
                    ) : (
                      <p className="text-sm text-slate-400 italic">প্রশ্নটি এখনো যোগ করা হয়নি।</p>
                    )}
                  </div>

                  <div className="px-5 lg:px-7 pb-6 pt-3 space-y-5">
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
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
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

                <div className="flex items-center justify-end gap-2 mt-5">
                  <button
                    type="button"
                    disabled={activeQIndex === 0}
                    onClick={() => setActiveQIndex(i => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 disabled:opacity-35 hover:bg-slate-50 transition"
                  >
                    <FiChevronLeft size={16} /> Previous
                  </button>
                  <button
                    type="button"
                    disabled={activeQIndex >= questions.length - 1}
                    onClick={() =>
                      setActiveQIndex(i => Math.min(questions.length - 1, i + 1))
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-100 text-violet-700 px-4 py-2.5 text-sm font-semibold disabled:opacity-35 hover:bg-violet-200 transition"
                  >
                    Next <FiChevronRight size={16} />
                  </button>
                </div>

                {questions.length > 1 && (
                  <div className="mt-4 flex flex-wrap gap-2">
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
        </main>

        <aside className="hidden lg:flex w-[360px] xl:w-[400px] shrink-0 flex-col border-l border-slate-200 bg-white h-full">
          <SidebarPanel {...sidebarProps} />
        </aside>
      </div>

      {mobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setMobileNav(false)}
          />
          <div className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <p className="font-semibold text-slate-800">বুক কনটেন্ট</p>
              <button
                type="button"
                onClick={() => setMobileNav(false)}
                className="text-sm text-slate-500 px-2 py-1"
              >
                বন্ধ
              </button>
            </div>
            <SidebarPanel {...sidebarProps} />
          </div>
        </div>
      )}
    </div>
  );
}
