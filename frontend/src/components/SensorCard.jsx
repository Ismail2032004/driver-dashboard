import { useState, useEffect, useRef } from 'react';

const INSTRUMENTS = [
  { key: 'label',      label: 'LABEL',       unit: '',      fmt: v => v === 1 ? 'AGGRESSIVE' : 'NORMAL', color: '#ffffff', wide: true  },
  { key: 'speed',      label: 'SPEED',       unit: 'km/h',  fmt: v => v.toFixed(1),                    color: '#38bdf8', wide: true  },
  { key: 'rpm',        label: 'RPM',         unit: 'rpm',   fmt: v => Math.round(v).toLocaleString(),  color: '#a78bfa', wide: true  },
  { key: 'throttle',   label: 'THROTTLE',    unit: '%',     fmt: v => v.toFixed(1),                    color: '#4f6ef7', wide: false },
  { key: 'long_acc',   label: 'LONG ACC',    unit: 'm/s²',  fmt: v => v.toFixed(3),                    color: '#f87171', wide: false },
  { key: 'lat_acc',    label: 'LAT ACC',     unit: 'm/s²',  fmt: v => v.toFixed(3),                    color: '#fb923c', wide: false },
  { key: 'yaw_rate',   label: 'YAW RATE',    unit: 'rad/s', fmt: v => v.toFixed(4),                    color: '#f59e0b', wide: false },
  { key: 'confidence', label: 'CONFIDENCE',  unit: '%',     fmt: v => v.toFixed(1),                    color: '#34d399', wide: false },
  { key: 'lat',        label: 'LAT',         unit: '°',     fmt: v => v.toFixed(4),                    color: '#2dd4bf', wide: false },
  { key: 'lon',        label: 'LON',         unit: '°',     fmt: v => v.toFixed(4),                    color: '#2dd4bf', wide: false },
];

// Rolling average over last N values
function useRollingAvg(value, n = 10) {
  const buf = useRef([]);
  useEffect(() => {
    if (value == null || isNaN(value) || value <= 0) return;
    buf.current.push(value);
    if (buf.current.length > n) buf.current.shift();
  }, [value, n]);
  if (buf.current.length === 0) return null;
  return Math.round(buf.current.reduce((a, b) => a + b, 0) / buf.current.length);
}

export default function LiveReadings({ latest }) {
  // MQTT latency: server receive time minus ESP32 timestamp (converted to ms)
  const mqttRaw = latest?.received_at != null && latest?.timestamp != null
    ? latest.received_at - (latest.timestamp * 1000)
    : null;
  const infRaw = latest?.inference_latency_ms ?? null;

  const mqttAvg = useRollingAvg(mqttRaw);
  const infAvg  = useRollingAvg(infRaw);

  return (
    <div style={s.card}>
      <style>{KEYFRAMES}</style>
      <div style={s.header}>
        <div style={s.titleRow}>
          <div style={s.pulse} />
          <span style={s.title}>Live Readings</span>
        </div>
        <div style={s.headerRight}>
          {latest?.timestamp && (
            <span style={s.ts}>
              Updated {new Date(latest.timestamp * 1000).toLocaleTimeString()}
            </span>
          )}
          <LatencyBadge label="MQTT" value={mqttAvg} color="#22c55e" />
          <LatencyBadge label="INF"  value={infAvg}  color="#38bdf8" />
        </div>
      </div>
      <div style={s.grid}>
        {INSTRUMENTS.map(inst => (
          <Gauge key={inst.key} inst={inst} latest={latest} />
        ))}
      </div>
    </div>
  );
}

function LatencyBadge({ label, value, color }) {
  const text = value != null ? `${label} ${value}ms` : `${label} --`;
  return (
    <div style={{
      padding: '3px 9px',
      borderRadius: '20px',
      background: color + '18',
      border: `1px solid ${color}44`,
      fontSize: '11px',
      fontWeight: '600',
      color,
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {text}
    </div>
  );
}

function Gauge({ inst, latest }) {
  const { key, label, unit, fmt } = inst;
  const raw     = latest?.[key];
  const display = raw !== undefined && raw !== null ? fmt(raw) : '—';

  const color = key === 'label'
    ? (raw === 1 ? '#f87171' : '#22c55e')
    : inst.color;

  const prevRef  = useRef(display);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRef.current !== display) {
      prevRef.current = display;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(t);
    }
  }, [display]);

  return (
    <div style={{
      ...s.gauge,
      borderColor: flash ? color + '66' : '#2a2d3e',
      ...(key === 'label' ? { gridColumn: 'span 2' } : {}),
    }}>
      <div style={{ ...s.accentBar, background: color }} />
      <span style={s.gaugeLabel}>{label}</span>
      <span style={{
        ...s.gaugeValue,
        fontSize:   key === 'label' ? '18px' : s.gaugeValue.fontSize,
        color:      flash ? '#ffffff' : color,
        textShadow: flash ? `0 0 16px ${color}` : `0 0 4px ${color}44`,
        transition: flash ? 'none' : 'color 0.4s, text-shadow 0.4s',
      }}>
        {display}
      </span>
      <span style={{ ...s.gaugeUnit, color: color + 'aa' }}>{unit}</span>
    </div>
  );
}

const KEYFRAMES = `
@keyframes livePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}
`;

const s = {
  card: {
    background: '#1a1d2e',
    border: '1px solid #2a2d3e',
    borderRadius: '12px',
    padding: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  pulse: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 6px #22c55e',
    animation: 'livePulse 1.5s ease-in-out infinite',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e8eaf0',
  },
  ts: {
    fontSize: '11px',
    color: '#555a72',
    fontVariantNumeric: 'tabular-nums',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '10px',
  },
  gauge: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#13151f',
    border: '1px solid #2a2d3e',
    borderRadius: '10px',
    padding: '16px 12px 14px',
    gap: '4px',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    borderRadius: '10px 10px 0 0',
  },
  gaugeLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#555a72',
    letterSpacing: '0.08em',
  },
  gaugeValue: {
    fontSize: '28px',
    fontWeight: '800',
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    fontFamily: '"Inter", monospace',
  },
  gaugeUnit: {
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.06em',
  },
};
