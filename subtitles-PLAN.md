# Browser-Only Subtitle Lip-Sync Engine

## Summary
Build a manual-trigger “Fix Sync” feature that does **alignment, not transcription**. It will analyze speech/silence from the currently playing audio, compare that to subtitle cue timing, estimate the best offset/drift correction, then generate a corrected VTT for the exact stream hash/file.

Current limitation: Mashhad only applies one global offset. This plan adds speech-aware sync, drift correction, confidence scoring, and cached corrected subtitles.

## Key Changes

### 1. Player UX
- Add a `Fix Sync` button inside the subtitle menu and optionally beside the subtitle badge.
- When clicked, open a compact overlay:
  - `Analyzing speech...`
  - progress bar, confidence indicator, cancel button.
- Manual trigger behavior:
  - Analyze 60-90 seconds around the current playback position.
  - Prefer a window containing at least 8 active subtitle cues.
  - If not enough cues exist nearby, analyze from the first subtitle-heavy section.
- After analysis:
  - If confidence is high, apply correction immediately.
  - If medium, show `Apply suggested sync (+1.35s)` / `Cancel`.
  - If low, show manual nudge controls and a “mark spoken now” fallback.

### 2. Browser Audio Alignment
- Add `lib/subtitles/parse.ts`:
  - Parse VTT/SRT cues into `{ index, startMs, endMs, text }`.
  - Serialize corrected cues back to valid VTT.
- Add `lib/subtitles/alignment.ts`:
  - Build speech-energy samples from Web Audio `AnalyserNode`.
  - Use voice-band energy, RMS, smoothing, and silence thresholds.
  - Convert samples into speech segments.
  - Estimate global offset by searching `-12000ms` to `+12000ms` in `50ms` steps.
  - Score each offset by cue-start proximity to speech starts and cue overlap with speech.
  - Detect drift by estimating offsets in early/middle/late cue groups.
  - If drift is meaningful, apply linear correction `correctedTime = a * originalTime + b`.
  - Otherwise apply global offset only.
- Add line-level snap only for small corrections:
  - Snap cue start/end to nearby speech segment boundaries within `700ms`.
  - Never reorder cues.
  - Never let cue duration drop below `700ms`.
  - Never overlap the next cue; clamp with a `120ms` gap.

### 3. Browser Compatibility Handling
- Use Web Audio only after user gesture from `Fix Sync`.
- Try `AudioContext.createMediaElementSource(video)`.
- If cross-origin media produces silent analyzer data, stop analysis and show:
  - `This stream cannot be analyzed in the browser. Use manual sync.`
- Keep browser-only scope:
  - No backend AI worker.
  - No transcription.
  - No OpenAI/Whisper API.
- Add manual precision fallback:
  - User selects a visible subtitle line.
  - User taps `Spoken now` when the matching dialogue begins.
  - Compute offset from `video.currentTime - cue.startTime`.
  - Apply and save scoped offset.

### 4. Corrected Subtitle Storage
- Store corrected subtitle locally and in Supabase metadata:
  - `subtitle_file_id`
  - `content_id`
  - `content_type`
  - `season_number`
  - `episode_number`
  - `stream_hash`
  - `stream_file_name`
  - `language`
  - `correction_type`: `global_offset`, `linear_drift`, `line_snap`, `manual_marker`
  - `offset_ms`
  - `drift_rate`
  - `confidence`
- Add or extend a migration for `subtitle_alignment_profiles`.
- Cache corrected VTT in memory/localStorage per:
  - `stream_hash + subtitle_file_id + language + correction signature`.
- Keep existing `subtitle_sync_votes` for simple offsets, but read alignment profiles first when available.

### 5. UI/i18n
- Add Arabic/English keys:
  - `fixSync`
  - `analyzingSpeech`
  - `syncConfidence`
  - `applySync`
  - `manualSync`
  - `spokenNow`
  - `browserAudioBlocked`
  - `syncApplied`
- Show sync state in subtitle menu:
  - `Auto-aligned`
  - `Manual correction`
  - `Community correction`
  - `Needs sync`

## Test Plan
- Unit tests:
  - VTT/SRT parse and serialize round trip.
  - Global offset estimation for subtitles shifted by fixed delay.
  - Drift correction for subtitles slowly desyncing over time.
  - Cue snapping clamps overlaps and minimum duration.
  - Low-confidence detection when speech segments do not match cues.
- Player tests:
  - `Fix Sync` starts only after user click.
  - Corrected VTT replaces the active track without changing video time.
  - Manual `Spoken now` computes and applies offset.
  - Browser audio blocked state falls back cleanly.
- Regression:
  - `npm run lint`
  - `npm run build`

## Assumptions
- This is **alignment**, not transcription.
- The first version is browser-only and manual-triggered.
- Exact audio analysis may fail on some RD/cross-origin streams because browser Web Audio can output silence without CORS access.
- When browser analysis fails, the precise manual marker flow is the guaranteed fallback.
- Sources referenced: [MDN AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode), [MDN WebVTT API](https://developer.mozilla.org/docs/Web/API/WebVTT_API), [MDN crossorigin media attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin).
