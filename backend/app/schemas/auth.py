from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user_id: int
    email: str
    role: str
    full_name: str

class TokenData(BaseModel):
    user_id: int | None = None
    email: str | None = None
    role: str | None = None

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1, description="User email address or role identifier")
    password: str = Field(..., min_length=1, description="User password")

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters password")
    full_name: str = Field(..., min_length=2, max_length=150)
    role: UserRole = UserRole.STUDENT

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class PasswordSetupRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=8, description="New password for account activation")
    setup_token: str | None = None

