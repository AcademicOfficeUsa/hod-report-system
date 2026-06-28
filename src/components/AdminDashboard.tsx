import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { HodReport, Department } from '../lib/types';
import { MONTHS } from '../lib/types';
import {
  FileText, Clock, CheckCircle, AlertCircle, Search, Filter, Eye, Edit, Download
} from 'lucide-react';

export function AdminDashboard() {
  const [reports, setReports] = useState<HodReport[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [deptFilter, setDeptFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [deptFilter, monthFilter, yearFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);

    // Load departments
    const { data: depts } = await supabase.from('departments').select('*');
    if (depts) setDepartments(depts);

    // Build query
    let query = supabase
      .from('hod_reports')
      .select('*, department:departments(*)')
      .order('created_at', { ascending: false });

    if (deptFilter !== 'all') {
      query = query.eq('department_id', deptFilter);
    }
    if (monthFilter !== 'all') {
      query = query.eq('month', monthFilter);
    }
    if (yearFilter !== 'all') {
      query = query.eq('year', parseInt(yearFilter));
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    if (data) setReports(data as HodReport[]);

    setLoading(false);
  };

  // Calculate stats
  const stats = {
    total: reports.length,
    submitted: reports.filter(r => r.status === 'submitted').length,
    drafts: reports.filter(r => r.status === 'draft').length,
    pending: reports.filter(r => r.status === 'edit_requested').length,
    thisMonth: reports.filter(r =>
      r.month === MONTHS[new Date().getMonth()] &&
      r.year === new Date().getFullYear()
    ).length
  };

  // Filter by search
  const filteredReports = reports.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.department_id?.toLowerCase().includes(query) ||
      r.hod_name?.toLowerCase().includes(query) ||
      r.month?.toLowerCase().includes(query)
    );
  });

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
            Edit Requested
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1F3864]">Admin Dashboard</h2>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard title="Total Reports" value={stats.total} icon={<FileText className="w-5 h-5" />} color="blue" />
        <StatsCard title="Submitted" value={stats.submitted} icon={<CheckCircle className="w-5 h-5" />} color="green" />
        <StatsCard title="Drafts" value={stats.drafts} icon={<FileText className="w-5 h-5" />} color="gray" />
        <StatsCard title="Edit Requests" value={stats.pending} icon={<Clock className="w-5 h-5" />} color="yellow" />
        <StatsCard title="This Month" value={stats.thisMonth} icon={<AlertCircle className="w-5 h-5" />} color="purple" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none w-48"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none"
            >
              <option value="all">All Months</option>
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="edit_requested">Edit Requested</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-[#1F3864] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No reports found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1F3864] text-white">
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">HOD</th>
                  <th className="px-4 py-3 text-center">Month</th>
                  <th className="px-4 py-3 text-center">Year</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Submitted</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1F3864]">
                        {departments.find(d => d.id === report.department_id)?.name || report.department_id}
                      </div>
                      {report.is_science && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Science</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{report.hod_name}</div>
                      <div className="text-xs text-gray-400">{report.hod_email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">{report.month}</td>
                    <td className="px-4 py-3 text-center">{report.year}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(report.status)}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {report.submitted_at
                        ? new Date(report.submitted_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          title="View Report"
                          className="p-1.5 text-gray-500 hover:text-[#1F3864] hover:bg-gray-100 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Edit Report"
                          className="p-1.5 text-gray-500 hover:text-[#1F3864] hover:bg-gray-100 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          title="Download PDF"
                          className="p-1.5 text-gray-500 hover:text-[#1F3864] hover:bg-gray-100 rounded"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
  color
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <div className="text-sm">{title}</div>
    </div>
  );
}
