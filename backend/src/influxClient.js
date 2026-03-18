const { InfluxDB } = require('@influxdata/influxdb-client');
require('dotenv').config();

const client = new InfluxDB({
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
});

const writeApi = client.getWriteApi(
  process.env.INFLUX_ORG,
  process.env.INFLUX_BUCKET,
  's' // timestamp precision: seconds
);

const queryApi = client.getQueryApi(process.env.INFLUX_ORG);

module.exports = { writeApi, queryApi };
