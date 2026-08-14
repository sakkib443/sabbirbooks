'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiArrowLeft, FiSave, FiLoader, FiBook, FiHash, FiInfo,
  FiClock, FiUser, FiCheck, FiSearch, FiMapPin,
} from 'react-icons/fi';
import Link from 'next/link';
import { BRANCHES, WEEKDAYS, TimeRangePicker } from '@/components/admin/batch/batchShared';
import { useToast } from '@/components/shared/Toast';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-dash-line bg-dash-card text-sm text-dash-ink3 ' +
  'placeholder:text-dash-faint focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-all';
const labelClass = 'block text-[10px] font-bold text-dash-mute2 uppercase tracking-wider mb-1.5';

const SectionHead = ({ icon: Icon, title, hint }) => (
  <div className="px-5 py-3.5 border-b border-dash-line-soft bg-brand-soft/40 flex items-center gap-2.5">
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white shrink-0">
      <Icon size={14} />
    </div>
    <div>
      <h2 className="text-sm font-bold text-dash-ink2 outfit">{title}</h2>
      {hint && <p className="text-[10px] text-dash-mute2 work">{hint}</p>}
    </div>
  </div>
);

const Card = ({ children }) => (
  <div className="bg-dash-card rounded-2xl border border-dash-line-soft shadow-sm overflow-hidden">{children}</div>
);

export default function CreateBatchPage() {
  const router = useRouter();
  const { showToast, toastNode } = useToast();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [form, setForm] = useState({
    id: '',
    courseId: '',
    courseName: '',
    mentorId: '',
    name: '',
    branch: '',
    startDate: '',
    endDate: '',
    classTime: '',
    classDays: [],
    maxStudents: 50,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [courseRes, mentorRes] = await Promise.all([
        // limit=1000 → the picker must list ALL courses, not the backend's default 50
        fetch(`${API}/courses?limit=1000`, { headers: hdrs() }).then(r => r.json()),
        fetch(`${API}/mentors`, { headers: hdrs() }).then(r => r.json()),
      ]);
      setCourses(courseRes.data || []);
      setMentors(Array.isArray(mentorRes) ? mentorRes : (mentorRes.data || []));
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleCourseChange = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    setForm({ ...form, courseId, courseName: course?.title || '' });
  };

  const toggleDay = (day) => {
    setForm(prev => ({
      ...prev,
      classDays: prev.classDays.includes(day)
        ? prev.classDays.filter(d => d !== day)
        : [...prev.classDays, day],
    }));
  };

  const selectedCourse = courses.find(c => c._id === form.courseId);
  const selectedMentor = mentors.find(m => m._id === form.mentorId);

  const filteredCourses = courses.filter(c =>
    c.title?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id.trim() || !form.courseId || !form.startDate || !form.endDate) {
      showToast('error', 'Please fill all required fields (Batch ID, Course, Start & End Date)');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      showToast('error', 'End date cannot be before start date.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdrs() },
        body: JSON.stringify({ ...form, id: form.id.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Batch created successfully!');
        setTimeout(() => router.push('/dashboard/admin/batch'), 800);
      } else {
        showToast('error', data.message || 'Error creating batch');
        setLoading(false);
      }
    } catch (err) {
      showToast('error', 'Error creating batch');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dash-cream p-4 md:p-6">
      {/* Gold hairline */}
      <div className="h-[3px] w-full bg-gradient-to-r from-brand via-brand-strong to-dash-steel rounded-full mb-5"></div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/admin/batch" className="w-10 h-10 rounded-xl bg-dash-card border border-dash-line-soft shadow-sm flex items-center justify-center text-dash-mute hover:text-brand-ink hover:border-brand/40 transition">
          <FiArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-dash-ink outfit">Create New Batch</h1>
          <p className="text-xs text-dash-mute2 work">Set up a new batch with course, branch, mentor & schedule</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ═══ Form — Left 2 cols ═══ */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">

          {/* ── Course (with search) ── */}
          <Card>
            <SectionHead icon={FiBook} title="Course Selection" hint="Search & pick the course for this batch" />
            <div className="p-5">
              {/* Search */}
              <div className="relative mb-3">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-faint" size={15} />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Search course by name..."
                  className={`${inputClass} pl-9`}
                />
              </div>

              {courses.length === 0 ? (
                <p className="text-sm text-dash-mute2 flex items-center gap-2 py-4"><FiLoader className="animate-spin" size={14} /> Loading courses...</p>
              ) : filteredCourses.length === 0 ? (
                <p className="text-sm text-dash-mute2 text-center py-6">No course matches “{courseSearch}”</p>
              ) : (
                <div className="grid gap-2 max-h-[240px] overflow-y-auto pr-1 custom-scroll">
                  {filteredCourses.map(course => {
                    const active = form.courseId === course._id;
                    return (
                      <button key={course._id} type="button" onClick={() => handleCourseChange(course._id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                          active
                            ? 'border-brand bg-brand-soft/60 ring-2 ring-brand/20'
                            : 'border-dash-line-soft hover:border-brand/40 hover:bg-brand-soft/30'
                        }`}>
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-brand to-brand-hover">
                          {course.image && <img src={course.image} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${active ? 'text-brand-deep' : 'text-dash-ink3'}`}>
                            {course.title}
                          </p>
                          {course.type && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-dash-soft2 text-dash-mute mt-0.5 inline-block">{course.type}</span>}
                        </div>
                        {active && (
                          <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                            <FiCheck size={10} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* ── Branch + Mentor ── */}
          <Card>
            <SectionHead icon={FiMapPin} title="Branch & Mentor" hint="Where the batch runs and who leads it" />
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Branch</label>
                <select value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })} className={inputClass}>
                  <option value="">Select Branch</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Mentor (optional)</label>
                {mentors.length === 0 ? (
                  <p className="text-sm text-dash-mute2 flex items-center gap-2 py-2"><FiLoader className="animate-spin" size={14} /> Loading...</p>
                ) : (
                  <select value={form.mentorId} onChange={e => setForm({ ...form, mentorId: e.target.value })} className={inputClass}>
                    <option value="">Select Mentor</option>
                    {mentors.map(m => (
                      <option key={m._id} value={m._id}>{m.name} — {m.designation || m.subject || ''}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </Card>

          {/* ── Batch Details ── */}
          <Card>
            <SectionHead icon={FiHash} title="Batch Details" hint="ID, name, dates & capacity" />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Batch ID *</label>
                  <input type="text" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} required
                    placeholder="e.g., WEB-01, PYT-02"
                    className={`${inputClass} font-mono uppercase`} />
                  <p className="text-[10px] text-dash-mute2 mt-1 flex items-center gap-1"><FiInfo size={9} /> Enter a unique ID manually.</p>
                </div>
                <div>
                  <label className={labelClass}>Batch Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Optional — defaults to “Course - ID”"
                    className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Start Date *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End Date *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Max Students</label>
                  <input type="number" value={form.maxStudents} onChange={e => setForm({ ...form, maxStudents: parseInt(e.target.value) || 50 })} min={1} className={inputClass} />
                </div>
              </div>
            </div>
          </Card>

          {/* ── Schedule ── */}
          <Card>
            <SectionHead icon={FiClock} title="Class Schedule" hint="Pick class time (from → to) and the days" />
            <div className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Class Time</label>
                <TimeRangePicker value={form.classTime} onChange={(v) => setForm({ ...form, classTime: v })} />
                {form.classTime && form.classTime.trim() !== '-' && (
                  <p className="text-[11px] text-brand-ink mt-1.5 font-medium">{form.classTime}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Class Days</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(day => {
                    const isSelected = form.classDays.includes(day);
                    return (
                      <button key={day} type="button" onClick={() => toggleDay(day)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-brand text-white border-brand shadow-sm shadow-brand/20'
                            : 'bg-dash-card text-dash-mute border-dash-line hover:border-brand/40 hover:text-brand-ink'
                        }`}>
                        {isSelected && <FiCheck size={11} className="inline mr-1" />}
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                {form.classDays.length > 0 && (
                  <p className="text-[10px] text-brand-ink mt-2 font-medium">Selected: {form.classDays.join(', ')}</p>
                )}
              </div>
            </div>
          </Card>

          {/* ── Actions ── */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard/admin/batch"
              className="px-5 py-2.5 rounded-lg border border-dash-line text-sm font-semibold text-dash-ink4 hover:bg-dash-soft transition">
              Cancel
            </Link>
            <button type="submit" disabled={loading || !form.courseId || !form.id.trim()}
              className="flex items-center gap-2 px-7 py-2.5 rounded-lg bg-gradient-to-r from-brand to-brand-hover text-white text-sm font-bold hover:shadow-lg hover:shadow-brand/25 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm">
              {loading ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
              {loading ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>

        {/* ═══ Preview — Right col ═══ */}
        <div className="lg:col-span-1">
          <div className="bg-dash-card rounded-2xl border border-dash-line-soft shadow-sm overflow-hidden sticky top-6">
            <div className="px-5 py-3.5 border-b border-dash-line-soft bg-brand-soft/40">
              <h3 className="text-sm font-bold text-dash-ink2 outfit">Preview</h3>
            </div>
            <div className="p-5">
              {selectedCourse ? (
                <div className="space-y-4">
                  <div className="h-24 rounded-lg overflow-hidden bg-gradient-to-br from-brand to-brand-hover">
                    {selectedCourse.image && <img src={selectedCourse.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <p className="font-bold text-dash-ink2 text-sm outfit">{selectedCourse.title}</p>
                    {selectedCourse.type && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-soft text-brand-ink mt-1 inline-block">{selectedCourse.type}</span>
                    )}
                  </div>

                  {selectedMentor && (
                    <div className="flex items-center gap-2 p-2.5 bg-brand-soft/50 rounded-lg border border-brand-line">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-brand to-brand-hover flex-shrink-0">
                        {selectedMentor.image
                          ? <img src={selectedMentor.image} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">{selectedMentor.name?.charAt(0)}</div>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-brand-deep">{selectedMentor.name}</p>
                        <p className="text-[10px] text-brand-ink">{selectedMentor.designation}</p>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-dash-line-soft pt-3 space-y-2">
                    {[
                      ['Batch ID', form.id.trim() || '—', 'font-mono text-brand-ink font-bold'],
                      ['Branch', form.branch || '—'],
                      ['Start', form.startDate || '—'],
                      ['End', form.endDate || '—'],
                      ['Capacity', `${form.maxStudents} students`],
                      ...(form.classTime && form.classTime.trim() !== '-' ? [['Time', form.classTime, 'text-brand-ink font-semibold']] : []),
                    ].map(([k, v, cls]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-dash-mute2">{k}</span>
                        <span className={`font-semibold text-dash-ink3 ${cls || ''}`}>{v}</span>
                      </div>
                    ))}
                    {form.classDays.length > 0 && (
                      <div className="pt-2 border-t border-dash-line-soft">
                        <span className="text-[10px] text-dash-mute2">Class Days</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {form.classDays.map(d => (
                            <span key={d} className="text-[9px] font-bold bg-brand-soft text-brand-ink px-1.5 py-0.5 rounded">{d.slice(0, 3)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-brand-soft flex items-center justify-center mx-auto mb-3">
                    <FiBook className="text-brand" size={18} />
                  </div>
                  <p className="text-xs text-dash-mute2 font-medium">Select a course</p>
                  <p className="text-[10px] text-dash-faint mt-0.5">Preview will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #F0DFB4; border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #F3A522; }
      `}</style>
      {toastNode}
    </div>
  );
}
