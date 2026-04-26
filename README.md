# مشهد — Mashhad 🎬

A premium Arabic-first streaming platform that aggregates movies and TV series from multiple sources, delivers intelligent subtitle synchronization, and provides a fully bilingual (Arabic/English) cinematic experience.

> **Live:** [mashhad-web.vercel.app](https://mashhad-web.vercel.app)  
> **Repo:** [github.com/KNIGHTABDO/MASHHAD](https://github.com/KNIGHTABDO/MASHHAD)

> ⚠️ **Mashhad does not host any media content.** It is an aggregation interface only. All movies, series, and metadata are provided through third-party APIs and belong to their respective rights holders.

---

## ✨ Features

### 🎥 Multi-Source Streaming Engine
- **Real-Debrid** — Torrentio → magnet hashes → RD instant availability → unrestrict → direct MKV + HLS
- **VidSrc Embed** — Ad-free fallback embed player with `postMessage` progress tracking
- **Smart Fallback Chain** — Auto-advances: Direct MKV → HLS → VidSrc embed on failure

### 🗣 Intelligent Subtitle System
- **3-Source Aggregation** — SubDL, OpenSubtitles REST v1, Stremio Legacy v3
- **Lip-Sync Scoring** — Matches subtitle release tags (WEB-DL, NTb, x264…) against the stream's actual filename for perfect frame timing
- **ZIP Extraction** — `fflate` for SubDL DEFLATE (method 8) archives
- **Format Pipeline** — ASS → SRT → VTT for universal browser playback
- **Encoding Detection** — UTF-8, Windows-1256, ISO-8859-1 with Arabic character validation
- **English Fallback** — Auto-searches English when Arabic unavailable

### 🌍 Bilingual Support (Arabic / English)
- Instant language switch using `router.refresh()` (no full page reload)
- TMDB metadata fetched in the active UI language via cookie + `?lang=` query param
- RTL/LTR layout adaptation on `<html>` element
- Complete i18n — zero hardcoded UI strings

### 📺 Smart Playback
- **Continue Watching** — Supabase-synced every 5s, survives stream switches, works for both movies and TV episodes
- **Skip Intro / Outro** — IntroDB segment detection
- **Auto Next Episode** — Post-playback screen with countdown
- **Server Switch Spinner** — Visual feedback when changing stream servers
- **RAF Progress Bar** — Hover tooltip uses `requestAnimationFrame` + direct DOM writes (zero re-renders per mousemove)
- **Multi-Profile** — Up to 5 independent profiles per account, Netflix-style picker

### 🎨 UI / Performance
- GPU-promoted scroll containers (`translateZ(0)` + `overflow-y: clip`)
- `requestAnimationFrame` debounced `onScroll` scroll-arrow state
- `will-change: transform` on card wrappers before hover (pre-promoted GPU layer)
- Splash screen initialized as `null` — no 1-frame flash on return visits
- Hero carousel preloads next slide image before transition
- PersonalRows: skeleton cards appear immediately, TMDB content fills staggered

---

## 🛡 Security

- **Authenticated API routes** — `/api/tmdb`, `/api/subtitles/search`, `/api/segments` all require a valid Supabase session
- **Path allowlist** — TMDB proxy only forwards requests to approved TMDB endpoint prefixes
- **SSRF protection** — Subtitle download URL validated against an CDN hostname allowlist before any server-side fetch
- **HTTP Security Headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`
- **RLS on all tables** — Every query uses `(SELECT auth.uid())` for single-evaluation performance
- **Composite DB indexes** — `profiles(user_id)`, `watch_history(profile_id, content_id, content_type)`, etc.
- **No tracking cookies** — Only 3 essential cookies: `mashhad-lang`, `active_profile_id`, Supabase session

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5 |
| Language | TypeScript (strict) | 5.x |
| React | React | 19.1 |
| Styling | Tailwind CSS | 4.x |
| Animations | Framer Motion | 12.x |
| Database & Auth | Supabase (PostgreSQL + RLS) | 2.x |
| Server State | TanStack React Query | 5.x |
| Client State | Zustand | 5.x |
| Video | Custom HTML5 Player + HLS.js | 1.6 |
| Subtitles | fflate (zip), custom converters | 0.8 |
| Font | Thmanyah Sans (local woff2) | — |
| Deployment | Vercel (auto-deploy from main) | — |

### External APIs
| API | Purpose |
|---|---|
| TMDB | Metadata, search, discover, trending |
| Torrentio | Torrent stream resolution |
| Real-Debrid | Cached torrent → direct URL + HLS |
| OpenSubtitles REST v1 | Subtitle search & download |
| SubDL | Arabic subtitle search + release metadata |
| Stremio Addons | Legacy subtitle database |
| IntroDB | TV intro/outro segment timestamps |
| VidSrc | Embed fallback player |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/KNIGHTABDO/MASHHAD.git
cd MASHHAD
npm install
```

### Environment Variables

Create `.env.local`:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# TMDB (required)
TMDB_API_KEY=your_tmdb_api_key

# Real-Debrid (required for stream resolution)
REALDEBRID_API_TOKEN=your_realdebrid_token

# Subtitles (required for full subtitle coverage)
OPENSUBTITLES_API_KEY=your_opensubtitles_rest_api_key
SUBDL_API_KEY=your_subdl_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run

```bash
npm run dev      # Development — http://localhost:3000
npm run build    # Production build
npm start        # Production server
npm run lint     # Lint
```

---

## 📁 Project Structure

```
mashhad/
├── app/
│   ├── layout.tsx                      # Root layout (font, metadata, Providers)
│   ├── globals.css                     # Design tokens, animations, utilities
│   ├── (auth)/                         # Login & Register (outside main layout)
│   ├── (main)/                         # Main layout (Navbar + Footer)
│   │   ├── page.tsx                    # Home — hero carousel + content rows
│   │   ├── movies/page.tsx             # Movies browse
│   │   ├── series/page.tsx             # Series browse
│   │   ├── search/page.tsx             # Bilingual search
│   │   ├── movie/[id]/page.tsx         # Movie detail
│   │   ├── series/[id]/page.tsx        # Series detail (seasons/episodes)
│   │   ├── watch/[id]/page.tsx         # Full-screen player page
│   │   ├── profiles/page.tsx           # Netflix-style profile picker
│   │   ├── settings/page.tsx           # User settings
│   │   ├── privacy/page.tsx            # Privacy Policy (bilingual)
│   │   ├── terms/page.tsx              # Terms of Service (bilingual)
│   │   └── contact/page.tsx            # Contact page
│   └── api/
│       ├── tmdb/[...path]/route.ts     # TMDB proxy (auth + allowlist + lang-aware)
│       ├── tmdb/detail/route.ts        # Single item detail (accepts ?lang= override)
│       ├── stream/resolve/route.ts     # Stream resolution engine
│       ├── subtitles/search/route.ts   # Multi-source subtitle search (auth + SSRF fix)
│       ├── segments/route.ts           # IntroDB intro/outro (auth protected)
│       ├── continue-watching/route.ts  # Watch progress API
│       └── watchlist/route.ts          # User saved list API
├── components/
│   ├── Providers.tsx                   # QueryClient + LanguageProvider + SplashScreen
│   ├── content/
│   │   ├── ContentRow.tsx              # RAF-debounced scroll, overflow-y:clip GPU fix
│   │   ├── ContentCard.tsx             # will-change promoted, hover preview card
│   │   ├── HeroSection.tsx             # Next-slide image preload, i18n
│   │   ├── PersonalRows.tsx            # ContinueWatchingRow + MyListRow (skeleton + lang)
│   │   ├── EpisodeList.tsx
│   │   └── WatchlistButton.tsx
│   ├── navigation/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── player/
│   │   ├── WatchClient.tsx             # 800-line main player (RAF progress bar, i18n)
│   │   └── PostPlaybackScreen.tsx
│   ├── profiles/
│   └── ui/
│       └── SplashScreen.tsx            # null-init state (no flash on return)
├── lib/
│   ├── animations.ts                   # Framer Motion presets
│   ├── i18n/
│   │   ├── context.tsx                 # LanguageProvider — uses router.refresh() not reload()
│   │   ├── ar.ts                       # Arabic translations (complete)
│   │   └── en.ts                       # English translations (complete)
│   ├── servers/
│   │   ├── index.ts                    # Parallel adapter orchestrator (8s timeout)
│   │   ├── realdebrid.ts              # Torrentio → RD → MKV/HLS + fileName
│   │   ├── vidsrc.ts
│   │   ├── fasselhd.ts
│   │   └── vidbom.ts
│   ├── subtitles/                      # SRT/ASS/VTT converters, encoding detection
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client
│   │   ├── server.ts                   # Server Supabase client
│   │   └── middleware.ts               # Session refresh
│   ├── tmdb/client.ts                  # Language-aware TMDB client (reads cookie)
│   └── utils/format.ts                 # getTMDBImageUrl, formatYear, formatRuntime, etc.
├── store/
│   ├── playerStore.ts                  # Zustand: volume, playbackRate
│   └── profileStore.ts
├── hooks/
├── types/
│   ├── content.ts                      # TMDB types
│   ├── stream.ts                       # StreamResult (url, type, label, quality, fileName)
│   └── subtitle.ts
├── middleware.ts                        # Auth guard + profile cookie check
├── next.config.ts                      # Security headers + image domains
└── public/
    ├── logo.png
    └── fonts/                          # Thmanyah Sans woff2 (300–900 weights)
```

---

## 🏗 Architecture

### Streaming Pipeline
1. Client → `GET /api/stream/resolve?tmdbId=&type=movie`
2. Server runs all adapters in parallel with 8s timeout
3. **Real-Debrid:** Torrentio → magnet hashes → RD instant availability → addMagnet → selectFiles → unrestrict → returns `{ url, hlsUrl, fileName, type:'direct' }`
4. **VidSrc:** Returns `{ url, type:'embed' }`
5. Client prioritizes: Direct MKV → HLS → Embed
6. `onError` triggers `tryNextStream()` automatically

### Language System
- **Cookie:** `mashhad-lang=ar|en` (read by server components + API routes)
- **Client state:** `useT()` hook — updates instantly on `setLang()`
- **TMDB re-fetch:** `router.refresh()` re-runs all server components with updated cookie — no full reload
- **API override:** Client components pass `?lang=en` to `/api/tmdb/detail` to bypass cookie for parallel fetches

### Subtitle Sync Scoring
Video filename from `StreamResult.fileName` (populated by Real-Debrid adapter) is scored against each subtitle:

| Factor | Points |
|---|---|
| Release group match (NTb, FLUX) | +20 |
| Release tag overlap (WEB-DL, x264) | up to +15 |
| Resolution match (1080p) | +5 |
| Download count | up to +5 |
| Machine translated | −10 |

---

## 📄 Legal

- [Privacy Policy](https://mashhad-web.vercel.app/privacy) — Bilingual, GDPR-style, cookie table included
- [Terms of Service](https://mashhad-web.vercel.app/terms) — Bilingual, aggregator disclaimer
- [Contact](https://mashhad-web.vercel.app/contact)

---

## 📜 License

MIT License — See LICENSE file for details.
