import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

// Admin write endpoints now require auth — attach the token.
const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
});

// Fetch all blogs
export const fetchBlogsData = createAsyncThunk(
    "blogs/fetchBlogsData",
    async () => {
        const response = await fetch(`${API_BASE}/blogs`, {
            cache: "no-store",
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) throw new Error("Failed to fetch blogs");
        const result = await response.json();
        return result.data || result;
    }
);

// Fetch single blog
export const fetchBlogById = createAsyncThunk(
    "blogs/fetchBlogById",
    async (id) => {
        const response = await fetch(`${API_BASE}/blogs/${id}`, {
            cache: "no-store",
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) throw new Error("Failed to fetch blog");
        const result = await response.json();
        return result.data || result;
    }
);

// Create blog — route is POST /blogs/create (was posting to /blogs → 404)
export const createBlog = createAsyncThunk(
    "blogs/createBlog",
    async (blogData) => {
        const response = await fetch(`${API_BASE}/blogs/create`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(blogData)
        });
        if (!response.ok) throw new Error("Failed to create blog");
        const result = await response.json();
        return result.data || result;
    }
);

// Update blog — backend route is PATCH (was PUT → 404)
export const updateBlog = createAsyncThunk(
    "blogs/updateBlog",
    async ({ id, blogData }) => {
        const response = await fetch(`${API_BASE}/blogs/${id}`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify(blogData)
        });
        if (!response.ok) throw new Error("Failed to update blog");
        const result = await response.json();
        return result.data || result;
    }
);

// Delete blog
export const deleteBlog = createAsyncThunk(
    "blogs/deleteBlog",
    async (id) => {
        const response = await fetch(`${API_BASE}/blogs/${id}`, {
            method: "DELETE",
            headers: authHeaders()
        });
        if (!response.ok) throw new Error("Failed to delete blog");
        return id;
    }
);

const blogSlice = createSlice({
    name: "blogs",
    initialState: {
        blogs: [],
        currentBlog: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearCurrentBlog: (state) => {
            state.currentBlog = null;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch all blogs
            .addCase(fetchBlogsData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBlogsData.fulfilled, (state, action) => {
                state.loading = false;
                state.blogs = action.payload;
            })
            .addCase(fetchBlogsData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            // Fetch single blog
            .addCase(fetchBlogById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBlogById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentBlog = action.payload;
            })
            .addCase(fetchBlogById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            // Create blog
            .addCase(createBlog.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createBlog.fulfilled, (state, action) => {
                state.loading = false;
                state.blogs.push(action.payload);
            })
            .addCase(createBlog.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            // Update blog
            .addCase(updateBlog.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateBlog.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.blogs.findIndex(b => b._id === action.payload._id || b.id === action.payload.id);
                if (index !== -1) {
                    state.blogs[index] = action.payload;
                }
            })
            .addCase(updateBlog.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            // Delete blog
            .addCase(deleteBlog.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteBlog.fulfilled, (state, action) => {
                state.loading = false;
                state.blogs = state.blogs.filter(b => b._id !== action.payload && b.id !== action.payload);
            })
            .addCase(deleteBlog.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            });
    },
});

export const { clearCurrentBlog, clearError } = blogSlice.actions;
export default blogSlice.reducer;
