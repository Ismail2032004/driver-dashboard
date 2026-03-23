const { Point } = require('@influxdata/influxdb-client');
const { writeApi } = require('./influxClient');

/**
 * Write a single driver telemetry payload to InfluxDB.
 * @param {Object} data - Parsed ESP32 JSON payload
 */
function writeDriverData(data) {
  const point = new Point('driver_telemetry')
    .tag('driver_id', data.driver_id)
    .intField('label', data.label)
    .floatField('confidence', data.confidence)
    .floatField('speed', data.speed)
    .intField('rpm', Math.round(data.rpm || 0))
    .floatField('throttle', data.throttle)
    .floatField('long_acc', data.long_acc)
    .floatField('lat_acc', data.lat_acc)
    .floatField('yaw_rate', data.yaw_rate)
    .floatField('lat', data.lat)
    .floatField('lon', data.lon)
    .timestamp(new Date(data.timestamp * 1000)); // epoch seconds → ms Date

  writeApi.writePoint(point);
  console.log(`[InfluxDB] Wrote point for ${data.driver_id} | label=${data.label} speed=${data.speed}`);
}

/**
 * Flush buffered writes. Call on shutdown.
 */
async function flushWrites() {
  await writeApi.flush();
}

module.exports = { writeDriverData, flushWrites };
