# 🎬 Arabic Streaming Platform — Full Agent Build Prompt

> **Target Agent**: Antigravity (Google) AI Agent  
> **Scope**: Complete full-stack streaming platform, production-ready  
> **Language Direction**: Arabic-first (RTL), with English fallback  
CRUCIAL ; THE APP IS NAMED mashhad
AND FONT IS HERE FOR ARABIC C:\Users\hiba\Desktop\mashhad\font
---

## 🎯 Project Overview

Build a full-featured Arabic streaming platform for movies and TV shows — think Netflix quality but Arabic-first, with high-end animations, premium UI/UX, and a multi-server streaming engine. The platform is open to all users (no paywall), uses a single shared Real-Debrid account for premium streams, and combines free Arabic servers with TMDB metadata.

---

## 🏗️ Tech Stack — Non-Negotiable

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Streaming SSR, parallel routes, edge-ready, fastest UX |
| Language | **TypeScript (strict)** | Full type safety across all layers |
| Styling | **Tailwind CSS v4** | Utility-first, co-located styles |
| Animations | **Framer Motion v11** | Spring physics, layout animations, gesture support |
| Database | **Supabase** | Auth + PostgreSQL + Realtime + Row-Level Security |
| Server State | **TanStack Query v5** | Caching, background refetch, infinite scroll |
| Global State | **Zustand** | Lightweight, minimal re-renders |
| Video Player | **Vidstack v2** | HLS, DASH, Arabic subtitle support, accessible |
| Font | **Thmanyah** (already in `/fonts` folder in the codebase) | Only font used, Arabic-first |
| Deployment | **Vercel** | Edge Network, automatic ISR, image optimization |

---

## 📁 Project Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/
│   │   ├── layout.tsx                    ← Navbar + sidebar
│   │   ├── page.tsx                      ← Home / Discovery feed
│   │   ├── movies/page.tsx
│   │   ├── series/page.tsx
│   │   ├── search/page.tsx
│   │   ├── browse/[genre]/page.tsx
│   │   ├── movie/[id]/page.tsx           ← Movie detail + play
│   │   ├── series/[id]/page.tsx          ← Series detail
│   │   ├── watch/[id]/page.tsx           ← Full-screen player
│   │   ├── profiles/page.tsx             ← Profile switcher
│   │   ├── profiles/manage/page.tsx      ← Edit/create profiles
│   │   └── settings/
│   │       ├── page.tsx                  ← General settings
│   │       ├── account/page.tsx
│   │       └── playback/page.tsx
│   └── api/
│       ├── stream/resolve/route.ts       ← Server resolver (no proxy, just URL extraction)
│       ├── subtitles/search/route.ts
│       ├── subtitles/vote/route.ts
│       ├── introdb/[id]/route.ts
│       ├── realdebrid/unrestrict/route.ts
│       └── tmdb/[...path]/route.ts       ← Cached TMDB proxy
├── components/
│   ├── ui/                               ← Base design system components
│   ├── player/                           ← Vidstack player + overlays
│   ├── content/                          ← Cards, rows, hero sections
│   ├── profiles/                         ← Profile picker, avatar, kids lock
│   ├── navigation/                       ← Navbar, sidebar
│   └── subtitles/                        ← Subtitle selector + community ranking UI
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── tmdb/
│   │   ├── client.ts
│   │   └── types.ts
│   ├── servers/
│   │   ├── index.ts                      ← Server orchestrator + fallback chain
│   │   ├── fasselhd.ts
│   │   ├── vidbom.ts
│   │   ├── doodstream.ts
│   │   └── realdebrid.ts
│   ├── subtitles/
│   │   ├── opensubtitles.ts
│   │   └── sync.ts
│   ├── introdb/
│   │   └── client.ts
│   └── utils/
│       ├── rtl.ts
│       └── format.ts
├── hooks/
│   ├── useProfile.ts
│   ├── useWatchProgress.ts
│   ├── useStreamResolver.ts
│   └── useSubtitles.ts
├── store/
│   ├── profileStore.ts
│   └── playerStore.ts
├── types/
│   ├── content.ts
│   ├── profile.ts
│   ├── stream.ts
│   └── subtitle.ts
├── middleware.ts                          ← Auth guard + profile session
└── public/
    └── fonts/                            ← Thmanyah font files (already present)
```

---

## 🗄️ Supabase Database Schema

Run these SQL migrations in order. Enable Row-Level Security on all tables.

```sql
-- USERS are managed by Supabase Auth (auth.users)

-- Profiles (Netflix-style, multiple per account)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  avatar_color TEXT DEFAULT '#E50914',
  is_kids BOOLEAN DEFAULT FALSE,
  language TEXT DEFAULT 'ar',
  maturity_level TEXT DEFAULT 'all' CHECK (maturity_level IN ('kids', 'teen', 'all')),
  auto_play_next BOOLEAN DEFAULT TRUE,
  auto_skip_intro BOOLEAN DEFAULT TRUE,
  subtitle_language TEXT DEFAULT 'ar',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watch history and progress
CREATE TABLE watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_id TEXT NOT NULL,          -- TMDB ID
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'episode')),
  season_number INT,
  episode_number INT,
  progress_seconds INT DEFAULT 0,
  duration_seconds INT,
  completed BOOLEAN DEFAULT FALSE,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, content_id, content_type, season_number, episode_number)
);

-- Watchlist (saved content)
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'series')),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, content_id, content_type)
);

-- Content ratings (user ratings)
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_id TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, content_id)
);

-- Community subtitle rankings
CREATE TABLE subtitle_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_id TEXT NOT NULL,
  subtitle_file_id TEXT NOT NULL,    -- OpenSubtitles file ID
  vote INT CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, content_id, subtitle_file_id)
);

-- Cached subtitle metadata (aggregated scores)
CREATE TABLE subtitles_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id TEXT NOT NULL,
  language TEXT NOT NULL,
  subtitle_file_id TEXT NOT NULL UNIQUE,
  file_name TEXT,
  download_url TEXT,
  score INT DEFAULT 0,
  download_count INT DEFAULT 0,
  sync_offset_ms INT DEFAULT 0,
  community_sync_offset_ms INT DEFAULT 0,
  uploader TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync offset votes from community
CREATE TABLE subtitle_sync_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subtitle_file_id TEXT NOT NULL,
  offset_ms INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, subtitle_file_id)
);

-- Preferred servers per content (community rankings)
CREATE TABLE server_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_id TEXT NOT NULL,
  server_name TEXT NOT NULL,
  vote INT CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, content_id, server_name)
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitle_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitle_sync_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_votes ENABLE ROW LEVEL SECURITY;

-- Profiles: users see only their own profiles
CREATE POLICY "Own profiles" ON profiles FOR ALL USING (auth.uid() = user_id);

-- Watch history: users see only their profiles' history
CREATE POLICY "Own history" ON watch_history FOR ALL
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Watchlist: same pattern
CREATE POLICY "Own watchlist" ON watchlist FOR ALL
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Ratings: same pattern
CREATE POLICY "Own ratings" ON ratings FOR ALL
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Subtitle votes: own writes, public reads for aggregate scores
CREATE POLICY "Own subtitle votes write" ON subtitle_votes FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Public subtitle vote read" ON subtitle_votes FOR SELECT USING (true);

-- Subtitle sync votes: same
CREATE POLICY "Own sync votes write" ON subtitle_sync_votes FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Public sync vote read" ON subtitle_sync_votes FOR SELECT USING (true);

-- Subtitles cache: public read
CREATE POLICY "Public subtitles read" ON subtitles_cache FOR SELECT USING (true);
ALTER TABLE subtitles_cache ENABLE ROW LEVEL SECURITY;
```

---

## 🔐 Authentication System

**Provider**: Supabase Auth with email + password  
**No social login** — clean, simple sign-up flow.

### Implementation

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Refresh session
  // 2. Redirect unauthenticated users to /login
  // 3. Redirect users with no profiles to /profiles/manage
  // 4. Protect /watch/* routes from kids profiles accessing adult content
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts).*)'],
}
```

### Profile Session
After login, users land on the **Profile Picker screen** (exactly like Netflix). The chosen profile ID is stored in:
- A secure HTTP-only cookie (`active_profile_id`)
- Zustand store for client-side reactivity

---

## 👤 Profiles System

This is a flagship feature — build it with the same attention Netflix gives it.

### Profile Picker Screen (`/profiles`)
- **Full-screen dark page**, centered grid of profile cards
- Each card: large colored avatar circle + name underneath
- **Hover animation**: scale up slightly, glow ring appears, name reveals subtitle
- "Add Profile" card with a `+` icon — max 5 profiles per account
- Kids profiles show a ⭐ badge overlay on their avatar
- **Smooth page transition** when selecting a profile (Framer Motion `AnimatePresence`)
- Kids profiles show a PIN lock icon if Kids Lock is enabled — prompt for PIN before entering

### Profile Card Component
```typescript
// components/profiles/ProfileCard.tsx
// Props: profile, onSelect, isManageMode
// When isManageMode: show edit pencil overlay, delete button
// When !isManageMode: click to activate profile (with PIN check if kids locked)
```

### Profile Data
```typescript
interface Profile {
  id: string
  name: string                    // e.g. "علي", "سارة"
  avatarColor: string             // Hex color for the avatar circle
  avatarUrl?: string              // Optional custom avatar image
  isKids: boolean                 // Toggle kids mode
  kidsPin?: string                // 4-digit PIN hash (bcrypt) for kids lock
  maturityLevel: 'kids' | 'teen' | 'all'
  language: 'ar' | 'en'
  autoPlayNext: boolean
  autoSkipIntro: boolean
  subtitleLanguage: string
}
```

### Kids Mode Rules
- When `isKids: true` OR `maturityLevel: 'kids'`:
  - Filter all content by TMDB's certification — show only G/PG content
  - Hide all adult categories from navigation
  - Disable search for non-kids content
  - Show a kid-friendly UI variant (brighter colors, larger cards, simpler nav)
  - Cannot access settings that change maturity level without PIN
  - Browse shows a curated "أطفال" (Kids) section with animated characters

---

## 🎨 Design System — High-End Arabic UI

### Philosophy
**Arabic Apple.** Think Apple's website clarity + Netflix's cinematic dark theme + Arabic typography and RTL. Every animation must feel intentional, every transition must be smooth. No janky renders. No layout shifts.

### Base Rules
- **Direction**: `dir="rtl"` on `<html>`. All flex/grid layouts flow right-to-left.
- **Font**: Thmanyah exclusively. Load from the `/fonts` folder with `next/font/local`. Define these weights: 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold).
- **Color Palette**:
  ```css
  --bg-primary: #0A0A0A        /* Near-black base */
  --bg-secondary: #141414      /* Card backgrounds */
  --bg-tertiary: #1F1F1F       /* Elevated surfaces */
  --bg-hover: #2A2A2A          /* Hover states */
  --accent-primary: #E50914    /* Netflix-red — used sparingly */
  --accent-gold: #F5A623       /* Arabic gold accent */
  --accent-blue: #0071E3       /* Apple-blue for CTAs */
  --text-primary: #FFFFFF
  --text-secondary: #B3B3B3
  --text-muted: #666666
  --border-subtle: rgba(255,255,255,0.08)
  --border-visible: rgba(255,255,255,0.15)
  ```
- **Border Radius**: 12px for cards, 8px for buttons, 6px for badges
- **Shadows**: Subtle — `0 4px 24px rgba(0,0,0,0.5)` for floating elements

### Typography Scale
```css
--text-display: clamp(2.5rem, 5vw, 5rem)    /* Hero titles */
--text-h1: clamp(1.75rem, 3vw, 2.5rem)
--text-h2: clamp(1.25rem, 2.5vw, 1.75rem)
--text-h3: 1.25rem
--text-body: 1rem
--text-small: 0.875rem
--text-xs: 0.75rem

/* Arabic-specific adjustments */
.font-display { letter-spacing: -0.02em; }
[lang="ar"] { line-height: 1.8; }           /* Arabic needs more line height */
```

### Scroll Behavior
```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: 80px;   /* Navbar height */
}

/* Custom scrollbar — dark, minimal */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
```

### Animation Tokens (use with Framer Motion)
```typescript
// lib/animations.ts
export const spring = { type: 'spring', stiffness: 400, damping: 30 }
export const springGentle = { type: 'spring', stiffness: 200, damping: 25 }
export const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
export const slideUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } }
export const scaleIn = { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } }
export const stagger = (i: number) => ({ transition: { delay: i * 0.05 } })
```

---

## 🧭 Navigation

### Top Navbar
- Fixed, transparent at top → frosted glass (`backdrop-blur-xl`) on scroll
- Logo on the right (RTL: start)
- Navigation links: الرئيسية · أفلام · مسلسلات · استعراض · بحث
- Profile avatar on the left (RTL: end) with dropdown: تبديل الملف · الإعدادات · تسجيل الخروج
- Search icon expands to full inline search bar with Framer Motion
- Invisible until user scrolls — hero sections should feel immersive

### Sidebar (on Browse/Discover pages)
- Collapsible, icon-only by default
- Expands on hover with smooth width animation
- Genre links with Arabic labels

---

## 🏠 Home Page

### Hero Section
- **Full-screen cinematic hero** (100vh minus navbar)
- Background: TMDB backdrop image with gradient overlay (bottom-to-top fade)
- Subtle parallax effect on scroll
- Content: Arabic title (large, Thmanyah Display) + description + rating + genre badges
- CTA Buttons: 
  - `▶ مشاهدة الآن` (primary — white filled)
  - `＋ إضافة للقائمة` (secondary — ghost border)
- Auto-cycles through 5-6 featured titles every 8 seconds with fade transition
- Progress dots indicator at the bottom

### Content Rows
Each row follows this pattern:
```typescript
interface ContentRow {
  title: string           // Arabic: "الأكثر مشاهدة" / "مضاف حديثاً" / etc.
  items: ContentCard[]
  variant: 'standard' | 'large' | 'numbered' | 'continue'  // numbered = Top 10
}
```

**Row scroll behavior**: Custom horizontal scroll with momentum. Show/hide chevron arrows on hover. On mobile: native scroll, no arrows.

**Suggested rows for home (in order)**:
1. استمر في المشاهدة (Continue Watching) — shows progress bar on cards
2. أفضل 10 اليوم (Top 10 Today) — numbered overlay on cards
3. إضافات جديدة (New Additions)
4. أفلام عربية (Arabic Movies)
5. مسلسلات رمضانية (Ramadan Series) — if applicable
6. الأكثر تقييماً (Highest Rated)
7. أفلام الأكشن (Action Films)
8. مسلسلات كوميدية (Comedy Series)

### Content Card Component
```typescript
// Standard card (portrait, 2:3 ratio)
// Large card (landscape, 16:9 ratio — for continue watching row)
// Numbered card (portrait with large number overlay)
```

**Card hover behavior (this is critical)**:
1. Slight scale up (1.05)
2. Card expands into a "preview card" with Framer Motion layout animation
3. Preview card shows: backdrop, title, year + runtime, genre tags, play button, add-to-list button, rating stars
4. Preview card position intelligently adjusts so it never goes off-screen
5. 300ms delay before triggering expansion (prevents accidental triggers)
6. Smooth collapse when mouse leaves

---

## 🎬 Content Detail Page (`/movie/[id]` and `/series/[id]`)

### Layout
- **Hero backdrop** at the top (blurred background image)
- Floating card with poster, title, metadata
- Arabic title + transliterated title
- Rating (TMDB + community stars)
- Genre badges, year, runtime/seasons count
- Synopsis in Arabic (from TMDB Arabic metadata if available, else English)
- CTA: مشاهدة الآن · إضافة للقائمة · تقييم

### For Series
- **Season/Episode selector** with smooth accordion animation
- Episode list with: thumbnail, title (Arabic), episode number, duration, air date, synopsis
- Episode progress indicators for watch history
- "تابع المشاهدة" button that takes user to the correct episode + timestamp

### Related Content
- Horizontal row: "قد يعجبك أيضاً" using TMDB's recommendations endpoint
- "من نفس الممثلين" cast row

---

## ▶️ Video Player (`/watch/[id]`)

### Player Setup
Use **Vidstack v2** (`@vidstack/react`). It supports HLS natively, has excellent Arabic subtitle rendering, and is fully accessible.

```typescript
// components/player/StreamPlayer.tsx
import { MediaPlayer, MediaProvider, Track } from '@vidstack/react'
import '@vidstack/react/player/styles/default/theme.css'
```

### Player Features — All Required
1. **Multi-server fallback** (explained in Streaming section)
2. **HLS streaming** via `hls.js` under the hood (Vidstack handles this)
3. **Arabic subtitles** with RTL text rendering, proper positioning
4. **Subtitle offset control** — user can adjust ±10 seconds in 100ms steps
5. **Skip Intro/Outro** button (from IntroDb — see below)
6. **Auto-play next episode** with 10-second countdown + cancel button
7. **Picture-in-Picture** support
8. **Keyboard shortcuts**: Space (play/pause), Arrow keys (seek ±10s), F (fullscreen), S (subtitles), M (mute)
9. **Quality selector**: Auto / 1080p / 720p / 480p (from HLS manifest)
10. **Speed control**: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
11. **Volume memory** (persisted to localStorage)
12. **Playback position saving**: save to Supabase every 5 seconds during playback
13. **Server selector**: show available servers, community vote scores, allow manual switching

### Player UI Overlay
- Controls auto-hide after 3 seconds of inactivity
- Smooth fade in/out with Framer Motion
- Bottom bar: progress bar (clickable + draggable with preview thumbnail), time, volume, captions, settings, fullscreen
- Top bar: back button, content title + episode info
- Middle: play/pause + seek buttons only shown on mobile

### Player State Management (Zustand)
```typescript
// store/playerStore.ts
interface PlayerState {
  contentId: string
  currentServer: string
  availableServers: Server[]
  currentSubtitle: Subtitle | null
  subtitleOffset: number          // in milliseconds
  isPlaying: boolean
  volume: number
  playbackRate: number
  quality: string
}
```

---

## 📡 Streaming Engine — The Core

This is the most critical part. **No video proxying** — the server only resolves stream URLs, the client fetches the actual video directly from the source.

### Architecture
```
User clicks Play
       ↓
/api/stream/resolve (Next.js API Route — server-side, edge runtime)
       ↓
Parallel: Try all configured servers simultaneously
       ↓
Return ranked list of stream URLs sorted by:
1. Community upvotes
2. Previous user success (stored in Supabase)
3. Server speed/availability
       ↓
Client uses first URL with Vidstack → HLS.js
       ↓
If URL fails → automatically tries next in list (client-side fallback)
```

### Server Adapters

Create a unified interface:
```typescript
// lib/servers/types.ts
interface StreamResult {
  url: string              // Direct stream URL (m3u8 or mp4)
  quality?: string         // '1080p', '720p', etc.
  server: string           // 'fasselhd' | 'vidbom' | 'realdebrid' | etc.
  type: 'hls' | 'mp4'
  isRealDebrid: boolean
}

interface ServerAdapter {
  name: string
  resolve(contentId: string, tmdbId: string, type: 'movie' | 'episode', season?: number, episode?: number): Promise<StreamResult[]>
}
```

### FasselHD Adapter
```typescript
// lib/servers/fasselhd.ts
// FasselHD uses embed URLs. Strategy:
// 1. Search FasselHD for content by TMDB ID or title
// 2. Extract the embed player URL
// 3. Server-side fetch the embed page, extract m3u8 URL from page source
// 4. Return the direct m3u8 URL (client streams directly from FasselHD's CDN)
// NO video proxying — we only extract the URL server-side

export const fasselhdAdapter: ServerAdapter = {
  name: 'fasselhd',
  async resolve(contentId, tmdbId, type, season?, episode?) {
    // 1. Hit FasselHD's search endpoint or direct TMDB ID mapping
    // 2. Get embed URL
    // 3. Server-fetch embed HTML, regex-extract m3u8
    // 4. Return StreamResult
  }
}
```

### Real-Debrid Adapter (Shared Account)
```typescript
// lib/servers/realdebrid.ts
// Uses the RD_API_TOKEN env variable — NEVER expose client-side
// RD Flow:
// 1. Search for content links via torrent sites (or use known magnet)
// 2. POST to /api/torrents/addMagnet
// 3. GET /api/torrents/info/{id} → wait for "downloaded" status
// 4. POST to /api/unrestrict/link with the file link
// 5. Returns direct download/stream URL (CDN-hosted, blazing fast)

// For already-cached content, step 2-3 are instant
// All RD calls happen server-side only

export const realDebridAdapter: ServerAdapter = {
  name: 'realdebrid',
  async resolve(contentId, tmdbId, type, season?, episode?) {
    const token = process.env.RD_API_TOKEN  // Server-only env var
    // ... implementation
  }
}
```

### Additional Free Arabic Servers
Add adapters for at minimum these servers (same pattern as FasselHD):
- **Vidbom** (`vidbom.com`) — embed extraction
- **Doodstream** (`dood.la`) — embed extraction  
- **StreamWish** — embed extraction
- **FileMoon** — embed extraction

### Server Orchestrator
```typescript
// lib/servers/index.ts
const ADAPTERS: ServerAdapter[] = [
  fasselhdAdapter,
  vidbomAdapter,
  doodstreamAdapter,
  streamwishAdapter,
  realDebridAdapter,   // Usually best quality — prioritize if available
]

export async function resolveStreams(
  tmdbId: string,
  type: 'movie' | 'episode',
  season?: number,
  episode?: number
): Promise<StreamResult[]> {
  // Run all adapters in parallel with a 5-second timeout per adapter
  const results = await Promise.allSettled(
    ADAPTERS.map(adapter =>
      Promise.race([
        adapter.resolve(tmdbId, tmdbId, type, season, episode),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ])
    )
  )
  
  // Flatten, filter successful, sort by community votes from Supabase
  // Return sorted array
}
```

### API Route
```typescript
// app/api/stream/resolve/route.ts
// Edge runtime for speed
export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type')   // 'movie' | 'episode'
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')
  
  // Validate user session (must be logged in)
  // Resolve streams
  // Return sorted list
  // Cache aggressively (10 minutes) — content doesn't change
}
```

---

## 📝 Arabic Subtitles System

### Source: OpenSubtitles.com API
Register at https://www.opensubtitles.com/en/api for API key.

```typescript
// lib/subtitles/opensubtitles.ts

const OS_API_KEY = process.env.OPENSUBTITLES_API_KEY  // Server-only

export async function searchSubtitles(
  tmdbId: string,
  type: 'movie' | 'episode',
  season?: number,
  episode?: number
): Promise<Subtitle[]> {
  const params = new URLSearchParams({
    tmdb_id: tmdbId,
    languages: 'ar',   // Arabic first
    type: type === 'movie' ? 'movie' : 'episode',
    ...(season && { season_number: season.toString() }),
    ...(episode && { episode_number: episode.toString() }),
  })
  
  const res = await fetch(`https://api.opensubtitles.com/api/v1/subtitles?${params}`, {
    headers: {
      'Api-Key': OS_API_KEY,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 3600 }  // Cache for 1 hour
  })
  
  const data = await res.json()
  return data.data.map(mapToSubtitle)
}

export async function downloadSubtitle(fileId: string): Promise<string> {
  // Returns the download URL for the .srt/.vtt file
  // Convert .srt to .vtt if needed (for WebVTT support)
}
```

### Community Ranking
Subtitles are ranked by:
1. OpenSubtitles download count
2. Community upvotes from `subtitle_votes` table
3. Sync accuracy votes from `subtitle_sync_votes` table

```typescript
// app/api/subtitles/search/route.ts
// 1. Fetch from OpenSubtitles
// 2. Join with community votes from Supabase
// 3. Calculate composite score: (downloads * 0.3) + (votes * 0.7)
// 4. Return sorted by score
// 5. Cache result for 30 minutes
```

### Subtitle Sync Correction
- In the player, show a sync offset slider: `[-10s ←——→ +10s]`
- The offset is applied in real-time to the WebVTT track
- When user adjusts offset, a "تقديم هذا التصحيح للمجتمع" button appears
- Submitting saves to `subtitle_sync_votes` table
- The community median offset is computed and shown as "recommended offset"

### SRT to WebVTT Conversion
```typescript
// lib/subtitles/sync.ts
export function srtToVtt(srt: string, offsetMs = 0): string {
  // Convert SRT format to WebVTT
  // Apply timing offset
  // Ensure RTL text direction in cue settings
  // Return as data: URL for use in <track> element
}
```

---

## ⏭️ Skip Intro System (IntroDb)

**API**: https://introdb.app/ — provides skip timestamps for intros/outros.

```typescript
// lib/introdb/client.ts
interface IntroDbResult {
  intro?: { start: number; end: number }      // seconds
  outro?: { start: number; end: number }
  recap?: { start: number; end: number }
}

export async function getSkipTimestamps(
  seriesId: string,    // TMDB series ID
  season: number,
  episode: number
): Promise<IntroDbResult | null> {
  const res = await fetch(
    `https://api.introdb.app/v1/timestamps?tmdb_id=${seriesId}&season=${season}&episode=${episode}`,
    { next: { revalidate: 86400 } }  // Cache for 24 hours
  )
  if (!res.ok) return null
  return res.json()
}
```

### Skip Button UI
```typescript
// In the player overlay:
// When currentTime enters intro.start → intro.end window:
// Show animated "تخطي المقدمة" button (bottom-right)
// Button style: frosted glass, Arabic text, right-pointing arrow
// Auto-dismiss after 5 seconds if not clicked
// If profile.autoSkipIntro === true: skip automatically, show "تم تخطي المقدمة" toast
```

---

## 🔍 Search Page

- **Full-screen search** with instant results
- Search bar auto-focused, Arabic placeholder: "ابحث عن أفلام ومسلسلات..."
- Results appear as user types (300ms debounce)
- Search hits TMDB `/search/multi` endpoint
- Filter tabs: الكل · أفلام · مسلسلات · ممثلون
- Empty state: show trending searches + genre pills
- Recent searches (stored in localStorage) with clear button
- Results grid with card hover previews

---

## ⚙️ Settings Pages

### `/settings` (General)
- Account information
- Change email
- Change password
- Delete account

### `/settings/playback`
- Default subtitle language
- Default playback quality
- Auto-play next episode toggle
- Auto-skip intro toggle
- Preferred server (Auto / manual)

### `/settings/profiles` (redirects to `/profiles/manage`)

### Profile Management (`/profiles/manage`)
- List all profiles with edit button
- Create new profile form
- Per-profile settings:
  - Name + avatar color picker (10 preset colors)
  - Kids mode toggle
  - Kids PIN setup (4-digit)
  - Maturity level (for non-kids)
  - Language preference

---

## 🌐 TMDB Integration

```typescript
// lib/tmdb/client.ts
const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = process.env.TMDB_API_KEY
const TMDB_LANG_AR = 'ar-SA'

// Always request Arabic language first, fall back to English
// Use Next.js `fetch` with `next: { revalidate }` for ISR caching

export const tmdb = {
  trending: (type: 'movie' | 'tv' | 'all', window: 'day' | 'week') =>
    fetch(`${TMDB_BASE}/trending/${type}/${window}?language=${TMDB_LANG_AR}&api_key=${TMDB_KEY}`,
      { next: { revalidate: 3600 } }),

  movie: (id: string) =>
    fetch(`${TMDB_BASE}/movie/${id}?language=${TMDB_LANG_AR}&append_to_response=credits,videos,recommendations&api_key=${TMDB_KEY}`,
      { next: { revalidate: 3600 } }),

  series: (id: string) =>
    fetch(`${TMDB_BASE}/tv/${id}?language=${TMDB_LANG_AR}&append_to_response=credits,videos,recommendations&api_key=${TMDB_KEY}`,
      { next: { revalidate: 3600 } }),

  season: (seriesId: string, season: number) =>
    fetch(`${TMDB_BASE}/tv/${seriesId}/season/${season}?language=${TMDB_LANG_AR}&api_key=${TMDB_KEY}`,
      { next: { revalidate: 3600 } }),

  search: (query: string) =>
    fetch(`${TMDB_BASE}/search/multi?query=${encodeURIComponent(query)}&language=${TMDB_LANG_AR}&api_key=${TMDB_KEY}`,
      { next: { revalidate: 300 } }),

  discover: (type: 'movie' | 'tv', filters: Record<string, string>) =>
    fetch(`${TMDB_BASE}/discover/${type}?language=${TMDB_LANG_AR}&${new URLSearchParams(filters)}&api_key=${TMDB_KEY}`,
      { next: { revalidate: 3600 } }),
}
```

---

## 📦 Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # Server-only, never expose

# TMDB
TMDB_API_KEY=                 # Server-only

# Real-Debrid
RD_API_TOKEN=                 # Server-only — your personal RD token

# OpenSubtitles
OPENSUBTITLES_API_KEY=        # Server-only

# IntroDb (if API key required)
INTRODB_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## 🚀 Performance Requirements — Enforce All

These are non-negotiable. The app must feel instant.

### Rendering Strategy
- **Home page**: SSR with ISR (revalidate every hour). Content rows stream in progressively using React Suspense + `<Suspense fallback={<RowSkeleton />}>`
- **Detail pages**: SSR — fully rendered server-side, use `generateStaticParams` for top 200 titles
- **Search**: Client-side with TanStack Query
- **Player**: Client-only (no SSR for the player component — use `dynamic(() => import('./StreamPlayer'), { ssr: false })`)

### Image Optimization
- Use `next/image` for ALL images
- TMDB poster/backdrop URLs: `https://image.tmdb.org/t/p/w500/` (poster), `https://image.tmdb.org/t/p/w1280/` (backdrop)
- `priority` prop on hero + above-fold images
- Lazy loading for card rows below the fold
- `sizes` attribute properly set for responsive images

### Code Splitting
- Each page route is automatically split by Next.js
- Player and its dependencies are dynamically imported (they're large)
- Framer Motion: import only what you use

### Scroll Performance
- Content rows use `translate3d` for GPU-accelerated scrolling
- Card hover previews use `position: absolute` + `z-index` (not layout-affecting)
- Virtual scrolling for episode lists longer than 30 episodes (use `@tanstack/react-virtual`)

### API Caching
- TMDB responses: 1 hour ISR cache
- Subtitle search: 30 minutes
- Stream URLs: 10 minutes (they expire)
- IntroDb timestamps: 24 hours

### No Layout Shift
- Define explicit `width`/`height` on all `<Image>` components
- Skeleton loaders match exact dimensions of content
- Font preloaded via `next/font/local` — no FOUT

---

## 🌍 Internationalization

- **All UI text** must be in Arabic by default
- Create a `lib/i18n/ar.ts` translations file with all string constants
- Numbers: display in Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) using `toLocaleString('ar-SA')`
- Dates: Arabic calendar awareness using `Intl.DateTimeFormat('ar-SA')`
- Time display in player: use Arabic numerals
- Error messages: Arabic only

```typescript
// lib/i18n/ar.ts
export const ar = {
  nav: {
    home: 'الرئيسية',
    movies: 'أفلام',
    series: 'مسلسلات',
    browse: 'استعراض',
    search: 'بحث',
  },
  player: {
    skipIntro: 'تخطي المقدمة',
    skipOutro: 'تخطي الخاتمة',
    nextEpisode: 'الحلقة التالية',
    subtitles: 'الترجمة',
    quality: 'الجودة',
    speed: 'السرعة',
    servers: 'الخوادم',
  },
  profiles: {
    title: 'من يشاهد؟',
    addProfile: 'إضافة ملف شخصي',
    manageProfiles: 'إدارة الملفات الشخصية',
    kidsProfile: 'ملف الأطفال',
    enterPin: 'أدخل الرقم السري',
  },
  // ... all other strings
}
```

---

## 📋 Page-by-Page Checklist

Build in this order. Each must be complete before moving to the next.

**Phase 1 — Foundation**
- [ ] Next.js project setup with all dependencies
- [ ] Thmanyah font configured via `next/font/local`
- [ ] Supabase client (server + client variants)
- [ ] Global layout with RTL, dark theme, CSS variables
- [ ] Middleware for auth protection
- [ ] Base UI components: Button, Card, Badge, Skeleton, Modal, Toast

**Phase 2 — Auth + Profiles**
- [ ] `/login` page — email/password, Arabic UI
- [ ] `/register` page — email/password, Arabic UI
- [ ] `/profiles` page — profile picker (full-screen)
- [ ] `/profiles/manage` page — create/edit/delete profiles
- [ ] Profile session cookie management
- [ ] Kids mode filtering logic

**Phase 3 — Content**
- [ ] TMDB client with Arabic language support
- [ ] `/` home page — hero + 8 content rows
- [ ] Content Card component with hover preview
- [ ] `/movie/[id]` detail page
- [ ] `/series/[id]` detail page with season/episode list
- [ ] `/movies` and `/series` browse pages
- [ ] `/search` page
- [ ] `/browse/[genre]` page

**Phase 4 — Streaming Core**
- [ ] Server adapters: FasselHD, Vidbom, Doodstream, StreamWish, FileMoon
- [ ] Real-Debrid adapter
- [ ] `/api/stream/resolve` route
- [ ] Vidstack player integration
- [ ] Player overlay UI (controls, skip buttons, server selector)
- [ ] `/watch/[id]` page

**Phase 5 — Subtitles + IntroDb**
- [ ] OpenSubtitles integration
- [ ] `/api/subtitles/search` route
- [ ] Subtitle community ranking UI
- [ ] SRT → WebVTT conversion + offset control
- [ ] Community sync vote submission
- [ ] IntroDb integration + skip button

**Phase 6 — User Features**
- [ ] Watch history + progress tracking
- [ ] Continue watching row (home page)
- [ ] Watchlist (add/remove)
- [ ] Content rating
- [ ] Server community votes

**Phase 7 — Settings + Polish**
- [ ] `/settings` page
- [ ] `/settings/playback` page
- [ ] Auto-play next episode
- [ ] All animations and transitions
- [ ] Loading skeletons for every page
- [ ] Error states and empty states
- [ ] Mobile responsive layout

---

## 🧪 Quality Gates

Before shipping any component, verify:
- [ ] Works in RTL (Arabic) direction — no broken layouts
- [ ] Skeleton loader shows while data loads — no blank flash
- [ ] Framer Motion animations don't cause janky repaints
- [ ] All API calls have error handling with user-friendly Arabic error messages
- [ ] No `console.error` or unhandled promise rejections
- [ ] Player remembers position across page navigations
- [ ] Kids profiles cannot see adult content in any code path
- [ ] Server-only env vars are never imported in client components
- [ ] All images use `next/image` with explicit dimensions

---

## 🔧 Key Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0",
    "@vidstack/react": "^1.12.0",
    "framer-motion": "^11.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-virtual": "^3.0.0",
    "zustand": "^4.5.0",
    "hls.js": "^1.5.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0"
  }
}
```

---

## 🚨 Important Notes for the Agent

1. **Never proxy video streams** — only resolve URLs server-side and return them to the client. The client's browser fetches video directly from the source CDN.

2. **RD_API_TOKEN must only appear in server-side code** (`route.ts` files, Server Components). Never in `'use client'` components.

3. **The Thmanyah font folder already exists** in the codebase. Use `next/font/local` to configure it. Do not install any other font package.

4. **All Supabase queries for user data must respect RLS** — never use `service_role` key on the client. Use it only in trusted API routes.

5. **Kids profiles must be enforced at multiple levels**: middleware (route level) + component level + API level. Don't rely on a single check.

6. **HLS.js CORS**: Some servers may not have CORS headers for direct fetch. If an m3u8 URL returns CORS errors in the browser, mark that server as unavailable and fall back to the next. Do not attempt to proxy the stream.

7. **Arabic text in WebVTT**: Ensure subtitle cues have `position:10% align:right` for proper Arabic RTL rendering. Standard `align:center` often misrenders Arabic.

8. **Framer Motion `layoutId`**: Use unique `layoutId` values for card-to-detail-page hero transition. This creates the "expand from card" cinematic effect.

9. **Supabase Realtime**: Use Supabase Realtime subscriptions for the continue-watching row to update live without page refresh.

10. **Mobile first for the player**: The player must be fully functional on mobile (touch-friendly controls, swipe to seek, tap to show/hide controls).