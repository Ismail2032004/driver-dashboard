import { useState } from 'react';

const CREDENTIALS = { username: 'admin', password: 'driver123' };

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [shaking, setShaking]   = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
      onLogin();
    } else {
      setError('Invalid username or password.');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card} className={shaking ? 'shake' : ''}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <span style={styles.brandName}>Driver Behavior Monitor</span>
        </div>

        <h1 style={styles.heading}>Sign in</h1>
        <p style={styles.sub}>Fleet monitoring dashboard</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            type="text"
            autoComplete="username"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            placeholder="admin"
            required
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="••••••••"
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.btn} type="submit">Sign in</button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
        .shake { animation: shake 0.45s ease; }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at 60% 40%, #1a1d3a 0%, #0f1117 60%)',
    padding: '24px',
  },
  card: {
    background: '#1a1d2e',
    border: '1px solid #2a2d3e',
    borderRadius: '16px',
    padding: '40px 44px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  brandIcon: {
    width: '44px',
    height: '44px',
    background: '#4f6ef711',
    border: '1px solid #4f6ef733',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#8b90a7',
    letterSpacing: '0.02em',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#e8eaf0',
    marginBottom: '4px',
  },
  sub: {
    fontSize: '13px',
    color: '#8b90a7',
    marginBottom: '28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#8b90a7',
    marginTop: '12px',
    marginBottom: '4px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  input: {
    background: '#13151f',
    border: '1px solid #2a2d3e',
    borderRadius: '8px',
    padding: '11px 14px',
    color: '#e8eaf0',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    marginTop: '8px',
    padding: '10px 14px',
    background: '#ef444415',
    border: '1px solid #ef444433',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '13px',
  },
  btn: {
    marginTop: '20px',
    padding: '12px',
    background: 'linear-gradient(135deg, #4f6ef7, #6b5ce7)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    letterSpacing: '0.02em',
    transition: 'opacity 0.2s, transform 0.1s',
  },
};
