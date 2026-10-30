import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.classroom import Classroom
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.examination import Examination, Mark
from app.models.teacher_subject_assignment import TeacherSubjectAssignment

db = SessionLocal()
try:
    classes = db.query(Classroom).all()
    print("Classrooms:", [(c.id, c.name, c.section) for c in classes])
    
    students = db.query(Student).all()
    print(f"Total students: {len(students)}")
    for s in students[:5]:
        print("Student:", s.id, s.student_id, s.name, "Class:", s.class_id)
        
    exams = db.query(Examination).all()
    print(f"Total exams: {len(exams)}")
    for e in exams[:5]:
        print("Exam:", e.id, e.exam_code, e.name, "Class:", e.class_id, e.subject)
        
    marks = db.query(Mark).all()
    print(f"Total marks: {len(marks)}")
    for m in marks[:5]:
        print("Mark:", m.id, "Exam:", m.examination_id, "Student:", m.student_id, "Score:", m.marks_obtained)
        
    assignments = db.query(TeacherSubjectAssignment).all()
    print(f"Total subject assignments: {len(assignments)}")
    for a in assignments[:5]:
        print("Assignment:", a.teacher_id, "Class:", a.class_id, "Subject:", a.subject)
finally:
    db.close()

