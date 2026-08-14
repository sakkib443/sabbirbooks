'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBlogsData, deleteBlog } from '@/redux/blogSlice';
import {
    FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye,
    FiCalendar, FiUser, FiFilter, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';

export default function AdminBlogList() {
    const dispatch = useDispatch();
    const { blogs = [], loading, error } = useSelector((state) => state.blogs || {});
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const blogsPerPage = 10;

    useEffect(() => {
        dispatch(fetchBlogsData());
    }, [dispatch]);

    const handleDelete = async (id) => {
        try {
            await dispatch(deleteBlog(id)).unwrap();
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    // Filter blogs based on search
    const filteredBlogs = blogs.filter(blog =>
        blog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.author?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);
    const startIndex = (currentPage - 1) * blogsPerPage;
    const paginatedBlogs = filteredBlogs.slice(startIndex, startIndex + blogsPerPage);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-dash-ink2 outfit">All Blogs</h1>
                    <p className="text-dash-mute text-sm work">Manage your blog posts and articles</p>
                </div>
                <Link
                    href="/dashboard/admin/blog/create"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-aqua text-white font-medium rounded-lg hover:bg-aqua-hover transition-all shadow-lg shadow-teal-100"
                >
                    <FiPlus className="text-lg" />
                    Create New Blog
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-dash-card rounded-xl border border-dash-line p-5">
                    <p className="text-dash-mute text-xs font-medium work uppercase tracking-wider">Total Blogs</p>
                    <p className="text-3xl font-bold text-dash-ink2 mt-2 outfit">{blogs.length}</p>
                </div>
                <div className="bg-dash-card rounded-xl border border-dash-line p-5">
                    <p className="text-dash-mute text-xs font-medium work uppercase tracking-wider">Published</p>
                    <p className="text-3xl font-bold text-green-600 mt-2 outfit">
                        {blogs.filter(b => b.status === 'published').length}
                    </p>
                </div>
                <div className="bg-dash-card rounded-xl border border-dash-line p-5">
                    <p className="text-dash-mute text-xs font-medium work uppercase tracking-wider">Draft</p>
                    <p className="text-3xl font-bold text-amber-600 mt-2 outfit">
                        {blogs.filter(b => b.status === 'draft').length}
                    </p>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-dash-card rounded-xl border border-dash-line p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
                        <input
                            type="text"
                            placeholder="Search blogs by title, category, or author..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-dash-line rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-dash-line rounded-lg text-dash-ink4 hover:bg-dash-soft transition-colors">
                        <FiFilter />
                        <span>Filters</span>
                    </button>
                </div>
            </div>

            {/* Blog Table */}
            <div className="bg-dash-card rounded-xl border border-dash-line overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-10 h-10 border-4 border-aqua border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-dash-mute">Loading blogs...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center">
                        <p className="text-red-500">Error: {error}</p>
                    </div>
                ) : paginatedBlogs.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-dash-soft2 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiEdit2 className="text-2xl text-dash-mute2" />
                        </div>
                        <p className="text-dash-mute mb-4">No blogs found</p>
                        <Link
                            href="/dashboard/admin/blog/create"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-aqua text-white font-medium rounded-lg hover:bg-aqua-hover transition-all"
                        >
                            <FiPlus />
                            Create Your First Blog
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-dash-soft border-b border-dash-line">
                                    <tr>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-dash-mute uppercase tracking-wider">Blog</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-dash-mute uppercase tracking-wider">Category</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-dash-mute uppercase tracking-wider">Author</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-dash-mute uppercase tracking-wider">Date</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-dash-mute uppercase tracking-wider">Status</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold text-dash-mute uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dash-line-soft">
                                    {paginatedBlogs.map((blog, idx) => (
                                        <tr key={blog._id || blog.id || idx} className="hover:bg-dash-soft transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-dash-soft2 shrink-0">
                                                        {blog.image ? (
                                                            <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-aqua to-dash-steel flex items-center justify-center text-white font-bold">
                                                                {blog.title?.charAt(0) || 'B'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-semibold text-dash-ink2 truncate max-w-[200px]">{blog.title}</h3>
                                                        <p className="text-xs text-dash-mute truncate max-w-[200px]">{blog.excerpt || blog.content?.substring(0, 50) + '...'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-dash-soft2 rounded-full text-xs font-medium text-dash-ink4">
                                                    {blog.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FiUser className="text-dash-mute2" />
                                                    <span className="text-sm text-dash-ink4">{blog.author || 'Admin'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FiCalendar className="text-dash-mute2" />
                                                    <span className="text-sm text-dash-ink4">{formatDate(blog.createdAt || blog.date)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${blog.status === 'published'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {blog.status || 'Published'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/blogs/${blog._id || blog.id}`}
                                                        target="_blank"
                                                        className="p-2 text-dash-mute2 hover:text-aqua hover:bg-teal-50 rounded-lg transition-all"
                                                        title="View"
                                                    >
                                                        <FiEye />
                                                    </Link>
                                                    <Link
                                                        href={`/dashboard/admin/blog/${blog._id || blog.id}`}
                                                        className="p-2 text-dash-mute2 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Edit"
                                                    >
                                                        <FiEdit2 />
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteConfirm(blog._id || blog.id)}
                                                        className="p-2 text-dash-mute2 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-dash-line">
                                <p className="text-sm text-dash-mute">
                                    Showing {startIndex + 1} to {Math.min(startIndex + blogsPerPage, filteredBlogs.length)} of {filteredBlogs.length} blogs
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 border border-dash-line rounded-lg text-dash-ink4 hover:bg-dash-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <FiChevronLeft />
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-8 h-8 rounded-lg font-medium text-sm transition-all ${currentPage === i + 1
                                                    ? 'bg-aqua text-white'
                                                    : 'text-dash-ink4 hover:bg-dash-soft2'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 border border-dash-line rounded-lg text-dash-ink4 hover:bg-dash-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <FiChevronRight />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-dash-card rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-xl font-bold text-dash-ink2 outfit mb-2">Delete Blog?</h3>
                        <p className="text-dash-mute mb-6">Are you sure you want to delete this blog post? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2.5 border border-dash-line rounded-lg text-dash-ink4 font-medium hover:bg-dash-soft transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
