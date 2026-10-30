import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "..", "school_management_dev.db")
print("Migrating SQLite database at:", db_path)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Check teachers table columns
cursor.execute("PRAGMA table_info(teachers)")
teacher_cols = [row[1] for row in cursor.fetchall()]
print("Current teachers columns:", teacher_cols)

if "classes_assigned" not in teacher_cols:
    print("Adding classes_assigned column to teachers...")
    cursor.execute("ALTER TABLE teachers ADD COLUMN classes_assigned VARCHAR(255)")
    print("[DONE] classes_assigned added to teachers.")
else:
    print("classes_assigned already exists in teachers.")

# 2. Check students table columns
cursor.execute("PRAGMA table_info(students)")
student_cols = [row[1] for row in cursor.fetchall()]
print("Current students columns:", student_cols)

if "admission_number" not in student_cols:
    print("Adding admission_number column to students...")
    cursor.execute("ALTER TABLE students ADD COLUMN admission_number VARCHAR(50)")
    print("[DONE] admission_number added to students.")
else:
    print("admission_number already exists in students.")

conn.commit()
conn.close()
print("Migration completed successfully!")
