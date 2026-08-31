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
import { CompiledReport } from './components/CompiledReport';

function AppContent() {
  const { user, profile, loading, error, isAdmin } = useAuth();
  const [activeView, setActiveView] = useState('');

  useEffect(() => {
    if (profile) {
      setActiveView(isAdmin ? 'dashboard' : 'report');
    }
  }, [profile, isAdmin]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Configuration Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.
          </p>
        </div>
      </div>
    );
  }

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
      case 'report':
        return <HodReportForm />;
      case 'history':
        return <MyReports />;
      case 'drafts':
        return <MyReports />;

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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
