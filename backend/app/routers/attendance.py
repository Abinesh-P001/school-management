from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.attendance import Attendance
from app.models.classroom import Classroom
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceBulkCreate,
    AttendanceUpdate,
    AttendanceResponse,
    AttendanceStatsResponse
)
from app.core.dependencies import get_current_user, require_teacher
from app.core.teacher_auth import (
    get_teacher_for_user,
    get_teacher_assigned_class_ids,
    is_teacher_assigned_to_class
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post(
    "/bulk",
    status_code=status.HTTP_200_OK,
    summary="Record daily attendance for a class (Teachers & Admin)",
    description="Submit or update attendance records for students in a class on a specified date."
)
def record_bulk_attendance(
    bulk_in: AttendanceBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    cls = db.query(Classroom).filter(Classroom.id == bulk_in.class_id).first()
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {bulk_in.class_id} not found."
        )

    # Restrict teachers to their assigned classes
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.TEACHER.value:
        teacher = get_teacher_for_user(current_user, db)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No teacher profile associated with your user account."
            )
        if not is_teacher_assigned_to_class(teacher.id, bulk_in.class_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You are not authorized to mark attendance for class {cls.name} {cls.section}."
            )

    processed_count = 0
    for record in bulk_in.records:
        # Check if student belongs to DB
        student = db.query(Student).filter(Student.id == record.student_id).first()
        if not student:
            continue

        existing = db.query(Attendance).filter(
            Attendance.student_id == record.student_id,
            Attendance.date == bulk_in.date
        ).first()

        if existing:
            existing.status = record.status
            existing.remarks = record.remarks
            existing.class_id = bulk_in.class_id
        else:
            new_record = Attendance(
                student_id=record.student_id,
                class_id=bulk_in.class_id,
                date=bulk_in.date,
                status=record.status,
                remarks=record.remarks
            )
            db.add(new_record)
        processed_count += 1

    db.commit()
    return {
        "success": True,
        "class_id": bulk_in.class_id,
        "date": str(bulk_in.date),
        "records_processed": processed_count
    }

@router.get(
    "/",
    response_model=list[AttendanceResponse],
    summary="Query attendance register"
)
def get_attendance(
    class_id: int | None = Query(None, description="Filter by class ID"),
    date_val: date | None = Query(None, alias="date", description="Filter by attendance date (YYYY-MM-DD)"),
    student_id: int | None = Query(None, description="Filter by student ID"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status (Present/Absent/Late/Leave)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Attendance)
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.TEACHER.value:
        teacher = get_teacher_for_user(current_user, db)
        if teacher:
            assigned_ids = get_teacher_assigned_class_ids(teacher.id, db)
            if class_id:
                if class_id not in assigned_ids:
                    return []
                query = query.filter(Attendance.class_id == class_id)
            else:
                query = query.filter(Attendance.class_id.in_(list(assigned_ids)))
        else:
            return []
    elif class_id:
        query = query.filter(Attendance.class_id == class_id)
    if date_val:
        query = query.filter(Attendance.date == date_val)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    if status_filter:
        query = query.filter(Attendance.status == status_filter)

    return query.order_by(Attendance.date.desc(), Attendance.id.asc()).offset(skip).limit(limit).all()

@router.get(
    "/class-roster",
    summary="Get class students with dynamic attendance for a specific date (Admin & Teachers)"
)
def get_class_attendance_roster(
    class_id: int = Query(..., description="Target class ID"),
    date_val: date = Query(..., alias="date", description="Target date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cls = db.query(Classroom).filter(Classroom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    # Restrict teachers to their permitted classes if not admin
    if current_user.role == UserRole.TEACHER:
        teacher = get_teacher_for_user(current_user, db)
        if not teacher or not is_teacher_assigned_to_class(teacher.id, class_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view or mark attendance for this class."
            )
    elif current_user.role == UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students are not authorized to access class attendance registers."
        )

    # Fetch students in this class
    students = db.query(Student).filter(
        Student.class_id == class_id,
        Student.status == "Active"
    ).order_by(Student.roll_number.asc(), Student.name.asc()).all()

    # Fetch existing attendance records for this date
    existing_records = {
        att.student_id: att
        for att in db.query(Attendance).filter(
            Attendance.class_id == class_id,
            Attendance.date == date_val
        ).all()
    }

    student_entries = []
    present_cnt = 0
    absent_cnt = 0
    late_cnt = 0
    leave_cnt = 0

    for s in students:
        rec = existing_records.get(s.id)
        current_status = rec.status if rec else "Present"
        remarks = rec.remarks if rec else ""

        if current_status == "Present":
            present_cnt += 1
        elif current_status == "Absent":
            absent_cnt += 1
        elif current_status == "Late":
            late_cnt += 1
        elif current_status in ("Leave", "Excused"):
            leave_cnt += 1

        student_entries.append({
            "student_id": s.id,
            "student_code": s.student_id,
            "admission_number": s.admission_number or s.student_id,
            "roll_number": s.roll_number,
            "name": s.name,
            "status": current_status,
            "remarks": remarks,
            "attendance_id": rec.id if rec else None
        })

    total_enrolled = len(students)
    rate = round((present_cnt / total_enrolled * 100), 1) if total_enrolled > 0 else 0.0

    return {
        "class_id": cls.id,
        "class_name": cls.name,
        "section": cls.section,
        "class_code": cls.class_code,
        "date": str(date_val),
        "total_enrolled": total_enrolled,
        "summary": {
            "total_enrolled": total_enrolled,
            "present": present_cnt,
            "absent": absent_cnt,
            "late": late_cnt,
            "leave": leave_cnt,
            "excused": leave_cnt,
            "attendance_rate": rate
        },
        "students": student_entries
    }

@router.get(
    "/stats",
    response_model=AttendanceStatsResponse,
    summary="Daily attendance statistics for a class"
)
def get_attendance_stats(
    class_id: int = Query(..., description="Target class ID"),
    date_val: date | None = Query(None, alias="date", description="Date (defaults to today)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = date_val or date.today()
    records = db.query(Attendance).filter(
        Attendance.class_id == class_id,
        Attendance.date == target_date
    ).all()

    total = len(records)
    present = sum(1 for r in records if r.status == "Present")
    absent = sum(1 for r in records if r.status == "Absent")
    late = sum(1 for r in records if r.status == "Late")
    leave = sum(1 for r in records if r.status in ("Leave", "Excused"))
    rate = round((present / total * 100), 1) if total > 0 else 0.0

    return AttendanceStatsResponse(
        class_id=class_id,
        date=target_date,
        total_students=total,
        present=present,
        absent=absent,
        late=late,
        leave=leave,
        excused=leave,
        attendance_rate=rate
    )

@router.put(
    "/{attendance_id}",
    response_model=AttendanceResponse,
    summary="Update single attendance entry (Teachers & Admin)"
)
def update_attendance_record(
    attendance_id: int,
    data_in: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attendance record with ID {attendance_id} not found."
        )

    # Restrict teachers to their assigned classes
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.TEACHER.value:
        teacher = get_teacher_for_user(current_user, db)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No teacher profile associated with your user account."
            )
        if not is_teacher_assigned_to_class(teacher.id, record.class_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to update attendance for this class."
            )

    record.status = data_in.status
    if data_in.remarks is not None:
        record.remarks = data_in.remarks

    db.commit()
    db.refresh(record)
    return record
