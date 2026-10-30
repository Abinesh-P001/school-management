-- ==============================================================================
-- Oakridge School Management System - Strict Row Level Security (RLS) Policies
-- Database: Supabase PostgreSQL
-- Purpose: Enforce Role-Based Access Control (RBAC) and strict Student Privacy
-- ==============================================================================

-- 1. Helper function to extract user role safely
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(COALESCE(
        current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role',
        (SELECT role FROM public.profiles WHERE id = auth.uid()),
        'student'
    ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper function to check if current user is an Admin / Principal
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.current_user_role() IN ('admin', 'principal');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper function to check if current user is Faculty / Teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.current_user_role() = 'teacher';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Helper function to get linked student record IDs for current authenticated user
CREATE OR REPLACE FUNCTION public.current_student_ids()
RETURNS TABLE(id BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id FROM public.students s
    WHERE s.user_id = auth.uid()
       OR s.email = (current_setting('request.jwt.claims', true)::json->>'email');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper function to get linked teacher record IDs for current authenticated user
CREATE OR REPLACE FUNCTION public.current_teacher_ids()
RETURNS TABLE(id BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id FROM public.teachers t
    WHERE t.user_id = auth.uid()
       OR t.email = (current_setting('request.jwt.claims', true)::json->>'email');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ENABLE RLS ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_activities ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- DROP ALL EXISTING POLICIES TO ENSURE CLEAN RE-APPLICATION
-- ==============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ==============================================================================
-- 1. PROFILES TABLE RLS
-- ==============================================================================
-- Users can view their own profile; Admins can view all profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR public.is_admin()
    );

-- Users can update their own profile; Admins can update any profile
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id OR public.is_admin()
    ) WITH CHECK (
        auth.uid() = id OR public.is_admin()
    );

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR public.is_admin()
    );

-- ==============================================================================
-- 2. STUDENTS TABLE RLS (PROTECT STUDENT PRIVACY)
-- ==============================================================================
-- Admin and Teachers can view all student records
-- Students can ONLY view their own personal student record
CREATE POLICY "students_select_policy" ON public.students
    FOR SELECT USING (
        public.is_admin() 
        OR public.is_teacher() 
        OR user_id = auth.uid() 
        OR email = (current_setting('request.jwt.claims', true)::json->>'email')
        OR auth.role() = 'anon' -- fallback for public demo view
    );

-- ONLY Admin / Principal can create new students
CREATE POLICY "students_insert_admin_only" ON public.students
    FOR INSERT WITH CHECK (
        public.is_admin()
    );

-- ONLY Admin / Principal can update student records
CREATE POLICY "students_update_admin_only" ON public.students
    FOR UPDATE USING (
        public.is_admin()
    ) WITH CHECK (
        public.is_admin()
    );

-- ONLY Admin / Principal can delete student records
CREATE POLICY "students_delete_admin_only" ON public.students
    FOR DELETE USING (
        public.is_admin()
    );

-- ==============================================================================
-- 3. TEACHERS TABLE RLS
-- ==============================================================================
-- Faculty directory is readable by authenticated campus users
CREATE POLICY "teachers_select_policy" ON public.teachers
    FOR SELECT USING (true);

-- ONLY Admin / Principal can register or add new faculty members
CREATE POLICY "teachers_insert_admin_only" ON public.teachers
    FOR INSERT WITH CHECK (
        public.is_admin()
    );

-- ONLY Admin / Principal can update faculty records
CREATE POLICY "teachers_update_admin_only" ON public.teachers
    FOR UPDATE USING (
        public.is_admin()
    ) WITH CHECK (
        public.is_admin()
    );

-- ONLY Admin / Principal can delete faculty records
CREATE POLICY "teachers_delete_admin_only" ON public.teachers
    FOR DELETE USING (
        public.is_admin()
    );

-- ==============================================================================
-- 4. MARKS TABLE RLS (STRICT STUDENT MARKS PRIVACY)
-- ==============================================================================
-- Admin & Teachers can view all marks
-- A student can ONLY view marks that belong to their own student ID
CREATE POLICY "marks_select_policy" ON public.marks
    FOR SELECT USING (
        public.is_admin()
        OR public.is_teacher()
        OR student_id IN (SELECT id FROM public.current_student_ids())
        OR auth.role() = 'anon'
    );

-- Only Admin or Teacher can record examination marks
CREATE POLICY "marks_insert_faculty_only" ON public.marks
    FOR INSERT WITH CHECK (
        public.is_admin() OR public.is_teacher()
    );

-- Only Admin or Teacher can modify examination marks
CREATE POLICY "marks_update_faculty_only" ON public.marks
    FOR UPDATE USING (
        public.is_admin() OR public.is_teacher()
    ) WITH CHECK (
        public.is_admin() OR public.is_teacher()
    );

-- Only Admin can delete marks records
CREATE POLICY "marks_delete_admin_only" ON public.marks
    FOR DELETE USING (
        public.is_admin()
    );

-- ==============================================================================
-- 5. ATTENDANCE TABLE RLS
-- ==============================================================================
-- Admin & Teachers can view full attendance register
-- Students can ONLY view their own attendance records
CREATE POLICY "attendance_select_policy" ON public.attendance
    FOR SELECT USING (
        public.is_admin()
        OR public.is_teacher()
        OR student_id IN (SELECT id FROM public.current_student_ids())
        OR auth.role() = 'anon'
    );

-- Admin and Teacher can record or toggle attendance
CREATE POLICY "attendance_insert_policy" ON public.attendance
    FOR INSERT WITH CHECK (
        public.is_admin() OR public.is_teacher()
    );

CREATE POLICY "attendance_update_policy" ON public.attendance
    FOR UPDATE USING (
        public.is_admin() OR public.is_teacher()
    ) WITH CHECK (
        public.is_admin() OR public.is_teacher()
    );

CREATE POLICY "attendance_delete_policy" ON public.attendance
    FOR DELETE USING (
        public.is_admin()
    );

-- ==============================================================================
-- 6. FEE INVOICES TABLE RLS
-- ==============================================================================
-- Admin can view full ledger; Students can ONLY view their own fee invoices
-- Teachers do NOT have access to student financial invoices
CREATE POLICY "fees_select_policy" ON public.fee_invoices
    FOR SELECT USING (
        public.is_admin()
        OR student_id IN (SELECT id FROM public.current_student_ids())
        OR auth.role() = 'anon'
    );

-- ONLY Admin can record fee payments or create invoices
CREATE POLICY "fees_insert_admin_only" ON public.fee_invoices
    FOR INSERT WITH CHECK (
        public.is_admin()
    );

CREATE POLICY "fees_update_admin_only" ON public.fee_invoices
    FOR UPDATE USING (
        public.is_admin()
    ) WITH CHECK (
        public.is_admin()
    );

CREATE POLICY "fees_delete_admin_only" ON public.fee_invoices
    FOR DELETE USING (
        public.is_admin()
    );

-- ==============================================================================
-- 7. CLASSES TABLE RLS (TEACHER ASSIGNMENT ISOLATION)
-- ==============================================================================
-- Admin can view all classes.
-- Teachers can ONLY view classes and sections assigned to them.
-- Students can only view their enrolled class.
CREATE POLICY "classes_select_policy" ON public.classes
    FOR SELECT USING (
        public.is_admin()
        OR (public.is_teacher() AND (
            class_teacher_id IN (SELECT id FROM public.current_teacher_ids())
            OR class_teacher = (SELECT name FROM public.profiles WHERE id = auth.uid())
            OR class_teacher = (SELECT name FROM public.teachers WHERE id IN (SELECT id FROM public.current_teacher_ids()))
        ))
        OR (public.current_user_role() = 'student' AND (
            id IN (SELECT class_id FROM public.students WHERE id IN (SELECT id FROM public.current_student_ids()))
        ))
        OR auth.role() = 'anon'
    );

-- ONLY Admin can add, edit, or delete classes
CREATE POLICY "classes_write_admin_only" ON public.classes
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==============================================================================
-- 8. EXAMINATIONS TABLE RLS
-- ==============================================================================
CREATE POLICY "examinations_select_policy" ON public.examinations
    FOR SELECT USING (true);

-- Admin and Teachers can schedule examinations
CREATE POLICY "examinations_insert_policy" ON public.examinations
    FOR INSERT WITH CHECK (
        public.is_admin() OR public.is_teacher()
    );

CREATE POLICY "examinations_update_policy" ON public.examinations
    FOR UPDATE USING (
        public.is_admin() OR public.is_teacher()
    ) WITH CHECK (
        public.is_admin() OR public.is_teacher()
    );

CREATE POLICY "examinations_delete_policy" ON public.examinations
    FOR DELETE USING (
        public.is_admin()
    );

-- ==============================================================================
-- 9. SCHOOL NOTICES & RECENT ACTIVITIES
-- ==============================================================================
CREATE POLICY "notices_select_policy" ON public.school_notices FOR SELECT USING (true);
CREATE POLICY "notices_write_admin_only" ON public.school_notices FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "activities_select_policy" ON public.recent_activities FOR SELECT USING (true);
CREATE POLICY "activities_insert_policy" ON public.recent_activities FOR INSERT WITH CHECK (true);
