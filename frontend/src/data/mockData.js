export const initialSchoolInfo = {
  name: "Oakridge International School",
  tagline: "Empowering Minds, Inspiring Futures",
  code: "OIS-2026-904",
  academicYear: "2025 - 2026",
  address: "450 Academic Boulevard, Silicon Valley, CA 94025",
  email: "admin@oakridge.edu",
  phone: "+1 (555) 328-8900",
  principal: "Dr. Eleanor Vance, Ph.D.",
};

export const initialStats = {
  totalStudents: 1248,
  totalTeachers: 84,
  totalClasses: 36,
  pendingFees: 48500,
  attendanceRate: "96.4%",
  activeExams: 4,
};

export const initialStudents = [
  {
    id: "STU-1001",
    name: "Aria Montgomery",
    email: "aria.m@oakridge.edu",
    grade: "Grade 10",
    section: "A",
    gender: "Female",
    rollNumber: "10A-01",
    guardianName: "Byron Montgomery",
    guardianPhone: "+1 (555) 019-2831",
    admissionDate: "2023-08-15",
    status: "Active",
    feesStatus: "Paid",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    attendance: "98%",
    gpa: "3.92"
  },
  {
    id: "STU-1002",
    name: "Liam Alexander",
    email: "liam.a@oakridge.edu",
    grade: "Grade 10",
    section: "B",
    gender: "Male",
    rollNumber: "10B-04",
    guardianName: "David Alexander",
    guardianPhone: "+1 (555) 234-8712",
    admissionDate: "2023-08-16",
    status: "Active",
    feesStatus: "Pending",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    attendance: "94%",
    gpa: "3.65"
  },
  {
    id: "STU-1003",
    name: "Sophia Chen",
    email: "sophia.c@oakridge.edu",
    grade: "Grade 11",
    section: "A",
    gender: "Female",
    rollNumber: "11A-12",
    guardianName: "Wei Chen",
    guardianPhone: "+1 (555) 876-1209",
    admissionDate: "2022-08-10",
    status: "Active",
    feesStatus: "Paid",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    attendance: "99%",
    gpa: "4.00"
  },
  {
    id: "STU-1004",
    name: "Marcus Rashford Jr.",
    email: "marcus.r@oakridge.edu",
    grade: "Grade 9",
    section: "A",
    gender: "Male",
    rollNumber: "09A-08",
    guardianName: "Marcus Rashford Sr.",
    guardianPhone: "+1 (555) 432-9011",
    admissionDate: "2024-08-18",
    status: "Active",
    feesStatus: "Overdue",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    attendance: "89%",
    gpa: "3.28"
  },
  {
    id: "STU-1005",
    name: "Emma Watson-Kim",
    email: "emma.w@oakridge.edu",
    grade: "Grade 12",
    section: "Science",
    gender: "Female",
    rollNumber: "12S-03",
    guardianName: "Min-Jun Kim",
    guardianPhone: "+1 (555) 341-9988",
    admissionDate: "2021-08-12",
    status: "Active",
    feesStatus: "Paid",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    attendance: "97%",
    gpa: "3.95"
  },
  {
    id: "STU-1006",
    name: "Noah Patel",
    email: "noah.p@oakridge.edu",
    grade: "Grade 8",
    section: "B",
    gender: "Male",
    rollNumber: "08B-15",
    guardianName: "Rajesh Patel",
    guardianPhone: "+1 (555) 781-3450",
    admissionDate: "2025-08-20",
    status: "Active",
    feesStatus: "Pending",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    attendance: "92%",
    gpa: "3.50"
  },
  {
    id: "STU-1007",
    name: "Olivia Brooks",
    email: "olivia.b@oakridge.edu",
    grade: "Grade 11",
    section: "Commerce",
    gender: "Female",
    rollNumber: "11C-07",
    guardianName: "Sarah Brooks",
    guardianPhone: "+1 (555) 902-1144",
    admissionDate: "2022-08-11",
    status: "Suspended",
    feesStatus: "Paid",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    attendance: "81%",
    gpa: "2.90"
  },
  {
    id: "STU-1008",
    name: "Ethan Wright",
    email: "ethan.w@oakridge.edu",
    grade: "Grade 12",
    section: "Arts",
    gender: "Male",
    rollNumber: "12A-11",
    guardianName: "Thomas Wright",
    guardianPhone: "+1 (555) 674-8899",
    admissionDate: "2021-08-14",
    status: "Active",
    feesStatus: "Paid",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    attendance: "95%",
    gpa: "3.78"
  }
];

export const initialTeachers = [
  {
    id: "TCH-201",
    name: "Dr. Robert Langdon",
    email: "r.langdon@oakridge.edu",
    department: "Science",
    subject: "Physics & Astronomy",
    qualification: "Ph.D. in Astrophysics, MIT",
    experience: "12 Years",
    phone: "+1 (555) 345-0981",
    classesAssigned: ["Grade 11-A", "Grade 12-Science"],
    salaryStatus: "Processed",
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "TCH-202",
    name: "Katherine Howard",
    email: "k.howard@oakridge.edu",
    department: "Mathematics",
    subject: "Calculus & Statistics",
    qualification: "M.Sc. Pure Mathematics, Stanford",
    experience: "9 Years",
    phone: "+1 (555) 612-4411",
    classesAssigned: ["Grade 10-A", "Grade 11-A"],
    salaryStatus: "Processed",
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "TCH-203",
    name: "Prof. Arthur Shelby",
    email: "a.shelby@oakridge.edu",
    department: "Humanities",
    subject: "World History & Literature",
    qualification: "M.A. Modern History, Oxford",
    experience: "14 Years",
    phone: "+1 (555) 782-3904",
    classesAssigned: ["Grade 9-A", "Grade 12-Arts"],
    salaryStatus: "Processed",
    status: "Active",
    avatar: null
  },
  {
    id: "TCH-204",
    name: "Clara Oswald",
    email: "c.oswald@oakridge.edu",
    department: "English",
    subject: "English Literature & Creative Writing",
    qualification: "M.A. English, Cambridge",
    experience: "6 Years",
    phone: "+1 (555) 998-3120",
    classesAssigned: ["Grade 8-B", "Grade 10-B"],
    salaryStatus: "Processed",
    status: "Active",
    avatar: null
  },
  {
    id: "TCH-205",
    name: "James Wilson",
    email: "j.wilson@oakridge.edu",
    department: "Computer Science",
    subject: "Software Dev & Robotics",
    qualification: "M.S. Computer Engineering, Berkeley",
    experience: "8 Years",
    phone: "+1 (555) 234-9022",
    classesAssigned: ["Grade 10-A", "Grade 11-A", "Grade 12-Science"],
    salaryStatus: "Pending",
    status: "On Leave",
    avatar: null
  },
  {
    id: "TCH-206",
    name: "Elena Rostova",
    email: "e.rostova@oakridge.edu",
    department: "Fine Arts",
    subject: "Studio Art & Design",
    qualification: "MFA, Rhode Island School of Design",
    experience: "7 Years",
    phone: "+1 (555) 890-4455",
    classesAssigned: ["Grade 9-A", "Grade 12-Arts"],
    salaryStatus: "Processed",
    status: "Active",
    avatar: null
  }
];

export const initialClasses = [
  {
    id: "CLS-101",
    name: "Grade 10",
    section: "A",
    room: "Building B - Room 204",
    classTeacher: "Katherine Howard",
    totalStudents: 32,
    capacity: 35,
    schedule: "Mon - Fri, 8:00 AM - 3:00 PM"
  },
  {
    id: "CLS-102",
    name: "Grade 10",
    section: "B",
    room: "Building B - Room 205",
    classTeacher: "Clara Oswald",
    totalStudents: 30,
    capacity: 35,
    schedule: "Mon - Fri, 8:00 AM - 3:00 PM"
  },
  {
    id: "CLS-103",
    name: "Grade 11",
    section: "A - Science",
    room: "Science Wing - Lab 3",
    classTeacher: "Dr. Robert Langdon",
    totalStudents: 28,
    capacity: 30,
    schedule: "Mon - Fri, 8:00 AM - 3:30 PM"
  },
  {
    id: "CLS-104",
    name: "Grade 11",
    section: "B - Commerce",
    room: "Building C - Room 102",
    classTeacher: "Prof. Arthur Shelby",
    totalStudents: 34,
    capacity: 35,
    schedule: "Mon - Fri, 8:00 AM - 3:00 PM"
  },
  {
    id: "CLS-105",
    name: "Grade 12",
    section: "Science Stream",
    room: "Science Wing - Lecture Hall 1",
    classTeacher: "James Wilson",
    totalStudents: 26,
    capacity: 30,
    schedule: "Mon - Fri, 7:45 AM - 3:30 PM"
  },
  {
    id: "CLS-106",
    name: "Grade 12",
    section: "Arts & Humanities",
    room: "Art Studio - Room 4",
    classTeacher: "Elena Rostova",
    totalStudents: 24,
    capacity: 30,
    schedule: "Mon - Fri, 8:00 AM - 3:00 PM"
  },
  {
    id: "CLS-107",
    name: "Grade 9",
    section: "A",
    room: "Building A - Room 108",
    classTeacher: "Marcus Sterling",
    totalStudents: 33,
    capacity: 35,
    schedule: "Mon - Fri, 8:00 AM - 2:45 PM"
  },
  {
    id: "CLS-108",
    name: "Grade 8",
    section: "B",
    room: "Junior Wing - Room 12",
    classTeacher: "Sarah Jenkins",
    totalStudents: 31,
    capacity: 35,
    schedule: "Mon - Fri, 8:15 AM - 2:30 PM"
  }
];

export const initialAttendance = [
  { id: 1, studentId: "STU-1001", studentName: "Aria Montgomery", class: "Grade 10-A", roll: "10A-01", status: "Present", remarks: "On time" },
  { id: 2, studentId: "STU-1002", studentName: "Liam Alexander", class: "Grade 10-A", roll: "10A-02", status: "Absent", remarks: "Medical appointment" },
  { id: 3, studentId: "STU-1003", studentName: "Sophia Chen", class: "Grade 10-A", roll: "10A-03", status: "Present", remarks: "On time" },
  { id: 4, studentId: "STU-1004", studentName: "Marcus Rashford Jr.", class: "Grade 10-A", roll: "10A-04", status: "Late", remarks: "Traffic delay (15 min)" },
  { id: 5, studentId: "STU-1005", studentName: "Emma Watson-Kim", class: "Grade 10-A", roll: "10A-05", status: "Present", remarks: "On time" },
  { id: 6, studentId: "STU-1006", studentName: "Noah Patel", class: "Grade 10-A", roll: "10A-06", status: "Present", remarks: "On time" },
  { id: 7, studentId: "STU-1007", studentName: "Olivia Brooks", class: "Grade 10-A", roll: "10A-07", status: "Excused", remarks: "School sports meet" },
  { id: 8, studentId: "STU-1008", studentName: "Ethan Wright", class: "Grade 10-A", roll: "10A-08", status: "Present", remarks: "On time" },
];

export const timetableSchedule = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  timeSlots: [
    { time: "08:30 - 09:20", period: "Period 1" },
    { time: "09:25 - 10:15", period: "Period 2" },
    { time: "10:20 - 11:10", period: "Period 3" },
    { time: "11:10 - 11:45", period: "Recess Break" },
    { time: "11:45 - 12:35", period: "Period 4" },
    { time: "12:40 - 01:30", period: "Period 5" },
    { time: "01:35 - 02:25", period: "Period 6" },
  ],
  grid: {
    "Monday": [
      { subject: "Advanced Physics", teacher: "Dr. Robert Langdon", room: "Lab 3", color: "bg-blue-50 text-blue-700 border-blue-200" },
      { subject: "Calculus & Geometry", teacher: "Katherine Howard", room: "Room 204", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      { subject: "World History", teacher: "Prof. Arthur Shelby", room: "Room 102", color: "bg-amber-50 text-amber-700 border-amber-200" },
      { subject: "Lunch Break", isBreak: true },
      { subject: "Computer Science", teacher: "James Wilson", room: "Comp Lab A", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
      { subject: "English Literature", teacher: "Clara Oswald", room: "Room 204", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      { subject: "Physical Education", teacher: "Coach Diaz", room: "Main Gym", color: "bg-rose-50 text-rose-700 border-rose-200" },
    ],
    "Tuesday": [
      { subject: "Calculus & Geometry", teacher: "Katherine Howard", room: "Room 204", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      { subject: "Advanced Physics", teacher: "Dr. Robert Langdon", room: "Lab 3", color: "bg-blue-50 text-blue-700 border-blue-200" },
      { subject: "Studio Art & Design", teacher: "Elena Rostova", room: "Art Studio", color: "bg-purple-50 text-purple-700 border-purple-200" },
      { subject: "Lunch Break", isBreak: true },
      { subject: "English Literature", teacher: "Clara Oswald", room: "Room 204", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      { subject: "Chemistry & Biology", teacher: "Dr. Paul Vance", room: "Lab 2", color: "bg-teal-50 text-teal-700 border-teal-200" },
      { subject: "Library / Study Hall", teacher: "Ms. Adams", room: "Library", color: "bg-slate-50 text-slate-700 border-slate-200" },
    ],
    "Wednesday": [
      { subject: "Computer Science", teacher: "James Wilson", room: "Comp Lab A", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
      { subject: "Advanced Physics", teacher: "Dr. Robert Langdon", room: "Lab 3", color: "bg-blue-50 text-blue-700 border-blue-200" },
      { subject: "Calculus & Geometry", teacher: "Katherine Howard", room: "Room 204", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      { subject: "Lunch Break", isBreak: true },
      { subject: "World History", teacher: "Prof. Arthur Shelby", room: "Room 102", color: "bg-amber-50 text-amber-700 border-amber-200" },
      { subject: "English Literature", teacher: "Clara Oswald", room: "Room 204", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      { subject: "Music & Drama", teacher: "Mr. Linus", room: "Auditorium", color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
    ],
    "Thursday": [
      { subject: "Chemistry & Biology", teacher: "Dr. Paul Vance", room: "Lab 2", color: "bg-teal-50 text-teal-700 border-teal-200" },
      { subject: "World History", teacher: "Prof. Arthur Shelby", room: "Room 102", color: "bg-amber-50 text-amber-700 border-amber-200" },
      { subject: "Calculus & Geometry", teacher: "Katherine Howard", room: "Room 204", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      { subject: "Lunch Break", isBreak: true },
      { subject: "Advanced Physics", teacher: "Dr. Robert Langdon", room: "Lab 3", color: "bg-blue-50 text-blue-700 border-blue-200" },
      { subject: "Computer Science", teacher: "James Wilson", room: "Comp Lab A", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
      { subject: "Club Activity / Debate", teacher: "Clara Oswald", room: "Room 204", color: "bg-violet-50 text-violet-700 border-violet-200" },
    ],
    "Friday": [
      { subject: "English Literature", teacher: "Clara Oswald", room: "Room 204", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
      { subject: "Advanced Physics", teacher: "Dr. Robert Langdon", room: "Lab 3", color: "bg-blue-50 text-blue-700 border-blue-200" },
      { subject: "Calculus & Geometry", teacher: "Katherine Howard", room: "Room 204", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
      { subject: "Lunch Break", isBreak: true },
      { subject: "Studio Art & Design", teacher: "Elena Rostova", room: "Art Studio", color: "bg-purple-50 text-purple-700 border-purple-200" },
      { subject: "Computer Practical", teacher: "James Wilson", room: "Comp Lab A", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
      { subject: "Weekly Assembly & Mentorship", teacher: "Principal Vance", room: "Main Hall", color: "bg-blue-100 text-blue-900 border-blue-300 font-semibold" },
    ]
  }
};

export const initialExams = [
  {
    id: "EXM-301",
    name: "Mid-Term Examination 2026",
    class: "Grade 10",
    subject: "Mathematics",
    date: "2026-11-05",
    time: "09:00 AM - 12:00 PM",
    totalMarks: 100,
    passingMarks: 40,
    status: "Upcoming"
  },
  {
    id: "EXM-302",
    name: "Mid-Term Examination 2026",
    class: "Grade 10",
    subject: "Physics",
    date: "2026-11-08",
    time: "09:00 AM - 12:00 PM",
    totalMarks: 100,
    passingMarks: 40,
    status: "Upcoming"
  },
  {
    id: "EXM-303",
    name: "Unit Test 2",
    class: "Grade 11 - Science",
    subject: "Computer Science",
    date: "2026-10-15",
    time: "10:00 AM - 11:30 AM",
    totalMarks: 50,
    passingMarks: 20,
    status: "Completed"
  },
  {
    id: "EXM-304",
    name: "Term 1 Assessment",
    class: "Grade 12",
    subject: "English Literature",
    date: "2026-10-10",
    time: "09:00 AM - 12:00 PM",
    totalMarks: 100,
    passingMarks: 40,
    status: "Completed"
  }
];

export const initialMarks = [
  { id: "MRK-01", studentName: "Aria Montgomery", studentId: "STU-1001", exam: "Term 1 Assessment", subject: "Mathematics", score: 96, maxScore: 100, grade: "A+", status: "Passed" },
  { id: "MRK-02", studentName: "Liam Alexander", studentId: "STU-1002", exam: "Term 1 Assessment", subject: "Mathematics", score: 78, maxScore: 100, grade: "B+", status: "Passed" },
  { id: "MRK-03", studentName: "Sophia Chen", studentId: "STU-1003", exam: "Term 1 Assessment", subject: "Mathematics", score: 99, maxScore: 100, grade: "A+", status: "Passed" },
  { id: "MRK-04", studentName: "Marcus Rashford Jr.", studentId: "STU-1004", exam: "Term 1 Assessment", subject: "Mathematics", score: 62, maxScore: 100, grade: "C", status: "Passed" },
  { id: "MRK-05", studentName: "Emma Watson-Kim", studentId: "STU-1005", exam: "Term 1 Assessment", subject: "Mathematics", score: 94, maxScore: 100, grade: "A+", status: "Passed" },
  { id: "MRK-06", studentName: "Noah Patel", studentId: "STU-1006", exam: "Term 1 Assessment", subject: "Mathematics", score: 85, maxScore: 100, grade: "A", status: "Passed" },
  { id: "MRK-07", studentName: "Olivia Brooks", studentId: "STU-1007", exam: "Term 1 Assessment", subject: "Mathematics", score: 38, maxScore: 100, grade: "F", status: "Failed" },
  { id: "MRK-08", studentName: "Ethan Wright", studentId: "STU-1008", exam: "Term 1 Assessment", subject: "Mathematics", score: 88, maxScore: 100, grade: "A", status: "Passed" },
];

export const initialFees = [
  {
    id: "INV-2026-081",
    studentId: "STU-1001",
    studentName: "Aria Montgomery",
    grade: "Grade 10-A",
    type: "Term 2 Tuition & Lab Fee",
    amount: 1450,
    dueDate: "2026-11-01",
    paidDate: "2026-10-20",
    paymentMethod: "Credit Card",
    status: "Paid"
  },
  {
    id: "INV-2026-082",
    studentId: "STU-1002",
    studentName: "Liam Alexander",
    grade: "Grade 10-B",
    type: "Term 2 Tuition & Sports Fee",
    amount: 1350,
    dueDate: "2026-11-05",
    paidDate: null,
    paymentMethod: "Pending",
    status: "Pending"
  },
  {
    id: "INV-2026-083",
    studentId: "STU-1003",
    studentName: "Sophia Chen",
    grade: "Grade 11-A",
    type: "Term 2 Full Package & Bus",
    amount: 1800,
    dueDate: "2026-10-25",
    paidDate: "2026-10-18",
    paymentMethod: "Bank Transfer",
    status: "Paid"
  },
  {
    id: "INV-2026-084",
    studentId: "STU-1004",
    studentName: "Marcus Rashford Jr.",
    grade: "Grade 9-A",
    type: "Term 1 Arrears & Library",
    amount: 1200,
    dueDate: "2026-09-30",
    paidDate: null,
    paymentMethod: "Overdue",
    status: "Overdue"
  },
  {
    id: "INV-2026-085",
    studentId: "STU-1005",
    studentName: "Emma Watson-Kim",
    grade: "Grade 12-Science",
    type: "Term 2 Advanced Lab Fee",
    amount: 1650,
    dueDate: "2026-11-01",
    paidDate: "2026-10-22",
    paymentMethod: "Debit Card",
    status: "Paid"
  },
  {
    id: "INV-2026-086",
    studentId: "STU-1006",
    studentName: "Noah Patel",
    grade: "Grade 8-B",
    type: "Term 2 Tuition & Activity",
    amount: 1250,
    dueDate: "2026-11-10",
    paidDate: null,
    paymentMethod: "Pending",
    status: "Pending"
  }
];

export const initialNotices = [
  {
    id: "NTC-01",
    title: "Parent-Teacher Conference Schedule (Autumn 2026)",
    date: "2026-10-28",
    category: "Academic",
    priority: "High",
    author: "Principal's Office",
    summary: "Mandatory PTC for Grades 9 through 12 will take place on Saturday, Nov 7. Appointment booking opens today on the portal."
  },
  {
    id: "NTC-02",
    title: "Annual STEM & Robotics Exhibition Registration",
    date: "2026-11-02",
    category: "Event",
    priority: "Normal",
    author: "Dept. of Science & Robotics",
    summary: "Students interested in presenting innovative AI, robotics, and physics projects must submit team proposals before Nov 15."
  },
  {
    id: "NTC-03",
    title: "Winter Sports Tournament Tryouts",
    date: "2026-11-04",
    category: "Sports",
    priority: "Normal",
    author: "Athletic Director",
    summary: "Tryouts for Basketball, Track, and Soccer will take place on the school turf from 3:30 PM starting next Monday."
  }
];

export const initialRecentActivities = [
  { id: 1, action: "Student Admitted", detail: "Aria Montgomery enrolled into Grade 10-A", time: "10 mins ago", type: "student" },
  { id: 2, action: "Fee Payment Received", detail: "₹1,650 received from Emma Watson-Kim via Debit Card", time: "45 mins ago", type: "fee" },
  { id: 3, action: "Marks Updated", detail: "Unit Test 2 marks published by Katherine Howard", time: "2 hours ago", type: "exam" },
  { id: 4, action: "Attendance Marked", detail: "Grade 11-A attendance completed with 98% presence", time: "4 hours ago", type: "attendance" },
  { id: 5, action: "Notice Published", detail: "Parent-Teacher Conference dates announced", time: "Yesterday", type: "announcement" },
];
