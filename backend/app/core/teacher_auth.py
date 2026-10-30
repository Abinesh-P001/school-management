from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.teacher import Teacher
from app.models.classroom import Classroom
from app.models.teacher_subject_assignment import TeacherSubjectAssignment
from app.models.user import User

def get_teacher_for_user(user: User, db: Session) -> Teacher | None:
    """Retrieve the Teacher profile associated with an authenticated User."""
    return db.query(Teacher).filter(
        or_(Teacher.user_id == user.id, Teacher.email == user.email)
    ).first()

def get_teacher_assigned_class_ids(teacher_id: int, db: Session) -> set[int]:
    """
    Returns the complete set of class IDs assigned to a teacher:
    1. Mentorship classes (where teacher is class_teacher_id)
    2. Teaching classes (where teacher has a TeacherSubjectAssignment)
    """
    mentored_classes = db.query(Classroom.id).filter(
        Classroom.class_teacher_id == teacher_id
    ).all()
    
    subject_classes = db.query(TeacherSubjectAssignment.class_id).filter(
        TeacherSubjectAssignment.teacher_id == teacher_id
    ).all()
    
    class_ids = {c[0] for c in mentored_classes}
    for sc in subject_classes:
        class_ids.add(sc[0])
    return class_ids

def is_teacher_assigned_to_class(teacher_id: int, class_id: int, db: Session) -> bool:
    """Check if teacher is either class mentor OR assigned as a subject teacher in the class."""
    if not class_id or not teacher_id:
        return False
    is_mentor = db.query(Classroom).filter(
        Classroom.id == class_id,
        Classroom.class_teacher_id == teacher_id
    ).first() is not None
    if is_mentor:
        return True
    
    is_subject = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == teacher_id,
        TeacherSubjectAssignment.class_id == class_id
    ).first() is not None
    return is_subject

def is_teacher_assigned_to_subject(teacher_id: int, class_id: int, subject: str, db: Session) -> bool:
    """
    Check if teacher is assigned to teach a specific subject in a class,
    or is the class mentor for that class.
    """
    if not class_id or not teacher_id or not subject:
        return False
    
    # Check direct subject assignment
    is_subject = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == teacher_id,
        TeacherSubjectAssignment.class_id == class_id,
        TeacherSubjectAssignment.subject.ilike(subject.strip())
    ).first() is not None
    if is_subject:
        return True
        
    # Class mentors can also manage academic records for their class
    is_mentor = db.query(Classroom).filter(
        Classroom.id == class_id,
        Classroom.class_teacher_id == teacher_id
    ).first() is not None
    return is_mentor

def can_teacher_add_students_to_class(teacher_id: int, class_id: int, db: Session) -> bool:
    """
    Mentors can always add students to their mentored class.
    Subject teachers can add students if explicitly granted can_add_students permission.
    """
    if not class_id or not teacher_id:
        return False
    
    is_mentor = db.query(Classroom).filter(
        Classroom.id == class_id,
        Classroom.class_teacher_id == teacher_id
    ).first() is not None
    if is_mentor:
        return True
        
    is_authorized_subject = db.query(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == teacher_id,
        TeacherSubjectAssignment.class_id == class_id,
        TeacherSubjectAssignment.can_add_students == True
    ).first() is not None
    return is_authorized_subject
