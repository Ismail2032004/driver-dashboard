# Driver Behavior Monitor

A real-time fleet monitoring dashboard that collects vehicle telemetry from ESP32 devices over MQTT, classifies driving behavior (normal vs aggressive), stores it in InfluxDB, and displays live data in a React dashboard.

## Stack

| Layer | Technology |
|---|---|
| Firmware transport | MQTT over TLS (HiveMQ Cloud) |
| Backend | Node.js + Express |
| Time-series storage | InfluxDB Cloud v2 (Flux queries) |
| Trip / route storage | JSON file store (`backend/data/`) |
| Frontend | React 18 + Vite |
| Charts | Recharts |
| Map | Leaflet + react-leaflet |

## Project structure

```
backend/
  index.js              Entry point — wires MQTT, API, trip manager
  src/
    mqttSubscriber.js   Connects to HiveMQ, parses incoming payloads
    influxWriter.js     Writes telemetry fields to InfluxDB
    influxQuery.js      Flux queries for telemetry, stats, driver list
    influxClient.js     InfluxDB client singleton
    tripManager.js      Opens/closes trips, tracks GPS route in memory
    db.js               JSON file storage for trips and datapoints
    api.js              REST API (Express routes)
  scripts/
    mockPublisher.js    Simulates 3 drivers publishing MQTT telemetry
  data/                 Runtime JSON files (gitignored)

frontend/
  src/
    config.js           API base URL (change for deployment)
    App.jsx             Auth gate
    hooks/useApi.js     usePolling() auto-refresh hook
    components/
      Login.jsx
      Dashboard.jsx
      Sidebar.jsx
      DriverDetail.jsx
      SensorCard.jsx    Live Readings panel
      StatCard.jsx
      TripList.jsx
      TripMap.jsx
```

## Running locally

### Prerequisites

- Node.js 18+
- A [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/) account (free tier works)
- An [InfluxDB Cloud](https://cloud2.influxdata.com/) account (free tier works)

### 1. Configure the backend

```bash
cd backend
cp .env.example .env
```

Fill in `.env` with your HiveMQ and InfluxDB credentials:

```
MQTT_HOST=<your-cluster>.hivemq.cloud
MQTT_USERNAME=<username>
MQTT_PASSWORD=<password>
INFLUX_URL=https://<region>.aws.cloud2.influxdata.com
INFLUX_TOKEN=<your-token>
INFLUX_ORG=<your-org>
```

### 2. Install and start the backend

```bash
cd backend
npm install
npm start
```

### 3. (Optional) Run the mock publisher

In a separate terminal, simulate three drivers publishing GPS + telemetry over MQTT:

```bash
cd backend
npm run mock
```

### 4. Install and start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with:

- **Username:** `admin`
- **Password:** `driver123`

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/drivers` | List all known driver IDs |
| GET | `/api/drivers/:id/latest` | Latest telemetry point (in-memory cache, <10 ms) |
| GET | `/api/drivers/:id/telemetry?range=1h` | Historical telemetry rows |
| GET | `/api/drivers/:id/stats` | Aggregated stats (aggression rate, avg speed/RPM) |
| GET | `/api/drivers/:id/trips` | Completed trips list |
| GET | `/api/drivers/:id/trips/active` | Currently active trip |
| GET | `/api/drivers/:id/trips/:tripId/route` | GPS datapoints for a trip |
| GET | `/api/drivers/:id/trips/:tripId/csv` | Download trip as CSV |
| GET | `/health` | Health check |
