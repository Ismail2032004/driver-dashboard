const { queryApi } = require('./influxClient');

const BUCKET = process.env.INFLUX_BUCKET || 'driver_telemetry';

/**
 * Run a Flux query and collect all row objects.
 */
function runQuery(fluxQuery) {
  return new Promise((resolve, reject) => {
    const rows = [];
    queryApi.queryRows(fluxQuery, {
      next(row, tableMeta) {
        rows.push(tableMeta.toObject(row));
      },
      error(err) {
        console.error('[InfluxDB] Query error:', err.message, err.body ?? '');
        reject(err);
      },
      complete() {
        resolve(rows);
      },
    });
  });
}

/**
 * Return a list of unique driver IDs seen in the last 30 days.
 */
async function getDriverIds() {
  const flux = `
    import "influxdata/influxdb/schema"
    schema.tagValues(
      bucket: "${BUCKET}",
      tag: "driver_id",
      predicate: (r) => r._measurement == "driver_telemetry",
      start: -30d
    )
  `;
  const rows = await runQuery(flux);
  return rows.map((r) => r._value).filter(Boolean);
}

/**
 * Return recent telemetry rows for a driver, pivoted to wide format.
 * @param {string} driverId
 * @param {string} range  e.g. "1h", "6h", "24h", "7d"
 */
async function getDriverTelemetry(driverId, range = '1h') {
  const flux = `
    from(bucket: "${BUCKET}")
      |> range(start: -${range})
      |> filter(fn: (r) => r._measurement == "driver_telemetry" and r.driver_id == "${driverId}")
      |> filter(fn: (r) => r._field == "speed" or r._field == "rpm" or r._field == "label"
            or r._field == "throttle" or r._field == "long_acc" or r._field == "lat_acc"
            or r._field == "yaw_rate" or r._field == "confidence"
            or r._field == "lat" or r._field == "lon")
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: false)
  `;
  const rows = await runQuery(flux);
  return rows.map(normaliseRow);
}

/**
 * Return aggregated stats for a driver.
 */
async function getDriverStats(driverId) {
  // Run four focused queries in parallel for efficiency.
  const [totalRows, aggressiveRows, speedRows, rpmRows] = await Promise.all([
    // Total window count
    runQuery(`
      from(bucket: "${BUCKET}")
        |> range(start: -30d)
        |> filter(fn: (r) => r._measurement == "driver_telemetry"
              and r.driver_id == "${driverId}"
              and r._field == "label")
        |> count()
    `),
    // Aggressive window count (label == 1)
    runQuery(`
      from(bucket: "${BUCKET}")
        |> range(start: -30d)
        |> filter(fn: (r) => r._measurement == "driver_telemetry"
              and r.driver_id == "${driverId}"
              and r._field == "label"
              and r._value == 1)
        |> count()
    `),
    // Average speed
    runQuery(`
      from(bucket: "${BUCKET}")
        |> range(start: -30d)
        |> filter(fn: (r) => r._measurement == "driver_telemetry"
              and r.driver_id == "${driverId}"
              and r._field == "speed")
        |> mean()
    `),
    // Average RPM
    runQuery(`
      from(bucket: "${BUCKET}")
        |> range(start: -30d)
        |> filter(fn: (r) => r._measurement == "driver_telemetry"
              and r.driver_id == "${driverId}"
              and r._field == "rpm")
        |> mean()
    `),
  ]);

  const total = totalRows[0]?._value ?? 0;
  const aggressive = aggressiveRows[0]?._value ?? 0;

  return {
    driver_id: driverId,
    total_windows: total,
    aggressive_count: aggressive,
    aggression_rate: total > 0 ? parseFloat((aggressive / total).toFixed(4)) : 0,
    avg_speed: parseFloat((speedRows[0]?._value ?? 0).toFixed(2)),
    avg_rpm: parseFloat((rpmRows[0]?._value ?? 0).toFixed(0)),
  };
}

/**
 * Return the single most recent telemetry point for a driver.
 */
async function getDriverLatest(driverId) {
  const flux = `
    from(bucket: "${BUCKET}")
      |> range(start: -24h)
      |> filter(fn: (r) => r._measurement == "driver_telemetry" and r.driver_id == "${driverId}")
      |> last()
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  `;
  const rows = await runQuery(flux);
  return rows.length > 0 ? normaliseRow(rows[0]) : null;
}

/**
 * Strip InfluxDB internal columns from a pivoted row.
 */
function normaliseRow(row) {
  const { _measurement, _start, _stop, result, table, ...clean } = row;
  clean.timestamp = clean._time;
  delete clean._time;
  return clean;
}

/**
 * Return the last 20 aggressive moments for a driver in the past hour,
 * ordered newest first.
 */
async function getDriverAlerts(driverId) {
  const flux = `
    from(bucket: "${BUCKET}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "driver_telemetry" and r.driver_id == "${driverId}")
      |> filter(fn: (r) => r._field == "speed" or r._field == "rpm"
            or r._field == "confidence" or r._field == "label"
            or r._field == "lat" or r._field == "lon")
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> filter(fn: (r) => r.label == 1)
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 20)
  `;
  const rows = await runQuery(flux);
  return rows.map(r => {
    const clean = normaliseRow(r);
    return {
      timestamp:  clean.timestamp,
      speed:      clean.speed      ?? null,
      rpm:        clean.rpm        ?? null,
      confidence: clean.confidence ?? null,
      lat:        clean.lat        ?? null,
      lon:        clean.lon        ?? null,
    };
  });
}

module.exports = { getDriverIds, getDriverTelemetry, getDriverStats, getDriverLatest, getDriverAlerts };
