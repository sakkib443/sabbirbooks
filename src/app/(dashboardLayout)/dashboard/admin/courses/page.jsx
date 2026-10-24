'use client';

/**
 * Courses → All Courses (25 Oct 2026). One row per course: picture, name,
 * price, whether it is live. Edit opens the course with its modules and
 * classes; View opens it exactly as a buyer sees it. The Super Admin also has
 * "ডেমো কোর্স" — a ready-made recorded course to see the whole flow with.
 */
/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiPlus, FiEdit2, FiEye, FiExternalLink, FiLoader, FiRefreshCw, FiZap, FiPlayCircle } from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { getStoredUser } from '@/lib/permissions';
import { Badge, COURSE_STATUS, btnGhost, btnPrimary, call, loadCourses, priceOf, taka } from '@/components/admin/courses/courseAdmin';

export default function AllCoursesPage() {
  const { showToast, toastNode } = useToast();
  const [courses, setCourses] = useState(null);
  const [busy, setBusy] = useState('');
  const [isSuper, setIsSuper] = useState(false);

  const load = useCallback(async () => {
    try {
      setCourses(await loadCourses());
    } catch (e) {
      showToast('error', e.message);
      setCourses([]);
    }
  }, [showToast]);

  useEffect(() => {
    setTimeout(load, 0);
    setTimeout(() => setIsSuper(getStoredUser()?.role === 'superAdmin'), 0);
  }, [load]);

  const makeDemo = async () => {
    setBusy('demo');
    try {
      const r = await call('/courses/demo-course', 'POST');
      showToast('success', r.message === 'Demo course created' ? 'ডেমো কোর্স তৈরি হয়েছে' : 'ডেমো কোর্স আগে থেকেই আছে');
      await load();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setBusy('');
    }
  };

  const setStatus = async (c, status) => {
    setBusy(c._id);
    try {
      await call(`/courses/${c._id}`, 'PATCH', { status });
      showToast('success', status === 'published' ? 'কোর্স চালু হয়েছে' : 'কোর্স খসড়ায় গেছে');
      await load();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5">
      {toastNode}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink2">All Courses</h1>
          <p className="text-sm text-dash-mute2">সব কোর্স — চালু, খসড়া, বন্ধ।</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} className={btnGhost}><FiRefreshCw /> রিফ্রেশ</button>
          {isSuper && (
            <button type="button" onClick={makeDemo} disabled={busy === 'demo'} className={btnGhost}>
              {busy === 'demo' ? <FiLoader className="animate-spin" /> : <FiZap />} ডেমো কোর্স
            </button>
          )}
          <Link href="/dashboard/admin/courses/add" className={btnPrimary}><FiPlus /> Add Course</Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-dash-line bg-dash-card">
        {courses === null ? (
          <div className="flex items-center justify-center gap-2 p-10 text-dash-mute2"><FiLoader className="animate-spin" /> লোড হচ্ছে…</div>
        ) : courses.length === 0 ? (
          <div className="p-10 text-center text-dash-mute2">
            এখনো কোনো কোর্স নেই। <Link href="/dashboard/admin/courses/add" className="font-semibold text-brand">নতুন কোর্স যোগ করুন</Link>
            {isSuper && <> অথবা উপরের <b>ডেমো কোর্স</b> বাটন চাপুন।</>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-dash-soft text-left text-xs uppercase tracking-wide text-dash-mute2">
                <tr>
                  <th className="px-4 py-3">কোর্স</th>
                  <th className="px-4 py-3">ধরন</th>
                  <th className="px-4 py-3">দাম</th>
                  <th className="px-4 py-3">অবস্থা</th>
                  <th className="px-4 py-3 text-right">কাজ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-line">
                {courses.map((c) => {
                  const price = priceOf(c);
                  const status = c.status || 'published';
                  return (
                    <tr key={c._id} className="hover:bg-dash-soft/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-dash-soft">
                            {c.image ? <img src={c.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-dash-faint"><FiPlayCircle size={20} /></div>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-dash-ink2">{c.title}</p>
                            <p className="text-xs text-dash-mute2">{new Date(c.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' })}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-dash-mute">{c.type === 'Recorded' ? 'রেকর্ডেড' : c.type || '—'}</td>
                      <td className="px-4 py-3">
                        {price > 0 ? (
                          <>
                            <span className="font-semibold text-dash-ink2">{taka(price)}</span>
                            {price < Number(c.fee) && <span className="ml-1.5 text-xs text-dash-faint line-through">{taka(c.fee)}</span>}
                          </>
                        ) : (
                          <span className="font-semibold text-emerald-700">ফ্রি</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><Badge map={COURSE_STATUS} value={status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {status === 'published' ? (
                            <button type="button" disabled={busy === c._id} onClick={() => setStatus(c, 'draft')} className={btnGhost} title="খসড়ায় নিন (সাইটে দেখাবে না)">লুকান</button>
                          ) : (
                            <button type="button" disabled={busy === c._id} onClick={() => setStatus(c, 'published')} className={btnGhost} title="সাইটে দেখান">চালু করুন</button>
                          )}
                          <Link href={`/dashboard/admin/courses/${c._id}`} className={btnGhost}><FiEdit2 /> Edit</Link>
                          <Link href={`/dashboard/admin/courses/view?course=${c._id}`} className={btnGhost} title="কেনা ছাত্র যেভাবে দেখে"><FiEye /> View</Link>
                          {status === 'published' && (
                            <a href={`/courses/${c.slug || c._id}`} target="_blank" rel="noreferrer" className={btnGhost} title="সাইটে কোর্সের পাতা"><FiExternalLink /></a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
