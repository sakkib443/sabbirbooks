/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FiUsers, FiBook, FiDollarSign, FiGrid,
  FiTrendingUp, FiArrowRight, FiCalendar,
  FiShoppingCart, FiRefreshCw, FiDownload,
  FiChevronLeft, FiChevronRight, FiPlus,
  FiClock, FiCheckCircle, FiAlertCircle,
  FiAward, FiActivity, FiLayers, FiHeadphones,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';
const headers = () => ({ Authorization: `Bearer ${getToken()}` });

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminDashboard() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailySales, setDailySales] = useState([]);
  const [typeDistribution, setTypeDistribution] = useState([]);
  const [typeTotal, setTypeTotal] = useState(0);
  const [user, setUser] = useState(null);
  const [recentCourses, setRecentCourses] = useState([]);
  const [ieltsPurchases, setIeltsPurchases] = useState([]);
  const [incomeMonths, setIncomeMonths] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [monthlyRes, dailyRes, typeRes, coursesRes, ieltsRes, enrollRes, incomeRes] = await Promise.all([
        fetch(`${API}/analytics/monthly-dashboard?year=${selectedYear}&month=${selectedMonth}`, { headers: headers() }).then(r => r.json()),
        fetch(`${API}/analytics/daily-sales?year=${selectedYear}&month=${selectedMonth}`, { headers: headers() }).then(r => r.json()),
        fetch(`${API}/analytics/type-distribution?year=${selectedYear}&month=${selectedMonth}`, { headers: headers() }).then(r => r.json()),
        fetch(`${API}/courses`).then(r => r.json()),
        fetch(`${API}/ielts/mock/purchases/all`, { headers: headers() }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${API}/enrollments/all`, { headers: headers() }).then(r => r.json()),
        fetch(`${API}/analytics/income-report`, { headers: headers() }).then(r => r.json()).catch(() => ({})),
      ]);
      if (monthlyRes.success) setMonthlyData(monthlyRes.data);
      if (dailyRes.success) setDailySales(dailyRes.data || []);
      if (typeRes.success) {
        setTypeDistribution(typeRes.data || []);
        setTypeTotal(typeRes.total || 0);
      }
      const courses = Array.isArray(coursesRes) ? coursesRes : (coursesRes.data || []);
      const enrollments = enrollRes.data || [];
      setRecentCourses(courses.slice(0, 5));
      setIeltsPurchases(Array.isArray(ieltsRes?.data) ? ieltsRes.data : []);
      setIncomeMonths(incomeRes?.data?.combined?.byMonth || []);
      setPendingOrders(enrollments.filter(e => e.status === 'pending').slice(0, 5));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) try { setUser(JSON.parse(storedUser)); } catch (e) { }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const userName = user?.firstName || user?.name?.split(' ')[0] || 'Admin';
  const current = monthlyData?.current || {};
  const changes = monthlyData?.changes || {};
  const dateStr = `${DAYS[now.getDay()]}, ${MONTHS_FULL[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const calcChange = (cur, prev) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100));

  // ─── IELTS stats (derived client-side from all purchases) ───
  // A bundle order = N purchases sharing one bundleGroupId. So:
  //  • ORDER counts collapse a bundle to 1,
  //  • EXAM counts stay per-test,
  //  • REVENUE sums every purchase's payment.amount (each holds its price/bundleSize share).
  const ielts = useMemo(() => {
    const list = ieltsPurchases || [];
    const t = (d) => new Date(d).getTime();
    const mStart = new Date(selectedYear, selectedMonth, 1).getTime();
    const mEnd = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();
    const pStart = new Date(selectedYear, selectedMonth - 1, 1).getTime();
    const pEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999).getTime();
    const inM = (d) => { const x = t(d); return x >= mStart && x <= mEnd; };
    const inP = (d) => { const x = t(d); return x >= pStart && x <= pEnd; };

    // Collapse bundle groups → one representative purchase per order
    const seen = new Set();
    const orders = [];
    for (const p of list) {
      const key = p.bundleGroupId || String(p._id);
      if (seen.has(key)) continue;
      seen.add(key);
      orders.push(p);
    }

    // Revenue — every paid purchase (bundle items each carry their share)
    const paid = list.filter((p) => p.payment?.status === 'paid');
    const revTotal = paid.reduce((s, p) => s + (p.payment?.amount || 0), 0);
    const revMonth = paid.filter((p) => inM(p.createdAt)).reduce((s, p) => s + (p.payment?.amount || 0), 0);
    const revPrev = paid.filter((p) => inP(p.createdAt)).reduce((s, p) => s + (p.payment?.amount || 0), 0);

    // Daily distinct-order count for the chart
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const daily = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const ds = new Date(selectedYear, selectedMonth, day, 0, 0, 0, 0).getTime();
      const de = new Date(selectedYear, selectedMonth, day, 23, 59, 59, 999).getTime();
      const count = orders.filter((p) => { const x = t(p.createdAt); return x >= ds && x <= de; }).length;
      return { day, count };
    });

    const ordersMonth = orders.filter((p) => inM(p.createdAt)).length;
    const ordersPrev = orders.filter((p) => inP(p.createdAt)).length;

    return {
      // order-level (a bundle counts once)
      pending: orders.filter((p) => p.status === 'pending').length,
      totalOrders: orders.length,
      ordersMonth,
      // exam-level (each test counts)
      active: list.filter((p) => p.status === 'active').length,
      completed: list.filter((p) => p.examStatus === 'completed').length,
      totalExams: list.length,
      students: new Set(list.map((p) => String(p.studentId?._id || p.studentId || ''))).size,
      revTotal, revMonth, revPrev, daily,
      ordersChange: calcChange(ordersMonth, ordersPrev),
      revChange: calcChange(revMonth, revPrev),
      recent: orders.slice(0, 5),
    };
  }, [ieltsPurchases, selectedYear, selectedMonth]);

  // Combined (Course + IELTS) revenue — from the CORRECT income-report
  // (admission + installments + IELTS, money actually received). The old
  // monthly-dashboard revenue dropped admissions and undercounted.
  const selMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const combinedRevMonth = incomeMonths.find(m => m.month === selMonthKey)?.total ?? 0;
  const combinedRevPrev = incomeMonths.find(m => m.month === prevMonthKey)?.total ?? 0;
  const combinedRevChange = calcChange(combinedRevMonth, combinedRevPrev);

  // Daily sales chart calculations — scale to both course & IELTS series
  const maxSales = Math.max(...dailySales.map(d => d.count), ...ielts.daily.map(d => d.count), 1);
  const W = 720, H = 240, PX = 40, PY = 20, BOTTOM = 30;
  const usableW = W - PX - 20, usableH = H - PY - BOTTOM;

  // Smooth bezier curve helper
  const smoothLine = (points) => {
    if (points.length < 2) return '';
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
    }
    return d;
  };

  const chartPts = useMemo(() => {
    return dailySales.map((d, i) => {
      const x = PX + (i / Math.max(dailySales.length - 1, 1)) * usableW;
      const y = PY + usableH - (d.count / maxSales) * usableH;
      return [x, y];
    });
  }, [dailySales, maxSales, usableW, usableH]);

  const linePath = useMemo(() => smoothLine(chartPts), [chartPts]);
  const areaPath = useMemo(() => {
    if (chartPts.length < 2) return '';
    const last = chartPts[chartPts.length - 1];
    const first = chartPts[0];
    return `${linePath} L ${last[0]},${PY + usableH} L ${first[0]},${PY + usableH} Z`;
  }, [linePath, chartPts, usableH]);

  // IELTS series (second line, same coordinate system)
  const ieltsPts = useMemo(() => {
    return ielts.daily.map((d, i) => {
      const x = PX + (i / Math.max(ielts.daily.length - 1, 1)) * usableW;
      const y = PY + usableH - (d.count / maxSales) * usableH;
      return [x, y];
    });
  }, [ielts.daily, maxSales, usableW, usableH]);
  const ieltsLinePath = useMemo(() => smoothLine(ieltsPts), [ieltsPts]);

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = PY + (i / steps) * usableH;
      const val = Math.round(maxSales * ((steps - i) / steps));
      lines.push({ y, label: val });
    }
    return lines;
  }, [maxSales, usableH]);

  // Day labels (show every 5th day)
  const dayLabels = useMemo(() => {
    return dailySales.filter((d) => d.day === 1 || d.day % 5 === 0 || d.day === dailySales.length).map(d => {
      const x = PX + ((d.day - 1) / Math.max(dailySales.length - 1, 1)) * usableW;
      return { x, label: d.day };
    });
  }, [dailySales, usableW]);

  const totalMonthSales = dailySales.reduce((s, d) => s + d.count, 0);

  // Donut chart - Course type distribution + IELTS as its own slice
  const DONUT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
  const combinedDist = useMemo(() => {
    const arr = typeDistribution.map((d) => ({ ...d }));
    if (ielts.ordersMonth > 0) arr.push({ type: 'IELTS', count: ielts.ordersMonth });
    return arr;
  }, [typeDistribution, ielts.ordersMonth]);
  const combinedTotal = combinedDist.reduce((s, d) => s + d.count, 0);
  const donutColor = (item, i) => (item.type === 'IELTS' ? '#F3A522' : DONUT_COLORS[i % DONUT_COLORS.length]);

  const totals = monthlyData?.totals || {};
  const dues = monthlyData?.dues || {};

  const stats = [
    // ─────── Row 1 · Course Management ───────
    {
      title: 'TOTAL REVENUE',
      value: `৳${combinedRevMonth.toLocaleString()}`,
      subtitle: 'Course + IELTS · this month',
      change: combinedRevChange,
      icon: FiDollarSign,
      iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    },
    {
      title: 'NEW ENROLLMENTS',
      value: current.newEnrollments ?? 0,
      subtitle: `${totals.totalEnrollments ?? 0} active now`,
      change: changes.enrollments ?? 0,
      icon: FiTrendingUp,
      iconBg: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
    },
    {
      title: 'NEW STUDENTS',
      value: current.newStudents ?? 0,
      subtitle: `${totals.totalStudents ?? 0} total students`,
      change: changes.students ?? 0,
      icon: FiUsers,
      iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    },
    {
      title: 'PENDING ORDERS',
      value: current.pendingOrders ?? 0,
      subtitle: `${current.paidOrders ?? 0} paid this month`,
      change: changes.pendingOrders ?? 0,
      icon: FiShoppingCart,
      iconBg: 'bg-gradient-to-br from-rose-400 to-rose-600',
    },
    // ─────── Row 2 · IELTS System ───────
    {
      title: 'IELTS MOCK ORDERS',
      value: ielts.pending,
      subtitle: `${ielts.totalOrders} total orders`,
      change: ielts.ordersChange,
      icon: FiLayers,
      iconBg: 'bg-gradient-to-br from-violet-400 to-violet-600',
    },
    {
      title: 'IELTS EXAMS',
      value: ielts.completed,
      subtitle: `${ielts.active} active exams`,
      change: null,
      icon: FiActivity,
      iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600',
    },
    {
      title: 'IELTS REVENUE',
      value: `৳${ielts.revTotal.toLocaleString()}`,
      subtitle: `৳${ielts.revMonth.toLocaleString()} this month`,
      change: ielts.revChange,
      icon: FiDollarSign,
      iconBg: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
    },
    {
      title: 'IELTS STUDENTS',
      value: ielts.students,
      subtitle: `${ielts.totalExams} exam purchases`,
      change: null,
      icon: FiAward,
      iconBg: 'bg-gradient-to-br from-orange-400 to-orange-600',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl border border-slate-200/60 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white shadow-md shadow-[#F3A522]/20">
            <FiGrid size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 outfit">Dashboard Overview</h1>
            <p className="text-xs text-slate-400">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Month Picker */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            <button onClick={goToPrevMonth} className="p-0.5 hover:bg-slate-200 rounded transition">
              <FiChevronLeft size={14} className="text-slate-500" />
            </button>
            <div className="flex items-center gap-1.5 px-2 min-w-[100px] justify-center">
              <FiCalendar size={12} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-600">{MONTHS_SHORT[selectedMonth]} {selectedYear}</span>
            </div>
            <button onClick={goToNextMonth} disabled={isCurrentMonth}
              className={`p-0.5 rounded transition ${isCurrentMonth ? 'opacity-30' : 'hover:bg-slate-200'}`}>
              <FiChevronRight size={14} className="text-slate-500" />
            </button>
          </div>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
            <FiRefreshCw size={12} /> Reload
          </button>
          <Link href="/dashboard/admin/analytics" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-[#F3A522] to-[#d88f13] rounded-lg hover:shadow-md hover:shadow-[#F3A522]/30 transition shadow-sm">
            <FiTrendingUp size={12} /> Analytics
          </Link>
        </div>
      </div>

      {/* Stats Cards — Row 1: Course · Row 2: IELTS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;
          const hasChange = !loading && stat.change !== null && stat.change !== undefined;
          return (
            <div key={stat.title} className="bg-white rounded-xl border border-slate-200/60 px-4 py-3 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase truncate">{stat.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xl font-bold text-slate-900 outfit leading-none">
                      {loading ? <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded-md" /> : stat.value}
                    </p>
                    {hasChange && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.5 rounded ${isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          {isPositive ? <path d="M5 2L8 6H2L5 2Z" fill="currentColor" /> : <path d="M5 8L2 4H8L5 8Z" fill="currentColor" />}
                        </svg>
                        {Math.abs(stat.change)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">{stat.subtitle}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0`}>
                  <Icon size={17} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily Sales Overview - Left (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div>
              <h2 className="text-base font-semibold text-slate-800 outfit-semibold">Sales Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Daily Course vs IELTS — {MONTHS_FULL[selectedMonth]} {selectedYear}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Course
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F3A522]" /> IELTS
              </span>
            </div>
          </div>

          {/* SVG Smooth Line Chart — Daily */}
          <div className="px-2 pb-1">
            {loading ? (
              <div className="h-[230px] bg-slate-50 rounded-lg animate-pulse mx-3 my-2" />
            ) : (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {/* Grid */}
                {gridLines.map((line, i) => (
                  <g key={i}>
                    <line x1={PX} y1={line.y} x2={PX + usableW} y2={line.y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x={PX - 8} y={line.y + 3.5} fontSize="9" fill="#94a3b8" textAnchor="end" fontFamily="Inter, sans-serif">{line.label}</text>
                  </g>
                ))}
                <line x1={PX} y1={PY + usableH} x2={PX + usableW} y2={PY + usableH} stroke="#e2e8f0" strokeWidth="1" />
                {/* Day labels */}
                {dayLabels.map((dl, i) => (
                  <text key={i} x={dl.x} y={H - 8} fontSize="9" fill="#94a3b8" textAnchor="middle" fontFamily="Inter, sans-serif">{dl.label}</text>
                ))}
                {/* Area fill (Course) */}
                {areaPath && <path d={areaPath} fill="url(#salesGrad)" />}
                {/* Course line */}
                {linePath && <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                {/* IELTS line */}
                {ieltsLinePath && <path d={ieltsLinePath} fill="none" stroke="#F3A522" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                {/* Course dots on hover */}
                {chartPts.map(([x, y], i) => (
                  <g key={`c${i}`} className="group/dot">
                    <circle cx={x} cy={y} r="12" fill="transparent" className="cursor-pointer" />
                    <circle cx={x} cy={y} r="3.5" fill="#6366f1" stroke="white" strokeWidth="2" className="opacity-0 group-hover/dot:opacity-100 transition-opacity" />
                    {dailySales[i]?.count > 0 && (
                      <>
                        <rect x={x - 20} y={y - 26} width="40" height="18" rx="4" fill="#1e293b" className="opacity-0 group-hover/dot:opacity-100 transition-opacity" />
                        <text x={x} y={y - 14} fontSize="9" fill="white" textAnchor="middle" fontWeight="600" className="opacity-0 group-hover/dot:opacity-100 transition-opacity">
                          {dailySales[i].count} course
                        </text>
                      </>
                    )}
                  </g>
                ))}
                {/* IELTS dots on hover */}
                {ieltsPts.map(([x, y], i) => (
                  <g key={`i${i}`} className="group/idot">
                    <circle cx={x} cy={y} r="12" fill="transparent" className="cursor-pointer" />
                    <circle cx={x} cy={y} r="3.5" fill="#F3A522" stroke="white" strokeWidth="2" className="opacity-0 group-hover/idot:opacity-100 transition-opacity" />
                    {ielts.daily[i]?.count > 0 && (
                      <>
                        <rect x={x - 20} y={y - 26} width="40" height="18" rx="4" fill="#a5680f" className="opacity-0 group-hover/idot:opacity-100 transition-opacity" />
                        <text x={x} y={y - 14} fontSize="9" fill="white" textAnchor="middle" fontWeight="600" className="opacity-0 group-hover/idot:opacity-100 transition-opacity">
                          {ielts.daily[i].count} ielts
                        </text>
                      </>
                    )}
                  </g>
                ))}
              </svg>
            )}
          </div>

          {/* Bottom Stats */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/30 rounded-b-xl">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 tracking-wider">THIS MONTH REVENUE</p>
                <p className="text-xl font-bold text-slate-900 outfit">৳{combinedRevMonth.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 tracking-wider">COURSE SALES</p>
                <p className="text-xl font-bold text-indigo-600 outfit">{totalMonthSales}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 tracking-wider">IELTS ORDERS</p>
                <p className="text-xl font-bold text-[#c9871a] outfit">{ielts.ordersMonth}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-slate-400 tracking-wider">TODAY</p>
              <p className="text-xl font-bold text-slate-900 outfit">{(dailySales[now.getDate() - 1]?.count ?? 0) + (ielts.daily[now.getDate() - 1]?.count ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Platform Distribution - Right (1/3) */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-5 flex flex-col">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-slate-800 outfit-semibold">Course vs IELTS</h2>
            <p className="text-xs text-slate-400 mt-0.5">This month by type</p>
          </div>

          {/* Donut Chart */}
          <div className="flex-1 flex items-center justify-center py-1">
            {loading ? (
              <div className="w-[160px] h-[160px] bg-slate-100 rounded-full animate-pulse" />
            ) : (
              <div className="relative" style={{ width: 180, height: 180 }}>
                <svg viewBox="0 0 180 180" className="w-full h-full">
                  {(() => {
                    const cx = 90, cy = 90, r = 72, innerR = 50;
                    let accAngle = -90;
                    if (combinedTotal === 0) {
                      return <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="22" />;
                    }
                    return combinedDist.map((item, i) => {
                      const angle = (item.count / combinedTotal) * 360;
                      const gap = combinedDist.length > 1 ? 2 : 0;
                      const startAngle = accAngle + gap / 2;
                      const endAngle = accAngle + angle - gap / 2;
                      accAngle += angle;
                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;
                      const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
                      const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad);
                      const x2 = cx + r * Math.cos(endRad), y2 = cy + r * Math.sin(endRad);
                      const ix1 = cx + innerR * Math.cos(endRad), iy1 = cy + innerR * Math.sin(endRad);
                      const ix2 = cx + innerR * Math.cos(startRad), iy2 = cy + innerR * Math.sin(startRad);
                      const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
                      return <path key={i} d={d} fill={donutColor(item, i)} className="hover:opacity-80 transition-opacity cursor-default drop-shadow-sm" />;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-800 outfit">{combinedTotal}</span>
                  <span className="text-[11px] text-[#c9871a] font-medium">Total</span>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="space-y-2.5 mt-3">
            {!loading && combinedDist.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">No data this month</p>
            )}
            {combinedDist.map((item, i) => {
              const pct = combinedTotal > 0 ? Math.round((item.count / combinedTotal) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: donutColor(item, i) }} />
                    <span className="text-sm text-slate-600 group-hover:text-slate-900 transition">{item.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{item.count}</span>
                    <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ Quick Actions ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { title: 'Create Course', desc: 'Add new course', href: '/dashboard/admin/course/create', icon: FiBook, color: '#9AA0A8', bg: 'from-orange-400 to-orange-600' },
          { title: 'Add Mentor', desc: 'Invite mentor', href: '/dashboard/admin/mentor/create', icon: FiUsers, color: '#41bfb8', bg: 'from-teal-400 to-teal-600' },
          { title: 'New Category', desc: 'Add category', href: '/dashboard/admin/category/create', icon: FiGrid, color: '#8B5CF6', bg: 'from-purple-400 to-purple-600' },
          { title: 'Create Batch', desc: 'New student batch', href: '/dashboard/admin/batch/create', icon: FiCalendar, color: '#3B82F6', bg: 'from-blue-400 to-blue-600' },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.title} href={action.href}
              className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md transition-all group flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.bg} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform shrink-0`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition">{action.title}</p>
                <p className="text-[11px] text-slate-400">{action.desc}</p>
              </div>
              <FiPlus className="text-slate-300 group-hover:text-slate-500 transition shrink-0" size={16} />
            </Link>
          );
        })}
      </div>

      {/* ═══ Bottom Grid: Courses + IELTS Orders + Pending ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Courses */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white">
                <FiBook size={14} />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Recent Courses</h2>
            </div>
            <Link href="/dashboard/admin/course" className="flex items-center gap-1 text-xs text-[#c9871a] hover:text-[#a5680f] font-medium transition">
              View All <FiArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentCourses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No courses found</div>
            ) : (
              recentCourses.map((course, idx) => (
                <div key={course._id || idx} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    {course.image ? (
                      <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-teal-400 to-orange-400 flex items-center justify-center text-white font-bold text-xs">
                        {course.title?.charAt(0) || 'C'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-slate-700 truncate">{course.title}</h3>
                    <p className="text-[11px] text-slate-400">{course.type || 'Online'} • {course.durationMonth || '3'}m</p>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 shrink-0">৳{course.fee || '0'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent IELTS Orders */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white">
                <FiHeadphones size={14} />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Recent IELTS Orders</h2>
            </div>
            <Link href="/dashboard/admin/ielts/orders" className="flex items-center gap-1 text-xs text-[#c9871a] hover:text-[#a5680f] font-medium transition">
              View All <FiArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {ielts.recent.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No IELTS orders yet</div>
            ) : (
              ielts.recent.map((order, idx) => {
                const s = order.studentId || {};
                const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student';
                const badge = order.status === 'active'
                  ? 'text-emerald-600 bg-emerald-50'
                  : order.status === 'pending'
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-slate-500 bg-slate-100';
                return (
                  <div key={order._id || idx} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <FiHeadphones size={14} className="text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm text-slate-700 truncate">{order.packageTitle || 'IELTS Mock'}</h3>
                      <p className="text-[11px] text-slate-400 truncate">{name} • {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize ${badge}`}>{order.status}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white">
                <FiClock size={14} />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Pending Orders</h2>
            </div>
            <Link href="/dashboard/admin/orders" className="flex items-center gap-1 text-xs text-[#c9871a] hover:text-[#a5680f] font-medium transition">
              View All <FiArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center">
                <FiCheckCircle size={24} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No pending orders!</p>
              </div>
            ) : (
              pendingOrders.map((order, idx) => (
                <div key={order._id || idx} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <FiAlertCircle size={14} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-slate-700 truncate">{order.courseId?.title || 'Course'}</h3>
                    <p className="text-[11px] text-slate-400">{order.studentId?.firstName || 'Student'} • {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">Pending</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
