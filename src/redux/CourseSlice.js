import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API_BASE_URL from "@/config/api";

// Async fetch from backend API
export const fetchCoursesData = createAsyncThunk(
  "courses/fetchCoursesData",
  async () => {
    // limit=1000 → the public catalog & details pages must see ALL courses,
    // not just the backend's default page of 50 (site can have 200+ courses).
    const response = await fetch(`${API_BASE_URL}/courses?limit=1000`, {
      cache: "no-store",
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) throw new Error("Failed to fetch courses");
    const result = await response.json();
    // API returns {success: true, data: [...]} so extract data array
    return result.data || result;
  }
);

const courseSlice = createSlice({
  name: "courses",
  initialState: {
    courses: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoursesData.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCoursesData.fulfilled, (state, action) => {
        state.loading = false;
        state.courses = action.payload;
      })
      .addCase(fetchCoursesData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default courseSlice.reducer;
