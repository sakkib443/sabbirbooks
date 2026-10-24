'use client';

/**
 * Courses → Course View (25 Oct 2026). Opens any course in the very player a
 * student gets after buying it (/dashboard/user/courses/<id>/learn) — staff
 * may watch every class, drafts included — so the shop can check what a buyer
 * will see. Each card also says what is in the course at a glance.
 */
/* eslint-disable @next/next/no-img-element */
import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FiLoader, FiPlayCircle, FiEdit2, FiLock, FiUnlock } from 'react-icons/fi';
import { Badge, COURSE_STATUS, btnGhost, btnPrimary, call, loadCourses, priceOf, taka } from '@/components/admin/courses/courseAdmin';

// useSearchParams needs a Suspense boundary to keep the route prerenderable.
export default function CourseViewPage() {
  return (
    <Suspense fallback={null}>
      <CourseView />
    </Suspense>
  );
}

function CourseView() {
  const params = useSearchParams();
  const picked = params.get('course');
  const [courses, setCourses] = useState(null);
  const [info, setInfo] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = (await loadCourses()).filter((c) => c.type === 'Recorded' || c._id === picked);
        if (!alive) return;
        setCourses(list);
        // Classes per course: how many, how many free previews.
        const entries = await Promise.all(
          list.map(async (c) => {
            try {
              const j = await call(`/lessons/course/${c._id}`);
              const ls = j.data || [];
              return [c._id, { lessons: ls.length, free: ls.filter((l) => l.isFree).length, drafts: ls.filter((l) => l.isPublished === false).length }];
            } catch {
              return [c._id, null];
            }
          })
        );
        if (alive) setInfo(Object.fromEntries(entries));
      } catch {
        if (alive) setCourses([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [picked]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dash-ink2">Course View</h1>
        <p className="text-sm text-dash-mute2">কোর্স কিনলে ছাত্র যেভাবে দেখে — সেই প্লেয়ারেই কোর্সটা খুলুন।</p>
      </div>

      {courses === null ? (
        <div className="flex items-center gap-2 p-10 text-dash-mute2"><FiLoader className="animate-spin" /> লোড হচ্ছে…</div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-dash-line bg-dash-card p-10 text-center text-dash-mute2">
          কোনো রেকর্ডেড কোর্স নেই। <Link href="/dashboard/admin/courses" className="font-semibold text-brand">All Courses</Link> থেকে যোগ করুন।
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const n = info[c._id];
            const price = priceOf(c);
            return (
              <div key={c._id} className={`overflow-hidden rounded-xl border bg-dash-card ${c._id === picked ? 'border-brand ring-2 ring-brand/20' : 'border-dash-line'}`}>
                <div className="relative aspect-video bg-dash-soft">
                  {c.image ? <img src={c.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-dash-faint"><FiPlayCircle size={36} /></div>}
                  <span className="absolute left-2 top-2"><Badge map={COURSE_STATUS} value={c.status || 'published'} /></span>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="font-semibold leading-snug text-dash-ink2">{c.titleBn || c.title}</p>
                    <p className="text-sm text-dash-mute2">{price > 0 ? taka(price) : 'ফ্রি'}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dash-mute">
                    {n ? (
                      <>
                        <span className="inline-flex items-center gap-1"><FiPlayCircle /> {n.lessons}টি ক্লাস</span>
                        <span className="inline-flex items-center gap-1"><FiUnlock /> {n.free}টি ফ্রি প্রিভিউ</span>
                        {n.drafts > 0 && <span className="inline-flex items-center gap-1 text-amber-700"><FiLock /> {n.drafts}টি খসড়া (ছাত্র দেখবে না)</span>}
                      </>
                    ) : (
                      <span>…</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/user/courses/${c._id}/learn`} className={`${btnPrimary} flex-1`}><FiPlayCircle /> ছাত্রের মতো দেখুন</Link>
                    <Link href={`/dashboard/admin/courses/${c._id}`} className={btnGhost} title="এডিট"><FiEdit2 /></Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
