const mqtt = require('mqtt');
const { writeDriverData } = require('./influxWriter');
require('dotenv').config();

function startMqttSubscriber() {
  const { MQTT_HOST, MQTT_PORT, MQTT_USERNAME, MQTT_PASSWORD, MQTT_TOPIC } = process.env;

  const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    rejectUnauthorized: true, // enforce TLS cert validation
    reconnectPeriod: 5000,    // auto-reconnect every 5 s
  });

  client.on('connect', () => {
    console.log(`[MQTT] Connected to ${MQTT_HOST}`);
    client.subscribe(MQTT_TOPIC, { qos: 1 }, (err) => {
      if (err) {
        console.error('[MQTT] Subscribe error:', err.message);
      } else {
        console.log(`[MQTT] Subscribed to topic: ${MQTT_TOPIC}`);
      }
    });
  });

  client.on('message', (topic, message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (err) {
      console.warn(`[MQTT] Ignoring non-JSON message on ${topic}: ${message}`);
      return;
    }

    // Validate required fields before writing
    const required = ['driver_id', 'timestamp', 'label', 'confidence', 'speed', 'rpm', 'throttle', 'long_acc', 'lat_acc', 'yaw_rate'];
    const missing = required.filter((k) => data[k] === undefined);
    if (missing.length > 0) {
      console.warn(`[MQTT] Message missing fields [${missing.join(', ')}] on topic ${topic}`);
      return;
    }

    writeDriverData(data);
  });

  client.on('reconnect', () => console.log('[MQTT] Reconnecting…'));
  client.on('offline',   () => console.log('[MQTT] Client offline'));
  client.on('error',     (err) => console.error('[MQTT] Error:', err.message));

  return client;
}

module.exports = { startMqttSubscriber };
