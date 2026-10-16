'use client';

/**
 * "যান্ত্রিক ত্রুটির কারণে ভিডিওটি…" — on or off, many questions at once.
 *
 * Lists this topic's questions that have no video (the only ones that ever
 * show the notice). Ticked = the reader sees the notice. Tick all, untick a
 * few, save. The book-wide buttons do the same for every video-less question
 * in the whole book. A question with a video is not listed: it never shows
 * the notice, whatever the switch says.
 */

import { useMemo, useState } from 'react';
import { FiAlertTriangle, FiChevronDown, FiLoader } from 'react-icons/fi';

export default function VideoNotePanel({ questions, bookId, api, headers, onApplied, notify }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const videoless = useMemo(() => questions.filter((q) => !(q.videos?.length > 0)), [questions]);

  // What the admin has ticked, starting from what is saved.
  const [ticked, setTicked] = useState(null);
  const current = ticked ?? new Set(videoless.filter((q) => !q.hideVideoNote).map((q) => q._id));
  const shownNow = videoless.filter((q) => !q.hideVideoNote).length;
  const dirty = videoless.some((q) => current.has(q._id) === Boolean(q.hideVideoNote));

  const toggle = (id) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTicked(next);
  };
  const setAll = (on) => setTicked(new Set(on ? videoless.map((q) => q._id) : []));

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

  const save = async () => {
    setBusy('topic');
    try {
      const show = videoless.filter((q) => current.has(q._id)).map((q) => q._id);
      const hide = videoless.filter((q) => !current.has(q._id)).map((q) => q._id);
      if (show.length) await call({ show: true, questionIds: show });
      if (hide.length) await call({ show: false, questionIds: hide });
      onApplied((q) => (videoless.some((v) => v._id === q._id) ? { ...q, hideVideoNote: !current.has(q._id) } : q));
      setTicked(null);
      notify?.('সংরক্ষিত হয়েছে');
    } catch (e) {
      notify?.(e.message, 'error', 0);
    } finally {
      setBusy('');
    }
  };

  const wholeBook = async (show) => {
    setBusy(show ? 'book-on' : 'book-off');
    try {
      const r = await call({ show, bookId });
      onApplied((q) => (q.videos?.length > 0 ? q : { ...q, hideVideoNote: !show }));
      setTicked(null);
      notify?.(`পুরো বইয়ে ${r.matched}টি ভিডিও-ছাড়া প্রশ্নে বার্তা ${show ? 'চালু' : 'বন্ধ'} হয়েছে`);
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
          ভিডিও না থাকলে যে বার্তা দেখায়
          <span className="text-xs font-normal text-amber-700">
            ({videoless.length ? `এই টপিকে ${shownNow}/${videoless.length}টিতে চালু` : 'এই টপিকে সব প্রশ্নে ভিডিও আছে'})
          </span>
        </span>
        <FiChevronDown className={`h-4 w-4 text-amber-700 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-amber-200 px-3 py-3">
          {videoless.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button type="button" onClick={() => setAll(true)} className="rounded-md border border-dash-line-strong bg-dash-card px-2.5 py-1 hover:bg-dash-soft">
                  সব টিক দিন
                </button>
                <button type="button" onClick={() => setAll(false)} className="rounded-md border border-dash-line-strong bg-dash-card px-2.5 py-1 hover:bg-dash-soft">
                  সব টিক তুলুন
                </button>
                <span className="text-dash-mute2">টিক দেওয়া = পাঠক বার্তাটা দেখবে</span>
              </div>

              <ul className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
                {videoless.map((q) => (
                  <li key={q._id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-dash-card">
                      <input
                        type="checkbox"
                        checked={current.has(q._id)}
                        onChange={() => toggle(q._id)}
                        className="mt-0.5 h-4 w-4 rounded border-dash-line-strong text-brand focus:ring-brand"
                      />
                      <span className="min-w-0 text-xs text-dash-ink3">
                        <b>প্রশ্ন {q.questionNo}</b>{' '}
                        <span className="text-dash-mute">{String(q.questionText || '').slice(0, 60)}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={save}
                disabled={!dirty || Boolean(busy)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                {busy === 'topic' && <FiLoader className="h-3.5 w-3.5 animate-spin" />}
                এই টপিকের জন্য সংরক্ষণ
              </button>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-amber-200 pt-3 text-xs">
            <span className="font-medium text-dash-ink3">পুরো বইয়ের সব ভিডিও-ছাড়া প্রশ্নে:</span>
            <button
              type="button"
              onClick={() => wholeBook(true)}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
            >
              {busy === 'book-on' && <FiLoader className="h-3 w-3 animate-spin" />} সব চালু
            </button>
            <button
              type="button"
              onClick={() => wholeBook(false)}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40"
            >
              {busy === 'book-off' && <FiLoader className="h-3 w-3 animate-spin" />} সব বন্ধ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
