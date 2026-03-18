import { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('dbm_auth') === 'true');

  function handleLogin() {
    localStorage.setItem('dbm_auth', 'true');
    setAuthed(true);
  }

  function handleLogout() {
    localStorage.removeItem('dbm_auth');
    setAuthed(false);
  }

  if (!authed) return <Login onLogin={handleLogin} />;
  return <Dashboard onLogout={handleLogout} />;
}
