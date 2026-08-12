import React from "react";
import { degToCompass, hourLabel, isRainCode, weatherLabel } from "./weather";

const WEATHER_EMOJI = (code) =>
  code === 0 || code === 1 ? "☀️"
  : code === 2 ? "⛅"
  : code === 3 ? "☁️"
  : code === 45 || code === 48 ? "🌫️"
  : code >= 51 && code <= 67 ? "🌧️"
  : code >= 71 && code <= 77 ? "❄️"
  : code >= 80 && code <= 82 ? "🌦️"
  : code >= 85 && code <= 86 ? "🌨️"
  : code >= 95 ? "⛈️"
  : "🌡️";

function Stat({ label, value, unit }) {
  return (
    <div className="wx-stat">
      <span className="eyebrow">{label}</span>
      <b>
        {value}
        {unit && <small>{unit}</small>}
      </b>
    </div>
  );
}

function LiveWeather({ place, data, loading, error, onDismiss }) {
  const c = data?.current;

  return (
    <section className="weather-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">LIVE CONDITIONS · OPEN-METEO</span>
          <h2 data-testid="weather-title">
            {place ? place.name + (place.admin1 ? `, ${place.admin1}` : "") : "No place selected"}
          </h2>
        </div>
        {place && (
          <button className="dismiss-btn" onClick={onDismiss} aria-label="Clear location">
            ✕
          </button>
        )}
      </div>

      {loading && (
        <div className="weather-loading" data-testid="weather-loading">
          <span className="spinner" />
          Resolving live conditions…
        </div>
      )}

      {error && (
        <div className="weather-error" data-testid="weather-error">
          ⚠ {error}
        </div>
      )}

      {!loading && !error && c && (
        <div className="weather-body">
          <div className="weather-hero" data-testid="weather-current">
            <span className="wx-emoji">{WEATHER_EMOJI(c.weather_code)}</span>
            <div className="wx-temp">
              <b>{Math.round(c.temperature_2m)}°</b>
              <small>{weatherLabel(c.weather_code)}</small>
            </div>
            <div className="wx-feels">
              Feels {Math.round(c.apparent_temperature)}° ·{" "}
              {c.relative_humidity_2m}% humidity
            </div>
          </div>

          <div className="wx-stats">
            <Stat label="WIND" value={Math.round(c.wind_speed_10m)} unit=" km/h" />
            <Stat label="DIR" value={degToCompass(c.wind_direction_10m)} />
            <Stat
              label="PRECIP"
              value={c.precipitation ? c.precipitation.toFixed(1) : "0"}
              unit=" mm"
            />
            <Stat label="PRESS" value={Math.round(c.pressure_msl)} unit=" hPa" />
          </div>

          <div className="hourly-label">
            <span className="eyebrow">HOURLY OUTLOOK</span>
            {isRainCode(c.weather_code) ? (
              <b className="rainy">RAIN EXPECTED NOW</b>
            ) : (
              <b>DRY NOW</b>
            )}
          </div>

          <div className="hourly-row" data-testid="hourly-outlook">
            {data.hourly.time.map((iso, i) =>
              i < 24 ? (
                <div className="hour-chip" key={iso}>
                  <span>{hourLabel(iso)}</span>
                  <i>{WEATHER_EMOJI(data.hourly.weather_code[i])}</i>
                  <b>{Math.round(data.hourly.temperature_2m[i])}°</b>
                  <small>
                    {data.hourly.precipitation_probability?.[i] ?? 0}%
                  </small>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {!loading && !error && !c && (
        <div className="weather-empty">
          Select or search a place to view live conditions.
        </div>
      )}
    </section>
  );
}

export default LiveWeather;