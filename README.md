# مشهد — Mashhad 🎬

A premium, cinematic streaming platform built for the Arabic-speaking world. Mashhad aggregates movies and TV series through multiple streaming APIs, delivers intelligent subtitle synchronization, and provides a beautifully crafted bilingual experience.

> **Live:** [mashhad-web.vercel.app](https://mashhad-web.vercel.app)

---

## ✨ Features

### 🎥 Multi-Source Streaming Engine
- **Real-Debrid Integration** — Resolves cached torrents via Torrentio + Real-Debrid for high-quality direct MKV and HLS streams
- **VidSrc Embed Player** — Ad-free embedded player as an alternative streaming option with progress tracking via `postMessage`
- **Smart Fallback Chain** — Automatically tries the next available stream if one fails (Direct → HLS → Embed)

### 🗣 Intelligent Subtitle System
- **3-Source Search** — Aggregates subtitles from SubDL, OpenSubtitles REST API, and Stremio Legacy v3
- **Lip-Sync Scoring Algorithm** — Matches subtitle release tags (WEB-DL, x264, NTb, etc.) against the actual video filename for perfect synchronization
- **Smart Encoding Detection** — Handles UTF-8, Windows-1256, and ISO-8859-1 with automatic Arabic character validation
- **ZIP Extraction** — Uses `fflate` to decompress SubDL archives (DEFLATE method 8)
- **ASS → SRT → VTT Pipeline** — Converts any subtitle format to WebVTT for universal browser playback
- **English Fallback** — Automatically searches for English subtitles when Arabic aren't available

### 🌍 Full Bilingual Support (Arabic / English)
- Instant language switching with deep UI localization
- TMDB metadata fetched in the active UI language
- RTL/LTR layout adaptation

### 📺 Smart Playback Features
- **Continue Watching** — Supabase-synced progress tracker for both movies and TV episodes, works across server switches
- **Intro & Outro Skipping** — IntroDB integration for automatic segment detection
- **Auto Next Episode** — Seamless episode progression with post-playback screen
- **Multi-Profile Support** — Up to 5 profiles per account with independent watch histories

### 🎨 Premium UI/UX
- Cinematic dark-mode design with glassmorphism effects
- Framer Motion animations throughout
- Fully responsive (desktop, tablet, mobile)
- Custom HTML5 video player with progress bar, volume slider, playback speed, and keyboard shortcuts

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router, React 19) |
| **Styling** | Tailwind CSS, Framer Motion |
| **Database & Auth** | Supabase (PostgreSQL, Row-Level Security) |
| **Data Fetching** | TanStack React Query, Fetch API |
| **Video** | Custom HTML5 Player, HLS.js, VidSrc Embed |
| **Subtitles** | fflate (zip), custom SRT/ASS/VTT converters |
| **Deployment** | Vercel (auto-deploy from GitHub) |

### External APIs
- **TMDB** — Metadata, search, discover, trending
- **Torrentio** — Torrent stream resolution
- **Real-Debrid** — Cached torrent downloads + HLS transcoding
- **OpenSubtitles** — Subtitle search & download (REST v1)
- **SubDL** — Arabic subtitle search with release metadata
- **Stremio Addons** — Legacy subtitle database
- **IntroDB** — TV episode intro/outro segment timestamps

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

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# TMDB
TMDB_API_KEY=your_tmdb_api_key

# Real-Debrid
REALDEBRID_API_TOKEN=your_realdebrid_token

# Subtitles
OPENSUBTITLES_API_KEY=your_opensubtitles_api_key
SUBDL_API_KEY=your_subdl_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Structure

```
mashhad/
├── app/
│   ├── (auth)/          # Login & Register pages
│   ├── (main)/          # Primary UI (Home, Movie, Series, Search, Watch)
│   │   ├── privacy/     # Privacy Policy
│   │   ├── terms/       # Terms of Service
│   │   ├── contact/     # Contact page
│   │   └── watch/[id]/  # Video player page
│   └── api/
│       ├── tmdb/        # TMDB proxy (language-aware)
│       ├── stream/      # Stream resolution engine
│       ├── subtitles/   # Multi-source subtitle search & download
│       ├── segments/    # IntroDB intro/outro segments
│       ├── continue-watching/  # Watch progress API
│       └── watchlist/   # User's saved list
├── components/
│   ├── content/         # Movie cards, grids, continue watching rows
│   ├── navigation/      # Navbar, Footer
│   └── player/          # WatchClient, PostPlaybackScreen
├── lib/
│   ├── i18n/            # Arabic & English translations
│   ├── servers/         # Stream adapters (Real-Debrid, VidSrc, etc.)
│   ├── supabase/        # Client & middleware helpers
│   └── tmdb/            # TMDB API client
├── store/               # Zustand stores (player, profile)
├── types/               # TypeScript interfaces
└── middleware.ts         # Auth & profile routing
```

---

## 🏗 Architecture Highlights

### Subtitle Lip-Sync Scoring
The scoring algorithm extracts release tags from both the video filename (e.g., `Movie.2024.1080p.WEB-DL.x264-NTb.mkv`) and subtitle filenames, then calculates a match score:

| Factor | Points | Rationale |
|---|---|---|
| Release group match (NTb, FLUX) | +20 | Same encoder = same frame timing |
| Release tag overlap (WEB-DL, x264) | up to +15 | Same source = same cut |
| Resolution match (1080p) | +5 | Same resolution = same encode |
| Community download count | up to +5 | Crowd validation |
| Machine translated | -10 | Almost always desynced |

### Stream Resolution Pipeline
1. Torrentio fetches available torrents for a TMDB ID
2. Real-Debrid checks its cache for instant availability
3. Cached torrents are unrestricted → direct download URL + HLS stream URL
4. Player prioritizes Direct MKV → falls back to HLS → falls back to VidSrc embed

---

## 📄 Legal

- [Privacy Policy](https://mashhad-web.vercel.app/privacy)
- [Terms of Service](https://mashhad-web.vercel.app/terms)
- [Contact](https://mashhad-web.vercel.app/contact)

Mashhad is an aggregation platform and interface only. It does not host any media content. All movies, series, and metadata are provided through third-party APIs and are owned by their respective rights holders.

---

## 📜 License

This project is licensed under the MIT License.
