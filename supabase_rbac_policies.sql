-- ==============================================================================
-- Supabase Row Level Security (RLS) Policies for School Management RBAC
-- Ensures strict authorization for Admin, Teacher, Student, and Parent accounts
-- ==============================================================================

-- 1. Helper function to extract user role from JWT claims / user metadata
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role'),
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
    'student'
  );
$$;

-- Helper function to extract teacher ID linked to auth.uid()
CREATE OR REPLACE FUNCTION public.get_current_teacher_id()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.teachers 
  WHERE user_id = auth.uid() OR email = (current_setting('request.jwt.claims', true)::jsonb ->> 'email')
  LIMIT 1;
$$;

-- Helper function to extract student ID linked to auth.uid()
CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.students 
  WHERE user_id = auth.uid() OR email = (current_setting('request.jwt.claims', true)::jsonb ->> 'email')
  LIMIT 1;
$$;

-- Helper function: Check if teacher is assigned to a classroom (Mentor OR Subject Teacher)
CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_class(t_id integer, cls_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = cls_id AND c.class_teacher_id = t_id
    ) OR EXISTS (
      SELECT 1 FROM public.teacher_subject_assignments tsa
      WHERE tsa.class_id = cls_id AND tsa.teacher_id = t_id
    )
  );
$$;

-- Helper function: Check if teacher is assigned to a subject in a classroom (or is Mentor)
CREATE OR REPLACE FUNCTION public.is_teacher_assigned_to_subject(t_id integer, cls_id integer, subj text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = cls_id AND c.class_teacher_id = t_id
    ) OR EXISTS (
      SELECT 1 FROM public.teacher_subject_assignments tsa
      WHERE tsa.class_id = cls_id AND tsa.teacher_id = t_id AND LOWER(tsa.subject) = LOWER(subj)
    )
  );
$$;

-- ==============================================================================
-- 2. Enable Row Level Security (RLS) on All School Tables
-- ==============================================================================
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. STUDENTS TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "students_admin_all" ON public.students;
CREATE POLICY "students_admin_all" ON public.students
  FOR ALL
  TO authenticated
  USING (auth.get_user_role() = 'admin')
  WITH CHECK (auth.get_user_role() = 'admin');

DROP POLICY IF EXISTS "students_teacher_select" ON public.students;
CREATE POLICY "students_teacher_select" ON public.students
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), class_id)
  );

DROP POLICY IF EXISTS "students_teacher_insert" ON public.students;
CREATE POLICY "students_teacher_insert" ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), class_id)
  );

DROP POLICY IF EXISTS "students_teacher_update" ON public.students;
CREATE POLICY "students_teacher_update" ON public.students
  FOR UPDATE
  TO authenticated
  USING (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), class_id)
  )
  WITH CHECK (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), class_id)
  );

DROP POLICY IF EXISTS "students_student_select" ON public.students;
CREATE POLICY "students_student_select" ON public.students
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'student' AND
    (user_id = auth.uid() OR email = (current_setting('request.jwt.claims', true)::jsonb ->> 'email'))
  );

DROP POLICY IF EXISTS "students_parent_select" ON public.students;
CREATE POLICY "students_parent_select" ON public.students
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'parent' AND
    EXISTS (
      SELECT 1 FROM public.parent_student ps
      JOIN public.parents p ON p.id = ps.parent_id
      WHERE ps.student_id = public.students.id 
        AND ps.is_verified = true
        AND (p.user_id = auth.uid() OR p.email = (current_setting('request.jwt.claims', true)::jsonb ->> 'email'))
    )
  );

-- ==============================================================================
-- 4. CLASSES TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "classes_admin_all" ON public.classes;
CREATE POLICY "classes_admin_all" ON public.classes
  FOR ALL
  TO authenticated
  USING (auth.get_user_role() = 'admin')
  WITH CHECK (auth.get_user_role() = 'admin');

DROP POLICY IF EXISTS "classes_teacher_select" ON public.classes;
CREATE POLICY "classes_teacher_select" ON public.classes
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), id)
  );

DROP POLICY IF EXISTS "classes_student_select" ON public.classes;
CREATE POLICY "classes_student_select" ON public.classes
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'student' AND
    id = (SELECT class_id FROM public.students WHERE id = public.get_current_student_id())
  );

-- ==============================================================================
-- 5. ATTENDANCE TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "attendance_admin_all" ON public.attendance;
CREATE POLICY "attendance_admin_all" ON public.attendance
  FOR ALL
  TO authenticated
  USING (auth.get_user_role() = 'admin')
  WITH CHECK (auth.get_user_role() = 'admin');

DROP POLICY IF EXISTS "attendance_teacher_select" ON public.attendance;
CREATE POLICY "attendance_teacher_select" ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), class_id)
  );

DROP POLICY IF EXISTS "attendance_teacher_modify" ON public.attendance;
CREATE POLICY "attendance_teacher_modify" ON public.attendance
  FOR ALL
  TO authenticated
  USING (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), class_id)
  )
  WITH CHECK (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), class_id)
  );

DROP POLICY IF EXISTS "attendance_student_select" ON public.attendance;
CREATE POLICY "attendance_student_select" ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'student' AND
    student_id = public.get_current_student_id()
  );

-- ==============================================================================
-- 6. EXAMINATIONS TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "examinations_admin_all" ON public.examinations;
CREATE POLICY "examinations_admin_all" ON public.examinations
  FOR ALL
  TO authenticated
  USING (auth.get_user_role() = 'admin')
  WITH CHECK (auth.get_user_role() = 'admin');

DROP POLICY IF EXISTS "examinations_teacher_all" ON public.examinations;
CREATE POLICY "examinations_teacher_all" ON public.examinations
  FOR ALL
  TO authenticated
  USING (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), class_id)
  )
  WITH CHECK (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_subject(public.get_current_teacher_id(), class_id, subject)
  );

DROP POLICY IF EXISTS "examinations_student_select" ON public.examinations;
CREATE POLICY "examinations_student_select" ON public.examinations
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'student' AND
    (status IN ('Published', 'Completed') OR is_locked = true) AND
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = public.get_current_student_id() AND s.class_id = public.examinations.class_id
    )
  );

-- ==============================================================================
-- 7. MARKS TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "marks_admin_all" ON public.marks;
CREATE POLICY "marks_admin_all" ON public.marks
  FOR ALL
  TO authenticated
  USING (auth.get_user_role() = 'admin')
  WITH CHECK (auth.get_user_role() = 'admin');

DROP POLICY IF EXISTS "marks_teacher_manage" ON public.marks;
CREATE POLICY "marks_teacher_manage" ON public.marks
  FOR ALL
  TO authenticated
  USING (
    auth.get_user_role() = 'teacher' AND
    EXISTS (
      SELECT 1 FROM public.examinations e
      WHERE e.id = examination_id AND public.is_teacher_assigned_to_class(public.get_current_teacher_id(), e.class_id)
    )
  )
  WITH CHECK (
    auth.get_user_role() = 'teacher' AND
    EXISTS (
      SELECT 1 FROM public.examinations e
      WHERE e.id = examination_id AND public.is_teacher_assigned_to_subject(public.get_current_teacher_id(), e.class_id, e.subject)
    )
  );

DROP POLICY IF EXISTS "marks_student_select" ON public.marks;
CREATE POLICY "marks_student_select" ON public.marks
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'student' AND
    student_id = public.get_current_student_id() AND
    EXISTS (
      SELECT 1 FROM public.examinations e
      WHERE e.id = examination_id AND (e.status IN ('Published', 'Completed') OR e.is_locked = true)
    )
  );

-- ==============================================================================
-- 8. TIMETABLES TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "timetables_admin_all" ON public.timetables;
CREATE POLICY "timetables_admin_all" ON public.timetables
  FOR ALL
  TO authenticated
  USING (auth.get_user_role() = 'admin')
  WITH CHECK (auth.get_user_role() = 'admin');

DROP POLICY IF EXISTS "timetables_teacher_modify" ON public.timetables;
CREATE POLICY "timetables_teacher_modify" ON public.timetables
  FOR ALL
  TO authenticated
  USING (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), class_id)
  )
  WITH CHECK (
    auth.get_user_role() = 'teacher' AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), class_id)
  );

DROP POLICY IF EXISTS "timetables_view_all" ON public.timetables;
CREATE POLICY "timetables_view_all" ON public.timetables
  FOR SELECT
  TO authenticated
  USING (true);

-- ==============================================================================
-- 9. FEE INVOICES TABLE POLICIES (CONFIDENTIAL FINANCIAL RECORDS)
-- Teachers are strictly forbidden from viewing or altering fees
-- ==============================================================================
DROP POLICY IF EXISTS "fees_admin_all" ON public.fee_invoices;
CREATE POLICY "fees_admin_all" ON public.fee_invoices
  FOR ALL
  TO authenticated
  USING (auth.get_user_role() = 'admin')
  WITH CHECK (auth.get_user_role() = 'admin');

DROP POLICY IF EXISTS "fees_student_select" ON public.fee_invoices;
CREATE POLICY "fees_student_select" ON public.fee_invoices
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'student' AND
    student_id = public.get_current_student_id()
  );

DROP POLICY IF EXISTS "fees_parent_select" ON public.fee_invoices;
CREATE POLICY "fees_parent_select" ON public.fee_invoices
  FOR SELECT
  TO authenticated
  USING (
    auth.get_user_role() = 'parent' AND
    EXISTS (
      SELECT 1 FROM public.parent_student ps
      JOIN public.parents p ON p.id = ps.parent_id
      WHERE ps.student_id = public.fee_invoices.student_id 
        AND ps.is_verified = true
        AND (p.user_id = auth.uid() OR p.email = (current_setting('request.jwt.claims', true)::jsonb ->> 'email'))
    )
  );

-- ==============================================================================
-- 10. ANNOUNCEMENTS TABLE POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;
CREATE POLICY "announcements_admin_all" ON public.announcements
  FOR ALL
  TO authenticated
  USING (auth.get_user_role() = 'admin')
  WITH CHECK (auth.get_user_role() = 'admin');

DROP POLICY IF EXISTS "announcements_teacher_insert" ON public.announcements;
CREATE POLICY "announcements_teacher_insert" ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.get_user_role() = 'teacher' AND
    target_audience NOT IN ('ALL', 'PARENTS_ALL', 'TEACHERS_ALL') AND
    public.is_teacher_assigned_to_class(public.get_current_teacher_id(), target_class_id)
  );

DROP POLICY IF EXISTS "announcements_teacher_modify_own" ON public.announcements;
CREATE POLICY "announcements_teacher_modify_own" ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    auth.get_user_role() = 'teacher' AND created_by = auth.uid()
  )
  WITH CHECK (
    auth.get_user_role() = 'teacher' AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "announcements_teacher_delete_own" ON public.announcements;
CREATE POLICY "announcements_teacher_delete_own" ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    auth.get_user_role() = 'teacher' AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "announcements_public_select" ON public.announcements;
CREATE POLICY "announcements_public_select" ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    is_published = true AND status = 'Published'
  );
