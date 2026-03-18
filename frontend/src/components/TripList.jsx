import { usePolling } from '../hooks/useApi.js';
import { API_BASE_URL } from '../config.js';

export default function TripList({ driverId, selectedTripId, onSelectTrip }) {
  const { data: tripsData } = usePolling(`/api/drivers/${driverId}/trips`,         30000);
  const { data: activeData } = usePolling(`/api/drivers/${driverId}/trips/active`, 5000);

  const trips  = tripsData?.trips  ?? [];
  const active = activeData?.active ? activeData.trip : null;

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.title}>TRIPS</span>
        <span style={s.count}>{trips.length} completed</span>
      </div>

      <div style={s.list}>
        {/* Active trip banner */}
        {active && (
          <div style={s.activeBanner}>
            <div style={s.activeDot} />
            <div style={s.activeInfo}>
              <span style={s.activeLabel}>Active Trip</span>
              <span style={s.activeSub}>Started {formatTime(active.start_time)}</span>
            </div>
            <span style={s.activeBadge}>LIVE</span>
          </div>
        )}

        {trips.length === 0 && !active && (
          <div style={s.empty}>No completed trips yet</div>
        )}

        {trips.map((trip, i) => (
          <TripRow
            key={trip.id}
            trip={trip}
            index={trips.length - i}
            selected={selectedTripId === trip.id}
            onSelect={() => onSelectTrip(trip.id === selectedTripId ? null : trip.id)}
            driverId={driverId}
          />
        ))}
      </div>
    </div>
  );
}

function TripRow({ trip, index, selected, onSelect, driverId }) {
  const rate     = trip.aggression_rate ?? 0;
  const rateColor = rate < 0.2 ? '#22c55e' : rate < 0.5 ? '#f59e0b' : '#ef4444';
  const duration  = formatDuration(trip.start_time, trip.end_time);

  function stopPropAndDownload(e) {
    e.stopPropagation();
  }

  return (
    <div
      style={{
        ...s.row,
        background:   selected ? '#222538' : 'transparent',
        borderColor:  selected ? '#4f6ef744' : 'transparent',
      }}
      onClick={onSelect}
    >
      <div style={s.rowTop}>
        <span style={s.tripNum}>Trip #{index}</span>
        <span style={{ ...s.rateChip, background: rateColor + '22', color: rateColor, border: `1px solid ${rateColor}44` }}>
          {(rate * 100).toFixed(1)}%
        </span>
      </div>

      <div style={s.rowMid}>
        <span style={s.rowDate}>{formatDate(trip.start_time)}</span>
        <span style={s.rowTime}>{formatTime(trip.start_time)}</span>
        <span style={s.rowDur}>{duration}</span>
      </div>

      <div style={s.rowBot}>
        <span style={s.windows}>{trip.total_windows} windows · {trip.aggressive_windows} aggressive</span>
        <a
          href={`${API_BASE_URL}/api/drivers/${driverId}/trips/${trip.id}/csv`}
          download
          onClick={stopPropAndDownload}
          style={s.csvBtn}
        >
          ↓ CSV
        </a>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(start, end) {
  if (!start || !end) return '—';
  const ms  = new Date(end) - new Date(start);
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${min}m ${sec}s`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1d2e',
    border: '1px solid #2a2d3e',
    borderRadius: '12px',
    overflow: 'hidden',
    minWidth: '260px',
    maxWidth: '320px',
    flex: '0 0 300px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #2a2d3e',
  },
  title: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#555a72',
    letterSpacing: '0.08em',
  },
  count: {
    fontSize: '11px',
    color: '#4f6ef7',
    background: '#4f6ef711',
    border: '1px solid #4f6ef722',
    borderRadius: '10px',
    padding: '1px 7px',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: '420px',
  },
  activeBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    background: '#22c55e0f',
    borderBottom: '1px solid #22c55e22',
  },
  activeDot: {
    width: '10px',
    height: '10px',
    minWidth: '10px',
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 6px #22c55e',
    animation: 'livePulse 1.5s ease-in-out infinite',
  },
  activeInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  activeLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#22c55e',
  },
  activeSub: {
    fontSize: '11px',
    color: '#555a72',
  },
  activeBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#22c55e',
    background: '#22c55e22',
    border: '1px solid #22c55e44',
    borderRadius: '4px',
    padding: '2px 6px',
    letterSpacing: '0.06em',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#555a72',
    fontSize: '13px',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '12px 14px',
    border: '1px solid transparent',
    borderRadius: '8px',
    margin: '4px 6px',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripNum: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e8eaf0',
  },
  rateChip: {
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '4px',
    padding: '1px 6px',
  },
  rowMid: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  rowDate: {
    fontSize: '11px',
    color: '#8b90a7',
  },
  rowTime: {
    fontSize: '11px',
    color: '#8b90a7',
  },
  rowDur: {
    fontSize: '11px',
    color: '#555a72',
    marginLeft: 'auto',
  },
  rowBot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  windows: {
    fontSize: '11px',
    color: '#555a72',
  },
  csvBtn: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#4f6ef7',
    textDecoration: 'none',
    padding: '2px 7px',
    border: '1px solid #4f6ef733',
    borderRadius: '4px',
    background: '#4f6ef711',
  },
};
