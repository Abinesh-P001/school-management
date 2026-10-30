import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  initialSchoolInfo,
  initialStudents,
  initialTeachers,
  initialClasses,
  initialAttendance,
  timetableSchedule,
  initialExams,
  initialMarks,
  initialFees,
  initialNotices,
  initialRecentActivities
} from '../data/mockData';
import { supabase, signInWithEmail, signUpWithEmail, signOutUser, getSession } from '../supabaseClient';
import * as schoolService from '../services/schoolService';
import { getApiBaseUrl } from '../config/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Navigation & Role State
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(() => {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('oakridge_auth_token') : '';
    return raw ? raw.trim().replace(/^(Bearer\s+)+/i, '').trim() : '';
  });

  const storeCleanToken = useCallback((token) => {
    const clean = token ? String(token).trim().replace(/^(Bearer\s+)+/i, '').trim() : '';
    setAuthToken(clean);
    if (typeof localStorage !== 'undefined') {
      if (clean) {
        localStorage.setItem('oakridge_auth_token', clean);
      } else {
        localStorage.removeItem('oakridge_auth_token');
      }
    }
    return clean;
  }, []);

  // Entities State
  const [schoolInfo, setSchoolInfo] = useState(initialSchoolInfo);
  const [students, setStudents] = useState(initialStudents);
  const [teachers, setTeachers] = useState(initialTeachers);
  const [classes, setClasses] = useState(initialClasses);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [exams, setExams] = useState(initialExams);
  const [marks, setMarks] = useState(initialMarks);
  const [fees, setFees] = useState(initialFees);
  const [notices, setNotices] = useState(initialNotices);
  const [recentActivities, setRecentActivities] = useState(initialRecentActivities);
  const [teacherAssignments, setTeacherAssignments] = useState({
    mentorship_class: null,
    teaching_assignments: [],
    authorized_classes: []
  });

  // Async / Supabase Connection State
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('oakridge_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [searchGlobal, setSearchGlobal] = useState('');
  const [toast, setToast] = useState(null);

  // Parent Portal & Announcements State
  const [parentProfile, setParentProfile] = useState(null);
  const [parentChildren, setParentChildren] = useState([]);
  const [activeChild, setActiveChild] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('oakridge_sidebar_collapsed', String(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Helper to resolve title & avatar based on role
  const getRoleMetadata = (role) => {
    const r = (role || 'student').toLowerCase();

    if (r === 'teacher') {
      return {
        role: 'Teacher',
        title: 'Senior Academic Faculty',
        avatar:
          'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
      };
    }

    if (r === 'principal' || r === 'admin') {
      return {
        role: 'Admin',
        title: 'School Principal & Chief Admin',
        avatar:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      };
    }

    if (r === 'parent') {
      return {
        role: 'Parent',
        title: 'Parent & Guardian Portal',
        avatar:
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      };
    }

    return {
      role: 'Student',
      title: 'Student Portal',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
  };

  // Find linked student record for authenticated student
  const currentStudent = students.find((s) => {
    if (!currentUser) return false;
    const matchId = currentUser.id && (
      String(s.user_id) === String(currentUser.id) ||
      String(s.userId) === String(currentUser.id) ||
      String(s.id) === String(currentUser.id)
    );
    const matchEmail = currentUser.email && s.email && s.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase();
    const matchName = currentUser.name && s.name && s.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
    return matchId || matchEmail || matchName;
  }) || null;

  // Find linked teacher record for authenticated teacher
  const currentTeacher = teachers.find((t) => {
    if (!currentUser) return false;
    const matchId = currentUser.id && (
      String(t.user_id) === String(currentUser.id) ||
      String(t.userId) === String(currentUser.id) ||
      String(t.id) === String(currentUser.id)
    );
    const matchEmail = currentUser.email && t.email && t.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase();
    const matchName = currentUser.name && t.name && t.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
    return matchId || matchEmail || matchName;
  }) || null;

  // Load teacher assignments overview from FastAPI
  const loadTeacherAssignments = useCallback(async (tokenOverride) => {
    const token = tokenOverride || authToken || localStorage.getItem('oakridge_auth_token');
    if (!token) return null;
    try {
      const backendBase = getApiBaseUrl();
      const res = await fetch(`${backendBase}/assignments/my-assignments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeacherAssignments(data);
        return data;
      }
    } catch (err) {
      console.warn('[Teacher Assignments] Load warning:', err);
    }
    return null;
  }, [authToken]);

  // Load parent profile & linked verified children from FastAPI
  const loadParentData = useCallback(async (tokenOverride) => {
    const token = tokenOverride || authToken || localStorage.getItem('oakridge_auth_token');
    if (!token) return null;
    try {
      const backendBase = getApiBaseUrl();
      const res = await fetch(`${backendBase}/parent/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setParentProfile(data);
        const children = data.children || [];
        setParentChildren(children);
        if (children.length > 0) {
          setActiveChild((prev) => {
            if (prev && children.some(c => c.id === prev.id)) return prev;
            return children[0];
          });
        }
        return data;
      }
    } catch (err) {
      console.warn('[Parent Portal] Load warning:', err);
    }
    return null;
  }, [authToken]);

  // Load announcements & unread count
  const loadAnnouncements = useCallback(async (tokenOverride) => {
    const token = tokenOverride || authToken || localStorage.getItem('oakridge_auth_token');
    if (!token) return [];
    try {
      const backendBase = getApiBaseUrl();

      const [annRes, countRes] = await Promise.all([
        fetch(`${backendBase}/announcements`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${backendBase}/announcements/unread-count`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData);
      }
      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadAnnouncementsCount(countData.unread_count || 0);
      }
    } catch (err) {
      console.warn('[Announcements] Load warning:', err);
    }
    return [];
  }, [authToken]);

  // Mark announcement as read
  const markAnnouncementAsRead = useCallback(async (announcementId) => {
    const token = authToken || localStorage.getItem('oakridge_auth_token');
    if (!token) return;
    try {
      const backendBase = getApiBaseUrl();
      const res = await fetch(`${backendBase}/announcements/${announcementId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAnnouncements(prev => prev.map(a => a.id === announcementId ? { ...a, is_read: true } : a));
        setUnreadAnnouncementsCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.warn('[Announcement Read] Error:', err);
    }
  }, [authToken]);

  // Fetch all entities from Supabase
const loadSupabaseData = useCallback(async () => {
  setIsSupabaseLoading(true);
  try {
    const [
      studentsRes,
      teachersRes,
      classesRes,
      attendanceRes,
      examsRes,
      marksRes,
      feesRes,
      noticesRes,
      activitiesRes
    ] = await Promise.all([
      schoolService.getStudents(),
      schoolService.getTeachers(),
      schoolService.getClasses(),
      schoolService.getAttendance(),
      schoolService.getExams(),
      schoolService.getMarks(),
      schoolService.getFees(),
      schoolService.getNotices(),
      schoolService.getActivities()
    ]);

    if (studentsRes.data) setStudents(studentsRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    if (attendanceRes.data) setAttendance(attendanceRes.data);
    if (examsRes.data) setExams(examsRes.data);
    if (marksRes.data) setMarks(marksRes.data);
    if (feesRes.data) setFees(feesRes.data);
    if (noticesRes.data) setNotices(noticesRes.data);
    if (activitiesRes.data) setRecentActivities(activitiesRes.data);

    const anyFromMock = studentsRes.fromMock || teachersRes.fromMock || classesRes.fromMock;
    setIsSupabaseConnected(!anyFromMock);
  } catch (err) {
    console.warn('[Supabase] loadSupabaseData error:', err);
  } finally {
    setIsSupabaseLoading(false);
  }
}, []);

// Resolve trusted user profile from Supabase profiles table
const resolveUserProfile = async (user) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile && profile.role) {
      return {
        role: profile.role,
        name: profile.full_name || user.email.split('@')[0]
      };
    }
  } catch (err) {
    // profile table might not be loaded yet
  }

  const meta = user.user_metadata || {};
  return {
    role: meta.role || 'student',
    name: meta.full_name || user.email.split('@')[0]
  };
};

  // Initialize Supabase Auth & Backend Session & Data on Mount
  useEffect(() => {
    let isMounted = true;

    // Check existing Supabase session
    getSession().then(async ({ data: { session } }) => {
      if (session?.user && isMounted) {
        const { role: trustedRole, name: trustedName } = await resolveUserProfile(session.user);
        const normalizedRole = (trustedRole || 'student').toLowerCase() === 'admin'
          ? 'Admin'
          : (trustedRole || '').toLowerCase() === 'teacher'
          ? 'Teacher'
          : (trustedRole || '').toLowerCase() === 'parent'
          ? 'Parent'
          : 'Student';

        const { title, avatar } = getRoleMetadata(normalizedRole, trustedName);
        setCurrentUser({
          id: session.user.id,
          name: trustedName,
          role: normalizedRole,
          email: session.user.email,
          avatar,
          title
        });
        setIsAuthenticated(true);
        if (session.access_token) {
          storeCleanToken(session.access_token);
        }
        if (normalizedRole === 'Teacher') {
          loadTeacherAssignments(session.access_token);
        } else if (normalizedRole === 'Parent') {
          loadParentData(session.access_token);
          loadAnnouncements(session.access_token);
        }
      } else {
        // Fallback: Check saved FastAPI JWT Bearer token
        const storedToken = localStorage.getItem('oakridge_auth_token');
        if (storedToken && isMounted) {
          const backendBase = getApiBaseUrl();
          fetch(`${backendBase}/auth/me`, {
            headers: { 'Authorization': schoolService.formatBearerToken(storedToken) }
          })
            .then(async (res) => {
              if (res.ok && isMounted) {
                const userData = await res.json();
                const normalizedRole = userData.role === 'admin'
                  ? 'Admin'
                  : userData.role === 'teacher'
                  ? 'Teacher'
                  : userData.role === 'parent'
                  ? 'Parent'
                  : 'Student';
                const { title, avatar } = getRoleMetadata(normalizedRole, userData.full_name);
                setCurrentUser({
                  id: userData.id,
                  name: userData.full_name,
                  role: normalizedRole,
                  email: userData.email,
                  avatar,
                  title
                });
                setIsAuthenticated(true);
                setAuthToken(storedToken);
                if (normalizedRole === 'Teacher') {
                  loadTeacherAssignments(storedToken);
                } else if (normalizedRole === 'Parent') {
                  loadParentData(storedToken);
                  loadAnnouncements(storedToken);
                }
              } else if (res.status === 401 && isMounted) {
                // Token expired or invalid: clear session state cleanly
                localStorage.removeItem('oakridge_auth_token');
                setAuthToken('');
                setCurrentUser(null);
                setIsAuthenticated(false);
              }
            })
            .catch(() => {});
        }
      }
    });

  // Listen to Supabase Auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT' && isMounted) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setAuthToken('');
      localStorage.removeItem('oakridge_auth_token');
      return;
    }

    if (session?.user && isMounted) {
      const { role: trustedRole, name: trustedName } = await resolveUserProfile(session.user);
      const normalizedRole = (trustedRole || 'student').toLowerCase() === 'admin'
        ? 'Admin'
        : (trustedRole || '').toLowerCase() === 'teacher'
        ? 'Teacher'
        : (trustedRole || '').toLowerCase() === 'parent'
        ? 'Parent'
        : 'Student';

      const { title, avatar } = getRoleMetadata(normalizedRole, trustedName);
      setCurrentUser({
        id: session.user.id,
        name: trustedName,
        role: normalizedRole,
        email: session.user.email,
        avatar,
        title
      });
      setIsAuthenticated(true);
      if (session.access_token) {
        storeCleanToken(session.access_token);
      }
    }
  });

  // Initial data fetch
  loadSupabaseData();

  return () => {
    isMounted = false;
    subscription?.unsubscribe();
  };
}, [loadSupabaseData]);

// Add Student (FastAPI backend with Supabase sync & optimistic update)
const addStudent = async (studentData) => {
  setIsSupabaseLoading(true);
  try {
    const token = authToken || localStorage.getItem('oakridge_auth_token');
    const backendBase = getApiBaseUrl();

    // 1. Try FastAPI Enrollment endpoint (validates teacher mentorship/permission & uniqueness)
    if (token) {
      try {
        const matchingClass = classes.find(c => 
          c.id === Number(studentData.class_id) || 
          (c.name === (studentData.grade || studentData.className) && c.section === studentData.section)
        );

        const res = await fetch(`${backendBase}/students/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: studentData.name || studentData.fullName,
            admission_number: studentData.admissionNumber || studentData.admission_number,
            student_id: studentData.studentId || studentData.student_id,
            email: studentData.email || undefined,
            gender: studentData.gender || 'Other',
            guardian_name: studentData.guardianName || studentData.guardian_name || 'Guardian',
            guardian_phone: studentData.guardianPhone || studentData.guardian_phone || '+1 555-0000',
            class_id: studentData.class_id ? Number(studentData.class_id) : (matchingClass ? matchingClass.id : null),
            status: studentData.status || 'Active',
            fees_status: studentData.feesStatus || studentData.fees_status || 'Pending'
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server rejected student registration (${res.status})`);
        }

        const createdBackend = await res.json();
        const normalized = schoolService.normalizeStudent({
          ...createdBackend,
          grade: createdBackend.classroom?.name || studentData.grade || studentData.className || 'Grade 10',
          section: createdBackend.classroom?.section || studentData.section || 'A'
        });

        setStudents(prev => [normalized, ...prev]);

        const newActivity = {
          action: "Student Enrolled",
          detail: `${normalized.name} admitted to ${normalized.grade}-${normalized.section}`,
          time: "Just now",
          type: "student"
        };
        setRecentActivities(prev => [{ id: Date.now(), ...newActivity }, ...prev]);
        showToast(`Student ${normalized.name} registered successfully!`, 'success');
        return { ...normalized, invitation_link: createdBackend.invitation_link };
      } catch (backendErr) {
        // If it was a 403 Forbidden or 400 Bad Request from backend, don't silently swallow it!
        if (backendErr.message.includes('authorized') || backendErr.message.includes('already exists') || backendErr.message.includes('rejected')) {
          showToast(backendErr.message, 'error');
          throw backendErr;
        }
        console.warn('[FastAPI] addStudent fallback to Supabase:', backendErr.message);
      }
    }

    // 2. Supabase Fallback
    const created = await schoolService.createStudent(studentData);
    setStudents(prev => [created, ...prev]);

    const newActivity = {
      action: "Student Enrolled",
      detail: `${created.name} admitted to ${created.grade || 'Grade 10'}-${created.section || 'A'}`,
      time: "Just now",
      type: "student"
    };
    setRecentActivities(prev => [{ id: Date.now(), ...newActivity }, ...prev]);
    await schoolService.logActivity(newActivity.action, newActivity.detail, newActivity.type);

    showToast(`Student ${created.name} enrolled in Supabase successfully!`, 'success');
    return created;
  } catch (err) {
    console.error('[Student Registration] error:', err);
    throw err;
  } finally {
    setIsSupabaseLoading(false);
  }
};

// Update Student (FastAPI backend with Supabase sync & optimistic update)
const updateStudent = async (studentId, studentData) => {
  setIsSupabaseLoading(true);
  try {
    const token = authToken || localStorage.getItem('oakridge_auth_token');
    const backendBase = getApiBaseUrl();

    if (token) {
      try {
        const matchingClass = classes.find(c => 
          c.id === Number(studentData.class_id) || 
          (c.name === (studentData.grade || studentData.className) && c.section === studentData.section)
        );

        const res = await fetch(`${backendBase}/students/${studentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: studentData.name || studentData.fullName,
            email: studentData.email || undefined,
            gender: studentData.gender || undefined,
            guardian_name: studentData.guardianName || studentData.guardian_name,
            guardian_phone: studentData.guardianPhone || studentData.guardian_phone,
            class_id: studentData.class_id ? Number(studentData.class_id) : (matchingClass ? matchingClass.id : undefined),
            status: studentData.status || undefined,
            fees_status: studentData.feesStatus || studentData.fees_status || undefined
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server rejected update (${res.status})`);
        }

        const updatedBackend = await res.json();
        const normalized = schoolService.normalizeStudent({
          ...updatedBackend,
          grade: updatedBackend.classroom?.name || studentData.grade || studentData.className,
          section: updatedBackend.classroom?.section || studentData.section
        });

        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...normalized } : s));
        showToast(`Student ${normalized.name} updated successfully!`, 'success');
        return normalized;
      } catch (backendErr) {
        if (backendErr.message.includes('authorized') || backendErr.message.includes('already exists') || backendErr.message.includes('rejected')) {
          showToast(backendErr.message, 'error');
          throw backendErr;
        }
        console.warn('[FastAPI] updateStudent fallback to Supabase:', backendErr.message);
      }
    }

    // Supabase Fallback
    const updated = await schoolService.updateStudent(studentId, studentData);
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updated } : s));
    showToast(`Student updated successfully!`, 'success');
    return updated;
  } catch (err) {
    console.error('[Student Update] error:', err);
    throw err;
  } finally {
    setIsSupabaseLoading(false);
  }
};

// Delete Student
const deleteStudent = async (id, name) => {
  try {
    if (typeof id === 'number') {
      await schoolService.deleteStudent(id);
    }
    setStudents(prev => prev.filter(s => s.id !== id));
    showToast(`${name || 'Student'} record deleted`, 'info');
  } catch (err) {
    console.error('[Supabase] deleteStudent error:', err);
    setStudents(prev => prev.filter(s => s.id !== id));
    showToast(`${name || 'Student'} deleted from local view`, 'info');
  }
};

// Add Teacher
const addTeacher = async (teacherData) => {
  setIsSupabaseLoading(true);
  try {
    const created = await schoolService.createTeacher(teacherData);
    setTeachers(prev => [created, ...prev]);
    showToast(`Teacher ${created.name} registered in Supabase!`, 'success');
    return created;
  } catch (err) {
    console.error('[Supabase] addTeacher error:', err);
    const fallback = {
      id: `TCH-${200 + teachers.length + 1}`,
      classesAssigned: [teacherData.gradeAssigned || "Grade 10-A"],
      salaryStatus: "Processed",
      status: "Active",
      avatar: `https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80`,
      ...teacherData
    };
    setTeachers(prev => [fallback, ...prev]);
    showToast(`Teacher registered locally (${err.message})`, 'info');
    return fallback;
  } finally {
    setIsSupabaseLoading(false);
  }
};

// Add Class
const addClass = async (classData) => {
  setIsSupabaseLoading(true);
  try {
    const created = await schoolService.createClass(classData);
    setClasses(prev => [...prev, created]);
    showToast(`Class ${created.name} - Sec ${created.section} created in Supabase!`, 'success');
    return created;
  } catch (err) {
    console.error('[Supabase] addClass error:', err);
    const fallback = {
      id: `CLS-${100 + classes.length + 1}`,
      totalStudents: 0,
      schedule: "Mon - Fri, 8:00 AM - 3:00 PM",
      ...classData
    };
    setClasses(prev => [...prev, fallback]);
    showToast(`Class created locally (${err.message})`, 'info');
    return fallback;
  } finally {
    setIsSupabaseLoading(false);
  }
};

// Record Fee Payment
const recordFeePayment = async (feeData) => {
  setIsSupabaseLoading(true);
  try {
    const created = await schoolService.createFeePayment(feeData);
    setFees(prev => [created, ...prev]);
    setStudents(prev => prev.map(s => s.name === feeData.studentName ? { ...s, feesStatus: 'Paid' } : s));
    showToast(`Payment of ₹${created.amount} recorded in Supabase!`, 'success');
    return created;
  } catch (err) {
    console.error('[Supabase] recordFeePayment error:', err);
    const fallback = {
      id: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      paidDate: new Date().toISOString().split('T')[0],
      status: "Paid",
      ...feeData
    };
    setFees(prev => [fallback, ...prev]);
    setStudents(prev => prev.map(s => s.name === feeData.studentName ? { ...s, feesStatus: 'Paid' } : s));
    showToast(`Payment of ₹${fallback.amount} recorded locally`, 'info');
    return fallback;
  } finally {
    setIsSupabaseLoading(false);
  }
};

// Update Attendance Status
const updateAttendanceStatus = async (recordId, newStatus) => {
  try {
    if (typeof recordId === 'number') {
      await schoolService.updateAttendance(recordId, newStatus);
    }
    setAttendance(prev => prev.map(a => a.id === recordId ? { ...a, status: newStatus } : a));
    showToast(`Attendance updated to ${newStatus}`);
  } catch (err) {
    setAttendance(prev => prev.map(a => a.id === recordId ? { ...a, status: newStatus } : a));
    showToast(`Attendance updated to ${newStatus}`);
  }
};

// Add Exam
const addExam = async (examData) => {
  setIsSupabaseLoading(true);
  try {
    const created = await schoolService.createExam(examData);
    setExams(prev => [created, ...prev]);
    showToast(`Exam schedule for ${created.subject} saved in Supabase!`, 'success');
    return created;
  } catch (err) {
    console.error('[Supabase] addExam error:', err);
    const fallback = {
      id: `EXM-${300 + exams.length + 1}`,
      status: "Upcoming",
      ...examData
    };
    setExams(prev => [...prev, fallback]);
    showToast(`Exam schedule added locally`, 'info');
    return fallback;
  } finally {
    setIsSupabaseLoading(false);
  }
};

// Universal Portal Authentication (Admin, Teacher, Student, Parent)
const handleLogin = async (email, password) => {
  setIsSupabaseLoading(true);

  const rawInput = (email || '').trim().toLowerCase();
  let resolvedEmail = rawInput;
  if (rawInput === 'admin' || rawInput === 'principal' || rawInput === 'superadmin' || rawInput === 'administrator') {
    resolvedEmail = 'admin@oakridge.edu';
  } else if (rawInput === 'teacher' || rawInput === 'faculty') {
    resolvedEmail = 'e.vance@oakridge.edu';
  } else if (rawInput === 'student') {
    resolvedEmail = 'maya.lin@oakridge.edu';
  } else if (rawInput === 'parent' || rawInput === 'guardian') {
    resolvedEmail = 'parent.chen@oakridge.edu';
  }

  // 1. Authenticate with FastAPI Backend (Direct Institutional API)
  let serverDetail = '';
  let supabaseErrorMsg = '';
  try {
    const backendBase = getApiBaseUrl();

    const res = await fetch(`${backendBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resolvedEmail, password: password })
    });

    if (res.ok) {
      const tokenData = await res.json();
      const token = storeCleanToken(tokenData.access_token);

      const normalizedRole = tokenData.role === 'admin'
        ? 'Admin'
        : tokenData.role === 'teacher'
        ? 'Teacher'
        : tokenData.role === 'parent'
        ? 'Parent'
        : 'Student';

      const resolvedMeta = getRoleMetadata(normalizedRole, tokenData.full_name);
      setCurrentUser({
        id: tokenData.user_id,
        name: tokenData.full_name,
        role: normalizedRole,
        email: tokenData.email,
        avatar: resolvedMeta.avatar,
        title: resolvedMeta.title
      });
      setIsAuthenticated(true);
      setCurrentPage('dashboard');
      showToast(`Welcome back, ${tokenData.full_name}! (${normalizedRole} Portal)`);
      loadSupabaseData();
      if (normalizedRole === 'Teacher') {
        loadTeacherAssignments(token);
      } else if (normalizedRole === 'Parent') {
        loadParentData(token);
        loadAnnouncements(token);
      }
      setIsSupabaseLoading(false);
      return { success: true };
    } else {
      const errJson = await res.json().catch(() => ({}));
      if (typeof errJson.detail === 'string') {
        serverDetail = errJson.detail;
      } else if (Array.isArray(errJson.detail)) {
        serverDetail = errJson.detail.map(d => d.msg).join(', ');
      }
    }
  } catch (err) {
    console.warn('[FastAPI Auth notice]:', err.message);
    serverDetail = `Backend server unreachable (${err.message}). Please verify FastAPI is running at ${getApiBaseUrl()}.`;
  }

  // 2. Fallback to Supabase Auth
  try {
    const { data, error } = await signInWithEmail(resolvedEmail, password);
    if (!error && data?.user) {
      const user = data.user;
      const token = storeCleanToken(data.session?.access_token || '');

      // Verify server-side trusted profile
      const { role: trustedRole, name: trustedName } = await resolveUserProfile(user);
      const normalizedRole = (trustedRole || 'student').toLowerCase() === 'admin'
        ? 'Admin'
        : (trustedRole || '').toLowerCase() === 'teacher'
        ? 'Teacher'
        : (trustedRole || '').toLowerCase() === 'parent'
        ? 'Parent'
        : 'Student';

      const resolvedMeta = getRoleMetadata(normalizedRole, trustedName);
      setCurrentUser({
        id: user.id,
        name: trustedName,
        role: normalizedRole,
        email: user.email,
        avatar: resolvedMeta.avatar,
        title: resolvedMeta.title
      });
      setIsAuthenticated(true);
      setCurrentPage('dashboard');
      showToast(`Welcome back, ${trustedName}! (${normalizedRole} Portal)`);
      loadSupabaseData();
      if (normalizedRole === 'Teacher') {
        loadTeacherAssignments(token);
      } else if (normalizedRole === 'Parent') {
        loadParentData(token);
        loadAnnouncements(token);
      }
      setIsSupabaseLoading(false);
      return { success: true };
    } else if (error) {
      supabaseErrorMsg = error.message;
    }
  } catch (err) {
    console.warn('[Supabase Auth notice]:', err.message);
  }

  // 3. Authentication Rejected
  setIsSupabaseLoading(false);
  const failureReason = serverDetail || supabaseErrorMsg || 'Invalid institutional email or password.';
  showToast(failureReason, 'error');
  return { success: false, error: failureReason };
};

// Set up password from account invitation link
const handleSetupPassword = async (email, newPassword) => {
  setIsSupabaseLoading(true);
  try {
    const backendBase = getApiBaseUrl();

    const res = await fetch(`${backendBase}/auth/setup-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), new_password: newPassword })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Password setup failed.');
    }

    const tokenData = await res.json();
    const token = storeCleanToken(tokenData.access_token);

    const normalizedRole = tokenData.role === 'admin'
      ? 'Admin'
      : tokenData.role === 'teacher'
      ? 'Teacher'
      : tokenData.role === 'parent'
      ? 'Parent'
      : 'Student';

    const resolvedMeta = getRoleMetadata(normalizedRole, tokenData.full_name);
    setCurrentUser({
      id: tokenData.user_id,
      name: tokenData.full_name,
      role: normalizedRole,
      email: tokenData.email,
      avatar: resolvedMeta.avatar,
      title: resolvedMeta.title
    });
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    showToast(`Password configured successfully! Welcome, ${tokenData.full_name}!`);
    loadSupabaseData();
    if (normalizedRole === 'Teacher') {
      loadTeacherAssignments(token);
    } else if (normalizedRole === 'Parent') {
      loadParentData(token);
      loadAnnouncements(token);
    }
    return true;
  } catch (err) {
    showToast(err.message || 'Failed to setup password', 'error');
    throw err;
  } finally {
    setIsSupabaseLoading(false);
  }
};

// Sign Out & Revoke Client Session
const handleLogout = async () => {
  try {
    await signOutUser();
  } catch (err) {
    console.warn('[Supabase] Sign out notice:', err);
  }
  setAuthToken('');
  localStorage.removeItem('oakridge_auth_token');
  setIsAuthenticated(false);
  setCurrentUser(null);
  setCurrentPage('login');
  showToast("Logged out of the portal", "info");
};

// Computed summary stats
const totalStudentsCount = students.length;
const totalTeachersCount = teachers.length;
const totalClassesCount = classes.length;
const pendingFeesSum = fees
  .filter(f => f.status === 'Pending' || f.status === 'Overdue')
  .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

return (
  <AppContext.Provider
    value={{
      currentPage,
      setCurrentPage,
      currentUser,
      setCurrentUser,
      isAuthenticated,
      setIsAuthenticated,
      schoolInfo,
      setSchoolInfo,
      students,
      setStudents,
      teachers,
      setTeachers,
      classes,
      setClasses,
      attendance,
      timetableSchedule,
      exams,
      marks,
      setMarks,
      fees,
      notices,
      recentActivities,
      sidebarOpen,
      setSidebarOpen,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapse,
      searchGlobal,
      setSearchGlobal,
      toast,
      showToast,
      addStudent,
      updateStudent,
      deleteStudent,
      addTeacher,
      addClass,
      recordFeePayment,
      updateAttendanceStatus,
      addExam,
      authToken,
      setAuthToken,
      handleLogin,
      handleLogout,
      handleSetupPassword,
      teacherAssignments,
      loadTeacherAssignments,
      refreshData: loadSupabaseData,
      isSupabaseLoading,
      isSupabaseConnected,
      totalStudentsCount,
      totalTeachersCount,
      totalClassesCount,
      pendingFeesSum,
      currentStudent,
      currentTeacher,
      parentProfile,
      setParentProfile,
      parentChildren,
      setParentChildren,
      activeChild,
      setActiveChild,
      announcements,
      setAnnouncements,
      unreadAnnouncementsCount,
      setUnreadAnnouncementsCount,
      loadParentData,
      loadAnnouncements,
      markAnnouncementAsRead
    }}
  >
    {children}
  </AppContext.Provider>
);
};

export const useApp = () => useContext(AppContext);
