import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sqlite3
from app.database import engine, Base
import app.models

# Initialize Base metadata on the engine
Base.metadata.create_all(bind=engine)

db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'school_management_dev.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
print('Tables in school_management_dev.db:', [r[0] for r in cursor.fetchall()])

cursor.execute("PRAGMA table_info(teacher_subject_assignments);")
cols = cursor.fetchall()
print('teacher_subject_assignments columns:', [c[1] for c in cols])

cursor.execute("PRAGMA table_info(students);")
cols = cursor.fetchall()
print('students columns:', [c[1] for c in cols])

cursor.execute("PRAGMA table_info(classes);")
cols = cursor.fetchall()
print('classes columns:', [c[1] for c in cols])

conn.close()
