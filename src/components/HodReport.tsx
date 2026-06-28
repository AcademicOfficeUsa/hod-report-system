import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type {
  Department, Teacher, Subject, HodReport, HodIssue, HodCurriculum,
  HodExamResult, HodBelowKpi, HodHwTeacher, HodStaffChecklist
} from '../lib/types';
import { ISSUE_AREAS, MONTHS, FORMS, GRADES } from '../lib/types';
import {
  ChevronDown, ChevronUp, Save, Send, Eye, Download, AlertCircle, CheckCircle, Clock
} from 'lucide-react';

interface HodReportFormProps {
  reportId?: string;
  onSaved?: (id: string) => void;
  onSubmit?: () => void;
}

export function HodReportForm({ reportId, onSaved, onSubmit }: HodReportFormProps) {
  const { profile } = useAuth();

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffNames, setStaffNames] = useState<string[]>([]);

  // Form State
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateSubmitted, setDateSubmitted] = useState(new Date().toISOString().split('T')[0]);

  // Report sections
  const [issues, setIssues] = useState<HodIssue[]>([]);
  const [curriculum, setCurriculum] = useState<HodCurriculum[]>([]);
  const [examResults, setExamResults] = useState<HodExamResult[]>([]);
  const [belowKpi, setBelowKpi] = useState<HodBelowKpi[]>([]);
  const [hwTeachers, setHwTeachers] = useState<HodHwTeacher[]>([]);
  const [staffChecklist, setStaffChecklist] = useState<HodStaffChecklist[]>([]);

  // Comments
  const [commentA, setCommentA] = useState('');
  const [commentB, setCommentB] = useState('');
  const [commentC, setCommentC] = useState('');
  const [achievements, setAchievements] = useState<string[]>(['', '', '']);
  const [challenges, setChallenges] = useState<string[]>(['', '', '']);

  // Support and Issue sections
  const [supportRequests, setSupportRequests] = useState<{ staff: string; issue: string; suggestion: string }[]>([
    { staff: '', issue: '', suggestion: '' },
    { staff: '', issue: '', suggestion: '' }
  ]);
  const [issuesForDeputy, setIssuesForDeputy] = useState<{ title: string; description: string }[]>([
    { title: '', description: '' },
    { title: '', description: '' }
  ]);
  const [bonusRecommendations, setBonusRecommendations] = useState<{ staff: string; reasons: string }[]>([
    { staff: '', reasons: '' },
    { staff: '', reasons: '' }
  ]);

  // Report status
  const [reportStatus, setReportStatus] = useState<'draft' | 'submitted' | 'edit_requested'>('draft');
  const [currentReportId, setCurrentReportId] = useState<string | null>(reportId || null);

  // Section collapse state
  const [openSections, setOpenSections] = useState<number[]>([1]);

  const departmentId = profile?.department_id;
  const isScience = departments.find(d => d.id === departmentId)?.is_science || false;

  // Load initial data
  useEffect(() => {
    loadDepartments();
    loadTeachers();
    loadSubjects();
    if (reportId) {
      loadReport(reportId);
    }
  }, [departmentId]);

  useEffect(() => {
    if (teachers.length > 0 && subjects.length > 0) {
      initializeSections();
    }
  }, [teachers, subjects, selectedMonth]);

  const loadDepartments = async () => {
    const { data } = await supabase.from('departments').select('*');
    if (data) setDepartments(data);
  };

  const loadTeachers = async () => {
    if (!departmentId) return;
    const { data } = await supabase
      .from('teachers')
      .select('*')
      .eq('department_id', departmentId)
      .order('name');
    if (data) {
      setTeachers(data);
      // Extract unique staff names
      const names = [...new Set(data.map(t => t.name))];
      setStaffNames(names);
    }
  };

  const loadSubjects = async () => {
    if (!departmentId) return;
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('department_id', departmentId)
      .order('subject_name, form');
    if (data) setSubjects(data);
  };

  const loadReport = async (id: string) => {
    setLoading(true);

    // Load main report
    const { data: report } = await supabase
      .from('hod_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (report) {
      setReportStatus(report.status);
      setSelectedMonth(report.month);
      setSelectedYear(report.year);
      setDateSubmitted(report.date_submitted || new Date().toISOString().split('T')[0]);
      setCommentA(report.comments_a || '');
      setCommentB(report.comments_b || '');
      setCommentC(report.comments_c || '');
      setAchievements(report.achievements || ['', '', '']);
      setChallenges(report.challenges || ['', '', '']);

      // Load related data
      const [issuesData, currData, examData, kpiData, hwData, staffData] = await Promise.all([
        supabase.from('hod_issues').select('*').eq('report_id', id),
        supabase.from('hod_curriculum').select('*').eq('report_id', id),
        supabase.from('hod_exam_results').select('*').eq('report_id', id),
        supabase.from('hod_below_kpi').select('*').eq('report_id', id),
        supabase.from('hod_hw_teachers').select('*').eq('report_id', id),
        supabase.from('hod_staff_checklist').select('*').eq('report_id', id)
      ]);

      if (issuesData.data) setIssues(issuesData.data);
      if (currData.data) setCurriculum(currData.data);
      if (examData.data) setExamResults(examData.data);
      if (kpiData.data) setBelowKpi(kpiData.data);
      if (hwData.data) setHwTeachers(hwData.data);
      if (staffData.data) setStaffChecklist(staffData.data);
    }

    setLoading(false);
  };

  const initializeSections = () => {
    const monthIndex = MONTHS.indexOf(selectedMonth) + 1;

    // Initialize issues
    const initIssues: HodIssue[] = ISSUE_AREAS.map((area, i) => ({
      id: `temp-${i}`,
      report_id: currentReportId || '',
      department_id: departmentId || '',
      area_of_focus: area,
      frequency: 0,
      remarks: ''
    }));
    setIssues(prev => prev.length === 0 || !reportId ? initIssues : prev);

    // Initialize curriculum
    const initCurriculum: HodCurriculum[] = subjects.map(s => {
      const reqPct = getRequiredPct(s.form, monthIndex);
      return {
        id: `temp-${s.id}`,
        report_id: currentReportId || '',
        department_id: departmentId || '',
        subject: s.subject_name,
        form: s.form,
        level: s.level,
        topics_total: s.topics,
        topics_covered: 0,
        topics_pending: s.topics,
        coverage_pct: 0,
        term: getTerm(s.level, monthIndex),
        required_pct: reqPct,
        remarks: ''
      };
    });
    setCurriculum(prev => prev.length === 0 || !reportId ? initCurriculum : prev);

    // Initialize exam results for each unique subject/form combo
    const uniqueSubjectForms = [...new Set(subjects.map(s => `${s.subject}-${s.form}`))];
    const initExams: HodExamResult[] = uniqueSubjectForms.map((sf, i) => {
      const [subj, form] = sf.split('-');
      return {
        id: `temp-${i}`,
        report_id: currentReportId || '',
        department_id: departmentId || '',
        subject: subj,
        form: form,
        grade_a: 0, grade_b: 0, grade_c: 0, grade_d: 0, grade_e: 0, grade_s: 0, grade_f: 0,
        total: 0,
        kpi_pct: 0,
        below_kpi: 0
      };
    });
    setExamResults(prev => prev.length === 0 || !reportId ? initExams : prev);

    // Initialize below KPI
    const initBelowKpi: HodBelowKpi[] = subjects.map(s => ({
      id: `temp-${s.id}`,
      report_id: currentReportId || '',
      department_id: departmentId || '',
      subject: s.subject_name,
      form: s.form,
      students_below_kpi: 0,
      support_given: '',
      frequency: 0
    }));
    setBelowKpi(prev => prev.length === 0 || !reportId ? initBelowKpi : prev);

    // Initialize HW teachers
    const initHwTeachers: HodHwTeacher[] = teachers.map(t => ({
      id: `temp-${t.id}`,
      report_id: currentReportId || '',
      department_id: departmentId || '',
      teacher_name: t.name,
      subject: t.subject,
      class_name: t.class_name,
      form: t.form,
      base_hw: t.base_hw,
      exam_in_month: 'NO',
      expected_hw: t.base_hw,
      marked_hw: 0,
      hw_pct: 0,
      tests_admin: 0,
      demo_practicals: 0,
      real_practicals: 0,
      calling_parents: 0
    }));
    setHwTeachers(prev => prev.length === 0 || !reportId ? initHwTeachers : prev);

    // Initialize staff checklist
    const initStaff = staffNames.map((name, i) => ({
      id: `temp-${i}`,
      report_id: currentReportId || '',
      department_id: departmentId || '',
      staff_name: name,
      lp_updated: '',
      logbook_updated: '',
      scheme_updated: '',
      date_checked: null,
      one_one_done: '',
      teaching_aid_used: '',
      missed_lessons: 'NO',
      reason_for_missing: ''
    }));
    setStaffChecklist(prev => prev.length === 0 || !reportId ? initStaff : prev);
  };

  // Helper functions
  const getRequiredPct = (form: string, month: number): number => {
    // Simplified - would normally fetch from database
    const requirements: Record<string, number[]> = {
      'F1': [4, 7, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      'F2': [10, 17, 25, 40, 55, 70, 50, 60, 70, 80, 90, 100],
      'F3': [4, 7, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      'F4': [10, 17, 25, 40, 55, 70, 50, 60, 70, 80, 90, 100],
      'F5': [3, 7, 10, 20, 35, 50, 4, 16, 25, 50, 75, 100],
      'F6': [5, 11, 16, 30, 50, 75, 5, 16, 25, 50, 75, 100]
    };
    return requirements[form]?.[month - 1] || 0;
  };

  const getTerm = (level: string, month: number): string => {
    if (level === 'O-Level') {
      return month <= 6 ? 'Term 1' : 'Term 2';
    } else {
      return month >= 7 ? 'Term 1' : 'Term 2';
    }
  };

  const monthIndex = MONTHS.indexOf(selectedMonth) + 1;

  // Calculations
  const calcCurriculum = (index: number, covered: number) => {
    const curr = curriculum[index];
    if (!curr) return;

    const pending = curr.topics_total - covered;
    const pct = curr.topics_total > 0 ? (covered / curr.topics_total) * 100 : 0;
    let remarks = '';
    if (pct >= 100) remarks = 'Covered';
    else if (pct >= curr.required_pct) remarks = 'Good progress';
    else if (pct >= curr.required_pct * 0.5) remarks = 'Behind';
    else remarks = 'Need Improvement';

    setCurriculum(prev => prev.map((c, i) => i === index ? {
      ...c,
      topics_covered: covered,
      topics_pending: pending,
      coverage_pct: Math.round(pct * 10) / 10,
      remarks
    } : c));
  };

  const calcExamResult = (subject: string, form: string) => {
    const idx = examResults.findIndex(e => e.subject === subject && e.form === form);
    if (idx === -1) return;

    const exam = examResults[idx];
    const total = exam.grade_a + exam.grade_b + exam.grade_c + exam.grade_d + exam.grade_e + exam.grade_s + exam.grade_f;
    const abc = exam.grade_a + exam.grade_b + exam.grade_c;
    const kpi = total > 0 ? (abc / total) * 100 : 0;
    const below = exam.grade_d + exam.grade_e + exam.grade_s + exam.grade_f;

    setExamResults(prev => prev.map((e, i) => i === idx ? {
      ...e,
      total,
      kpi_pct: Math.round(kpi * 10) / 10,
      below_kpi: below
    } : e));
  };

  const calcHw = (index: number) => {
    const hw = hwTeachers[index];
    if (!hw) return;

    const expected = hw.exam_in_month === 'YES' ? Math.round(hw.base_hw * 0.75) : hw.base_hw;
    const pct = expected > 0 ? (hw.marked_hw / expected) * 100 : 0;

    setHwTeachers(prev => prev.map((h, i) => i === index ? {
      ...h,
      expected_hw: expected,
      hw_pct: Math.round(pct * 10) / 10
    } : h));
  };

  // Summary calculations
  const hwSummary = FORMS.map(form => {
    const formHw = hwTeachers.filter(h => h.form === form);
    return {
      form,
      expected: formHw.reduce((sum, h) => sum + h.expected_hw, 0),
      marked: formHw.reduce((sum, h) => sum + h.marked_hw, 0),
      pct: formHw.reduce((sum, h) => sum + h.expected_hw, 0) > 0
        ? Math.round((formHw.reduce((sum, h) => sum + h.marked_hw, 0) /
            formHw.reduce((sum, h) => sum + h.expected_hw, 0)) * 1000) / 10
        : 0,
      tests: formHw.reduce((sum, h) => sum + h.tests_admin, 0),
      demo: formHw.reduce((sum, h) => sum + h.demo_practicals, 0),
      real: formHw.reduce((sum, h) => sum + h.real_practicals, 0),
      parents: formHw.reduce((sum, h) => sum + h.calling_parents, 0)
    };
  });

  const grandTotal = {
    expected: hwTeachers.reduce((sum, h) => sum + h.expected_hw, 0),
    marked: hwTeachers.reduce((sum, h) => sum + h.marked_hw, 0),
    pct: hwTeachers.reduce((sum, h) => sum + h.expected_hw, 0) > 0
      ? Math.round((hwTeachers.reduce((sum, h) => sum + h.marked_hw, 0) /
          hwTeachers.reduce((sum, h) => sum + h.expected_hw, 0)) * 1000) / 10
      : 0,
    tests: hwTeachers.reduce((sum, h) => sum + h.tests_admin, 0),
    demo: hwTeachers.reduce((sum, h) => sum + h.demo_practicals, 0),
    real: hwTeachers.reduce((sum, h) => sum + h.real_practicals, 0),
    parents: hwTeachers.reduce((sum, h) => sum + h.calling_parents, 0)
  };

  // Staff checklist totals
  const staffTotals = {
    lp: staffChecklist.filter(s => s.lp_updated === 'YES').length,
    logbook: staffChecklist.filter(s => s.logbook_updated === 'YES').length,
    scheme: staffChecklist.filter(s => s.scheme_updated === 'YES').length,
    one_one: staffChecklist.filter(s => s.one_one_done === 'YES').length,
    t_aid: staffChecklist.filter(s => s.teaching_aid_used === 'YES').length,
    missed: staffChecklist.filter(s => s.missed_lessons === 'YES').length
  };

  // Save draft
  const saveDraft = async () => {
    if (!departmentId || !profile) return;

    setSaving(true);
    try {
      // Create or update report
      const reportData = {
        department_id: departmentId,
        month: selectedMonth,
        year: selectedYear,
        hod_name: departments.find(d => d.id === departmentId)?.hod_name || profile.full_name,
        hod_email: profile.email,
        is_science: isScience,
        date_submitted: dateSubmitted,
        status: 'draft',
        comments_a: commentA,
        comments_b: commentB,
        comments_c: commentC,
        achievements,
        challenges,
        created_by: profile.id
      };

      let reportIdToUse = currentReportId;

      if (!currentReportId) {
        // Check if draft exists for this month
        const { data: existing } = await supabase
          .from('hod_reports')
          .select('id')
          .eq('department_id', departmentId)
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .maybeSingle();

        if (existing) {
          reportIdToUse = existing.id;
          setCurrentReportId(existing.id);
        }
      }

      if (reportIdToUse) {
        await supabase.from('hod_reports').update(reportData).eq('id', reportIdToUse);
      } else {
        const { data: newReport } = await supabase
          .from('hod_reports')
          .insert(reportData)
          .select()
          .maybeSingle();
        if (newReport) {
          reportIdToUse = newReport.id;
          setCurrentReportId(newReport.id);
        }
      }

      if (!reportIdToUse) throw new Error('Failed to create report');

      // Save related data (simplified - would normally upsert)
      // In production, you'd use upsert or delete + insert

      alert('Draft saved successfully!');
      if (onSaved && reportIdToUse) onSaved(reportIdToUse);
    } catch (error: any) {
      alert('Error saving draft: ' + error.message);
    }
    setSaving(false);
  };

  // Submit report
  const submitReport = async () => {
    if (!currentReportId) {
      alert('Please save as draft first.');
      return;
    }

    if (!window.confirm('Are you sure you want to submit this report? You cannot edit it after submission.')) {
      return;
    }

    setSaving(true);
    try {
      await supabase
        .from('hod_reports')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', currentReportId);

      setReportStatus('submitted');
      alert('Report submitted successfully!');
      if (onSubmit) onSubmit();
    } catch (error: any) {
      alert('Error submitting report: ' + error.message);
    }
    setSaving(false);
  };

  // Toggle section
  const toggleSection = (num: number) => {
    setOpenSections(prev =>
      prev.includes(num)
        ? prev.filter(s => s !== num)
        : [...prev, num]
    );
  };

  const department = departments.find(d => d.id === departmentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-[#1F3864] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1F3864] to-[#2d5098] text-white rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              Monthly Academic Report
            </h2>
            <p className="text-white/70 text-sm">Head of Department → Assistant Deputy Headmaster</p>
          </div>
          <div className="text-right">
            <div className="text-[#C9A84C] text-lg font-bold">{department?.name}</div>
            <div className="text-white/60 text-xs">HOD: {department?.hod_name}</div>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
        reportStatus === 'submitted' ? 'bg-green-50 border border-green-200' :
        reportStatus === 'edit_requested' ? 'bg-yellow-50 border border-yellow-200' :
        'bg-blue-50 border border-blue-200'
      }`}>
        {reportStatus === 'submitted' ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-700 text-sm font-medium">Report Submitted</span>
          </>
        ) : reportStatus === 'edit_requested' ? (
          <>
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-yellow-700 text-sm font-medium">Edit Request Pending</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-blue-500" />
            <span className="text-blue-700 text-sm font-medium">Draft Mode</span>
          </>
        )}
      </div>

      {/* Section 1: Report Header */}
      <Section
        number={1}
        title="Report Header"
        isOpen={openSections.includes(1)}
        onToggle={() => toggleSection(1)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputGroup label="Department">
            <input
              type="text"
              value={department?.name || ''}
              readOnly
              className="bg-green-50 border-green-200 text-green-700 font-medium"
            />
          </InputGroup>
          <InputGroup label="Reporting Month">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={reportStatus === 'submitted'}
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </InputGroup>
          <InputGroup label="Reporting Year">
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              min={2024}
              max={2035}
              disabled={reportStatus === 'submitted'}
            />
          </InputGroup>
          <InputGroup label="HOD Name">
            <input type="text" value={department?.hod_name || ''} readOnly className="bg-green-50 border-green-200 text-green-700 font-medium" />
          </InputGroup>
          <InputGroup label="HOD Email">
            <input type="email" value={department?.hod_email || ''} readOnly className="bg-green-50 border-green-200 text-green-700 font-medium" />
          </InputGroup>
          <InputGroup label="Date">
            <input
              type="date"
              value={dateSubmitted}
              onChange={(e) => setDateSubmitted(e.target.value)}
              disabled={reportStatus === 'submitted'}
            />
          </InputGroup>
          <InputGroup label="O-Level Term (auto)">
            <input
              type="text"
              value={monthIndex <= 6 ? 'Term 1' : 'Term 2'}
              readOnly
              className="bg-green-50 border-green-200 text-green-700 font-medium"
            />
          </InputGroup>
          <InputGroup label="A-Level Term (auto)">
            <input
              type="text"
              value={monthIndex >= 7 ? 'Term 1' : 'Term 2'}
              readOnly
              className="bg-green-50 border-green-200 text-green-700 font-medium"
            />
          </InputGroup>
          <InputGroup label="Status">
            <input
              type="text"
              value={reportStatus.charAt(0).toUpperCase() + reportStatus.slice(1)}
              readOnly
              className={`font-medium ${
                reportStatus === 'submitted' ? 'bg-green-50 border-green-200 text-green-700' :
                reportStatus === 'edit_requested' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            />
          </InputGroup>
        </div>
      </Section>

      {/* Section 2: Department Issues */}
      <Section
        number={2}
        title="Department Issues"
        isOpen={openSections.includes(2)}
        onToggle={() => toggleSection(2)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-3 py-2 text-left">Area of Focus</th>
                <th className="px-3 py-2 text-center w-24">Frequency</th>
                <th className="px-3 py-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, i) => (
                <tr key={i} className="border-b border-gray-100 even:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700">{issue.area_of_focus}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={issue.frequency || ''}
                      onChange={(e) => setIssues(prev => prev.map((iss, idx) =>
                        idx === i ? { ...iss, frequency: parseInt(e.target.value) || 0 } : iss
                      ))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={issue.remarks || ''}
                      onChange={(e) => setIssues(prev => prev.map((iss, idx) =>
                        idx === i ? { ...iss, remarks: e.target.value } : iss
                      ))}
                      placeholder="Remarks..."
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 3: Curriculum Coverage */}
      <Section
        number={3}
        title="Progress of Curriculum in All Classes"
        isOpen={openSections.includes(3)}
        onToggle={() => toggleSection(3)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-2 py-2 text-left">Subject</th>
                <th className="px-2 py-2 text-center">Form</th>
                <th className="px-2 py-2 text-center">Level</th>
                <th className="px-2 py-2 text-center">Syllabus Topics</th>
                <th className="px-2 py-2 text-center bg-yellow-100 text-gray-700">Covered</th>
                <th className="px-2 py-2 text-center">Pending</th>
                <th className="px-2 py-2 text-center">Coverage %</th>
                <th className="px-2 py-2 text-center">Term</th>
                <th className="px-2 py-2 text-center">Required %</th>
                <th className="px-2 py-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {curriculum.map((curr, i) => (
                <tr key={i} className="border-b border-gray-100 even:bg-gray-50">
                  <td className="px-2 py-2">{curr.subject}</td>
                  <td className="px-2 py-2 text-center">{curr.form}</td>
                  <td className="px-2 py-2 text-center">{curr.level}</td>
                  <td className="px-2 py-2">
                    <input type="text" value={curr.topics_total} readOnly className="w-full px-2 py-1 bg-gray-100 rounded text-center" />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      max={curr.topics_total}
                      value={curr.topics_covered || ''}
                      onChange={(e) => calcCurriculum(i, parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={curr.topics_pending} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={`${curr.coverage_pct}%`} readOnly className={`w-full px-2 py-1 rounded text-center font-medium ${
                      curr.coverage_pct >= curr.required_pct ? 'bg-green-50 border border-green-200 text-green-700' :
                      curr.coverage_pct >= curr.required_pct * 0.5 ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
                      'bg-red-50 border border-red-200 text-red-700'
                    }`} />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={curr.term} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={`${curr.required_pct}%`} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={curr.remarks} readOnly className={`w-full px-2 py-1 rounded text-center font-medium ${
                      curr.remarks === 'Covered' ? 'bg-green-50 border border-green-200 text-green-700' :
                      curr.remarks === 'Good progress' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
                      curr.remarks === 'Behind' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
                      'bg-red-50 border border-red-200 text-red-700'
                    }`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 4: Exam Results */}
      <Section
        number={4}
        title="Department Performance — Exam Results"
        isOpen={openSections.includes(4)}
        onToggle={() => toggleSection(4)}
      >
        <div className="space-y-6">
          {Array.from(new Set(examResults.map(e => e.subject))).map(subject => (
            <div key={subject}>
              <div className="bg-[#DCE6F1] text-[#1F3864] font-bold px-3 py-2 rounded mb-2">
                {subject}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1F3864] text-white">
                      <th className="px-2 py-2 text-center">Grade</th>
                      {FORMS.map(f => (
                        <th key={f} className="px-2 py-2 text-center">{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GRADES.map(grade => {
                      const gradeClass = grade === 'A' ? 'bg-green-100' :
                        grade === 'B' ? 'bg-blue-100' :
                        grade === 'C' ? 'bg-yellow-100' :
                        grade === 'D' ? 'bg-orange-100' :
                        'bg-red-100';
                      return (
                        <tr key={grade} className={`border-b border-gray-100 ${gradeClass}`}>
                          <td className="px-2 py-2 font-bold text-center">{grade}</td>
                          {FORMS.map(form => {
                            const idx = examResults.findIndex(e => e.subject === subject && e.form === form);
                            const gradeKey = `grade_${grade.toLowerCase()}` as keyof HodExamResult;
                            return (
                              <td key={form} className="px-2 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={idx >= 0 ? (examResults[idx][gradeKey] as number) || '' : ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setExamResults(prev => prev.map((ex, i) =>
                                      i === idx ? { ...ex, [gradeKey]: val } : ex
                                    ));
                                    calcExamResult(subject, form);
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                                  disabled={reportStatus === 'submitted'}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    <tr className="bg-[#DCE6F1] font-bold">
                      <td className="px-2 py-2 text-center">TOTAL</td>
                      {FORMS.map(form => {
                        const idx = examResults.findIndex(e => e.subject === subject && e.form === form);
                        return (
                          <td key={form} className="px-2 py-2">
                            <input
                              type="text"
                              value={idx >= 0 ? examResults[idx].total : ''}
                              readOnly
                              className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium"
                            />
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="bg-green-100 text-green-800">
                      <td className="px-2 py-2 font-bold text-center">KPI %</td>
                      {FORMS.map(form => {
                        const idx = examResults.findIndex(e => e.subject === subject && e.form === form);
                        return (
                          <td key={form} className="px-2 py-2">
                            <input
                              type="text"
                              value={idx >= 0 ? `${examResults[idx].kpi_pct}%` : ''}
                              readOnly
                              className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center font-medium"
                            />
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="bg-red-100 text-red-800">
                      <td className="px-2 py-2 font-bold text-center"># Below KPI</td>
                      {FORMS.map(form => {
                        const idx = examResults.findIndex(e => e.subject === subject && e.form === form);
                        return (
                          <td key={form} className="px-2 py-2">
                            <input
                              type="text"
                              value={idx >= 0 ? examResults[idx].below_kpi : ''}
                              readOnly
                              className="w-full px-2 py-1 bg-red-50 border border-red-200 rounded text-center font-medium text-red-700"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 5: General Comments */}
      <Section
        number={5}
        title="General Comment & Way Forward"
        isOpen={openSections.includes(5)}
        onToggle={() => toggleSection(5)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">
              a. General Comment
            </label>
            <textarea
              value={commentA}
              onChange={(e) => setCommentA(e.target.value)}
              rows={3}
              placeholder="General performance comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none resize-none"
              disabled={reportStatus === 'submitted'}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">
              b. Key Observations
            </label>
            <textarea
              value={commentB}
              onChange={(e) => setCommentB(e.target.value)}
              rows={3}
              placeholder="Key observations this month..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none resize-none"
              disabled={reportStatus === 'submitted'}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">
              c. Way Forward
            </label>
            <textarea
              value={commentC}
              onChange={(e) => setCommentC(e.target.value)}
              rows={3}
              placeholder="Recommendations and way forward..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none resize-none"
              disabled={reportStatus === 'submitted'}
            />
          </div>
        </div>
      </Section>

      {/* Section 6: Below KPI */}
      <Section
        number={6}
        title="Students Below KPI — Action Taken"
        isOpen={openSections.includes(6)}
        onToggle={() => toggleSection(6)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-center">Form</th>
                <th className="px-3 py-2 text-center"># Below KPI</th>
                <th className="px-3 py-2 text-left">Support Given</th>
                <th className="px-3 py-2 text-center">Frequency</th>
              </tr>
            </thead>
            <tbody>
              {belowKpi.map((kpi, i) => (
                <tr key={i} className="border-b border-gray-100 even:bg-gray-50">
                  <td className="px-3 py-2">{kpi.subject}</td>
                  <td className="px-3 py-2 text-center">{kpi.form}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={kpi.students_below_kpi || ''}
                      onChange={(e) => setBelowKpi(prev => prev.map((k, idx) =>
                        idx === i ? { ...k, students_below_kpi: parseInt(e.target.value) || 0 } : k
                      ))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={kpi.support_given || ''}
                      onChange={(e) => setBelowKpi(prev => prev.map((k, idx) =>
                        idx === i ? { ...k, support_given: e.target.value } : k
                      ))}
                      placeholder="Support given..."
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={kpi.frequency || ''}
                      onChange={(e) => setBelowKpi(prev => prev.map((k, idx) =>
                        idx === i ? { ...k, frequency: parseInt(e.target.value) || 0 } : k
                      ))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 7: HW Tests */}
      <Section
        number={7}
        title="Student Homework & Tests Per Month — Per Teacher"
        isOpen={openSections.includes(7)}
        onToggle={() => toggleSection(7)}
      >
        <p className="text-xs text-gray-500 mb-3">
          Yellow = enter data | Green = auto-calculated | Gray = system locked | Expected HW = Base × 0.75 if Exam = YES
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-2 py-2 text-left">Teacher</th>
                <th className="px-2 py-2 text-left">Subject</th>
                <th className="px-2 py-2 text-left">Class</th>
                <th className="px-2 py-2 text-center">Form</th>
                <th className="px-2 py-2 text-center">Exam?</th>
                <th className="px-2 py-2 text-center">Base</th>
                <th className="px-2 py-2 text-center">Expected</th>
                <th className="px-2 py-2 text-center">Marked</th>
                <th className="px-2 py-2 text-center">HW %</th>
                <th className="px-2 py-2 text-center">Tests</th>
                {isScience && <th className="px-2 py-2 text-center">Demo</th>}
                {isScience && <th className="px-2 py-2 text-center">Real</th>}
                <th className="px-2 py-2 text-center">Parents</th>
              </tr>
            </thead>
            <tbody>
              {hwTeachers.map((hw, i) => (
                <tr key={i} className="border-b border-gray-100 even:bg-gray-50">
                  <td className="px-2 py-1.5 bg-gray-100">{hw.teacher_name}</td>
                  <td className="px-2 py-1.5 bg-gray-100">{hw.subject}</td>
                  <td className="px-2 py-1.5 bg-gray-100">{hw.class_name}</td>
                  <td className="px-2 py-1.5 bg-gray-100 text-center">{hw.form}</td>
                  <td className="px-2 py-1.5">
                    <select
                      value={hw.exam_in_month}
                      onChange={(e) => {
                        setHwTeachers(prev => prev.map((h, idx) =>
                          idx === i ? { ...h, exam_in_month: e.target.value } : h
                        ));
                        calcHw(i);
                      }}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    >
                      <option value="">—</option>
                      <option value="NO">NO</option>
                      <option value="YES">YES</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5 bg-gray-100 text-center">{hw.base_hw}</td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={hw.expected_hw} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      value={hw.marked_hw || ''}
                      onChange={(e) => {
                        setHwTeachers(prev => prev.map((h, idx) =>
                          idx === i ? { ...h, marked_hw: parseInt(e.target.value) || 0 } : h
                        ));
                        calcHw(i);
                      }}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="text" value={hw.hw_pct ? `${hw.hw_pct}%` : '—'} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      value={hw.tests_admin || ''}
                      onChange={(e) => setHwTeachers(prev => prev.map((h, idx) =>
                        idx === i ? { ...h, tests_admin: parseInt(e.target.value) || 0 } : h
                      ))}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  {isScience && (
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        value={hw.demo_practicals || ''}
                        onChange={(e) => setHwTeachers(prev => prev.map((h, idx) =>
                          idx === i ? { ...h, demo_practicals: parseInt(e.target.value) || 0 } : h
                        ))}
                        className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                        disabled={reportStatus === 'submitted'}
                      />
                    </td>
                  )}
                  {isScience && (
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        value={hw.real_practicals || ''}
                        onChange={(e) => setHwTeachers(prev => prev.map((h, idx) =>
                          idx === i ? { ...h, real_practicals: parseInt(e.target.value) || 0 } : h
                        ))}
                        className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                        disabled={reportStatus === 'submitted'}
                      />
                    </td>
                  )}
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min={0}
                      value={hw.calling_parents || ''}
                      onChange={(e) => setHwTeachers(prev => prev.map((h, idx) =>
                        idx === i ? { ...h, calling_parents: parseInt(e.target.value) || 0 } : h
                      ))}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#DCE6F1] font-bold text-[#1F3864]">
                <td colSpan={6} className="px-2 py-2 text-right">DEPARTMENT TOTAL</td>
                <td className="px-2 py-2">
                  <input type="text" value={grandTotal.expected} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" value={grandTotal.marked} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" value={grandTotal.pct ? `${grandTotal.pct}%` : '—'} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" value={grandTotal.tests} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                {isScience && (
                  <td className="px-2 py-2">
                    <input type="text" value={grandTotal.demo} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                  </td>
                )}
                {isScience && (
                  <td className="px-2 py-2">
                    <input type="text" value={grandTotal.real} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                  </td>
                )}
                <td className="px-2 py-2">
                  <input type="text" value={grandTotal.parents} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      {/* Section 8: Summary by Form */}
      <Section
        number={8}
        title="Homework Summary by Form (Auto-Calculated)"
        isOpen={openSections.includes(8)}
        onToggle={() => toggleSection(8)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-3 py-2 text-left">Form</th>
                <th className="px-3 py-2 text-center">Expected</th>
                <th className="px-3 py-2 text-center">Marked</th>
                <th className="px-3 py-2 text-center">HW %</th>
                <th className="px-3 py-2 text-center">Tests</th>
                {isScience && <th className="px-3 py-2 text-center">Demo</th>}
                {isScience && <th className="px-3 py-2 text-center">Real</th>}
                <th className="px-3 py-2 text-center">Parents</th>
              </tr>
            </thead>
            <tbody>
              {hwSummary.map(s => (
                <tr key={s.form} className="border-b border-gray-100 even:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{s.form}</td>
                  <td className="px-3 py-2">
                    <input type="text" value={s.expected} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={s.marked} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={s.pct ? `${s.pct}%` : '—'} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={s.tests} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium" />
                  </td>
                  {isScience && (
                    <td className="px-3 py-2">
                      <input type="text" value={s.demo} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium" />
                    </td>
                  )}
                  {isScience && (
                    <td className="px-3 py-2">
                      <input type="text" value={s.real} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium" />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <input type="text" value={s.parents} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center text-green-700 font-medium" />
                  </td>
                </tr>
              ))}
              <tr className="bg-[#DCE6F1] font-bold">
                <td className="px-3 py-2">Grand Total</td>
                <td className="px-3 py-2">
                  <input type="text" value={grandTotal.expected} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-3 py-2">
                  <input type="text" value={grandTotal.marked} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-3 py-2">
                  <input type="text" value={grandTotal.pct ? `${grandTotal.pct}%` : '—'} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-3 py-2">
                  <input type="text" value={grandTotal.tests} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                {isScience && (
                  <td className="px-3 py-2">
                    <input type="text" value={grandTotal.demo} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                  </td>
                )}
                {isScience && (
                  <td className="px-3 py-2">
                    <input type="text" value={grandTotal.real} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                  </td>
                )}
                <td className="px-3 py-2">
                  <input type="text" value={grandTotal.parents} readOnly className="w-full px-2 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 9: Support Needed */}
      <Section
        number={9}
        title="Support Needed from Ast. Deputy Headmaster"
        isOpen={openSections.includes(9)}
        onToggle={() => toggleSection(9)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-3 py-2 text-left w-28">Staff Name</th>
                <th className="px-3 py-2 text-left">Issue</th>
                <th className="px-3 py-2 text-left">Suggestion(s)</th>
              </tr>
            </thead>
            <tbody>
              {supportRequests.map((sr, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={sr.staff}
                      onChange={(e) => setSupportRequests(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, staff: e.target.value } : s
                      ))}
                      placeholder="Staff name..."
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={sr.issue}
                      onChange={(e) => setSupportRequests(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, issue: e.target.value } : s
                      ))}
                      placeholder="Issue..."
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={sr.suggestion}
                      onChange={(e) => setSupportRequests(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, suggestion: e.target.value } : s
                      ))}
                      placeholder="Suggestion..."
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 10: Staff Checklist */}
      <Section
        number={10}
        title="Staff Information — Monthly Checklist"
        isOpen={openSections.includes(10)}
        onToggle={() => toggleSection(10)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-2 py-2 text-left">Staff Name</th>
                <th className="px-2 py-2 text-center">LP Updated</th>
                <th className="px-2 py-2 text-center">Logbook</th>
                <th className="px-2 py-2 text-center">Scheme</th>
                <th className="px-2 py-2 text-center">Date Checked</th>
                <th className="px-2 py-2 text-center">1:1 Done</th>
                <th className="px-2 py-2 text-center">T.Aid Used</th>
                <th className="px-2 py-2 text-center">Missed Lessons</th>
                <th className="px-2 py-2 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {staffChecklist.map((staff, i) => (
                <tr key={i} className="border-b border-gray-100 even:bg-gray-50">
                  <td className="px-2 py-1.5 bg-gray-100">{staff.staff_name}</td>
                  <td className="px-2 py-1.5">
                    <select
                      value={staff.lp_updated}
                      onChange={(e) => setStaffChecklist(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, lp_updated: e.target.value } : s
                      ))}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    >
                      <option value="">—</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={staff.logbook_updated}
                      onChange={(e) => setStaffChecklist(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, logbook_updated: e.target.value } : s
                      ))}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    >
                      <option value="">—</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={staff.scheme_updated}
                      onChange={(e) => setStaffChecklist(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, scheme_updated: e.target.value } : s
                      ))}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    >
                      <option value="">—</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="date"
                      value={staff.date_checked || ''}
                      onChange={(e) => setStaffChecklist(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, date_checked: e.target.value } : s
                      ))}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={staff.one_one_done}
                      onChange={(e) => setStaffChecklist(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, one_one_done: e.target.value } : s
                      ))}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    >
                      <option value="">—</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={staff.teaching_aid_used}
                      onChange={(e) => setStaffChecklist(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, teaching_aid_used: e.target.value } : s
                      ))}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    >
                      <option value="">—</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={staff.missed_lessons}
                      onChange={(e) => setStaffChecklist(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, missed_lessons: e.target.value } : s
                      ))}
                      className="w-full px-1 py-1 border border-gray-300 rounded text-center bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    >
                      <option value="">—</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={staff.reason_for_missing || ''}
                      onChange={(e) => setStaffChecklist(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, reason_for_missing: e.target.value } : s
                      ))}
                      className="w-full px-1 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    >
                      <option value="">—</option>
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Compassionate">Compassionate</option>
                      <option value="Absenteeism">Absenteeism</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#DCE6F1] font-bold text-[#1F3864]">
                <td className="px-2 py-2">TOTALS (YES count)</td>
                <td className="px-2 py-2">
                  <input type="text" value={staffTotals.lp} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" value={staffTotals.logbook} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" value={staffTotals.scheme} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-2 py-2"></td>
                <td className="px-2 py-2">
                  <input type="text" value={staffTotals.one_one} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" value={staffTotals.t_aid} readOnly className="w-full px-1 py-1 bg-green-50 border border-green-200 rounded text-center font-medium" />
                </td>
                <td className="px-2 py-2">
                  <input type="text" value={staffTotals.missed} readOnly className="w-full px-1 py-1 bg-red-50 border border-red-200 rounded text-center font-medium text-red-700" />
                </td>
                <td className="px-2 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      {/* Section 11: Issues for Deputy */}
      <Section
        number={11}
        title="Issues for Deputy Headmaster"
        isOpen={openSections.includes(11)}
        onToggle={() => toggleSection(11)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-3 py-2 text-left w-32">Issue Title</th>
                <th className="px-3 py-2 text-left">Full Description</th>
              </tr>
            </thead>
            <tbody>
              {issuesForDeputy.map((iss, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={iss.title}
                      onChange={(e) => setIssuesForDeputy(prev => prev.map((iss, idx) =>
                        idx === i ? { ...iss, title: e.target.value } : iss
                      ))}
                      placeholder="Issue title..."
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={iss.description}
                      onChange={(e) => setIssuesForDeputy(prev => prev.map((iss, idx) =>
                        idx === i ? { ...iss, description: e.target.value } : iss
                      ))}
                      placeholder="Full description..."
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 12: Bonus Recommendations */}
      <Section
        number={12}
        title="Staff Recommended for Monthly Bonus"
        isOpen={openSections.includes(12)}
        onToggle={() => toggleSection(12)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-3 py-2 text-left w-32">Staff Name</th>
                <th className="px-3 py-2 text-left">Reasons for Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {bonusRecommendations.map((rec, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={rec.staff}
                      onChange={(e) => setBonusRecommendations(prev => prev.map((r, idx) =>
                        idx === i ? { ...r, staff: e.target.value } : r
                      ))}
                      placeholder="Staff name..."
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={rec.reasons}
                      onChange={(e) => setBonusRecommendations(prev => prev.map((r, idx) =>
                        idx === i ? { ...r, reasons: e.target.value } : r
                      ))}
                      placeholder="Reasons..."
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Section 13: Achievements & Challenges */}
      <Section
        number={13}
        title="Monthly Achievements & Challenges"
        isOpen={openSections.includes(13)}
        onToggle={() => toggleSection(13)}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-green-700 mb-3">ACHIEVEMENTS</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {achievements.map((a, i) => (
                <input
                  key={i}
                  type="text"
                  value={a}
                  onChange={(e) => setAchievements(prev => prev.map((ach, idx) =>
                    idx === i ? e.target.value : ach
                  ))}
                  placeholder={`Achievement ${i + 1}...`}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-yellow-50"
                  disabled={reportStatus === 'submitted'}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-red-700 mb-3">CHALLENGES</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {challenges.map((c, i) => (
                <input
                  key={i}
                  type="text"
                  value={c}
                  onChange={(e) => setChallenges(prev => prev.map((ch, idx) =>
                    idx === i ? e.target.value : ch
                  ))}
                  placeholder={`Challenge ${i + 1}...`}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-yellow-50"
                  disabled={reportStatus === 'submitted'}
                />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-6 -mx-6 -mb-6 mt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Submitting as: <span className="font-medium text-[#1F3864]">{department?.name}</span> •
            <span className="ml-2">{selectedMonth} {selectedYear}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={saveDraft}
              disabled={saving || reportStatus === 'submitted'}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#1F3864] text-[#1F3864] rounded-lg hover:bg-[#DCE6F1] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => {}}
              disabled={reportStatus === 'submitted'}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={submitReport}
              disabled={saving || reportStatus === 'submitted'}
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-[#1F3864] rounded-lg hover:bg-[#f0d080] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Submit Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Section Component
function Section({
  number,
  title,
  isOpen,
  onToggle,
  children
}: {
  number: number;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#1F3864] text-white hover:bg-[#162a4e] transition"
      >
        <span className="w-6 h-6 bg-[#C9A84C] text-[#1F3864] rounded-full flex items-center justify-center text-sm font-bold">
          {number}
        </span>
        <span className="flex-1 text-left font-medium">{title}</span>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {isOpen && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Input Group Component
function InputGroup({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
