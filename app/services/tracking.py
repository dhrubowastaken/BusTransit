from __future__ import annotations

from datetime import datetime
from math import asin, cos, radians, sin, sqrt
from typing import Dict, List, Tuple

from app.data.seed_data import BUSES, ROUTES
from app.models import ArrivalPrediction, Bus, LiveBus, Route, Stop


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    )
    return 2 * radius_km * asin(sqrt(a))


class TrackingService:
    def __init__(self) -> None:
        self.routes: List[Route] = [Route(**route) for route in ROUTES]
        self.buses: List[Bus] = [Bus(**bus) for bus in BUSES]
        self.route_lookup: Dict[str, Route] = {route.id: route for route in self.routes}

    def _hourly_delay_factor(self, hour: int) -> float:
        if 8 <= hour <= 10 or 17 <= hour <= 19:
            return 1.28
        if 11 <= hour <= 16:
            return 1.12
        return 1.04

    def _segment_lengths(self, stops: List[Stop]) -> List[float]:
        return [
            haversine_km(stops[i].lat, stops[i].lon, stops[i + 1].lat, stops[i + 1].lon)
            for i in range(len(stops) - 1)
        ]

    def _route_length(self, stops: List[Stop]) -> float:
        return sum(self._segment_lengths(stops))

    def _position_on_route(
        self, route: Route, progress_km: float
    ) -> Tuple[float, float, Stop, float]:
        stops = route.stops
        segments = self._segment_lengths(stops)
        covered = 0.0
        for idx, segment_length in enumerate(segments):
            if covered + segment_length >= progress_km:
                ratio = (progress_km - covered) / segment_length if segment_length else 0
                current = stops[idx]
                nxt = stops[idx + 1]
                lat = current.lat + ((nxt.lat - current.lat) * ratio)
                lon = current.lon + ((nxt.lon - current.lon) * ratio)
                remaining = segment_length - (progress_km - covered)
                return lat, lon, nxt, remaining
            covered += segment_length
        last = stops[-1]
        return last.lat, last.lon, last, 0.0

    def _occupancy_pct(self, bus: Bus, now: datetime) -> int:
        base = 32 + ((now.minute * 7 + len(bus.id)) % 45)
        if now.hour in {8, 9, 18, 19}:
            base += 10
        return min(base, 97)

    def get_live_buses(self, now: datetime | None = None) -> List[LiveBus]:
        now = now or datetime.now()
        delay_factor = self._hourly_delay_factor(now.hour)
        live: List[LiveBus] = []

        for bus in self.buses:
            route = self.route_lookup[bus.route_id]
            route_length = self._route_length(route.stops)
            minutes_since_start = (
                now.hour * 60 + now.minute + now.second / 60 - bus.start_offset_minutes
            )
            if minutes_since_start < 0:
                minutes_since_start += 90
            traveled_km = ((minutes_since_start / 60.0) * bus.speed_kmph) % max(
                route_length, 0.1
            )
            lat, lon, next_stop, remaining_km = self._position_on_route(route, traveled_km)
            eta_min = max(round((remaining_km / max(bus.speed_kmph, 1)) * 60 * delay_factor), 1)
            status = "On Time" if delay_factor < 1.2 else "Minor Delay"
            live.append(
                LiveBus(
                    id=bus.id,
                    route_id=route.id,
                    route_name=route.name,
                    lat=round(lat, 6),
                    lon=round(lon, 6),
                    speed_kmph=bus.speed_kmph,
                    occupancy_pct=self._occupancy_pct(bus, now),
                    next_stop_id=next_stop.id,
                    next_stop_name=next_stop.name,
                    eta_to_next_stop_min=eta_min,
                    status=status,
                    delay_index=round(delay_factor, 2),
                )
            )
        return live

    def get_stop_arrivals(
        self, stop_id: str, now: datetime | None = None
    ) -> List[ArrivalPrediction]:
        live_buses = self.get_live_buses(now)
        arrivals: List[ArrivalPrediction] = []
        for bus in live_buses:
            route = self.route_lookup[bus.route_id]
            if any(stop.id == stop_id for stop in route.stops):
                target_stop = next(stop for stop in route.stops if stop.id == stop_id)
                extra_buffer = abs(target_stop.sequence - next(
                    stop.sequence for stop in route.stops if stop.id == bus.next_stop_id
                )) * 4
                eta = bus.eta_to_next_stop_min + extra_buffer
                arrivals.append(
                    ArrivalPrediction(
                        bus_id=bus.id,
                        route_id=route.id,
                        route_name=route.name,
                        next_stop_name=target_stop.name,
                        eta_minutes=eta,
                        occupancy_pct=bus.occupancy_pct,
                        status=bus.status,
                    )
                )
        arrivals.sort(key=lambda item: item.eta_minutes)
        return arrivals[:5]

    def get_admin_overview(self, now: datetime | None = None) -> dict:
        live_buses = self.get_live_buses(now)
        avg_eta = round(
            sum(bus.eta_to_next_stop_min for bus in live_buses) / max(len(live_buses), 1), 1
        )
        avg_occupancy = round(
            sum(bus.occupancy_pct for bus in live_buses) / max(len(live_buses), 1), 1
        )
        delayed = sum(1 for bus in live_buses if bus.status != "On Time")
        return {
            "active_buses": len(live_buses),
            "routes": len(self.routes),
            "stops": sum(len(route.stops) for route in self.routes),
            "average_eta_minutes": avg_eta,
            "average_occupancy_pct": avg_occupancy,
            "delayed_buses": delayed,
            "live_buses": live_buses,
            "routes_summary": [
                {
                    "route_id": route.id,
                    "route_name": route.name,
                    "stops": len(route.stops),
                    "active_buses": sum(1 for bus in live_buses if bus.route_id == route.id),
                }
                for route in self.routes
            ],
        }
