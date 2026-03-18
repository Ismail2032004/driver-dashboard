const express = require('express');
const cors    = require('cors');
const db      = require('./db');
const { getDriverIds, getDriverTelemetry, getDriverStats } = require('./influxQuery');

const router = express.Router();

// ── GET /api/drivers ──────────────────────────────────────────────────────────
router.get('/drivers', async (_req, res) => {
  try {
    const ids = await getDriverIds();
    res.json({ drivers: ids });
  } catch (err) {
    console.error('[API] GET /drivers error:', err.message, err.body ?? '');
    res.status(500).json({ error: 'Failed to fetch driver list' });
  }
});

// ── GET /api/drivers/:id/telemetry?range=1h ───────────────────────────────────
router.get('/drivers/:id/telemetry', async (req, res) => {
  const { id }  = req.params;
  const range   = sanitiseRange(req.query.range || '1h');
  try {
    const rows = await getDriverTelemetry(id, range);
    res.json({ driver_id: id, range, count: rows.length, telemetry: rows });
  } catch (err) {
    console.error(`[API] GET /drivers/${id}/telemetry error:`, err.message, err.body ?? '');
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

// ── GET /api/drivers/:id/stats ────────────────────────────────────────────────
router.get('/drivers/:id/stats', async (req, res) => {
  const { id } = req.params;
  try {
    const stats = await getDriverStats(id);
    res.json(stats);
  } catch (err) {
    console.error(`[API] GET /drivers/${id}/stats error:`, err.message, err.body ?? '');
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET /api/drivers/:id/latest ───────────────────────────────────────────────
// Served from in-memory MQTT cache — no InfluxDB query, <10 ms.
router.get('/drivers/:id/latest', (req, res) => {
  const { id } = req.params;
  const point  = req.app.locals.latestByDriver[id];
  if (!point) return res.status(404).json({ error: `No live data for driver ${id}` });
  res.json(point);
});

// ── Trip routes ───────────────────────────────────────────────────────────────

// NOTE: /trips/active must be registered before /trips/:tripId

// GET /api/drivers/:id/trips/active
router.get('/drivers/:id/trips/active', (req, res) => {
  const trip = req.app.locals.tripManager.getActiveTrip(req.params.id);
  if (!trip) return res.json({ active: false });
  res.json({ active: true, trip });
});

// GET /api/drivers/:id/trips
router.get('/drivers/:id/trips', (req, res) => {
  const trips = db.prepare(
    "SELECT * FROM trips WHERE driver_id = ? AND status = 'completed' ORDER BY start_time DESC"
  ).all(req.params.id);
  res.json({ trips });
});

// GET /api/drivers/:id/trips/:tripId/route
router.get('/drivers/:id/trips/:tripId/route', (req, res) => {
  const points = db.prepare(
    `SELECT timestamp, lat, lon, speed, rpm, label, confidence, throttle, long_acc, lat_acc, yaw_rate
     FROM datapoints WHERE trip_id = ? ORDER BY id ASC`
  ).all(req.params.tripId);
  res.json({ points });
});

// GET /api/drivers/:id/trips/:tripId/csv
router.get('/drivers/:id/trips/:tripId/csv', (req, res) => {
  const { id, tripId } = req.params;
  const points = db.prepare(
    'SELECT timestamp, lat, lon, speed, rpm, throttle, long_acc, lat_acc, yaw_rate, label, confidence FROM datapoints WHERE trip_id = ? ORDER BY id ASC'
  ).all(tripId);

  const cols  = ['timestamp', 'lat', 'lon', 'speed', 'rpm', 'throttle', 'long_acc', 'lat_acc', 'yaw_rate', 'label', 'confidence'];
  const lines = [cols.join(','), ...points.map(p => cols.map(c => p[c] ?? '').join(','))];

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="trip_${tripId}.csv"`);
  res.send(lines.join('\n'));
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_RANGES = new Set(['15m', '30m', '1h', '6h', '12h', '24h', '7d', '30d']);
function sanitiseRange(raw) { return VALID_RANGES.has(raw) ? raw : '1h'; }

// ── App factory ───────────────────────────────────────────────────────────────

function createApp(latestByDriver = {}, tripManager = null) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.locals.latestByDriver = latestByDriver;
  app.locals.tripManager    = tripManager ?? { getActiveTrip: () => null };

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', router);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}

module.exports = { createApp };
