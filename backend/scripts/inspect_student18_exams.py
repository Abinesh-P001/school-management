import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.student import Student
from app.models.examination import Examination, Mark
from app.models.parent import ParentStudent, Parent

db = SessionLocal()
s18 = db.query(Student).filter(Student.id == 18).first()
print(f"Student 18: {s18.name}, class_id={s18.class_id}, user_id={s18.user_id}")

marks = db.query(Mark).filter(Mark.student_id == 18).all()
print(f"Marks for Student 18: {len(marks)}")
for m in marks:
    exam = db.query(Examination).filter(Examination.id == m.examination_id).first()
    print(f"  Mark: id={m.id}, exam_id={m.examination_id}, marks_obtained={m.marks_obtained}, exam_name={exam.name if exam else 'None'}, status={exam.status if exam else 'None'}, locked={exam.is_locked if exam else 'None'}")

all_exams_cls2 = db.query(Examination).filter(Examination.class_id == s18.class_id).all()
print(f"\nExams for Class {s18.class_id} (Student 18's class): {len(all_exams_cls2)}")
for e in all_exams_cls2:
    print(f"  Exam: id={e.id}, name={e.name}, academic_year={e.academic_year}, status={e.status}, is_locked={e.is_locked}")

# Check Parents linked to student 18
parents = db.query(ParentStudent).filter(ParentStudent.student_id == 18).all()
print(f"\nParents linked to Student 18: {len(parents)}")
for p in parents:
    parent_rec = db.query(Parent).filter(Parent.id == p.parent_id).first()
    print(f"  ParentStudent: parent_id={p.parent_id}, relationship={p.relationship}, is_verified={p.is_verified}, parent_email={parent_rec.email if parent_rec else 'None'}")

db.close()

