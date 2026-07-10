'use client';

import React, { useState, useEffect } from 'react';
import { FiLoader, FiUpload, FiCalendar, FiAward, FiCheckCircle, FiClock, FiAlertCircle, FiX } from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';

export default function StudentAssignmentsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState(null);
  const [submitForm, setSubmitForm] = useState({ text: '', fileUrl: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadSubmissions(); }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/assignments/my-submissions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setSubmissions(data.success ? data.data || [] : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Load all available assignments
  const [assignments, setAssignments] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/assignments`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const data = await res.json();
        setAssignments((data.data || []).filter(a => a.isPublished));
      } catch (e) { console.error(e); }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!submitModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/assignments/${submitModal._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(submitForm),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitModal(null);
        setSubmitForm({ text: '', fileUrl: '' });
        loadSubmissions();
        alert('✅ Submitted!');
      } else alert(data.message);
    } catch { alert('Error'); }
    finally { setSubmitting(false); }
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const dl = new Date(deadline);
    const diff = dl.getTime() - now.getTime();
    if (diff <= 0) return { text: 'Overdue', overdue: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return { text: `${days}d ${hours}h remaining`, overdue: false };
    return { text: `${hours}h remaining`, overdue: false };
  };

  const submittedIds = submissions.map(s => s.assignmentId?._id);
  const pending = assignments.filter(a => !submittedIds.includes(a._id));

  if (loading) return <div className="p-6 min-h-screen bg-slate-50 flex items-center justify-center"><FiLoader className="animate-spin text-[#F3A522]" size={30} /></div>;

  return (
    <div className="space-y-6">
      <div className="mb-2"><h1 className="text-2xl font-bold text-slate-900">My Assignments</h1></div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm text-center">
          <p className="text-3xl font-bold text-[#F3A522]">{assignments.length}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm text-center">
          <p className="text-3xl font-bold text-emerald-600">{submissions.length}</p>
          <p className="text-xs text-slate-500">Submitted</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm text-center">
          <p className="text-3xl font-bold text-amber-600">{pending.length}</p>
          <p className="text-xs text-slate-500">Pending</p>
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FiAlertCircle className="text-amber-500" /> Pending Assignments</h2>
          <div className="space-y-2">
            {pending.map(a => {
              const tr = getTimeRemaining(a.deadline);
              return (
                <div key={a._id} className={`bg-white rounded-xl border p-4 ${tr.overdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200/60'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{a.title}</h3>
                      <p className="text-xs text-slate-500">{a.courseId?.title}</p>
                      <div className="flex gap-3 mt-1 text-xs text-slate-400">
                        <span><FiAward className="inline mr-1" />{a.totalMarks} marks</span>
                        <span className={tr.overdue ? 'text-red-600 font-bold' : 'text-amber-600'}>
                          <FiClock className="inline mr-1" />{tr.text}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => { setSubmitModal(a); setSubmitForm({ text: '', fileUrl: '' }); }}
                      disabled={tr.overdue}
                      className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 ${tr.overdue ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#F3A522] text-white hover:shadow-lg'}`}>
                      <FiUpload size={14} /> Submit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submitted */}
      <h2 className="font-bold text-slate-800 mb-3">📝 Submitted Assignments</h2>
      <div className="space-y-2">
        {submissions.length === 0 ? (
          <p className="text-slate-500 text-sm">No submissions yet.</p>
        ) : submissions.map(s => (
          <div key={s._id} className="bg-white rounded-xl border border-slate-200/60 p-4 flex items-center justify-between shadow-sm hover:shadow-md transition">
            <div>
              <p className="font-bold text-slate-800 text-sm">{s.assignmentId?.title}</p>
              <p className="text-xs text-slate-500">{s.assignmentId?.courseId?.title} • {new Date(s.submittedAt).toLocaleDateString()}</p>
              {s.status === 'graded' && s.feedback && (
                <p className="text-xs text-slate-500 mt-1">💬 {s.feedback}</p>
              )}
            </div>
            <div className="text-right">
              {s.status === 'graded' ? (
                <div>
                  <p className="text-lg font-bold text-emerald-600">{s.marks}/{s.assignmentId?.totalMarks}</p>
                  <p className="text-[10px] text-emerald-500 font-bold">Graded ✓</p>
                </div>
              ) : (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">Pending Review</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Modal */}
      {submitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-800">Submit: {submitModal.title}</h2>
              <button onClick={() => setSubmitModal(null)}><FiX /></button>
            </div>
            {submitModal.description && <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mb-4">{submitModal.description}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Your Answer</label>
                <textarea value={submitForm.text} onChange={e => setSubmitForm({...submitForm, text: e.target.value})}
                  rows={5} placeholder="Write your answer here..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:border-[#F3A522] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">File URL (optional)</label>
                <input value={submitForm.fileUrl} onChange={e => setSubmitForm({...submitForm, fileUrl: e.target.value})}
                  placeholder="Google Drive / Cloudinary link" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#F3A522] outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setSubmitModal(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2 bg-[#F3A522] text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
