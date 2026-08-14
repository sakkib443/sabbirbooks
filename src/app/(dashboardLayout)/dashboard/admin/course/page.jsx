'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiBook,
  FiUser,
  FiStar,
  FiFilter,
  FiGrid,
  FiList,
} from 'react-icons/fi';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api/courses?status=all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, ''))}/api/courses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setCourses((prev) => prev.filter((course) => course._id !== id));
      }
    } catch (error) {
      alert('Failed to delete course');
    }
  };

  const handleStatusToggle = async (courseId, newStatus) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, ''))}/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCourses(prev => prev.map(c => c._id === courseId ? { ...c, status: newStatus } : c));
      }
    } catch {
      alert('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'draft': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'archived': return 'bg-dash-soft2 text-dash-mute border-dash-line';
      default: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const filtered = courses
    .filter(c => statusFilter === 'all' || (c.status || 'published') === statusFilter)
    .filter((c) =>
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.instructorName?.toLowerCase().includes(search.toLowerCase())
    );

  // Loading Skeleton
  const CourseSkeleton = () => (
    <div className="bg-dash-card rounded-xl border border-dash-line overflow-hidden">
      <div className="h-40 bg-dash-soft3 animate-pulse"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-dash-soft3 rounded animate-pulse w-3/4"></div>
        <div className="h-3 bg-dash-soft3 rounded animate-pulse w-1/2"></div>
        <div className="flex gap-2 pt-2">
          <div className="h-8 bg-dash-soft3 rounded animate-pulse flex-1"></div>
          <div className="h-8 bg-dash-soft3 rounded animate-pulse flex-1"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink2 outfit">Course Management</h1>
          <p className="text-dash-mute text-sm work">Manage and monitor your academic courses</p>
        </div>
        <Link href="/dashboard/admin/course/create">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-dash-steel hover:bg-[#e68a47] text-white font-medium text-sm rounded-xl shadow-lg shadow-orange-200 transition-all hover:scale-105">
            <FiPlus size={16} />
            Create Course
          </button>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-dash-card p-4 rounded-xl border border-dash-line">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
          <input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-dash-line focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none text-sm transition-all"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-dash-soft2 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-dash-card shadow-sm text-aqua' : 'text-dash-mute'}`}
          >
            <FiGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-dash-card shadow-sm text-aqua' : 'text-dash-mute'}`}
          >
            <FiList size={18} />
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 p-1 bg-dash-soft2 rounded-lg">
          {[
            { id: 'all', label: 'All' },
            { id: 'published', label: 'Published' },
            { id: 'draft', label: 'Drafts' },
            { id: 'archived', label: 'Archived' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                statusFilter === tab.id ? 'bg-dash-card shadow-sm text-aqua' : 'text-dash-mute hover:text-dash-ink3'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 px-4 py-2 bg-dash-soft rounded-lg">
          <FiBook className="text-aqua" />
          <span className="text-sm font-medium text-dash-ink3">{filtered.length}/{courses.length} Courses</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <CourseSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-dash-card rounded-xl border border-dash-line">
          <FiBook className="mx-auto text-4xl text-dash-faint mb-4" />
          <h3 className="text-lg font-bold text-dash-ink2">No Courses Found</h3>
          <p className="text-dash-mute text-sm mt-1">Try adjusting your search query</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((course) => (
            <div key={course._id} className="group bg-dash-card rounded-xl border border-dash-line overflow-hidden hover:shadow-lg transition-all duration-300">
              {/* Image */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className="px-2.5 py-1 bg-aqua text-white text-[10px] font-bold uppercase rounded-md">
                    {course.type}
                  </span>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md border ${getStatusBadge(course.status || 'published')}`}>
                    {course.status || 'published'}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-dash-card/90 backdrop-blur rounded text-xs font-bold text-dash-steel">
                  <FiStar size={10} fill="var(--dash-steel)" />
                  {course.rating}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-sm font-bold text-dash-ink2 line-clamp-2 mb-2 outfit">{course.title}</h3>

                <div className="flex items-center gap-2 text-xs text-dash-mute mb-3">
                  <FiUser className="text-aqua" />
                  <span className="truncate">{course.instructorName || course.mentor?.name || 'Unknown'}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-dash-mute mb-4">
                  <span>{course.lectures} Lectures</span>
                  <span>{course.durationMonth} Months</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-dash-line-soft">
                  <span className="text-lg font-bold text-dash-ink2">{course.fee}</span>
                  <span className="text-xs text-dash-mute2">{course.totalStudentsEnroll} enrolled</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex border-t border-dash-line-soft">
                <select
                  value={course.status || 'published'}
                  onChange={(e) => handleStatusToggle(course._id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 py-3 text-xs font-bold bg-transparent text-dash-mute hover:bg-dash-soft text-center cursor-pointer outline-none"
                >
                  <option value="published">✓ Published</option>
                  <option value="draft">◌ Draft</option>
                  <option value="archived">⊘ Archived</option>
                </select>
                <Link
                  href={`/dashboard/admin/course/edit/${course._id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-amber-600 hover:bg-amber-50 text-xs font-bold transition-colors border-l border-dash-line-soft"
                >
                  <FiEdit2 size={14} /> Edit
                </Link>
                <button
                  onClick={() => handleDelete(course._id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors border-l border-dash-line-soft"
                >
                  <FiTrash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-dash-card rounded-xl border border-dash-line divide-y divide-dash-line-soft">
          {filtered.map((course) => (
            <div key={course._id} className="flex items-center gap-4 p-4 hover:bg-dash-soft transition-colors">
              <img src={course.image} alt={course.title} className="w-20 h-14 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-dash-ink2 truncate">{course.title}</h3>
                <div className="flex items-center gap-4 text-xs text-dash-mute mt-1">
                  <span>{course.type}</span>
                  <span>{course.lectures} Lectures</span>
                  <span>{course.durationMonth} Months</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-dash-ink2">{course.fee}</p>
                <p className="text-xs text-dash-mute2">{course.totalStudentsEnroll} enrolled</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/admin/course/edit/${course._id}`}
                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <FiEdit2 size={16} />
                </Link>
                <button
                  onClick={() => handleDelete(course._id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
