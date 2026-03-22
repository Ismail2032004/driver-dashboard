/**
 * db.js — JSON-file-based storage that exposes a better-sqlite3-compatible
 * prepare().run/get/all interface so tripManager.js and api.js need no changes.
 *
 * Data layout:
 *   backend/data/trips.json          — array of trip objects (persisted on every change)
 *   backend/data/points_<tripId>.json — datapoints for each COMPLETED trip (written on close)
 *
 * Active-trip datapoints are held in memory only; they are flushed to disk when
 * the trip closes. The route/CSV endpoints only serve completed trips, so this
 * is safe.
 */

const fs   = require('fs');
const path = require('path');

// ── Storage setup ─────────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const TRIPS_FILE = path.join(DATA_DIR, 'trips.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

// ── In-memory state ───────────────────────────────────────────────────────────

let trips = [];                     // all trip objects
const activePoints = {};            // tripId → datapoint[]  (active trips only)

// Load trips from disk
try {
  trips = JSON.parse(fs.readFileSync(TRIPS_FILE, 'utf8'));
} catch {
  trips = [];
}

// ── Persistence helpers ───────────────────────────────────────────────────────

function saveTrips() {
  fs.writeFile(TRIPS_FILE, JSON.stringify(trips, null, 2), err => {
    if (err) console.error('[DB] Failed to save trips.json:', err.message);
  });
}

function savePoints(tripId, points) {
  const file = path.join(DATA_DIR, `points_${tripId}.json`);
  fs.writeFile(file, JSON.stringify(points, null, 2), err => {
    if (err) console.error(`[DB] Failed to save points for ${tripId}:`, err.message);
  });
}

function loadPoints(tripId) {
  // Return in-memory points if trip is still active
  if (activePoints[tripId]) return activePoints[tripId];
  // Otherwise read from disk (completed trips)
  const file = path.join(DATA_DIR, `points_${tripId}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

// ── SQL pattern handlers ──────────────────────────────────────────────────────
//
// Each handler is matched by inspecting the normalised SQL string.
// Only the specific patterns used by tripManager.js and api.js are handled.

function execute(sql, args) {
  // INSERT INTO trips
  if (/INSERT INTO trips/i.test(sql)) {
    const [id, driver_id, start_time, start_lat, start_lon] = args;
    trips.push({
      id, driver_id, start_time,
      start_lat: start_lat ?? null, start_lon: start_lon ?? null,
      end_time: null, end_lat: null, end_lon: null,
      status: 'active',
      aggression_rate: null, total_windows: 0, aggressive_windows: 0,
    });
    activePoints[id] = [];
    saveTrips();
    return { changes: 1 };
  }

  // INSERT INTO datapoints
  if (/INSERT INTO datapoints/i.test(sql)) {
    const [trip_id, driver_id, timestamp, lat, lon,
           speed, rpm, throttle, long_acc, lat_acc, yaw_rate,
           label, confidence] = args;
    if (!activePoints[trip_id]) activePoints[trip_id] = [];
    activePoints[trip_id].push({
      id: activePoints[trip_id].length + 1,
      trip_id, driver_id, timestamp,
      lat, lon, speed, rpm, throttle,
      long_acc, lat_acc, yaw_rate, label, confidence,
    });
    return { changes: 1 };
  }

  // UPDATE trips — increment window counters
  if (/UPDATE trips/i.test(sql) && /total_windows/i.test(sql)) {
    const [aggressive_inc, id] = args;
    const trip = trips.find(t => t.id === id);
    if (trip) {
      trip.total_windows      += 1;
      trip.aggressive_windows += aggressive_inc;
      saveTrips();
    }
    return { changes: trip ? 1 : 0 };
  }

  // UPDATE trips — close trip
  if (/UPDATE trips/i.test(sql) && /status.*completed/i.test(sql)) {
    const [end_time, end_lat, end_lon, aggression_rate, id] = args;
    const trip = trips.find(t => t.id === id);
    if (trip) {
      trip.end_time       = end_time;
      trip.end_lat        = end_lat ?? null;
      trip.end_lon        = end_lon ?? null;
      trip.status         = 'completed';
      trip.aggression_rate = aggression_rate;
      // Flush in-memory datapoints to disk then free memory
      if (activePoints[id]) {
        savePoints(id, activePoints[id]);
        delete activePoints[id];
      }
      saveTrips();
    }
    return { changes: trip ? 1 : 0 };
  }

  return { changes: 0 };
}

function query(sql, args) {
  const norm = sql.replace(/\s+/g, ' ').trim();

  // ── Trips queries ─────────────────────────────────────────────────────────

  if (/FROM trips/i.test(norm)) {
    // SELECT * FROM trips WHERE driver_id = ? AND status = 'completed' ORDER BY start_time DESC
    if (/WHERE driver_id/i.test(norm)) {
      const [driver_id] = args;
      return trips
        .filter(t => t.driver_id === driver_id && t.status === 'completed')
        .sort((a, b) => b.start_time.localeCompare(a.start_time));
    }

    // SELECT ... FROM trips WHERE id = ?   (covers both SELECT * and SELECT specific cols)
    if (/WHERE id/i.test(norm)) {
      const [id] = args;
      const trip = trips.find(t => t.id === id);
      if (!trip) return [];
      return [projectCols(norm, trip)];
    }
  }

  // ── Datapoints queries ────────────────────────────────────────────────────

  if (/FROM datapoints/i.test(norm)) {
    const [trip_id] = args;
    let pts = loadPoints(trip_id).slice(); // copy

    if (/ORDER BY id DESC/i.test(norm)) {
      pts.sort((a, b) => b.id - a.id);
      if (/LIMIT 1/i.test(norm)) pts = pts.slice(0, 1);
    } else {
      pts.sort((a, b) => a.id - b.id);
    }

    return pts.map(p => projectCols(norm, p));
  }

  return [];
}

// Project only the columns named in the SELECT clause (handles "SELECT *" too)
function projectCols(sql, obj) {
  const m = sql.match(/SELECT\s+(.*?)\s+FROM/i);
  if (!m || m[1].trim() === '*') return { ...obj };
  const cols = m[1].split(',').map(c => c.trim());
  const out  = {};
  cols.forEach(c => { out[c] = obj[c]; });
  return out;
}

// ── Public API: better-sqlite3-compatible ─────────────────────────────────────

const db = {
  prepare(sql) {
    return {
      run  (...args) { return execute(sql, args); },
      get  (...args) { return query(sql, args)[0] ?? undefined; },
      all  (...args) { return query(sql, args); },
    };
  },
  // exec() used only during schema creation — no-op here
  exec() {},
  pragma() {},
};

module.exports = db;
