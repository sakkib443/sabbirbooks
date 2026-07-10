import { configureStore } from "@reduxjs/toolkit";
import categoriesReducer from "./categorySlice";
import coursesReducer from "./CourseSlice";
import mentorsReducer from "./mentorSlice";
import blogsReducer from "./blogSlice";

// Feature slices. The public home/about/courses pages read `state.categories`
// and `state.courses`; the ported Aptech dashboards additionally read
// `state.mentors` and `state.blogs`. All four start empty and render
// loading/empty states until the backend responds.
export const store = configureStore({
  reducer: {
    categories: categoriesReducer,
    courses: coursesReducer,
    mentors: mentorsReducer,
    blogs: blogsReducer,
  },
});

export default store;
