'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBlogById, updateBlog, clearCurrentBlog } from '@/redux/blogSlice';
import {
    FiArrowLeft, FiImage, FiSave, FiEye, FiType,
    FiAlignLeft, FiTag, FiUser, FiX
} from 'react-icons/fi';
import Link from 'next/link';

export default function EditBlog() {
    const router = useRouter();
    const params = useParams();
    const blogId = params.id;
    const dispatch = useDispatch();
    const { currentBlog, loading } = useSelector((state) => state.blogs || {});

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
    const [isLoading, setIsLoading] = useState(true);

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

    useEffect(() => {
        if (blogId) {
            dispatch(fetchBlogById(blogId));
        }
        return () => {
            dispatch(clearCurrentBlog());
        };
    }, [dispatch, blogId]);

    useEffect(() => {
        if (currentBlog) {
            setFormData({
                title: currentBlog.title || '',
                titleBn: currentBlog.titleBn || '',
                excerpt: currentBlog.excerpt || '',
                excerptBn: currentBlog.excerptBn || '',
                content: currentBlog.content || '',
                contentBn: currentBlog.contentBn || '',
                category: currentBlog.category || '',
                author: currentBlog.author || '',
                image: currentBlog.image || '',
                tags: currentBlog.tags || [],
                status: currentBlog.status || 'published',
                featured: currentBlog.featured || false,
            });
            setIsLoading(false);
        }
    }, [currentBlog]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
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
                updatedAt: new Date().toISOString(),
            };

            await dispatch(updateBlog({ id: blogId, blogData })).unwrap();
            router.push('/dashboard/admin/blog');
        } catch (err) {
            console.error('Failed to update blog:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-aqua border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-dash-mute">Loading blog data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/admin/blog"
                        className="p-2 border border-dash-line rounded-lg text-dash-ink4 hover:bg-dash-soft transition-colors"
                    >
                        <FiArrowLeft />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-dash-ink2 outfit">Edit Blog</h1>
                        <p className="text-dash-mute text-sm work">Update your blog post</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setPreview(!preview)}
                        className="flex items-center gap-2 px-4 py-2.5 border border-dash-line rounded-lg text-dash-ink4 hover:bg-dash-soft transition-colors"
                    >
                        <FiEye />
                        {preview ? 'Edit' : 'Preview'}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-aqua text-white font-medium rounded-lg hover:bg-aqua-hover transition-all shadow-lg shadow-teal-100 disabled:opacity-50"
                    >
                        <FiSave />
                        {loading ? 'Updating...' : 'Update Blog'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {!preview ? (
                        <>
                            {/* Title - English */}
                            <div className="bg-dash-card rounded-xl border border-dash-line p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-3">
                                    <FiType className="text-aqua" />
                                    Blog Title (English) *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Enter an engaging title for your blog..."
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all ${errors.title ? 'border-red-400' : 'border-dash-line'
                                        }`}
                                />
                                {errors.title && <p className="text-red-500 text-xs mt-2">{errors.title}</p>}
                            </div>

                            {/* Title - Bengali */}
                            <div className="bg-dash-card rounded-xl border border-dash-line p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-3">
                                    <FiType className="text-dash-steel" />
                                    Blog Title (Bengali)
                                </label>
                                <input
                                    type="text"
                                    name="titleBn"
                                    value={formData.titleBn}
                                    onChange={handleChange}
                                    placeholder="ব্লগের শিরোনাম বাংলায় লিখুন..."
                                    className="w-full px-4 py-3 border border-dash-line rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all hind-siliguri"
                                />
                            </div>

                            {/* Excerpt - English */}
                            <div className="bg-dash-card rounded-xl border border-dash-line p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-3">
                                    <FiAlignLeft className="text-aqua" />
                                    Short Excerpt (English)
                                </label>
                                <textarea
                                    name="excerpt"
                                    value={formData.excerpt}
                                    onChange={handleChange}
                                    placeholder="Write a brief summary of your blog..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-dash-line rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all resize-none"
                                />
                            </div>

                            {/* Excerpt - Bengali */}
                            <div className="bg-dash-card rounded-xl border border-dash-line p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-3">
                                    <FiAlignLeft className="text-dash-steel" />
                                    Short Excerpt (Bengali)
                                </label>
                                <textarea
                                    name="excerptBn"
                                    value={formData.excerptBn}
                                    onChange={handleChange}
                                    placeholder="ব্লগের সংক্ষিপ্ত বিবরণ বাংলায় লিখুন..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-dash-line rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all resize-none hind-siliguri"
                                />
                            </div>

                            {/* Content - English */}
                            <div className="bg-dash-card rounded-xl border border-dash-line p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-3">
                                    <FiAlignLeft className="text-aqua" />
                                    Full Content (English) *
                                </label>
                                <textarea
                                    name="content"
                                    value={formData.content}
                                    onChange={handleChange}
                                    placeholder="Write your complete blog content here..."
                                    rows={12}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all resize-none ${errors.content ? 'border-red-400' : 'border-dash-line'
                                        }`}
                                />
                                {errors.content && <p className="text-red-500 text-xs mt-2">{errors.content}</p>}
                            </div>

                            {/* Content - Bengali */}
                            <div className="bg-dash-card rounded-xl border border-dash-line p-6">
                                <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-3">
                                    <FiAlignLeft className="text-dash-steel" />
                                    Full Content (Bengali)
                                </label>
                                <textarea
                                    name="contentBn"
                                    value={formData.contentBn}
                                    onChange={handleChange}
                                    placeholder="এখানে সম্পূর্ণ ব্লগ কন্টেন্ট বাংলায় লিখুন..."
                                    rows={12}
                                    className="w-full px-4 py-3 border border-dash-line rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all resize-none hind-siliguri"
                                />
                            </div>
                        </>
                    ) : (
                        /* Preview Mode */
                        <div className="bg-dash-card rounded-xl border border-dash-line p-8">
                            <h2 className="text-3xl font-bold text-dash-ink2 outfit mb-4">{formData.title || 'Untitled Blog'}</h2>
                            {formData.image && (
                                <img src={formData.image} alt="Preview" className="w-full h-64 object-cover rounded-xl mb-6" />
                            )}
                            <div className="flex items-center gap-4 mb-6">
                                <span className="px-3 py-1 bg-aqua/10 text-aqua rounded-full text-sm font-medium">
                                    {formData.category || 'Category'}
                                </span>
                                <span className="text-sm text-dash-mute">By {formData.author || 'Author'}</span>
                            </div>
                            {formData.excerpt && (
                                <p className="text-lg text-dash-ink4 italic mb-6 border-l-4 border-aqua pl-4">
                                    {formData.excerpt}
                                </p>
                            )}
                            <div className="prose max-w-none text-dash-ink3 whitespace-pre-wrap">
                                {formData.content || 'No content yet...'}
                            </div>
                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-dash-line-soft">
                                    {formData.tags.map((tag, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-dash-soft2 rounded-full text-sm text-dash-ink4">
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
                    <div className="bg-dash-card rounded-xl border border-dash-line p-6">
                        <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-3">
                            <FiImage className="text-aqua" />
                            Featured Image *
                        </label>
                        <input
                            type="text"
                            name="image"
                            value={formData.image}
                            onChange={handleChange}
                            placeholder="https://example.com/image.jpg"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all ${errors.image ? 'border-red-400' : 'border-dash-line'
                                }`}
                        />
                        {errors.image && <p className="text-red-500 text-xs mt-2">{errors.image}</p>}
                        {formData.image && (
                            <img
                                src={formData.image}
                                alt="Preview"
                                className="mt-4 w-full h-40 object-cover rounded-lg border border-dash-line"
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        )}
                    </div>

                    {/* Category */}
                    <div className="bg-dash-card rounded-xl border border-dash-line p-6">
                        <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-3">
                            <FiTag className="text-aqua" />
                            Category *
                        </label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all ${errors.category ? 'border-red-400' : 'border-dash-line'
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
                    <div className="bg-dash-card rounded-xl border border-dash-line p-6">
                        <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-3">
                            <FiUser className="text-aqua" />
                            Author Name
                        </label>
                        <input
                            type="text"
                            name="author"
                            value={formData.author}
                            onChange={handleChange}
                            placeholder="Enter author name"
                            className="w-full px-4 py-3 border border-dash-line rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all"
                        />
                    </div>

                    {/* Tags */}
                    <div className="bg-dash-card rounded-xl border border-dash-line p-6">
                        <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-3">
                            <FiTag className="text-dash-steel" />
                            Tags
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                placeholder="Add a tag..."
                                className="flex-1 px-4 py-3 border border-dash-line rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all"
                            />
                            <button
                                type="button"
                                onClick={addTag}
                                className="px-4 py-3 bg-dash-soft2 rounded-lg text-dash-ink4 hover:bg-dash-soft3 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {formData.tags.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-aqua/10 text-aqua rounded-full text-sm"
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
                    <div className="bg-dash-card rounded-xl border border-dash-line p-6 space-y-4">
                        <div>
                            <label className="text-sm font-bold text-dash-ink3 mb-3 block">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-dash-line rounded-lg focus:ring-2 focus:ring-aqua/20 focus:border-aqua outline-none transition-all"
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
                                className="w-5 h-5 rounded border-dash-line-strong text-aqua focus:ring-aqua"
                            />
                            <span className="text-sm font-medium text-dash-ink3">Featured Post</span>
                        </label>
                    </div>
                </div>
            </form>
        </div>
    );
}
