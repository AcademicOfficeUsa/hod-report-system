/*
# Fix RLS Policies and Add Missing Child Tables

## Overview
This migration fixes several RLS policy issues and adds three child tables
that were referenced in the application code but never created in the database.

## Changes

### 1. user_profiles - Add INSERT/UPDATE/DELETE policies
- Previously only had SELECT and UPDATE policies for self
- Added INSERT policy so new users can create their own profile on signup
- Added DELETE policy so admins can remove user profiles
- Added admin UPDATE policy so admins can change roles/departments

### 2. departments - Add anon role to SELECT
- Previously only `authenticated` could read departments
- The signup form loads departments before the user is authenticated
- Added `anon` role to the SELECT policy so the dropdown populates on signup

### 3. New Tables: hod_support_requests, hod_issues_for_deputy, hod_bonus_recommendations
- These tables are referenced in HodReport.tsx but were never created
- All three follow the same pattern: report_id FK, department_id, created_at
- RLS enabled with same access pattern as other child tables

### 4. Add updated_at triggers to child tables
- hod_issues, hod_curriculum, hod_exam_results, etc. now track modification times
- Uses the existing update_updated_at_column() function
- Added updated_at column to each child table
*/

-- ============================================
-- 1. user_profiles - Add missing policies
-- ============================================

-- INSERT: users can create their own profile (needed for signup)
DROP POLICY IF EXISTS "users_insert_own_profile" ON user_profiles;
CREATE POLICY "users_insert_own_profile" ON user_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- DELETE: admins can delete user profiles
DROP POLICY IF EXISTS "admins_delete_profiles" ON user_profiles;
CREATE POLICY "admins_delete_profiles" ON user_profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- UPDATE: admins can update any profile (role/department changes)
DROP POLICY IF EXISTS "admins_update_profiles" ON user_profiles;
CREATE POLICY "admins_update_profiles" ON user_profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- 2. departments - Allow anon to read (for signup form)
-- ============================================
DROP POLICY IF EXISTS "all_read_departments" ON departments;
CREATE POLICY "all_read_departments" ON departments FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================
-- 3. NEW TABLE: hod_support_requests (Section 9)
-- ============================================
CREATE TABLE IF NOT EXISTS hod_support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_reports(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  staff_name text,
  issue text,
  suggestion text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_report ON hod_support_requests(report_id);

ALTER TABLE hod_support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hod_read_support_requests" ON hod_support_requests;
CREATE POLICY "hod_read_support_requests" ON hod_support_requests FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_support_requests.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "hod_manage_support_requests" ON hod_support_requests;
CREATE POLICY "hod_manage_support_requests" ON hod_support_requests FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id
           WHERE r.id = hod_support_requests.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id
           WHERE r.id = hod_support_requests.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- 4. NEW TABLE: hod_issues_for_deputy (Section 11)
-- ============================================
CREATE TABLE IF NOT EXISTS hod_issues_for_deputy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_reports(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  title text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issues_deputy_report ON hod_issues_for_deputy(report_id);

ALTER TABLE hod_issues_for_deputy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hod_read_issues_deputy" ON hod_issues_for_deputy;
CREATE POLICY "hod_read_issues_deputy" ON hod_issues_for_deputy FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_issues_for_deputy.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "hod_manage_issues_deputy" ON hod_issues_for_deputy;
CREATE POLICY "hod_manage_issues_deputy" ON hod_issues_for_deputy FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id
           WHERE r.id = hod_issues_for_deputy.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id
           WHERE r.id = hod_issues_for_deputy.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- 5. NEW TABLE: hod_bonus_recommendations (Section 12)
-- ============================================
CREATE TABLE IF NOT EXISTS hod_bonus_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES hod_reports(id) ON DELETE CASCADE,
  department_id text NOT NULL,
  staff_name text,
  reasons text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bonus_report ON hod_bonus_recommendations(report_id);

ALTER TABLE hod_bonus_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hod_read_bonus" ON hod_bonus_recommendations;
CREATE POLICY "hod_read_bonus" ON hod_bonus_recommendations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND department_id = hod_bonus_recommendations.department_id)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

DROP POLICY IF EXISTS "hod_manage_bonus" ON hod_bonus_recommendations;
CREATE POLICY "hod_manage_bonus" ON hod_bonus_recommendations FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id
           WHERE r.id = hod_bonus_recommendations.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM hod_reports r JOIN user_profiles up ON up.department_id = r.department_id
           WHERE r.id = hod_bonus_recommendations.report_id AND up.id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('assistant_deputy', 'deputy', 'headmaster'))
  );

-- ============================================
-- 6. Add updated_at column + trigger to child tables
-- ============================================
ALTER TABLE hod_issues ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE hod_curriculum ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE hod_exam_results ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE hod_below_kpi ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE hod_hw_teachers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE hod_staff_checklist ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS update_hod_issues_updated_at ON hod_issues;
CREATE TRIGGER update_hod_issues_updated_at BEFORE UPDATE ON hod_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hod_curriculum_updated_at ON hod_curriculum;
CREATE TRIGGER update_hod_curriculum_updated_at BEFORE UPDATE ON hod_curriculum
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hod_exam_results_updated_at ON hod_exam_results;
CREATE TRIGGER update_hod_exam_results_updated_at BEFORE UPDATE ON hod_exam_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hod_below_kpi_updated_at ON hod_below_kpi;
CREATE TRIGGER update_hod_below_kpi_updated_at BEFORE UPDATE ON hod_below_kpi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hod_hw_teachers_updated_at ON hod_hw_teachers;
CREATE TRIGGER update_hod_hw_teachers_updated_at BEFORE UPDATE ON hod_hw_teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hod_staff_checklist_updated_at ON hod_staff_checklist;
CREATE TRIGGER update_hod_staff_checklist_updated_at BEFORE UPDATE ON hod_staff_checklist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
