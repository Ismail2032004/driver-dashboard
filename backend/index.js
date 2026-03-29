require('dotenv').config();

const { startMqttSubscriber } = require('./src/mqttSubscriber');
const { createApp }           = require('./src/api');
const { flushWrites }         = require('./src/influxWriter');
const tripManager             = require('./src/tripManager');

const PORT = process.env.PORT || 3000;

// In-memory cache: driver_id → most recent parsed MQTT payload
const latestByDriver = {};

// Start MQTT subscriber
const mqttClient = startMqttSubscriber();
mqttClient.on('message', (topic, payload) => {
  console.log(`[MQTT] topic=${topic} payload=${payload.toString()}`);
  try {
    const data = JSON.parse(payload.toString());

    // ── Trip control events: drivers/{id}/trip ────────────────────────────
    if (topic.endsWith('/trip')) {
      const driver_id = data.driver_id || topic.split('/')[1];
      if (!driver_id) return;
      if (data.event === 'trip_start') {
        tripManager.handleTripStart(driver_id);
      } else if (data.event === 'trip_end') {
        tripManager.handleTripEnd(driver_id);
      } else {
        console.warn(`[MQTT] Unknown trip event '${data.event}' for ${driver_id}`);
      }
      return;
    }

    // ── Telemetry: drivers/{id}/telemetry ─────────────────────────────────
    if (data.driver_id) {
      latestByDriver[data.driver_id] = { ...data, received_at: Date.now() };
      tripManager.handleMessage(data);
    }
  } catch (_) {
    // non-JSON already warned by mqttSubscriber
  }
});

// Start trip cleanup timer (closes trips inactive for 15+ minutes)
tripManager.startCleanupTimer();

// Start REST API
const app    = createApp(latestByDriver, tripManager);
const server = app.listen(PORT, () => {
  console.log(`[API] Server listening on http://localhost:${PORT}`);
});

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n[App] Received ${signal}. Shutting down…`);
  server.close();
  mqttClient.end(false, {}, async () => {
    await flushWrites().catch((err) => console.error('[InfluxDB] Flush error:', err.message));
    console.log('[App] Goodbye.');
    process.exit(0);
  });
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
