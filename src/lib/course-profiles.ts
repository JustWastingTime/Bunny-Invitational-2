import profiles from "@/data/course-profiles.json";
import type { Category } from "./constants";

/** Five tournament courses, snapshotted from Tazuna `assets/maps.json`. */
export type CourseSegment = {
  start: number;
  end: number;
  label?: string;
  type?: string;
  change?: number;
};

export type CourseProfile = {
  category: Category;
  name: string;
  cid: string;
  length: number;
  elevationScale: number | null;
  statThreshold: string;
  positionKeep: number[];
  elevation: CourseSegment[];
  layout: CourseSegment[];
  zones: CourseSegment[];
};

const COURSES = profiles as CourseProfile[];

export function courseProfile(category: Category) {
  return COURSES.find((course) => course.category === category);
}

export function courseProfiles() {
  return COURSES;
}
