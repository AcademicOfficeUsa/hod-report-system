// User and Role Types
export type UserRole = 'hod' | 'assistant_deputy' | 'deputy' | 'headmaster';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  created_at: string;
}

// Department Types
export interface Department {
  id: string;
  name: string;
  hod_name: string;
  hod_email: string;
  is_science: boolean;
  file_name: string;
}

// Teacher Types
export interface Teacher {
  id: string;
  department_id: string;
  name: string;
  subject: string;
  class_name: string;
  form: string;
  base_hw: number;
}

// Subject Types
export interface Subject {
  id: string;
  department_id: string;
  subject_name: string;
  form: string;
  level: 'O-Level' | 'A-Level';
  topics: number;
}

// Monthly Requirement Types
export interface MonthlyRequirement {
  id: string;
  form: string;
  month: number;
  required_pct: number;
}

// Report Types
export type ReportStatus = 'draft' | 'submitted' | 'approved' | 'edit_requested';

export interface HodReport {
  id: string;
  department_id: string;
  month: string;
  year: number;
  hod_name: string;
  hod_email: string;
  is_science: boolean;
  date_submitted: string | null;
  status: ReportStatus;
  comments_a: string | null;
  comments_b: string | null;
  comments_c: string | null;
  achievements: string[];
  challenges: string[];
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  department?: Department;
}

// Issue Types
export interface HodIssue {
  id: string;
  report_id: string;
  department_id: string;
  area_of_focus: string;
  frequency: number;
  remarks: string | null;
}

// Curriculum Types
export interface HodCurriculum {
  id: string;
  report_id: string;
  department_id: string;
  subject: string;
  form: string;
  level: string;
  topics_total: number;
  topics_covered: number;
  topics_pending: number;
  coverage_pct: number;
  term: string | null;
  required_pct: number;
  remarks: string | null;
}

// Exam Result Types
export interface HodExamResult {
  id: string;
  report_id: string;
  department_id: string;
  subject: string;
  form: string;
  grade_a: number;
  grade_b: number;
  grade_c: number;
  grade_d: number;
  grade_e: number;
  grade_s: number;
  grade_f: number;
  total: number;
  kpi_pct: number;
  below_kpi: number;
}

// Below KPI Types
export interface HodBelowKpi {
  id: string;
  report_id: string;
  department_id: string;
  subject: string;
  form: string;
  students_below_kpi: number;
  support_given: string | null;
  frequency: number;
}

// Homework Teacher Types
export interface HodHwTeacher {
  id: string;
  report_id: string;
  department_id: string;
  teacher_name: string;
  subject: string;
  class_name: string;
  form: string;
  base_hw: number;
  exam_in_month: string;
  expected_hw: number;
  marked_hw: number;
  hw_pct: number;
  tests_admin: number;
  demo_practicals: number;
  real_practicals: number;
  calling_parents: number;
}

// Staff Checklist Types
export interface HodStaffChecklist {
  id: string;
  report_id: string;
  department_id: string;
  staff_name: string;
  lp_updated: string;
  logbook_updated: string;
  scheme_updated: string;
  date_checked: string | null;
  one_one_done: string;
  teaching_aid_used: string;
  missed_lessons: string;
  reason_for_missing: string | null;
}

// Edit Request Types
export type EditRequestStatus = 'pending' | 'approved' | 'rejected';

export interface EditRequest {
  id: string;
  report_id: string;
  department_id: string;
  hod_id: string;
  requested_at: string;
  reason: string | null;
  status: EditRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

// Issue areas (Section 2)
export const ISSUE_AREAS = [
  'Department meetings done',
  'One to one meetings done',
  'Staff who have updated lesson notes',
  'Staff who use teaching aids in class',
  'Number of lesson observations done',
  'P.D done in the departments',
  'Staff who missed lessons',
  'Staff who are punctual to class',
  'Demo Practicals done per Month',
  'Real Practicals done per Month',
  'Call in parents given',
  'Staff who have updated lesson plan books',
  'Log books checked',
  'Scheme of work well commented'
];

// Months
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Forms
export const FORMS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

// Grades
export const GRADES = ['A', 'B', 'C', 'D', 'E', 'S', 'F'];
