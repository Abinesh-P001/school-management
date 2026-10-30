import sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models import Classroom, Teacher, Student, User

db = SessionLocal()
class_count = db.query(Classroom).count()
print(f"Current class count: {class_count}")

if class_count == 0:
    print("Seeding standard classrooms...")
    # Get available teachers
    teachers = db.query(Teacher).all()
    t1_id = teachers[0].id if len(teachers) > 0 else None
    t2_id = teachers[1].id if len(teachers) > 1 else None

    classes_to_add = [
        Classroom(class_code="CLS-10A", name="Grade 10", section="A", room="Room 101", capacity=35, class_teacher_id=t1_id),
        Classroom(class_code="CLS-10B", name="Grade 10", section="B", room="Room 102", capacity=35, class_teacher_id=t2_id),
        Classroom(class_code="CLS-11A", name="Grade 11", section="A", room="Room 201", capacity=30, class_teacher_id=None),
        Classroom(class_code="CLS-12S", name="Grade 12", section="Science", room="Lab 3", capacity=30, class_teacher_id=None)
    ]
    db.add_all(classes_to_add)
    db.commit()
    print("Classrooms seeded successfully!")

    # Check if Maya Lin student is in db and link her to Grade 10-A
    maya = db.query(Student).filter(Student.email == "maya.lin@oakridge.edu").first()
    cls10a = db.query(Classroom).filter(Classroom.class_code == "CLS-10A").first()
    if maya and cls10a:
        maya.class_id = cls10a.id
        db.commit()
        print(f"Linked student {maya.name} to class {cls10a.name}-{cls10a.section}")

db.close()
