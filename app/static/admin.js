const metricCards = document.getElementById("metricCards");
const fleetTable = document.getElementById("fleetTable");
const routeSummary = document.getElementById("routeSummary");
const adminUpdated = document.getElementById("adminUpdated");

function pill(status) {
  const delay = status !== "On Time" ? "delay" : "";
  return `<span class="status-pill ${delay}">${status}</span>`;
}

function metric(label, value, note) {
  return `
    <article class="metric-card">
      <p class="section-label">${label}</p>
      <strong>${value}</strong>
      <p>${note}</p>
    </article>
  `;
}

function nowText() {
  return `Last updated at ${new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

async function loadAdminDashboard() {
  const response = await fetch("/api/admin/overview");
  const overview = await response.json();

  adminUpdated.textContent = nowText();

  metricCards.innerHTML = [
    metric("Active buses", overview.active_buses, "Vehicles currently shown on the map"),
    metric("Routes", overview.routes, "Distinct BMTC route corridors in this demo"),
    metric("Stops", overview.stops, "Real Bangalore stops included in the demo"),
    metric("Average ETA", `${overview.average_eta_minutes} min`, "Average next-stop wait time"),
    metric("Average occupancy", `${overview.average_occupancy_pct}%`, "Estimated load across active buses"),
    metric("Delayed buses", overview.delayed_buses, "Vehicles currently marked behind schedule"),
  ].join("");

  fleetTable.innerHTML = overview.live_buses
    .map(
      (bus) => `
        <tr>
          <td>${bus.id}</td>
          <td>${bus.route_id}</td>
          <td>${bus.next_stop_name}</td>
          <td>${bus.eta_to_next_stop_min} min</td>
          <td>${bus.occupancy_pct}%</td>
          <td>${pill(bus.status)}</td>
        </tr>
      `
    )
    .join("");

  routeSummary.innerHTML = overview.routes_summary
    .map(
      (route) => `
        <article class="route-item">
          <h3>${route.route_id}</h3>
          <p>${route.route_name}</p>
          <p>${route.active_buses} active buses - ${route.stops} stops shown</p>
        </article>
      `
    )
    .join("");
}

loadAdminDashboard();
setInterval(loadAdminDashboard, 15000);
