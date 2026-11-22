from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models import (
    Employee, Pod, Brand, Process, EmployeeAssignment,
    OperatingRule, EmployeeAvailability, LeaveRequest,
    PublicHoliday, Roster, RosterEntry, RosterChangeLog
)
from app.api import (
    employees, pods, brands, processes, assignments,
    operating_rules, availability, rosters, conflicts,
    scenarios, analytics, exports
)
from app.services.seed_data import seed_database

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Smart Workforce and Operations Roster Management System API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permissive for easy local development and cross-origin deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to auto-seed realistic dataset if empty
@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_database(db, force=False)
    finally:
        db.close()

# Include all API routers
app.include_router(employees.router, prefix=settings.API_V1_STR)
app.include_router(pods.router, prefix=settings.API_V1_STR)
app.include_router(brands.router, prefix=settings.API_V1_STR)
app.include_router(processes.router, prefix=settings.API_V1_STR)
app.include_router(assignments.router, prefix=settings.API_V1_STR)
app.include_router(operating_rules.router, prefix=settings.API_V1_STR)
app.include_router(availability.router, prefix=settings.API_V1_STR)
app.include_router(rosters.router, prefix=settings.API_V1_STR)
app.include_router(conflicts.router, prefix=settings.API_V1_STR)
app.include_router(scenarios.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(exports.router, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
