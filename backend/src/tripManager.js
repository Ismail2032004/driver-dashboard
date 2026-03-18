const { randomUUID } = require('crypto');
const db = require('./db');

// driver_id → { tripId, lastSeen (ms epoch) }
const activeTripsByDriver = {};

// Prepared statements (compiled once for performance)
const stmtInsertTrip = db.prepare(`
  INSERT INTO trips (id, driver_id, start_time, start_lat, start_lon, status, total_windows, aggressive_windows)
  VALUES (?, ?, ?, ?, ?, 'active', 0, 0)
`);

const stmtInsertPoint = db.prepare(`
  INSERT INTO datapoints
    (trip_id, driver_id, timestamp, lat, lon, speed, rpm, throttle, long_acc, lat_acc, yaw_rate, label, confidence)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtIncrWindows = db.prepare(`
  UPDATE trips
  SET total_windows      = total_windows + 1,
      aggressive_windows = aggressive_windows + ?
  WHERE id = ?
`);

const stmtCloseTrip = db.prepare(`
  UPDATE trips
  SET end_time = ?, end_lat = ?, end_lon = ?, status = 'completed', aggression_rate = ?
  WHERE id = ?
`);

const stmtLastPoint = db.prepare(`
  SELECT lat, lon, timestamp FROM datapoints WHERE trip_id = ? ORDER BY id DESC LIMIT 1
`);

const stmtGetTrip = db.prepare(`SELECT total_windows, aggressive_windows FROM trips WHERE id = ?`);

// ── Public API ────────────────────────────────────────────────────────────────

function handleMessage(data) {
  const {
    driver_id, timestamp,
    lat, lon, speed, rpm, throttle,
    long_acc, lat_acc, yaw_rate, label, confidence,
  } = data;

  if (!driver_id) return;

  const now = Date.now();
  const ts  = new Date(timestamp * 1000).toISOString();

  // Open a new trip if none is active
  if (!activeTripsByDriver[driver_id]) {
    const tripId = randomUUID();
    stmtInsertTrip.run(tripId, driver_id, ts, lat ?? null, lon ?? null);
    activeTripsByDriver[driver_id] = { tripId, lastSeen: now };
    console.log(`[TripManager] Started trip ${tripId} for ${driver_id}`);
  } else {
    activeTripsByDriver[driver_id].lastSeen = now;
  }

  const { tripId } = activeTripsByDriver[driver_id];

  stmtInsertPoint.run(
    tripId, driver_id, ts,
    lat ?? null, lon ?? null,
    speed ?? null, rpm ?? null, throttle ?? null,
    long_acc ?? null, lat_acc ?? null, yaw_rate ?? null,
    label ?? null, confidence ?? null,
  );

  stmtIncrWindows.run(label === 1 ? 1 : 0, tripId);
}

function closeTrip(driverId) {
  const entry = activeTripsByDriver[driverId];
  if (!entry) return;

  const { tripId } = entry;
  const last  = stmtLastPoint.get(tripId);
  const stats = stmtGetTrip.get(tripId);
  const rate  = stats.total_windows > 0
    ? stats.aggressive_windows / stats.total_windows
    : 0;

  stmtCloseTrip.run(
    last?.timestamp ?? new Date().toISOString(),
    last?.lat ?? null,
    last?.lon ?? null,
    rate,
    tripId,
  );

  delete activeTripsByDriver[driverId];
  console.log(`[TripManager] Closed trip ${tripId} for ${driverId} (aggression ${(rate * 100).toFixed(1)}%)`);
}

function getActiveTrip(driverId) {
  const entry = activeTripsByDriver[driverId];
  if (!entry) return null;
  return db.prepare('SELECT * FROM trips WHERE id = ?').get(entry.tripId) ?? null;
}

// ── Cleanup timer ─────────────────────────────────────────────────────────────

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

function startCleanupTimer() {
  setInterval(() => {
    const now = Date.now();
    for (const [driverId, entry] of Object.entries(activeTripsByDriver)) {
      if (now - entry.lastSeen > FIFTEEN_MIN_MS) {
        console.log(`[TripManager] ${driverId} inactive 15+ min — closing trip`);
        closeTrip(driverId);
      }
    }
  }, 60 * 1000);
}

module.exports = { handleMessage, startCleanupTimer, getActiveTrip };
