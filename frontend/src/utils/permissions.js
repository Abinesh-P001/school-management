/**
 * Role-Based Access Control (RBAC) Permissions Utility
 */

export const ROLES = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent'
};

export const normalizeRole = (role) => {
  const r = (role || '').toLowerCase();
  if (r === 'admin' || r === 'principal') return ROLES.ADMIN;
  if (r === 'teacher') return ROLES.TEACHER;
  if (r === 'parent') return ROLES.PARENT;
  return ROLES.STUDENT;
};

export const isUserAdmin = (user) => {
  return normalizeRole(user?.role) === ROLES.ADMIN;
};

export const isUserTeacher = (user) => {
  return normalizeRole(user?.role) === ROLES.TEACHER;
};

export const isUserStudent = (user) => {
  return normalizeRole(user?.role) === ROLES.STUDENT;
};

export const isUserParent = (user) => {
  return normalizeRole(user?.role) === ROLES.PARENT;
};

export const isClassAssignedToTeacher = (classId, teacherAssignments, teacherProfile) => {
  if (!classId) return false;
  const numId = Number(classId);

  // 1. Mentorship class
  if (teacherAssignments?.mentorship_class && Number(teacherAssignments.mentorship_class.class_id) === numId) {
    return true;
  }

  // 2. Teaching assignments (Subject teacher)
  if (teacherAssignments?.teaching_assignments?.some(ta => Number(ta.class_id) === numId)) {
    return true;
  }

  // 3. Authorized classes list
  if (teacherAssignments?.authorized_classes?.some(ac => Number(ac.class_id) === numId)) {
    return true;
  }

  // 4. Fallback to profile classesAssigned string/array
  const rawAssigned = teacherProfile?.classesAssigned || teacherProfile?.classes_assigned || [];
  const assignedList = Array.isArray(rawAssigned) ? rawAssigned : String(rawAssigned).split(',');
  const tokens = assignedList.map(t => t.trim().toLowerCase().replace(/\s+/g, '')).filter(Boolean);
  if (tokens.length > 0 && teacherProfile?.classes) {
    const match = teacherProfile.classes.find(c => Number(c.id) === numId);
    if (match) {
      const clsKey = `${match.name || ''}-${match.section || ''}`.toLowerCase().replace(/\s+/g, '');
      return tokens.some(t => t === clsKey || clsKey.includes(t));
    }
  }

  return false;
};

export const canAddStudent = (user, teacherAssignments) => {
  const r = normalizeRole(user?.role);
  if (r === ROLES.ADMIN) return true;
  if (r === ROLES.TEACHER) {
    if (!teacherAssignments) return true;
    const hasMentorClass = Boolean(teacherAssignments?.mentorship_class?.class_id);
    const hasTeachingClass = Boolean(teacherAssignments?.teaching_assignments?.length > 0);
    const hasAuthorizedClass = Boolean(teacherAssignments?.authorized_classes?.length > 0);
    return hasMentorClass || hasTeachingClass || hasAuthorizedClass;
  }
  return false;
};

export const canEditStudent = (user, student, teacherAssignments, teacherProfile) => {
  const r = normalizeRole(user?.role);
  if (r === ROLES.ADMIN) return true;
  if (r === ROLES.TEACHER) {
    if (!student) return true;
    if (student.class_id && isClassAssignedToTeacher(student.class_id, teacherAssignments, teacherProfile)) {
      return true;
    }
    const studentGrade = (student.grade || student.class_name || '').toLowerCase().trim();
    const studentSec = (student.section || '').toLowerCase().trim();
    if (teacherAssignments?.teaching_assignments?.some(ta => 
      (ta.class_name || '').toLowerCase().trim() === studentGrade && (!studentSec || (ta.section || '').toLowerCase().trim() === studentSec)
    )) return true;
    if (teacherAssignments?.mentorship_class) {
      const mc = teacherAssignments.mentorship_class;
      if ((mc.name || mc.class_name || '').toLowerCase().trim() === studentGrade && (!studentSec || (mc.section || '').toLowerCase().trim() === studentSec)) {
        return true;
      }
    }
  }
  return false;
};

export const canEditTimetable = (user, classId, teacherAssignments) => {
  const r = normalizeRole(user?.role);
  if (r === ROLES.ADMIN) return true;
  if (r === ROLES.TEACHER) {
    if (!classId) return true;
    return isClassAssignedToTeacher(classId, teacherAssignments);
  }
  return false;
};

export const canCreateExam = (user, classId, subject, teacherAssignments) => {
  const r = normalizeRole(user?.role);
  if (r === ROLES.ADMIN) return true;
  if (r === ROLES.TEACHER) {
    if (!classId) return true;
    const isAssigned = isClassAssignedToTeacher(classId, teacherAssignments);
    if (!isAssigned) return false;
    if (!subject) return true;
    if (teacherAssignments?.mentorship_class && Number(teacherAssignments.mentorship_class.class_id) === Number(classId)) {
      return true;
    }
    const targetSubj = subject.toLowerCase().trim();
    return teacherAssignments?.teaching_assignments?.some(ta => 
      Number(ta.class_id) === Number(classId) && (ta.subject || '').toLowerCase().trim() === targetSubj
    );
  }
  return false;
};

export const canEditExam = (user, exam, teacherAssignments) => {
  const r = normalizeRole(user?.role);
  if (r === ROLES.ADMIN) return true;
  if (r === ROLES.TEACHER) {
    if (!exam) return true;
    return canCreateExam(user, exam.class_id, exam.subject, teacherAssignments);
  }
  return false;
};

export const canEnterMarks = (user, exam, teacherAssignments) => {
  return canEditExam(user, exam, teacherAssignments);
};

export const canManageAnnouncement = (user, announcement) => {
  const r = normalizeRole(user?.role);
  if (r === ROLES.ADMIN) return true;
  if (r === ROLES.TEACHER) {
    if (!announcement) return true;
    return announcement.created_by === user?.id;
  }
  return false;
};

export const canManageFaculty = (user) => {
  return normalizeRole(user?.role) === ROLES.ADMIN;
};

/**
 * Page permission matrix:
 * Defines which roles can access which page view.
 */
export const PAGE_PERMISSIONS = {
  dashboard: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  timetable: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  exams: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  classes: [ROLES.ADMIN, ROLES.TEACHER],
  attendance: [ROLES.ADMIN, ROLES.TEACHER],
  students: [ROLES.ADMIN, ROLES.TEACHER],
  teachers: [ROLES.ADMIN],
  fees: [ROLES.ADMIN, ROLES.PARENT],
  reports: [ROLES.ADMIN],
  settings: [ROLES.ADMIN],
  users: [ROLES.ADMIN],
  parents: [ROLES.ADMIN],
  announcements: [ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT],
  parent_dashboard: [ROLES.PARENT],
  parent_children: [ROLES.PARENT],
  parent_announcements: [ROLES.PARENT]
};

export const canAccessPage = (user, page) => {
  const role = normalizeRole(user?.role);
  const allowedRoles = PAGE_PERMISSIONS[page];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
};
