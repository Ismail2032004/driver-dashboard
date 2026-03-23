import { useState } from 'react';
import { usePolling } from '../hooks/useApi.js';
import StatCard from './StatCard.jsx';
import LiveReadings from './SensorCard.jsx';
import TripList from './TripList.jsx';
import TripMap from './TripMap.jsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

export default function DriverDetail({ driverId }) {
  const [selectedTripId, setSelectedTripId] = useState(null);
  const statsPath     = `/api/drivers/${driverId}/stats`;
  const telemetryPath = `/api/drivers/${driverId}/telemetry?range=1h`;
  const latestPath    = `/api/drivers/${driverId}/latest`;

  const { data: stats,     loading: sL, lastUpdated } = usePolling(statsPath,      1000);
  const { data: telemetry, loading: tL }               = usePolling(telemetryPath, 10000);
  const { data: latest,    loading: lL }               = usePolling(latestPath,     1000);

  const rows         = telemetry?.telemetry ?? [];
  const latestPoint  = latest ?? null;
  const isAggressive = latestPoint?.label === 1;
  const loading      = sL || tL || lL;

  // Build live route from telemetry rows (filtered to points that have GPS)
  const liveRoute = rows
    .filter(r => r.lat != null && r.lon != null && r.lat !== 0 && r.lon !== 0)
    .map(r => ({ lat: r.lat, lon: r.lon, label: r.label ?? 0, timestamp: r.timestamp }));

  // Format telemetry rows for recharts
  const chartData = rows.map(r => ({
    time:    formatTime(r.timestamp),
    speed:   r.speed != null    ? +r.speed.toFixed(2)    : null,
    rpm:     r.rpm != null      ? +r.rpm.toFixed(0)      : null,
    label:   r.label != null    ? r.label                : null,
  }));

  return (
    <div style={styles.root}>
      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.driverTitle}>{formatDriverId(driverId)}</h2>
          <span style={styles.driverIdSub}>{driverId}</span>
        </div>
        <div style={styles.topBarRight}>
          {lastUpdated && (
            <span style={styles.lastUpdated}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <StatusBadge aggressive={isAggressive} loading={lL} />
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={styles.statRow}>
        <StatCard
          label="Total Windows"
          value={stats ? stats.total_windows.toLocaleString() : '—'}
          color="#4f6ef7"
          icon="▦"
        />
        <StatCard
          label="Aggressive"
          value={stats ? stats.aggressive_count.toLocaleString() : '—'}
          color="#ef4444"
          icon="⚡"
        />
        <StatCard
          label="Aggression Rate"
          value={stats ? `${(stats.aggression_rate * 100).toFixed(1)}%` : '—'}
          sub={stats ? rateLabel(stats.aggression_rate) : ''}
          color={stats ? rateColor(stats.aggression_rate) : '#8b90a7'}
          icon="📊"
        />
        <StatCard
          label="Avg Speed"
          value={stats ? stats.avg_speed.toFixed(1) : '—'}
          sub="km/h"
          color="#38bdf8"
          icon="🚗"
        />
        <StatCard
          label="Avg RPM"
          value={stats ? Number(stats.avg_rpm).toLocaleString() : '—'}
          sub="RPM"
          color="#a78bfa"
          icon="⚙️"
        />
      </div>

      {/* ── Charts ── */}
      {rows.length === 0 && !loading ? (
        <NoData />
      ) : (
        <>
          <ChartCard title="Speed" unit="km/h" color="#4f6ef7">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                <XAxis dataKey="time" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<ChartTooltip unit="km/h" />} />
                <Line type="monotone" dataKey="speed" stroke="#4f6ef7" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="RPM" unit="rpm" color="#a78bfa">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                <XAxis dataKey="time" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<ChartTooltip unit="rpm" />} />
                <Line type="monotone" dataKey="rpm" stroke="#a78bfa" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Behavior Label" unit="" color="#f59e0b"
            subtitle="0 = Normal · 1 = Aggressive">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                <XAxis dataKey="time" tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={40} domain={[-0.1, 1.1]} ticks={[0, 1]} />
                <Tooltip content={<LabelTooltip />} />
                <ReferenceLine y={0.5} stroke="#2a2d3e" strokeDasharray="4 4" />
                <Line type="stepAfter" dataKey="label" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* ── Live readings ── */}
      <LiveReadings latest={latestPoint} />

      {/* ── Recent alerts ── */}
      <AlertsPanel driverId={driverId} />

      {/* ── Trips ── */}
      <div style={styles.tripsSection}>
        <TripList
          driverId={driverId}
          selectedTripId={selectedTripId}
          onSelectTrip={setSelectedTripId}
        />
        <TripMap
          driverId={driverId}
          tripId={selectedTripId}
          liveRoute={liveRoute}
        />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ aggressive, loading }) {
  if (loading) return <div style={badge.base}>…</div>;
  return (
    <div style={{
      ...badge.base,
      background: aggressive ? '#ef444420' : '#22c55e20',
      border:     `1px solid ${aggressive ? '#ef444455' : '#22c55e55'}`,
      color:      aggressive ? '#ef4444'   : '#22c55e',
    }}>
      <div style={{
        ...badge.dot,
        background: aggressive ? '#ef4444' : '#22c55e',
        boxShadow:  `0 0 6px ${aggressive ? '#ef4444' : '#22c55e'}`,
      }} />
      {aggressive ? 'AGGRESSIVE' : 'NORMAL'}
    </div>
  );
}

function ChartCard({ title, unit, color, subtitle, children }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartHeader}>
        <div style={styles.chartTitleRow}>
          <div style={{ ...styles.chartDot, background: color }} />
          <span style={styles.chartTitle}>{title}</span>
          {subtitle && <span style={styles.chartSubtitle}>{subtitle}</span>}
        </div>
        {unit && <span style={styles.chartUnit}>{unit}</span>}
      </div>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div style={tooltip.box}>
      <div style={tooltip.time}>{label}</div>
      <div style={{ ...tooltip.val, color: payload[0]?.stroke }}>
        {val != null ? `${val} ${unit}` : '—'}
      </div>
    </div>
  );
}

function LabelTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div style={tooltip.box}>
      <div style={tooltip.time}>{label}</div>
      <div style={{ ...tooltip.val, color: val === 1 ? '#ef4444' : '#22c55e' }}>
        {val === 1 ? 'Aggressive' : val === 0 ? 'Normal' : '—'}
      </div>
    </div>
  );
}

function AlertsPanel({ driverId }) {
  const { data, loading } = usePolling(`/api/drivers/${driverId}/alerts`, 10000);
  const alerts = data?.alerts ?? [];

  return (
    <div style={alertStyles.panel}>
      <div style={alertStyles.header}>
        <span style={alertStyles.bellIcon}>🔔</span>
        <span style={alertStyles.title}>Recent Alerts</span>
        <span style={alertStyles.sub}>last hour</span>
      </div>

      <div style={alertStyles.list}>
        {loading && alerts.length === 0 ? (
          <div style={alertStyles.empty}>Loading…</div>
        ) : alerts.length === 0 ? (
          <div style={alertStyles.empty}>No alerts in the last hour</div>
        ) : (
          alerts.map((a, i) => (
            <AlertItem key={i} alert={a} />
          ))
        )}
      </div>
    </div>
  );
}

function AlertItem({ alert }) {
  const time = alert.timestamp
    ? new Date(alert.timestamp).toLocaleTimeString([], {
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : '—';
  const speed = alert.speed != null ? `${alert.speed.toFixed(0)} km/h` : '— km/h';
  const conf  = alert.confidence != null
    ? `${(alert.confidence * 100).toFixed(0)}% confidence`
    : '';

  return (
    <div style={alertStyles.item}>
      <span style={alertStyles.warnIcon}>⚠️</span>
      <div style={alertStyles.itemContent}>
        <span style={alertStyles.itemTime}>{time}</span>
        <span style={alertStyles.itemSpeed}>{speed}</span>
        {conf && <span style={alertStyles.itemConf}>{conf}</span>}
      </div>
    </div>
  );
}

function NoData() {
  return (
    <div style={styles.noData}>
      <span style={styles.noDataText}>No telemetry data in the last hour</span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDriverId(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function rateColor(rate) {
  if (rate < 0.2) return '#22c55e';
  if (rate < 0.5) return '#f59e0b';
  return '#ef4444';
}

function rateLabel(rate) {
  if (rate < 0.2) return 'Low risk';
  if (rate < 0.5) return 'Medium risk';
  return 'High risk';
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '1100px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  driverTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#e8eaf0',
    marginBottom: '2px',
  },
  driverIdSub: {
    fontSize: '12px',
    color: '#555a72',
    fontFamily: 'monospace',
  },
  lastUpdated: {
    fontSize: '11px',
    color: '#555a72',
  },
  statRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  chartCard: {
    background: '#1a1d2e',
    border: '1px solid #2a2d3e',
    borderRadius: '12px',
    padding: '20px 20px 12px',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  chartTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  chartDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  chartTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e8eaf0',
  },
  chartSubtitle: {
    fontSize: '11px',
    color: '#555a72',
    marginLeft: '4px',
  },
  chartUnit: {
    fontSize: '11px',
    color: '#555a72',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  noData: {
    background: '#1a1d2e',
    border: '1px solid #2a2d3e',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: '14px',
    color: '#555a72',
  },
  tripsSection: {
    display: 'flex',
    gap: '16px',
    alignItems: 'stretch',
    minHeight: '420px',
  },
};

const badge = {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.06em',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};

const tooltip = {
  box: {
    background: '#13151f',
    border: '1px solid #2a2d3e',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
  },
  time: {
    color: '#555a72',
    marginBottom: '3px',
  },
  val: {
    fontWeight: '600',
    fontSize: '14px',
  },
};

const chartMargin = { top: 4, right: 8, left: 0, bottom: 0 };
const tickStyle   = { fill: '#555a72', fontSize: 11 };

const alertStyles = {
  panel: {
    background: '#1a1d2e',
    border: '1px solid #2a2d3e',
    borderRadius: '12px',
    padding: '16px 20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  bellIcon: {
    fontSize: '15px',
    lineHeight: 1,
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e8eaf0',
  },
  sub: {
    fontSize: '11px',
    color: '#555a72',
    marginLeft: '2px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '280px',
    overflowY: 'auto',
  },
  empty: {
    fontSize: '13px',
    color: '#555a72',
    padding: '8px 0',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#13151f',
    border: '1px solid #2a2d3e',
    borderLeft: '3px solid #ef4444',
    borderRadius: '7px',
    padding: '8px 12px',
  },
  warnIcon: {
    fontSize: '14px',
    lineHeight: 1,
    flexShrink: 0,
  },
  itemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  itemTime: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#e8eaf0',
    minWidth: '70px',
  },
  itemSpeed: {
    fontSize: '12px',
    color: '#ef4444',
    fontWeight: '600',
  },
  itemConf: {
    fontSize: '11px',
    color: '#555a72',
  },
};
