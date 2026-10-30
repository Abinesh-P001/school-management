-- =========================================================================
-- Supabase Migration: Secure Parent Portal & School Announcements Module
-- =========================================================================

-- 1. Update user_role check constraint or enum if necessary
DO $$
BEGIN
    -- If user_role is an enum type
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'parent';
    END IF;
END $$;

-- 2. Parents Table
CREATE TABLE IF NOT EXISTS parents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    parent_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'Parent',
    address VARCHAR(255),
    occupation VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parents_status ON parents(status);
CREATE INDEX IF NOT EXISTS idx_parents_parent_code ON parents(parent_code);

-- 3. Parent-Students Junction Table (Strict access control)
CREATE TABLE IF NOT EXISTS parent_students (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL DEFAULT 'Parent',
    is_primary_contact BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_parent_student UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);

-- 4. Parent Correction Requests Table (Parents request corrections without direct edit access)
CREATE TABLE IF NOT EXISTS parent_correction_requests (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    requested_field VARCHAR(100) NOT NULL,
    current_value VARCHAR(255),
    proposed_value VARCHAR(255) NOT NULL,
    reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    admin_notes VARCHAR(255),
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parent_corr_parent ON parent_correction_requests(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_corr_student ON parent_correction_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_corr_status ON parent_correction_requests(status);

-- 5. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    priority VARCHAR(20) NOT NULL DEFAULT 'Normal',
    target_audience VARCHAR(50) NOT NULL DEFAULT 'ALL',
    target_grade VARCHAR(50),
    target_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    target_section VARCHAR(20),
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'Published',
    publish_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE,
    attachment_url VARCHAR(500),
    attachment_name VARCHAR(150),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);

-- 6. Announcement Read Receipts Table
CREATE TABLE IF NOT EXISTS announcement_read_receipts (
    id SERIAL PRIMARY KEY,
    announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uk_announcement_user_read UNIQUE (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_read_receipt_announcement ON announcement_read_receipts(announcement_id);
CREATE INDEX IF NOT EXISTS idx_read_receipt_user ON announcement_read_receipts(user_id);

