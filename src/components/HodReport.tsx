import { useState, useEffect, useCallback, useRef } from 'react';
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

// Helper to get filtered issue areas based on department type
function getFilteredIssueAreas(isScience: boolean): string[] {
  if (isScience) return ISSUE_AREAS;
  return ISSUE_AREAS.filter(
    area => area !== 'Demo Practicals done per Month' && area !== 'Real Practicals done per Month'
  );
}

export function HodReportForm({ reportId, onSaved, onSubmit }: HodReportFormProps) {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateSubmitted, setDateSubmitted] = useState(new Date().toISOString().split('T')[0]);

  const [issues, setIssues] = useState<HodIssue[]>(() => {
    const filtered = getFilteredIssueAreas(false);
    return filtered.map((area, i) => ({
      id: `temp-issue-${i}`,
      report_id: '',
      department_id: '',
      area_of_focus: area,
      frequency: 0,
      remarks: ''
    }));
  });
  const [curriculum, setCurriculum] = useState<HodCurriculum[]>([]);
  const [examResults, setExamResults] = useState<HodExamResult[]>([]);
  const [belowKpi, setBelowKpi] = useState<HodBelowKpi[]>([]);
  const [hwTeachers, setHwTeachers] = useState<HodHwTeacher[]>([]);
  const [staffChecklist, setStaffChecklist] = useState<HodStaffChecklist[]>([]);

  const [commentA, setCommentA] = useState('');
  const [commentB, setCommentB] = useState('');
  const [commentC, setCommentC] = useState('');
  const [achievements, setAchievements] = useState<string[]>(['', '', '']);
  const [challenges, setChallenges] = useState<string[]>(['', '', '']);

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

  const [reportStatus, setReportStatus] = useState<'draft' | 'submitted' | 'edit_requested'>('draft');
  const [currentReportId, setCurrentReportId] = useState<string | null>(reportId || null);
  const [openSections, setOpenSections] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);

  const departmentId = profile?.department_id;
  const department = departments.find(d => d.id === departmentId);
  const isScience = department?.is_science || false;
  const hodName = profile?.full_name || '';
  const hodEmail = profile?.email || '';

  const getDraftKey = useCallback(() => {
    if (!profile?.id || !departmentId) return null;
    return `hod_draft_${profile.id}_${departmentId}_${selectedMonth}_${selectedYear}`;
  }, [profile?.id, departmentId, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!supabase) return;
    loadDepartments();
  }, []);

  useEffect(() => {
    if (!supabase || !departmentId) return;
    loadTeachers();
    loadSubjects();
    if (reportId) {
      loadReport(reportId);
    }
  }, [departmentId]);

  useEffect(() => {
    if (teachers.length > 0 || subjects.length > 0) {
      initializeSections();
      setDataLoaded(true);
    }
  }, [teachers, subjects, selectedMonth]);

  useEffect(() => {
    if (departmentId) {
      const filtered = getFilteredIssueAreas(isScience);
      setIssues(prev => {
        if (prev.length > 0 && prev[0].report_id) {
          if (!isScience) {
            return prev.filter(
              iss => iss.area_of_focus !== 'Demo Practicals done per Month' &&
                     iss.area_of_focus !== 'Real Practicals done per Month'
            ).map(issue => ({ ...issue, department_id: departmentId }));
          }
          return prev.map(issue => ({ ...issue, department_id: departmentId }));
        }
        return filtered.map((area, i) => ({
          id: `temp-issue-${i}`,
          report_id: '',
          department_id: departmentId,
          area_of_focus: area,
          frequency: 0,
          remarks: ''
        }));
      });
    }
  }, [departmentId, isScience]);

  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reportId || reportStatus === 'submitted' || !dataLoaded) return;
    const draftKey = getDraftKey();
    if (!draftKey) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      const draftData = {
        selectedMonth,
        selectedYear,
        dateSubmitted,
        issues,
        curriculum,
        examResults,
        belowKpi,
        hwTeachers,
        staffChecklist,
        commentA,
        commentB,
        commentC,
        achievements,
        challenges,
        supportRequests,
        issuesForDeputy,
        bonusRecommendations,
        currentReportId,
        savedAt: new Date().toISOString()
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draftData));
      } catch (e) {
        console.error('Failed to auto-save draft:', e);
      }
    }, 3000);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [
    selectedMonth, selectedYear, dateSubmitted, issues, curriculum, examResults,
    belowKpi, hwTeachers, staffChecklist, commentA, commentB, commentC,
    achievements, challenges, supportRequests, issuesForDeputy, bonusRecommendations,
    currentReportId, reportId, reportStatus, dataLoaded, getDraftKey
  ]);

  useEffect(() => {
    if (reportId || !departmentId || !dataLoaded) return;
    const draftKey = getDraftKey();
    if (!draftKey) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draftData = JSON.parse(saved);
        if (draftData.selectedMonth === selectedMonth && draftData.selectedYear === selectedYear) {
          if (window.confirm('A saved draft was found for this month. Would you like to restore it?')) {
            if (draftData.dateSubmitted) setDateSubmitted(draftData.dateSubmitted);
            if (draftData.issues) setIssues(draftData.issues);
            if (draftData.curriculum) setCurriculum(draftData.curriculum);
            if (draftData.examResults) setExamResults(draftData.examResults);
            if (draftData.belowKpi) setBelowKpi(draftData.belowKpi);
            if (draftData.hwTeachers) setHwTeachers(draftData.hwTeachers);
            if (draftData.staffChecklist) setStaffChecklist(draftData.staffChecklist);
            if (draftData.commentA !== undefined) setCommentA(draftData.commentA);
            if (draftData.commentB !== undefined) setCommentB(draftData.commentB);
            if (draftData.commentC !== undefined) setCommentC(draftData.commentC);
            if (draftData.achievements) setAchievements(draftData.achievements);
            if (draftData.challenges) setChallenges(draftData.challenges);
            if (draftData.supportRequests) setSupportRequests(draftData.supportRequests);
            if (draftData.issuesForDeputy) setIssuesForDeputy(draftData.issuesForDeputy);
            if (draftData.bonusRecommendations) setBonusRecommendations(draftData.bonusRecommendations);
            if (draftData.currentReportId) setCurrentReportId(draftData.currentReportId);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, dataLoaded, reportId]);

  const loadDepartments = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('departments').select('*');
    if (error) {
      console.error('Error loading departments:', error);
    } else if (data) {
      setDepartments(data);
    }
  };

  const loadTeachers = async () => {
    if (!supabase || !departmentId) return;
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('department_id', departmentId)
      .order('name');
    if (error) {
      console.error('Error loading teachers:', error);
    } else if (data) {
      setTeachers(data);
      const names = [...new Set(data.map(t => t.name))];
      setStaffNames(names);
    }
  };

  const loadSubjects = async () => {
    if (!supabase || !departmentId) return;
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('department_id', departmentId)
      .order('subject_name, form');
    if (error) {
      console.error('Error loading subjects:', error);
    } else if (data) {
      setSubjects(data);
    }
  };

  const loadReport = async (id: string) => {
    setLoading(true);
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
      const [issuesData, currData, examData, kpiData, hwData, staffData] = await Promise.all([
        supabase.from('hod_issues').select('*').eq('report_id', id),
        supabase.from('hod_curriculum').select('*').eq('report_id', id),
        supabase.from('hod_exam_results').select('*').eq('report_id', id),
        supabase.from('hod_below_kpi').select('*').eq('report_id', id),
        supabase.from('hod_hw_teachers').select('*').eq('report_id', id),
        supabase.from('hod_staff_checklist').select('*').eq('report_id', id)
      ]);
      if (issuesData.data) {
        let loadedIssues = issuesData.data;
        if (!isScience) {
          loadedIssues = loadedIssues.filter(
            (iss: HodIssue) => iss.area_of_focus !== 'Demo Practicals done per Month' &&
                               iss.area_of_focus !== 'Real Practicals done per Month'
          );
        }
        setIssues(loadedIssues);
      }
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
    const filteredAreas = getFilteredIssueAreas(isScience);
    const initIssues: HodIssue[] = filteredAreas.map((area, i) => ({
      id: `temp-${i}`,
      report_id: currentReportId || '',
      department_id: departmentId || '',
      area_of_focus: area,
      frequency: 0,
      remarks: ''
    }));
    setIssues(!reportId ? initIssues : prev => prev);
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
    setCurriculum(!reportId ? initCurriculum : prev => prev);
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
    setExamResults(!reportId ? initExams : prev => prev);
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
    setBelowKpi(!reportId ? initBelowKpi : prev => prev);
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
    setHwTeachers(!reportId ? initHwTeachers : prev => prev);
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
    setStaffChecklist(!reportId ? initStaff : prev => prev);
  };

  const getRequiredPct = (form: string, month: number): number => {
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

  const staffTotals = {
    lp: staffChecklist.filter(s => s.lp_updated === 'YES').length,
    logbook: staffChecklist.filter(s => s.logbook_updated === 'YES').length,
    scheme: staffChecklist.filter(s => s.scheme_updated === 'YES').length,
    one_one: staffChecklist.filter(s => s.one_one_done === 'YES').length,
    t_aid: staffChecklist.filter(s => s.teaching_aid_used === 'YES').length,
    missed: staffChecklist.filter(s => s.missed_lessons === 'YES').length
  };

  const saveDraft = async () => {
    if (!departmentId || !profile) return;
    setSaving(true);
    try {
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
        const { error: updateError } = await supabase.from('hod_reports').update(reportData).eq('id', reportIdToUse);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { data: newReport, error: insertError } = await supabase
          .from('hod_reports')
          .insert(reportData)
          .select()
          .maybeSingle();
        if (insertError) throw new Error(insertError.message);
        if (newReport) {
          reportIdToUse = newReport.id;
          setCurrentReportId(newReport.id);
        }
      }
      if (!reportIdToUse) throw new Error('Failed to create report');
      await Promise.all([
        supabase.from('hod_issues').delete().eq('report_id', reportIdToUse),
        supabase.from('hod_curriculum').delete().eq('report_id', reportIdToUse),
        supabase.from('hod_exam_results').delete().eq('report_id', reportIdToUse),
        supabase.from('hod_below_kpi').delete().eq('report_id', reportIdToUse),
        supabase.from('hod_hw_teachers').delete().eq('report_id', reportIdToUse),
        supabase.from('hod_staff_checklist').delete().eq('report_id', reportIdToUse),
        supabase.from('hod_support_requests').delete().eq('report_id', reportIdToUse),
        supabase.from('hod_issues_for_deputy').delete().eq('report_id', reportIdToUse),
        supabase.from('hod_bonus_recommendations').delete().eq('report_id', reportIdToUse),
      ]);
      const issuesToInsert = issues.map(iss => ({
        report_id: reportIdToUse,
        department_id: departmentId,
        month: selectedMonth,
        year: selectedYear,
        area_of_focus: iss.area_of_focus,
        frequency: iss.frequency || 0,
        remarks: iss.remarks || null
      }));
      const curriculumToInsert = curriculum.map(c => ({
        report_id: reportIdToUse,
        department_id: departmentId,
        subject: c.subject,
        form: c.form,
        level: c.level,
        topics_total: c.topics_total,
        topics_covered: c.topics_covered || 0,
        topics_pending: c.topics_pending || 0,
        coverage_pct: c.coverage_pct || 0,
        term: c.term || null,
        required_pct: c.required_pct || 0,
        remarks: c.remarks || null
      }));
      const examsToInsert = examResults.map(e => ({
        report_id: reportIdToUse,
        department_id: departmentId,
        subject: e.subject,
        form: e.form,
        grade_a: e.grade_a || 0,
        grade_b: e.grade_b || 0,
        grade_c: e.grade_c || 0,
        grade_d: e.grade_d || 0,
        grade_e: e.grade_e || 0,
        grade_s: e.grade_s || 0,
        grade_f: e.grade_f || 0,
        total: e.total || 0,
        kpi_pct: e.kpi_pct || 0,
        below_kpi: e.below_kpi || 0
      }));
      const belowKpiToInsert = belowKpi.map(k => ({
        report_id: reportIdToUse,
        department_id: departmentId,
        subject: k.subject,
        form: k.form,
        students_below_kpi: k.students_below_kpi || 0,
        support_given: k.support_given || null,
        frequency: k.frequency || 0
      }));
      const hwToInsert = hwTeachers.map(h => ({
        report_id: reportIdToUse,
        department_id: departmentId,
        teacher_name: h.teacher_name,
        subject: h.subject,
        class_name: h.class_name,
        form: h.form,
        base_hw: h.base_hw || 4,
        exam_in_month: h.exam_in_month || 'NO',
        expected_hw: h.expected_hw || 0,
        marked_hw: h.marked_hw || 0,
        hw_pct: h.hw_pct || 0,
        tests_admin: h.tests_admin || 0,
        demo_practicals: h.demo_practicals || 0,
        real_practicals: h.real_practicals || 0,
        calling_parents: h.calling_parents || 0
      }));
      const staffToInsert = staffChecklist.map(s => ({
        report_id: reportIdToUse,
        department_id: departmentId,
        staff_name: s.staff_name,
        lp_updated: s.lp_updated || '',
        logbook_updated: s.logbook_updated || '',
        scheme_updated: s.scheme_updated || '',
        date_checked: s.date_checked || null,
        one_one_done: s.one_one_done || '',
        teaching_aid_used: s.teaching_aid_used || '',
        missed_lessons: s.missed_lessons || 'NO',
        reason_for_missing: s.reason_for_missing || null
      }));
      const supportToInsert = supportRequests
        .filter(sr => sr.staff || sr.issue || sr.suggestion)
        .map(sr => ({
          report_id: reportIdToUse,
          department_id: departmentId,
          staff_name: sr.staff || null,
          issue: sr.issue || null,
          suggestion: sr.suggestion || null
        }));
      const deputyToInsert = issuesForDeputy
        .filter(iss => iss.title || iss.description)
        .map(iss => ({
          report_id: reportIdToUse,
          department_id: departmentId,
          title: iss.title || null,
          description: iss.description || null
        }));
      const bonusToInsert = bonusRecommendations
        .filter(rec => rec.staff || rec.reasons)
        .map(rec => ({
          report_id: reportIdToUse,
          department_id: departmentId,
          staff_name: rec.staff || null,
          reasons: rec.reasons || null
        }));
      const insertPromises: Promise<any>[] = [];
      if (issuesToInsert.length) insertPromises.push(supabase.from('hod_issues').insert(issuesToInsert));
      if (curriculumToInsert.length) insertPromises.push(supabase.from('hod_curriculum').insert(curriculumToInsert));
      if (examsToInsert.length) insertPromises.push(supabase.from('hod_exam_results').insert(examsToInsert));
      if (belowKpiToInsert.length) insertPromises.push(supabase.from('hod_below_kpi').insert(belowKpiToInsert));
      if (hwToInsert.length) insertPromises.push(supabase.from('hod_hw_teachers').insert(hwToInsert));
      if (staffToInsert.length) insertPromises.push(supabase.from('hod_staff_checklist').insert(staffToInsert));
      if (supportToInsert.length) insertPromises.push(supabase.from('hod_support_requests').insert(supportToInsert));
      if (deputyToInsert.length) insertPromises.push(supabase.from('hod_issues_for_deputy').insert(deputyToInsert));
      if (bonusToInsert.length) insertPromises.push(supabase.from('hod_bonus_recommendations').insert(bonusToInsert));
      const insertResults = await Promise.all(insertPromises);
      const insertErrors = insertResults.filter(r => r.error);
      if (insertErrors.length > 0) {
        console.error('Errors saving child data:', insertErrors);
        throw new Error('Failed to save some report sections: ' + insertErrors.map((e: any) => e.error.message).join('; '));
      }
      const draftKey = getDraftKey();
      if (draftKey) {
        try { localStorage.removeItem(draftKey); } catch (e) { console.error('Failed to clear local draft:', e); }
      }
      alert('Draft saved successfully!');
      if (onSaved && reportIdToUse) onSaved(reportIdToUse);
    } catch (error: any) {
      alert('Error saving draft: ' + error.message);
    }
    setSaving(false);
  };

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
      const { error: submitError } = await supabase
        .from('hod_reports')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', currentReportId);
      if (submitError) throw new Error(submitError.message);
      setReportStatus('submitted');
      const draftKey = getDraftKey();
      if (draftKey) {
        try { localStorage.removeItem(draftKey); } catch (e) { console.error('Failed to clear local draft:', e); }
      }
      alert('Report submitted successfully!');
      if (onSubmit) onSubmit();
    } catch (error: any) {
      alert('Error submitting report: ' + error.message);
    }
    setSaving(false);
  };

  const toggleSection = (num: number) => {
    setOpenSections(prev =>
      prev.includes(num)
        ? prev.filter(s => s !== num)
        : [...prev, num]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-[#1F3864] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!departmentId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-yellow-800 mb-2">Department Not Assigned</h3>
        <p className="text-yellow-700 mb-4">
          Your account is not linked to a department. Please contact the administrator to assign you to a department.
        </p>
        <p className="text-sm text-yellow-600">
          Available departments: Physics, ABC, Math & Tech, Business, Humanities, Languages, Vocational
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-[#1F3864] to-[#2d5098] text-white rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              Monthly Academic Report
            </h2>
            <p className="text-white/70 text-sm">Head of Department → Assistant Deputy Headmaster</p>
          </div>
          <div className="text-right">
            <div className="text-[#C9A84C] text-lg font-bold">{department?.name || 'Select Department'}</div>
            <div className="text-white/60 text-xs">HOD: {hodName || 'Not Set'}</div>
          </div>
        </div>
      </div>

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
            <span className="text-blue-700 text-sm font-medium">Draft Mode — Auto-saves locally every 3 seconds</span>
          </>
        )}
      </div>

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
              value={department?.name || 'Not Assigned'}
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
            <input type="text" value={hodName || 'Not Set'} readOnly className="bg-green-50 border-green-200 text-green-700 font-medium" />
          </InputGroup>
          <InputGroup label="HOD Email">
            <input type="email" value={hodEmail || 'Not Set'} readOnly className="bg-green-50 border-green-200 text-green-700 font-medium" />
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
                reportStatus === 'edit_requested' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
                'bg-blue-50 border border-blue-200 text-blue-700'
              }`}
            />
          </InputGroup>
        </div>
      </Section>

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
                      step="0.01"
                      min={0}
                      value={issue.frequency || ''}
                      onChange={(e) => setIssues(prev => prev.map((iss, idx) =>
                        idx === i ? { ...iss, frequency: parseFloat(e.target.value) || 0 } : iss
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
                      step="0.01"
                      min={0}
                      max={curr.topics_total}
                      value={curr.topics_covered || ''}
                      onChange={(e) => calcCurriculum(i, parseFloat(e.target.value) || 0)}
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
                                  step="0.01"
                                  min={0}
                                  value={idx >= 0 ? (examResults[idx][gradeKey] as number) || '' : ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
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
                      step="0.01"
                      min={0}
                      value={kpi.students_below_kpi || ''}
                      onChange={(e) => setBelowKpi(prev => prev.map((k, idx) =>
                        idx === i ? { ...k, students_below_kpi: parseFloat(e.target.value) || 0 } : k
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
                      step="0.01"
                      min={0}
                      value={kpi.frequency || ''}
                      onChange={(e) => setBelowKpi(prev => prev.map((k, idx) =>
                        idx === i ? { ...k, frequency: parseFloat(e.target.value) || 0 } : k
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

      <Section
        number={9}
        title="Staff Checklist"
        isOpen={openSections.includes(9)}
        onToggle={() => toggleSection(9)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-2 py-2 text-left">Staff Name</th>
                <th className="px-2 py-2 text-center">LP Updated</th>
                <th className="px-2 py-2 text-center">Logbook</th>
                <th className="px-2 py-2 text-center">Scheme</th>
                <th className="px-2 py-2 text-center">Date Checked</th>
                <th className="px-2 py-2 text-center">1-on-1</th>
                <th className="px-2 py-2 text-center">T. Aid</th>
                <th className="px-2 py-2 text-center">Missed?</th>
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
                        idx === i ? { ...s, date_checked: e.target.value || null } : s
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
                      <option value="NO">NO</option>
                      <option value="YES">YES</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={staff.reason_for_missing || ''}
                      onChange={(e) => setStaffChecklist(prev => prev.map((s, idx) =>
                        idx === i ? { ...s, reason_for_missing: e.target.value } : s
                      ))}
                      placeholder="Reason..."
                      className="w-full px-1 py-1 border border-gray-300 rounded bg-yellow-50"
                      disabled={reportStatus === 'submitted'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#DCE6F1] font-bold text-[#1F3864]">
                <td className="px-2 py-2">TOTALS</td>
                <td className="px-2 py-2 text-center">{staffTotals.lp}</td>
                <td className="px-2 py-2 text-center">{staffTotals.logbook}</td>
                <td className="px-2 py-2 text-center">{staffTotals.scheme}</td>
                <td className="px-2 py-2"></td>
                <td className="px-2 py-2 text-center">{staffTotals.one_one}</td>
                <td className="px-2 py-2 text-center">{staffTotals.t_aid}</td>
                <td className="px-2 py-2 text-center text-red-600">{staffTotals.missed}</td>
                <td className="px-2 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      <Section
        number={10}
        title="Department Achievements"
        isOpen={openSections.includes(10)}
        onToggle={() => toggleSection(10)}
      >
        <div className="space-y-3">
          {achievements.map((ach, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-[#1F3864] font-bold mt-2">{i + 1}.</span>
              <textarea
                value={ach}
                onChange={(e) => setAchievements(prev => prev.map((a, idx) =>
                  idx === i ? e.target.value : a
                ))}
                rows={2}
                placeholder={`Achievement ${i + 1}...`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none resize-none"
                disabled={reportStatus === 'submitted'}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        number={11}
        title="Department Challenges"
        isOpen={openSections.includes(11)}
        onToggle={() => toggleSection(11)}
      >
        <div className="space-y-3">
          {challenges.map((chal, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-[#1F3864] font-bold mt-2">{i + 1}.</span>
              <textarea
                value={chal}
                onChange={(e) => setChallenges(prev => prev.map((c, idx) =>
                  idx === i ? e.target.value : c
                ))}
                rows={2}
                placeholder={`Challenge ${i + 1}...`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none resize-none"
                disabled={reportStatus === 'submitted'}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        number={12}
        title="Support Requests from Staff"
        isOpen={openSections.includes(12)}
        onToggle={() => toggleSection(12)}
      >
        <div className="space-y-4">
          {supportRequests.map((req, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-[#1F3864] mb-1">Staff Name</label>
                <input
                  type="text"
                  value={req.staff}
                  onChange={(e) => setSupportRequests(prev => prev.map((r, idx) =>
                    idx === i ? { ...r, staff: e.target.value } : r
                  ))}
                  placeholder="Staff name..."
                  className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                  disabled={reportStatus === 'submitted'}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1F3864] mb-1">Issue</label>
                <input
                  type="text"
                  value={req.issue}
                  onChange={(e) => setSupportRequests(prev => prev.map((r, idx) =>
                    idx === i ? { ...r, issue: e.target.value } : r
                  ))}
                  placeholder="Issue..."
                  className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                  disabled={reportStatus === 'submitted'}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1F3864] mb-1">Suggestion</label>
                <input
                  type="text"
                  value={req.suggestion}
                  onChange={(e) => setSupportRequests(prev => prev.map((r, idx) =>
                    idx === i ? { ...r, suggestion: e.target.value } : r
                  ))}
                  placeholder="Suggestion..."
                  className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                  disabled={reportStatus === 'submitted'}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        number={13}
        title="Issues for Deputy Headmaster"
        isOpen={openSections.includes(13)}
        onToggle={() => toggleSection(13)}
      >
        <div className="space-y-4">
          {issuesForDeputy.map((issue, i) => (
            <div key={i} className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-[#1F3864] mb-1">Issue Title</label>
                <input
                  type="text"
                  value={issue.title}
                  onChange={(e) => setIssuesForDeputy(prev => prev.map((iss, idx) =>
                    idx === i ? { ...iss, title: e.target.value } : iss
                  ))}
                  placeholder="Issue title..."
                  className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50"
                  disabled={reportStatus === 'submitted'}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1F3864] mb-1">Description</label>
                <textarea
                  value={issue.description}
                  onChange={(e) => setIssuesForDeputy(prev => prev.map((iss, idx) =>
                    idx === i ? { ...iss, description: e.target.value } : iss
                  ))}
                  rows={2}
                  placeholder="Description..."
                  className="w-full px-2 py-1 border border-gray-300 rounded bg-yellow-50 resize-none"
                  disabled={reportStatus === 'submitted'}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        number={14}
        title="Bonus Recommendations"
        isOpen={openSections.includes(14)}
        onToggle={() => toggleSection(14)}
      >
        <div className="space-y-4">
          {bonusRecommendations.map((rec, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-[#1F3864] mb-1">Staff Name</label>
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
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1F3864] mb-1">Reasons</label>
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
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 pb-8">
        {reportStatus !== 'submitted' && (
          <>
            <button
              onClick={saveDraft}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[#1F3864] text-white rounded-lg hover:bg-[#2d5098] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={submitReport}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Send className="w-4 h-4" />
              {saving ? 'Submitting...' : 'Submit Report'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Section Collapsible Component
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 flex items-center justify-center bg-[#1F3864] text-white text-sm font-bold rounded-full">
            {number}
          </span>
          <span className="font-semibold text-[#1F3864]">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Input Group Helper
function InputGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864]">
        {label}
      </label>
      {children}
    </div>
  );
}
