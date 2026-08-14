'use client';

import React, { useEffect, useState } from 'react';
import { FiLoader, FiClipboard, FiPaperclip, FiFileText, FiDownload, FiUsers, FiGlobe } from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

export default function UserNoticeBoardPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`${API}/notices/my`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) setList(data.data || []);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="space-y-6 poppins">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white shadow-md shadow-brand/20">
          <FiClipboard size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dash-ink outfit">Notice Board</h1>
          <p className="text-sm text-dash-mute">সর্বশেষ নোটিশ ও ঘোষণা</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><FiLoader className="animate-spin text-brand" size={28} /></div>
      ) : list.length === 0 ? (
        <div className="bg-dash-card rounded-2xl border border-dashed border-dash-line p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-soft flex items-center justify-center mx-auto mb-4"><FiClipboard className="text-brand" size={26} /></div>
          <h3 className="text-base font-bold text-dash-ink3">এখনো কোনো নোটিশ নেই</h3>
          <p className="text-sm text-dash-mute2 mt-1">নতুন নোটিশ এলে এখানে দেখা যাবে।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((n) => (
            <div key={n._id} className="bg-dash-card rounded-2xl border border-dash-line shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-dash-ink2 outfit">{n.title}</h3>
                  {n.audience === 'enrolled' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-brand-soft text-brand-deep shrink-0"><FiUsers size={10} /> Enrolled</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 shrink-0"><FiGlobe size={10} /> Public</span>
                  )}
                </div>
                <p className="text-[11px] text-dash-mute2 mt-1">{fmtDate(n.createdAt)}</p>
                {n.body && <p className="text-sm text-dash-ink4 mt-3 whitespace-pre-line leading-relaxed">{n.body}</p>}

                {n.attachmentUrl && (
                  n.attachmentType === 'image' ? (
                    <a href={n.attachmentUrl} target="_blank" rel="noreferrer" className="block mt-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={n.attachmentUrl} alt={n.attachmentName || 'notice'} className="max-h-80 w-auto rounded-xl border border-dash-line-soft" />
                    </a>
                  ) : (
                    <a href={n.attachmentUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-lg bg-brand-soft text-brand-deep text-sm font-semibold hover:bg-brand-line/60 transition">
                      <FiFileText size={16} /> {n.attachmentName || 'ফাইল দেখুন'} <FiDownload size={14} />
                    </a>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
