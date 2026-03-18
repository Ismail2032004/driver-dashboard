export default function StatCard({ label, value, sub, color = '#4f6ef7', icon }) {
  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <span style={styles.label}>{label}</span>
        {icon && (
          <div style={{ ...styles.iconWrap, background: color + '11', border: `1px solid ${color}22` }}>
            <span style={{ color }}>{icon}</span>
          </div>
        )}
      </div>
      <div style={{ ...styles.value, color }}>{value}</div>
      {sub && <div style={styles.sub}>{sub}</div>}
    </div>
  );
}

const styles = {
  card: {
    background: '#1a1d2e',
    border: '1px solid #2a2d3e',
    borderRadius: '12px',
    padding: '18px 20px',
    flex: 1,
    minWidth: '140px',
  },
  top: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#555a72',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  iconWrap: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  value: {
    fontSize: '26px',
    fontWeight: '700',
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  },
  sub: {
    fontSize: '12px',
    color: '#8b90a7',
    marginTop: '4px',
  },
};
