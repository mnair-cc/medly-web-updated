// API response types for University Courses endpoints (/api/v2)

export interface University {
  id: number;
  provider_id: string;
  name: string;
  institution_code: string;
  logo_link: string | null;
}

export interface UniversityListResponse {
  data: University[];
  total: number;
  limit: number;
  offset: number;
}

export interface Course {
  id: number;
  course_id: string;
  degree_title: string;
  degree_type: string;
  study_mode: string;
  university_name: string;
  university_id: number;
  number_of_years: number | null;
}

export interface CourseListResponse {
  data: Course[];
  total: number;
  limit: number;
  offset: number;
}

export interface Module {
  id: number;
  year: number;
  module_code: string;
  module_title: string;
  module_type: string;
  course_title?: string;
  university_name?: string;
}

export interface ModuleListResponse {
  data: Module[];
  total: number;
  limit: number;
  offset: number;
}
