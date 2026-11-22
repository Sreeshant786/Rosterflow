import os
from typing import List

class Settings:
    PROJECT_NAME: str = "RosterFlow"
    API_V1_STR: str = "/api"
    # SQLite by default for zero-setup local dev; seamlessly configurable to PostgreSQL via DATABASE_URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./rosterflow.db")
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

settings = Settings()
