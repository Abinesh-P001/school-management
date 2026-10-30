from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.teacher import Teacher
from app.models.teacher_attendance import TeacherAttendance
from app.models.user import User, UserRole
from app.schemas.teacher_attendance import (
    TeacherAttendanceCreate,
    TeacherAttendanceBulkCreate,
    TeacherAttendanceUpdate,
    TeacherAttendanceResponse,
    TeacherAttendanceStatsResponse
)
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/teacher-attendance", tags=["Teacher Attendance"])

@router.post(
    "/",
    response_model=TeacherAttendanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Record or update teacher attendance (Admin only)",
    description="Upserts a teacher attendance record for a specific date."
)
def record_teacher_attendance(
    att_in: TeacherAttendanceCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    teacher = db.query(Teacher).filter(Teacher.id == att_in.teacher_id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with ID {att_in.teacher_id} not found."
        )

    # Upsert logic
    existing = db.query(TeacherAttendance).filter(
        TeacherAttendance.teacher_id == att_in.teacher_id,
        TeacherAttendance.attendance_date == att_in.attendance_date
    ).first()

    if existing:
        existing.status = att_in.status
        if att_in.remarks is not None:
            existing.remarks = att_in.remarks
        record = existing
    else:
        record = TeacherAttendance(
            teacher_id=att_in.teacher_id,
            attendance_date=att_in.attendance_date,
            status=att_in.status,
            remarks=att_in.remarks
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return TeacherAttendanceResponse(
        id=record.id,
        teacher_id=record.teacher_id,
        attendance_date=record.attendance_date,
        status=record.status,
        remarks=record.remarks,
        teacher_name=teacher.name,
        teacher_employee_id=teacher.employee_id,
        teacher_department=teacher.department,
        created_at=record.created_at,
        updated_at=record.updated_at
    )

@router.post(
    "/bulk",
    status_code=status.HTTP_200_OK,
    summary="Bulk record or update teacher attendance (Admin only)",
    description="Submit attendance for multiple faculty members on a given date."
)
def bulk_record_teacher_attendance(
    bulk_in: TeacherAttendanceBulkCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    processed = 0
    for item in bulk_in.records:
        teacher = db.query(Teacher).filter(Teacher.id == item.teacher_id).first()
        if not teacher:
            continue

        existing = db.query(TeacherAttendance).filter(
            TeacherAttendance.teacher_id == item.teacher_id,
            TeacherAttendance.attendance_date == bulk_in.attendance_date
        ).first()

        if existing:
            existing.status = item.status
            if item.remarks is not None:
                existing.remarks = item.remarks
        else:
            new_entry = TeacherAttendance(
                teacher_id=item.teacher_id,
                attendance_date=bulk_in.attendance_date,
                status=item.status,
                remarks=item.remarks
            )
            db.add(new_entry)
        processed += 1

    db.commit()
    return {
        "success": True,
        "date": str(bulk_in.attendance_date),
        "records_processed": processed
    }

@router.get(
    "/",
    response_model=List[TeacherAttendanceResponse],
    summary="Query teacher attendance records"
)
def get_teacher_attendance(
    attendance_date: Optional[date] = Query(None, alias="date", description="Filter by date"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    teacher_id: Optional[int] = Query(None, description="Filter by teacher ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Present/Absent/Late/Leave)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TeacherAttendance)

    # Non-admins can only view their own attendance
    if current_user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(
            (Teacher.user_id == current_user.id) | (Teacher.email == current_user.email)
        ).first()
        if teacher:
            query = query.filter(TeacherAttendance.teacher_id == teacher.id)
        else:
            return []
    elif current_user.role == UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot access faculty attendance records."
        )

    if attendance_date:
        query = query.filter(TeacherAttendance.attendance_date == attendance_date)
    if start_date:
        query = query.filter(TeacherAttendance.attendance_date >= start_date)
    if end_date:
        query = query.filter(TeacherAttendance.attendance_date <= end_date)
    if teacher_id:
        query = query.filter(TeacherAttendance.teacher_id == teacher_id)
    if status_filter:
        query = query.filter(TeacherAttendance.status == status_filter)

    records = query.order_by(TeacherAttendance.attendance_date.desc(), TeacherAttendance.id.desc()).all()
    results = []
    for r in records:
        t = r.teacher
        results.append(TeacherAttendanceResponse(
            id=r.id,
            teacher_id=r.teacher_id,
            attendance_date=r.attendance_date,
            status=r.status,
            remarks=r.remarks,
            teacher_name=t.name if t else "Unknown",
            teacher_employee_id=t.employee_id if t else "N/A",
            teacher_department=t.department if t else None,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return results

@router.get(
    "/stats",
    response_model=TeacherAttendanceStatsResponse,
    summary="Daily or period attendance stats for teachers"
)
def get_teacher_attendance_stats(
    attendance_date: Optional[date] = Query(None, alias="date", description="Date (defaults to today)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = attendance_date or date.today()
    total_teachers = db.query(Teacher).count()
    records = db.query(TeacherAttendance).filter(
        TeacherAttendance.attendance_date == target_date
    ).all()

    present = sum(1 for r in records if r.status == "Present")
    absent = sum(1 for r in records if r.status == "Absent")
    late = sum(1 for r in records if r.status == "Late")
    leave = sum(1 for r in records if r.status == "Leave")

    # Attendance percentage based on recorded or total faculty
    base = len(records) if len(records) > 0 else total_teachers
    rate = round((present / base * 100), 1) if base > 0 else 0.0

    return TeacherAttendanceStatsResponse(
        attendance_date=target_date,
        total_teachers=total_teachers,
        present=present,
        absent=absent,
        late=late,
        leave=leave,
        attendance_rate=rate
    )

@router.put(
    "/{attendance_id}",
    response_model=TeacherAttendanceResponse,
    summary="Update single teacher attendance entry (Admin only)"
)
def update_teacher_attendance_record(
    attendance_id: int,
    data_in: TeacherAttendanceUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    record = db.query(TeacherAttendance).filter(TeacherAttendance.id == attendance_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher attendance record with ID {attendance_id} not found."
        )

    record.status = data_in.status
    if data_in.remarks is not None:
        record.remarks = data_in.remarks

    db.commit()
    db.refresh(record)

    t = record.teacher
    return TeacherAttendanceResponse(
        id=record.id,
        teacher_id=record.teacher_id,
        attendance_date=record.attendance_date,
        status=record.status,
        remarks=record.remarks,
        teacher_name=t.name if t else "Unknown",
        teacher_employee_id=t.employee_id if t else "N/A",
        teacher_department=t.department if t else None,
        created_at=record.created_at,
        updated_at=record.updated_at
    )

@router.delete(
    "/{attendance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete teacher attendance entry (Admin only)"
)
def delete_teacher_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    record = db.query(TeacherAttendance).filter(TeacherAttendance.id == attendance_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher attendance record with ID {attendance_id} not found."
        )

    db.delete(record)
    db.commit()
    return None

