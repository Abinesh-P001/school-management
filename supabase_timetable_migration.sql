-- =====================================================================
-- Supabase Migration: Separate Timetables by Class and Section
-- =====================================================================

-- 1. Ensure classes table has section column (already present in base schema)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'classes' 
        AND column_name = 'section'
    ) THEN
        ALTER TABLE public.classes ADD COLUMN section TEXT NOT NULL DEFAULT 'A';
    END IF;
END $$;

-- 2. Create Timetables Table
CREATE TABLE IF NOT EXISTS public.timetables (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    class_id BIGINT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section TEXT NULL,
    day_of_week TEXT NOT NULL,
    period_number INT NOT NULL CHECK (period_number > 0),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    subject TEXT NOT NULL,
    teacher_id BIGINT NULL REFERENCES public.teachers(id) ON DELETE SET NULL,
    room TEXT NULL,
    is_break BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Prevent duplicate period assignments for the same class, section, academic year, weekday, and period number
    CONSTRAINT uk_class_timetable_period UNIQUE (academic_year, class_id, day_of_week, period_number),
    -- Validate end time is after start time
    CONSTRAINT chk_timetable_times CHECK (end_time > start_time)
);

-- 3. Indexes for fast class/section/academic_year lookups
CREATE INDEX IF NOT EXISTS idx_timetables_class_year ON public.timetables (class_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_timetables_day ON public.timetables (day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetables_teacher ON public.timetables (teacher_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Admins have full access to view, insert, update, and delete timetables
DROP POLICY IF EXISTS "Admins have full access to timetables" ON public.timetables;
CREATE POLICY "Admins have full access to timetables"
ON public.timetables
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Teachers can view all timetables or their assigned classes
DROP POLICY IF EXISTS "Teachers can view timetables" ON public.timetables;
CREATE POLICY "Teachers can view timetables"
ON public.timetables
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
);

-- Students can view only the timetable for their enrolled class and section
DROP POLICY IF EXISTS "Students view enrolled class timetable" ON public.timetables;
CREATE POLICY "Students view enrolled class timetable"
ON public.timetables
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students
        JOIN public.profiles ON profiles.id = students.user_id
        WHERE profiles.id = auth.uid() 
          AND students.class_id = timetables.class_id
    )
);
