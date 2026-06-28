import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Department, Teacher, Subject } from '../lib/types';
import {
  Plus, Pencil, Trash2, Search, Upload, Download, Save, X
} from 'lucide-react';
// Excel functionality - will be available after xlsx is properly configured
// import { read, utils, writeFileXLSX } from 'xlsx';

export function DataManagement() {
  const [activeTab, setActiveTab] = useState<'teachers' | 'subjects'>('teachers');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedDept, setSelectedDept] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // New item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeacher, setNewTeacher] = useState<Partial<Teacher>>({
    department_id: '',
    name: '',
    subject: '',
    class_name: '',
    form: 'F1',
    base_hw: 4
  });
  const [newSubject, setNewSubject] = useState<Partial<Subject>>({
    department_id: '',
    subject_name: '',
    form: 'F1',
    level: 'O-Level',
    topics: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [deptsData, teachersData, subjectsData] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('teachers').select('*').order('department_id, name'),
      supabase.from('subjects').select('*').order('department_id, subject_name, form')
    ]);

    if (deptsData.data) setDepartments(deptsData.data);
    if (teachersData.data) setTeachers(teachersData.data);
    if (subjectsData.data) setSubjects(subjectsData.data);

    setLoading(false);
  };

  // Teachers CRUD
  const saveTeacher = async () => {
    if (!editingTeacher) return;

    const { error } = await supabase
      .from('teachers')
      .update({
        name: editingTeacher.name,
        subject: editingTeacher.subject,
        class_name: editingTeacher.class_name,
        form: editingTeacher.form,
        base_hw: editingTeacher.base_hw
      })
      .eq('id', editingTeacher.id);

    if (!error) {
      setEditingTeacher(null);
      loadData();
    }
  };

  const addTeacher = async () => {
    const { error } = await supabase
      .from('teachers')
      .insert([newTeacher]);

    if (!error) {
      setShowAddForm(false);
      setNewTeacher({
        department_id: '',
        name: '',
        subject: '',
        class_name: '',
        form: 'F1',
        base_hw: 4
      });
      loadData();
    }
  };

  const deleteTeacher = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;

    await supabase.from('teachers').delete().eq('id', id);
    loadData();
  };

  // Subjects CRUD
  const saveSubject = async () => {
    if (!editingSubject) return;

    const { error } = await supabase
      .from('subjects')
      .update({
        subject_name: editingSubject.subject_name,
        form: editingSubject.form,
        level: editingSubject.level,
        topics: editingSubject.topics
      })
      .eq('id', editingSubject.id);

    if (!error) {
      setEditingSubject(null);
      loadData();
    }
  };

  const addSubject = async () => {
    const { error } = await supabase
      .from('subjects')
      .insert([newSubject]);

    if (!error) {
      setShowAddForm(false);
      setNewSubject({
        department_id: '',
        subject_name: '',
        form: 'F1',
        level: 'O-Level',
        topics: 1
      });
      loadData();
    }
  };

  const deleteSubject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;

    await supabase.from('subjects').delete().eq('id', id);
    loadData();
  };

  // Excel import - placeholder (xlsx module needs ESM configuration)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    alert('Excel import will be available after xlsx module is configured. For now, use the Add button to add data manually.');
    e.target.value = '';
  };

  // Export to Excel - placeholder
  const exportToExcel = () => {
    alert('Excel export will be available after xlsx module is configured.');
  };

  // Filter
  const filteredTeachers = teachers.filter(t => {
    if (selectedDept !== 'all' && t.department_id !== selectedDept) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.class_name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const filteredSubjects = subjects.filter(s => {
    if (selectedDept !== 'all' && s.department_id !== selectedDept) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return s.subject_name.toLowerCase().includes(query);
    }
    return true;
  });

  const FORMS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#1F3864]">Manage Data</h2>

        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-[#1F3864] text-white rounded-lg hover:bg-[#162a4e]"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-6 py-3 font-medium border-b-2 transition ${
            activeTab === 'teachers'
              ? 'border-[#C9A84C] text-[#1F3864]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Teachers ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-6 py-3 font-medium border-b-2 transition ${
            activeTab === 'subjects'
              ? 'border-[#C9A84C] text-[#1F3864]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Subjects ({subjects.length})
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none w-64"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F3864] focus:border-transparent outline-none"
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-[#1F3864] rounded-lg hover:bg-[#f0d080] font-medium ml-auto"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'teachers' ? 'Teacher' : 'Subject'}
        </button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1F3864]">
                Add {activeTab === 'teachers' ? 'Teacher' : 'Subject'}
              </h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeTab === 'teachers' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Department</label>
                  <select
                    value={newTeacher.department_id}
                    onChange={(e) => setNewTeacher({ ...newTeacher, department_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Teacher Name</label>
                  <input
                    type="text"
                    value={newTeacher.name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Subject</label>
                  <input
                    type="text"
                    value={newTeacher.subject}
                    onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Class</label>
                    <input
                      type="text"
                      value={newTeacher.class_name}
                      onChange={(e) => setNewTeacher({ ...newTeacher, class_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Form</label>
                    <select
                      value={newTeacher.form}
                      onChange={(e) => setNewTeacher({ ...newTeacher, form: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Base HW</label>
                  <input
                    type="number"
                    value={newTeacher.base_hw}
                    onChange={(e) => setNewTeacher({ ...newTeacher, base_hw: parseInt(e.target.value) || 4 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Department</label>
                  <select
                    value={newSubject.department_id}
                    onChange={(e) => setNewSubject({ ...newSubject, department_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={newSubject.subject_name}
                    onChange={(e) => setNewSubject({ ...newSubject, subject_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Form</label>
                    <select
                      value={newSubject.form}
                      onChange={(e) => setNewSubject({ ...newSubject, form: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Level</label>
                    <select
                      value={newSubject.level}
                      onChange={(e) => setNewSubject({ ...newSubject, level: e.target.value as 'O-Level' | 'A-Level' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="O-Level">O-Level</option>
                      <option value="A-Level">A-Level</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F3864] mb-1">Topics</label>
                  <input
                    type="number"
                    value={newSubject.topics}
                    onChange={(e) => setNewSubject({ ...newSubject, topics: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={activeTab === 'teachers' ? addTeacher : addSubject}
                className="flex items-center gap-2 px-4 py-2 bg-[#1F3864] text-white rounded-lg hover:bg-[#162a4e]"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-[#1F3864] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'teachers' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1F3864] text-white">
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Subject</th>
                    <th className="px-4 py-3 text-center">Class</th>
                    <th className="px-4 py-3 text-center">Form</th>
                    <th className="px-4 py-3 text-center">Base HW</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {departments.find(d => d.id === teacher.department_id)?.name || teacher.department_id}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {editingTeacher?.id === teacher.id ? (
                          <input
                            type="text"
                            value={editingTeacher.name}
                            onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : teacher.name}
                      </td>
                      <td className="px-4 py-3">
                        {editingTeacher?.id === teacher.id ? (
                          <input
                            type="text"
                            value={editingTeacher.subject}
                            onChange={(e) => setEditingTeacher({ ...editingTeacher, subject: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : teacher.subject}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingTeacher?.id === teacher.id ? (
                          <input
                            type="text"
                            value={editingTeacher.class_name}
                            onChange={(e) => setEditingTeacher({ ...editingTeacher, class_name: e.target.value })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                        ) : teacher.class_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingTeacher?.id === teacher.id ? (
                          <select
                            value={editingTeacher.form}
                            onChange={(e) => setEditingTeacher({ ...editingTeacher, form: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded"
                          >
                            {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        ) : teacher.form}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingTeacher?.id === teacher.id ? (
                          <input
                            type="number"
                            value={editingTeacher.base_hw}
                            onChange={(e) => setEditingTeacher({ ...editingTeacher, base_hw: parseInt(e.target.value) || 0 })}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                        ) : teacher.base_hw}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {editingTeacher?.id === teacher.id ? (
                            <>
                              <button
                                onClick={saveTeacher}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingTeacher(null)}
                                className="p-1.5 text-gray-400 hover:bg-gray-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingTeacher(teacher)}
                                className="p-1.5 text-gray-500 hover:text-[#1F3864] hover:bg-gray-100 rounded"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteTeacher(teacher.id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#1F3864] text-white">
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Subject</th>
                    <th className="px-4 py-3 text-center">Form</th>
                    <th className="px-4 py-3 text-center">Level</th>
                    <th className="px-4 py-3 text-center">Topics</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.map((subject) => (
                    <tr key={subject.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {departments.find(d => d.id === subject.department_id)?.name || subject.department_id}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {editingSubject?.id === subject.id ? (
                          <input
                            type="text"
                            value={editingSubject.subject_name}
                            onChange={(e) => setEditingSubject({ ...editingSubject, subject_name: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : subject.subject_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingSubject?.id === subject.id ? (
                          <select
                            value={editingSubject.form}
                            onChange={(e) => setEditingSubject({ ...editingSubject, form: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded"
                          >
                            {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        ) : subject.form}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingSubject?.id === subject.id ? (
                          <select
                            value={editingSubject.level}
                            onChange={(e) => setEditingSubject({ ...editingSubject, level: e.target.value as 'O-Level' | 'A-Level' })}
                            className="px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="O-Level">O-Level</option>
                            <option value="A-Level">A-Level</option>
                          </select>
                        ) : subject.level}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingSubject?.id === subject.id ? (
                          <input
                            type="number"
                            value={editingSubject.topics}
                            onChange={(e) => setEditingSubject({ ...editingSubject, topics: parseInt(e.target.value) || 1 })}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                          />
                        ) : subject.topics}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {editingSubject?.id === subject.id ? (
                            <>
                              <button
                                onClick={saveSubject}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingSubject(null)}
                                className="p-1.5 text-gray-400 hover:bg-gray-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingSubject(subject)}
                                className="p-1.5 text-gray-500 hover:text-[#1F3864] hover:bg-gray-100 rounded"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteSubject(subject.id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
