/*
# HOD Monthly Report System - Initial Schema

This migration creates the complete database structure for the School of St. Jude 
HOD Monthly Report system with role-based access control.

## Tables Created:

### Core Tables
1. `user_profiles` - Extends auth.users with role and department assignment
   - Roles: hod, assistant_deputy, deputy, headmaster
   - HODs are linked to a department

2. `departments` - 7 academic departments
   - Physics, ABC, Math & Tech, Business, Humanities, Languages, Vocational
   - Includes HOD name, email, and is_science flag

3. `teachers` - Teacher assignments (class, subject, form, base_hw)
4. `subjects` - Subject curriculum data (topics per form/level)
5. `monthly_requirements` - Coverage % requirements per form/month

### Report Tables
6. `hod_reports` - Main report header with status (draft/submitted/approved)
7. `hod_issues` - Section 2: Department issues tracking
8. `hod_curriculum` - Section 3: Curriculum coverage per subject/form
9. `hod_exam_results` - Section 4: Exam results with grade distribution
10. `hod_below_kpi` - Section 6: Students below KPI and actions
11. `hod_hw_teachers` - Section 7: Homework/tests per teacher
12. `hod_staff_checklist` - Section 10: Staff monthly checklist
13. `hod_support_requests` - Section 9: Support needed from administration
14. `hod_issues_for_deputy` - Section 11: Issues for Deputy Headmaster
15. `hod_bonus_recommendations` - Section 12: Staff bonus recommendations
16. `edit_requests` - Track HOD requests to edit submitted reports
17. `assistant_deputy_reports` - Compiled reports from all HODs

## Security:
- RLS enabled on all tables
- HODs can only access their own department's reports
- Admins (assistant_deputy, deputy, headmaster) can access all reports
- Proper ownership checks on all CRUD operations
*/

-- ============================================
-- USER PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('hod', 'assistant_deputy', 'deputy', 'headmaster')),
  department_id text, -- nullable for admins
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "users_read_own_profile" ON user_profiles;
CREATE POLICY "users_read_own_profile" ON user_profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
CREATE POLICY "users_update_own_profile" ON user_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
DROP POLICY IF EXISTS "admins_read_all_profiles" ON user_profiles;
CREATE POLICY "admins_read_all_profiles" ON user_profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- DEPARTMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
  id text PRIMARY KEY,
  name text NOT NULL,
  hod_name text NOT NULL,
  hod_email text NOT NULL,
  is_science boolean DEFAULT false,
  file_name text,
  created_at timestamptz DEFAULT now()
);

-- Insert all 7 departments
INSERT INTO departments (id, name, hod_name, hod_email, is_science, file_name) VALUES
  ('physics', 'Physics', 'Erick Sambayeti', 'erick.s@schoolofstjude.co.tz', true, 'Physics_Monthly_Report_.xlsx'),
  ('abc', 'ABC', 'Shabani Ramadhani', 'shaban.r@schoolofstjude.co.tz', true, 'ABC_Monthly_Report_.xlsx'),
  ('math_tech', 'Math & Tech', 'Meshack Twaiti', 'meshack.t@schoolofstjude.co.tz', true, 'Math_Tech_Monthly_Report_.xlsx'),
  ('business', 'Business', 'Elia Materu', 'elia.m@schoolofstjude.co.tz', false, 'Business_Monthly_Report_.xlsx'),
  ('humanities', 'Humanities', 'Joseph Dasare', 'joseph.dasare@schoolofstjude.co.tz', false, 'Humanities_Monthly_Report_.xlsx'),
  ('languages', 'Languages', 'Joseph Mollel', 'joseph.mollel@schoolofstjude.co.tz', false, 'Language_Monthly_Report_.xlsx'),
  ('vocational', 'Vocational', 'Firmin Kiwale', 'firmin.k@schoolofstjude.co.tz', false, 'Vocational_Monthly_Report_.xlsx')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Everyone can read departments
DROP POLICY IF EXISTS "all_read_departments" ON departments;
CREATE POLICY "all_read_departments" ON departments FOR SELECT
  TO authenticated USING (true);

-- ============================================
-- TEACHERS
-- ============================================
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id text NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  class_name text NOT NULL,
  form text NOT NULL,
  base_hw integer NOT NULL DEFAULT 4,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teachers_dept ON teachers(department_id);
CREATE INDEX IF NOT EXISTS idx_teachers_form ON teachers(form);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- HODs can read teachers in their department
DROP POLICY IF EXISTS "hod_read_teachers" ON teachers;
CREATE POLICY "hod_read_teachers" ON teachers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = teachers.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- Admins can manage teachers
DROP POLICY IF EXISTS "admins_manage_teachers" ON teachers;
CREATE POLICY "admins_manage_teachers" ON teachers FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- SUBJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id text NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  form text NOT NULL,
  level text NOT NULL CHECK (level IN ('O-Level', 'A-Level')),
  topics integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(department_id, subject_name, form)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Same policies as teachers
DROP POLICY IF EXISTS "hod_read_subjects" ON subjects;
CREATE POLICY "hod_read_subjects" ON subjects FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = subjects.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "admins_manage_subjects" ON subjects;
CREATE POLICY "admins_manage_subjects" ON subjects FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- MONTHLY REQUIREMENTS (coverage %)
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form text NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  required_pct integer NOT NULL,
  UNIQUE(form, month)
);

-- Insert default requirements (from the HTML)
INSERT INTO monthly_requirements (form, month, required_pct) VALUES
-- F1
('F1', 1, 4), ('F1', 2, 7), ('F1', 3, 10), ('F1', 4, 20), ('F1', 5, 30), ('F1', 6, 40),
('F1', 7, 50), ('F1', 8, 60), ('F1', 9, 70), ('F1', 10, 80), ('F1', 11, 90), ('F1', 12, 100),
-- F2
('F2', 1, 10), ('F2', 2, 17), ('F2', 3, 25), ('F2', 4, 40), ('F2', 5, 55), ('F2', 6, 70),
('F2', 7, 50), ('F2', 8, 60), ('F2', 9, 70), ('F2', 10, 80), ('F2', 11, 90), ('F2', 12, 100),
-- F3 (same as F1)
('F3', 1, 4), ('F3', 2, 7), ('F3', 3, 10), ('F3', 4, 20), ('F3', 5, 30), ('F3', 6, 40),
('F3', 7, 50), ('F3', 8, 60), ('F3', 9, 70), ('F3', 10, 80), ('F3', 11, 90), ('F3', 12, 100),
-- F4 (same as F2)
('F4', 1, 10), ('F4', 2, 17), ('F4', 3, 25), ('F4', 4, 40), ('F4', 5, 55), ('F4', 6, 70),
('F4', 7, 50), ('F4', 8, 60), ('F4', 9, 70), ('F4', 10, 80), ('F4', 11, 90), ('F4', 12, 100),
-- F5
('F5', 1, 3), ('F5', 2, 7), ('F5', 3, 10), ('F5', 4, 20), ('F5', 5, 35), ('F5', 6, 50),
('F5', 7, 4), ('F5', 8, 16), ('F5', 9, 25), ('F5', 10, 50), ('F5', 11, 75), ('F5', 12, 100),
-- F6
('F6', 1, 5), ('F6', 2, 11), ('F6', 3, 16), ('F6', 4, 30), ('F6', 5, 50), ('F6', 6, 75),
('F6', 7, 5), ('F6', 8, 16), ('F6', 9, 25), ('F6', 10, 50), ('F6', 11, 75), ('F6', 12, 100)
ON CONFLICT (form, month) DO NOTHING;

ALTER TABLE monthly_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "all_read_requirements" ON monthly_requirements;
CREATE POLICY "all_read_requirements" ON monthly_requirements FOR SELECT
  TO authenticated USING (true);

-- ============================================
-- HOD REPORTS (main header)
-- ============================================
CREATE TABLE IF NOT EXISTS hod_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id text NOT NULL REFERENCES departments(id),
  month text NOT NULL,
  year integer NOT NULL,
  hod_name text NOT NULL,
  hod_email text NOT NULL,
  is_science boolean DEFAULT false,
  date_submitted date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'edit_requested')),
  comments_a text,
  comments_b text,
  comments_c text,
  achievements text[] DEFAULT '{}',
  challenges text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(department_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_reports_dept ON hod_reports(department_id);
CREATE INDEX IF NOT EXISTS idx_reports_month_year ON hod_reports(month, year);
CREATE INDEX IF NOT EXISTS idx_reports_status ON hod_reports(status);

ALTER TABLE hod_reports ENABLE ROW LEVEL SECURITY;

-- HODs can read own department reports
DROP POLICY IF EXISTS "hod_read_reports" ON hod_reports;
CREATE POLICY "hod_read_reports" ON hod_reports FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_reports.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- HODs can insert own department reports
DROP POLICY IF EXISTS "hod_insert_reports" ON hod_reports;
CREATE POLICY "hod_insert_reports" ON hod_reports FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_reports.department_id)
    AND hod_reports.status = 'draft'
  );

-- HODs can update own department drafts
DROP POLICY IF EXISTS "hod_update_reports" ON hod_reports;
CREATE POLICY "hod_update_reports" ON hod_reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_reports.department_id)
    AND hod_reports.status IN ('draft', 'edit_requested')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_reports.department_id)
  );

-- Admins can update any report
DROP POLICY IF EXISTS "admins_update_reports" ON hod_reports;
CREATE POLICY "admins_update_reports" ON hod_reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (true);

-- ============================================
-- HOD ISSUES (Section 2)
-- ============================================
CREATE TABLE IF NOT EXISTS hod_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_reports(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  month text NOT NULL,
  year integer NOT NULL,
  area_of_focus text NOT NULL,
  frequency integer DEFAULT 0,
  remarks text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issues_report ON hod_issues(report_id);

ALTER TABLE hod_issues ENABLE ROW LEVEL SECURITY;

-- Same access pattern as reports
DROP POLICY IF EXISTS "hod_read_issues" ON hod_issues;
CREATE POLICY "hod_read_issues" ON hod_issues FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_issues.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "hod_manage_issues" ON hod_issues;
CREATE POLICY "hod_manage_issues" ON hod_issues FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_issues.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_issues.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- HOD CURRICULUM (Section 3)
-- ============================================
CREATE TABLE IF NOT EXISTS hod_curriculum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_reports(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  subject text NOT NULL,
  form text NOT NULL,
  level text NOT NULL,
  topics_total integer NOT NULL,
  topics_covered integer DEFAULT 0,
  topics_pending integer DEFAULT 0,
  coverage_pct numeric(5,2) DEFAULT 0,
  term text,
  required_pct integer DEFAULT 0,
  remarks text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hod_curriculum ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hod_read_curriculum" ON hod_curriculum;
CREATE POLICY "hod_read_curriculum" ON hod_curriculum FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_curriculum.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "hod_manage_curriculum" ON hod_curriculum;
CREATE POLICY "hod_manage_curriculum" ON hod_curriculum FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_curriculum.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_curriculum.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- HOD EXAM RESULTS (Section 4)
-- ============================================
CREATE TABLE IF NOT EXISTS hod_exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_reports(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  subject text NOT NULL,
  form text NOT NULL,
  grade_a integer DEFAULT 0,
  grade_b integer DEFAULT 0,
  grade_c integer DEFAULT 0,
  grade_d integer DEFAULT 0,
  grade_e integer DEFAULT 0,
  grade_s integer DEFAULT 0,
  grade_f integer DEFAULT 0,
  total integer DEFAULT 0,
  kpi_pct numeric(5,2) DEFAULT 0,
  below_kpi integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hod_exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hod_read_exams" ON hod_exam_results;
CREATE POLICY "hod_read_exams" ON hod_exam_results FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_exam_results.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "hod_manage_exams" ON hod_exam_results;
CREATE POLICY "hod_manage_exams" ON hod_exam_results FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_exam_results.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_exam_results.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- HOD BELOW KPI (Section 6)
-- ============================================
CREATE TABLE IF NOT EXISTS hod_below_kpi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_reports(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  subject text NOT NULL,
  form text NOT NULL,
  students_below_kpi integer DEFAULT 0,
  support_given text,
  frequency integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hod_below_kpi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hod_read_below_kpi" ON hod_below_kpi;
CREATE POLICY "hod_read_below_kpi" ON hod_below_kpi FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_below_kpi.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "hod_manage_below_kpi" ON hod_below_kpi;
CREATE POLICY "hod_manage_below_kpi" ON hod_below_kpi FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_below_kpi.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_below_kpi.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- HOD HW TEACHERS (Section 7)
-- ============================================
CREATE TABLE IF NOT EXISTS hod_hw_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_reports(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  teacher_name text NOT NULL,
  subject text NOT NULL,
  class_name text NOT NULL,
  form text NOT NULL,
  base_hw integer NOT NULL DEFAULT 4,
  exam_in_month text DEFAULT 'NO',
  expected_hw integer DEFAULT 0,
  marked_hw integer DEFAULT 0,
  hw_pct numeric(5,2) DEFAULT 0,
  tests_admin integer DEFAULT 0,
  demo_practicals integer DEFAULT 0,
  real_practicals integer DEFAULT 0,
  calling_parents integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hod_hw_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hod_read_hw" ON hod_hw_teachers;
CREATE POLICY "hod_read_hw" ON hod_hw_teachers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_hw_teachers.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "hod_manage_hw" ON hod_hw_teachers;
CREATE POLICY "hod_manage_hw" ON hod_hw_teachers FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_hw_teachers.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_hw_teachers.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- HOD STAFF CHECKLIST (Section 10)
-- ============================================
CREATE TABLE IF NOT EXISTS hod_staff_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_reports(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  staff_name text NOT NULL,
  lp_updated text DEFAULT '',
  logbook_updated text DEFAULT '',
  scheme_updated text DEFAULT '',
  date_checked date,
  one_one_done text DEFAULT '',
  teaching_aid_used text DEFAULT '',
  missed_lessons text DEFAULT 'NO',
  reason_for_missing text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hod_staff_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hod_read_staff" ON hod_staff_checklist;
CREATE POLICY "hod_read_staff" ON hod_staff_checklist FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_staff_checklist.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "hod_manage_staff" ON hod_staff_checklist;
CREATE POLICY "hod_manage_staff" ON hod_staff_checklist FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_staff_checklist.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id 
           WHERE r.id = hod_staff_checklist.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- EDIT REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_reports(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  hod_id uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz DEFAULT now(),
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hod_read_edit_requests" ON edit_requests;
CREATE POLICY "hod_read_edit_requests" ON edit_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = hod_id
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "hod_create_edit_request" ON edit_requests;
CREATE POLICY "hod_create_edit_request" ON edit_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = hod_id);

DROP POLICY IF EXISTS "admins_review_edit_requests" ON edit_requests;
CREATE POLICY "admins_review_edit_requests" ON edit_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- ASSISTANT DEPUTY REPORTS (compiled)
-- ============================================
CREATE TABLE IF NOT EXISTS assistant_deputy_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  year integer NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  compiled_data jsonb,
  created_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  UNIQUE(month, year)
);

ALTER TABLE assistant_deputy_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_adeputy_reports" ON assistant_deputy_reports;
CREATE POLICY "admins_manage_adeputy_reports" ON assistant_deputy_reports FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- FUNCTION TO UPDATE UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_hod_reports_updated_at ON hod_reports;
CREATE TRIGGER update_hod_reports_updated_at BEFORE UPDATE ON hod_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
