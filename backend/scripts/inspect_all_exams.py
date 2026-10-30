import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.examination import Examination, Mark
from app.models.classroom import Classroom

db = SessionLocal()
print("CLASSES:")
for c in db.query(Classroom).all():
    print(f"  Class id={c.id}, name={c.name}, section={c.section}, teacher_id={c.class_teacher_id}")

print("\nEXAMINATIONS:")
for e in db.query(Examination).all():
    print(f"  Exam id={e.id}, name={e.name}, class_id={e.class_id}, subject={e.subject}, status={e.status}, locked={e.is_locked}")

print("\nMARKS COUNT:", db.query(Mark).count())
db.close()

