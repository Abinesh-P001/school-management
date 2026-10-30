import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Filter,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import DataTable from '../components/common/DataTable';
import { useApp } from '../context/AppContext';
import AddStudentModal from '../components/forms/AddStudentModal';
import { isUserAdmin, isUserTeacher, canAddStudent, canEditStudent } from '../utils/permissions';
import { exportToExcel } from '../utils/excelExport';

export default function StudentsPage() {
  const {
    students,
    setStudents,
    showToast,
    deleteStudent,
    refreshData,
    isSupabaseLoading,
    currentUser,
    currentTeacher,
    teacherAssignments
  } = useApp();

  const isAdmin = isUserAdmin(currentUser);
  const isTeacher = isUserTeacher(currentUser);
  const canAdd = canAddStudent(currentUser, teacherAssignments);

  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedFeesStatus, setSelectedFeesStatus] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);

  // Filter authorized students: If teacher, show only students in teacher's assigned classes
  const authorizedStudents = useMemo(() => {
    if (!isTeacher) return students;
    return students.filter((s) => canEditStudent(currentUser, s, teacherAssignments, currentTeacher));
  }, [isTeacher, students, currentUser, teacherAssignments, currentTeacher]);

  // Apply grade & fees status filters
  const filteredStudents = useMemo(() => {
    return authorizedStudents.filter((student) => {
      const matchesGrade = selectedGrade === 'All' || student.grade === selectedGrade || student.class_name === selectedGrade;
      const matchesFees = selectedFeesStatus === 'All' || student.feesStatus === selectedFeesStatus || student.fees_status === selectedFeesStatus;
      return matchesGrade && matchesFees;
    });
  }, [authorizedStudents, selectedGrade, selectedFeesStatus]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove ${name} from records?`)) {
      if (deleteStudent) {
        await deleteStudent(id, name);
      } else {
        setStudents(students.filter(s => s.id !== id));
        showToast(`${name} removed from student records`, 'info');
      }
    }
  };

  const handleExportExcel = () => {
    try {
      const formattedData = filteredStudents.map((s) => ({
        'Student ID': s.id,
        'Roll Number': s.rollNumber || 'N/A',
        'Student Name': s.name,
        'Grade / Class': s.grade || s.class_name,
        'Section': s.section,
        'Email': s.email,
        'Attendance Rate': s.attendance,
        'GPA': s.gpa,
        'Fee Status': s.feesStatus,
        'Enrollment Status': s.status,
        'Guardian Name': s.guardianName,
        'Guardian Contact': s.guardianPhone,
        'Admission Date': s.admissionDate || 'N/A'
      }));

      exportToExcel(
        formattedData,
        'Student_Directory.xlsx',
        'Student_Directory'
      );
      showToast(`Exported ${filteredStudents.length} student records to Excel!`, 'success');
    } catch (err) {
      showToast(`Failed to export students: ${err.message}`, 'error');
    }
  };

  // Define table columns
  const columns = [
    {
      key: 'name',
      label: 'Student',
      sortable: true,
      render: (student) => (
        <div
          onClick={() => setViewingStudent(student)}
          className="flex items-center space-x-3 cursor-pointer group"
          title="View Student Dossier"
        >
          <img
            src={student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={student.name}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 group-hover:ring-blue-400 transition-all shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
              {student.name}
            </p>
            <p className="text-[11px] text-slate-500 font-medium truncate">{student.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'rollNumber',
      label: 'Roll & ID',
      sortable: true,
      render: (student) => (
        <div className="font-mono text-[11px]">
          <span className="font-bold text-slate-900">{student.rollNumber || 'N/A'}</span>
          <span className="block text-slate-500 text-[10px]">{student.id}</span>
        </div>
      )
    },
    {
      key: 'grade',
      label: 'Class & Section',
      sortable: true,
      render: (student) => (
        <div>
          <span className="font-bold text-slate-900">{student.grade || student.class_name}</span>
          <span className="text-slate-500 font-medium ml-1">Sec {student.section}</span>
        </div>
      )
    },
    {
      key: 'guardianName',
      label: 'Guardian Details',
      sortable: true,
      render: (student) => (
        <div>
          <p className="font-bold text-slate-800 truncate">{student.guardianName || 'N/A'}</p>
          <p className="text-[10px] text-slate-500 font-medium">{student.guardianPhone || 'N/A'}</p>
        </div>
      )
    },
    {
      key: 'attendance',
      label: 'Attendance',
      sortable: true,
      render: (student) => (
        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          {student.attendance || '95%'}
        </span>
      )
    },
    {
      key: 'feesStatus',
      label: 'Fees',
      sortable: true,
      render: (student) => <Badge text={student.feesStatus || 'Paid'} size="xs" />
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (student) => <Badge text={student.status || 'Active'} size="xs" />
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (student) => (
        <div className="flex items-center justify-end space-x-1">
          <button
            onClick={() => setViewingStudent(student)}
            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
            title="View Student Dossier"
          >
            <Eye className="w-4 h-4" />
          </button>
          {canEditStudent(currentUser, student, teacherAssignments, currentTeacher) && (
            <button
              onClick={() => setEditingStudent(student)}
              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
              title="Edit Student Record"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => handleDelete(student.id, student.name)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Student"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  // Mobile card layout
  const renderMobileStudentCard = (student) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3 hover:border-blue-300 transition-all">
      <div className="flex items-start justify-between">
        <div
          onClick={() => setViewingStudent(student)}
          className="flex items-center space-x-3 min-w-0 cursor-pointer"
        >
          <img
            src={student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={student.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{student.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{student.email}</p>
            <p className="text-[11px] font-bold text-blue-700 mt-0.5">
              {student.grade || student.class_name} &bull; Sec {student.section} &bull; Roll: {student.rollNumber}
            </p>
          </div>
        </div>
        <Badge text={student.status || 'Active'} size="xs" />
      </div>

      <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance</span>
          <span className="font-bold text-emerald-700">{student.attendance}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Fee Status</span>
          <Badge text={student.feesStatus} size="xs" />
        </div>
        <div className="col-span-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Guardian</span>
          <span className="font-semibold text-slate-800">{student.guardianName} ({student.guardianPhone})</span>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={() => setViewingStudent(student)}
          className="flex-1 py-1.5 px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors flex items-center justify-center space-x-1.5 mr-2"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Dossier</span>
        </button>
        {canEditStudent(currentUser, student, teacherAssignments, currentTeacher) && (
          <button
            onClick={() => setEditingStudent(student)}
            className="p-1.5 rounded-xl text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors mr-2"
            title="Edit Record"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => handleDelete(student.id, student.name)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete Record"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Student Directory & Admissions</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Total active students enrolled: <strong className="text-blue-700">{students.length}</strong> across all academic wings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refreshData && refreshData()}
            title="Refresh database records"
            disabled={isSupabaseLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSupabaseLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span className="hidden xs:inline">Sync DB</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors shadow-xs"
            title="Export Student Directory to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export (.xlsx)</span>
          </button>
          {canAdd && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Student</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern DataTable with Search, Sort, Filter, and Pagination */}
      <DataTable
        data={filteredStudents}
        columns={columns}
        searchKeys={['name', 'rollNumber', 'id', 'email', 'guardianName']}
        searchPlaceholder="Search student name, roll number, ID, email..."
        defaultPageSize={10}
        mobileCardRender={renderMobileStudentCard}
        emptyTitle="No Students Found"
        emptyMessage="No student records match your active search terms or selected filters."
        emptyAction={
          canAdd
            ? {
                label: '+ Add Student',
                icon: UserPlus,
                onClick: () => setIsAddModalOpen(true)
              }
            : null
        }
        filterSlot={
          <>
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option value="All">All Grades</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            <select
              value={selectedFeesStatus}
              onChange={(e) => setSelectedFeesStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="All">All Fee Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </>
        }
      />

      {/* Student Profile View Modal */}
      {viewingStudent && (
        <Modal
          isOpen={!!viewingStudent}
          onClose={() => setViewingStudent(null)}
          title="Student Registration Dossier"
        >
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-4 pb-4 border-b border-slate-100">
              <img
                src={viewingStudent.avatar}
                alt={viewingStudent.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-4 ring-blue-100 shrink-0"
              />
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">{viewingStudent.name}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {viewingStudent.grade} - Section {viewingStudent.section} (Roll: {viewingStudent.rollNumber})
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge text={viewingStudent.status} size="xs" />
                  <Badge text={`Fees: ${viewingStudent.feesStatus}`} size="xs" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Student ID</span>
                <span className="font-mono font-bold text-slate-900 text-xs">{viewingStudent.id}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Cumulative GPA</span>
                <span className="font-bold text-blue-700 text-xs">{viewingStudent.gpa} / 4.0</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Attendance Rate</span>
                <span className="font-bold text-emerald-700 text-xs">{viewingStudent.attendance}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Admission Date</span>
                <span className="font-bold text-slate-900 text-xs">{viewingStudent.admissionDate}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900">Primary Contact & Guardian</h4>
              <p><span className="text-slate-500 font-medium">Guardian:</span> <span className="font-bold text-slate-900">{viewingStudent.guardianName}</span></p>
              <p><span className="text-slate-500 font-medium">Phone:</span> <span className="font-bold text-slate-900">{viewingStudent.guardianPhone}</span></p>
              <p><span className="text-slate-500 font-medium">Email:</span> <span className="font-bold text-slate-900">{viewingStudent.email}</span></p>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Student Modal */}
      {canAdd && <AddStudentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />}

      {/* Edit Student Modal */}
      {editingStudent && (
        <AddStudentModal
          isOpen={Boolean(editingStudent)}
          onClose={() => setEditingStudent(null)}
          studentToEdit={editingStudent}
        />
      )}
    </div>
  );
}
