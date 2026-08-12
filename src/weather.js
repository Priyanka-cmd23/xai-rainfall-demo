const GEOCODER_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail"
};

export const weatherLabel = (code) => WEATHER_CODES[code] ?? "Unknown";

export const isRainCode = (code) =>
  code >= 51 && code <= 67 ? true
  : code >= 80 && code <= 82 ? true
  : code === 95 || code === 96 || code === 99;

export async function searchCities(query, signal) {
  if (!query || query.trim().length < 2) return [];
  const params = new URLSearchParams({
    name: query.trim(),
    count: "8",
    language: "en",
    format: "json"
  });
  const res = await fetch(`${GEOCODER_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const json = await res.json();
  return (json.results || []).map((r) => ({
    id: `${r.latitude.toFixed(4)}_${r.longitude.toFixed(4)}`,
    name: r.name,
    admin1: r.admin1 || "",
    admin2: r.admin2 || "",
    country: r.country || "",
    countryCode: r.country_code || "",
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone || "auto"
  }));
}

export async function fetchForecast(place, signal) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    timezone: place.timezone || "auto",
    forecast_days: "2",
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl",
    hourly:
      "temperature_2m,precipitation_probability,precipitation,weather_code"
  });
  const res = await fetch(`${FORECAST_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Forecast failed (${res.status})`);
  return res.json();
}

export const degToCompass = (deg) => {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
};

export const hourLabel = (iso) => {
  const d = new Date(iso);
  const h = d.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  return `${((h + 11) % 12) + 1}${ampm}`;
};