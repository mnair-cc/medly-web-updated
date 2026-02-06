export interface UserSubjectData {
  subject_legacy_id: string;
  current_grade?: string | null;
  target_grade?: string | null;
  weak_topics?: string[];
  gcse_higher?: boolean | null;
  prior_qualification_grade?: string | null;
}

export interface UpdateUserSubjectsRequest {
  subjects: UserSubjectData[];
}

export interface UpdateUserSubjectPartialRequest {
  current_grade?: string | null;
  target_grade?: string | null;
  weak_topics?: string[];
  gcse_higher?: boolean | null;
  prior_qualification_grade?: string | null;
}
