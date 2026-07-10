'use client';

import React, { useState } from 'react';
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiFilter,
  FiChevronDown,
  FiStar,
  FiMessageSquare,
} from 'react-icons/fi';

export default function FeedbackPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');

  // Sample data - replace with real data from your API
  const feedbacks = [
    {
      id: 1,
      userName: 'Ahmed Khan',
      course: 'Web Development Mastery',
      rating: 5,
      message: 'Excellent course! Very comprehensive and well-structured. Instructor explains everything clearly.',
      submittedDate: 'Dec 12, 2024',
      status: 'Published',
      helpful: 24,
    },
    {
      id: 2,
      userName: 'Fatima Begum',
      course: 'Digital Marketing Pro',
      rating: 4,
      message: 'Good course with practical examples. Some topics could be explained more deeply.',
      submittedDate: 'Dec 11, 2024',
      status: 'Published',
      helpful: 12,
    },
    {
      id: 3,
      userName: 'Rajon Roy',
      course: 'UI/UX Design Advanced',
      rating: 5,
      message: 'Best design course I have ever taken. Highly recommended for everyone.',
      submittedDate: 'Dec 10, 2024',
      status: 'Published',
      helpful: 18,
    },
    {
      id: 4,
      userName: 'Maria Garcia',
      course: 'Python Data Science',
      rating: 3,
      message: 'Course is good but needs more real-world projects and datasets.',
      submittedDate: 'Dec 09, 2024',
      status: 'Pending',
      helpful: 5,
    },
    {
      id: 5,
      userName: 'John Smith',
      course: 'Business Analytics',
      rating: 4,
      message: 'Very informative and practical. Looking forward to more advanced topics.',
      submittedDate: 'Dec 08, 2024',
      status: 'Published',
      helpful: 15,
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Published':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'Pending':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'Rejected':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  };

  const getRatingStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <FiStar
            key={i}
            size={16}
            className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Feedback & Reviews</h1>
        <p className="text-slate-600 mt-2">Manage student reviews and course feedback</p>
      </div>

      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-3.5 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
          />
        </div>

        {/* Filter */}
        <div className="flex gap-3">
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition">
              <FiFilter size={18} />
              <span>Rating</span>
              <FiChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-slate-600 text-sm">Total Feedback</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">87</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-slate-600 text-sm">Avg Rating</p>
          <p className="text-2xl font-bold text-yellow-500 mt-1">4.6/5</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-slate-600 text-sm">Published</p>
          <p className="text-2xl font-bold text-green-600 mt-1">78</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-slate-600 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">9</p>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedbacks.map((feedback) => (
          <div
            key={feedback.id}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
              <div>
                <p className="font-semibold text-slate-900">{feedback.userName}</p>
                <p className="text-sm text-slate-600 mt-1">{feedback.course}</p>
              </div>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(
                  feedback.status
                )}`}
              >
                {feedback.status}
              </span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              {getRatingStars(feedback.rating)}
              <span className="text-sm font-medium text-slate-700">
                {feedback.rating}.0 out of 5
              </span>
            </div>

            {/* Message */}
            <p className="text-slate-600 leading-relaxed italic">
              &quot;{feedback.message || "No message provided"}&quot;
            </p>

            {/* Footer */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">
                  Submitted: {feedback.submittedDate}
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-600">
                  <FiMessageSquare size={16} />
                  {feedback.helpful} found helpful
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="View">
                  <FiEye size={18} />
                </button>
                <button className="p-2 rounded-lg text-orange-600 hover:bg-orange-50 transition" title="Edit">
                  <FiEdit2 size={18} />
                </button>
                <button className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition" title="Delete">
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between bg-white rounded-lg border border-slate-200 px-6 py-4">
        <p className="text-sm text-slate-600">Showing 1 to 5 of 87 results</p>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition">
            Previous
          </button>
          <button className="px-3 py-2 rounded-lg btn-gradient text-white">
            1
          </button>
          <button className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition">
            2
          </button>
          <button className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition">
            3
          </button>
          <button className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

