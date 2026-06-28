import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { HodReport, Department } from '../lib/types';
import { MONTHS } from '../lib/types';
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Pencil, Send } from 'lucide-react';

export function MyReports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<HodReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<HodReport | null>(null);

  const departmentId = profile?.department_id;

  useEffect(() => {
    if (departmentId) {
      loadReports();
    }
  }, [departmentId]);

  const loadReports = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('hod_reports')
      .select('*')
      .eq('department_id', departmentId)
      .order('created_at', { ascending: false });

    if (data) setReports(data);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Submitted
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <FileText className="w-3 h-3" />
            Draft
          </span>
        );
      case 'edit_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Edit Approved
          </span>
        );
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{status}</span>;
    }
  };

  const requestEdit = async (reportId: string) => {
    const reason = prompt('Please provide a reason for requesting edit access:');
    if (!reason) return;

    const { error } = await supabase
      .from('edit_requests')
      .insert({
        report_id: reportId,
        department_id: departmentId,
        hod_id: profile?.id,
        reason
      });

    if (!error) {
      alert('Edit request submitted. An admin will review your request.');
      loadReports();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-[#1F3864] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#1F3864]">My Reports</h2>

      {reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No reports found. Start by creating a new report.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow p-4 border-l-4"
              style={{
                borderLeftColor: report.status === 'submitted' ? '#22c55e' :
                  report.status === 'draft' ? '#3b82f6' :
                  report.status === 'edit_requested' ? '#C9A84C' : '#9ca3af'
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-[#1F3864]">
                      {report.month} {report.year}
                    </h3>
                    {getStatusBadge(report.status)}
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    <div className="flex gap-4">
                      <span>HOD: {report.hod_name}</span>
                      <span>Created: {new Date(report.created_at).toLocaleDateString()}</span>
                      {report.submitted_at && (
                        <span>Submitted: {new Date(report.submitted_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <AlertCircle className="w-3 h-3" />
                    {report.status === 'submitted'
                      ? 'Report is locked. Request edit access if needed.'
                      : report.status === 'edit_requested'
                        ? 'You can now edit this report.'
                        : 'Draft - continue editing or submit when ready.'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    title="View Report"
                    className="p-2 text-gray-500 hover:text-[#1F3864] hover:bg-gray-100 rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {(report.status === 'draft' || report.status === 'edit_requested') && (
                    <button
                      title="Continue Editing"
                      className="p-2 text-gray-500 hover:text-[#1F3864] hover:bg-gray-100 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}

                  {report.status === 'submitted' && (
                    <button
                      onClick={() => requestEdit(report.id)}
                      title="Request Edit Access"
                      className="flex items-center gap-1 px-3 py-2 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100"
                    >
                      <Send className="w-3 h-3" />
                      Request Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
