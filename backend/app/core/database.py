"""One SQLAlchemy database for demo auth, booking and device subscriptions."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

url = os.getenv('DATABASE_URL', 'sqlite:///./dinovo.sqlite3')
if url.startswith('sqlite:///'):
    p = Path(url[len('sqlite:///'):])
    if p.parent != Path('.'):
        p.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(url, pool_pre_ping=True, connect_args={'check_same_thread': False, 'timeout': 15} if url.startswith('sqlite:') else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

def initialize_database():
    from app.core import models  # noqa: F401
    Base.metadata.create_all(bind=engine)  # demo bootstrap; production uses Alembic

def get_db():
    with SessionLocal() as session:
        yield session
