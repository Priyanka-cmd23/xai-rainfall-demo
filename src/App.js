import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import LocationSearch from "./LocationSearch";
import LiveWeather from "./LiveWeather";
import { fetchForecast, isRainCode } from "./weather";

const clamp = (v) => Math.max(0, Math.min(1, v));

const N = 18;

const BANDS = [
  { key: "no_rain", label: "No rain", color: "#24313D" },
  { key: "light", label: "Light", color: "#73B7FF" },
  { key: "moderate", label: "Moderate", color: "#48C78E" },
  { key: "heavy", label: "Heavy", color: "#FFD166" },
  { key: "very_heavy", label: "Very heavy", color: "#FF8C42" },
  { key: "extremely_heavy", label: "Extremely heavy", color: "#F04438" }
];

const seeded = (seed) => {
  let t = seed + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const bandFor = (v) =>
  v < 0.12 ? BANDS[0]
  : v < 0.28 ? BANDS[1]
  : v < 0.48 ? BANDS[2]
  : v < 0.68 ? BANDS[3]
  : v < 0.84 ? BANDS[4]
  : BANDS[5];

const XAI_STOPS = ["#2457D6", "#28A9E8", "#F2D34F", "#F28E2B", "#D83B32"];

const xaiColor = (v) => {
  const i = Math.min(3, Math.floor(v * 4));
  const t = v * 4 - i;
  const a = XAI_STOPS[i];
  const b = XAI_STOPS[i + 1];
  const c = (k) =>
    Math.round(
      parseInt(a.slice(k, k + 2), 16) * (1 - t) +
        parseInt(b.slice(k, k + 2), 16) * t
    )
      .toString(16)
      .padStart(2, "0");
  return `#${c(1)}${c(3)}${c(5)}`;
};

const makeScene = (seed) => {
  const r = seeded(seed);
  const cores = Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({
    x: 2 + r() * 14,
    y: 2 + r() * 14,
    power: 0.65 + r() * 0.35,
    spread: 1.8 + r() * 2.6
  }));
  return Array.from({ length: N * N }, (_, index) => {
    const x = index % N;
    const y = Math.floor(index / N);
    const intensity = clamp(
      cores.reduce(
        (sum, c) =>
          sum +
          c.power *
            Math.exp(-((x - c.x) ** 2 + (y - c.y) ** 2) / (2 * c.spread ** 2)),
        0
      ) +
        (r() - 0.5) * 0.035
    );
    return { x, y, intensity };
  });
};

const FEATURES = [
  "WV-TIR1 Brightness Temp Gap",
  "Cloud-Top Temperature",
  "Convective Core Density",
  "Moisture Transport Index",
  "Upper-Air Wind Shear",
  "Terrain / Orographic Lift"
];

function GridPanel({ type, scene, selected, onSelect }) {
  const isRaw = type === "raw";
  const isRain = type === "rain";
  const label = isRaw
    ? "Raw Satellite Feed"
    : isRain
    ? "Rainfall Prediction"
    : "XAI Explanation";

  const fill = (cell) =>
    isRaw
      ? `rgb(${Math.round(27 + cell.intensity * 220)},${Math.round(
          37 + cell.intensity * 215
        )},${Math.round(48 + cell.intensity * 205)})`
      : isRain
      ? bandFor(cell.intensity).color
      : xaiColor(cell.intensity);

  const headingEyebrow = isRaw
    ? "TIR CHANNEL 01"
    : isRain
    ? "IMD CLASSIFICATION"
    : "GRAD-CAM STAND-IN";

  return (
    <section className="map-panel" data-testid={`map-panel-${type}`}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">{headingEyebrow}</span>
          <h2 data-testid={`map-title-${type}`}>{label}</h2>
        </div>
        <span className="panel-index">
          {isRaw ? 1 : isRain ? 2 : 3}
        </span>
      </div>

      <div className="map-frame">
        <div className="scanline" aria-hidden="true" />
        <svg
          className="storm-grid"
          viewBox={`0 0 ${N} ${N}`}
          role="grid"
          aria-label={`${label} grid`}
          data-testid={`grid-${type}`}
        >
          {scene.map((cell) => {
            const isSelected =
              selected?.x === cell.x && selected?.y === cell.y;
            return (
              <rect
                key={`${cell.x}-${cell.y}`}
                x={cell.x + 0.03}
                y={cell.y + 0.03}
                width="0.94"
                height="0.94"
                rx="0.06"
                fill={fill(cell)}
                className={`grid-cell ${isSelected ? "selected-cell" : ""}`}
                role={isRaw ? "gridcell" : "button"}
                tabIndex={isRaw ? -1 : 0}
                aria-label={`Grid cell ${cell.x + 1}, ${
                  cell.y + 1
                }; intensity ${Math.round(cell.intensity * 100)} percent`}
                data-testid={`cell-${type}-${cell.x}-${cell.y}`}
                onClick={() => !isRaw && onSelect(cell)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  !isRaw &&
                  onSelect(cell)
                }
              />
            );
          })}
        </svg>
        <div className="axis-label axis-top">LONGITUDE / GRID X →</div>
        <div className="axis-label axis-left">↑ LAT / Y</div>
      </div>

      {isRain ? (
        <div className="legend" data-testid="rainfall-legend">
          {BANDS.map((band) => (
            <span key={band.key}>
              <i style={{ background: band.color }} />
              {band.label}
            </span>
          ))}
        </div>
      ) : type === "xai" ? (
        <div className="colorbar-wrap" data-testid="xai-colorbar">
          <div className="colorbar" />
          <div>
            <span>LOW ACTIVATION</span>
            <span>HIGH RISK</span>
          </div>
        </div>
      ) : (
        <p className="panel-note" data-testid="raw-feed-note">
          Inverted TIR brightness · colder cloud tops read brighter
        </p>
      )}
    </section>
  );
}

function AttributeBar({ item }) {
  return (
    <div className="attribution-row" data-testid={`attribution-${item.name}`}>
      <div className="attr-label">
        <span>{item.name}</span>
        <b className={item.positive ? "positive" : "negative"}>
          {item.positive ? "+" : "−"}
          {Math.round(item.value * 100)}%
        </b>
      </div>
      <div className="attr-track">
        <span
          className={item.positive ? "positive-bar" : "negative-bar"}
          style={{ width: `${Math.max(8, item.value * 100)}%` }}
        />
      </div>
    </div>
  );
}

function App() {
  const [seed, setSeed] = useState(1521);
  const [scene, setScene] = useState(() => makeScene(1521));
  const [selected, setSelected] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [classKey, setClassKey] = useState("heavy");
  const [now, setNow] = useState(new Date());

  const [place, setPlace] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  const timerRef = useRef(null);
  const weatherAbortRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(id);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!place) {
      setWeather(null);
      setWeatherError(null);
      return;
    }
    if (weatherAbortRef.current) weatherAbortRef.current.abort();
    const controller = new AbortController();
    weatherAbortRef.current = controller;
    setWeatherLoading(true);
    setWeatherError(null);
    fetchForecast(place, controller.signal)
      .then((json) => {
        if (controller.signal.aborted) return;
        setWeather(json);
        setWeatherLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setWeatherError(
          err.name === "AbortError" ? null : err.message || "Could not load weather."
        );
        setWeatherLoading(false);
      });
    return () => controller.abort();
  }, [place]);

  const bandName = selected ? bandFor(selected.intensity).label : "Awaiting selection";

  const liveRaining = Boolean(
    weather?.current && isRainCode(weather.current.weather_code)
  );

  const applyLiveToScene = (pathScene) => {
    if (!liveRaining) return pathScene;
    const cx = 9;
    const cy = 9;
    return pathScene.map((cell) => {
      const dist = Math.hypot(cell.x - cx, cell.y - cy);
      const boost = clamp(1.18 - dist * 0.03);
      return {
        ...cell,
        intensity: clamp(cell.intensity + boost * 0.45)
      };
    });
  };

  const displayAlerts = useMemo(
    () =>
      applyLiveToScene(scene)
        .filter((c) => c.intensity > 0.65)
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene, liveRaining]
  );

  const attribution = useMemo(
    () =>
      selected
        ? FEATURES.map((name, i) => {
            const raw = Math.sin(
              (selected.x + 1) * 13.17 +
                (selected.y + 1) * 7.31 +
                seed * 0.017 +
                i * 2.4
            );
            const positive =
              i < 3 ? selected.intensity > 0.42 || raw > 0.25 : raw > 0.62;
            const value = clamp(
              Math.abs(raw) * 0.38 + selected.intensity * (positive ? 0.32 : 0.11)
            );
            return { name, value, positive };
          })
        : [],
    [selected, seed]
  );

  const runPrediction = () => {
    if (isRunning) return;
    setIsRunning(true);
    setSelected(null);
    const next = seed + 97;
    timerRef.current = setTimeout(() => {
      setSeed(next);
      setScene(makeScene(next));
      setIsRunning(false);
    }, 800);
  };

  const timestamp = now.toISOString().slice(0, 19).replace("T", " ");

  const displayScene = useMemo(
    () => applyLiveToScene(scene),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene, liveRaining]
  );

  return (
    <div className="console-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="isro-mark">ISRO</div>
          <div>
            <p className="brand-label">MISSION CONTROL / SIH-1521</p>
            <p className="brand-name">
              INSAT-3D <span>XAI RAINFALL</span>
            </p>
          </div>
        </div>
        <div className="status-cluster">
          <span className="status-dot" />
          <span data-testid="system-status">
            {place ? "LIVE MODE · ONLINE" : "SYNTHETIC MODE · ONLINE"}
          </span>
          <span className="timestamp" data-testid="timestamp">
            {timestamp} UTC
          </span>
        </div>
      </header>

      <main className="content-shell">
        <section className="masthead">
          <div>
            <p className="eyebrow">EXPLAINABLE WEATHER INTELLIGENCE</p>
            <h1 data-testid="dashboard-title">
              Heavy rainfall,
              <br />
              <em>made inspectable.</em>
            </h1>
            <p className="mission-copy" data-testid="mission-description">
              Three synchronized lenses on one synthetic storm field — from
              satellite signal to predicted IMD severity to the features
              driving each cell.
            </p>
          </div>

          <div className="control-deck">
            <LocationSearch onSelect={setPlace} />
            <label htmlFor="class-select">
              EXPLAIN RAINFALL CLASS
              <select
                id="class-select"
                value={classKey}
                onChange={(e) => setClassKey(e.target.value)}
                data-testid="rainfall-class-select"
              >
                {BANDS.slice(1).map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="run-button"
              onClick={runPrediction}
              disabled={isRunning}
              data-testid="run-prediction-button"
            >
              <span>{isRunning ? "RECALCULATING" : "RUN PREDICTION"}</span>
              <b>↗</b>
            </button>
          </div>
        </section>

        <div className="telemetry-row">
          <span data-testid="telemetry-grid">
            GRID <b>{N} × {N}</b>
          </span>
          <span data-testid="telemetry-cores">
            STORM CORES <b>2–4 GAUSSIANS</b>
          </span>
          <span data-testid="telemetry-source">
            SOURCE <b>{place ? `${place.name} · LIVE API` : "INSAT-3D / MOCK STREAM"}</b>
          </span>
          <span className="seed-readout" data-testid="seed-readout">
            SEED <b>{seed}</b>
          </span>
        </div>

        <section className="maps-grid">
          <GridPanel
            type="raw"
            scene={displayScene}
            selected={selected}
            onSelect={setSelected}
          />
          <GridPanel
            type="rain"
            scene={displayScene}
            selected={selected}
            onSelect={setSelected}
          />
          <GridPanel
            type="xai"
            scene={displayScene}
            selected={selected}
            onSelect={setSelected}
          />
        </section>

        <LiveWeather
          place={place}
          data={weather}
          loading={weatherLoading}
          error={weatherError}
          onDismiss={() => setPlace(null)}
        />

        <section className="lower-grid">
          <aside className="alerts-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">DISASTER MANAGEMENT RELAY</span>
                <h2 data-testid="alerts-title">High-risk zones</h2>
              </div>
              <span className="alert-count" data-testid="alert-count">
                {displayAlerts.length} ACTIVE
              </span>
            </div>
            <p className="section-subtitle">
              {liveRaining
                ? "Live precipitation active · cells boosted toward the storm core"
                : "Cells above 65% predicted intensity · outbound channel ready"}
            </p>
            <div className="alert-list">
              {displayAlerts.length ? (
                displayAlerts.map((cell, i) => (
                  <button
                    key={`${cell.x}-${cell.y}`}
                    className="alert-item"
                    onClick={() => setSelected(cell)}
                    data-testid={`alert-item-${i}`}
                  >
                    <span className="alert-rank">{i + 1}</span>
                    <span className="alert-location">
                      <b>
                        GRID {String(cell.x + 1).padStart(2, "0")} /{" "}
                        {String(cell.y + 1).padStart(2, "0")}
                      </b>
                      <small>{bandFor(cell.intensity).label} rainfall</small>
                    </span>
                    <span className="alert-intensity">
                      {Math.round(cell.intensity * 100)}%
                    </span>
                    <span className="mock-tag">SMS / TG · MOCK</span>
                  </button>
                ))
              ) : (
                <div className="empty-state" data-testid="alerts-empty">
                  No zones above threshold.
                </div>
              )}
            </div>
          </aside>

          <section className="explain-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">CELL-LEVEL FORENSICS</span>
                <h2 data-testid="explanation-title">Why this prediction?</h2>
              </div>
              {selected && (
                <span className="selected-chip" data-testid="selected-cell-chip">
                  SELECTED · {selected.x + 1},{selected.y + 1}
                </span>
              )}
            </div>

            {selected ? (
              <div className="explain-content">
                <div className="cell-summary" data-testid="selected-cell-details">
                  <div>
                    <span className="eyebrow">GRID COORDINATE</span>
                    <strong>
                      {String(selected.x + 1).padStart(2, "0")} /{" "}
                      {String(selected.y + 1).padStart(2, "0")}
                    </strong>
                  </div>
                  <div>
                    <span className="eyebrow">INTENSITY</span>
                    <strong className="risk-number">
                      {Math.round(selected.intensity * 100)}%
                    </strong>
                  </div>
                  <div>
                    <span className="eyebrow">BAND</span>
                    <strong>{bandName.toUpperCase()}</strong>
                  </div>
                </div>

                <div className="attribution-list">
                  {attribution.map((item) => (
                    <AttributeBar key={item.name} item={item} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="explain-empty" data-testid="explanation-empty">
                <div className="crosshair">＋</div>
                <p>Select a cell in the prediction or XAI panel</p>
                <small>
                  Feature attribution will resolve deterministically for the
                  selected coordinate.
                </small>
              </div>
            )}
          </section>
        </section>
      </main>

      <footer className="footer-bar">
        <span>© INDIAN SPACE RESEARCH ORGANISATION · DEMONSTRATION SYSTEM</span>
        <span data-testid="mock-disclaimer">
          {place
            ? "LIVE CONDITIONS VIA OPEN-METEO · FORECAST MAPS SYNTHETIC"
            : "ALL VALUES MOCKED / SYNTHETIC · NO LIVE DATA CONNECTION"}
        </span>
      </footer>
    </div>
  );
}

export default App;
