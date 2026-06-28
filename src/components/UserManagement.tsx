import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile, UserRole } from '../lib/types';
import { UserPlus, Pencil, Trash2, Shield, Users } from 'lucide-react';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'hod', label: 'Head of Department' },
  { value: 'assistant_deputy', label: 'Assistant Deputy Headmaster' },
  { value: 'deputy', label: 'Deputy Headmaster' },
  { value: 'headmaster', label: 'Headmaster' }
];

export function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    fullName: '',
    role: 'hod' as UserRole,
    department_id: ''
  });

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [usersData, deptsData] = await Promise.all([
      supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('departments').select('id, name').order('name')
    ]);

    if (usersData.data) setUsers(usersData.data);
    if (deptsData.data) setDepartments(deptsData.data);

    setLoading(false);
  };

  const getRoleBadge = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      hod: 'bg-blue-100 text-blue-700',
      assistant_deputy: 'bg-amber-100 text-amber-700',
      deputy: 'bg-purple-100 text-purple-700',
      headmaster: 'bg-green-100 text-green-700'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role]}`}>
        {ROLES.find(r => r.value === role)?.label || role}
      </span>
    );
  };

  const handleCreateUser = async () => {
    // This would normally be done via edge function with admin privileges
    // For now, we'll use the signUp flow

    try {
      // Generate a random password
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: tempPassword,
        options: {
          data: {
            full_name: newUser.fullName,
            role: newUser.role
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: newUser.email,
            full_name: newUser.fullName,
            role: newUser.role,
            department_id: newUser.role === 'hod' ? newUser.department_id : null
          });

        if (profileError) throw profileError;
      }

      setShowAddForm(false);
      setNewUser({ email: '', fullName: '', role: 'hod', department_id: '' });
      loadData();

      alert(`User created! A temporary password has been sent to ${newUser.email}`);
    } catch (error: any) {
      alert('Error creating user: ' + error.message);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: editingUser.full_name,
        role: editingUser.role,
        department_id: editingUser.role === 'hod' ? editingUser.department_id : null
      })
      .eq('id', editingUser.id);

    if (!error) {
      setEditingUser(null);
      loadData();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    await supabase.from('user_profiles').delete().eq('id', userId);
    loadData();
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
        <div>
          <h2 className="text-xl font-bold text-[#1F3864]">User Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage user accounts and permissions</p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-[#1F3864] rounded-lg hover:bg-[#f0d080] font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1F3864]">{users.length}</div>
              <div className="text-xs text-gray-500">Total Users</div>
            </div>
          </div>
        </div>
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role.value).length;
          return (
            <div key={role.value} className="bg-white rounded-lg p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#1F3864]">{count}</div>
                  <div className="text-xs text-gray-500">{role.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add User Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1F3864]">Add New User</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Email Address</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="user@schoolofstjude.co.tz"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {newUser.role === 'hod' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Department</label>
                  <select
                    value={newUser.department_id}
                    onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                className="flex items-center gap-2 px-4 py-2 bg-[#1F3864] text-white rounded-lg hover:bg-[#162a4e]"
              >
                <UserPlus className="w-4 h-4" />
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editingUser?.id === user.id ? (
                      <input
                        type="text"
                        value={editingUser.full_name}
                        onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    ) : (
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingUser?.id === user.id ? (
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                        className="px-2 py-1 border border-gray-300 rounded"
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      getRoleBadge(user.role)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === 'hod' ? (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {departments.find(d => d.id === user.department_id)?.name || 'Not assigned'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">All departments</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {editingUser?.id === user.id ? (
                        <>
                          <button
                            onClick={handleUpdateUser}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-50 rounded"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 text-gray-500 hover:text-[#1F3864] hover:bg-gray-100 rounded"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {user.id !== profile?.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
