import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

db = SessionLocal()

admin_emails = ['admin@oakridge.edu', 'vice.principal@oakridge.edu']
for email in admin_emails:
    u = db.query(User).filter(User.email == email).first()
    if u:
        u.hashed_password = hash_password('AdminPassword123!')
        u.is_active = True

teacher_emails = [
    'prof.watson@oakridge.edu', 'e.vance@oakridge.edu', 's.jenkins@oakridge.edu',
    'a.turing@oakridge.edu', 'm.curie@oakridge.edu', 'r.sharma@oakridge.edu',
    'a.lovelace@oakridge.edu', 'xyz@gmail.com', 'abc@gmail.com'
]
for email in teacher_emails:
    u = db.query(User).filter(User.email == email).first()
    if u:
        u.hashed_password = hash_password('TeacherSecure123!')
        u.is_active = True

student_emails = ['maya.lin@oakridge.edu', 'student.lucas@oakridge.edu', 'nausheen.stu7493@oakridge.edu']
for email in student_emails:
    u = db.query(User).filter(User.email == email).first()
    if u:
        u.hashed_password = hash_password('StudentSecure123!')
        u.is_active = True

db.commit()
print("All users updated successfully!")

