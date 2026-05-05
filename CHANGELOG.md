# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [0.2.0](https://github.com/KNIGHTABDO/MASHHAD/compare/v0.1.0...v0.2.0) (2026-05-05)


### Features

* add admin endpoint to manually assign pro status and implement upgrade page UI ([2362eeb](https://github.com/KNIGHTABDO/MASHHAD/commit/2362eeba0b41ee51e037a00e25c29bfc8d9c8cad))
* add admin-only route to manually grant lifetime Pro status via user metadata ([6140ba0](https://github.com/KNIGHTABDO/MASHHAD/commit/6140ba0a5bfd80326c96ac307bf7c147c85d4715))
* Add Anime Dedicated Section, Offline Downloads, and Algorithmic Recs ([8dffbd9](https://github.com/KNIGHTABDO/MASHHAD/commit/8dffbd96af9ed1158238964cec4375e31344c98d))
* add API route to proxy and rewrite m3u8 stream URLs through OCI bridge ([38abfa5](https://github.com/KNIGHTABDO/MASHHAD/commit/38abfa56f6a2f01876cb96de51363de877aba97b))
* add API route to proxy and sanitize OCI streaming content via HTTPS ([f36622d](https://github.com/KNIGHTABDO/MASHHAD/commit/f36622d58fddf2c0c961b3875ad1addda878931f))
* add API route to proxy requests through OCI service ([0e3d3c6](https://github.com/KNIGHTABDO/MASHHAD/commit/0e3d3c67229ee22fa8fdff9e590850eeec6cf86f))
* add EgyDead server adapter with proxied fetch support ([4ebe7ae](https://github.com/KNIGHTABDO/MASHHAD/commit/4ebe7ae17d9e9dda2b661a11119222933aa302a1))
* add EgyDead server adapter with proxied fetch support and automated stream extraction ([c3794b2](https://github.com/KNIGHTABDO/MASHHAD/commit/c3794b2e69c03a72f4b85164fc5dd06741046b89))
* add egydead server adapter with support for proxied search and stream extraction ([3e41e3b](https://github.com/KNIGHTABDO/MASHHAD/commit/3e41e3bada99765e34d752ba9410854f9f25403a))
* add legal pages (Privacy, Terms, Contact), footer component, and complete README rewrite ([021c2fe](https://github.com/KNIGHTABDO/MASHHAD/commit/021c2fe166244f0a3869d4866220bf32aec4fc57))
* add lifetime upgrade promotion modal and corresponding upgrade page ([0ce66e8](https://github.com/KNIGHTABDO/MASHHAD/commit/0ce66e87e469cde4837149bcbfc9cef5390f79fa))
* add OCI proxy bridge API route and update CSP headers to permit OCI resource access ([546f497](https://github.com/KNIGHTABDO/MASHHAD/commit/546f497b91d3c547e3efa59f82f085421a364e85))
* add PersonalRows component for continue watching, watchlist, and recommendations, and initialize egydead server module ([57001d4](https://github.com/KNIGHTABDO/MASHHAD/commit/57001d43208b1bf7bba8e18cc7d7b33956e4224a))
* add Stripe webhook and heartbeat monitoring for usage-based pro upgrades ([ee1389f](https://github.com/KNIGHTABDO/MASHHAD/commit/ee1389fafc3e8c2f53996dd70e579358a8ad85f0))
* add Stripe webhook handler for subscription upgrades and usage heartbeat API for session tracking ([506b946](https://github.com/KNIGHTABDO/MASHHAD/commit/506b946463a904be03e334457bd5a913e35e3177))
* add subtitle search and alignment voting APIs to optimize streaming sync quality ([3d435bc](https://github.com/KNIGHTABDO/MASHHAD/commit/3d435bcfa0da94f7e7a20e40fb2be52ab0e09703))
* add WatchClient player component and implement upgrade flow with Stripe webhooks and usage tracking ([29cf357](https://github.com/KNIGHTABDO/MASHHAD/commit/29cf3579f69dd58444d4d070881b4b27057bc9a7))
* apply iframe sandbox for ad-blocking and fix cross-server sync progress ([19139a5](https://github.com/KNIGHTABDO/MASHHAD/commit/19139a565f9c846fdf6d42ee4772a2813da13b50))
* brand logo throughout app - splash screen, navbar, footer, player loading ([b89fdfc](https://github.com/KNIGHTABDO/MASHHAD/commit/b89fdfcb3b1b502e60ec926466ff9787ad7b097f))
* comprehensive AGENTS.md, bigger logos, remove Vercel assets, use logo as favicon ([42c4d0c](https://github.com/KNIGHTABDO/MASHHAD/commit/42c4d0c105f03b75c07eaaae743bd1be40aa88f2))
* Explore GitHub Repo for Missing Items ([9630bd8](https://github.com/KNIGHTABDO/MASHHAD/commit/9630bd8dee146c6e80bd76afd0671d0cd001ae08))
* implement admin dashboard with user management and integrate EgyDead provider support ([eed163f](https://github.com/KNIGHTABDO/MASHHAD/commit/eed163fedd5eff63da68260130532cefe0d953ee))
* implement admin user management dashboard with role-based metadata updates and add watch client components ([e6eb09a](https://github.com/KNIGHTABDO/MASHHAD/commit/e6eb09a34e4062d3c70dcac13f47b05ecdf7e7fc))
* implement authentication pages, backend API routes, Supabase integration, and core navigation components ([b9e3f2d](https://github.com/KNIGHTABDO/MASHHAD/commit/b9e3f2dafda04640f1a5ded994ddc7ce0b75457c))
* implement egydead server adapter with proxy-supported fetching and embed resolution ([129c81a](https://github.com/KNIGHTABDO/MASHHAD/commit/129c81ad728d97d673358e0f4a78b89f7c765e62))
* implement egydead server adapter with TMDB integration and stream extraction support ([cfc7570](https://github.com/KNIGHTABDO/MASHHAD/commit/cfc7570a4dd86ed9f974812c8d32e8a61d761183))
* implement media player core with HLS/DASH support and multi-language routing ([bd5c8dd](https://github.com/KNIGHTABDO/MASHHAD/commit/bd5c8dd019559bc11242be43ca845056e2f5d8c9))
* implement OCI proxy bridge and EgyDead media scraper adapter ([7688c73](https://github.com/KNIGHTABDO/MASHHAD/commit/7688c73a47689873ba10a57f3bda4699929ce8ed))
* implement OCI proxy bridge with HLS manifest URL rewriting support ([faee33d](https://github.com/KNIGHTABDO/MASHHAD/commit/faee33dbf802aae03bdc27a15ac59b14546145f1))
* implement Pro subscription promotion modal and integrate it into main layout ([1413640](https://github.com/KNIGHTABDO/MASHHAD/commit/1413640e004c73c96dc1a808ab26a96b1d7a4184))
* implement segments API to fetch intro and outro data from IntroDB and community database ([a9cc740](https://github.com/KNIGHTABDO/MASHHAD/commit/a9cc7405c44db5b36f54418c4435ee370d0b141b))
* implement streaming video player client with Supabase progress tracking ([56b527e](https://github.com/KNIGHTABDO/MASHHAD/commit/56b527edae8f0981fc3756d75220a6682c65285d))
* implement usage heartbeat API endpoint for tracking and verifying user watch time limits ([288856d](https://github.com/KNIGHTABDO/MASHHAD/commit/288856d9a29f5ad52b4f2be73db91de2b103d6df))
* implement usage tracking API and admin Pro status toggles with UI integration ([e873361](https://github.com/KNIGHTABDO/MASHHAD/commit/e8733616d3dace984d9ec393bdef28c65ff7389c))
* implement watch history, user watchlist, and content display components with modal support ([c524d4a](https://github.com/KNIGHTABDO/MASHHAD/commit/c524d4aae1eb4c516f76e68d169f0eddff197a03))
* implement WatchClient component for platform-aware media playback and stream selection ([dc3d75d](https://github.com/KNIGHTABDO/MASHHAD/commit/dc3d75d7d402bd00ec1dbd3fae12806cb6768db8))
* integrate VidSrc embed player as a streaming server option ([16589a8](https://github.com/KNIGHTABDO/MASHHAD/commit/16589a80279d391011324605ff7adb2b86b22bac))
* multi-source subtitle engine with intelligent sync scoring (SubDL + Stremio + OpenSubs) ([98f6ff3](https://github.com/KNIGHTABDO/MASHHAD/commit/98f6ff3c1e91c7d8ff7396d7e95dd80b963c37e4))
* premium UI polish, streaming orchestrator fast-path, and anime route fixes ([096244a](https://github.com/KNIGHTABDO/MASHHAD/commit/096244a990b04f8bc6fc74d45865e68f2e34fcbc))
* real TMDB posters on landing, full mobile responsive, update docs ([3b7baa9](https://github.com/KNIGHTABDO/MASHHAD/commit/3b7baa9655837ec47616b99e4a618daa3de7d849))


### Bug Fixes

* add clerk-telemetry.com to connect-src security policy ([99455ec](https://github.com/KNIGHTABDO/MASHHAD/commit/99455ecf27a28d3c02c686f2c5d4708ef2c395c3))
* change vidsrc domain to vidsrc.net to match vsdash.net tracking ([25ab6e3](https://github.com/KNIGHTABDO/MASHHAD/commit/25ab6e339ae9a65cac80a48e5e92b1e3192a1383))
* correct SubDL API endpoint to /api/v1/subtitles and broaden zip detection ([9a5ee96](https://github.com/KNIGHTABDO/MASHHAD/commit/9a5ee9614a7a47e258a02886690d8ba03a5044c0))
* deep subtitle sync overhaul - real stream filename matching, fflate zip, honest scoring ([77f40b1](https://github.com/KNIGHTABDO/MASHHAD/commit/77f40b1e3588955f79e4b3cd33db8e773d586a6c))
* enforce strict viewport bounds to eliminate scrolling on watch page ([a4f519a](https://github.com/KNIGHTABDO/MASHHAD/commit/a4f519a542869c27269ef3e71f041a2b520a4499))
* make iframe responsive and allow pointer events ([cb36186](https://github.com/KNIGHTABDO/MASHHAD/commit/cb3618695f07175dc737a6cf8193d5052cfe25b7))
* **player:** expose RD transcodes, add URL refresh + multi-stream fallback ([4649ef8](https://github.com/KNIGHTABDO/MASHHAD/commit/4649ef8ca543cff40cdd37fcefdeaf763f5e4389))
* remove iframe sandbox to prevent vidsrc 404 anti-adblock and revert to vidsrc.me ([5bb96fb](https://github.com/KNIGHTABDO/MASHHAD/commit/5bb96fbcf7837ed69a395a21414cbcf32a5f612b))
* replace window.location.reload() with router.refresh() on language switch ([4f0d477](https://github.com/KNIGHTABDO/MASHHAD/commit/4f0d477989deda0410706f702f550a3733da2fa5))
* resolve player stuck on next episode and add intelligent next episode verification ([00bf4f0](https://github.com/KNIGHTABDO/MASHHAD/commit/00bf4f047cfd526789a263076099999ae8bdce92))
* resolve ReferenceError lang is not defined at the end of episode ([4b8aee1](https://github.com/KNIGHTABDO/MASHHAD/commit/4b8aee159a0d1c7d65d97df2fedec37b4f38acd1))
* significantly bigger logo (h-16 navbar, h-14 footer) to compensate for image padding ([e56e2d5](https://github.com/KNIGHTABDO/MASHHAD/commit/e56e2d54b7c36d61fa5913bdd4001ef16fcd322b))
* streaming correctness, subtitle sync, anime seasons, and production readiness ([805b76e](https://github.com/KNIGHTABDO/MASHHAD/commit/805b76ed7b91f1f8bec18b80d48cc05bbd5c6852))
* TV series in Continue Watching (tmdb.series not tmdb.tv) + search language matches UI ([52c16a3](https://github.com/KNIGHTABDO/MASHHAD/commit/52c16a349ba72c4a2fed9f1cb848e39298577ded))
* update VidSrc embed domain to match dashboard API requirements ([9ccd304](https://github.com/KNIGHTABDO/MASHHAD/commit/9ccd304892cc55f1200b92e2cb9bb4da1f048768))
* use 100dvh and overflow-hidden for true fullscreen responsiveness ([f29d579](https://github.com/KNIGHTABDO/MASHHAD/commit/f29d579c6e212bbc6792911bb8ddd67c47a2edd7))
* use hard navigation after profile selection to ensure cookie is sent to middleware ([33e29bd](https://github.com/KNIGHTABDO/MASHHAD/commit/33e29bdbe9d7e99ef74d531dea4133da49d9ec45))

## [Unreleased]

### Added

- Initial public repository baseline

## [0.1.0] - 2026-05-05

### Added

- Next.js 15 App Router application with bilingual (Arabic/English) UI
- Clerk authentication and multi-profile experience
- Supabase database schema and migrations
- Multi-source streaming pipeline with fallback chain
- Multi-source subtitle engine with sync scoring and conversion pipeline
- Admin and usage endpoints, plus Stripe/Clerk webhook integrations
