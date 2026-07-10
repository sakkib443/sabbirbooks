import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API_BASE_URL from "@/config/api";

// Async fetch from backend API
export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async () => {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      cache: "no-store",
      headers: {
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) throw new Error("Failed to fetch categories");
    const result = await response.json();
    // API returns {success: true, data: [...]} so extract data array
    return result.data || result;
  }
);

const categorySlice = createSlice({
  name: "categories",
  initialState: {
    items: [],
    selectedCategories: [],
    status: "idle",
    error: null,
  },
  reducers: {
    setSelectedCategories: (state, action) => {
      state.selectedCategories = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => { state.status = "loading"; })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const { setSelectedCategories } = categorySlice.actions;
export default categorySlice.reducer;
