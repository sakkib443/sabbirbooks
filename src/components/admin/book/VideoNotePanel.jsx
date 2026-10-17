'use client';

/**
 * The message a reader sees where a question has no video — for many
 * questions at once.
 *
 * 18 Oct 2026: there is no fixed default sentence any more. A question shows
 * a message only when one has been put on it. Here the admin picks a saved
 * message (or writes a new one and saves it for later), ticks the questions,
 * and puts it on them — or takes the message off. The same can be done for
 * every video-less question in the book. Saved messages are shared by every
 * book and can be removed from the list here.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiChevronDown, FiLoader, FiTrash2 } from 'react-icons/fi';

const NEW = '__new';

export default function VideoNotePanel({ questions, bookId, api, headers, onApplied, notify }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [presets, setPresets] = useState([]); // [{ _id, text }]
  const [choice, setChoice] = useState(''); // a preset's text, or NEW
  const [draft, setDraft] = useState('');
  const [ticked, setTicked] = useState(() => new Set());

  const videoless = useMemo(() => questions.filter((q) => !(q.videos?.length > 0)), [questions]);
  const withNote = videoless.filter((q) => !q.hideVideoNote && (q.videoNote || '').trim()).length;
  const text = (choice === NEW ? draft : choice).trim();

  const loadPresets = useCallback(async () => {
    try {
      const res = await fetch(`${api}/book-content/video-note-presets`, { headers: headers() });
      const json = await res.json().catch(() => ({}));
      setPresets(Array.isArray(json.data) ? json.data : []);
    } catch {
      setPresets([]);
    }
  }, [api, headers]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(loadPresets, 0);
    return () => clearTimeout(t);
  }, [open, loadPresets]);

  const toggle = (id) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const call = async (body) => {
    const res = await fetch(`${api}/book-content/video-note-visibility`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Save failed');
    return json.data;
  };

  const savePreset = async () => {
    if (!draft.trim()) return;
    setBusy('preset');
    try {
      const res = await fetch(`${api}/book-content/video-note-presets`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ text: draft.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not save');
      await loadPresets();
      setChoice(draft.trim());
      setDraft('');
      notify?.('লেখাটা সেভ হয়েছে');
    } catch (e) {
      notify?.(e.message, 'error', 0);
    } finally {
      setBusy('');
    }
  };

  const removePreset = async (p) => {
    setBusy(`del-${p._id}`);
    try {
      const res = await fetch(`${api}/book-content/video-note-presets/${p._id}`, { method: 'DELETE', headers: headers() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not remove');
      if (choice === p.text) setChoice('');
      await loadPresets();
    } catch (e) {
      notify?.(e.message, 'error', 0);
    } finally {
      setBusy('');
    }
  };

  // Put the message on (note = text) or take it off (note = '').
  const apply = async (scope, note) => {
    if (scope === 'ticked' && ticked.size === 0) return;
    setBusy(`${scope}-${note ? 'on' : 'off'}`);
    try {
      const r =
        scope === 'ticked'
          ? await call({ show: true, note, questionIds: [...ticked] })
          : await call({ show: true, note, bookId });
      const hit = (q) => (scope === 'ticked' ? ticked.has(q._id) : !(q.videos?.length > 0));
      onApplied((q) => (hit(q) ? { ...q, videoNote: note, hideVideoNote: !note } : q));
      setTicked(new Set());
      notify?.(
        note
          ? `${r.matched}টি প্রশ্নে লেখাটা বসানো হয়েছে`
          : `${r.matched}টি প্রশ্ন থেকে লেখা সরানো হয়েছে`
      );
    } catch (e) {
      notify?.(e.message, 'error', 0);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
          <FiAlertTriangle className="h-4 w-4" />
          ভিডিও না থাকলে পাঠক যে লেখা দেখবে
          <span className="text-xs font-normal text-amber-700">
            ({videoless.length ? `এই টপিকে ${withNote}/${videoless.length}টিতে লেখা আছে` : 'এই টপিকে সব প্রশ্নে ভিডিও আছে'})
          </span>
        </span>
        <FiChevronDown className={`h-4 w-4 text-amber-700 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-amber-200 px-3 py-3">
          {/* 1. Which message */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-dash-ink3">১. কোন লেখা</p>
            <select
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className="w-full rounded-lg border border-dash-line-strong bg-dash-card px-3 py-2 text-sm"
            >
              <option value="">— লেখা বেছে নিন —</option>
              {presets.map((p) => (
                <option key={p._id} value={p.text}>
                  {p.text.length > 70 ? `${p.text.slice(0, 70)}…` : p.text}
                </option>
              ))}
              <option value={NEW}>নতুন লেখা লিখুন…</option>
            </select>
            {choice === NEW && (
              <div className="space-y-1.5">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="যেমন: এই প্রশ্নের ভিডিও শীঘ্রই যোগ করা হবে।"
                  className="w-full rounded-lg border border-dash-line-strong bg-dash-card px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={savePreset}
                  disabled={!draft.trim() || Boolean(busy)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft disabled:opacity-40"
                >
                  {busy === 'preset' && <FiLoader className="h-3.5 w-3.5 animate-spin" />}
                  সেভ করে রাখুন
                </button>
              </div>
            )}
            {presets.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-dash-mute">সেভ করা লেখাগুলো ({presets.length})</summary>
                <ul className="mt-1.5 space-y-1">
                  {presets.map((p) => (
                    <li key={p._id} className="flex items-start gap-2 rounded-md bg-dash-card px-2 py-1.5">
                      <span className="flex-1 whitespace-pre-line text-dash-ink3">{p.text}</span>
                      <button
                        type="button"
                        onClick={() => removePreset(p)}
                        disabled={Boolean(busy)}
                        title="তালিকা থেকে সরান (যেসব প্রশ্নে বসানো আছে সেখানে থেকে যাবে)"
                        className="shrink-0 rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-40"
                      >
                        {busy === `del-${p._id}` ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiTrash2 className="h-3.5 w-3.5" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* 2. Which questions */}
          {videoless.length > 0 && (
            <div className="space-y-2 border-t border-amber-200 pt-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-dash-ink3">২. এই টপিকের কোন প্রশ্নে</span>
                <button type="button" onClick={() => setTicked(new Set(videoless.map((q) => q._id)))} className="rounded-md border border-dash-line-strong bg-dash-card px-2.5 py-1 hover:bg-dash-soft">
                  সব টিক দিন
                </button>
                <button type="button" onClick={() => setTicked(new Set())} className="rounded-md border border-dash-line-strong bg-dash-card px-2.5 py-1 hover:bg-dash-soft">
                  সব টিক তুলুন
                </button>
              </div>
              <ul className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
                {videoless.map((q) => {
                  const note = !q.hideVideoNote && (q.videoNote || '').trim();
                  return (
                    <li key={q._id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-dash-card">
                        <input
                          type="checkbox"
                          checked={ticked.has(q._id)}
                          onChange={() => toggle(q._id)}
                          className="mt-0.5 h-4 w-4 rounded border-dash-line-strong text-brand focus:ring-brand"
                        />
                        <span className="min-w-0 text-xs text-dash-ink3">
                          <b>প্রশ্ন {q.questionNo}</b>{' '}
                          <span className="text-dash-mute">{String(q.questionText || '').slice(0, 50)}</span>
                          <span className={`block truncate text-[11px] ${note ? 'text-amber-700' : 'text-dash-mute2'}`}>
                            {note ? `লেখা: ${note}` : 'কোনো লেখা নেই'}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => apply('ticked', text)}
                  disabled={!text || ticked.size === 0 || Boolean(busy)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {busy === 'ticked-on' && <FiLoader className="h-3.5 w-3.5 animate-spin" />}
                  টিক দেওয়াগুলোতে লেখাটা বসান ({ticked.size})
                </button>
                <button
                  type="button"
                  onClick={() => apply('ticked', '')}
                  disabled={ticked.size === 0 || Boolean(busy)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-40"
                >
                  {busy === 'ticked-off' && <FiLoader className="h-3.5 w-3.5 animate-spin" />}
                  টিক দেওয়াগুলো থেকে লেখা সরান
                </button>
              </div>
            </div>
          )}

          {/* The whole book */}
          <div className="flex flex-wrap items-center gap-2 border-t border-amber-200 pt-3 text-xs">
            <span className="font-medium text-dash-ink3">পুরো বইয়ের সব ভিডিও-ছাড়া প্রশ্নে:</span>
            <button
              type="button"
              onClick={() => apply('book', text)}
              disabled={!text || Boolean(busy)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
            >
              {busy === 'book-on' && <FiLoader className="h-3 w-3 animate-spin" />} লেখাটা বসান
            </button>
            <button
              type="button"
              onClick={() => apply('book', '')}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40"
            >
              {busy === 'book-off' && <FiLoader className="h-3 w-3 animate-spin" />} সব থেকে লেখা সরান
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
