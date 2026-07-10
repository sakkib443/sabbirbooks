'use client';

import React, { useState, useEffect } from 'react';
import { FiLoader, FiClock, FiAward, FiCheckCircle, FiXCircle, FiPlay } from 'react-icons/fi';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const getToken = () => localStorage.getItem('token') || '';

export default function StudentExamsPage() {
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [takingExam, setTakingExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resExams, resResults] = await Promise.all([
        fetch(`${API}/exams?isPublished=true`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/exams/my-results`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      const examsData = await resExams.json();
      const resultsData = await resResults.json();
      setExams(examsData.success ? examsData.data || [] : []);
      setResults(resultsData.success ? resultsData.data || [] : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Timer
  useEffect(() => {
    if (!takingExam || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [takingExam, timer]);

  const startExam = async (examId) => {
    try {
      const startRes = await fetch(`${API}/exams/${examId}/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      });
      const startData = await startRes.json();
      if (!startData.success) { alert(startData.message); return; }

      const qRes = await fetch(`${API}/exams/${examId}/questions`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const qData = await qRes.json();

      const exam = exams.find(e => e._id === examId);
      setTakingExam(exam);
      setSubmission(startData.data);
      setQuestions(qData.data || []);
      setAnswers({});
      setTimer(exam.duration * 60);
    } catch (e) { alert('Error starting exam'); }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const answerArray = questions.map(q => ({
        questionId: q._id,
        selectedOption: answers[q._id]?.selectedOption,
        writtenAnswer: answers[q._id]?.writtenAnswer || '',
      }));

      const res = await fetch(`${API}/exams/submissions/${submission._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ answers: answerArray }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Submitted! Score: ${data.data.obtainedMarks}/${data.data.totalMarks} (${data.data.percentage}%)`);
        setTakingExam(null); setSubmission(null); loadData();
      }
    } catch { alert('Error'); }
    finally { setSubmitting(false); }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const getGradeColor = (g) => {
    if (['A+', 'A'].includes(g)) return 'text-emerald-600';
    if (['B', 'C'].includes(g)) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) return <div className="p-6 min-h-screen bg-slate-50 flex items-center justify-center"><FiLoader className="animate-spin text-[#F3A522]" size={30} /></div>;

  // ── EXAM TAKING VIEW ──
  if (takingExam && submission) {
    return (
      <div className="p-4 lg:p-6 min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-4 mb-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="font-bold text-slate-800">{takingExam.title}</h2>
            <p className="text-xs text-slate-500">{questions.length} questions • {takingExam.totalMarks} marks</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`flex items-center gap-1 text-lg font-bold font-mono ${timer < 300 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
              <FiClock size={18} /> {formatTime(timer)}
            </span>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-5 py-2 bg-[#F3A522] text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs text-[#F3A522] font-bold mb-2">Question {idx + 1} of {questions.length} • {q.marks} marks</p>
              <p className="text-sm font-bold text-slate-800 mb-3">{q.questionText}</p>

              {q.questionType === 'mcq' && q.options ? (
                <div className="space-y-2">
                  {q.options.map((opt, i) => (
                    <button key={i} onClick={() => setAnswers({...answers, [q._id]: { selectedOption: i }})}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${
                        answers[q._id]?.selectedOption === i
                          ? 'border-[#F3A522] bg-[#F3A522]/10 text-[#F3A522] font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}>
                      <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span> {opt.text}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q._id]?.writtenAnswer || ''}
                  onChange={e => setAnswers({...answers, [q._id]: { writtenAnswer: e.target.value }})}
                  placeholder="Write your answer here..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:border-[#F3A522] outline-none"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── MAIN VIEW ──
  return (
    <div className="space-y-6">
      <div className="mb-2"><h1 className="text-2xl font-bold text-slate-900">Exams & Results</h1></div>

      {/* Available Exams */}
      <h2 className="font-bold text-slate-800 mb-3">📝 Available Exams</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {exams.length === 0 ? (
          <p className="text-slate-500 text-sm col-span-2">No published exams available.</p>
        ) : exams.map(exam => {
          const attempted = results.find(r => r.examId?._id === exam._id);
          return (
            <div key={exam._id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-800">{exam.title}</h3>
              <p className="text-xs text-slate-500 mb-2">{exam.courseId?.title}</p>
              <div className="flex gap-3 text-xs text-slate-400 mb-3">
                <span><FiClock className="inline mr-1" />{exam.duration}min</span>
                <span><FiAward className="inline mr-1" />{exam.totalMarks} marks</span>
                <span>Pass: {exam.passingMarks}</span>
              </div>
              {attempted ? (
                <div className={`text-sm font-bold ${attempted.percentage >= 40 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ✓ Scored: {attempted.obtainedMarks}/{attempted.totalMarks} ({attempted.percentage}%) - Grade: {attempted.grade}
                </div>
              ) : (
                <button onClick={() => startExam(exam._id)} className="flex items-center gap-2 px-4 py-2 bg-[#F3A522] text-white rounded-lg text-sm font-bold hover:shadow-lg">
                  <FiPlay /> Start Exam
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Results */}
      <h2 className="font-bold text-slate-800 mb-3">📊 My Results</h2>
      <div className="space-y-2">
        {results.length === 0 ? (
          <p className="text-slate-500 text-sm">No results yet.</p>
        ) : results.map(r => (
          <div key={r._id} className="bg-white rounded-xl border border-slate-200/60 p-4 flex items-center justify-between shadow-sm hover:shadow-md transition">
            <div>
              <p className="font-bold text-slate-800 text-sm">{r.examId?.title}</p>
              <p className="text-xs text-slate-500">{r.examId?.courseId?.title} • {new Date(r.submittedAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-800">{r.obtainedMarks}/{r.totalMarks}</p>
              <p className={`text-xs font-bold ${getGradeColor(r.grade)}`}>{r.percentage}% • Grade: {r.grade || 'Pending'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
