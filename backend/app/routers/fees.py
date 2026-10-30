from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.fee import FeeInvoice
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.fee import (
    FeeCreate,
    FeePaymentRecord,
    FeeResponse,
    FeeSummaryResponse
)
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/fees", tags=["Fee Management"])

def generate_invoice_number(db: Session) -> str:
    count = db.query(FeeInvoice).count() + 1
    current_year = date.today().year
    return f"INV-{current_year}-{count:03d}"

@router.post(
    "/",
    response_model=FeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Issue fee invoice (Admin only)"
)
def create_fee_invoice(
    fee_in: FeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    student = db.query(Student).filter(Student.id == fee_in.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {fee_in.student_id} not found."
        )

    invoice_number = fee_in.invoice_number or generate_invoice_number(db)
    if db.query(FeeInvoice).filter(FeeInvoice.invoice_number == invoice_number).first():
        invoice_number = f"{invoice_number}-{db.query(FeeInvoice).count() + 1}"

    # Determine status if past due
    initial_status = "Pending"
    if fee_in.due_date < date.today():
        initial_status = "Overdue"

    invoice = FeeInvoice(
        invoice_number=invoice_number,
        student_id=fee_in.student_id,
        fee_type=fee_in.fee_type,
        amount=fee_in.amount,
        due_date=fee_in.due_date,
        status=initial_status,
        notes=fee_in.notes
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return FeeResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        student_id=invoice.student_id,
        student_name=student.name,
        student_code=student.student_id,
        fee_type=invoice.fee_type,
        amount=float(invoice.amount),
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        payment_method=invoice.payment_method,
        status=invoice.status,
        notes=invoice.notes,
        created_at=invoice.created_at
    )

@router.get(
    "/",
    response_model=list[FeeResponse],
    summary="List fee invoices"
)
def list_fee_invoices(
    student_id: int | None = Query(None, description="Filter by student ID"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status (Paid/Pending/Overdue)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(FeeInvoice)

    # Privacy Protection & RBAC Access Enforcement
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role == UserRole.TEACHER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faculty members are not authorized to access confidential school financial records."
        )
    elif user_role in [UserRole.PARENT.value, "parent"]:
        from app.models.parent import Parent, ParentStudent
        parent = db.query(Parent).filter(
            (Parent.user_id == current_user.id) | (Parent.email == current_user.email)
        ).first()
        if not parent:
            return []
        child_ids = [ps.student_id for ps in parent.parent_students if ps.is_verified]
        if not child_ids:
            return []
        if student_id:
            if student_id not in child_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view fee invoices for your verified linked children."
                )
            query = query.filter(FeeInvoice.student_id == student_id)
        else:
            query = query.filter(FeeInvoice.student_id.in_(child_ids))
    elif user_role == UserRole.STUDENT.value:
        student = db.query(Student).filter(
            (Student.user_id == current_user.id) | (Student.email == current_user.email)
        ).first()
        if student:
            query = query.filter(FeeInvoice.student_id == student.id)
        else:
            return []
    elif student_id:
        query = query.filter(FeeInvoice.student_id == student_id)

    if status_filter:
        query = query.filter(FeeInvoice.status == status_filter)

    invoices = query.order_by(FeeInvoice.id.desc()).offset(skip).limit(limit).all()
    results = []
    for inv in invoices:
        results.append(FeeResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            student_id=inv.student_id,
            student_name=inv.student.name if inv.student else None,
            student_code=inv.student.student_id if inv.student else None,
            fee_type=inv.fee_type,
            amount=float(inv.amount),
            due_date=inv.due_date,
            paid_date=inv.paid_date,
            payment_method=inv.payment_method,
            status=inv.status,
            notes=inv.notes,
            created_at=inv.created_at
        ))
    return results

@router.get(
    "/summary",
    response_model=FeeSummaryResponse,
    summary="Financial ledger collection health metrics (Admin only)"
)
def get_fee_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    invoices = db.query(FeeInvoice).all()

    total_invoiced = sum(inv.amount for inv in invoices)
    total_collected = sum(inv.amount for inv in invoices if inv.status == "Paid")
    total_pending = sum(inv.amount for inv in invoices if inv.status == "Pending")
    total_overdue = sum(inv.amount for inv in invoices if inv.status == "Overdue")

    paid_count = sum(1 for inv in invoices if inv.status == "Paid")
    pending_count = sum(1 for inv in invoices if inv.status == "Pending")
    overdue_count = sum(1 for inv in invoices if inv.status == "Overdue")

    return FeeSummaryResponse(
        total_invoiced=float(total_invoiced),
        total_collected=float(total_collected),
        total_pending=float(total_pending),
        total_overdue=float(total_overdue),
        paid_invoices_count=paid_count,
        pending_invoices_count=pending_count,
        overdue_invoices_count=overdue_count
    )

@router.post(
    "/{invoice_id}/pay",
    response_model=FeeResponse,
    summary="Record fee settlement (Admin only)"
)
def pay_invoice(
    invoice_id: int,
    payment_in: FeePaymentRecord,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    invoice = db.query(FeeInvoice).filter(FeeInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice with ID {invoice_id} not found."
        )

    invoice.status = "Paid"
    invoice.paid_date = payment_in.paid_date or date.today()
    invoice.payment_method = payment_in.payment_method
    if payment_in.notes:
        invoice.notes = payment_in.notes

    # Update student's fee status if no remaining pending/overdue invoices
    student = invoice.student
    if student:
        unpaid = db.query(FeeInvoice).filter(
            FeeInvoice.student_id == student.id,
            FeeInvoice.id != invoice.id,
            FeeInvoice.status.in_(["Pending", "Overdue"])
        ).count()
        if unpaid == 0:
            student.fees_status = "Paid"

    db.commit()
    db.refresh(invoice)

    return FeeResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        student_id=invoice.student_id,
        student_name=student.name if student else None,
        student_code=student.student_id if student else None,
        fee_type=invoice.fee_type,
        amount=float(invoice.amount),
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        payment_method=invoice.payment_method,
        status=invoice.status,
        notes=invoice.notes,
        created_at=invoice.created_at
    )
