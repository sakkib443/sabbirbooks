'use client';

/**
 * The course's modules and classes, edited in place (11 Nov 2026) — no
 * pop-ups: a module is a card, its classes are rows inside it, and a new one
 * is typed straight into the empty row at the bottom. Each class is a YouTube
 * link (its thumbnail shows as soon as the link is right) and a length in
 * minutes (stored in seconds, as the player reads it). Names in Bengali and
 * English, like the rest of the course; either may be left empty.
 */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from 'react';
import { FiArrowDown, FiArrowUp, FiCheck, FiEdit2, FiLoader, FiPlus, FiTrash2, FiVideo, FiX } from 'react-icons/fi';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { btnGhost, btnPrimary, call, input } from './courseAdmin';

/** The YouTube video id in a link, or ''. */
export const youtubeId = (url) => {
  try {
    const u = new URL(String(url || '').trim());
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
    if (!u.hostname.includes('youtube.com')) return '';
    if (u.pathname.startsWith('/embed/') || u.pathname.startsWith('/shorts/') || u.pathname.startsWith('/live/')) return u.pathname.split('/')[2] || '';
    return u.searchParams.get('v') || '';
  } catch {
    return '';
  }
};
const thumb = (url) => {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '';
};
const nameOf = (x) => x?.titleBn || x?.title || '';
// `title` is required on the server: English, or the Bengali when there is none.
const names = (bn, en) => ({ titleBn: bn.trim(), title: en.trim() || bn.trim() });

export default function CurriculumEditor({ courseId, onStats }) {
  const { confirm, confirmNode } = useConfirm();
  const [modules, setModules] = useState(null);
  const [lessons, setLessons] = useState({});
  const [error, setError] = useState('');
  const [newModule, setNewModule] = useState({ bn: '', en: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const mods = (await call(`/modules/course/${courseId}`)).data || [];
      const entries = await Promise.all(mods.map(async (m) => [m._id, (await call(`/lessons/module/${m._id}`)).data || []]));
      setModules(mods);
      setLessons(Object.fromEntries(entries));
      setError('');
    } catch (e) {
      setError(e.message);
      setModules([]);
    }
  }, [courseId]);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!modules) return;
    const all = Object.values(lessons).flat();
    onStats?.({
      modules: modules.length,
      classes: all.length,
      minutes: Math.round(all.reduce((a, l) => a + (Number(l.videoDuration) || 0), 0) / 60),
    });
  }, [modules, lessons, onStats]);

  const run = async (key, fn) => {
    setBusy(key);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const addModule = () => {
    if (!newModule.bn.trim() && !newModule.en.trim()) return setError('মডিউলের নাম লিখুন');
    return run('new-module', async () => {
      await call('/modules/create', 'POST', { courseId, ...names(newModule.bn, newModule.en), isPublished: true });
      setNewModule({ bn: '', en: '' });
    });
  };

  const moveModule = (i, dir) =>
    run(`move-${i}`, async () => {
      const list = [...modules];
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      await call(`/modules/reorder/${courseId}`, 'PATCH', { moduleOrders: list.map((m, k) => ({ moduleId: m._id, order: k + 1 })) });
    });

  const removeModule = async (m) => {
    const ok = await confirm({ title: 'মডিউলটা মুছবেন?', message: `"${nameOf(m)}" আর এর ভেতরের সব ক্লাস মুছে যাবে।`, confirmText: 'মুছুন', danger: true });
    if (ok) run(`del-${m._id}`, () => call(`/modules/${m._id}`, 'DELETE'));
  };

  if (modules === null) {
    return <div className="flex items-center gap-2 p-6 text-dash-mute2"><FiLoader className="animate-spin" /> লোড হচ্ছে…</div>;
  }

  return (
    <div className="space-y-4">
      {confirmNode}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {modules.length === 0 && (
        <p className="rounded-xl border border-dashed border-dash-line bg-dash-soft/50 p-5 text-center text-sm text-dash-mute2">
          এখনো কোনো মডিউল নেই। নিচে প্রথম মডিউলের নাম লিখে <b>মডিউল যোগ করুন</b> চাপুন — যেমন &ldquo;শুরু করার আগে&rdquo;।
        </p>
      )}

      {modules.map((m, i) => (
        <ModuleCard
          key={m._id}
          index={i}
          count={modules.length}
          module={m}
          lessons={lessons[m._id] || []}
          busy={busy}
          run={run}
          confirm={confirm}
          onMove={moveModule}
          onRemove={() => removeModule(m)}
        />
      ))}

      {/* New module */}
      <div className="rounded-xl border-2 border-dashed border-brand/30 bg-brand-soft/30 p-4">
        <p className="mb-2 text-sm font-bold text-dash-ink2">নতুন মডিউল</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input value={newModule.bn} onChange={(e) => setNewModule((v) => ({ ...v, bn: e.target.value }))} placeholder="মডিউলের নাম (বাংলা)" className={input} onKeyDown={(e) => e.key === 'Enter' && addModule()} />
          <input value={newModule.en} onChange={(e) => setNewModule((v) => ({ ...v, en: e.target.value }))} placeholder="Module name (English)" className={input} onKeyDown={(e) => e.key === 'Enter' && addModule()} />
          <button type="button" onClick={addModule} disabled={busy === 'new-module'} className={btnPrimary}>
            {busy === 'new-module' ? <FiLoader className="animate-spin" /> : <FiPlus />} মডিউল যোগ করুন
          </button>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ index, count, module: m, lessons, busy, run, confirm, onMove, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState({ bn: m.titleBn || '', en: m.titleBn && m.title === m.titleBn ? '' : m.title || '' });
  const blank = { bn: '', en: '', url: '', min: '' };
  const [draft, setDraft] = useState(blank);

  const saveName = () =>
    run(`name-${m._id}`, async () => {
      await call(`/modules/${m._id}`, 'PATCH', names(name.bn, name.en));
      setEditing(false);
    });

  const addLesson = () => {
    if (!draft.bn.trim() && !draft.en.trim()) return run('', async () => { throw new Error('ক্লাসের নাম লিখুন'); });
    if (!youtubeId(draft.url)) return run('', async () => { throw new Error('ঠিক YouTube লিংক দিন (youtube.com/watch?v=… বা youtu.be/…)'); });
    return run(`new-${m._id}`, async () => {
      await call('/lessons/create', 'POST', {
        moduleId: m._id,
        ...names(draft.bn, draft.en),
        type: 'video',
        videoUrl: draft.url.trim(),
        videoDuration: Math.round((Number(draft.min) || 0) * 60),
        isPublished: true,
      });
      setDraft(blank);
    });
  };

  const moveLesson = (i, dir) =>
    run(`lmove-${m._id}`, async () => {
      const j = i + dir;
      if (j < 0 || j >= lessons.length) return;
      const a = lessons[i];
      const b = lessons[j];
      await call(`/lessons/${a._id}`, 'PATCH', { order: b.order });
      await call(`/lessons/${b._id}`, 'PATCH', { order: a.order });
    });

  const removeLesson = async (l) => {
    const ok = await confirm({ title: 'ক্লাসটা মুছবেন?', message: `"${nameOf(l)}"`, confirmText: 'মুছুন', danger: true });
    if (ok) run(`ldel-${l._id}`, () => call(`/lessons/${l._id}`, 'DELETE'));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-dash-line bg-dash-card">
      {/* Module header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-dash-line bg-dash-soft/60 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">{String(index + 1).padStart(2, '0')}</span>
        {editing ? (
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <input value={name.bn} onChange={(e) => setName((v) => ({ ...v, bn: e.target.value }))} placeholder="বাংলা" className={input} />
            <input value={name.en} onChange={(e) => setName((v) => ({ ...v, en: e.target.value }))} placeholder="English" className={input} />
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="font-bold text-dash-ink2">{nameOf(m)}</p>
            {m.titleBn && m.title && m.title !== m.titleBn && <p className="text-xs text-dash-mute2">{m.title}</p>}
          </div>
        )}
        <span className="text-xs text-dash-mute2">{lessons.length}টি ক্লাস</span>
        <div className="flex gap-1">
          {editing ? (
            <>
              <button type="button" onClick={saveName} className={btnGhost} title="সেভ"><FiCheck /></button>
              <button type="button" onClick={() => setEditing(false)} className={btnGhost} title="বাতিল"><FiX /></button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0 || !!busy} className={btnGhost} title="উপরে"><FiArrowUp /></button>
              <button type="button" onClick={() => onMove(index, 1)} disabled={index === count - 1 || !!busy} className={btnGhost} title="নিচে"><FiArrowDown /></button>
              <button type="button" onClick={() => setEditing(true)} className={btnGhost} title="নাম বদলান"><FiEdit2 /></button>
              <button type="button" onClick={onRemove} className={`${btnGhost} text-rose-600`} title="মুছুন"><FiTrash2 /></button>
            </>
          )}
        </div>
      </div>

      {/* Classes */}
      <ul className="divide-y divide-dash-line">
        {lessons.map((l, i) => (
          <li key={l._id} className="flex items-center gap-3 px-4 py-2.5">
            {thumb(l.videoUrl) ? (
              <img src={thumb(l.videoUrl)} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
            ) : (
              <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-dash-soft text-dash-faint"><FiVideo /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-dash-ink2">{nameOf(l)}</p>
              <p className="truncate text-xs text-dash-mute2">
                {l.videoDuration ? `${Math.max(1, Math.round(l.videoDuration / 60))} মিনিট · ` : ''}
                {l.videoUrl || 'ভিডিও লিংক নেই'}
              </p>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => moveLesson(i, -1)} disabled={i === 0 || !!busy} className={btnGhost} title="উপরে"><FiArrowUp /></button>
              <button type="button" onClick={() => moveLesson(i, 1)} disabled={i === lessons.length - 1 || !!busy} className={btnGhost} title="নিচে"><FiArrowDown /></button>
              <button type="button" onClick={() => removeLesson(l)} className={`${btnGhost} text-rose-600`} title="মুছুন"><FiTrash2 /></button>
            </div>
          </li>
        ))}
      </ul>

      {/* New class */}
      <div className="space-y-2 bg-dash-soft/30 px-4 py-3">
        <p className="text-xs font-bold text-dash-mute">+ নতুন ক্লাস এই মডিউলে</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={draft.bn} onChange={(e) => setDraft((d) => ({ ...d, bn: e.target.value }))} placeholder="ক্লাসের নাম (বাংলা)" className={input} />
          <input value={draft.en} onChange={(e) => setDraft((d) => ({ ...d, en: e.target.value }))} placeholder="Class name (English)" className={input} />
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
          <div className="flex items-center gap-2">
            {thumb(draft.url) && <img src={thumb(draft.url)} alt="" className="h-9 w-14 shrink-0 rounded object-cover" />}
            <input value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="YouTube লিংক (Unlisted রাখা ভালো)" className={input} />
          </div>
          <input value={draft.min} onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value.replace(/[^\d.]/g, '') }))} inputMode="decimal" placeholder="মিনিট" className={input} />
          <button type="button" onClick={addLesson} disabled={busy === `new-${m._id}`} className={btnPrimary}>
            {busy === `new-${m._id}` ? <FiLoader className="animate-spin" /> : <FiPlus />} ক্লাস যোগ করুন
          </button>
        </div>
      </div>
    </div>
  );
}
