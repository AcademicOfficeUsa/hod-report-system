import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, LogOut, User } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

const NAV_ITEMS = {
  hod: [
    { id: 'report', label: 'Monthly Report' },
    { id: 'history', label: 'My Reports' },
    { id: 'drafts', label: 'Drafts' }
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'reports', label: 'All Reports' },
    { id: 'edit-requests', label: 'Edit Requests' },
    { id: 'compiled', label: 'Compiled Report' },
    { id: 'manage', label: 'Manage Data' },
    { id: 'users', label: 'Users' }
  ]
};

export function Layout({ children, activeView, onViewChange }: LayoutProps) {
  const { profile, signOut, isAdmin, isHod } = useAuth();

  const navItems = isAdmin ? NAV_ITEMS.admin : NAV_ITEMS.hod;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'hod': return 'Head of Department';
      case 'assistant_deputy': return 'Assistant Deputy Headmaster';
      case 'deputy': return 'Deputy Headmaster';
      case 'headmaster': return 'Headmaster';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-[#1F3864] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#C9A84C] rounded-full flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-[#1F3864]" />
              </div>
              <div>
                <h1 className="text-base font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  School of St. Jude
                </h1>
                <p className="text-[10px] text-white/50 -mt-0.5">HOD Monthly Report System</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 border border-white/20 rounded-full px-3 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <div className="text-xs">
                  <span className="font-medium">{profile?.full_name}</span>
                </div>
              </div>
              <button
                onClick={signOut}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* User Info Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {getRoleLabel(profile?.role || '')}
                {profile?.department_id && (
                  <span className="text-[#C9A84C] font-medium ml-1">
                    • {profile.department_id.charAt(0).toUpperCase() + profile.department_id.slice(1)} Department
                  </span>
                )}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {profile?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  activeView === item.id
                    ? 'border-[#C9A84C] text-[#1F3864]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          School of St. Jude HOD Monthly Report System • {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
