import { supabase } from '../supabaseClient';
import { getApiBaseUrl } from '../config/api';
import {
  initialStudents,
  initialTeachers,
  initialClasses,
  initialAttendance,
  initialExams,
  initialMarks,
  initialFees,
  initialNotices,
  initialRecentActivities
} from '../data/mockData';

// Normalizers for seamless UI compatibility (both camelCase and snake_case supported)
export const normalizeStudent = (row) => ({
  ...row,
  studentId: row.student_id || row.studentId || `STU-${row.id}`,
  rollNumber: row.roll_number || row.rollNumber || '',
  guardianName: row.guardian_name || row.guardianName || '',
  guardianPhone: row.guardian_phone || row.guardianPhone || '',
  admissionDate: row.admission_date || row.admissionDate || new Date().toISOString().split('T')[0],
  feesStatus: row.fees_status || row.feesStatus || 'Pending',
  attendance: row.attendance_pct || row.attendance || '95%',
  gpa: row.gpa || '3.80',
  avatar: row.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
});

export const normalizeTeacher = (row) => ({
  ...row,
  employeeId: row.employee_id || row.employeeId || `TCH-${row.id}`,
  salaryStatus: row.salary_status || row.salaryStatus || 'Processed',
  classesAssigned: row.classes_assigned || row.classesAssigned || [`${row.department} Class`],
  avatar: row.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
});

export const normalizeClass = (row) => ({
  ...row,
  classCode: row.class_code || row.classCode || `CLS-${row.id}`,
  classTeacher: row.class_teacher || row.classTeacher || 'Assigned Faculty',
  classTeacherId: row.class_teacher_id || row.classTeacherId || null,
  totalStudents: row.total_students || row.totalStudents || 30,
  schedule: row.schedule || 'Mon - Fri, 8:00 AM - 3:00 PM',
});

export const normalizeAttendance = (row) => ({
  ...row,
  studentId: row.student_id || row.studentId,
  studentName: row.student_name || row.studentName,
  class: row.class_name || row.class || 'Grade 10-A',
  roll: row.roll || '',
});

export const normalizeExam = (row) => ({
  ...row,
  examCode: row.exam_code || row.examCode || `EXM-${row.id}`,
  class: row.class_name || row.class || 'Grade 10',
  totalMarks: row.total_marks || row.totalMarks || 100,
  passingMarks: row.passing_marks || row.passingMarks || 40,
  date: row.exam_date || row.date,
  time: row.time_slot || row.time || '09:00 AM - 12:00 PM',
});

export const normalizeMark = (row) => {
  const student = row.students || row.student || {};
  const exam = row.examinations || row.examination || {};

  const studentName = row.student_name || row.studentName || student.name || 'Student';
  const studentId = row.student_code || row.studentId || row.student_id || student.student_id || String(row.student_id || 'STU');
  const examName = row.exam_name || row.exam || exam.name || 'Examination';
  const subject = row.subject || exam.subject || 'General Subject';
  const score = Number(row.score !== undefined ? row.score : (row.marks_obtained !== undefined ? row.marks_obtained : 0));
  const maxScore = Number(row.max_score || row.maxScore || row.max_marks || exam.total_marks || 100);

  return {
    ...row,
    id: row.id,
    studentName: String(studentName),
    studentId: String(studentId),
    exam: String(examName),
    subject: String(subject),
    score: isNaN(score) ? 0 : score,
    maxScore: isNaN(maxScore) ? 100 : maxScore,
    grade: row.grade || 'A',
    status: row.status || (score >= 40 ? 'Passed' : 'Failed'),
    rollNumber: student.roll_number || row.roll_number || row.rollNumber || ''
  };
};

export const normalizeFee = (row) => ({
  ...row,
  studentName: row.student_name || row.studentName,
  studentId: row.student_id || row.studentId,
  type: row.fee_type || row.type,
  amount: Number(row.amount),
  dueDate: row.due_date || row.dueDate,
  paidDate: row.paid_date || row.paidDate,
  paymentMethod: row.payment_method || row.paymentMethod || 'Pending',
});

/**
 * STUDENTS API
 */
export async function getStudents() {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.warn('[Supabase] getStudents error (falling back to initial data):', error.message);
      return { data: initialStudents, fromMock: true, error };
    }
    if (!data || data.length === 0) {
      return { data: initialStudents, fromMock: true };
    }
    return { data: data.map(normalizeStudent), fromMock: false };
  } catch (err) {
    console.error('[Supabase] getStudents exception:', err);
    return { data: initialStudents, fromMock: true, error: err };
  }
}

export async function createStudent(studentData) {
  const payload = {
    student_id: studentData.student_id || studentData.studentId || `STU-${Date.now().toString().slice(-4)}`,
    roll_number: studentData.roll_number || studentData.rollNumber || `${(studentData.grade || '10').replace(/\D/g, '')}${studentData.section || 'A'}-${Math.floor(10 + Math.random() * 90)}`,
    name: studentData.name,
    email: studentData.email || `${studentData.name.toLowerCase().replace(/\s+/g, '.')}@oakridge.edu`,
    grade: studentData.grade || 'Grade 10',
    section: studentData.section || 'A',
    gender: studentData.gender || 'Female',
    guardian_name: studentData.guardian_name || studentData.guardianName || 'Guardian',
    guardian_phone: studentData.guardian_phone || studentData.guardianPhone || '+1 (555) 000-0000',
    admission_date: studentData.admission_date || studentData.admissionDate || new Date().toISOString().split('T')[0],
    status: studentData.status || 'Active',
    fees_status: studentData.fees_status || studentData.feesStatus || 'Pending',
    avatar: studentData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    gpa: studentData.gpa || '3.80',
    attendance_pct: studentData.attendance_pct || studentData.attendance || '100%',
  };

  const { data, error } = await supabase
    .from('students')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return normalizeStudent(data);
}

export async function updateStudent(id, studentData) {
  const payload = {};
  if (studentData.name) payload.name = studentData.name;
  if (studentData.email) payload.email = studentData.email;
  if (studentData.grade) payload.grade = studentData.grade;
  if (studentData.section) payload.section = studentData.section;
  if (studentData.status) payload.status = studentData.status;
  if (studentData.fees_status || studentData.feesStatus) payload.fees_status = studentData.fees_status || studentData.feesStatus;

  const { data, error } = await supabase
    .from('students')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return normalizeStudent(data);
}

export async function deleteStudent(id) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * TEACHERS API
 */
export async function getTeachers() {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('id', { ascending: false });

    if (error || !data || data.length === 0) {
      return { data: initialTeachers, fromMock: true, error };
    }
    return { data: data.map(normalizeTeacher), fromMock: false };
  } catch (err) {
    return { data: initialTeachers, fromMock: true, error: err };
  }
}

export async function createTeacher(teacherData) {
  const payload = {
    employee_id: teacherData.employee_id || teacherData.employeeId || `TCH-${Date.now().toString().slice(-3)}`,
    name: teacherData.name,
    email: teacherData.email || `${teacherData.name.toLowerCase().replace(/\s+/g, '.')}@oakridge.edu`,
    department: teacherData.department || 'Science',
    subject: teacherData.subject || 'General Studies',
    qualification: teacherData.qualification || 'Master of Education',
    experience: teacherData.experience || '5 Years',
    phone: teacherData.phone || '+1 (555) 123-4567',
    status: teacherData.status || 'Active',
    salary_status: 'Processed',
    avatar: teacherData.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  };

  const { data, error } = await supabase
    .from('teachers')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return normalizeTeacher(data);
}

/**
 * CLASSES API
 */
export async function getClasses(teacherFilter = null) {
  try {
    let query = supabase
      .from('classes')
      .select('*')
      .order('id', { ascending: true });

    if (teacherFilter) {
      if (teacherFilter.teacherId) {
        query = query.or(`class_teacher_id.eq.${teacherFilter.teacherId},class_teacher.eq.${teacherFilter.teacherName || ''}`);
      } else if (teacherFilter.teacherName) {
        query = query.eq('class_teacher', teacherFilter.teacherName);
      }
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      let mockList = initialClasses;
      if (teacherFilter) {
        mockList = initialClasses.filter((c) => {
          const matchId = teacherFilter.teacherId && (c.class_teacher_id === teacherFilter.teacherId || c.classTeacherId === teacherFilter.teacherId);
          const matchName = teacherFilter.teacherName && c.classTeacher && c.classTeacher.toLowerCase() === teacherFilter.teacherName.toLowerCase();
          return matchId || matchName;
        });
      }
      return { data: mockList.map(normalizeClass), fromMock: true, error };
    }
    return { data: data.map(normalizeClass), fromMock: false };
  } catch (err) {
    return { data: initialClasses, fromMock: true, error: err };
  }
}

export async function getTeacherAssignedClasses({ teacherId, teacherName } = {}) {
  return getClasses({ teacherId, teacherName });
}

export async function createClass(classData) {
  const payload = {
    class_code: classData.class_code || classData.classCode || `CLS-${Date.now().toString().slice(-3)}`,
    name: classData.name,
    section: classData.section || 'A',
    room: classData.room || 'Building B - Room 101',
    capacity: Number(classData.capacity || 35),
    class_teacher: classData.class_teacher || classData.classTeacher || 'Staff Faculty',
    schedule: classData.schedule || 'Mon - Fri, 8:00 AM - 3:00 PM',
  };

  const { data, error } = await supabase
    .from('classes')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return normalizeClass(data);
}

/**
 * ATTENDANCE API
 */
export async function getAttendance(date = new Date().toISOString().split('T')[0]) {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return { data: initialAttendance, fromMock: true, error };
    }
    return { data: data.map(normalizeAttendance), fromMock: false };
  } catch (err) {
    return { data: initialAttendance, fromMock: true, error: err };
  }
}

export async function updateAttendance(id, status) {
  const { data, error } = await supabase
    .from('attendance')
    .update({ status })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
}

/**
 * EXAMS & MARKS API
 */
const FASTAPI_BASE = getApiBaseUrl();

/**
 * Safely format a token into standard Authorization Bearer header format.
 * Strips any pre-existing "Bearer" prefix (including accidental duplicate "Bearer Bearer ...")
 * and returns exactly one "Bearer <token>" or null if no token is available.
 */
export function formatBearerToken(token) {
  if (!token || typeof token !== 'string') return null;
  const clean = token.trim().replace(/^(Bearer\s+)+/i, '').trim();
  return clean ? `Bearer ${clean}` : null;
}

/**
 * Shared authentication header helper for examination & school service APIs.
 * Guarantees exactly one "Bearer <token>" in the Authorization header.
 */
export function getExamAuthHeaders(tokenOverride = null) {
  const token = tokenOverride || (typeof localStorage !== 'undefined' ? localStorage.getItem('oakridge_auth_token') : null);
  const headers = { 'Content-Type': 'application/json' };
  const authHeader = formatBearerToken(token);
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  return headers;
}

export async function fetchExaminations(filters = {}) {
  const params = new URLSearchParams();
  if (filters.academic_year) params.append('academic_year', filters.academic_year);
  if (filters.class_id) params.append('class_id', filters.class_id);
  if (filters.section && filters.section !== 'All') params.append('section', filters.section);
  if (filters.exam_type && filters.exam_type !== 'All') params.append('exam_type', filters.exam_type);
  if (filters.subject && filters.subject !== 'All') params.append('subject', filters.subject);
  if (filters.status && filters.status !== 'All') params.append('status', filters.status);

  const res = await fetch(`${FASTAPI_BASE}/examinations/?${params.toString()}`, {
    headers: getExamAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch examinations' }));
    throw new Error(err.detail || 'Failed to fetch examinations');
  }
  return await res.json();
}

export async function createExamRecord(payload) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/`, {
    method: 'POST',
    headers: getExamAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create examination' }));
    throw new Error(err.detail || 'Failed to create examination');
  }
  return await res.json();
}

export async function updateExamRecord(examId, payload) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/${examId}`, {
    method: 'PUT',
    headers: getExamAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update examination' }));
    throw new Error(err.detail || 'Failed to update examination');
  }
  return await res.json();
}

export async function deleteExamRecord(examId) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/${examId}`, {
    method: 'DELETE',
    headers: getExamAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete examination' }));
    throw new Error(err.detail || 'Failed to delete examination');
  }
  return await res.json();
}

export async function lockExamRecord(examId) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/${examId}/lock`, {
    method: 'POST',
    headers: getExamAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to lock examination' }));
    throw new Error(err.detail || 'Failed to lock examination');
  }
  return await res.json();
}

export async function publishExamRecord(examId) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/${examId}/publish`, {
    method: 'POST',
    headers: getExamAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to publish examination' }));
    throw new Error(err.detail || 'Failed to publish examination');
  }
  return await res.json();
}

export async function reopenExamRecord(examId) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/${examId}/reopen`, {
    method: 'POST',
    headers: getExamAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to reopen examination' }));
    throw new Error(err.detail || 'Failed to reopen examination');
  }
  return await res.json();
}

export async function fetchExamMarks(examId) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/${examId}/marks`, {
    headers: getExamAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch exam marks' }));
    throw new Error(err.detail || 'Failed to fetch exam marks');
  }
  return await res.json();
}

export async function saveSingleMark(examId, payload) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/${examId}/marks`, {
    method: 'POST',
    headers: getExamAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to record student mark' }));
    throw new Error(err.detail || 'Failed to record student mark');
  }
  return await res.json();
}

export async function bulkSaveMarks(examId, marksList) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/${examId}/bulk-marks`, {
    method: 'POST',
    headers: getExamAuthHeaders(),
    body: JSON.stringify({ marks: marksList })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to bulk save marks' }));
    throw new Error(err.detail || 'Failed to bulk save marks');
  }
  return await res.json();
}

export async function fetchExamResultsSummary(examId) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/${examId}/results`, {
    headers: getExamAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch results summary' }));
    throw new Error(err.detail || 'Failed to fetch results summary');
  }
  return await res.json();
}

export async function fetchExamReportCards(examId, studentId = null) {
  const url = studentId
    ? `${FASTAPI_BASE}/examinations/${examId}/report-cards?student_id=${studentId}`
    : `${FASTAPI_BASE}/examinations/${examId}/report-cards`;
  const res = await fetch(url, { headers: getExamAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load report cards' }));
    throw new Error(err.detail || 'Failed to load report cards');
  }
  return await res.json();
}

export async function fetchSingleStudentReportCards(studentId, tokenOverride = null) {
  const res = await fetch(`${FASTAPI_BASE}/examinations/student/${studentId}/report-card`, {
    headers: getExamAuthHeaders(tokenOverride)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load student report card' }));
    throw new Error(err.detail || 'Failed to load student report card');
  }
  return await res.json();
}

export async function fetchGradingRules() {
  const res = await fetch(`${FASTAPI_BASE}/examinations/grading-rules`, {
    headers: getExamAuthHeaders()
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function fetchMarksAuditLogs(examId = null) {
  const url = examId
    ? `${FASTAPI_BASE}/examinations/audit-logs?examination_id=${examId}`
    : `${FASTAPI_BASE}/examinations/audit-logs`;
  const res = await fetch(url, { headers: getExamAuthHeaders() });
  if (!res.ok) return [];
  return await res.json();
}

export async function getExams() {
  try {
    const res = await fetch(`${FASTAPI_BASE}/examinations/`, {
      headers: getExamAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { data: data.map(normalizeExam), fromMock: false };
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from('examinations')
      .select('*')
      .order('id', { ascending: false });

    if (error || !data || data.length === 0) {
      return { data: initialExams, fromMock: true, error };
    }
    return { data: data.map(normalizeExam), fromMock: false };
  } catch (err) {
    return { data: initialExams, fromMock: true, error: err };
  }
}

export async function createExam(examData) {
  try {
    const res = await createExamRecord(examData);
    return normalizeExam(res);
  } catch {}

  const payload = {
    exam_code: examData.exam_code || examData.examCode || `EXM-${Date.now().toString().slice(-3)}`,
    name: examData.name,
    class_name: examData.class_name || examData.class || 'Grade 10',
    subject: examData.subject,
    exam_date: examData.exam_date || examData.date || new Date().toISOString().split('T')[0],
    time_slot: examData.time_slot || examData.time || '09:00 AM - 12:00 PM',
    total_marks: Number(examData.total_marks || examData.totalMarks || 100),
    passing_marks: Number(examData.passing_marks || examData.passingMarks || 40),
    status: examData.status || 'Upcoming',
  };

  const { data, error } = await supabase
    .from('examinations')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return normalizeExam(data);
}

export async function getMarks() {
  try {
    // 1. Try FastAPI backend marks endpoint
    try {
      const backendRes = await fetch(`${FASTAPI_BASE}/examinations/marks`, {
        headers: getExamAuthHeaders()
      });
      if (backendRes.ok) {
        const data = await backendRes.json();
        if (Array.isArray(data) && data.length > 0) {
          return { data: data.map(normalizeMark), fromMock: false };
        }
      }
    } catch {
      // fallback to Supabase or mock
    }

    // 2. Try Supabase with relational fields
    const { data, error } = await supabase
      .from('marks')
      .select('*, students(id, student_id, name, roll_number), examinations(id, name, subject, total_marks)')
      .order('id', { ascending: false });

    if (error || !data || data.length === 0) {
      return { data: initialMarks.map(normalizeMark), fromMock: true, error };
    }
    return { data: data.map(normalizeMark), fromMock: false };
  } catch (err) {
    return { data: initialMarks.map(normalizeMark), fromMock: true, error: err };
  }
}

/**
 * FEES API
 */
export async function getFees() {
  try {
    const { data, error } = await supabase
      .from('fee_invoices')
      .select('*')
      .order('id', { ascending: false });

    if (error || !data || data.length === 0) {
      return { data: initialFees, fromMock: true, error };
    }
    return { data: data.map(normalizeFee), fromMock: false };
  } catch (err) {
    return { data: initialFees, fromMock: true, error: err };
  }
}

export async function createFeePayment(feeData) {
  const payload = {
    invoice_number: feeData.invoice_number || feeData.id || `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
    student_name: feeData.student_name || feeData.studentName,
    grade: feeData.grade || 'Grade 10',
    fee_type: feeData.fee_type || feeData.type || 'Term Tuition Fee',
    amount: Number(feeData.amount),
    due_date: feeData.due_date || feeData.dueDate || new Date().toISOString().split('T')[0],
    paid_date: new Date().toISOString().split('T')[0],
    payment_method: feeData.payment_method || feeData.paymentMethod || 'Credit Card',
    status: 'Paid',
    notes: feeData.notes || 'Settled via portal',
  };

  const { data, error } = await supabase
    .from('fee_invoices')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return normalizeFee(data);
}

/**
 * NOTICES & ACTIVITIES
 */
export async function getNotices() {
  try {
    const { data, error } = await supabase
      .from('school_notices')
      .select('*')
      .order('id', { ascending: false });

    if (error || !data || data.length === 0) {
      return { data: initialNotices, fromMock: true };
    }
    return { data, fromMock: false };
  } catch {
    return { data: initialNotices, fromMock: true };
  }
}

export async function getActivities() {
  try {
    const { data, error } = await supabase
      .from('recent_activities')
      .select('*')
      .order('id', { ascending: false });

    if (error || !data || data.length === 0) {
      return { data: initialRecentActivities, fromMock: true };
    }
    return { data, fromMock: false };
  } catch {
    return { data: initialRecentActivities, fromMock: true };
  }
}

export async function logActivity(action, detail, type = 'system') {
  try {
    await supabase.from('recent_activities').insert([
      {
        action,
        detail,
        time: 'Just now',
        type,
      },
    ]);
  } catch (err) {
    console.warn('[Supabase] logActivity warning:', err);
  }
}
