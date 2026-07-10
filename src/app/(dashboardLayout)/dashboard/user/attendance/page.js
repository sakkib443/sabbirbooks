'use client';

import React, { useState, useEffect } from 'react';
import { FiLoader, FiCheckCircle, FiClock, FiXCircle, FiCalendar } from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

export default function StudentAttendancePage() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token') || '';
        const [recRes, sumRes] = await Promise.all([
          fetch(`${API}/attendance/my`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/attendance/my/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const recData = await recRes.json();
        const sumData = await sumRes.json();
        if (recData.success) setRecords(recData.data || []);
        if (sumData.success) setSummary(sumData.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const getStatusIcon = (s) => {
    switch (s) {
      case 'present': return <FiCheckCircle className="text-emerald-600" />;
      case 'late': return <FiClock className="text-amber-600" />;
      case 'absent': return <FiXCircle className="text-red-500" />;
      default: return <FiCalendar className="text-slate-400" />;
    }
  };

  const getStatusBg = (s) => {
    switch (s) {
      case 'present': return 'bg-emerald-50 border-emerald-200';
      case 'late': return 'bg-amber-50 border-amber-200';
      case 'absent': return 'bg-red-50 border-red-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-slate-50 flex items-center justify-center">
        <FiLoader className="animate-spin text-[#F3A522]" size={30} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Attendance</h1>
        <p className="text-slate-500 text-sm mt-1">Track your class attendance record</p>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm text-center">
            <p className={`text-3xl font-bold ${summary.rate >= 80 ? 'text-emerald-600' : summary.rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {summary.rate}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Overall Rate</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-slate-900">{summary.total}</p>
            <p className="text-xs text-slate-500 mt-1">Total Classes</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-emerald-600">{summary.present}</p>
            <p className="text-xs text-slate-500 mt-1">Present</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-amber-600">{summary.late}</p>
            <p className="text-xs text-slate-500 mt-1">Late</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-red-500">{summary.absent}</p>
            <p className="text-xs text-slate-500 mt-1">Absent</p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {summary && summary.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-700">Attendance Rate</span>
            <span className="text-sm font-bold text-[#F3A522]">{summary.rate}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${summary.rate >= 80 ? 'bg-emerald-500' : summary.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${summary.rate}%` }}
            />
          </div>
          {summary.rate < 80 && (
            <p className="text-xs text-amber-600 mt-2">⚠️ Minimum 80% attendance required for certificate</p>
          )}
        </div>
      )}

      {/* Records */}
      <div className="space-y-2">
        {records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-16 text-center shadow-sm">
            <FiCalendar className="mx-auto text-4xl text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No attendance records</h3>
          </div>
        ) : (
          records.map(r => (
            <div key={r._id} className={`flex items-center justify-between p-4 rounded-xl border ${getStatusBg(r.status)}`}>
              <div className="flex items-center gap-3">
                {getStatusIcon(r.status)}
                <div>
                  <p className="text-sm font-bold text-slate-800">{r.classId?.title || 'Class'}</p>
                  <p className="text-xs text-slate-500">{r.classId?.topic}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {r.classId?.date && new Date(r.classId.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {r.classId?.startTime && ` • ${r.classId.startTime}`}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full capitalize ${
                r.status === 'present' ? 'bg-emerald-100 text-emerald-700'
                : r.status === 'late' ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
              }`}>
                {r.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
