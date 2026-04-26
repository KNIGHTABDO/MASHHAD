# AGENTS.md — Mashhad (مشهد)

> Arabic-first streaming platform for movies & TV series. Next.js 15, Supabase, Real-Debrid, multi-source subtitles.

---

## Project Overview

Mashhad is a full-stack Arabic streaming platform that aggregates content from multiple streaming APIs (Real-Debrid, VidSrc, Torrentio), provides intelligent subtitle synchronization from 3 sources (SubDL, OpenSubtitles, Stremio), and delivers a bilingual (Arabic/English) cinematic UI. It does NOT host any media content — it is an aggregation interface only.

**Live deployment:** `mashhad-web.vercel.app` (Vercel auto-deploy from `main` branch)  
**Repo:** `github.com/KNIGHTABDO/MASHHAD`

---

## Setup Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint
```

---

## Environment Variables

All required in `.env.local` (NEVER commit this file):

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>

# TMDB (required — metadata, search, discover)
TMDB_API_KEY=<tmdb-api-key>

# Real-Debrid (required — stream resolution)
REALDEBRID_API_TOKEN=<real-debrid-api-token>

# Subtitles (required for full subtitle coverage)
OPENSUBTITLES_API_KEY=<opensubtitles-rest-api-key>
SUBDL_API_KEY=<subdl-api-key>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5 |
| Language | TypeScript (strict mode) | 5.x |
| React | React | 19.1 |
| Styling | Tailwind CSS | 4.x |
| Animations | Framer Motion | 12.x |
| Database & Auth | Supabase (PostgreSQL + RLS) | 2.x |
| Server State | TanStack React Query | 5.x |
| Client State | Zustand | 5.x |
| Video | Custom HTML5 Player + HLS.js | 1.6 |
| Subtitles | fflate (zip), custom converters | 0.8 |
| Font | Thmanyah Sans (local woff2) | — |
| Deployment | Vercel | — |

---

## Project Structure

```
mashhad/
├── app/
│   ├── layout.tsx                      # Root layout (font, metadata, Providers)
│   ├── globals.css                     # Design tokens, animations, utilities
│   ├── not-found.tsx                   # 404 page
│   ├── (auth)/                         # Auth pages (outside main layout)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/                         # Main app layout (Navbar + Footer)
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Home — hero carousel + content rows
│   │   ├── movies/page.tsx             # Movies browse
│   │   ├── series/page.tsx             # Series browse
│   │   ├── search/page.tsx             # Search with language-aware TMDB queries
│   │   ├── movie/[id]/page.tsx         # Movie detail (poster, synopsis, cast, play)
│   │   ├── series/[id]/page.tsx        # Series detail (seasons, episodes, progress)
│   │   ├── watch/[id]/page.tsx         # Full-screen video player
│   │   ├── profiles/page.tsx           # Profile picker (Netflix-style)
│   │   ├── settings/page.tsx           # User settings
│   │   ├── privacy/page.tsx            # Privacy Policy (bilingual, cookie table)
│   │   ├── terms/page.tsx              # Terms of Service (bilingual, aggregator disclaimer)
│   │   └── contact/page.tsx            # Contact page
│   └── api/
│       ├── tmdb/
│       │   ├── [...path]/route.ts      # TMDB proxy — auth guard + path allowlist + lang-aware
│       │   └── detail/route.ts         # Single item detail — accepts ?lang= query param
│       ├── stream/resolve/route.ts     # Stream resolution engine
│       ├── realdebrid/
│       │   └── resolve/route.ts        # Real-Debrid torrent → stream URL
│       ├── subtitles/
│       │   └── search/route.ts         # Multi-source subtitle search — auth guard + SSRF fix
│       ├── segments/route.ts           # IntroDB intro/outro timestamps — auth guard
│       ├── continue-watching/route.ts  # Watch progress API
│       └── watchlist/route.ts          # User saved list API
├── components/
│   ├── Providers.tsx                   # QueryClient + LanguageProvider + SplashScreen
│   ├── content/
│   │   ├── ContentRow.tsx              # RAF-debounced scroll arrows, overflow-y:clip GPU fix
│   │   ├── ContentCard.tsx             # will-change GPU promotion, hover preview card
│   │   ├── HeroSection.tsx             # Auto-carousel, next-slide preload, i18n
│   │   ├── PersonalRows.tsx            # ContinueWatchingRow + MyListRow — skeleton + lang param
│   │   ├── EpisodeList.tsx
│   │   └── WatchlistButton.tsx
│   ├── navigation/
│   │   ├── Navbar.tsx                  # Fixed navbar with search, lang toggle, profile menu
│   │   └── Footer.tsx                  # Footer with legal links + disclaimer
│   ├── player/
│   │   ├── WatchClient.tsx             # Main player (RAF progress bar, server-switch spinner, i18n)
│   │   └── PostPlaybackScreen.tsx      # Next episode screen
│   ├── profiles/                       # Profile picker, editor, avatar
│   ├── subtitles/                      # Subtitle selector UI
│   └── ui/
│       └── SplashScreen.tsx            # null-init state — no 1-frame flash on return visits
├── lib/
│   ├── animations.ts                   # Framer Motion presets (spring, fadeIn, scaleIn, etc.)
│   ├── i18n/
│   │   ├── context.tsx                 # LanguageProvider — uses router.refresh() NOT reload()
│   │   ├── ar.ts                       # Arabic translations (complete, no missing keys)
│   │   └── en.ts                       # English translations (complete, mirrors ar.ts exactly)
│   ├── servers/
│   │   ├── index.ts                    # Parallel orchestrator (8s timeout, auto-fallback)
│   │   ├── realdebrid.ts              # Torrentio → RD → MKV/HLS + fileName propagation
│   │   ├── vidsrc.ts
│   │   ├── fasselhd.ts
│   │   └── vidbom.ts
│   ├── subtitles/                      # SRT/ASS/VTT converters, encoding detection
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client
│   │   ├── server.ts                   # Server Supabase client
│   │   └── middleware.ts               # Session refresh middleware
│   ├── tmdb/
│   │   └── client.ts                   # TMDB client — reads mashhad-lang cookie server-side
│   └── utils/
│       └── format.ts                   # getTMDBImageUrl, formatYear, formatRuntime, formatRating
├── store/
│   ├── playerStore.ts                  # Zustand: volume, playbackRate
│   └── profileStore.ts                # Zustand: active profile
├── hooks/                              # Custom React hooks
├── types/
│   ├── content.ts                      # TMDB content types (Movie, TVShow, etc.)
│   ├── stream.ts                       # StreamResult { url, type, label, quality, fileName }
│   └── subtitle.ts                     # Subtitle types (fileId, syncScore, source, etc.)
├── middleware.ts                        # Auth guard + session refresh + profile cookie check
├── next.config.ts                      # Security headers + image remotePatterns
└── public/
    ├── logo.png                        # Brand logo (transparent background)
    └── fonts/                          # Thmanyah Sans woff2 (300, 400, 500, 700, 900)
```

---

## Architecture & Key Patterns

### Streaming Pipeline
1. Client requests streams via `GET /api/stream/resolve?tmdbId=&type=movie|episode`
2. Server orchestrator runs all adapters in parallel with 8s timeout
3. **Real-Debrid flow:** Torrentio → magnet hashes → RD instant availability → addMagnet → selectFiles → unrestrict → returns direct MKV URL + HLS URL + actual filename
4. **VidSrc flow:** Returns embed URL (iframe-based player)
5. Client prioritizes: Direct MKV → HLS → VidSrc embed
6. `video.onError` triggers `tryNextStream()` for automatic fallback

### Language System (Important — Read Carefully)
- **Cookie:** `mashhad-lang=ar|en` — set client-side, read by server components and API routes
- **Client state:** `useT()` hook provides `{ t, lang, setLang, dir }`
- **Language switch:** `setLang()` → updates state + localStorage + cookie + `router.refresh()`
  - `router.refresh()` re-runs server components with the updated cookie so TMDB re-fetches in the new language — **NO full page reload, NO white screen**
  - **DO NOT change this back to `window.location.reload()`**
- **TMDB server-side:** `lib/tmdb/client.ts` reads the cookie via `next/headers`
- **TMDB client-side:** Client components pass `?lang=ar|en` to `/api/tmdb/detail` explicitly so the correct language is used regardless of timing
- **Direction:** `dir="rtl"` for Arabic, `dir="ltr"` for English — set on `<html>` by `applyLang()`

### Subtitle Sync Scoring
The subtitle engine scores each result against `StreamResult.fileName` (the actual video filename from Real-Debrid):

| Factor | Points | Why |
|---|---|---|
| Release group match (NTb, FLUX) | +20 | Same encoder = same frame timing |
| Release tag overlap (WEB-DL, x264) | up to +15 | Same source = same cut |
| Resolution match (1080p) | +5 | Same encode |
| Download count | up to +5 | Community validation |
| Machine translated | −10 | Usually desynced |

### Authentication & Profiles
- **Supabase Auth** with email/password only (no social login)
- **Multi-profile:** Up to 5 profiles per account, each with independent watch history
- **Session flow:** Login → Profile Picker → Main App
- **Active profile:** Stored in HTTP cookie `active_profile_id` (read by middleware and API routes)
- **Profile switch:** Uses `window.location.href = '/'` (NOT `router.push`) — middleware needs a fresh cookie read

### Watch Progress (Continue Watching)
- Saves to `watch_history` every 5 seconds during playback
- Supports movies (`content_type: 'movie'`) and TV episodes (`content_type: 'episode'`)
- Deduplicates by `content_id` — shows only the most recent entry per content
- Survives stream server switches (progress tracked via `lastKnownTime` ref)
- VidSrc embed progress tracked via `postMessage` listener

### Performance Patterns
- **Scroll debouncing:** `onScroll` in `ContentRow` uses `requestAnimationFrame` to batch 2 setState calls — prevents 12 synchronous re-renders per scroll tick
- **GPU promotion:** `overflow-y: clip` on scroll containers preserves the `translateZ(0)` compositor layer — `overflow-y: visible` defeats it
- **Card hover:** `will-change: transform` on card wrappers pre-promotes GPU layer before hover triggers `backdrop-filter: blur()`
- **Progress bar:** `onMouseMove` uses `requestAnimationFrame` + direct DOM writes via refs — zero `setState` per pixel
- **Splash screen:** State initialized as `null` (not `true`) so nothing renders until `useEffect` checks `sessionStorage`

---

## Database Schema (Supabase)

All tables have Row-Level Security (RLS) enabled with `(SELECT auth.uid())` for optimal query performance:

- **`profiles`** — Netflix-style profiles (name, avatar_color, is_kids, language, maturity_level)
- **`watch_history`** — Progress tracking (content_id, content_type, season/episode, progress_seconds, duration_seconds, completed)
- **`watchlist`** — Saved content (content_id, content_type)
- **`ratings`** — User ratings (content_id, rating 1-10)
- **`server_votes`** — Stream server quality votes (has RLS policies)

### Indexes
```sql
idx_profiles_user_id                     — profiles(user_id)
idx_watch_history_profile_content        — watch_history(profile_id, content_id, content_type)
idx_watchlist_profile_content            — watchlist(profile_id, content_id)
idx_ratings_profile_content              — ratings(profile_id, content_id)
```

---

## Security Implementation

| Layer | Implementation |
|---|---|
| API auth | All 3 sensitive routes check `supabase.auth.getUser()` and return 401 if no session |
| TMDB proxy allowlist | Only prefixes in `ALLOWED_TMDB_PREFIXES` array are forwarded |
| Subtitle SSRF | URL validated against `ALLOWED_SUBTITLE_HOSTS` before any server-side fetch |
| HTTP headers | `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control` |
| RLS performance | All policies use `(SELECT auth.uid())` not `auth.uid()` — evaluated once per query |
| Token exposure | Real-Debrid, TMDB, OpenSubtitles, SubDL tokens are server-side only, never in `NEXT_PUBLIC_*` |
| VidSrc iframe | No `sandbox` attribute — VidSrc anti-adblock returns 404 if sandboxed |

---

## Code Style & Conventions

### General
- TypeScript strict mode — **do not disable**
- Use `@/` path alias for all imports
- Server Components by default; add `'use client'` only for hooks/interactivity
- API routes use `NextResponse.json()` for responses

### i18n — Critical Rules
- **NEVER hardcode Arabic or English strings** — always use `t.*` keys from `useT()`
- When adding new UI text, add the key to **both** `lib/i18n/ar.ts` AND `lib/i18n/en.ts`
- Both files must remain in sync (same keys, same structure)
- Server components use `getServerT()` from `lib/i18n/server.ts`
- Use `lang === 'ar'` only for non-text logic (e.g., RTL padding direction)

### Components
- Use Framer Motion for all animations — import presets from `lib/animations.ts`
- Use `useT()` for all user-facing text
- Images use Next.js `<Image>` with `sizes` prop
- Do not add `will-change: transform` to things that don't animate — only hover/animated elements

### Styling
- Tailwind CSS v4 — uses `@import "tailwindcss"` (NOT `@tailwind` directives)
- Design tokens in CSS custom properties in `globals.css`
- Glassmorphism: `.glass` class
- Skeleton loading: `.skeleton` class
- Primary colors: `#0A0A0A` (bg), `#141414` (cards), `#E50914` (accent red), `#B3B3B3` (secondary text)

### API Routes
- TMDB proxy reads `mashhad-lang` cookie OR `?lang=` query param
- All sensitive routes must call `supabase.auth.getUser()` and return 401 on failure
- Use `next: { revalidate: N }` for fetch caching (3600s metadata, 300s search)

---

## Critical Implementation Details

### Things That WILL Break If Changed

1. **`router.refresh()` in `lib/i18n/context.tsx`** — This replaced `window.location.reload()`. It re-runs server components with the updated language cookie without a full page reload. **Do NOT revert to `window.location.reload()`.**
2. **VidSrc iframe:** Do NOT add `sandbox` attribute — VidSrc anti-adblock returns 404
3. **Profile navigation:** MUST use `window.location.href = '/'` not `router.push('/')` after profile selection — middleware needs a fresh cookie read on full navigation
4. **TMDB client method:** `tmdb.series(id)` NOT `tmdb.tv(id)` — there is no `tv()` method
5. **SubDL API endpoint:** Must be `https://api.subdl.com/api/v1/subtitles` NOT `/auto`
6. **SubDL ZIP detection:** Check for `subdl.com` AND `.zip` in URL, not just `dl.subdl.com`
7. **Subtitle ZIP extraction:** Uses `fflate` library — SubDL uses DEFLATE (method 8) compression
8. **RealDebrid filename:** `unrestrict.filename` must be stored in `StreamResult.fileName` for subtitle sync scoring
9. **overflow-y on scroll containers:** Must be `clip` not `visible` — `visible` defeats `translateZ(0)` GPU promotion
10. **`useState<boolean | null>(null)` in SplashScreen** — do not change to `useState(true)` or you get the 1-frame flash

### Font
- **Thmanyah Sans** — loaded via `next/font/local` in `app/layout.tsx`
- Weights: 300, 400, 500, 700, 900
- Files in `public/fonts/thmanyahsans-*.woff2`
- CSS variable: `--font-thmanyah`

### Cookie Names
- `mashhad-lang` — Language preference (`ar` | `en`)
- `active_profile_id` — Active profile UUID
- Supabase session cookies (managed by `@supabase/ssr`)

---

## External API Reference

### TMDB
- **Base:** `https://api.themoviedb.org/3`
- **Auth:** `api_key` query parameter (server-side only)
- **Language:** `ar-SA` for Arabic, `en-US` for English
- **Proxy:** `/api/tmdb/[...path]` — requires auth session, has path allowlist
- **Detail:** `/api/tmdb/detail?id=&type=&lang=` — accepts explicit lang override

### Real-Debrid
- **Base:** `https://api.real-debrid.com/rest/1.0`
- **Auth:** `Authorization: Bearer <token>` — server-side only, NEVER client-exposed
- **Flow:** `/torrents/instantAvailability` → `/torrents/addMagnet` → `/torrents/selectFiles` → `/unrestrict/link`

### Torrentio
- **Base:** `https://torrentio.strem.fun`
- **Endpoint:** `/stream/{type}/{imdbId}.json` or with `:{season}:{episode}`

### OpenSubtitles
- **Base:** `https://api.opensubtitles.com/api/v1`
- **Auth:** `Api-Key` header (server-side only)
- **Search:** `/subtitles?tmdb_id=X&languages=ar`

### SubDL
- **Base:** `https://api.subdl.com/api/v1`
- **Auth:** `api_key` query param (server-side only)
- **Search:** `/subtitles?api_key=X&tmdb_id=Y&languages=ar`
- **Download:** Returns ZIP files — decompress with `fflate` (DEFLATE method 8)

### IntroDB
- **Base:** `https://intro-skipper.b-cdn.net`
- **Endpoint:** `/api/{type}/{tmdbId}/season/{s}/episode/{e}`
- **Auth required:** Yes (session check in `/api/segments/route.ts`)

---

## Security Considerations

- API tokens (Real-Debrid, TMDB, OpenSubtitles, SubDL) are server-side only — never in `NEXT_PUBLIC_*`
- All API routes that call external services require a valid Supabase session
- Supabase RLS is enabled on all tables with optimized `(SELECT auth.uid())` evaluation
- SSRF protection on subtitle download via hostname allowlist
- VidSrc embeds use `referrerPolicy="origin"` for privacy
- No tracking cookies — only 3 essential cookies
- Content disclaimer: Mashhad does not host any media content
