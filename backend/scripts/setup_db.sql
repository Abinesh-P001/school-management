-- =================================================================
-- Oakridge School Management System - Repeatable Database Setup Script
-- Database: MySQL 8.0+
-- =================================================================

CREATE DATABASE IF NOT EXISTS school_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE school_management;

-- 1. Users Table (Role-Based Authentication: admin, teacher, student)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role ENUM('admin', 'teacher', 'student') NOT NULL DEFAULT 'student',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_email (email)
) ENGINE=InnoDB;

-- 2. Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    user_id INT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    phone VARCHAR(30),
    department VARCHAR(100) NOT NULL,
    subject VARCHAR(150) NOT NULL,
    qualification VARCHAR(200),
    experience VARCHAR(50),
    classes_assigned VARCHAR(255) NULL,
    status ENUM('Active', 'On Leave', 'Retired') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_teacher_department (department)
) ENGINE=InnoDB;

-- 3. Classes Table
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    section VARCHAR(50) NOT NULL,
    room VARCHAR(100),
    capacity INT NOT NULL DEFAULT 35,
    class_teacher_id INT NULL,
    schedule VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_classes_teacher FOREIGN KEY (class_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    INDEX idx_class_name (name)
) ENGINE=InnoDB;

-- 4. Students Table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    admission_number VARCHAR(50) NULL UNIQUE,
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INT NULL UNIQUE,
    class_id INT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    date_of_birth DATE NULL,
    guardian_name VARCHAR(150) NOT NULL,
    guardian_phone VARCHAR(30) NOT NULL,
    admission_date DATE NOT NULL,
    status ENUM('Active', 'Suspended', 'Graduated') NOT NULL DEFAULT 'Active',
    fees_status ENUM('Paid', 'Pending', 'Overdue') NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    INDEX idx_student_class (class_id),
    INDEX idx_student_status (status)
) ENGINE=InnoDB;

-- 5. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
    remarks VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_date (student_id, date),
    INDEX idx_attendance_date (date),
    INDEX idx_attendance_class_date (class_id, date)
) ENGINE=InnoDB;

-- 6. Examinations Table
CREATE TABLE IF NOT EXISTS examinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    class_id INT NOT NULL,
    subject VARCHAR(150) NOT NULL,
    exam_date DATE NOT NULL,
    time_slot VARCHAR(100),
    total_marks INT NOT NULL DEFAULT 100,
    passing_marks INT NOT NULL DEFAULT 40,
    status ENUM('Upcoming', 'Ongoing', 'Completed') NOT NULL DEFAULT 'Upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exam_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_exam_date (exam_date)
) ENGINE=InnoDB;

-- 7. Marks Table
CREATE TABLE IF NOT EXISTS marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    examination_id INT NOT NULL,
    student_id INT NOT NULL,
    marks_obtained DECIMAL(5, 2) NOT NULL,
    grade VARCHAR(10) NOT NULL,
    status ENUM('Passed', 'Failed') NOT NULL,
    remarks VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_marks_exam FOREIGN KEY (examination_id) REFERENCES examinations(id) ON DELETE CASCADE,
    CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_exam_student (examination_id, student_id)
) ENGINE=InnoDB;

-- 8. Fees Invoices & Ledger Table
CREATE TABLE IF NOT EXISTS fee_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    student_id INT NOT NULL,
    fee_type VARCHAR(150) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE NULL,
    payment_method VARCHAR(50) NULL,
    status ENUM('Paid', 'Pending', 'Overdue') NOT NULL DEFAULT 'Pending',
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fees_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_fee_status (status)
) ENGINE=InnoDB;

-- =================================================================
-- Initial Seed Administrator Account
-- Password: "AdminPassword123!"
-- Hashed using bcrypt ($2b$12$)
-- =================================================================
INSERT INTO users (email, hashed_password, full_name, role, is_active)
VALUES (
    'admin@oakridge.edu',
    '$2b$12$e62vPau9iA7UuE81/F392OnZf.d5v8w89.8f.0l6s1kE9aY1Qz1w6',
    'Dr. Eleanor Vance',
    'admin',
    TRUE
)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);
