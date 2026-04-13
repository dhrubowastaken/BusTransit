from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.services.tracking import TrackingService


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="TransitPulse",
    description="Real-time public transport tracking and ETA prediction for small cities.",
    version="1.0.0",
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

tracking_service = TrackingService()


@app.get("/")
def passenger_dashboard() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/admin")
def admin_dashboard() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin.html")


@app.get("/api/routes")
def list_routes() -> list[dict]:
    return [route.model_dump() for route in tracking_service.routes]


@app.get("/api/routes/{route_id}")
def get_route(route_id: str) -> dict:
    route = tracking_service.route_lookup.get(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route.model_dump()


@app.get("/api/live")
def live_buses() -> list[dict]:
    return [bus.model_dump() for bus in tracking_service.get_live_buses()]


@app.get("/api/buses/{bus_id}")
def get_bus(bus_id: str) -> dict:
    bus = next(
        (bus for bus in tracking_service.get_live_buses() if bus.id.lower() == bus_id.lower()),
        None,
    )
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    return bus.model_dump()


@app.get("/api/stops/{stop_id}/arrivals")
def stop_arrivals(stop_id: str) -> list[dict]:
    arrivals = tracking_service.get_stop_arrivals(stop_id)
    if not arrivals:
        raise HTTPException(status_code=404, detail="Stop not found or no arrivals available")
    return [item.model_dump() for item in arrivals]


@app.get("/api/admin/overview")
def admin_overview() -> dict:
    return tracking_service.get_admin_overview()
