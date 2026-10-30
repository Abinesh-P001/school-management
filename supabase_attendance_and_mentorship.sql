-- ==============================================================================
-- Oakridge School Management - Supabase Schema Migration:
-- 1. Teacher Attendance Table with Unique Constraint & RLS
-- 2. Student Attendance Table Updates & Constraints
-- 3. Class Mentorship Unique Constraints
-- ==============================================================================

-- 1. Create Teacher Attendance Table
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Late', 'Leave')),
    remarks VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uk_teacher_attendance_date UNIQUE (teacher_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON public.teacher_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_id ON public.teacher_attendance(teacher_id);

-- Enable RLS on teacher_attendance
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Admins have full access to teacher attendance
CREATE POLICY "Admins full access to teacher_attendance"
ON public.teacher_attendance
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Teachers can view their own attendance records
CREATE POLICY "Teachers can view own attendance"
ON public.teacher_attendance
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.teachers
        WHERE teachers.id = teacher_attendance.teacher_id
          AND teachers.user_id = auth.uid()
    )
);

-- 2. Ensure Student Attendance Table has Leave Status and Constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendance' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.attendance ADD COLUMN updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- 3. Class Mentorship: Ensure classes table has class_teacher_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'classes' AND column_name = 'class_teacher_id'
    ) THEN
        ALTER TABLE public.classes ADD COLUMN class_teacher_id BIGINT REFERENCES public.teachers(id) ON DELETE SET NULL;
    END IF;
END $$;

