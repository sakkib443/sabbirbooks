'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { createBlog } from '@/redux/blogSlice';
import {
    FiArrowLeft, FiImage, FiSave, FiEye, FiType,
    FiAlignLeft, FiTag, FiUser, FiX
} from 'react-icons/fi';
import Link from 'next/link';

export default function CreateBlog() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { loading } = useSelector((state) => state.blogs || {});

    const [formData, setFormData] = useState({
        title: '',
        titleBn: '',
        excerpt: '',
        excerptBn: '',
        content: '',
        contentBn: '',
        category: '',
        author: '',
        image: '',
        tags: [],
        status: 'published',
        featured: false,
    });

    const [tagInput, setTagInput] = useState('');
    const [errors, setErrors] = useState({});
    const [preview, setPreview] = useState(false);

    const categories = [
        'Technology',
        'Education',
        'Career',
        'Programming',
        'Design',
        'Marketing',
        'Freelancing',
        'Tips & Tricks',
        'Success Stories',
        'Other'
    ];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tagInput.trim()]
            }));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.content.trim()) newErrors.content = 'Content is required';
        if (!formData.category) newErrors.category = 'Category is required';
        if (!formData.image.trim()) newErrors.image = 'Featured image is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const blogData = {
                ...formData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await dispatch(createBlog(blogData)).unwrap();
            router.push('/dashboard/admin/blog');
        } catch (err) {
            console.error('Failed to create blog:', err);
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/admin/blog"
                        className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <FiArrowLeft />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 outfit">Create New Blog</h1>
                        <p className="text-slate-500 text-sm work">Add a new blog post to your website</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setPreview(!preview)}
                        className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <FiEye />
                        {preview ? 'Edit' : 'Preview'}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#41bfb8] text-white font-medium rounded-lg hover:bg-[#38a89d] transition-all shadow-lg shadow-teal-100 disabled:opacity-50"
                    >
                        <FiSave />
                        {loading ? 'Publishing...' : 'Publish Blog'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {!preview ? (
                        <>
                            {/* Title - English */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                    <FiType className="text-[#41bfb8]" />
                                    Blog Title (English) *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Enter an engaging title for your blog..."
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all ${errors.title ? 'border-red-400' : 'border-slate-200'
                                        }`}
                                />
                                {errors.title && <p className="text-red-500 text-xs mt-2">{errors.title}</p>}
                            </div>

                            {/* Title - Bengali */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                    <FiType className="text-[#9AA0A8]" />
                                    Blog Title (Bengali)
                                </label>
                                <input
                                    type="text"
                                    name="titleBn"
                                    value={formData.titleBn}
                                    onChange={handleChange}
                                    placeholder="ব্লগের শিরোনাম বাংলায় লিখুন..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all hind-siliguri"
                                />
                            </div>

                            {/* Excerpt - English */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                    <FiAlignLeft className="text-[#41bfb8]" />
                                    Short Excerpt (English)
                                </label>
                                <textarea
                                    name="excerpt"
                                    value={formData.excerpt}
                                    onChange={handleChange}
                                    placeholder="Write a brief summary of your blog (displayed in listings)..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all resize-none"
                                />
                            </div>

                            {/* Excerpt - Bengali */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                    <FiAlignLeft className="text-[#9AA0A8]" />
                                    Short Excerpt (Bengali)
                                </label>
                                <textarea
                                    name="excerptBn"
                                    value={formData.excerptBn}
                                    onChange={handleChange}
                                    placeholder="ব্লগের সংক্ষিপ্ত বিবরণ বাংলায় লিখুন..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all resize-none hind-siliguri"
                                />
                            </div>

                            {/* Content - English */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                    <FiAlignLeft className="text-[#41bfb8]" />
                                    Full Content (English) *
                                </label>
                                <textarea
                                    name="content"
                                    value={formData.content}
                                    onChange={handleChange}
                                    placeholder="Write your complete blog content here... You can use markdown formatting."
                                    rows={12}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all resize-none ${errors.content ? 'border-red-400' : 'border-slate-200'
                                        }`}
                                />
                                {errors.content && <p className="text-red-500 text-xs mt-2">{errors.content}</p>}
                            </div>

                            {/* Content - Bengali */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                                    <FiAlignLeft className="text-[#9AA0A8]" />
                                    Full Content (Bengali)
                                </label>
                                <textarea
                                    name="contentBn"
                                    value={formData.contentBn}
                                    onChange={handleChange}
                                    placeholder="এখানে সম্পূর্ণ ব্লগ কন্টেন্ট বাংলায় লিখুন..."
                                    rows={12}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all resize-none hind-siliguri"
                                />
                            </div>
                        </>
                    ) : (
                        /* Preview Mode */
                        <div className="bg-white rounded-xl border border-slate-200 p-8">
                            <h2 className="text-3xl font-bold text-slate-800 outfit mb-4">{formData.title || 'Untitled Blog'}</h2>
                            {formData.image && (
                                <img src={formData.image} alt="Preview" className="w-full h-64 object-cover rounded-xl mb-6" />
                            )}
                            <div className="flex items-center gap-4 mb-6">
                                <span className="px-3 py-1 bg-[#41bfb8]/10 text-[#41bfb8] rounded-full text-sm font-medium">
                                    {formData.category || 'Category'}
                                </span>
                                <span className="text-sm text-slate-500">By {formData.author || 'Author'}</span>
                            </div>
                            {formData.excerpt && (
                                <p className="text-lg text-slate-600 italic mb-6 border-l-4 border-[#41bfb8] pl-4">
                                    {formData.excerpt}
                                </p>
                            )}
                            <div className="prose max-w-none text-slate-700 whitespace-pre-wrap">
                                {formData.content || 'No content yet...'}
                            </div>
                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-slate-100">
                                    {formData.tags.map((tag, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar Settings */}
                <div className="space-y-6">
                    {/* Featured Image */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                            <FiImage className="text-[#41bfb8]" />
                            Featured Image *
                        </label>
                        <input
                            type="text"
                            name="image"
                            value={formData.image}
                            onChange={handleChange}
                            placeholder="https://example.com/image.jpg"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all ${errors.image ? 'border-red-400' : 'border-slate-200'
                                }`}
                        />
                        {errors.image && <p className="text-red-500 text-xs mt-2">{errors.image}</p>}
                        {formData.image && (
                            <img
                                src={formData.image}
                                alt="Preview"
                                className="mt-4 w-full h-40 object-cover rounded-lg border border-slate-200"
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        )}
                    </div>

                    {/* Category */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                            <FiTag className="text-[#41bfb8]" />
                            Category *
                        </label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all ${errors.category ? 'border-red-400' : 'border-slate-200'
                                }`}
                        >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        {errors.category && <p className="text-red-500 text-xs mt-2">{errors.category}</p>}
                    </div>

                    {/* Author */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                            <FiUser className="text-[#41bfb8]" />
                            Author Name
                        </label>
                        <input
                            type="text"
                            name="author"
                            value={formData.author}
                            onChange={handleChange}
                            placeholder="Enter author name"
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all"
                        />
                    </div>

                    {/* Tags */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                            <FiTag className="text-[#9AA0A8]" />
                            Tags
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                placeholder="Add a tag..."
                                className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all"
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="px-4 py-3 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {formData.tags.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#41bfb8]/10 text-[#41bfb8] rounded-full text-sm"
                                    >
                                        {tag}
                                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                                            <FiX className="text-xs" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status & Featured */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-3 block">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none transition-all"
                            >
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                            </select>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="featured"
                                checked={formData.featured}
                                onChange={handleChange}
                                className="w-5 h-5 rounded border-slate-300 text-[#41bfb8] focus:ring-[#41bfb8]"
                            />
                            <span className="text-sm font-medium text-slate-700">Featured Post</span>
                        </label>
                    </div>
                </div>
            </form>
        </div>
    );
}
