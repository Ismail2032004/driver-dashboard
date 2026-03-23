import { useEffect } from 'react';
import { usePolling } from '../hooks/useApi.js';

// Inject the pulse keyframe once at module load
if (typeof document !== 'undefined' && !document.getElementById('_sidebar_pulse')) {
  const s = document.createElement('style');
  s.id = '_sidebar_pulse';
  s.textContent = `
    @keyframes _pulse_dot {
      0%, 100% { transform: scale(1);    opacity: 1;   }
      50%       { transform: scale(1.35); opacity: 0.7; }
    }
  `;
  document.head.appendChild(s);
}

export default function Sidebar({ selected, onSelect }) {
  const { data, loading, error } = usePolling('/api/drivers', 10000);
  const drivers = data?.drivers ?? [];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>DRIVERS</span>
        <span style={styles.driverCount}>{drivers.length}</span>
      </div>

      <div style={styles.list}>
        {loading && (
          <div style={styles.state}>Loading…</div>
        )}
        {error && (
          <div style={{ ...styles.state, color: '#ef4444' }}>
            Failed to load drivers
          </div>
        )}
        {!loading && !error && drivers.length === 0 && (
          <div style={styles.state}>No drivers found</div>
        )}
        {drivers.map(id => (
          <DriverRow
            key={id}
            id={id}
            selected={selected === id}
            onClick={() => onSelect(id)}
          />
        ))}
      </div>
    </aside>
  );
}

function DriverRow({ id, selected, onClick }) {
  const initials = id.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  const color = stringToColor(id);

  const { data: latest } = usePolling(`/api/drivers/${id}/latest`, 5000);
  const isAggressive = latest?.label === 1;

  return (
    <button
      style={{
        ...styles.row,
        background: selected ? '#222538' : 'transparent',
        borderColor: selected ? '#4f6ef733' : 'transparent',
      }}
      onClick={onClick}
    >
      <div style={{ ...styles.avatar, background: color + '22', border: `1px solid ${color}44` }}>
        <span style={{ ...styles.avatarText, color }}>{initials}</span>
      </div>
      <div style={styles.rowContent}>
        <span style={styles.driverId}>{formatDriverId(id)}</span>
        <span style={styles.driverSub}>{id}</span>
      </div>

      {/* Status dot */}
      <div
        title={isAggressive ? 'Currently aggressive' : 'Normal driving'}
        style={{
          width: '8px',
          height: '8px',
          minWidth: '8px',
          borderRadius: '50%',
          background: isAggressive ? '#ef4444' : '#22c55e',
          boxShadow: isAggressive ? '0 0 5px #ef444488' : '0 0 5px #22c55e66',
          animation: isAggressive ? '_pulse_dot 1.2s ease-in-out infinite' : 'none',
        }}
      />

      {selected && <div style={styles.activeDot} />}
    </button>
  );
}

function formatDriverId(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function stringToColor(str) {
  const palette = ['#4f6ef7', '#a78bfa', '#34d399', '#f59e0b', '#f87171', '#38bdf8', '#fb923c'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

const styles = {
  sidebar: {
    width: '240px',
    minWidth: '240px',
    background: '#13151f',
    borderRight: '1px solid #2a2d3e',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 10px',
    borderBottom: '1px solid #1e2132',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#555a72',
    letterSpacing: '0.08em',
  },
  driverCount: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#4f6ef7',
    background: '#4f6ef711',
    border: '1px solid #4f6ef722',
    borderRadius: '10px',
    padding: '1px 7px',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  state: {
    padding: '16px',
    textAlign: 'center',
    color: '#555a72',
    fontSize: '13px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 10px',
    border: '1px solid transparent',
    borderRadius: '8px',
    marginBottom: '2px',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    textAlign: 'left',
  },
  avatar: {
    width: '34px',
    height: '34px',
    minWidth: '34px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: '12px',
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
    overflow: 'hidden',
  },
  driverId: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#e8eaf0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  driverSub: {
    display: 'block',
    fontSize: '11px',
    color: '#555a72',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  activeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#4f6ef7',
    minWidth: '6px',
  },
};
