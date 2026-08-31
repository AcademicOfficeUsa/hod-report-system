import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { HodReport, Department } from '../lib/types';
import { MONTHS } from '../lib/types';
import { FileText, CheckCircle, Clock, AlertCircle, Download, Loader2 } from 'lucide-react';
import { generateCompiledPDF } from '../lib/pdfGenerator';

export function CompiledReport() {
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reports, setReports] = useState<(HodReport & { department?: Department })[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadReports();
  }, [selectedMonth, selectedYear]);

  const loadDepartments = async () => {
    const { data, error } = await supabase!.from('departments').select('*').order('name');
    if (error) {
      console.error('Error loading departments:', error);
    } else if (data) {
      setDepartments(data);
    }
  };

  const loadReports = async () => {
    setLoading(true);

    const { data, error } = await supabase!
      .from('hod_reports')
      .select('*, department:departments(*)')
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .order('department_id');

    if (error) {
      console.error('Error loading reports:', error);
    } else if (data) {
      setReports(data as (HodReport & { department?: Department })[]);
    }

    setLoading(false);
  };

  const stats = {
    total: reports.length,
    submitted: reports.filter(r => r.status === 'submitted').length,
    drafts: reports.filter(r => r.status === 'draft').length,
    pending: reports.filter(r => r.status === 'edit_requested').length,
  };

  const missingDepartments = departments.filter(
    d => !reports.some(r => r.department_id === d.id)
  );

  const handleGeneratePDF = async () => {
    if (reports.length === 0) {
      alert('No reports found for ' + selectedMonth + ' ' + selectedYear);
      return;
    }

    setGenerating(true);
    try {
      const reportIds = reports.map(r => r.id);

      const [issuesRes, curriculumRes, examRes, hwRes, staffRes] = await Promise.all([
        supabase!.from('hod_issues').select('*').in('report_id', reportIds),
        supabase!.from('hod_curriculum').select('*').in('report_id', reportIds),
        supabase!.from('hod_exam_results').select('*').in('report_id', reportIds),
        supabase!.from('hod_hw_teachers').select('*').in('report_id', reportIds),
        supabase!.from('hod_staff_checklist').select('*').in('report_id', reportIds),
      ]);

      generateCompiledPDF({
        month: selectedMonth,
        year: selectedYear,
        reports,
        departments,
        issues: issuesRes.data || [],
        curriculum: curriculumRes.data || [],
        examResults: examRes.data || [],
        hwTeachers: hwRes.data || [],
        staffChecklist: staffRes.data || [],
      });
    } catch (err: any) {
      alert('Error generating PDF: ' + err.message);
    }
    setGenerating(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" />Submitted</span>;
      case 'draft':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"><FileText className="w-3 h-3" />Draft</span>;
      case 'edit_requested':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium"><Clock className="w-3 h-3" />Edit Requested</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1F3864]">Assistant Deputy Academic Report</h2>
          <p className="text-sm text-gray-500">Compiled from all HOD monthly reports</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none"
          >
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleGeneratePDF}
            disabled={generating || reports.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#1F3864] text-white rounded-lg hover:bg-[#162a4e] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generate PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-[#1F3864]">{stats.total}/{departments.length || 7}</div>
          <div className="text-xs text-gray-500">Departments Reported</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
          <div className="text-xs text-gray-500">Submitted</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.drafts}</div>
          <div className="text-xs text-gray-500">Drafts</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-gray-500">Edit Requests</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-[#1F3864] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No reports found for {selectedMonth} {selectedYear}</p>
        </div>
      ) : (
        <>
          {missingDepartments.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium text-sm">
                  Missing reports from: {missingDepartments.map(d => d.name).join(', ')}
                </span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1F3864] text-white">
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">HOD</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Achievements</th>
                    <th className="px-4 py-3 text-left">Challenges</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#1F3864]">
                        {report.department?.name || report.department_id}
                      </td>
                      <td className="px-4 py-3">{report.hod_name}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(report.status)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {(report.achievements || []).filter(Boolean).length} items
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {(report.challenges || []).filter(Boolean).length} items
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-[#1F3864] mb-4">
                  {report.department?.name || report.department_id} Department
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Achievements</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {(report.achievements || []).filter(Boolean).map((a, i) => (
                        <li key={i} className="flex gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          {a}
                        </li>
                      ))}
                      {(report.achievements || []).filter(Boolean).length === 0 && (
                        <li className="text-gray-400 italic">No achievements recorded</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Challenges</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {(report.challenges || []).filter(Boolean).map((c, i) => (
                        <li key={i} className="flex gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          {c}
                        </li>
                      ))}
                      {(report.challenges || []).filter(Boolean).length === 0 && (
                        <li className="text-gray-400 italic">No challenges recorded</li>
                      )}
                    </ul>
                  </div>
                </div>

                {report.comments_a && (
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-gray-500">General Comment: </span>
                    <span className="text-sm text-gray-700">{report.comments_a}</span>
                  </div>
                )}
                {report.comments_b && (
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-gray-500">Key Observations: </span>
                    <span className="text-sm text-gray-700">{report.comments_b}</span>
                  </div>
                )}
                {report.comments_c && (
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-gray-500">Way Forward: </span>
                    <span className="text-sm text-gray-700">{report.comments_c}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
