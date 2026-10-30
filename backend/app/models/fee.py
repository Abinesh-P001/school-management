from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class FeeInvoice(Base):
    __tablename__ = "fee_invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_type = Column(String(150), nullable=False) # e.g. "Term 2 Tuition & Lab Fee"
    amount = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Date, nullable=False)
    paid_date = Column(Date, nullable=True)
    payment_method = Column(String(50), nullable=True)
    status = Column(String(30), default="Pending", nullable=False, index=True) # Paid, Pending, Overdue
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="fee_invoices", lazy="joined")
