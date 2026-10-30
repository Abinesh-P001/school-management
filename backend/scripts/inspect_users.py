import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.student import Student
from app.models.user import User

db = SessionLocal()
print("USERS with role student:")
for u in db.query(User).filter(User.role == "student").all():
    print(f"User id={u.id}, email={u.email}, first_name={getattr(u, 'first_name', '')}, last_name={getattr(u, 'last_name', '')}")

print("\nSTUDENTS:")
for s in db.query(Student).all():
    print(f"Student id={s.id}, student_id={s.student_id}, name={s.name}, email={s.email}, user_id={s.user_id}, class_id={s.class_id}")
db.close()

