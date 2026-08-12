# INSAT-3D · XAI Rainfall (SIH-1521)

**Explainable Weather Intelligence** — a demo dashboard that shows three synchronized lenses on a single synthetic storm field:

1. **Raw Satellite Feed** — inverted TIR brightness (cold cloud tops read bright)
2. **Rainfall Prediction** — IMD severity classification per grid cell
3. **XAI Explanation** — feature attribution (a Grad-CAM stand-in) driving each cell

Built for the SIH-1521 smart India hackathon mission track. All values are **synthetic/mocked** — there is no live data connection.

## Features

- 18 × 18 storm grid animated with a radar scanline
- Click any cell in the prediction / XAI panels to inspect per-coordinate feature attribution (deterministic)
- "Run Prediction" regenerates a fresh storm field from a new seed
- **Live weather for any place** — search a city or region (e.g. Vadodara, Bareilly, Delhi, Paris, Berlin, Rome) or use the quick-select chips. Real current conditions + 24-hour hourly outlook from the free Open-Meteo API (no API key).
- When the selected place is currently raining, the synthetic storm field and high-risk alerts boost toward the live storm core, and the dashboard switches to **LIVE MODE**
- Live UTC timestamp, high-risk zone alerts panel, fully responsive layout
- Respects `prefers-reduced-motion`

## Tech

- React 18 + Vite-free Create React App (webpack 5)
- `@tanstack/react-query` (configured, ready for future live data)
- [Open-Meteo](https://open-meteo.com) — free geocoding + forecast API, no key required
- Vanilla CSS with dark "mission control" theme

## Getting started

```bash
npm install
npm start       # dev server -> http://localhost:3000
npm run build   # production build -> build/
```

## Deployment

Static build (`npm run build`) — deployable to **Vercel** with no configuration (framework preset: Create React App), or to GitHub Pages / Netlify.

## Disclaimer

This is a demonstration system. Live weather for a selected place comes from the Open-Meteo API (real data). The rainfall maps, per-cell attributions, and high-risk alert *ranking* are deterministic synthetic visuals driven by a seed — they do **not** represent a real satellite model output. No ISRO or IMD live data is consumed.
