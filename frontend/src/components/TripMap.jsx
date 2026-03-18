import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE_URL } from '../config.js';

const ACCRA_CENTER = [5.6037, -0.1870];

export default function TripMap({ driverId, tripId, liveRoute = [] }) {
  const [completedPoints, setCompletedPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch completed trip route whenever tripId changes
  useEffect(() => {
    if (!tripId) { setCompletedPoints([]); return; }
    setLoading(true);
    fetch(`${API_BASE_URL}/api/drivers/${driverId}/trips/${tripId}/route`)
      .then(r => r.json())
      .then(d => setCompletedPoints(d.points ?? []))
      .catch(() => setCompletedPoints([]))
      .finally(() => setLoading(false));
  }, [tripId, driverId]);

  // Decide which points to show
  const isLive   = !tripId;
  const points   = isLive ? liveRoute : completedPoints;
  const segments = buildSegments(points);
  const first    = points[0];
  const last     = points[points.length - 1];
  const hasData  = points.length > 0;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.titleRow}>
          <div style={{ ...s.dot, background: isLive ? '#22c55e' : '#4f6ef7' }} />
          <span style={s.title}>{isLive ? 'Live Route' : 'Route Map'}</span>
          {hasData && <span style={s.sub}>{points.length} points</span>}
          {isLive && hasData && <span style={s.liveBadge}>LIVE</span>}
        </div>
        {loading && <span style={s.loading}>Loading…</span>}
      </div>

      <div style={s.mapWrap}>
        <MapContainer
          center={ACCRA_CENTER}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Color-coded route segments */}
          {segments.map((seg, i) => (
            <Polyline
              key={`${tripId ?? 'live'}-${i}`}
              positions={seg.positions}
              pathOptions={{ color: seg.label === 1 ? '#ef4444' : '#22c55e', weight: 4, opacity: 0.85 }}
            />
          ))}

          {/* Completed trip: start marker (green) */}
          {!isLive && first && (
            <CircleMarker
              center={[first.lat, first.lon]}
              radius={8}
              pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div style={popupStyle}>
                  <strong>Trip Start</strong><br />
                  {formatTs(first.timestamp)}<br />
                  Speed: {first.speed?.toFixed(1)} km/h
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Completed trip: end marker (red) */}
          {!isLive && last && last !== first && (
            <CircleMarker
              center={[last.lat, last.lon]}
              radius={8}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }}
            >
              <Popup>
                <div style={popupStyle}>
                  <strong>Trip End</strong><br />
                  {formatTs(last.timestamp)}<br />
                  Speed: {last.speed?.toFixed(1)} km/h
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Live route: pulsing blue marker at current position */}
          {isLive && last && (
            <CircleMarker
              center={[last.lat, last.lon]}
              radius={10}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 3 }}
            >
              <Popup>
                <div style={popupStyle}>
                  <strong>Current Position</strong><br />
                  {formatTs(last.timestamp)}<br />
                  {last.lat?.toFixed(5)}, {last.lon?.toFixed(5)}
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Fit bounds to completed trip once loaded */}
          {!isLive && hasData && <FitBounds points={points} />}

          {/* Pan to follow live position */}
          {isLive && last && <PanTo lat={last.lat} lon={last.lon} />}
        </MapContainer>

        {/* Overlay when no data at all */}
        {!hasData && (
          <div style={s.placeholder}>
            <span style={s.placeholderText}>
              {isLive ? 'Waiting for GPS data…' : 'Select a trip to view its route'}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={s.legend}>
        <LegendItem color="#22c55e" label="Normal" />
        <LegendItem color="#ef4444" label="Aggressive" />
        {!isLive && <LegendItem color="#22c55e" label="Start" dot />}
        {!isLive && <LegendItem color="#ef4444" label="End" dot />}
        {isLive  && <LegendItem color="#3b82f6" label="Current" dot />}
      </div>
    </div>
  );
}

// ── Map controllers ───────────────────────────────────────────────────────────

function FitBounds({ points }) {
  const map  = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!points.length) return;
    const key = `${points[0].lat},${points[points.length - 1].lat}`;
    if (key === prev.current) return;
    prev.current = key;
    const lats = points.map(p => p.lat);
    const lons = points.map(p => p.lon);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
      { padding: [32, 32] }
    );
  }, [points, map]);
  return null;
}

function PanTo({ lat, lon }) {
  const map  = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (lat == null || lon == null) return;
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (key === prev.current) return;
    prev.current = key;
    map.panTo([lat, lon], { animate: true, duration: 0.8 });
  }, [lat, lon, map]);
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSegments(points) {
  if (points.length < 2) return [];
  const segs = [];
  let segStart = 0;

  for (let i = 1; i <= points.length; i++) {
    const isLast  = i === points.length;
    const changed = !isLast && points[i].label !== points[segStart].label;
    if (changed || isLast) {
      const end = isLast ? i - 1 : i;
      segs.push({
        label:     points[segStart].label,
        positions: points.slice(segStart, end + 1).map(p => [p.lat, p.lon]),
      });
      segStart = end;
    }
  }
  return segs;
}

function formatTs(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function LegendItem({ color, label, dot }) {
  return (
    <div style={s.legendItem}>
      {dot
        ? <div style={{ ...s.legendDot, background: color }} />
        : <div style={{ ...s.legendLine, background: color }} />
      }
      <span style={s.legendLabel}>{label}</span>
    </div>
  );
}

const popupStyle = { fontSize: '12px', lineHeight: '1.6' };

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  wrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1d2e',
    border: '1px solid #2a2d3e',
    borderRadius: '12px',
    overflow: 'hidden',
    minWidth: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #2a2d3e',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e8eaf0',
  },
  sub: {
    fontSize: '11px',
    color: '#555a72',
  },
  liveBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#22c55e',
    background: '#22c55e1a',
    border: '1px solid #22c55e33',
    borderRadius: '4px',
    padding: '1px 6px',
    letterSpacing: '0.06em',
  },
  loading: {
    fontSize: '11px',
    color: '#555a72',
  },
  mapWrap: {
    position: 'relative',
    flex: 1,
    minHeight: '360px',
  },
  placeholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#13151fcc',
    zIndex: 500,
    pointerEvents: 'none',
  },
  placeholderText: {
    fontSize: '13px',
    color: '#555a72',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    padding: '10px 16px',
    borderTop: '1px solid #2a2d3e',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendLine: {
    width: '20px',
    height: '3px',
    borderRadius: '2px',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  legendLabel: {
    fontSize: '11px',
    color: '#8b90a7',
  },
};
