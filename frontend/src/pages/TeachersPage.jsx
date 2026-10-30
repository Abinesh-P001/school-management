import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Filter,
  Mail,
  FileSpreadsheet,
  LayoutGrid,
  List
} from 'lucide-react';
import Badge from '../components/common/Badge';
import DataTable from '../components/common/DataTable';
import { useApp } from '../context/AppContext';
import AddTeacherModal from '../components/forms/AddTeacherModal';
import { isUserAdmin } from '../utils/permissions';
import { exportToExcel } from '../utils/excelExport';

export default function TeachersPage() {
  const { teachers, showToast, currentUser } = useApp();
  const isAdmin = isUserAdmin(currentUser);
  const [selectedDept, setSelectedDept] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchesDept = selectedDept === 'All' || t.department === selectedDept;
      return matchesDept;
    });
  }, [teachers, selectedDept]);

  const handleExportExcel = () => {
    try {
      const formattedData = filteredTeachers.map((t) => ({
        'Faculty ID': t.id,
        'Full Name': t.name,
        'Department': t.department,
        'Subject Specialization': t.subject,
        'Highest Qualification': t.qualification,
        'Teaching Experience': t.experience,
        'Email': t.email,
        'Phone': t.phone,
        'Assigned Classes': (t.classesAssigned || []).join(', '),
        'Status': t.status
      }));

      exportToExcel(formattedData, 'Faculty_Staff_Directory.xlsx', 'Faculty_Staff');
      showToast(`Exported ${filteredTeachers.length} faculty records to Excel!`, 'success');
    } catch (err) {
      showToast(`Failed to export faculty list: ${err.message}`, 'error');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Faculty Member',
      sortable: true,
      render: (teacher) => (
        <div className="flex items-center space-x-3">
          {teacher.avatar ? (
            <img
              src={teacher.avatar}
              alt={teacher.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-blue-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-200 shrink-0 select-none shadow-xs">
              {teacher.name.split(' ').filter(p => !p.startsWith('Prof.') && !p.startsWith('Dr.')).map(n => n[0]).slice(0, 2).join('') || teacher.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="font-bold text-slate-900">{teacher.name}</h4>
            <p className="text-[11px] text-slate-500 font-medium">{teacher.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (teacher) => (
        <span className="font-semibold text-slate-800">{teacher.department}</span>
      )
    },
    {
      key: 'subject',
      label: 'Subject',
      sortable: true,
      render: (teacher) => (
        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px]">
          {teacher.subject}
        </span>
      )
    },
    {
      key: 'qualification',
      label: 'Qualification',
      sortable: true,
      render: (teacher) => <span className="text-slate-600 font-medium">{teacher.qualification}</span>
    },
    {
      key: 'experience',
      label: 'Experience',
      sortable: true,
      render: (teacher) => <span className="font-bold text-slate-800">{teacher.experience}</span>
    },
    {
      key: 'classesAssigned',
      label: 'Assigned Classes',
      sortable: false,
      render: (teacher) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {(teacher.classesAssigned || []).map((cls, idx) => (
            <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
              {cls}
            </span>
          ))}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (teacher) => <Badge text={teacher.status || 'Active'} size="xs" />
    },
    {
      key: 'actions',
      label: 'Contact',
      sortable: false,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (teacher) => (
        <button
          onClick={() => showToast(`Initiating message to ${teacher.name}...`, 'info')}
          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition-colors"
        >
          Message
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Faculty & Academic Staff</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Certified instructors, department heads, and academic specialists. Total: <strong className="text-blue-700">{teachers.length}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors shadow-xs"
            title="Export Faculty List to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export (.xlsx)</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Faculty</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable
          data={filteredTeachers}
          columns={columns}
          searchKeys={['name', 'subject', 'department', 'email']}
          searchPlaceholder="Search faculty name, subject, or department..."
          defaultPageSize={10}
          emptyTitle="No Faculty Found"
          emptyMessage="No faculty records match your active query."
          emptyAction={
            isAdmin
              ? {
                  label: '+ Add Faculty Member',
                  icon: PlusCircle,
                  onClick: () => setIsAddModalOpen(true)
                }
              : null
          }
          filterSlot={
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="All">All Departments</option>
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="English">English</option>
                <option value="Humanities">Humanities</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Fine Arts">Fine Arts</option>
              </select>
            </div>
          }
        />
      ) : (
        <>
          {/* Filter Bar for Grid View */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Filter by Department:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="All">All Departments ({teachers.length})</option>
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="English">English</option>
                <option value="Humanities">Humanities</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Fine Arts">Fine Arts</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 font-semibold">
              Showing <strong>{filteredTeachers.length}</strong> members
            </span>
          </div>

          {/* Faculty Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                className="group bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      {teacher.avatar ? (
                        <img
                          src={teacher.avatar}
                          alt={teacher.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/20"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-blue-900 text-white flex items-center justify-center font-extrabold text-sm ring-2 ring-blue-500/20 shadow-xs select-none">
                          {teacher.name.split(' ').filter(p => !p.startsWith('Prof.') && !p.startsWith('Dr.')).map(n => n[0]).slice(0, 2).join('') || teacher.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{teacher.name}</h3>
                        <p className="text-xs font-bold text-blue-700">{teacher.department}</p>
                      </div>
                    </div>
                    <Badge text={teacher.status || 'Active'} size="xs" />
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Subject Specialization</span>
                      <span className="font-bold text-slate-900">{teacher.subject}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Qualification</span>
                      <span className="text-slate-700 font-medium">{teacher.qualification}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 pt-1">
                      <span className="font-medium text-slate-500">Experience:</span>
                      <span className="font-bold text-slate-900">{teacher.experience}</span>
                    </div>

                    <div className="pt-2">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-1">Assigned Classes</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(teacher.classesAssigned || []).map((cls, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold">
                            {cls}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate max-w-[140px] text-[11px] font-medium">{teacher.email}</span>
                  </div>
                  <button
                    onClick={() => showToast(`Initiating direct message to ${teacher.name}...`, 'info')}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[11px] transition-colors"
                  >
                    Contact
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {isAdmin && <AddTeacherModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />}
    </div>
  );
}
