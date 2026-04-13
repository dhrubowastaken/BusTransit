from __future__ import annotations

from typing import List

from pydantic import BaseModel


class Stop(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    sequence: int


class Route(BaseModel):
    id: str
    name: str
    color: str
    origin: str
    destination: str
    data_source: str
    data_notes: str
    stops: List[Stop]


class Bus(BaseModel):
    id: str
    route_id: str
    plate_number: str
    driver_name: str
    capacity: int
    speed_kmph: float
    start_offset_minutes: int


class LiveBus(BaseModel):
    id: str
    route_id: str
    route_name: str
    lat: float
    lon: float
    speed_kmph: float
    occupancy_pct: int
    next_stop_id: str
    next_stop_name: str
    eta_to_next_stop_min: int
    status: str
    delay_index: float


class ArrivalPrediction(BaseModel):
    bus_id: str
    route_id: str
    route_name: str
    next_stop_name: str
    eta_minutes: int
    occupancy_pct: int
    status: str
