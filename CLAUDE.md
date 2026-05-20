# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # Run ESLint
npm run clean     # Clean Next.js build artifacts
npx tsc --noEmit  # Type-check without emitting
```

## Architecture Overview

**Kuzhiyundo** is a community pothole tracker for Kerala. It is a Next.js 15 (App Router) single-page app where the entire UI lives in one component — `components/LeafletPotholeMap.tsx` (~1800 lines) — loaded dynamically with `ssr: false` to avoid Leaflet SSR issues.

### Data Flow

1. **Real-time reads**: A single `onSnapshot` listener on the `potholes` Firestore collection drives the entire map. Reports are ordered by `createdAt` desc.
2. **Writing a report**: User clicks two points on the map → OSRM Router encodes the road segment as a polyline → Nominatim reverse-geocodes the origin → `/api/constituency` resolves AC/PC/LSGD via point-in-polygon against Open Data Kerala GeoJSON → `addDoc` to `potholes`.
3. **Voting**: `arrayUnion`/`arrayRemove` on `upvoterIds`/`downvoterIds` fields. The detail sheet live-binds to `reports` array by ID (not a stale snapshot) so votes reflect immediately.

### API Routes (both edge runtime)

- **`/api/search`** — Proxies OLA Maps autocomplete. Requires `X-Firebase-AppCheck` header and `Origin: https://kuzhiyundo.com` on the upstream fetch (OLA Maps domain restriction).
- **`/api/constituency`** — Point-in-polygon lookup for Kerala assembly/parliamentary/LSGD boundaries. Fetches GeoJSON from Open Data Kerala on demand, cached 24h via `Cache-Control`.

Both routes enforce Firebase App Check via `verifyAppCheckToken()` in `lib/appcheck-verify.ts`. The client attaches tokens via `fetchWithAppCheck()` in `lib/appcheck-fetch.ts`.

### Key Architectural Decisions

- **All sub-components are internal functions** inside `LeafletPotholeMap.tsx`: `RenderReports`, `ReportingOverlay`, `ReportDetailSheet`, `SubmitRouteForm`, `MapEventsHandler`, `RouteDisplay`, `SignInToVoteModal`, etc.
- **`RenderReports` is inside `MapContainer`** and uses `useMap()` / `useMapEvents()`. Components rendered here that use `fixed` positioning must call `e.stopPropagation()` to prevent Leaflet from intercepting clicks.
- **Zoom-dependent rendering**: markers + clusters below zoom 14, polylines rendered at zoom ≥ 14.
- **Images are base64 in Firestore** (not Firebase Storage), compressed to 800×800 JPEG at 0.6 quality client-side before saving.
- **Auth**: Google Sign-In only, state in Zustand `useAuthStore`. Edit/delete gated on `report.userId === user.uid`.

### Firestore Schema (`potholes` collection)

| Field | Type | Notes |
|---|---|---|
| `userId`, `userName` | string | Reporter identity |
| `encodedPath` | string | Google polyline encoding of road segment |
| `createdAt` | timestamp | Server timestamp |
| `severity` | `low\|medium\|high` | |
| `status` | `reported\|confirmed\|fixed` | |
| `address` | string | From Nominatim |
| `district`, `pincode` | string | From Nominatim |
| `acName`, `acNo`, `pcName` | string/number | From `/api/constituency` |
| `lsgd`, `lsgdType`, `lsgdLabel`, `lsgCode` | string | LSGD info |
| `wardNo`, `wardName` | string/number | From `/api/constituency` via FlatGeobuf ward lookup |
| `upvoterIds`, `downvoterIds` | string[] | UIDs |
| `notes`, `imageUrl` | string | Optional |

### Environment Variables

See `.env.example`. Key non-obvious ones:
- `OLA_MAPS_API_KEY` — server-side only (no `NEXT_PUBLIC_`), used in `/api/search`. The upstream fetch must include `Origin: https://kuzhiyundo.com` or OLA Maps rejects with "Domain not allowed."
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` — reCAPTCHA v3 for Firebase App Check.
