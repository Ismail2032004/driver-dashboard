import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import DriverDetail from './DriverDetail.jsx';

export default function Dashboard({ onLogout }) {
  const [selectedDriver, setSelectedDriver] = useState(null);

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span style={styles.headerTitle}>Driver Behavior Monitor</span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.liveDot} />
          <span style={styles.liveLabel}>LIVE</span>
          <button style={styles.logoutBtn} onClick={onLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={styles.body}>
        <Sidebar selected={selectedDriver} onSelect={setSelectedDriver} />
        <main style={styles.main}>
          {selectedDriver
            ? <DriverDetail driverId={selectedDriver} />
            : <EmptyState />
          }
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={emptyStyles.wrap}>
      <div style={emptyStyles.icon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a2d3e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <p style={emptyStyles.text}>Select a driver from the sidebar</p>
      <p style={emptyStyles.sub}>to view telemetry and behavior analysis</p>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    background: '#0f1117',
  },
  header: {
    height: '56px',
    minHeight: '56px',
    background: '#13151f',
    borderBottom: '1px solid #2a2d3e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    zIndex: 10,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: {
    width: '34px',
    height: '34px',
    background: '#4f6ef711',
    border: '1px solid #4f6ef722',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#e8eaf0',
    letterSpacing: '0.02em',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 6px #22c55e',
    animation: 'pulse 2s infinite',
  },
  liveLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: '0.08em',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    background: 'transparent',
    border: '1px solid #2a2d3e',
    borderRadius: '7px',
    color: '#8b90a7',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'border-color 0.2s, color 0.2s',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
};

const emptyStyles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '400px',
    gap: '8px',
  },
  icon: {
    marginBottom: '12px',
  },
  text: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#555a72',
  },
  sub: {
    fontSize: '13px',
    color: '#3a3d52',
  },
};
