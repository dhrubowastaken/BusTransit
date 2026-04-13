# TransitPulse

TransitPulse is a beginner-friendly MVP for a "Real-Time Public Transport Tracking and Prediction System for Small Cities".
It gives you a working project you can run locally right away:

- A FastAPI backend
- A passenger dashboard with a more accessible route-and-stop selection flow
- A map view with live bus positions on OpenStreetMap
- An admin dashboard for fleet monitoring
- A lightweight ETA prediction system based on route distance, speed, and time-of-day delay factors
- BMTC-inspired Bangalore route data with real stop locations

## Who this README is for

This guide is written for someone using the project for the first time.
If you have never used `uv` before, that is completely fine. Just follow the steps in order.

## What you need before starting

Install these tools first:

1. Python 3.11 or newer
2. `uv` by Astral

If `uv` is not installed yet, use one of these:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

or

```bash
pip install uv
```

To confirm it works:

```bash
uv --version
```

## First-time setup

Open a terminal in the project folder:

Create the environment and install dependencies:

```bash
uv sync
```

That command reads the dependencies from `pyproject.toml`, creates a virtual environment if needed, and installs everything for you.

## Running the app

Start the development server with:

```bash
uv run uvicorn app.main:app --reload
```

Once the server starts, open these pages in your browser:

- `http://127.0.0.1:8000/` for the passenger dashboard
- `http://127.0.0.1:8000/admin` for the admin dashboard
- `http://127.0.0.1:8000/docs` for the API documentation

## What you will see

On the passenger dashboard:

- A simple "choose route, then choose stop" flow
- A live route map
- Active buses moving on the route
- ETA predictions for stops
- Route-based bus summaries and a readable stop list

On the admin dashboard:

- Active bus count
- Route and stop totals
- Average ETA and occupancy
- Live fleet monitoring table

## Everyday commands

Install or refresh dependencies:

```bash
uv sync
```

Run the app:

```bash
uv run uvicorn app.main:app --reload
```

Run a one-off Python command inside the project environment:

```bash
uv run python
```

## Project structure

```text
app/
  data/seed_data.py
  services/tracking.py
  static/
    index.html
    admin.html
    styles.css
    app.js
    admin.js
  main.py
  models.py
pyproject.toml
README.md
```

## How the demo works

- The project uses seeded route, stop, and bus data.
- The current demo includes Bangalore corridors based on BMTC public metro-feeder route references.
- Bus positions are simulated in real time based on route length and speed.
- ETA values are calculated using remaining distance plus a simple time-based delay factor.
- The system is intentionally lightweight so it is easy to understand and demo in a college project setting.

## Data notes

- Route numbers and route endpoints are based on BMTC's public metro-feeder route listing:
  `https://mybmtc.karnataka.gov.in/114/Metro%20Feeder%20Route%20details/en`
- Intermediate stops in the demo are real Bangalore places along those corridors.
- Vehicle positions and ETAs are still simulated for demonstration purposes.

## Troubleshooting

If `uv sync` fails:

- Make sure Python is installed and available in your terminal
- Make sure `uv --version` works
- Try closing and reopening the terminal after installing `uv`

If the browser page does not open:

- Check that the server is still running in the terminal
- Make sure you are visiting `http://127.0.0.1:8000/`

If port `8000` is already in use:

```bash
uv run uvicorn app.main:app --reload --port 8001
```

Then open `http://127.0.0.1:8001/`.

## Notes for future improvements

- Replace seeded demo data with a real database such as PostgreSQL
- Add driver/GPS update endpoints
- Add authentication for admin users
- Upgrade the ETA engine to a regression or time-series model
