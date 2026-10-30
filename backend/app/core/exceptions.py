from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler formatting validation errors consistently."""
    errors = []
    for err in exc.errors():
        field = " -> ".join([str(loc) for loc in err.get("loc", [])])
        errors.append({
            "field": field,
            "message": err.get("msg", "Invalid input value"),
            "type": err.get("type", "value_error")
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error_type": "ValidationError",
            "message": "Input validation failed. Please check the supplied parameters.",
            "details": errors
        }
    )

async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Custom handler for database integrity constraints (e.g. duplicate keys)."""
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "success": False,
            "error_type": "DatabaseIntegrityError",
            "message": "A database integrity constraint was violated (such as duplicate email, student ID, or roll number).",
            "details": str(exc.orig) if hasattr(exc, "orig") else str(exc)
        }
    )
