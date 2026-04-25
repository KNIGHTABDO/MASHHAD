# Mashhad - منصة المحتوى العربي 🎬

Mashhad is a premium, high-performance streaming platform built for the Arabic-speaking world. Designed with a sleek, cinematic UI, Mashhad provides seamless access to movies and TV series, featuring robust real-debrid streaming integrations, advanced subtitle rendering, and full English/Arabic localization.

![Mashhad Platform](public/favicon.ico) <!-- Placeholder for actual hero image -->

## ✨ Key Features

- **Cinematic UI/UX:** A stunning, modern dark-mode interface inspired by industry leaders, optimized for both desktop and mobile devices.
- **Bilingual Support (AR/EN):** Deep, pixel-perfect localization. Toggle between Arabic and English instantly without page reloads.
- **Advanced Streaming Engine:** Intelligently resolves and auto-selects the highest quality streams (HLS & Direct MKV) using Real-Debrid.
- **Smart Subtitle System:** 
  - Dual-engine fallback architecture (OpenSubtitles REST API + Stremio Legacy v3 database).
  - Robust encoding detection and conversion (UTF-8 / Windows-1256 fallback) ensuring Arabic characters never render as garbled text.
- **Intro & Outro Skipping:** Integrated with the IntroDB API to automatically detect intro and outro segments and provide "Skip Intro" & "Next Episode" functionality.
- **Continue Watching:** A reliable local & Supabase-synced progress tracker that accurately resumes content precisely where you left off.
- **Performance Optimized:** Built on Next.js 15 App Router, leveraging Server Components, dynamic imports, and aggressive caching for near-instant load times.

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Styling:** Tailwind CSS, Framer Motion (for fluid animations)
- **Database / Auth:** Supabase (PostgreSQL)
- **Data Fetching:** TanStack React Query, standard Fetch API
- **APIs Integrated:** 
  - TMDB (Metadata & Discovery)
  - Real-Debrid (Stream Resolution)
  - OpenSubtitles & Stremio Addons (Subtitles)
  - IntroDB (Video Segments)
- **Video Player:** Custom HTML5 Video Player with HLS.js fallback.

## 🚀 Getting Started

### Prerequisites

You need the following installed on your machine:
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/MASHHAD.git
   cd MASHHAD
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory and add your API keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   TMDB_API_KEY=your_tmdb_api_key
   REALDEBRID_API_TOKEN=your_realdebrid_token
   OPENSUBTITLES_API_KEY=your_opensubtitles_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

- `/app`: Next.js App Router pages and API routes.
  - `/api`: Backend endpoints for TMDB proxying, subtitle fetching, segment resolving, etc.
  - `/(main)`: Primary UI layouts and pages (Home, Movie, Series, Search).
- `/components`: Reusable UI components.
  - `/content`: Movie cards, grids, episode lists, and continue watching rows.
  - `/player`: Custom robust video player (`WatchClient.tsx`).
- `/lib`: Utility functions, configuration, and API clients.
  - `/i18n`: Custom, lightweight localization context.
  - `/supabase`: Supabase client initialization.

## 💡 Architecture Highlights

### The Subtitle Engine
Mashhad employs a highly resilient subtitle engine. Given the notorious unreliability of Arabic subtitle encodings, the platform dynamically parses incoming buffers, detects `UTF-8` vs `Windows-1256` encoding anomalies, and safely converts them to standard WebVTT on the fly. It aggregates community-rated tracks from both modern and legacy APIs to guarantee the best viewing experience.

### Real-Debrid Stream Resolution
The backend acts as a smart proxy to fetch cached torrent links from Real-Debrid, automatically prioritizing `Direct` streams for native playback while providing a seamless `HLS` fallback mechanism for unsupported browsers like Safari or un-extended Chrome.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check the [issues page](https://github.com/yourusername/MASHHAD/issues).

## 📄 License

This project is licensed under the MIT License.
