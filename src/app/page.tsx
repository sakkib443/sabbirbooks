"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { fetchCoursesData } from "@/redux/CourseSlice";
import HeroSection from "@/components/home/HeroSection";
import MedicalCategories from "@/components/home/MedicalCategories";
import FeaturedCourses from "@/components/home/FeaturedCourses";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import FeaturedBooks from "@/components/home/FeaturedBooks";
import StatsBand from "@/components/home/StatsBand";
import CtaBand from "@/components/home/CtaBand";
import Newsletter from "@/components/home/Newsletter";

export default function HomePage() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Populate the redux `courses` slice used by <FeaturedCourses />.
    // Cast because the JS store has no typed AppDispatch yet.
    dispatch(fetchCoursesData() as never);
  }, [dispatch]);

  return (
    <main>
      <HeroSection />
      <MedicalCategories />
      <FeaturedCourses />
      <WhyChooseUs />
      <FeaturedBooks />
      <StatsBand />
      <CtaBand />
      <Newsletter />
    </main>
  );
}
