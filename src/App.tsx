import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/Auth';
import { Layout } from './components/Layout';
import { HodReportForm } from './components/HodReport';
import { AdminDashboard } from './components/AdminDashboard';
import { EditRequestsManager } from './components/EditRequests';
import { DataManagement } from './components/DataManagement';
import { UserManagement } from './components/UserManagement';
import { MyReports } from './components/MyReports';

function AppContent() {
  const { user, profile, loading, isAdmin, isHod } = useAuth();
  const [activeView, setActiveView] = useState('');

  useEffect(() => {
    if (profile) {
      // Set default view based on role
      setActiveView(isAdmin ? 'dashboard' : 'report');
    }
  }, [profile, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1F3864] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  const renderContent = () => {
    switch (activeView) {
      // HOD Views
      case 'report':
        return <HodReportForm />;
      case 'history':
        return <MyReports />;
      case 'drafts':
        return <MyReports />;

      // Admin Views
      case 'dashboard':
        return <AdminDashboard />;
      case 'reports':
        return <AdminDashboard />;
      case 'edit-requests':
        return <EditRequestsManager />;
      case 'compiled':
        return <CompiledReport />;
      case 'manage':
        return <DataManagement />;
      case 'users':
        return <UserManagement />;

      default:
        return isAdmin ? <AdminDashboard /> : <HodReportForm />;
    }
  };

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </Layout>
  );
}

// Compiled Report Component (simplified)
function CompiledReport() {
  const [selectedMonth, setSelectedMonth] = useState('June');
  const [selectedYear, setSelectedYear] = useState(2026);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1F3864]">Assistant Deputy Academic Report</h2>
          <p className="text-sm text-gray-500">Compiled from all HOD monthly reports</p>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-[#1F3864] text-white rounded-lg hover:bg-[#162a4e]"
          >
            Generate Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500 mb-4">
          Select a month and year, then click "Generate Report" to compile all HOD reports.
        </p>
        <p className="text-xs text-gray-400">
          This will aggregate data from all 7 departments for {selectedMonth} {selectedYear}.
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
