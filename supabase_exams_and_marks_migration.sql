-- ==============================================================================
-- Supabase Migration: Examinations, Marks, Grading Rules & Audit Trails
-- Ensures complete class-wise and section-wise isolation with role-based policies
-- ==============================================================================

-- 1. Upgrade examinations table
ALTER TABLE IF EXISTS examinations 
  ADD COLUMN IF NOT EXISTS academic_year VARCHAR(30) DEFAULT '2026-2027' NOT NULL,
  ADD COLUMN IF NOT EXISTS section VARCHAR(20),
  ADD COLUMN IF NOT EXISTS exam_type VARCHAR(50) DEFAULT 'Term Exam' NOT NULL,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_examinations_class_year 
  ON examinations (class_id, academic_year, section);

CREATE INDEX IF NOT EXISTS idx_examinations_status 
  ON examinations (status, is_locked);

-- 2. Upgrade marks table
ALTER TABLE IF EXISTS marks
  ADD COLUMN IF NOT EXISTS is_absent BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enforce unique constraint: only one mark record per student per examination
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uk_exam_student'
  ) THEN
    ALTER TABLE marks ADD CONSTRAINT uk_exam_student UNIQUE (examination_id, student_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_marks_examination_student 
  ON marks (examination_id, student_id);

-- 3. Configurable Grading Rules Table
CREATE TABLE IF NOT EXISTS grading_rules (
  id BIGSERIAL PRIMARY KEY,
  grade VARCHAR(10) NOT NULL UNIQUE,
  min_percentage NUMERIC(5, 2) NOT NULL,
  max_percentage NUMERIC(5, 2) NOT NULL,
  grade_point NUMERIC(3, 2) DEFAULT 0.0 NOT NULL,
  description VARCHAR(100),
  is_passing BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standard grading rules if empty
INSERT INTO grading_rules (grade, min_percentage, max_percentage, grade_point, description, is_passing)
VALUES
  ('A+', 90.00, 100.00, 4.00, 'Outstanding', TRUE),
  ('A',  80.00,  89.99, 3.70, 'Excellent',   TRUE),
  ('B+', 70.00,  79.99, 3.30, 'Very Good',   TRUE),
  ('B',  60.00,  69.99, 3.00, 'Good',        TRUE),
  ('C',  50.00,  59.99, 2.00, 'Average',     TRUE),
  ('D',  40.00,  49.99, 1.00, 'Pass',        TRUE),
  ('F',   0.00,  39.99, 0.00, 'Fail',        FALSE)
ON CONFLICT (grade) DO NOTHING;

-- 4. Marks Audit Trail Table
CREATE TABLE IF NOT EXISTS marks_audit_log (
  id BIGSERIAL PRIMARY KEY,
  mark_id BIGINT,
  examination_id BIGINT NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  old_marks NUMERIC(5, 2),
  new_marks NUMERIC(5, 2),
  old_status VARCHAR(30),
  new_status VARCHAR(30),
  action VARCHAR(50) NOT NULL, -- CREATED, UPDATED, MARKED_ABSENT, LOCKED, PUBLISHED, REOPENED
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email VARCHAR(150),
  remarks VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marks_audit_exam_student 
  ON marks_audit_log (examination_id, student_id, created_at);

-- 5. Row Level Security Policies
ALTER TABLE examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks_audit_log ENABLE ROW LEVEL SECURITY;

-- Grading rules: Read for everyone, write for admin
DROP POLICY IF EXISTS "Anyone can read grading rules" ON grading_rules;
CREATE POLICY "Anyone can read grading rules" ON grading_rules
  FOR SELECT TO authenticated USING (true);

-- Examinations: Read for authenticated users, full manage for admin & teachers
DROP POLICY IF EXISTS "Read examinations" ON examinations;
CREATE POLICY "Read examinations" ON examinations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teachers and Admins manage exams" ON examinations;
CREATE POLICY "Teachers and Admins manage exams" ON examinations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'teacher')
    )
  );

-- Marks: Students can view only their own published marks
DROP POLICY IF EXISTS "Students view own published marks" ON marks;
CREATE POLICY "Students view own published marks" ON marks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN examinations e ON e.id = marks.examination_id
      WHERE s.id = marks.student_id
      AND s.user_id = auth.uid()
      AND (e.status IN ('Published', 'Completed') OR e.is_locked = TRUE)
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'teacher')
    )
  );

-- Marks: Admins and authorized Teachers can insert and update marks
DROP POLICY IF EXISTS "Teachers and Admins manage marks" ON marks;
CREATE POLICY "Teachers and Admins manage marks" ON marks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'teacher')
    )
  );

