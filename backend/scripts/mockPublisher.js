/**
 * mockPublisher.js
 *
 * Simulates 3 ESP32 drivers publishing telemetry to HiveMQ every 1 second.
 * Drivers move around Accra, Ghana with small random GPS offsets each tick.
 * Run with:  npm run mock
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mqtt = require('mqtt');

const { MQTT_HOST, MQTT_PORT, MQTT_USERNAME, MQTT_PASSWORD } = process.env;

// ── Driver profiles ───────────────────────────────────────────────────────────

const DRIVERS = [
  {
    id: 'driver_001',
    label: 'Normal Alice',
    aggressionProb: 0.1,
    speedBase: 60,  speedRange: 20,
    rpmBase:  2000, rpmRange:  800,
    pos: { lat: 5.6037, lon: -0.1870 }, // Accra central
  },
  {
    id: 'driver_002',
    label: 'Aggressive Bob',
    aggressionProb: 0.75,
    speedBase: 95,  speedRange: 30,
    rpmBase:  4500, rpmRange: 1500,
    pos: { lat: 5.5913, lon: -0.2675 }, // Dansoman area
  },
  {
    id: 'driver_003',
    label: 'Mixed Carol',
    aggressionProb: 0.40,
    speedBase: 75,  speedRange: 25,
    rpmBase:  3000, rpmRange: 1200,
    pos: { lat: 5.6205, lon: -0.1719 }, // Osu area
  },
];

// ── MQTT connection ───────────────────────────────────────────────────────────

const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  rejectUnauthorized: true,
});

client.on('connect', () => {
  console.log(`[Mock] Connected to ${MQTT_HOST}`);
  console.log('[Mock] Publishing data for 3 drivers every 1 second. Press Ctrl+C to stop.\n');
  startPublishing();
});

client.on('error', (err) => {
  console.error('[Mock] Connection error:', err.message);
  process.exit(1);
});

// ── Publisher ─────────────────────────────────────────────────────────────────

function startPublishing() {
  setInterval(() => {
    const now = Math.floor(Date.now() / 1000); // Unix seconds

    DRIVERS.forEach((driver) => {
      // Simulate GPS movement: ±0.0002° per second (~22 m)
      driver.pos.lat += (Math.random() - 0.5) * 0.0004;
      driver.pos.lon += (Math.random() - 0.5) * 0.0004;

      const aggressive  = Math.random() < driver.aggressionProb;
      const label       = aggressive ? 1 : 0;
      const aggrFactor  = aggressive ? 1.4 : 1.0;

      const payload = {
        driver_id:  driver.id,
        timestamp:  now,
        lat:        parseFloat(driver.pos.lat.toFixed(6)),
        lon:        parseFloat(driver.pos.lon.toFixed(6)),
        label,
        confidence: parseFloat((0.6 + Math.random() * 0.39).toFixed(2)),
        speed:      parseFloat((driver.speedBase + (Math.random() - 0.5) * driver.speedRange * aggrFactor).toFixed(1)),
        rpm:        Math.round(driver.rpmBase    + (Math.random() - 0.5) * driver.rpmRange  * aggrFactor),
        throttle:   parseFloat((aggressive ? 0.5 + Math.random() * 0.5 : Math.random() * 0.4).toFixed(2)),
        long_acc:   parseFloat(((aggressive ? -1 : 0) + (Math.random() - 0.5) * 4 * aggrFactor).toFixed(2)),
        lat_acc:    parseFloat(((Math.random() - 0.5) * 2 * aggrFactor).toFixed(2)),
        yaw_rate:   parseFloat(((Math.random() - 0.5) * 10 * aggrFactor).toFixed(2)),
      };

      const topic = `drivers/${driver.id}/telemetry`;
      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error(`[Mock] Publish error for ${driver.id}:`, err.message);
        } else {
          const behavior = label === 1 ? 'AGGRESSIVE' : 'normal   ';
          console.log(
            `[Mock] ${driver.id} (${behavior}) | lat=${payload.lat.toFixed(4)} lon=${payload.lon.toFixed(4)} | speed=${String(payload.speed.toFixed(1)).padStart(5)} km/h | rpm=${String(payload.rpm).padStart(4)}`
          );
        }
      });
    });

    console.log('---');
  }, 1000);
}

process.on('SIGINT', () => {
  console.log('\n[Mock] Stopping publisher.');
  client.end();
  process.exit(0);
});
