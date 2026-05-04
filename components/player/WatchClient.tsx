"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/store/playerStore";
import { useT } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@clerk/nextjs";
import {
  getMediaSupportSnapshot,
  getPlayerFeatureFlags,
} from "@/lib/player/featureFlags";
import { parseSubtitleCues, type SubtitleCue } from "@/lib/subtitles/parse";
import type { StreamResult } from "@/types/stream";
import type { Subtitle } from "@/types/subtitle";
import { PostPlaybackScreen } from "./PostPlaybackScreen";
import { UpgradeOverlay } from "./UpgradeOverlay";

interface WatchClientProps {
  contentId: string;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  profileId: string | null;
  initialProgress: number;
}

function formatTime(s: number): string {
  if (!s || !isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

interface Segments {
  intro: { start_sec: number; end_sec: number } | null;
  outro: { start_sec: number; end_sec: number } | null;
  needsCommunityVote?: boolean;
}

type PlaybackFallbackReason = "hevc" | "ac3" | "general";

interface DashPlayerRef {
  reset: () => void;
}

type Ac3AudioBuffer = { buffer: AudioBuffer; timestamp: number };

interface Ac3Sink {
  buffers: (start?: number, end?: number) => AsyncIterable<Ac3AudioBuffer>;
}

interface Ac3Input {
  dispose: () => void;
}

interface Ac3Session {
  abort: AbortController;
  input: Ac3Input;
  sink: Ac3Sink;
  audioCtx: AudioContext;
  gainNode: GainNode;
  nodes: AudioBufferSourceNode[];
  scheduling: boolean;
  nextTimestamp: number;
}

type Ac3StartResult = "started" | "skip" | "failed";
type SyncStatus =
  | "idle"
  | "analyzing"
  | "applied"
  | "needsSecondAnchor"
  | "error";
type SyncAnchor = { subtitleMs: number; videoMs: number };

function isHevcCandidate(stream?: StreamResult): boolean {
  if (!stream) return false;
  const codec = stream.videoCodec?.toLowerCase();
  const label = stream.label?.toLowerCase() || "";
  const fileName = stream.fileName?.toLowerCase() || "";
  return (
    codec === "h265" ||
    codec === "hevc" ||
    label.includes("hevc") ||
    label.includes("h265") ||
    fileName.includes("hevc") ||
    fileName.includes("h265")
  );
}

function isAc3Candidate(stream?: StreamResult): boolean {
  if (!stream) return false;
  const codec = stream.audioCodec?.toLowerCase() || "";
  const label = stream.label?.toLowerCase() || "";
  const fileName = stream.fileName?.toLowerCase() || "";
  const haystack = `${codec} ${label} ${fileName}`;
  return /(e-?ac-?3|ac-?3|ddp|dd\+)/.test(haystack);
}

function isUnsupportedAudioCandidate(stream?: StreamResult): boolean {
  if (!stream) return false;
  const codec = stream.audioCodec?.toLowerCase() || "";
  const label = stream.label?.toLowerCase() || "";
  const fileName = stream.fileName?.toLowerCase() || "";
  const haystack = `${codec} ${label} ${fileName}`;
  return /truehd|dts/.test(haystack);
}

function isRiskyDirectMkv(stream?: StreamResult): boolean {
  if (!stream || stream.variant !== "direct") return false;
  const url = stream.url?.toLowerCase() || "";
  const fileName = stream.fileName?.toLowerCase() || "";
  const container = stream.container?.toLowerCase() || "";
  return (
    container === "mkv" ||
    fileName.endsWith(".mkv") ||
    /\.mkv(?:\?|$)/.test(url)
  );
}

function normalizeLanguageCode(lang?: string | null): string | null {
  if (!lang) return null;
  const lc = lang.toLowerCase().split("-")[0];
  const map: Record<string, string> = {
    ar: "ara",
    en: "eng",
    fr: "fra",
    es: "spa",
    de: "deu",
    it: "ita",
    pt: "por",
    ru: "rus",
    hi: "hin",
    tr: "tur",
    ja: "jpn",
    ko: "kor",
    zh: "zho",
  };
  return map[lc] || lc;
}

function selectPreferredHlsAudioTrack(
  hls: {
    audioTracks?: Array<{ lang?: string; name?: string }>;
    audioTrack: number;
  },
  stream: StreamResult,
) {
  const preferred = normalizeLanguageCode(
    stream.selectedAudioLanguage || stream.originalLanguage,
  );
  // If there are audio tracks but none matches a preference, always select track 0
  // so the stream is audible (important for EgyDead which has a single audio track).
  if (!hls.audioTracks?.length) return;

  if (!preferred) {
    if (hls.audioTrack !== 0) hls.audioTrack = 0;
    return;
  }

  const idx = hls.audioTracks.findIndex((track) => {
    const langCode = normalizeLanguageCode(track.lang || "");
    const nameCode = normalizeLanguageCode(track.name || "");
    const name = track.name?.toLowerCase() || "";
    return (
      langCode === preferred ||
      nameCode === preferred ||
      name.includes(preferred)
    );
  });

  // If no matching track found, still force track 0 so audio is never silent
  const target = idx >= 0 ? idx : 0;
  if (hls.audioTrack !== target) {
    hls.audioTrack = target;
  }
}

function formatSignedMs(ms: number): string {
  const sign = ms > 0 ? "+" : "";
  return `${sign}${Math.round(ms)}ms`;
}

function resolveDetectedAudioCodec(
  codec: string | null,
  codecString?: string | null,
  internalCodecId?: string | number | Uint8Array | null,
): string | null {
  if (codec) return codec;
  const internal = typeof internalCodecId === "string" ? internalCodecId : "";
  const probe = `${codecString || ""} ${internal}`.toLowerCase();
  if (/ec-3|eac3|dd\+|ddp/.test(probe)) return "eac3";
  if (/ac-3|ac3/.test(probe)) return "ac3";
  if (/truehd/.test(probe)) return "truehd";
  if (/dts/.test(probe)) return "dts";
  return null;
}

// ── Platform-aware stream selection ──────────────────────────────
function getPlayerConfig(streams: StreamResult[]): {
  stream: StreamResult;
  playerType: "native-hls" | "hls.js" | "dash.js" | "direct";
} {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/Edg/.test(ua);
  const flags = getPlayerFeatureFlags();

  const playerTypeFor = (
    stream: StreamResult,
  ): "native-hls" | "hls.js" | "dash.js" | "direct" => {
    if (stream.type === "hls")
      return isIOS || isSafari ? "native-hls" : "hls.js";
    if (stream.type === "dash") return "dash.js";
    return "direct";
  };

  const safeStreams = streams.filter(
    (stream) => !isUnsupportedAudioCandidate(stream),
  );
  const firstSafe = safeStreams[0] || streams[0];

  // Prioritize embeds (PlayIMDb) if they are first in the list
  if (firstSafe?.type === "embed") {
    return { stream: firstSafe, playerType: "direct" };
  }

  if (flags.hevcJs && !isIOS && !isSafari) {
    const hevcDash = safeStreams.find(
      (stream) => stream.type === "dash" && isHevcCandidate(stream),
    );
    if (hevcDash) {
      return { stream: hevcDash, playerType: "dash.js" };
    }
  }

  const egydead = streams.find(s => s.server === 'egydead');
  if (egydead) {
    return { stream: egydead, playerType: playerTypeFor(egydead) };
  }

  const primary = firstSafe;
  if (!primary) {
    return { stream: streams[0], playerType: "direct" };
  }

  return { stream: primary, playerType: playerTypeFor(primary) };
}

// ── Resolve and retry ────────────────────────────────────────────
export function WatchClient({
  contentId,
  type,
  season,
  episode,
  profileId,
  initialProgress,
}: WatchClientProps) {
  const router = useRouter();
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const { volume, setVolume, playbackRate, setPlaybackRate, setQuality } = usePlayerStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hasResumed = useRef(false);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const dashRef = useRef<DashPlayerRef | null>(null);
  const trackRef = useRef<HTMLTrackElement>(null);
  const subtitleBlobUrl = useRef<string | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveStartedAt = useRef<number>(Date.now());
  const firstFrameSent = useRef(false);
  const bufferingStartedAt = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const featureFlags = useRef(getPlayerFeatureFlags());
  const mediaSupport = useRef(getMediaSupportSnapshot());
  const audioCodecCache = useRef<Map<string, string | null>>(new Map());
  const subtitleCuesRef = useRef<SubtitleCue[]>([]);
  const subtitleDriftRateRef = useRef(0);
  const driftAnchorsRef = useRef<SyncAnchor[]>([]);
  const ac3SessionRef = useRef<Ac3Session | null>(null);
  const ac3TimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ac3WasMutedRef = useRef<boolean>(false);
  const ac3DecoderReadyRef = useRef<boolean>(false);
  const ac3UrlRef = useRef<string | null>(null);

  // Safe play/pause to avoid AbortError
  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      // Try to unmute and play with volume
      video.muted = false;
      video.volume = 1;
      setVolume(1);
      const p = video.play();
      if (p) {
        playPromiseRef.current = p;
        await p.catch(() => {
          // If blocked, try muted play
          video.muted = true;
          return video.play();
        }).finally(() => {
          playPromiseRef.current = null;
        });
      }
    } catch {
      // ignored
    }
  }, [setVolume]);

  const safePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playPromiseRef.current) {
      playPromiseRef.current.then(() => video.pause()).catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const safeToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) safePlay();
    else safePause();
  }, [safePlay, safePause]);

  const [streams, setStreams] = useState<StreamResult[]>([]);
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const streamsRef = useRef<StreamResult[]>([]);
  const currentStreamIndexRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeSub, setActiveSub] = useState<Subtitle | null>(null);
  const [subsLoading, setSubsLoading] = useState(false);
  const [showAssWarning, setShowAssWarning] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [manualOffsetDisplayMs, setManualOffsetDisplayMs] = useState(0);
  const [subtitleDriftRate, setSubtitleDriftRate] = useState(0);
  const [driftAnchorCount, setDriftAnchorCount] = useState(0);
  const [syncConfidence, setSyncConfidence] = useState(0);
  const [fallbackPrompt, setFallbackPrompt] = useState<{
    reason: PlaybackFallbackReason;
    message: string;
  } | null>(null);

  const [segments, setSegments] = useState<Segments | null>(null);
  const [introDraftStart, setIntroDraftStart] = useState<number | null>(null);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showNextEpisodeBtn, setShowNextEpisodeBtn] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isChangingStream, setIsChangingStream] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hlsLevels, setHlsLevels] = useState<{ id: number; label: string }[]>(
    [],
  );
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [showLevelMenu, setShowLevelMenu] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [lastFallbackError, setLastFallbackError] = useState<string | null>(
    null,
  );

  const [usageState, setUsageState] = useState({
    secondsWatchedToday: 0,
    isPro: false,
    limitReached: false,
    loading: true
  });

  // Touch gesture state
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const lastTapTime = useRef(0);
  const tapCount = useRef(0);

  // Refs for progress bar hover
  const hoverIndicatorRef = useRef<HTMLDivElement>(null);
  const hoverTooltipRef = useRef<HTMLDivElement>(null);
  const hoverRafRef = useRef<number | null>(null);

  const showFallbackPrompt = useCallback(
    (reason: PlaybackFallbackReason, message: string) => {
      setFallbackPrompt({ reason, message });
      setIsChangingStream(false);
      setLastFallbackError(message);
    },
    [],
  );
  useEffect(() => {
    if (fallbackPrompt) return;
    setLastFallbackError(null);
  }, [currentStreamIndex, fallbackPrompt]);

  const clearFallbackPrompt = useCallback(() => {
    setFallbackPrompt(null);
  }, []);

  const detectAudioCodec = useCallback(
    async (stream: StreamResult): Promise<string | null> => {
      const url = stream?.url;
      if (!url || stream.type === "embed") return null;
      if (audioCodecCache.current.has(url)) {
        return audioCodecCache.current.get(url) ?? null;
      }

      // Direct RD files already play through the native <video> element. Only probe
      // them when metadata/filename hints at a codec that may need special handling.
      // This avoids noisy Mediabunny fetches against large MKV URLs on every play/seek.
      if (
        stream.type === "mp4" &&
        !isAc3Candidate(stream) &&
        !isUnsupportedAudioCandidate(stream)
      ) {
        audioCodecCache.current.set(url, null);
        return null;
      }

      let input: Ac3Input | null = null;
      try {
        const { Input, UrlSource, ALL_FORMATS, HLS_FORMATS, prefer } =
          await import("mediabunny");
        const formats = url.includes(".m3u8") ? HLS_FORMATS : ALL_FORMATS;
        const probeInput = new Input({ source: new UrlSource(url), formats });
        input = probeInput;

        if (!(await probeInput.canRead())) {
          input.dispose();
          audioCodecCache.current.set(url, null);
          return null;
        }

        const preferred = normalizeLanguageCode(stream.selectedAudioLanguage);
        const audioTrack = preferred
          ? await probeInput.getPrimaryAudioTrack({
              sortBy: async (track) =>
                prefer((await track.getLanguageCode()) === preferred),
            })
          : await probeInput.getPrimaryAudioTrack();

        if (!audioTrack) {
          input.dispose();
          audioCodecCache.current.set(url, null);
          return null;
        }

        const codec = await audioTrack.getCodec();
        const codecString = await audioTrack.getCodecParameterString();
        const internal = await audioTrack.getInternalCodecId();
        input.dispose();

        const resolved = resolveDetectedAudioCodec(
          codec,
          codecString,
          internal,
        );
        audioCodecCache.current.set(url, resolved);
        return resolved;
      } catch {
        // Browser-side probing of remote RD streams can be blocked by CSP/CORS/expired URLs.
        // Playback can still work through the native video element, so keep this non-fatal
        // and avoid surfacing a Next.js dev overlay for an optional codec probe.
        console.debug("[Mediabunny][Probe] Codec probe skipped");
        if (input) input.dispose();
        audioCodecCache.current.set(url, null);
        return null;
      }
    },
    [],
  );

  const stopAc3Session = useCallback((restoreMute = true) => {
    if (ac3TimerRef.current) {
      clearInterval(ac3TimerRef.current);
      ac3TimerRef.current = null;
    }
    const session = ac3SessionRef.current;
    if (session) {
      session.abort.abort();
      session.nodes.forEach((node) => {
        try {
          node.stop();
          node.disconnect();
        } catch {
          // Ignore stop errors on already-ended nodes
        }
      });
      session.nodes = [];
      session.input.dispose();
      session.audioCtx.close().catch(() => {});
      ac3SessionRef.current = null;
    }
    ac3UrlRef.current = null;
    if (restoreMute && videoRef.current) {
      videoRef.current.muted = ac3WasMutedRef.current;
    }
  }, []);

  const scheduleAc3Window = useCallback(
    async (session: Ac3Session, video: HTMLVideoElement) => {
      if (session.scheduling || session.abort.signal.aborted || video.paused)
        return;
      session.scheduling = true;
      const playbackRate = video.playbackRate || 1;
      const baseVideoTime = video.currentTime;
      const baseAudioTime = session.audioCtx.currentTime;
      const startAt = Math.max(baseVideoTime, session.nextTimestamp);
      const endAt = startAt + 20;
      try {
        for await (const { buffer, timestamp } of session.sink.buffers(
          startAt,
          endAt,
        )) {
          if (session.abort.signal.aborted || video.paused) break;
          const offset = (timestamp - baseVideoTime) / playbackRate;
          if (offset < -0.25) continue;
          const node = session.audioCtx.createBufferSource();
          node.buffer = buffer;
          node.connect(session.gainNode);
          node.onended = () => {
            session.nodes = session.nodes.filter((n) => n !== node);
          };
          node.start(baseAudioTime + offset);
          session.nodes.push(node);
        }
        session.nextTimestamp = endAt;
      } catch (err) {
        if (!session.abort.signal.aborted) {
          console.error("[Mediabunny][AC3]", err);
        }
      } finally {
        session.scheduling = false;
      }
    },
    [],
  );

  const startAc3Session = useCallback(
    async (stream: StreamResult, force = false): Promise<Ac3StartResult> => {
      const video = videoRef.current;
      if (!video || !stream?.url) return "skip";
      if (!featureFlags.current.mediabunnyAc3) return "skip";
      if (!force && ac3SessionRef.current && ac3UrlRef.current === stream.url)
        return "started";

      const hintedAc3 = isAc3Candidate(stream);
      if (stream.type === "mp4" && !hintedAc3) return "skip";

      const detectedCodec = await detectAudioCodec(stream);
      const isAc3 =
        detectedCodec === "ac3" || detectedCodec === "eac3" || hintedAc3;
      if (!isAc3) return "skip";

      stopAc3Session(false);

      try {
        const {
          Input,
          UrlSource,
          ALL_FORMATS,
          HLS_FORMATS,
          AudioBufferSink,
          prefer,
        } = await import("mediabunny");
        if (!ac3DecoderReadyRef.current) {
          const { registerAc3Decoder } = await import("@mediabunny/ac3");
          registerAc3Decoder();
          ac3DecoderReadyRef.current = true;
        }

        const formats = stream.url.includes(".m3u8")
          ? HLS_FORMATS
          : ALL_FORMATS;
        const input = new Input({ source: new UrlSource(stream.url), formats });
        if (!(await input.canRead())) {
          input.dispose();
          return "failed";
        }
        const preferred = normalizeLanguageCode(stream.selectedAudioLanguage);
        const audioTrack = preferred
          ? await input.getPrimaryAudioTrack({
              sortBy: async (track) =>
                prefer((await track.getLanguageCode()) === preferred),
            })
          : await input.getPrimaryAudioTrack();

        if (!audioTrack || !(await audioTrack.canDecode())) {
          input.dispose();
          return "failed";
        }

        const AudioCtx =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;
        if (!AudioCtx) {
          input.dispose();
          return "failed";
        }
        const audioCtx = new AudioCtx();
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = volume;
        gainNode.connect(audioCtx.destination);

        const session: Ac3Session = {
          abort: new AbortController(),
          input,
          sink: new AudioBufferSink(audioTrack),
          audioCtx,
          gainNode,
          nodes: [],
          scheduling: false,
          nextTimestamp: video.currentTime,
        };

        ac3SessionRef.current = session;
        ac3UrlRef.current = stream.url;
        ac3WasMutedRef.current = video.muted;
        video.muted = true;
        await audioCtx.resume();

        await scheduleAc3Window(session, video);
        ac3TimerRef.current = setInterval(() => {
          if (ac3SessionRef.current === session) {
            scheduleAc3Window(session, video);
          }
        }, 4000);
        return "started";
      } catch (err) {
        console.error("[Mediabunny][AC3]", err);
        stopAc3Session();
        return "failed";
      }
    },
    [detectAudioCodec, scheduleAc3Window, stopAc3Session, volume],
  );

  const tryHevcDash = useCallback(
    async (stream: StreamResult, video: HTMLVideoElement) => {
      if (!featureFlags.current.hevcJs) return false;
      if (!stream || stream.type !== "dash") return false;
      if (!mediaSupport.current.webCodecs) return false;

      try {
        const { MediaPlayer } = await import("dashjs");
        const { attachHevcSupport } = await import("@hevcjs/dashjs-plugin");
        const player = MediaPlayer().create();
        await attachHevcSupport(player);
        player.initialize(video, stream.url, true);
        dashRef.current = player;
        return true;
      } catch (err) {
        console.error("[hevc.js]", err);
        return false;
      }
    },
    [],
  );

  const tryMediabunnyAc3 = useCallback(
    async (stream: StreamResult, force = false) => {
      if (!featureFlags.current.mediabunnyAc3) return "skip" as const;
      return startAc3Session(stream, force);
    },
    [startAc3Session],
  );

  const lastKnownTime = useRef(initialProgress || 0);
  const previousStreamIndex = useRef(currentStreamIndex);

  useEffect(() => {
    streamsRef.current = streams;
  }, [streams]);
  useEffect(() => {
    currentStreamIndexRef.current = currentStreamIndex;
  }, [currentStreamIndex]);
  useEffect(() => {
    const session = ac3SessionRef.current;
    if (session) session.gainNode.gain.value = volume;
  }, [volume]);

  // ── Progress sync ────────────────────────────────────────────────
  const syncProgress = useCallback(
    async (time?: number, embedDuration?: number) => {
      if (!profileId) return;
      const video = videoRef.current;
      // Removed `if (!video && !isEmbed) return` to allow unmount saving!

      let prog = Math.round(time ?? (video ? video.currentTime : lastKnownTime.current));
      if (!isFinite(prog) || isNaN(prog)) prog = 0;
      
      let dur = Math.round(embedDuration ?? (video ? video.duration : duration));
      if (!isFinite(dur) || isNaN(dur)) dur = 0;
      
      if (prog < 2 || dur === 0) return; // Don't save if we somehow lost duration

      const token = await getToken({ template: 'supabase' });
      const supabase = createClient(token || undefined);
      const row: Record<string, unknown> = {
        profile_id: profileId,
        content_id: contentId,
        content_type: type === "tv" ? "episode" : "movie",
        progress_seconds: prog,
        duration_seconds: dur || 0,
        completed: dur > 0 && prog >= dur - 120,
        watched_at: new Date().toISOString(),
      };
      if (type === "tv") {
        row.season_number = season ?? null;
        row.episode_number = episode ?? null;
      }

      const { data } = await supabase
        .from("watch_history")
        .select("id")
        .eq("profile_id", profileId)
        .eq("content_id", contentId)
        .eq("content_type", type === "tv" ? "episode" : "movie")
        .order("watched_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        await supabase.from("watch_history").update(row).eq("id", data[0].id);
      } else {
        await supabase.from("watch_history").insert(row);
      }
    },
    [profileId, contentId, type, season, episode, duration, getToken],
  );

  useEffect(() => {
    syncTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) syncProgress();
    }, 5000);
    return () => {
      if (syncTimer.current) clearInterval(syncTimer.current);
    };
  }, [syncProgress]);

  // ── Usage Tracking Heartbeat ─────────────────────────────────────
  
  useEffect(() => {
    async function checkUsage() {
      try {
        const res = await fetch('/api/usage/heartbeat');
        const data = await res.json();
        setUsageState(prev => ({
          ...prev,
          secondsWatchedToday: data.secondsWatchedToday,
          isPro: data.isPro,
          limitReached: data.limitReached,
          loading: false
        }));
      } catch (err) {
        console.error('[Usage Check] Error:', err);
      }
    }
    checkUsage();
  }, []);

  useEffect(() => {
    const heartbeatInterval = setInterval(async () => {
      const isEmbed = streams[currentStreamIndex]?.type === "embed";
      const video = videoRef.current;
      const isActuallyPlaying = (isEmbed || (video && !video.paused && !isBuffering)) && document.visibilityState !== 'hidden';
      
      if (isActuallyPlaying && !usageState.limitReached) {
        try {
          const res = await fetch('/api/usage/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ increment: 30 })
          });
          const data = await res.json();
          setUsageState(prev => ({
            ...prev,
            secondsWatchedToday: data.secondsWatchedToday,
            isPro: data.isPro,
            limitReached: data.limitReached
          }));
        } catch (err) {
          console.error('[Usage Heartbeat] Error:', err);
        }
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [streams, currentStreamIndex, usageState.limitReached, isBuffering]);

  // Block playback if limit reached
  useEffect(() => {
    if (usageState.limitReached) {
      safePause();
    }
  }, [usageState.limitReached, safePause]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      // 🎥 Monitor all iframe chatter for sync
      if (typeof data === 'object') {
        // Silent sync logging
        // console.log("🎥 [IFRAME MESSAGE]:", data);
      }

      // 1. Handle PlayIMDb progress format & Episode Sync
      if (data.type === "PLAYER_EVENT" && data.data) {
        const info = data.data.player_info;
        const progress = data.data.player_progress;
        const duration = data.data.player_duration || 0;

        // --- THE MAGIC: Auto-Follow Season/Episode Changes ---
        if (type === "tv" && info && info.mediaType === "tv") {
          const newS = Number(info.season);
          const newE = Number(info.episode);
          
          // If the iframe moved to a different episode/season, update our URL to match
          if ((newS !== season || newE !== episode) && newS > 0 && newE > 0) {
            console.log(`🚀 [AUTO-SYNC]: Moving to S${newS}E${newE} to follow iframe`);
            router.replace(`/watch/${contentId}?type=tv&season=${newS}&episode=${newE}`);
            return; // Exit and let the router refresh the page state
          }
        }
        
        if (typeof progress === "number") {
          lastKnownTime.current = progress;

          // Throttle database saves to every 5 seconds
          const now = Date.now();
          if (now - lastSyncTimeRef.current > 5000) {
            syncProgress(progress, duration);
            lastSyncTimeRef.current = now;
          }
        }
        return;
      }

      // 2. Handle legacy MEDIA_DATA format
      if (data.type === "MEDIA_DATA") {
        const mediaData = data.data;
        if (
          mediaData &&
          mediaData.progress &&
          typeof mediaData.progress.watched === "number"
        ) {
          const progress = mediaData.progress.watched;
          const duration = mediaData.progress.duration || mediaData.progress.total || 0;
          
          lastKnownTime.current = progress;

          const now = Date.now();
          if (now - lastSyncTimeRef.current > 5000) {
            syncProgress(progress, duration);
            lastSyncTimeRef.current = now;
          }
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [syncProgress, contentId, episode, router, season, type]);

  // Fetch IntroDB segments
  useEffect(() => {
    if (type !== "tv") return;
    fetch(
      `/api/segments?tmdb_id=${contentId}&type=tv&season=${season}&episode=${episode}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setSegments({
          intro: data.intro || null,
          outro: data.outro || null,
          needsCommunityVote: !!data.needsCommunityVote,
        });
      })
      .catch(() => {});
  }, [contentId, type, season, episode]);

  const currentFileName = streams[currentStreamIndex]?.fileName || "";
  const currentStreamHash = streams[currentStreamIndex]?.infoHash || "";

  const sendPlaybackEvent = useCallback(
    (eventType: string, extra: Record<string, unknown> = {}) => {
      const stream = streamsRef.current[currentStreamIndexRef.current];
      fetch("/api/stream/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          content_id: contentId,
          content_type: type === "tv" ? "episode" : "movie",
          season_number: season ?? null,
          episode_number: episode ?? null,
          profile_id: profileId,
          candidate_id: stream?.candidateId,
          stream_variant: stream?.variant,
          provider: stream?.server,
          info_hash: stream?.infoHash,
          file_idx: stream?.fileIdx,
          device: navigator.userAgent,
          current_time: videoRef.current?.currentTime ?? null,
          feature_flags: featureFlags.current,
          media_support: mediaSupport.current,
          ...extra,
        }),
      }).catch(() => {});
    },
    [contentId, episode, profileId, season, type],
  );

  // ── Fetch subtitles (Arabic + English) ───────────────────────────
  // Skip entirely when EgyDead is active — it embeds Arabic subtitles in the video
  const isEgyDead = streams[currentStreamIndex]?.server === 'egydead';

  useEffect(() => {
    async function fetchSubs() {
      // Don't fetch until we know what stream we are playing
      if (streams.length === 0) return;

      // EgyDead streams already have baked-in Arabic subtitles — skip our system
      if (streams[currentStreamIndex]?.server === 'egydead') {
        setSubtitles([]);
        setActiveSub(null);
        setSubsLoading(false);
        
        // Ensure we purge any tracks that might have been injected before switching
        if (videoRef.current) {
          const existing = videoRef.current.querySelectorAll("track");
          existing.forEach((t) => t.remove());
        }
        return;
      }
      setSubsLoading(true);
      try {
        const streamFile = currentFileName;
        const baseParams = {
          tmdbId: contentId,
          type: type === "movie" ? "movie" : "episode",
          ...(season && { season: season.toString() }),
          ...(episode && { episode: episode.toString() }),
          ...(streamFile && { streamFile }),
          ...(currentStreamHash && { streamHash: currentStreamHash }),
        };

        const [resAr, resEn] = await Promise.all([
          fetch(
            `/api/subtitles/search?${new URLSearchParams({ ...baseParams, language: "ar" })}`,
          )
            .then((r) => (r.ok ? r.json() : { subtitles: [] }))
            .catch(() => ({ subtitles: [] })),
          fetch(
            `/api/subtitles/search?${new URLSearchParams({ ...baseParams, language: "en" })}`,
          )
            .then((r) => (r.ok ? r.json() : { subtitles: [] }))
            .catch(() => ({ subtitles: [] })),
        ]);

        const allSubs: Subtitle[] = [
          ...(resAr.subtitles || []).map((s: Subtitle) => ({
            ...s,
            language: "ar",
          })),
          ...(resEn.subtitles || []).map((s: Subtitle) => ({
            ...s,
            language: "en",
          })),
        ];

        // Check for ASS/SSA subtitles that won't render properly
        const hasAss = allSubs.some(
          (s) =>
            s.fileName?.toLowerCase().endsWith(".ass") ||
            s.fileName?.toLowerCase().endsWith(".ssa"),
        );
        if (
          hasAss &&
          currentFileName.match(/\[\w+.*?(?:raw|r subs|vostfr)\]|\.ass$/i)
        ) {
          setShowAssWarning(true);
        }

        setSubtitles(allSubs);
        if (resAr.subtitles?.length > 0) {
          // Sort by syncScore to get the best one
          const bestAr = [...resAr.subtitles].sort((a, b) => (b.syncScore || 0) - (a.syncScore || 0))[0];
          loadSubtitle({ ...bestAr, language: 'ar' });
        } else if (resEn.subtitles?.length > 0) {
          const bestEn = [...resEn.subtitles].sort((a, b) => (b.syncScore || 0) - (a.syncScore || 0))[0];
          loadSubtitle({ ...bestEn, language: 'en' });
        }
      } catch (err) {
        console.error("[Subtitles fetch]", err);
      } finally {
        setSubsLoading(false);
      }
    }
    fetchSubs();
  }, [
    contentId,
    type,
    season,
    episode,
    currentStreamIndex,
    currentFileName,
    currentStreamHash,
    streams,
  ]);

  const manualOffsetMs = useRef(0);

  // ── Load a subtitle into the video track ─────────────────────────
  async function loadSubtitle(sub: Subtitle, extraOffsetMs?: number) {
    try {
      const res = await fetch("/api/subtitles/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: sub.fileId }),
      });
      const data = await res.json();
      if (!data.vttContent) return;

      subtitleCuesRef.current = parseSubtitleCues(data.vttContent);

      const communityOffset = sub.recommendedOffsetMs || 0;
      const manual = extraOffsetMs ?? manualOffsetMs.current;
      const totalOffset = communityOffset + manual;
      const driftRate = subtitleDriftRateRef.current;

      let vttContent = data.vttContent;
      if (totalOffset !== 0 || driftRate !== 0) {
        const { applyVttTimingTransform } =
          await import("@/lib/subtitles/offset");
        vttContent = applyVttTimingTransform(
          vttContent,
          totalOffset,
          driftRate,
        );
      }

      if (subtitleBlobUrl.current) URL.revokeObjectURL(subtitleBlobUrl.current);

      const blob = new Blob([vttContent], { type: "text/vtt" });
      const url = URL.createObjectURL(blob);
      subtitleBlobUrl.current = url;

      const video = videoRef.current;
      if (!video) return;

      const existing = video.querySelectorAll("track");
      existing.forEach((t) => t.remove());

      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label =
        sub.language === "ar"
          ? "العربية"
          : sub.language === "en"
            ? "English"
            : sub.language;
      track.srclang = sub.language;
      track.src = url;
      track.default = true;
      video.appendChild(track);

      if (video.textTracks[0]) {
        video.textTracks[0].mode = "showing";
      }

      setActiveSub(sub);
    } catch (err) {
      console.error("[Subtitle load]", err);
    }
  }

  const saveSubtitleSyncVote = useCallback(
    (offsetMs: number) => {
      if (!activeSub?.fileId) return;
      fetch("/api/subtitles/sync-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtitle_file_id: activeSub.fileId,
          offset_ms: offsetMs,
          content_id: contentId,
          content_type: type === "tv" ? "episode" : "movie",
          season_number: season ?? null,
          episode_number: episode ?? null,
          stream_file_name: currentFileName,
          stream_hash: currentStreamHash,
          language: activeSub.language,
        }),
      }).catch(() => {});
    },
    [
      activeSub,
      contentId,
      currentFileName,
      currentStreamHash,
      episode,
      season,
      type,
    ],
  );

  const adjustSubtitleOffset = useCallback(
    (deltaMs: number) => {
      manualOffsetMs.current += deltaMs;
      setManualOffsetDisplayMs(manualOffsetMs.current);
      setSyncStatus("applied");
      setSyncMessage(t.player.syncApplied);
      setSyncConfidence(65);
      if (activeSub) loadSubtitle(activeSub);
      saveSubtitleSyncVote(manualOffsetMs.current);
    },
    [activeSub, saveSubtitleSyncVote, t.player.syncApplied],
  );

  function getCurrentSubtitleCue(): SubtitleCue | null {
    const video = videoRef.current;
    const cues = subtitleCuesRef.current;
    if (!video || cues.length === 0) return null;

    const activeTrackCue = Array.from(video.textTracks)
      .flatMap((track) => Array.from(track.activeCues || []))
      .find(Boolean) as (TextTrackCue & { text?: string }) | undefined;
    const activeText = activeTrackCue?.text?.replace(/<[^>]+>/g, "").trim();
    if (activeText) {
      const normalizedActive = activeText.replace(/\s+/g, " ").toLowerCase();
      const matched = cues.find((cue) =>
        cue.text
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .toLowerCase()
          .includes(normalizedActive),
      );
      if (matched) return matched;
    }

    const videoMs = video.currentTime * 1000;
    const communityOffset = activeSub?.recommendedOffsetMs || 0;
    const factor = 1 + subtitleDriftRateRef.current;
    const offset = communityOffset + manualOffsetMs.current;
    return (
      cues
        .map((cue) => {
          const correctedStart = cue.startMs * factor + offset;
          const correctedEnd = cue.endMs * factor + offset;
          const distance =
            videoMs >= correctedStart && videoMs <= correctedEnd
              ? 0
              : Math.min(
                  Math.abs(videoMs - correctedStart),
                  Math.abs(videoMs - correctedEnd),
                );
          return { cue, distance };
        })
        .filter((item) => item.distance <= 7000)
        .sort((a, b) => a.distance - b.distance)[0]?.cue || null
    );
  }

  async function alignCurrentSubtitleLine() {
    const video = videoRef.current;
    if (!video || !activeSub) {
      setSyncStatus("error");
      setSyncMessage(t.player.syncNoSubtitle);
      return;
    }

    setSyncStatus("analyzing");
    setSyncMessage(t.player.syncAnalyzing);
    const cue = getCurrentSubtitleCue();
    if (!cue) {
      setSyncStatus("error");
      setSyncMessage(t.player.syncLineNotFound);
      return;
    }

    const communityOffset = activeSub.recommendedOffsetMs || 0;
    const videoMs = Math.round(video.currentTime * 1000);
    const factor = 1 + subtitleDriftRateRef.current;
    const nextManualOffset = Math.round(
      videoMs - cue.startMs * factor - communityOffset,
    );
    manualOffsetMs.current = nextManualOffset;
    setManualOffsetDisplayMs(nextManualOffset);
    setSyncStatus("applied");
    setSyncMessage(t.player.syncApplied);
    setSyncConfidence(85);
    await loadSubtitle(activeSub);
    saveSubtitleSyncVote(nextManualOffset);
  }

  async function addDriftAnchor() {
    const video = videoRef.current;
    if (!video || !activeSub) {
      setSyncStatus("error");
      setSyncMessage(t.player.syncNoSubtitle);
      return;
    }

    setSyncStatus("analyzing");
    setSyncMessage(t.player.syncAnalyzing);
    const cue = getCurrentSubtitleCue();
    if (!cue) {
      setSyncStatus("error");
      setSyncMessage(t.player.syncLineNotFound);
      return;
    }

    const anchor = {
      subtitleMs: cue.startMs,
      videoMs: Math.round(video.currentTime * 1000),
    };
    driftAnchorsRef.current = [...driftAnchorsRef.current, anchor].slice(-2);
    setDriftAnchorCount(driftAnchorsRef.current.length);

    if (driftAnchorsRef.current.length < 2) {
      const communityOffset = activeSub.recommendedOffsetMs || 0;
      manualOffsetMs.current = Math.round(
        anchor.videoMs - anchor.subtitleMs - communityOffset,
      );
      setManualOffsetDisplayMs(manualOffsetMs.current);
      setSyncStatus("needsSecondAnchor");
      setSyncMessage(t.player.syncNeedLaterAnchor);
      setSyncConfidence(50);
      await loadSubtitle(activeSub);
      saveSubtitleSyncVote(manualOffsetMs.current);
      return;
    }

    const [first, second] = driftAnchorsRef.current;
    const subtitleDelta = second.subtitleMs - first.subtitleMs;
    const videoDelta = second.videoMs - first.videoMs;
    if (Math.abs(subtitleDelta) < 60000 || Math.abs(videoDelta) < 60000) {
      setSyncStatus("needsSecondAnchor");
      setSyncMessage(t.player.syncNeedLaterAnchor);
      return;
    }

    const factor = videoDelta / subtitleDelta;
    if (factor < 0.95 || factor > 1.05) {
      setSyncStatus("error");
      setSyncMessage(t.player.syncLineNotFound);
      return;
    }

    const communityOffset = activeSub.recommendedOffsetMs || 0;
    const driftRate = factor - 1;
    const nextManualOffset = Math.round(
      first.videoMs - first.subtitleMs * factor - communityOffset,
    );
    subtitleDriftRateRef.current = driftRate;
    manualOffsetMs.current = nextManualOffset;
    setSubtitleDriftRate(driftRate);
    setManualOffsetDisplayMs(nextManualOffset);
    setSyncStatus("applied");
    setSyncMessage(t.player.syncApplied);
    setSyncConfidence(95);
    await loadSubtitle(activeSub);
    saveSubtitleSyncVote(nextManualOffset);
  }

  async function resetSubtitleSync() {
    manualOffsetMs.current = 0;
    subtitleDriftRateRef.current = 0;
    driftAnchorsRef.current = [];
    setManualOffsetDisplayMs(0);
    setSubtitleDriftRate(0);
    setDriftAnchorCount(0);
    setSyncConfidence(0);
    setSyncStatus(activeSub ? "idle" : "error");
    setSyncMessage(activeSub ? t.player.syncReady : t.player.syncNoSubtitle);
    if (activeSub) {
      await loadSubtitle(activeSub);
      saveSubtitleSyncVote(0);
    }
  }

  function disableSubtitles() {
    const video = videoRef.current;
    if (video) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = "hidden";
      }
    }
    setActiveSub(null);
  }

  async function submitIntroMarker() {
    const video = videoRef.current;
    if (!video) return;
    if (introDraftStart == null) {
      setIntroDraftStart(Math.floor(video.currentTime));
      return;
    }
    const end = Math.floor(video.currentTime);
    if (end <= introDraftStart + 5) {
      setIntroDraftStart(null);
      return;
    }
    await fetch("/api/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_id: contentId,
        content_type: "episode",
        season_number: season,
        episode_number: episode,
        segment_type: "intro",
        start_sec: introDraftStart,
        end_sec: end,
      }),
    }).catch(() => {});
    setIntroDraftStart(null);
    setSegments((prev) =>
      prev ? { ...prev, needsCommunityVote: false } : prev,
    );
  }

  useEffect(() => {
    const onLeave = () => syncProgress();
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      syncProgress();
    };
  }, [syncProgress]);

  // ── Fetch streams with platform-aware default ────────────────────
  const fetchStreams = useCallback(async () => {
    setLoading(true);
    setError(null);
    resolveStartedAt.current = Date.now();
    firstFrameSent.current = false;
    try {
      const params = new URLSearchParams({
        tmdbId: contentId,
        type: type === "movie" ? "movie" : "episode",
        ...(season && { season: season.toString() }),
        ...(episode && { episode: episode.toString() }),
      });
      const res = await fetch(`/api/stream/resolve?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.streams?.length > 0) {
        setStreams(data.streams);
        sendPlaybackEvent("resolve_started");
        // Platform-aware default selection
        const cfg = getPlayerConfig(data.streams);
        const idx = data.streams.findIndex(
          (s: StreamResult) => s.url === cfg.stream.url,
        );
        setCurrentStreamIndex(idx >= 0 ? idx : 0);
      } else {
        setError(t.errors.noStreams);
      }
    } catch {
      setError(t.errors.streamFailed);
    } finally {
      setLoading(false);
    }
  }, [contentId, type, season, episode, sendPlaybackEvent, t]);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  // ── Refresh a stream URL from the server ─────────────────────────
  const refreshStreamUrl = useCallback(async (): Promise<string | null> => {
    const cs = streams[currentStreamIndex];
    if (!cs?.rdFileId || !cs?.rdTorrentId) return null;

    const isTranscode =
      cs.type === "hls" || cs.type === "dash" || cs.label?.includes("LiveMP4");
    try {
      const res = await fetch("/api/stream/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          torrentId: cs.rdTorrentId,
          fileId: cs.rdFileId,
          link: cs.rdLink,
          type: isTranscode ? "transcode" : "direct",
        }),
      });
      const data = await res.json();
      if (!res.ok) return null;

      if (isTranscode) {
        // Return the same variant we were using
        if (cs.label?.includes("LiveMP4") && data.liveMP4) return data.liveMP4;
        if (cs.type === "hls" && data.apple) return data.apple;
        if (cs.type === "dash" && data.dash) return data.dash;
        return data.liveMP4 || data.apple || data.dash || null;
      }
      return data.download || null;
    } catch {
      return null;
    }
  }, [streams, currentStreamIndex]);

  // ── Critical: resolveAndRetry ────────────────────────────────────
  const resolveAndRetry = useCallback(async () => {
    setIsChangingStream(true);
    setLastFallbackError(t.errors.refreshingStream || "Refreshing stream...");
    try {
      const params = new URLSearchParams({
        tmdbId: contentId,
        type: type === "movie" ? "movie" : "episode",
        ...(season && { season: season.toString() }),
        ...(episode && { episode: episode.toString() }),
      });
      const res = await fetch(`/api/stream/resolve?${params}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.streams?.length > 0) {
        setStreams(data.streams);
        firstFrameSent.current = false;
        const cfg = getPlayerConfig(data.streams);
        const idx = data.streams.findIndex(
          (s: StreamResult) => s.url === cfg.stream.url,
        );
        setCurrentStreamIndex(idx >= 0 ? idx : 0);
        setError(null);
      } else {
        setError(t.errors.noStreams);
      }
    } catch {
      setError(t.errors.streamFailed);
    } finally {
      setIsChangingStream(false);
    }
  }, [contentId, type, season, episode, t]);

  // ── Load video source ────────────────────────────────────────────
  useEffect(() => {
    const cs = streams[currentStreamIndex];
    if (!cs || !videoRef.current) return;
    const video = videoRef.current;
    video.volume = volume;
    video.playbackRate = playbackRate;

    // Destroy previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }
    setHlsLevels([]);
    setCurrentLevel(-1);

    setIsChangingStream(true);
    sendPlaybackEvent("variant_selected");

    const onFirstFrame = () => {
      if (firstFrameSent.current) return;
      firstFrameSent.current = true;
      sendPlaybackEvent("first_frame", {
        startup_ms: Date.now() - resolveStartedAt.current,
      });
    };
    video.addEventListener("loadeddata", onFirstFrame, { once: true });

    const cfg = getPlayerConfig([cs]);
    let hlsStallTimer: ReturnType<typeof setInterval> | null = null;
    let audioWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let ac3Cleanup: (() => void) | null = null;

    if (isRiskyDirectMkv(cs)) {
      audioWatchdogTimer = setTimeout(() => {
        if (cancelled) return;
        const audioStats = video as HTMLVideoElement & {
          webkitAudioDecodedByteCount?: number;
        };
        const decodedAudioBytes = audioStats.webkitAudioDecodedByteCount;
        if (
          typeof decodedAudioBytes === "number" &&
          decodedAudioBytes === 0 &&
          video.currentTime > 3 &&
          !video.paused &&
          !video.muted &&
          video.volume > 0
        ) {
          setLastFallbackError(t.player.audioIssueSwitching);
          tryNextFastDirectStream();
        }
      }, 9000);
    }

    if (featureFlags.current.mediabunnyAc3 && cs?.type !== "embed") {
      const startAc3 = (force = false) => {
        tryMediabunnyAc3(cs, force)
          .then((result) => {
            if (result === "failed")
              showFallbackPrompt("ac3", t.player.ac3Unsupported);
          })
          .catch(() => {
            showFallbackPrompt("ac3", t.player.ac3Unsupported);
          });
      };
      const onPlay = () => startAc3();
      const onPause = () => stopAc3Session();
      const onSeeking = () => startAc3(true);
      const onEnded = () => stopAc3Session();
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      video.addEventListener("seeking", onSeeking);
      video.addEventListener("ended", onEnded);
      if (!video.paused) startAc3();
      ac3Cleanup = () => {
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("seeking", onSeeking);
        video.removeEventListener("ended", onEnded);
        stopAc3Session();
      };
    }

    if (
      featureFlags.current.mediabunnyAc3 &&
      cs?.type !== "embed" &&
      cs?.isRealDebrid &&
      (cs.type !== "mp4" || isUnsupportedAudioCandidate(cs))
    ) {
      detectAudioCodec(cs)
        .then((codec) => {
          if (codec === "dts" || codec === "truehd") {
            setLastFallbackError(t.player.switchServerRequired);
            tryNextStream();
          }
        })
        .catch(() => {});
    }

    if (isHevcCandidate(cs) && cs.type === "dash") {
      tryHevcDash(cs, video)
        .then((attached) => {
          if (attached) {
            setIsChangingStream(false);
            safePlay();
            return;
          }
          showFallbackPrompt("hevc", t.player.hevcUnsupported);
        })
        .catch(() => {
          showFallbackPrompt("hevc", t.player.hevcUnsupported);
        });
    } else if (cfg.playerType === "hls.js" && cs.url.includes(".m3u8")) {
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          // Fallback: let native try
          video.src = cs.url;
          video.load();
          safePlay();
          return;
        }
        const startPos = (!hasResumed.current && lastKnownTime.current > 0) ? lastKnownTime.current : -1;
        if (startPos > 0) {
          hasResumed.current = true;
        }

        const hls = new Hls({
          startPosition: startPos,
          enableWorker: true,
          maxBufferLength: 15,
          maxMaxBufferLength: 30,
          maxBufferSize: 30 * 1000000,
          maxBufferHole: 0.8,
          abrEwmaDefaultEstimate: 500000,
          abrBandWidthFactor: 0.8,
          abrBandWidthUpFactor: 0.5,
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
          startLevel: -1,
        });
        hls.loadSource(cs.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          const levels = data.levels
            .map((l, i) => ({
              id: i,
              label: l.height ? `${l.height}p` : `Level ${i}`,
              height: l.height || 0
            }))
            .reverse();
          setHlsLevels(levels);
          
          // Auto choose highest quality
          if (levels.length > 0) {
            const highest = [...levels].sort((a, b) => b.height - a.height)[0];
            hls.currentLevel = highest.id;
            setQuality(highest.label);
          }

          selectPreferredHlsAudioTrack(hls, cs);
          setIsChangingStream(false);
          safePlay();
        });

        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
          selectPreferredHlsAudioTrack(hls, cs);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          setCurrentLevel(hls.autoLevelEnabled ? -1 : data.level);
        });

        hls.on(Hls.Events.ERROR, (_, d) => {
          if (d.fatal) {
            sendPlaybackEvent("stream_error", { error_code: d.type });
            if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // Try refreshing the URL first
              refreshStreamUrl()
                .then((fresh) => {
                  if (fresh && hlsRef.current) {
                    hlsRef.current.loadSource(fresh);
                  } else {
                    setLastFallbackError(`Network error — switching server...`);
                    tryNextStream();
                  }
                })
                .catch(() => tryNextStream());
            } else {
              setLastFallbackError(`Error: ${d.type} — switching...`);
              tryNextStream();
            }
          }
        });
        hlsRef.current = hls;
        let lastPos = 0;
        let stallCount = 0;
        hlsStallTimer = setInterval(() => {
          if (video.paused) {
            stallCount = 0;
            return;
          }
          if (video.currentTime === lastPos) {
            stallCount++;
            if (stallCount >= 3 && hls.autoLevelEnabled) {
              hls.currentLevel = Math.max(0, hls.currentLevel - 1);
              stallCount = 0;
            }
          } else {
            stallCount = 0;
          }
          lastPos = video.currentTime;
        }, 5000);
      });
    } else if (cfg.playerType === "dash.js") {
      import("dashjs")
        .then(({ MediaPlayer }) => {
          if (cancelled) return;
          const player = MediaPlayer().create();
          player.initialize(video, cs.url, true);
          dashRef.current = player;
          setIsChangingStream(false);
          safePlay();
        })
        .catch(() => {
          setLastFallbackError(`DASH error — switching...`);
          tryNextStream();
        });
    } else if (cfg.playerType === "native-hls") {
      // Native HLS (Safari iOS)
      video.src = cs.url;
      video.load();
      const onCanPlay = () => {
        setIsChangingStream(false);
        safePlay();
      };
      video.addEventListener("canplay", onCanPlay, { once: true });
    } else {
      // Direct MP4/MKV
      video.src = cs.url;
      video.load();
      const onCanPlay = () => {
        setIsChangingStream(false);
        safePlay();
      };
      video.addEventListener("canplay", onCanPlay, { once: true });
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", onFirstFrame);
      if (hlsStallTimer) clearInterval(hlsStallTimer);
      if (audioWatchdogTimer) clearTimeout(audioWatchdogTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        dashRef.current.reset();
        dashRef.current = null;
      }
      if (ac3Cleanup) ac3Cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams, currentStreamIndex]);

  // ── Background URL refresh timer ─────────────────────────────────
  useEffect(() => {
    const cs = streams[currentStreamIndex];
    if (!cs?.rdFileId || !cs?.rdTorrentId) return;

    const isTranscode =
      cs.type === "hls" || cs.type === "dash" || cs.label?.includes("LiveMP4");
    const intervalMs = isTranscode ? 3.5 * 60 * 60 * 1000 : 7 * 60 * 60 * 1000;

    const timer = setInterval(() => {
      refreshStreamUrl()
        .then((fresh) => {
          if (!fresh || !videoRef.current) return;
          const video = videoRef.current;
          const current = video.currentTime;

          if (hlsRef.current) {
            hlsRef.current.loadSource(fresh);
          } else {
            video.src = fresh;
          }
          video.currentTime = current;
        })
        .catch(() => {});
    }, intervalMs);

    refreshTimerRef.current = timer;
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [streams, currentStreamIndex, refreshStreamUrl]);

  // ── Cross-Server sync ────────────────────────────────────────────
  useEffect(() => {
    if (previousStreamIndex.current !== currentStreamIndex) {
      previousStreamIndex.current = currentStreamIndex;
      hasResumed.current = false;

      const cs = streams[currentStreamIndex];
      if (cs?.type === "embed") {
        setIsChangingStream(false);
      } else {
        setIsChangingStream(true);
      }
    }
  }, [currentStreamIndex, streams]);

  // ── Embed Progress Listener ──────────────────────────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle progress from various embed players (vidsrc, playimdb, etc.)
      const data = event.data;
      if (data?.type === "MEDIA_PROGRESS" || data?.event === "timeupdate") {
        const time = data.currentTime || data.time || data.data?.time;
        const duration = data.duration || data.data?.duration;
        
        if (typeof time === "number") {
          lastKnownTime.current = time;
          setCurrentTime(time);
          if (duration) setDuration(duration);
          
          // Throttle sync to database
          const now = Date.now();
          if (now - lastSyncTimeRef.current > 5000) {
            lastSyncTimeRef.current = now;
            syncProgress(time, duration);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [syncProgress]);

  // ── Resume playback ──────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onReady = () => {
      if (!hasResumed.current && lastKnownTime.current > 0) {
        video.currentTime = lastKnownTime.current;
        hasResumed.current = true;
      }
      setIsChangingStream(false);
    };
    video.addEventListener("canplay", onReady);
    return () => video.removeEventListener("canplay", onReady);
  }, [currentStreamIndex]);

  // ── Time tracking ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      if (!isScrubbing) {
        setCurrentTime(video.currentTime);
        if (video.currentTime > 0) lastKnownTime.current = video.currentTime;

        if (segments?.intro) {
          setShowSkipIntro(
            video.currentTime >= segments.intro.start_sec &&
              video.currentTime <= segments.intro.end_sec,
          );
        }
        if (segments?.outro) {
          setShowNextEpisodeBtn(video.currentTime >= segments.outro.start_sec);
        } else if (
          video.duration > 0 &&
          video.currentTime >= video.duration - 30
        ) {
          setShowNextEpisodeBtn(true);
        } else {
          setShowNextEpisodeBtn(false);
        }
      }
    };
    const onDur = () => setDuration(video.duration);
    const onBuf = () => {
      if (video.buffered.length > 0)
        setBuffered(video.buffered.end(video.buffered.length - 1));
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      syncProgress();
    };
    const onEnded = () => {
      setIsEnded(true);
      sendPlaybackEvent("ended");
    };
    const onWaiting = () => {
      if (!bufferingStartedAt.current) {
        bufferingStartedAt.current = Date.now();
        sendPlaybackEvent("buffering_start");
      }
      setIsBuffering(true);
    };
    const onPlaying = () => {
      if (bufferingStartedAt.current) {
        sendPlaybackEvent("buffering_end", {
          buffering_ms: Date.now() - bufferingStartedAt.current,
        });
        bufferingStartedAt.current = null;
      }
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const onStalled = () => {
      if (!bufferingStartedAt.current) {
        bufferingStartedAt.current = Date.now();
        sendPlaybackEvent("buffering_start");
      }
      setIsBuffering(true);
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("durationchange", onDur);
    video.addEventListener("progress", onBuf);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("durationchange", onDur);
      video.removeEventListener("progress", onBuf);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("ended", onEnded);
    };
  }, [isScrubbing, sendPlaybackEvent, syncProgress, segments]);

  function tryNextFastDirectStream() {
    sendPlaybackEvent("fallback", {
      from_index: currentStreamIndex,
      reason: "audio_watchdog",
    });
    const nextDirectIndex = streams.findIndex(
      (stream, index) =>
        index > currentStreamIndex &&
        stream.variant === "direct" &&
        !isUnsupportedAudioCandidate(stream),
    );
    if (nextDirectIndex >= 0) {
      setCurrentStreamIndex(nextDirectIndex);
      return;
    }
    tryNextStream();
  }

  // ── tryNextStream: with resolveAndRetry fallback ─────────────────
  function tryNextStream() {
    sendPlaybackEvent("fallback", { from_index: currentStreamIndex });
    if (currentStreamIndex < streams.length - 1) {
      setCurrentStreamIndex((i) => i + 1);
    } else {
      // Exhausted all variants — try resolving fresh streams
      resolveAndRetry();
    }
  }

  // ── Controls visibility ──────────────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused)
        setControlsVisible(false);
    }, 3000);
  }, []);

  // ── Touch gestures ───────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    setTouchStartTime(Date.now());
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const x = touch.clientX;
    const y = touch.clientY;

    // Multi-tap detector
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300) {
      const now = Date.now();
      const timeSince = now - lastTapTime.current;
      if (timeSince < 400) {
        tapCount.current += 1;
      } else {
        tapCount.current = 1;
      }
      lastTapTime.current = now;

      // Double tap in left 30%: seek backward 10s
      if (tapCount.current === 2 && x < width * 0.3) {
        if (videoRef.current) videoRef.current.currentTime -= 10;
        tapCount.current = 0;
        return;
      }
      // Double tap in right 30%: seek forward 10s
      if (tapCount.current === 2 && x > width * 0.7) {
        if (videoRef.current) videoRef.current.currentTime += 10;
        tapCount.current = 0;
        return;
      }
      // Double tap in center: toggle fullscreen
      if (tapCount.current === 2) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          containerRef.current?.requestFullscreen();
        }
        tapCount.current = 0;
        return;
      }
      // Single tap: show controls + toggle play/pause if in center
      showControls();
      if (
        x > width * 0.3 &&
        x < width * 0.7 &&
        y > height * 0.3 &&
        y < height * 0.7
      ) {
        safeToggle();
      }
      return;
    }

    // Horizontal swipe: seek
    if (Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx)) {
      if (dx > 50 && videoRef.current) videoRef.current.currentTime -= 10;
      if (dx < -50 && videoRef.current) videoRef.current.currentTime += 10;
      return;
    }

    // Vertical swipe: volume (right side) or brightness (left side) - volume only for now
    if (Math.abs(dy) > 30 && Math.abs(dx) < Math.abs(dy)) {
      const video = videoRef.current;
      if (!video) return;
      if (x > width * 0.5) {
        video.volume = Math.min(
          1,
          Math.max(0, video.volume + (dy < 0 ? 0.1 : -0.1)),
        );
        setVolume(video.volume);
      }
      return;
    }
  };

  // ── Keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const video = videoRef.current;
      if (!video) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          safeToggle();
          break;
        case "ArrowRight":
          video.currentTime += 10;
          break;
        case "ArrowLeft":
          video.currentTime -= 10;
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          break;
        case "KeyF":
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            containerRef.current?.requestFullscreen();
          }
          break;
        case "KeyM":
          video.muted = !video.muted;
          break;
        case "KeyJ":
          adjustSubtitleOffset(-250);
          break;
        case "KeyK":
          adjustSubtitleOffset(250);
          break;
      }
      showControls();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showControls, setVolume, safeToggle, adjustSubtitleOffset]);

  useEffect(() => {
    const cb = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", cb);
    return () => document.removeEventListener("fullscreenchange", cb);
  }, []);

  // ── Progress bar ─────────────────────────────────────────────────
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const handleProgressMouseDown = () => setIsScrubbing(true);
  const handleProgressMouseUp = () => setIsScrubbing(false);

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (isScrubbing) {
      videoRef.current.currentTime = pct * duration;
      setCurrentTime(pct * duration);
    }

    handleProgressHover(e);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressBarRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
    hoverRafRef.current = requestAnimationFrame(() => {
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      const time = pct * duration;
      const x = e.clientX - rect.left;
      if (hoverTooltipRef.current) {
        hoverTooltipRef.current.style.display = "block";
        hoverTooltipRef.current.style.left = `${x}px`;
        hoverTooltipRef.current.textContent = formatTime(time);
      }
      if (hoverIndicatorRef.current) {
        hoverIndicatorRef.current.style.left = `${x}px`;
      }
    });
  };

  const handleProgressLeave = () => {
    if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
    if (hoverTooltipRef.current) hoverTooltipRef.current.style.display = "none";
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const cs = streams[currentStreamIndex];

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={`relative bg-black flex-1 flex flex-col select-none w-full h-full overflow-hidden`}
      onMouseMove={showControls}
      onTouchStart={(e) => {
        handleTouchStart(e);
        showControls();
      }}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: controlsVisible ? "default" : "none" }}
    >
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="text-center flex flex-col items-center gap-5">
            <Image
              src="/logo.png"
              alt="مشهد"
              width={96}
              height={96}
              className="w-24 h-24 animate-pulse"
            />
            <div className="w-32 h-0.5 bg-white/10 rounded-full overflow-hidden">
              <div className="w-full h-full bg-linear-to-r from-transparent via-[#E50914] to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
            </div>
            <p className="text-[#666] text-sm">{t.player.searchingStreams}</p>
          </div>
        </div>
      )}

      {/* Stream-switching spinner */}
      {isChangingStream && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 pointer-events-none">
          <div className="text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-[#E50914] animate-spin" />
            {lastFallbackError && (
              <p className="text-xs text-[#666] animate-pulse">
                {lastFallbackError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Buffering spinner */}
      {isBuffering && !isChangingStream && isPlaying && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 pointer-events-none">
          <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-[#E50914] animate-spin shadow-2xl" />
        </div>
      )}

      {/* ASS Subtitle Warning */}
      <AnimatePresence>
        {showAssWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-yellow-600/90 text-black text-xs px-4 py-2 rounded-xl backdrop-blur-md"
          >
            {lang === "ar"
              ? "قد لا تُعرض الترجمة بتنسيق ASS (الأنمي) بشكل صحيح"
              : "ASS subtitles (anime) may not render correctly"}
            <button
              onClick={() => setShowAssWarning(false)}
              className="ml-2 font-bold"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <div className="text-center max-w-md px-6">
            <div className="text-5xl mb-4">😔</div>
            <h2 className="text-xl font-bold mb-2">{t.player.failedToLoad}</h2>
            <p className="text-[#B3B3B3] mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => resolveAndRetry()}
                className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors"
              >
                {lang === "ar" ? "إعادة المحاولة" : "Retry"}
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
              >
                {t.player.goBack}
              </button>
            </div>
          </div>
        </div>
      )}

      {fallbackPrompt && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <div className="text-center max-w-md px-6">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold mb-2">
              {t.player.switchServerRequired}
            </h2>
            <p className="text-[#B3B3B3] mb-6">{fallbackPrompt.message}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  clearFallbackPrompt();
                  tryNextStream();
                }}
                className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors"
              >
                {t.player.switchServer}
              </button>
              <button
                onClick={() => {
                  clearFallbackPrompt();
                }}
                className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
              >
                {t.player.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video or Embed */}
      {cs?.type === "embed" ? (
          <iframe
            src={cs.url}
            width="100%"
            height="100%"
            className="absolute inset-0 w-full h-full border-0 bg-black z-10"
            allowFullScreen
            referrerPolicy="origin"
            sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts"
            onLoad={(e) => {
              // When iframe loads, try to send our saved state to it
              const iframe = e.currentTarget;
              if (!iframe.contentWindow) return;
              
              // 1. Set Arabic subtitles preference
              iframe.contentWindow.postMessage({ type: "STORAGE_SET", key: "lastSubLang", value: "ara" }, "*");
              
              // 2. Try to resume from our database time
              if (lastKnownTime.current > 0) {
                iframe.contentWindow.postMessage({ 
                  type: "SEEK", 
                  data: lastKnownTime.current 
                }, "*");
              }
            }}
          />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          onError={() => {
            sendPlaybackEvent("stream_error", { error_code: "media_error" });
            if (isHevcCandidate(cs)) {
              showFallbackPrompt("hevc", t.player.hevcUnsupported);
            } else if (isAc3Candidate(cs)) {
              showFallbackPrompt("ac3", t.player.ac3Unsupported);
            } else {
              tryNextStream();
            }
          }}
          playsInline
          controls={false}
          preload="metadata"
        >
          <track ref={trackRef} kind="subtitles" default />
        </video>
      )}

      {/* Post Playback Screen */}
      {isEnded && (
        <PostPlaybackScreen
          type={type === "movie" ? "movie" : "tv"}
          seriesId={contentId}
          currentSeason={season}
          currentEpisode={episode}
          autoPlayNext={true}
        />
      )}

      {/* Skip Intro Button */}
      {showSkipIntro && !isEnded && (
        <div className="absolute bottom-32 right-8 z-40">
          <button
            onClick={() => {
              if (videoRef.current && segments?.intro) {
                videoRef.current.currentTime = segments.intro.end_sec;
              }
            }}
            className="bg-white text-black font-bold px-6 py-2 rounded-xl hover:bg-white/90 hover:scale-105 transition-all shadow-2xl"
          >
            {t.nav?.skipIntro ||
              (lang === "ar" ? "تخطي المقدمة" : "Skip Intro")}
          </button>
        </div>
      )}

      {segments?.needsCommunityVote &&
        !segments.intro &&
        !isEnded &&
        type === "tv" &&
        currentTime < 420 && (
          <div className="absolute bottom-32 left-8 z-40">
            <button
              onClick={submitIntroMarker}
              className="bg-black/70 text-white border border-white/20 font-bold px-4 py-2 rounded-xl hover:bg-white/15 transition-all shadow-2xl backdrop-blur-md"
            >
              {introDraftStart == null
                ? t.player.markIntroStart
                : t.player.markIntroEnd}
            </button>
          </div>
        )}

      {/* Next Episode Button */}
      {showNextEpisodeBtn && !isEnded && type === "tv" && (
        <div className="absolute bottom-32 right-8 z-40 flex gap-4">
          <button
            onClick={() => setIsEnded(true)}
            className="bg-white text-black font-bold px-6 py-2 rounded-xl hover:bg-white/90 hover:scale-105 transition-all shadow-2xl"
          >
            {lang === "ar" ? "الحلقة القادمة" : "Next Episode"}
          </button>
        </div>
      )}


      {/* RD Warning Banner */}
      {cs?.isRealDebrid && !loading && !error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-yellow-500/90 backdrop-blur-md text-black px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {lang === 'ar' ? 'سيرفر غير مستحسن - قد يكون بطيئاً' : 'Not Recommended Server - May be slow'}
        </div>
      )}


      {/* Controls */}
      <AnimatePresence>
        {controlsVisible && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-between z-40"
          >
            {/* Top bar */}
            <div
              className={`bg-linear-to-b from-black/80 to-transparent p-4 flex items-center gap-3 ${cs?.type === "embed" ? "pointer-events-auto" : ""}`}
            >
              <button
                onClick={() => router.back()}
                className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="flex-1" />
              {/* Subtitle selector */}
              {cs?.type !== "embed" && (
                <div className="flex items-center gap-2">
                  {/* HLS Quality Selector */}
                  {hlsLevels.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowLevelMenu((s) => !s);
                          setSubtitleMenuOpen(false);
                          setServerMenuOpen(false);
                        }}
                        className="px-3 py-2 rounded-full backdrop-blur-md bg-white/10 text-white text-xs hover:bg-white/20 transition-all flex items-center gap-1.5"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 2v20M2 12h20M2 12l5-5m0 10l-5-5m20 0l-5-5m0 10l5-5" />
                        </svg>
                        {currentLevel === -1
                          ? "Auto"
                          : hlsLevels.find((l) => l.id === currentLevel)
                              ?.label || "Auto"}
                      </button>
                      <AnimatePresence>
                        {showLevelMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            className="absolute right-0 top-12 w-32 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-50 border border-white/10"
                          >
                            <button
                              onClick={() => {
                                if (hlsRef.current)
                                  hlsRef.current.currentLevel = -1;
                                setShowLevelMenu(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-xs transition-all ${currentLevel === -1 ? "bg-[#E50914]/20 text-white" : "text-[#B3B3B3] hover:bg-white/5 hover:text-white"}`}
                            >
                              Auto
                            </button>
                            {hlsLevels.map((level) => (
                              <button
                                key={level.id}
                                onClick={() => {
                                  if (hlsRef.current)
                                    hlsRef.current.currentLevel = level.id;
                                  setShowLevelMenu(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-xs transition-all ${currentLevel === level.id ? "bg-[#E50914]/20 text-white" : "text-[#B3B3B3] hover:bg-white/5 hover:text-white"}`}
                              >
                                {level.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Subtitle button — hidden when EgyDead is active (subtitles baked in) */}
                  {!isEgyDead && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setSubtitleMenuOpen((s) => !s);
                        setServerMenuOpen(false);
                        setShowLevelMenu(false);
                      }}
                      className={`px-4 py-2 rounded-full backdrop-blur-md text-sm hover:bg-white/20 transition-all flex items-center gap-2 ${activeSub ? "bg-[#E50914]/30 text-white" : "bg-white/10 text-white"}`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M7 12h4m-2 3h6" />
                      </svg>
                      {activeSub
                        ? activeSub.language === "ar"
                          ? "العربية"
                          : activeSub.language === "en"
                            ? "English"
                            : activeSub.language
                        : t.player.noSubtitles}
                    </button>
                    <AnimatePresence>
                      {subtitleMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          className="absolute right-0 top-12 w-72 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-50 border border-white/10 max-h-80 overflow-y-auto"
                        >
                          <div className="px-4 py-2 text-xs text-[#666] uppercase tracking-wider border-b border-white/10">
                            {t.player.subtitles || "Subtitles"}
                          </div>
                          <button
                            onClick={() => {
                              disableSubtitles();
                              setSubtitleMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center gap-2 ${!activeSub ? "bg-[#E50914]/20 text-white" : "text-[#B3B3B3] hover:bg-white/5 hover:text-white"}`}
                          >
                            {!activeSub && (
                              <span className="w-2 h-2 rounded-full bg-[#E50914]" />
                            )}
                            {t.player.noSubtitles}
                          </button>

                          <div className="m-3 rounded-xl border border-white/10 bg-white/4 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-white">
                                  {t.player.syncLab}
                                </div>
                                <div
                                  className={`text-[10px] ${syncStatus === "error" ? "text-red-300" : syncStatus === "applied" ? "text-green-300" : "text-[#888]"}`}
                                >
                                  {syncMessage ||
                                    (activeSub
                                      ? t.player.syncReady
                                      : t.player.syncNoSubtitle)}
                                </div>
                              </div>
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${syncStatus === "analyzing" ? "bg-yellow-400 animate-pulse" : syncStatus === "applied" ? "bg-green-400" : syncStatus === "error" ? "bg-red-400" : "bg-white/25"}`}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-[10px] text-[#888]">
                              <div className="rounded-lg bg-black/30 px-2 py-1.5">
                                <div>{t.player.syncCurrentOffset}</div>
                                <div className="text-white font-bold">
                                  {formatSignedMs(manualOffsetDisplayMs)}
                                </div>
                              </div>
                              <div className="rounded-lg bg-black/30 px-2 py-1.5">
                                <div>{t.player.syncCurrentDrift}</div>
                                <div className="text-white font-bold">
                                  {(subtitleDriftRate * 100).toFixed(3)}%
                                </div>
                              </div>
                              <div className="rounded-lg bg-black/30 px-2 py-1.5">
                                <div>{t.player.syncConfidence}</div>
                                <div className="text-white font-bold">
                                  {syncConfidence}%
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-[#777]">
                              <span>{t.player.syncAnchorProgress}</span>
                              <span>{driftAnchorCount}/2</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-[#E50914] transition-all"
                                style={{
                                  width: `${Math.min(100, driftAnchorCount * 50)}%`,
                                }}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={alignCurrentSubtitleLine}
                                disabled={
                                  !activeSub || syncStatus === "analyzing"
                                }
                                className="rounded-lg bg-white/10 px-2 py-2 text-[10px] text-white hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 transition-colors"
                              >
                                {t.player.syncAlignCurrentLine}
                              </button>
                              <button
                                onClick={addDriftAnchor}
                                disabled={
                                  !activeSub || syncStatus === "analyzing"
                                }
                                className="rounded-lg bg-white/10 px-2 py-2 text-[10px] text-white hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 transition-colors"
                              >
                                {t.player.syncAddDriftAnchor}
                              </button>
                            </div>
                            <button
                              onClick={resetSubtitleSync}
                              disabled={
                                !activeSub || syncStatus === "analyzing"
                              }
                              className="w-full rounded-lg bg-black/30 px-2 py-2 text-[10px] text-[#B3B3B3] hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-black/30 transition-colors"
                            >
                              {t.player.syncReset}
                            </button>
                          </div>

                          {subsLoading && (
                            <div className="px-4 py-3 text-sm text-[#666]">
                              جاري البحث...
                            </div>
                          )}
                          {subtitles.map((s, i) => (
                            <button
                              key={`${s.fileId}-${s.language}`}
                              onClick={() => {
                                loadSubtitle(s);
                                setSubtitleMenuOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-all ${activeSub?.fileId === s.fileId ? "bg-[#E50914]/20 text-white" : "text-[#B3B3B3] hover:bg-white/5 hover:text-white"}`}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 min-w-0">
                                  {activeSub?.fileId === s.fileId && (
                                    <span className="w-2 h-2 rounded-full bg-[#E50914] shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {s.uploaderName}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${s.language === "ar" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}
                                  >
                                    {s.language === "ar" ? "AR" : "EN"}
                                  </span>
                                  {i === 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E50914]/30 text-[#E50914] shrink-0">
                                      {t.player.bestMatch}
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-[#555] shrink-0">
                                  {s.syncScore != null && s.syncScore > 0
                                    ? `⚡${s.syncScore}`
                                    : `⬇${s.downloadCount}`}
                                </span>
                              </span>
                              {s.fileName && (
                                <p className="text-[10px] text-[#444] truncate mt-0.5 ml-4">
                                  {s.fileName
                                    .replace(/\.[^.]+$/, "")
                                    .substring(0, 50)}
                                </p>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  )} {/* end !isEgyDead subtitle button */}
                </div>
              )}
              {/* Server selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setServerMenuOpen((s) => !s);
                    setSubtitleMenuOpen(false);
                  }}
                  className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm hover:bg-white/20 transition-all flex items-center gap-2"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="2" width="20" height="8" rx="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" />
                    <circle cx="6" cy="6" r="1" fill="currentColor" />
                    <circle cx="6" cy="18" r="1" fill="currentColor" />
                  </svg>
                  {cs?.label || t.player.servers}
                </button>
                <AnimatePresence>
                  {serverMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 top-12 w-64 bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden z-50 border border-white/10 max-h-80 overflow-y-auto"
                    >
                      <div className="px-4 py-2 text-xs text-[#666] uppercase tracking-wider border-b border-white/10">
                        {t.player.availableStreams}
                      </div>
                      {streams.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setCurrentStreamIndex(i);
                            setServerMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center justify-between gap-2 ${
                            i === currentStreamIndex
                              ? "bg-[#E50914]/20 text-white"
                              : "text-[#B3B3B3] hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {i === currentStreamIndex && (
                              <span className="w-2 h-2 rounded-full bg-[#E50914] animate-pulse" />
                            )}
                            {s.label}
                          </span>
                          <span className="flex items-center gap-1">
                            {s.server === 'egydead' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                                {lang === 'ar' ? 'مستحسن' : 'Recommended'}
                              </span>
                            )}
                            {s.isRealDebrid && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300">
                                {lang === 'ar' ? 'غير مستحسن' : 'Not Recommended'}
                              </span>
                            )}
                            {s.verifiedMatch && !s.isRealDebrid && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-300">
                                {t.player.verifiedSource}
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                s.variant === "hls"
                                  ? "bg-yellow-500/15 text-yellow-300"
                                  : "bg-white/10 text-white/80"
                              }`}
                            >
                              {s.variant === "liveMp4"
                                ? t.player.liveStream
                                : s.variant === "direct"
                                  ? t.player.directStream
                                  : s.variant === "hls"
                                    ? t.player.hlsFallback
                                    : s.variant || s.type}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                              {s.quality}
                            </span>
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Center play/pause */}
            {cs?.type !== "embed" && (
              <div
                className="flex-1 flex items-center justify-center"
                onClick={safeToggle}
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-black/60 transition-all"
                >
                  {isPlaying ? (
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <polygon points="6,4 20,12 6,20" />
                    </svg>
                  )}
                </motion.div>
              </div>
            )}

            {/* Bottom controls */}
            {cs?.type !== "embed" ? (
              <div className="bg-linear-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-16 z-20 relative">
                {/* Progress bar */}
                <div className="group relative mb-3">
                  <div
                    ref={hoverTooltipRef}
                    className="absolute bottom-8 px-2 py-1 bg-black/90 rounded text-xs text-white pointer-events-none transform -translate-x-1/2 z-10"
                    style={{ display: "none" }}
                  />
                  <div
                    ref={progressBarRef}
                    className="relative w-full h-1 group-hover:h-2 bg-white/20 rounded-full cursor-pointer transition-all duration-200"
                    onClick={handleProgressClick}
                    // safari needs touch-action: none for reliable touch scrubbing
                    style={{ touchAction: "none" }}
                    onMouseDown={handleProgressMouseDown}
                    onMouseUp={handleProgressMouseUp}
                    onMouseMove={handleProgressMouseMove}
                    onMouseLeave={handleProgressLeave}
                    onTouchStart={(e) => {
                      const rect =
                        progressBarRef.current?.getBoundingClientRect();
                      if (!rect || !videoRef.current) return;
                      const pct = Math.max(
                        0,
                        Math.min(
                          1,
                          (e.touches[0].clientX - rect.left) / rect.width,
                        ),
                      );
                      videoRef.current.currentTime = pct * duration;
                      setCurrentTime(pct * duration);
                      setIsScrubbing(true);
                    }}
                    onTouchMove={(e) => {
                      if (!isScrubbing) return;
                      const rect =
                        progressBarRef.current?.getBoundingClientRect();
                      if (!rect || !videoRef.current) return;
                      const pct = Math.max(
                        0,
                        Math.min(
                          1,
                          (e.touches[0].clientX - rect.left) / rect.width,
                        ),
                      );
                      videoRef.current.currentTime = pct * duration;
                      setCurrentTime(pct * duration);
                    }}
                    onTouchEnd={() => setIsScrubbing(false)}
                  >
                    <div
                      className="absolute top-0 left-0 h-full bg-white/30 rounded-full pointer-events-none"
                      style={{ width: `${bufPct}%` }}
                    />
                    <div
                      className="absolute top-0 left-0 h-full bg-[#E50914] rounded-full pointer-events-none"
                      style={{ width: `${pct}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 group-hover:w-4 group-hover:h-4 bg-[#E50914] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
                      style={{ left: `calc(${pct}% - 6px)` }}
                    />
                  </div>
                </div>

                {/* Time + buttons */}
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={safeToggle}
                    className="w-11 h-11 flex items-center justify-center text-white hover:text-[#E50914] transition-colors"
                    aria-label="Play/Pause"
                  >
                    {isPlaying ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <polygon points="6,4 20,12 6,20" />
                      </svg>
                    )}
                  </button>

                  {/* Seek back */}
                  <button
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime -= 10;
                    }}
                    className="w-11 h-11 flex items-center justify-center text-white hover:text-[#E50914] transition-colors"
                    title="Rewind 10s"
                    aria-label="Rewind"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12.5 8L8 12l4.5 4" />
                      <path d="M20 12a8 8 0 1 0-3 6.3" />
                      <text
                        x="12"
                        y="16"
                        fill="currentColor"
                        fontSize="6"
                        textAnchor="middle"
                        stroke="none"
                      >
                        10
                      </text>
                    </svg>
                  </button>

                  {/* Seek forward */}
                  <button
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime += 10;
                    }}
                    className="w-11 h-11 flex items-center justify-center text-white hover:text-[#E50914] transition-colors"
                    title="Forward 10s"
                    aria-label="Forward"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11.5 8L16 12l-4.5 4" />
                      <path d="M4 12a8 8 0 1 0 3 6.3" />
                      <text
                        x="12"
                        y="16"
                        fill="currentColor"
                        fontSize="6"
                        textAnchor="middle"
                        stroke="none"
                      >
                        10
                      </text>
                    </svg>
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-1 group/vol">
                    <button
                      onClick={() => {
                        if (videoRef.current)
                          videoRef.current.muted = !videoRef.current.muted;
                      }}
                      className="w-11 h-11 flex items-center justify-center text-white hover:text-[#E50914] transition-colors"
                      aria-label="Mute"
                    >
                      {volume > 0.5 ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                          <path
                            d="M15.54 8.46a5 5 0 0 1 0 7.07"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M19.07 4.93a10 10 0 0 1 0 14.14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      ) : volume > 0 ? (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                          <path
                            d="M15.54 8.46a5 5 0 0 1 0 7.07"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                          <line
                            x1="23"
                            y1="9"
                            x2="17"
                            y2="15"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <line
                            x1="17"
                            y1="9"
                            x2="23"
                            y2="15"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setVolume(v);
                        if (videoRef.current) videoRef.current.volume = v;
                      }}
                      className="w-0 group-hover/vol:w-20 transition-all duration-300 accent-[#E50914] cursor-pointer overflow-hidden"
                    />
                  </div>

                  {/* Time display */}
                  <span className="text-white/80 text-xs font-mono tabular-nums tracking-tight">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  <div className="flex-1" />

                  {/* Speed */}
                  <select
                    value={playbackRate}
                    onChange={(e) => {
                      const r = Number(e.target.value);
                      setPlaybackRate(r);
                      if (videoRef.current) videoRef.current.playbackRate = r;
                    }}
                    className="bg-transparent text-white text-xs rounded px-2 py-1 outline-none hover:bg-white/10 transition-colors cursor-pointer appearance-none"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                      <option key={r} value={r} className="bg-black">
                        {r}x
                      </option>
                    ))}
                  </select>

                  {/* Fullscreen */}
                  <button
                    onClick={() =>
                      document.fullscreenElement
                        ? document.exitFullscreen()
                        : containerRef.current?.requestFullscreen()
                    }
                    className="w-11 h-11 flex items-center justify-center text-white hover:text-[#E50914] transition-colors"
                    aria-label="Fullscreen"
                  >
                    {isFullscreen ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-linear-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-16 z-20 relative pointer-events-none">
                <div className="flex items-center justify-end p-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (document.fullscreenElement) {
                        document.exitFullscreen();
                      } else {
                        containerRef.current?.requestFullscreen();
                      }
                    }}
                    className="w-12 h-12 flex items-center justify-center text-white hover:text-[#E50914] transition-all hover:scale-110 pointer-events-auto bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-2xl active:scale-90"
                  >
                    {isFullscreen ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Back Button for Embeds */}
      {cs?.type === "embed" && (
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-50 w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all hover:scale-110"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}
      {/* Upgrade Overlay */}
      <UpgradeOverlay isLimitReached={usageState.limitReached} />
    </div>
  );
}
