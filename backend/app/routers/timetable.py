from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.database import get_db
from app.models.timetable import TimetablePeriod
from app.models.classroom import Classroom
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.user import User, UserRole
from app.core.dependencies import get_current_user, require_admin
from app.core.teacher_auth import (
    get_teacher_for_user,
    get_teacher_assigned_class_ids,
    is_teacher_assigned_to_class
)
from app.schemas.timetable import (
    TimetableSlotCreate,
    TimetableSlotUpdate,
    TimetableSlotResponse,
    ClassTimetableResponse,
    TeacherTimetableResponse
)

router = APIRouter(prefix="/timetable", tags=["Timetable Management"])
teacher_router = APIRouter(prefix="/teacher", tags=["Teacher Timetable"])

def verify_timetable_edit_permission(current_user: User, class_id: int, db: Session):
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.ADMIN.value:
        return
    if user_role == UserRole.TEACHER.value:
        teacher = db.query(Teacher).filter(
            or_(Teacher.user_id == current_user.id, Teacher.email == current_user.email)
        ).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No teacher profile associated with your user account."
            )
        cls = db.query(Classroom).filter(Classroom.id == class_id).first()
        from app.models.teacher_subject_assignment import TeacherSubjectAssignment
        is_mentor = cls and cls.class_teacher_id == teacher.id
        is_assigned = db.query(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id,
            TeacherSubjectAssignment.class_id == class_id
        ).first() is not None
        if not (is_mentor or is_assigned):
            cls_name = f"{cls.name} {cls.section}" if cls else f"Class #{class_id}"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You do not have permission to manage the timetable for {cls_name}."
            )
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to modify timetable records."
    )

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

def _to_slot_response(period: TimetablePeriod) -> TimetableSlotResponse:
    cls = period.classroom
    tch = period.teacher
    return TimetableSlotResponse(
        id=period.id,
        academic_year=period.academic_year,
        class_id=period.class_id,
        class_name=cls.name if cls else "Unknown",
        section=period.section or (cls.section if cls else "A"),
        day_of_week=period.day_of_week,
        period_number=period.period_number,
        start_time=period.start_time,
        end_time=period.end_time,
        subject=period.subject,
        teacher_id=period.teacher_id,
        teacher_name=tch.name if tch else None,
        teacher_email=tch.email if tch else None,
        room=period.room or (cls.room if cls else None),
        is_break=period.is_break,
        created_at=period.created_at,
        updated_at=period.updated_at
    )

@router.get("", response_model=ClassTimetableResponse, summary="Get timetable for a specific class and section")
@router.get("/", response_model=ClassTimetableResponse, include_in_schema=False)
def get_class_timetable(
    academic_year: str = Query("2026-2027", description="Academic year"),
    class_id: Optional[int] = Query(None, description="Specific classroom ID"),
    section: Optional[str] = Query(None, description="Class section (if querying by class name)"),
    class_name: Optional[str] = Query(None, description="Class name, e.g. 'Class 6' or 'Grade 10'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the timetable for the specified class, section, and academic year.
    If current user is a student, automatically locks to their enrolled class.
    """
    target_class_id = class_id

    # If student, enforce viewing only their enrolled class
    if current_user.role == UserRole.STUDENT:
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_profile or not student_profile.class_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student is not currently enrolled in any classroom."
            )
        target_class_id = student_profile.class_id

    # If not provided, try resolving from class_name + section
    if not target_class_id and class_name:
        q = db.query(Classroom).filter(Classroom.name == class_name)
        if section:
            q = q.filter(Classroom.section == section)
        cls_obj = q.first()
        if cls_obj:
            target_class_id = cls_obj.id

    # If still not provided, fallback to the teacher's assigned class or first active class
    if not target_class_id:
        if current_user.role == UserRole.TEACHER:
            teacher = get_teacher_for_user(current_user, db)
            if teacher:
                assigned_ids = get_teacher_assigned_class_ids(teacher.id, db)
                if assigned_ids:
                    target_class_id = sorted(list(assigned_ids))[0]
        if not target_class_id:
            first_cls = db.query(Classroom).order_by(Classroom.id.asc()).first()
            if not first_cls:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No classes found in the system."
                )
            target_class_id = first_cls.id

    classroom = db.query(Classroom).filter(Classroom.id == target_class_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom with ID {target_class_id} not found."
        )

    # Fetch all timetable periods for this specific class and academic year
    periods = db.query(TimetablePeriod).filter(
        TimetablePeriod.class_id == target_class_id,
        TimetablePeriod.academic_year == academic_year
    ).order_by(
        TimetablePeriod.day_of_week.asc(),
        TimetablePeriod.period_number.asc()
    ).all()

    # Build daily grid
    grid: Dict[str, List[TimetableSlotResponse]] = {day: [] for day in WEEKDAYS}
    for p in periods:
        if p.day_of_week in grid:
            grid[p.day_of_week].append(_to_slot_response(p))

    # Derive unique time slots
    time_slots_seen = {}
    for p in periods:
        key = p.period_number
        if key not in time_slots_seen:
            time_slots_seen[key] = {
                "period": f"Period {p.period_number}" if not p.is_break else "Recess / Break",
                "time": f"{p.start_time} - {p.end_time}",
                "period_number": p.period_number,
                "is_break": p.is_break
            }
    sorted_time_slots = [time_slots_seen[k] for k in sorted(time_slots_seen.keys())]

    return ClassTimetableResponse(
        academic_year=academic_year,
        class_id=classroom.id,
        class_name=classroom.name,
        section=classroom.section,
        days=WEEKDAYS,
        time_slots=sorted_time_slots,
        grid=grid,
        total_periods=len(periods)
    )

@router.get("/slots", response_model=List[TimetableSlotResponse], summary="List flat timetable period slots with filters")
def list_timetable_slots(
    academic_year: Optional[str] = Query("2026-2027"),
    class_id: Optional[int] = Query(None),
    section: Optional[str] = Query(None),
    day_of_week: Optional[str] = Query(None),
    teacher_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TimetablePeriod)
    if academic_year:
        query = query.filter(TimetablePeriod.academic_year == academic_year)
    if class_id:
        query = query.filter(TimetablePeriod.class_id == class_id)
    if section:
        query = query.filter(TimetablePeriod.section == section)
    if day_of_week:
        query = query.filter(TimetablePeriod.day_of_week == day_of_week.capitalize())
    if teacher_id:
        query = query.filter(TimetablePeriod.teacher_id == teacher_id)

    # Student security restriction
    if current_user.role == UserRole.STUDENT:
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student_profile and student_profile.class_id:
            query = query.filter(TimetablePeriod.class_id == student_profile.class_id)
        else:
            return []

    periods = query.order_by(TimetablePeriod.period_number.asc()).all()
    return [_to_slot_response(p) for p in periods]

@router.get("/teacher", response_model=TeacherTimetableResponse, summary="Get assigned teaching periods for current teacher")
@router.get("/my-timetable", response_model=TeacherTimetableResponse, include_in_schema=False)
def get_teacher_timetable(
    academic_year: str = Query("2026-2027"),
    teacher_id: Optional[int] = Query(None, description="Optional teacher ID for Admin inspection"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    # 1. Access restriction: Students cannot access the faculty timetable
    if user_role == UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Student accounts cannot access the faculty timetable console."
        )

    target_teacher = None
    # 2. Admin inspecting a specific teacher
    if user_role == UserRole.ADMIN.value and teacher_id:
        target_teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
        if not target_teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {teacher_id} not found."
            )
    else:
        # 3. Authenticated teacher lookup (always ignores client-supplied teacher_id for non-admins)
        target_teacher = db.query(Teacher).filter(
            or_(
                Teacher.user_id == current_user.id,
                func.lower(Teacher.email) == func.lower(current_user.email)
            )
        ).first()

    if not target_teacher:
        if user_role == UserRole.ADMIN.value:
            # If Admin has no linked teacher record, use the first active teacher or return empty view
            first_t = db.query(Teacher).order_by(Teacher.id.asc()).first()
            if first_t:
                target_teacher = first_t
            else:
                return TeacherTimetableResponse(
                    teacher_id=0,
                    teacher_name="Institutional Master Overview",
                    academic_year=academic_year,
                    days=WEEKDAYS,
                    periods=[],
                    grid={day: [] for day in WEEKDAYS},
                    total_assigned_periods=0
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher profile not found for authenticated user account."
            )

    # Fetch all assigned instructional periods across all classes, sections, and subjects
    periods = db.query(TimetablePeriod).filter(
        TimetablePeriod.teacher_id == target_teacher.id,
        TimetablePeriod.academic_year == academic_year
    ).order_by(
        TimetablePeriod.day_of_week.asc(),
        TimetablePeriod.period_number.asc()
    ).all()

    grid: Dict[str, List[TimetableSlotResponse]] = {day: [] for day in WEEKDAYS}
    for p in periods:
        if p.day_of_week in grid:
            grid[p.day_of_week].append(_to_slot_response(p))

    slot_responses = [_to_slot_response(p) for p in periods]

    return TeacherTimetableResponse(
        teacher_id=target_teacher.id,
        teacher_name=target_teacher.name,
        academic_year=academic_year,
        days=WEEKDAYS,
        periods=slot_responses,
        grid=grid,
        total_assigned_periods=len(periods)
    )

# Alias endpoint for GET /api/teacher/timetable
@teacher_router.get("/timetable", response_model=TeacherTimetableResponse, summary="Get assigned timetable for logged-in teacher")
@teacher_router.get("/timetable/", response_model=TeacherTimetableResponse, include_in_schema=False)
def get_teacher_timetable_portal_alias(
    academic_year: str = Query("2026-2027"),
    teacher_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_teacher_timetable(academic_year=academic_year, teacher_id=teacher_id, db=db, current_user=current_user)

@router.get("/student", response_model=ClassTimetableResponse, summary="Get timetable for enrolled student's classroom")
def get_student_enrolled_timetable(
    academic_year: str = Query("2026-2027"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student or not student.class_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not currently enrolled in any classroom."
        )

    return get_class_timetable(
        academic_year=academic_year,
        class_id=student.class_id,
        db=db,
        current_user=current_user
    )

@router.post("", response_model=TimetableSlotResponse, status_code=status.HTTP_201_CREATED, summary="Add a timetable period (Admin or Class Mentor/Faculty)")
@router.post("/", response_model=TimetableSlotResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_timetable_slot(
    payload: TimetableSlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Authorization verification
    verify_timetable_edit_permission(current_user, payload.class_id, db)

    # Verify classroom exists
    classroom = db.query(Classroom).filter(Classroom.id == payload.class_id).first()
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classroom with ID {payload.class_id} not found."
        )

    # Verify teacher exists if assigned
    if payload.teacher_id:
        teacher = db.query(Teacher).filter(Teacher.id == payload.teacher_id).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {payload.teacher_id} not found."
            )

    # Check for duplicate slot
    existing = db.query(TimetablePeriod).filter(
        TimetablePeriod.academic_year == payload.academic_year,
        TimetablePeriod.class_id == payload.class_id,
        TimetablePeriod.day_of_week == payload.day_of_week,
        TimetablePeriod.period_number == payload.period_number
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Period {payload.period_number} for {payload.day_of_week} ({payload.academic_year}) already exists for this class. Please edit the existing period."
        )

    # Check for Teacher schedule collision (if teacher assigned and not a break)
    if payload.teacher_id and not payload.is_break:
        teacher_conflict = db.query(TimetablePeriod).filter(
            TimetablePeriod.teacher_id == payload.teacher_id,
            TimetablePeriod.academic_year == payload.academic_year,
            TimetablePeriod.day_of_week == payload.day_of_week,
            or_(
                TimetablePeriod.period_number == payload.period_number,
                and_(
                    TimetablePeriod.start_time < payload.end_time,
                    TimetablePeriod.end_time > payload.start_time
                )
            )
        ).first()

        if teacher_conflict:
            conflict_cls = teacher_conflict.classroom
            cls_label = f"{conflict_cls.name}-{conflict_cls.section}" if conflict_cls else f"Class #{teacher_conflict.class_id}"
            t_obj = db.query(Teacher).filter(Teacher.id == payload.teacher_id).first()
            t_name = t_obj.name if t_obj else "Teacher"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Teacher schedule conflict: {t_name} is already assigned to {cls_label} on {payload.day_of_week} during Period {teacher_conflict.period_number} ({teacher_conflict.start_time} - {teacher_conflict.end_time})."
            )

    # Check for Room conflict (prevent double-booking rooms)
    target_room = (payload.room or classroom.room or "").strip()
    if target_room and not payload.is_break:
        room_conflict = db.query(TimetablePeriod).filter(
            TimetablePeriod.academic_year == payload.academic_year,
            TimetablePeriod.day_of_week == payload.day_of_week,
            TimetablePeriod.class_id != payload.class_id,
            func.lower(TimetablePeriod.room) == target_room.lower(),
            or_(
                TimetablePeriod.period_number == payload.period_number,
                and_(
                    TimetablePeriod.start_time < payload.end_time,
                    TimetablePeriod.end_time > payload.start_time
                )
            )
        ).first()

        if room_conflict:
            r_cls = room_conflict.classroom
            r_label = f"{r_cls.name}-{r_cls.section}" if r_cls else f"Class #{room_conflict.class_id}"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room conflict: Location '{target_room}' is already booked by {r_label} on {payload.day_of_week} during Period {room_conflict.period_number} ({room_conflict.start_time} - {room_conflict.end_time})."
            )

    new_slot = TimetablePeriod(
        academic_year=payload.academic_year,
        class_id=payload.class_id,
        section=payload.section or classroom.section,
        day_of_week=payload.day_of_week,
        period_number=payload.period_number,
        start_time=payload.start_time,
        end_time=payload.end_time,
        subject=payload.subject,
        teacher_id=payload.teacher_id,
        room=payload.room or classroom.room,
        is_break=payload.is_break
    )

    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)

    return _to_slot_response(new_slot)

@router.get("/{slot_id}", response_model=TimetableSlotResponse, summary="Get an individual timetable period entry")
def get_timetable_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    slot = db.query(TimetablePeriod).filter(TimetablePeriod.id == slot_id).first()
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable period with ID {slot_id} not found."
        )

    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.STUDENT.value:
        student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student_profile or student_profile.class_id != slot.class_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You can only view timetable entries for your enrolled class."
            )

    return _to_slot_response(slot)

@router.put("/{slot_id}", response_model=TimetableSlotResponse, summary="Edit a timetable period (Admin or Assigned Faculty)")
def update_timetable_slot(
    slot_id: int,
    payload: TimetableSlotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    slot = db.query(TimetablePeriod).filter(TimetablePeriod.id == slot_id).first()
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable period with ID {slot_id} not found."
        )

    verify_timetable_edit_permission(current_user, slot.class_id, db)

    # Validate teacher if updated
    if payload.teacher_id is not None:
        teacher = db.query(Teacher).filter(Teacher.id == payload.teacher_id).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with ID {payload.teacher_id} not found."
            )
        slot.teacher_id = payload.teacher_id

    # Check duplicate if day or period_number or academic_year is modified
    target_year = payload.academic_year or slot.academic_year
    target_day = payload.day_of_week or slot.day_of_week
    target_period = payload.period_number if payload.period_number is not None else slot.period_number

    if target_year != slot.academic_year or target_day != slot.day_of_week or target_period != slot.period_number:
        conflict = db.query(TimetablePeriod).filter(
            TimetablePeriod.id != slot_id,
            TimetablePeriod.class_id == slot.class_id,
            TimetablePeriod.academic_year == target_year,
            TimetablePeriod.day_of_week == target_day,
            TimetablePeriod.period_number == target_period
        ).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Conflict: Period {target_period} on {target_day} ({target_year}) is already occupied for this class."
            )

    # Validate start_time and end_time
    new_start = payload.start_time or slot.start_time
    new_end = payload.end_time or slot.end_time
    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"End time ({new_end}) must be strictly after start time ({new_start})."
        )

    # Check for Teacher schedule collision (if teacher updated or times/day updated and not a break)
    check_teacher_id = payload.teacher_id if payload.teacher_id is not None else slot.teacher_id
    check_is_break = payload.is_break if payload.is_break is not None else slot.is_break
    if check_teacher_id and not check_is_break:
        teacher_conflict = db.query(TimetablePeriod).filter(
            TimetablePeriod.id != slot_id,
            TimetablePeriod.teacher_id == check_teacher_id,
            TimetablePeriod.academic_year == target_year,
            TimetablePeriod.day_of_week == target_day,
            or_(
                TimetablePeriod.period_number == target_period,
                and_(
                    TimetablePeriod.start_time < new_end,
                    TimetablePeriod.end_time > new_start
                )
            )
        ).first()

        if teacher_conflict:
            conflict_cls = teacher_conflict.classroom
            cls_label = f"{conflict_cls.name}-{conflict_cls.section}" if conflict_cls else f"Class #{teacher_conflict.class_id}"
            t_obj = db.query(Teacher).filter(Teacher.id == check_teacher_id).first()
            teacher_name = t_obj.name if t_obj else "Selected teacher"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Teacher schedule conflict: {teacher_name} is already assigned to {cls_label} on {target_day} during Period {teacher_conflict.period_number} ({teacher_conflict.start_time} - {teacher_conflict.end_time})."
            )

    # Check for Room conflict (prevent double-booking rooms on updates)
    check_room = (payload.room if payload.room is not None else slot.room or "").strip()
    if check_room and not check_is_break:
        room_conflict = db.query(TimetablePeriod).filter(
            TimetablePeriod.id != slot_id,
            TimetablePeriod.academic_year == target_year,
            TimetablePeriod.day_of_week == target_day,
            TimetablePeriod.class_id != slot.class_id,
            func.lower(TimetablePeriod.room) == check_room.lower(),
            or_(
                TimetablePeriod.period_number == target_period,
                and_(
                    TimetablePeriod.start_time < new_end,
                    TimetablePeriod.end_time > new_start
                )
            )
        ).first()

        if room_conflict:
            conflict_cls = room_conflict.classroom
            r_label = f"{conflict_cls.name}-{conflict_cls.section}" if conflict_cls else f"Class #{room_conflict.class_id}"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room conflict: Location '{check_room}' is already booked by {r_label} on {target_day} during Period {room_conflict.period_number} ({room_conflict.start_time} - {room_conflict.end_time})."
            )

    if payload.academic_year is not None:
        slot.academic_year = payload.academic_year
    if payload.day_of_week is not None:
        slot.day_of_week = payload.day_of_week
    if payload.period_number is not None:
        slot.period_number = payload.period_number
    if payload.start_time is not None:
        slot.start_time = payload.start_time
    if payload.end_time is not None:
        slot.end_time = payload.end_time
    if payload.subject is not None:
        slot.subject = payload.subject
    if payload.room is not None:
        slot.room = payload.room
    if payload.is_break is not None:
        slot.is_break = payload.is_break

    db.commit()
    db.refresh(slot)
    return _to_slot_response(slot)

@router.delete("/{slot_id}", status_code=status.HTTP_200_OK, summary="Delete a timetable period (Admin or Assigned Faculty)")
def delete_timetable_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    slot = db.query(TimetablePeriod).filter(TimetablePeriod.id == slot_id).first()
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timetable period with ID {slot_id} not found."
        )

    verify_timetable_edit_permission(current_user, slot.class_id, db)

    db.delete(slot)
    db.commit()
    return {"message": f"Timetable period with ID {slot_id} deleted successfully."}
