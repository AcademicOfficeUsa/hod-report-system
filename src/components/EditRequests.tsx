import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { EditRequest } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

export function EditRequestsManager() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<(EditRequest & { report?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('edit_requests')
      .select('*, report:hod_reports(*)')
      .order('requested_at', { ascending: false });

    if (data) setRequests(data as any);
    setLoading(false);
  };

  const handleReview = async (requestId: string, approve: boolean) => {
    if (!profile) return;

    setProcessingId(requestId);

    const status = approve ? 'approved' : 'rejected';

    // Update the request
    await supabase
      .from('edit_requests')
      .update({
        status,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    // If approved, update the report status
    if (approve) {
      const request = requests.find(r => r.id === requestId);
      if (request?.report?.id) {
        await supabase
          .from('hod_reports')
          .update({ status: 'edit_requested' })
          .eq('id', request.report.id);
      }
    }

    await loadRequests();
    setProcessingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1F3864]">Edit Requests</h2>
        <div className="text-sm text-gray-500">
          {requests.filter(r => r.status === 'pending').length} pending requests
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No edit requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-lg shadow p-4 border-l-4"
              style={{
                borderLeftColor: req.status === 'pending' ? '#C9A84C' :
                  req.status === 'approved' ? '#22c55e' : '#ef4444'
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-[#1F3864]">
                      {req.report?.department_id?.toUpperCase() || 'Unknown'} Department
                    </span>
                    {getStatusBadge(req.status)}
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Report:</span> {req.report?.month} {req.report?.year}
                  </div>

                  {req.reason && (
                    <div className="bg-gray-50 rounded p-3 mb-2">
                      <div className="text-xs text-gray-500 mb-1">Reason given:</div>
                      <div className="text-sm text-gray-700">{req.reason}</div>
                    </div>
                  )}

                  <div className="text-xs text-gray-400">
                    Requested: {new Date(req.requested_at).toLocaleString()}
                    {req.reviewed_at && (
                      <span className="ml-3">
                        Reviewed: {new Date(req.reviewed_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(req.id, false)}
                      disabled={processingId === req.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview(req.id, true)}
                      disabled={processingId === req.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
