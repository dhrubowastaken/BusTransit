const map = L.map("map").setView([12.9716, 77.5946], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let routeLayer = null;
let busMarkers = [];
let stopMarkers = [];
let routes = [];
let liveBuses = [];

const routeSelect = document.getElementById("routeSelect");
const stopSelect = document.getElementById("stopSelect");
const activeBusCount = document.getElementById("activeBusCount");
const avgEta = document.getElementById("avgEta");
const busCards = document.getElementById("busCards");
const arrivalBoard = document.getElementById("arrivalBoard");
const routeFacts = document.getElementById("routeFacts");
const sourceNote = document.getElementById("sourceNote");
const stopList = document.getElementById("stopList");
const lastUpdated = document.getElementById("lastUpdated");

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }
  return response.json();
}

function formatTimestamp() {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusPill(status) {
  const delay = status !== "On Time" ? "delay" : "";
  return `<span class="status-pill ${delay}">${status}</span>`;
}

function populateRouteSelector() {
  routeSelect.innerHTML = routes
    .map((route) => `<option value="${route.id}">${route.id} - ${route.origin} to ${route.destination}</option>`)
    .join("");
}

function populateStopSelector(routeId) {
  const route = routes.find((item) => item.id === routeId) || routes[0];
  if (!route) return;

  stopSelect.innerHTML = route.stops
    .map((stop) => `<option value="${stop.id}">${stop.sequence}. ${stop.name}</option>`)
    .join("");
}

function renderRouteFacts(routeId) {
  const route = routes.find((item) => item.id === routeId) || routes[0];
  if (!route) return;

  routeFacts.innerHTML = `
    <div class="facts-list">
      <div class="fact-row"><strong>Route number</strong><span>${route.id}</span></div>
      <div class="fact-row"><strong>Origin</strong><span>${route.origin}</span></div>
      <div class="fact-row"><strong>Destination</strong><span>${route.destination}</span></div>
      <div class="fact-row"><strong>Total stops shown</strong><span>${route.stops.length}</span></div>
    </div>
  `;
  sourceNote.innerHTML = `${route.data_notes} <a href="${route.data_source}" target="_blank" rel="noreferrer">View BMTC source</a>.`;
}

function renderStopList(routeId) {
  const route = routes.find((item) => item.id === routeId) || routes[0];
  if (!route) return;

  stopList.innerHTML = route.stops
    .map((stop) => `<li><strong>${stop.sequence}.</strong> ${stop.name}</li>`)
    .join("");
}

function drawRoute(routeId) {
  const route = routes.find((item) => item.id === routeId) || routes[0];
  if (!route) return;

  if (routeLayer) {
    routeLayer.remove();
  }
  stopMarkers.forEach((marker) => marker.remove());
  stopMarkers = [];

  routeLayer = L.polyline(
    route.stops.map((stop) => [stop.lat, stop.lon]),
    { color: route.color, weight: 6, opacity: 0.9 }
  ).addTo(map);

  route.stops.forEach((stop) => {
    const marker = L.circleMarker([stop.lat, stop.lon], {
      radius: 7,
      color: route.color,
      fillColor: "#ffffff",
      fillOpacity: 1,
      weight: 3,
    })
      .addTo(map)
      .bindPopup(`<strong>${stop.name}</strong><br>Stop ${stop.sequence}`);
    stopMarkers.push(marker);
  });

  map.fitBounds(routeLayer.getBounds(), { padding: [28, 28] });
}

function drawBuses(routeId) {
  busMarkers.forEach((marker) => marker.remove());
  busMarkers = [];

  liveBuses
    .filter((bus) => !routeId || bus.route_id === routeId)
    .forEach((bus) => {
      const marker = L.marker([bus.lat, bus.lon]).addTo(map);
      marker.bindPopup(`
        <strong>${bus.id}</strong><br>
        Route: ${bus.route_id}<br>
        Next stop: ${bus.next_stop_name}<br>
        ETA: ${bus.eta_to_next_stop_min} min
      `);
      busMarkers.push(marker);
    });
}

function renderBusCards(routeId) {
  const filtered = liveBuses.filter((bus) => !routeId || bus.route_id === routeId);
  if (!filtered.length) {
    busCards.innerHTML = `<div class="empty-state">No active buses are shown for this route right now.</div>`;
    return;
  }

  busCards.innerHTML = filtered
    .map(
      (bus) => `
        <article class="bus-card">
          <h3>${bus.id}</h3>
          <p><strong>${bus.route_name}</strong></p>
          <div class="bus-meta">
            <span>Next stop: ${bus.next_stop_name}</span>
            <span>ETA: ${bus.eta_to_next_stop_min} min</span>
            <span>Occupancy: ${bus.occupancy_pct}%</span>
            <span>Speed: ${bus.speed_kmph} km/h</span>
          </div>
          <div style="margin-top: 12px;">${statusPill(bus.status)}</div>
        </article>
      `
    )
    .join("");
}

async function renderArrivals(stopId) {
  try {
    const arrivals = await fetchJson(`/api/stops/${stopId}/arrivals`);
    arrivalBoard.innerHTML = arrivals
      .map(
        (item) => `
          <article class="arrival-item">
            <h3>${item.route_id} - ${item.bus_id}</h3>
            <p><strong>${item.next_stop_name}</strong></p>
            <div class="arrival-meta">
              <span>ETA: ${item.eta_minutes} min</span>
              <span>Occupancy: ${item.occupancy_pct}%</span>
            </div>
            <div style="margin-top: 12px;">${statusPill(item.status)}</div>
          </article>
        `
      )
      .join("");
  } catch (_error) {
    arrivalBoard.innerHTML = `
      <div class="empty-state">
        No live arrivals are available for this stop right now. Try another stop or wait for the next refresh.
      </div>
    `;
  }
}

function updateSummaryStats() {
  activeBusCount.textContent = liveBuses.length;
  const averageEta = liveBuses.length
    ? Math.round(liveBuses.reduce((sum, bus) => sum + bus.eta_to_next_stop_min, 0) / liveBuses.length)
    : 0;
  avgEta.textContent = `${averageEta} min`;
  lastUpdated.textContent = formatTimestamp();
}

async function handleRouteChange(routeId) {
  populateStopSelector(routeId);
  renderRouteFacts(routeId);
  renderStopList(routeId);
  drawRoute(routeId);
  drawBuses(routeId);
  renderBusCards(routeId);

  const firstStopId = stopSelect.value;
  if (firstStopId) {
    await renderArrivals(firstStopId);
  }
}

async function loadDashboard() {
  routes = await fetchJson("/api/routes");
  liveBuses = await fetchJson("/api/live");

  populateRouteSelector();
  updateSummaryStats();

  const initialRoute = routes[0]?.id;
  if (initialRoute) {
    routeSelect.value = initialRoute;
    await handleRouteChange(initialRoute);
  }
}

routeSelect.addEventListener("change", async (event) => {
  await handleRouteChange(event.target.value);
});

stopSelect.addEventListener("change", async (event) => {
  await renderArrivals(event.target.value);
});

loadDashboard();
setInterval(async () => {
  liveBuses = await fetchJson("/api/live");
  updateSummaryStats();
  drawBuses(routeSelect.value);
  renderBusCards(routeSelect.value);
  await renderArrivals(stopSelect.value);
}, 15000);
