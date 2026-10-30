import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
from app.database import engine, Base
import app.models

# 1. SQLAlchemy create_all (creates any non-existing tables)
Base.metadata.create_all(bind=engine)

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'school_management_dev.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Ensure teacher_attendance table exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS teacher_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Present',
    remarks VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_teacher_attendance_date UNIQUE (teacher_id, attendance_date)
);
""")

# Ensure index on teacher_attendance
cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_att_date ON teacher_attendance(teacher_id, attendance_date);")

# Check attendance table columns
cursor.execute("PRAGMA table_info(attendance);")
att_cols = [c[1] for c in cursor.fetchall()]
if "updated_at" not in att_cols:
    cursor.execute("ALTER TABLE attendance ADD COLUMN updated_at DATETIME;")

conn.commit()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
print("Tables in SQLite database:", [r[0] for r in cursor.fetchall()])

cursor.execute("PRAGMA table_info(teacher_attendance);")
print("teacher_attendance columns:", [c[1] for c in cursor.fetchall()])

conn.close()
print("Migration completed successfully!")

