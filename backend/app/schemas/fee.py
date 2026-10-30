from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field

class FeeCreate(BaseModel):
    student_id: int
    fee_type: str = Field(..., min_length=2, max_length=150)
    amount: Decimal = Field(..., gt=0)
    due_date: date
    invoice_number: str | None = None
    notes: str | None = None

class FeePaymentRecord(BaseModel):
    payment_method: str = Field(..., min_length=2, max_length=50) # e.g. Credit Card, Bank Transfer, Cash
    paid_date: date | None = None
    notes: str | None = None

class FeeResponse(BaseModel):
    id: int
    invoice_number: str
    student_id: int
    student_name: str | None = None
    student_code: str | None = None
    fee_type: str
    amount: float
    due_date: date
    paid_date: date | None
    payment_method: str | None
    status: str
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True

class FeeSummaryResponse(BaseModel):
    total_invoiced: float
    total_collected: float
    total_pending: float
    total_overdue: float
    paid_invoices_count: int
    pending_invoices_count: int
    overdue_invoices_count: int
