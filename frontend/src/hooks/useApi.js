import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config.js';

/**
 * Fetch a URL and auto-refresh every `interval` ms.
 * Returns { data, loading, error, lastUpdated, refresh }.
 */
export function usePolling(path, interval = 1000) {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    fetch_();
    timerRef.current = setInterval(fetch_, interval);
    return () => clearInterval(timerRef.current);
  }, [path, interval, fetch_]);

  return { data, loading, error, lastUpdated, refresh: fetch_ };
}
