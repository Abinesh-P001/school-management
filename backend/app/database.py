import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

logger = logging.getLogger("uvicorn.error")

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_file = os.path.join(backend_dir, "school_management_dev.db").replace(os.sep, "/")
sqlite_fallback_url = f"sqlite:///{db_file}"

database_url = settings.get_database_url
if not database_url or "school_management_dev.db" in database_url or "sqlite" in database_url:
    database_url = sqlite_fallback_url

# Configure connection arguments based on database dialect
connect_args = {}
if "sqlite" in database_url:
    connect_args = {"check_same_thread": False}
else:
    # MySQL pool settings
    connect_args = {"charset": "utf8mb4", "connect_timeout": 2}

try:
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args=connect_args
    )
    # Test connection
    with engine.connect() as conn:
        pass
    logger.info(f"Database connected successfully to {database_url.split('@')[-1] if '@' in database_url else 'local DB'}")
except Exception as e:
    logger.warning(f"Could not connect to configured MySQL database: {e}. Falling back to SQLite local database for development.")
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_file = os.path.join(backend_dir, "school_management_dev.db")
    fallback_url = f"sqlite:///{db_file}"
    engine = create_engine(fallback_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
