# AGENTS.md — Mashhad (مشهد)

> Arabic-first streaming platform for movies & TV series. Next.js 15, Supabase, Real-Debrid, multi-source subtitles.

---

## Project Overview

Mashhad is a full-stack Arabic streaming platform that aggregates content from multiple streaming APIs (Real-Debrid, VidSrc, Torrentio), provides intelligent subtitle synchronization from 3 sources (SubDL, OpenSubtitles, Stremio), and delivers a bilingual (Arabic/English) cinematic UI. It does NOT host any media content — it is an aggregation interface only.

**Live deployment:** `mashhad-web.vercel.app` (Vercel auto-deploy from `main` branch)

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
│   │   ├── layout.tsx                  # Wraps children with Navbar + Footer
│   │   ├── page.tsx                    # Home — hero carousel + content rows
│   │   ├── movies/page.tsx             # Movies browse
│   │   ├── series/page.tsx             # Series browse
│   │   ├── search/page.tsx             # Search with language-aware TMDB queries
│   │   ├── movie/[id]/page.tsx         # Movie detail (poster, synopsis, cast, play)
│   │   ├── series/[id]/page.tsx        # Series detail (seasons, episodes, progress)
│   │   ├── watch/[id]/page.tsx         # Full-screen video player
│   │   ├── profiles/page.tsx           # Profile picker (Netflix-style)
│   │   ├── settings/page.tsx           # User settings
│   │   ├── privacy/page.tsx            # Privacy Policy (bilingual)
│   │   ├── terms/page.tsx              # Terms of Service (bilingual)
│   │   └── contact/page.tsx            # Contact page
│   └── api/
│       ├── tmdb/
│       │   ├── [...path]/route.ts      # TMDB proxy — language-aware, cached
│       │   └── detail/route.ts         # Single item detail (movie or TV)
│       ├── stream/resolve/route.ts     # Stream resolution engine
│       ├── realdebrid/
│       │   └── resolve/route.ts        # Real-Debrid torrent → stream URL
│       ├── subtitles/
│       │   └── search/route.ts         # Multi-source subtitle search + download
│       ├── segments/route.ts           # IntroDB intro/outro timestamps
│       ├── continue-watching/route.ts  # Watch progress API
│       └── watchlist/route.ts          # User saved list API
├── components/
│   ├── Providers.tsx                   # QueryClient + LanguageProvider + SplashScreen
│   ├── content/                        # ContentRow, ContentCard, PersonalRows
│   ├── navigation/
│   │   ├── Navbar.tsx                  # Fixed navbar with search, lang toggle, profile menu
│   │   └── Footer.tsx                  # Footer with legal links + disclaimer
│   ├── player/
│   │   ├── WatchClient.tsx             # Main player component (700+ lines)
│   │   └── PostPlaybackScreen.tsx      # Next episode screen
│   ├── profiles/                       # Profile picker, editor, avatar
│   ├── subtitles/                      # Subtitle selector UI
│   └── ui/
│       └── SplashScreen.tsx            # Animated logo splash (once per session)
├── lib/
│   ├── animations.ts                   # Framer Motion presets (spring, fadeIn, etc.)
│   ├── i18n/
│   │   ├── context.tsx                 # LanguageProvider + useT() hook
│   │   ├── ar.ts                       # Arabic translations
│   │   └── en.ts                       # English translations
│   ├── servers/
│   │   ├── index.ts                    # Server orchestrator (parallel resolve + fallback)
│   │   ├── realdebrid.ts              # Real-Debrid adapter (Torrentio → RD → stream URL)
│   │   ├── vidsrc.ts                   # VidSrc embed adapter
│   │   ├── fasselhd.ts                # FasselHD adapter
│   │   └── vidbom.ts                   # Vidbom adapter
│   ├── subtitles/                      # Subtitle parsing utilities
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client
│   │   ├── server.ts                   # Server Supabase client
│   │   └── middleware.ts               # Session refresh middleware
│   ├── tmdb/
│   │   └── client.ts                   # TMDB API client (language-aware)
│   └── utils/
│       └── format.ts                   # Image URLs, rating formatting, etc.
├── store/
│   ├── playerStore.ts                  # Zustand player state
│   └── profileStore.ts                # Zustand active profile state
├── hooks/                              # Custom React hooks
├── types/
│   ├── content.ts                      # TMDB content types
│   ├── stream.ts                       # StreamResult interface
│   └── subtitle.ts                     # Subtitle types
├── middleware.ts                        # Auth guard + session refresh
├── public/
│   ├── logo.png                        # Brand logo (transparent background)
│   └── fonts/                          # Thmanyah Sans woff2 files
└── package.json
```

---

## Architecture & Key Patterns

### Streaming Pipeline
1. Client requests streams for a TMDB ID via `/api/stream/resolve`
2. Server orchestrator runs all server adapters in parallel with 8s timeout
3. **Real-Debrid flow:** Torrentio → get magnet hashes → RD instant availability check → unrestrict → returns direct MKV URL + HLS URL + actual filename
4. **VidSrc flow:** Returns embed URL (iframe-based player)
5. Client prioritizes: Direct MKV → HLS → VidSrc embed
6. If a stream fails, auto-fallback to next available

### Subtitle Sync Scoring Algorithm
The subtitle engine searches 3 sources (SubDL, OpenSubtitles, Stremio) and scores each result against the actual video filename:

| Factor | Points | Why |
|---|---|---|
| Release group match (NTb, FLUX) | +20 | Same encoder = same frame timing |
| Release tag overlap (WEB-DL, x264) | up to +15 | Same source = same cut |
| Resolution match (1080p) | +5 | Same encode |
| Download count | up to +5 | Community validation |
| Machine translated | -10 | Usually desynced |

The stream's actual filename is propagated via `StreamResult.fileName` from the Real-Debrid adapter.

### Internationalization (i18n)
- **Client-side context:** `useT()` hook returns `{ t, lang, setLang, dir }`
- **Translations:** Static objects in `lib/i18n/ar.ts` and `lib/i18n/en.ts`
- **Language persistence:** `localStorage` + `document.cookie` (`mashhad-lang`)
- **TMDB language:** The TMDB proxy reads `mashhad-lang` cookie OR a `lang` query param
- **Switching:** `setLang()` updates cookie + localStorage + reloads page
- **Direction:** `dir="rtl"` for Arabic, `dir="ltr"` for English (set on `<html>`)

### Authentication & Profiles
- **Supabase Auth** with email/password (no social login)
- **Multi-profile:** Up to 5 profiles per account, each with independent watch history
- **Session flow:** Login → Profile Picker → Main App
- **Active profile:** Stored in HTTP cookie `active_profile_id` (read by middleware and API routes)
- **Profile switch:** Uses `window.location.href` (NOT `router.push`) to ensure middleware sees fresh cookie

### Watch Progress (Continue Watching)
- Saves to `watch_history` table every 5 seconds during playback
- Supports both movies (`content_type: 'movie'`) and TV episodes (`content_type: 'episode'`)
- Deduplicates by `content_id` — only shows the most recent entry
- Works across server switches (Direct → HLS → VidSrc embed)
- VidSrc embed progress tracked via `postMessage` listener

---

## Database Schema (Supabase)

Key tables with Row-Level Security (RLS) enabled:

- **`profiles`** — Netflix-style profiles (name, avatar_color, is_kids, language, maturity_level)
- **`watch_history`** — Progress tracking (content_id, content_type, season/episode, progress_seconds, duration_seconds, completed)
- **`watchlist`** — Saved content (content_id, content_type)
- **`ratings`** — User ratings (content_id, rating 1-10)

All tables enforce RLS: users can only access data through their own profiles.

---

## Code Style & Conventions

### General
- TypeScript strict mode is enabled
- Use `@/` path alias for imports (maps to project root)
- Prefer named exports for components
- Server Components by default; add `'use client'` only when hooks/interactivity are needed
- API routes use `NextResponse.json()` for responses

### Components
- Components are organized by feature area (`content/`, `player/`, `navigation/`, `profiles/`)
- Use Framer Motion for all animations (import presets from `lib/animations.ts`)
- Use `useT()` hook for all user-facing text — never hardcode strings
- Images use Next.js `<Image>` component with `sizes` prop for responsive loading

### Styling
- Tailwind CSS v4 (PostCSS plugin, NOT `@tailwind` directives — uses `@import "tailwindcss"`)
- Design tokens in CSS custom properties in `globals.css` (e.g., `--bg-primary`, `--accent-primary`)
- Glassmorphism: use `.glass` class
- Skeleton loading: use `.skeleton` class
- Colors: `#0A0A0A` (bg), `#141414` (cards), `#E50914` (accent red), `#B3B3B3` (secondary text)

### API Routes
- TMDB proxy (`/api/tmdb/[...path]`) is language-aware — reads `mashhad-lang` cookie or `lang` query param
- Stream resolver (`/api/stream/resolve`) runs adapters in parallel with timeout
- Subtitle search (`/api/subtitles/search`) aggregates 3 sources with sync scoring
- Use `next: { revalidate: N }` for fetch caching (3600s for metadata, 300s for search)

### State Management
- **Zustand** for client state (player settings, active profile)
- **TanStack Query** for server state (TMDB data, search results, watch history)
- **React Query keys** include language so cache invalidates on language switch

---

## Critical Implementation Details

### Things That WILL Break If Changed

1. **VidSrc iframe:** Do NOT add `sandbox` attribute — VidSrc's anti-adblock returns 404
2. **Profile navigation:** MUST use `window.location.href = '/'` not `router.push('/')` after profile selection — middleware needs fresh cookies
3. **TMDB client:** The method is `tmdb.series(id)` NOT `tmdb.tv(id)` — there is no `tv()` method
4. **SubDL API endpoint:** Must be `https://api.subdl.com/api/v1/subtitles` NOT `/auto`
5. **SubDL ZIP detection:** Check for `subdl.com` AND `.zip` in URL, not just `dl.subdl.com`
6. **Subtitle ZIP extraction:** Uses `fflate` library — SubDL uses DEFLATE (method 8) compression
7. **RealDebrid filename:** The `unrestrict.filename` field must be stored in `StreamResult.fileName` for subtitle sync scoring to work

### Font
- **Thmanyah Sans** is the only font. Loaded via `next/font/local` in `app/layout.tsx`
- Weights: 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold), 900 (Black)
- Files are in `public/fonts/thmanyahsans-*.woff2`
- Applied via CSS variable `--font-thmanyah`

### Cookie Names
- `mashhad-lang` — Language preference (`ar` | `en`)
- `active_profile_id` — Active profile UUID
- Supabase session cookies (managed by `@supabase/ssr`)

---

## External API Reference

### TMDB
- **Base:** `https://api.themoviedb.org/3`
- **Auth:** `api_key` query parameter
- **Language:** `ar-SA` for Arabic, `en-US` for English
- **Used for:** Search, discover, trending, movie/series details, seasons, credits

### Real-Debrid
- **Base:** `https://api.real-debrid.com/rest/1.0`
- **Auth:** `Authorization: Bearer <token>` header
- **Flow:** `/torrents/instantAvailability` → `/torrents/addMagnet` → `/torrents/selectFiles` → `/unrestrict/link`
- **CRITICAL:** All calls are server-side only. Token is NEVER exposed to client.

### Torrentio
- **Base:** `https://torrentio.strem.fun`
- **Endpoint:** `/stream/{type}/{imdbId}.json` or `/stream/{type}/{imdbId}:{season}:{episode}.json`
- **Returns:** Array of torrent stream objects with magnet hashes

### OpenSubtitles
- **Base:** `https://api.opensubtitles.com/api/v1`
- **Auth:** `Api-Key` header
- **Search:** `/subtitles?tmdb_id=X&languages=ar`

### SubDL
- **Base:** `https://api.subdl.com/api/v1`
- **Auth:** `api_key` query parameter
- **Search:** `/subtitles?api_key=X&tmdb_id=Y&languages=ar`
- **Download:** Returns ZIP files that must be decompressed with `fflate`

### IntroDB
- **Base:** `https://intro-skipper.b-cdn.net`
- **Endpoint:** `/api/{type}/{tmdbId}/season/{s}/episode/{e}`
- **Returns:** Intro/outro timestamps (start/end in seconds)

---

## Security Considerations

- **API tokens** (Real-Debrid, TMDB, OpenSubtitles, SubDL) are server-side only — never in `NEXT_PUBLIC_*` variables
- **Supabase RLS** is enabled on all tables — users can only access their own profiles' data
- **VidSrc embeds** use `referrerPolicy="origin"` for privacy
- **No tracking cookies** — only essential cookies for session, language, and profile
- **Content disclaimer:** Mashhad does not host any media content
