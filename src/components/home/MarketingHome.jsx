'use client';

/**
 * The original multi-section marketing homepage — courses, categories, books.
 *
 * Lifted out of app/page.tsx unchanged so that file could become a server
 * component (which is what makes Facebook link previews possible). Nothing here
 * was removed; it renders again the moment NEXT_PUBLIC_PUBLIC_PAGES=on.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { fetchCoursesData } from '@/redux/CourseSlice';
import HeroSection from '@/components/home/HeroSection';
import MedicalCategories from '@/components/home/MedicalCategories';
import FeaturedCourses from '@/components/home/FeaturedCourses';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import FeaturedBooks from '@/components/home/FeaturedBooks';
import StatsBand from '@/components/home/StatsBand';
import CtaBand from '@/components/home/CtaBand';
import Newsletter from '@/components/home/Newsletter';

export default function MarketingHome() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Populate the redux `courses` slice used by <FeaturedCourses />.
    dispatch(fetchCoursesData());
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
