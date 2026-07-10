import { configureStore } from "@reduxjs/toolkit";
import categoriesReducer from "./categorySlice";
import coursesReducer from "./CourseSlice";

// Feature slices ported from the Aptech Learning client. Home/About course
// carousels read `state.categories` and `state.courses`; both start empty and
// render loading/empty states until the backend lands.
export const store = configureStore({
  reducer: {
    categories: categoriesReducer,
    courses: coursesReducer,
  },
});

export default store;
