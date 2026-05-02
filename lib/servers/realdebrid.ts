import type {
  StreamCandidate,
  StreamResult,
  ServerAdapter,
  StreamVariant,
} from "@/types/stream";

const RD_BASE = "https://api.real-debrid.com/rest/1.0";

const extIdCache = new Map<string, string>();

interface TorrentioStream {
  name?: string;
  title?: string;
  infoHash?: string;
  fileIdx?: number;
  behaviorHints?: {
    filename?: string;
    videoSize?: number;
    bingeGroup?: string;
  };
}

interface RDFiles {
  id: number;
  path: string;
  bytes: number;
  selected: number;
}

interface RDInfo {
  id: string;
  filename?: string;
  files?: RDFiles[];
  links?: string[];
}

export interface RDTranscodeResult {
  apple?: { full: string };
  dash?: { full: string };
  liveMP4?: { full: string };
  h264WebM?: { full: string };
}

function getRealDebridToken(): string | undefined {
  return process.env.REALDEBRID_API_TOKEN || process.env.RD_API_TOKEN;
}

function getQuality(text?: string): string {
  const lower = text?.toLowerCase() || "";
  if (lower.includes("2160p") || lower.includes("4k")) return "2160p";
  if (lower.includes("1080p")) return "1080p";
  if (lower.includes("720p")) return "720p";
  if (lower.includes("480p")) return "480p";
  return "auto";
}

function getContainer(text?: string): string | undefined {
  return text
    ?.match(/\.(mkv|mp4|m4v|webm|avi|mov)(?:$|\?|\s)/i)?.[1]
    ?.toLowerCase();
}

function getVideoCodec(text?: string): string | undefined {
  const lower = text?.toLowerCase() || "";
  if (lower.includes("av1")) return "av1";
  if (
    lower.includes("hevc") ||
    lower.includes("x265") ||
    lower.includes("h265")
  )
    return "h265";
  if (lower.includes("x264") || lower.includes("h264") || lower.includes("avc"))
    return "h264";
  return undefined;
}

function getAudioCodec(text?: string): string | undefined {
  const lower = text?.toLowerCase() || "";
  if (lower.includes("truehd")) return "truehd";
  if (lower.includes("dts")) return "dts";
  if (lower.includes("eac3") || lower.includes("ddp") || lower.includes("dd+"))
    return "eac3";
  if (lower.includes("ac3")) return "ac3";
  if (lower.includes("atmos")) return "eac3";
  if (lower.includes("aac")) return "aac";
  return undefined;
}

function getSeeders(text?: string): number | undefined {
  const lower = text?.toLowerCase() || "";
  const match =
    lower.match(/(?:seeders|seeds|👤|👥|se)\s*[:\-]?\s*(\d{1,6})/) ||
    lower.match(/\b(\d{1,6})\s*(?:seeders|seeds|👤|👥)\b/);
  return match ? Number(match[1]) : undefined;
}

type AudioSignalSource = "release" | "filename" | "combined" | "unknown";

interface AudioSignals {
  languages: string[];
  selectedLanguage?: string;
  confidence: number;
  source: AudioSignalSource;
  isDubbed: boolean;
  dubPenalty: number;
  scoreBoost: number;
  hasMultiMarker: boolean;
  hasDubMarker: boolean;
}

const LANGUAGE_TAGS: Record<string, string> = {
  en: "en",
  eng: "en",
  english: "en",
  fr: "fr",
  fre: "fr",
  french: "fr",
  truefrench: "fr",
  vff: "fr",
  vfq: "fr",
  es: "es",
  spa: "es",
  spanish: "es",
  latino: "es",
  ja: "ja",
  jpn: "ja",
  japanese: "ja",
  ko: "ko",
  kor: "ko",
  korean: "ko",
  zh: "zh",
  chi: "zh",
  chs: "zh",
  cht: "zh",
  chinese: "zh",
  mandarin: "zh",
  ar: "ar",
  ara: "ar",
  arabic: "ar",
  de: "de",
  ger: "de",
  german: "de",
  ita: "it",
  italian: "it",
  pt: "pt",
  por: "pt",
  portuguese: "pt",
  ptbr: "pt",
  brazilian: "pt",
  ru: "ru",
  rus: "ru",
  russian: "ru",
  hi: "hi",
  hin: "hi",
  hindi: "hi",
  tr: "tr",
  tur: "tr",
  turkish: "tr",
};

const DUB_MARKERS = new Set([
  "dub",
  "dubbed",
  "dubbing",
  "dubbedaudio",
  "dubbed-audio",
]);

const MULTI_MARKERS = new Set([
  "multi",
  "multiaudio",
  "multi-audio",
  "multiaudio",
  "dual",
  "dual-audio",
  "dualaudio",
]);

function normalizeAudioText(text?: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[._\-\[\](){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAudioSignalsFromText(
  text: string | undefined,
  originalLanguage?: string,
  source: AudioSignalSource = "unknown",
): AudioSignals {
  const normalized = normalizeAudioText(text);
  const tokens = normalized ? normalized.split(" ") : [];
  const languages: string[] = [];
  let hasDubMarker = false;
  let hasMultiMarker = false;

  for (const token of tokens) {
    if (DUB_MARKERS.has(token)) hasDubMarker = true;
    if (MULTI_MARKERS.has(token)) hasMultiMarker = true;
    const lang = LANGUAGE_TAGS[token];
    if (lang && !languages.includes(lang)) languages.push(lang);
  }

  let confidence = languages.length > 0 ? 0.7 : 0;
  if (hasMultiMarker) confidence -= 0.2;
  if (hasDubMarker) confidence -= 0.1;
  if (confidence < 0) confidence = 0;

  const selectedLanguage =
    originalLanguage && languages.includes(originalLanguage)
      ? originalLanguage
      : languages[0];

  const isDubbed = !!(
    originalLanguage &&
    languages.length > 0 &&
    !languages.includes(originalLanguage)
  );
  const dubPenalty = isDubbed ? -90 : 0;

  let scoreBoost = 0;
  if (originalLanguage && languages.includes(originalLanguage)) {
    scoreBoost += hasMultiMarker ? 60 : 80;
  } else if (isDubbed) {
    scoreBoost += dubPenalty;
  } else if (!originalLanguage && languages.length > 0) {
    scoreBoost += 10;
  }

  return {
    languages,
    selectedLanguage,
    confidence,
    source,
    isDubbed,
    dubPenalty,
    scoreBoost,
    hasMultiMarker,
    hasDubMarker,
  };
}

function mergeAudioSignals(
  releaseSignals: AudioSignals,
  fileSignals: AudioSignals,
  originalLanguage?: string,
): AudioSignals {
  const languages = Array.from(
    new Set([...releaseSignals.languages, ...fileSignals.languages]),
  );
  const hasMultiMarker =
    releaseSignals.hasMultiMarker || fileSignals.hasMultiMarker;
  const hasDubMarker = releaseSignals.hasDubMarker || fileSignals.hasDubMarker;
  const confidence = Math.max(
    releaseSignals.confidence,
    fileSignals.confidence,
  );
  const source: AudioSignalSource =
    releaseSignals.languages.length && fileSignals.languages.length
      ? "combined"
      : releaseSignals.languages.length
        ? "release"
        : fileSignals.languages.length
          ? "filename"
          : "unknown";

  const selectedLanguage =
    originalLanguage && languages.includes(originalLanguage)
      ? originalLanguage
      : releaseSignals.selectedLanguage ||
        fileSignals.selectedLanguage ||
        originalLanguage;

  const isDubbed = releaseSignals.isDubbed || fileSignals.isDubbed;
  const dubPenalty = Math.min(
    releaseSignals.dubPenalty,
    fileSignals.dubPenalty,
  );

  let scoreBoost = 0;
  if (originalLanguage && languages.includes(originalLanguage)) {
    scoreBoost += hasMultiMarker ? 60 : 80;
  } else if (isDubbed) {
    scoreBoost += dubPenalty;
  } else if (!originalLanguage && languages.length > 0) {
    scoreBoost += 10;
  }

  return {
    languages,
    selectedLanguage,
    confidence,
    source,
    isDubbed,
    dubPenalty,
    scoreBoost,
    hasMultiMarker,
    hasDubMarker,
  };
}

function computeAudioSignals(
  releaseTitle?: string,
  fileName?: string,
  originalLanguage?: string,
): AudioSignals {
  const releaseSignals = extractAudioSignalsFromText(
    releaseTitle,
    originalLanguage,
    "release",
  );
  const fileSignals = extractAudioSignalsFromText(
    fileName,
    originalLanguage,
    "filename",
  );
  return mergeAudioSignals(releaseSignals, fileSignals, originalLanguage);
}

function matchesEpisode(
  path: string,
  season?: number,
  episode?: number,
): boolean {
  if (season == null || episode == null) return true;
  const patterns = [
    new RegExp(`[Ss]0*${season}[Ee]0*${episode}(?![0-9])`),
    new RegExp(`0*${season}[xX]0*${episode}(?![0-9])`),
    new RegExp(`(?<![0-9])0*${season}00*${episode}(?![0-9])`),
    new RegExp(`season\\s*0*${season}.*episode\\s*0*${episode}`, "i"),
  ];
  return patterns.some((re) => re.test(path));
}

function isSuspiciousEpisodeMismatch(
  path: string,
  season?: number,
  episode?: number,
): boolean {
  if (season == null || episode == null) return false;
  const hasEpisodeToken = /[Ss]\d{1,2}[Ee]\d{1,3}|\d{1,2}[xX]\d{1,3}/.test(
    path,
  );
  return hasEpisodeToken && !matchesEpisode(path, season, episode);
}

async function getImdbId(
  tmdbId: string,
  type: "movie" | "episode",
): Promise<string | null> {
  const cacheKey = `${type}-${tmdbId}`;
  const cached = extIdCache.get(cacheKey);
  if (cached) return cached;

  const endpoint = type === "movie" ? "movie" : "tv";
  const res = await fetch(
    `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/external_ids?api_key=${process.env.TMDB_API_KEY}`,
    { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.imdb_id) {
    extIdCache.set(cacheKey, data.imdb_id);
    return data.imdb_id;
  }
  return null;
}

function scoreSourceText(
  text: string,
  rdCached: boolean,
  audioBoost = 0,
): number {
  const lower = text.toLowerCase();
  let score = rdCached ? 1000 : 0;
  if (lower.includes("1080p")) score += 90;
  if (lower.includes("720p")) score += 55;
  if (lower.includes("2160p") || lower.includes("4k")) score += 40;
  if (lower.includes("x264") || lower.includes("h264")) score += 70;
  if (lower.includes("mp4")) score += 45;
  if (
    lower.includes("web-dl") ||
    lower.includes("webdl") ||
    lower.includes("webrip")
  )
    score += 35;
  if (
    lower.includes("bluray") ||
    lower.includes("bdrip") ||
    lower.includes("brrip")
  )
    score += 20;
  if (lower.includes("remux")) score -= 40;
  if (lower.includes("cam") || lower.includes("ts")) score -= 120;
  const seeders = getSeeders(text);
  if (seeders) score += Math.min(80, Math.floor(seeders / 5));
  return score + audioBoost;
}

async function fetchTorrentioCandidates(
  tmdbId: string,
  type: "movie" | "episode",
  season?: number,
  episode?: number,
  originalLanguage?: string,
): Promise<StreamCandidate[]> {
  const imdbId = await getImdbId(tmdbId, type);
  if (!imdbId) return [];

  const stremioType = type === "movie" ? "movie" : "series";
  const episodePart = type === "episode" ? `:${season}:${episode}` : "";
  const res = await fetch(
    `https://torrentio.strem.fun/stream/${stremioType}/${imdbId}${episodePart}.json`,
    {
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!res.ok) return [];
  const data = await res.json();
  const streams = (data.streams || []) as TorrentioStream[];

  const seen = new Set<string>();
  return streams
    .filter((stream) => stream.infoHash)
    .map((stream) => {
      const releaseTitle =
        stream.title || stream.name || stream.behaviorHints?.filename || "";
      const fileName = stream.behaviorHints?.filename;
      const audioSignals = computeAudioSignals(
        releaseTitle,
        fileName,
        originalLanguage,
      );
      const infoHash = stream.infoHash!.toLowerCase();
      const fileIdx = stream.fileIdx;
      const seeders = getSeeders(releaseTitle);
      const id = `rd:${infoHash}:${fileIdx ?? "auto"}`;
      return {
        id,
        provider: "torrentio",
        server: "realdebrid",
        isRealDebrid: true,
        rank: 0,
        score: scoreSourceText(releaseTitle, false, audioSignals.scoreBoost),
        quality: getQuality(releaseTitle),
        infoHash,
        fileIdx,
        fileSize: stream.behaviorHints?.videoSize,
        releaseTitle,
        fileName,
        videoCodec: getVideoCodec(releaseTitle),
        audioCodec: getAudioCodec(releaseTitle),
        container: getContainer(stream.behaviorHints?.filename || releaseTitle),
        originalLanguage,
        audioLanguages: audioSignals.languages,
        audioTrackConfidence: audioSignals.confidence,
        audioTrackSource: audioSignals.source,
        isDubbed: audioSignals.isDubbed,
        dubPenalty: audioSignals.dubPenalty,
        selectedAudioLanguage: audioSignals.selectedLanguage,
        seeders,
        rdCached: false,
        verifiedMatch:
          type === "movie" ||
          matchesEpisode(
            `${releaseTitle} ${stream.behaviorHints?.filename || ""}`,
            season,
            episode,
          ),
        variants: [],
        metadata: {
          imdbId,
          bingeGroup: stream.behaviorHints?.bingeGroup,
          original_language: originalLanguage,
          audio_languages: audioSignals.languages,
          audio_confidence: audioSignals.confidence,
          audio_source: audioSignals.source,
          is_dubbed: audioSignals.isDubbed,
          dub_penalty: audioSignals.dubPenalty,
          selected_audio_language: audioSignals.selectedLanguage,
        },
      } satisfies StreamCandidate;
    })
    .filter((candidate) => {
      const key = `${candidate.infoHash}:${candidate.fileIdx ?? "auto"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return candidate.verifiedMatch;
    });
}

async function markInstantAvailability(
  candidates: StreamCandidate[],
  token: string,
): Promise<StreamCandidate[]> {
  await Promise.all(
    candidates.map(async (candidate) => {
      if (!candidate.infoHash) return;
      try {
        const res = await fetch(
          `${RD_BASE}/torrents/instantAvailability/${candidate.infoHash}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(5000),
          },
        );
        if (!res.ok) return;
        const data = await res.json();
        const hashData =
          data[candidate.infoHash] || data[candidate.infoHash.toUpperCase()];
        const hosterEntries = hashData ? Object.values(hashData) : [];
        candidate.rdCached = hosterEntries.some((entry) => {
          if (!entry || typeof entry !== "object") return false;
          if (candidate.fileIdx == null)
            return Object.keys(entry as Record<string, unknown>).length > 0;
          return Object.prototype.hasOwnProperty.call(
            entry,
            String(candidate.fileIdx),
          );
        });
        const audioSignals = computeAudioSignals(
          candidate.releaseTitle,
          candidate.fileName,
          candidate.originalLanguage,
        );
        candidate.audioLanguages = audioSignals.languages;
        candidate.audioTrackConfidence = audioSignals.confidence;
        candidate.audioTrackSource = audioSignals.source;
        candidate.isDubbed = audioSignals.isDubbed;
        candidate.dubPenalty = audioSignals.dubPenalty;
        candidate.selectedAudioLanguage = audioSignals.selectedLanguage;
        candidate.metadata = {
          ...(candidate.metadata || {}),
          original_language: candidate.originalLanguage,
          audio_languages: audioSignals.languages,
          audio_confidence: audioSignals.confidence,
          audio_source: audioSignals.source,
          is_dubbed: audioSignals.isDubbed,
          dub_penalty: audioSignals.dubPenalty,
          selected_audio_language: audioSignals.selectedLanguage,
        };
        candidate.score = scoreSourceText(
          `${candidate.releaseTitle || ""} ${candidate.fileName || ""}`,
          !!candidate.rdCached,
          audioSignals.scoreBoost,
        );
      } catch {
        candidate.rdCached = false;
      }
    }),
  );
  return candidates;
}

function selectBestFile(
  files: RDFiles[],
  candidate: StreamCandidate,
  type: "movie" | "episode",
  season?: number,
  episode?: number,
): RDFiles | null {
  const videoFiles = files.filter((file) =>
    /\.(mkv|mp4|avi|mov|m4v|webm)$/i.test(file.path),
  );
  if (videoFiles.length === 0) return null;

  if (candidate.fileIdx != null) {
    const byIdx = videoFiles.find(
      (file) =>
        file.id === candidate.fileIdx ||
        String(file.id) === String(candidate.fileIdx),
    );
    if (byIdx && !isSuspiciousEpisodeMismatch(byIdx.path, season, episode))
      return byIdx;
  }

  if (type === "episode") {
    const episodeMatch = videoFiles.find((file) =>
      matchesEpisode(file.path, season, episode),
    );
    if (episodeMatch) return episodeMatch;
    if (
      videoFiles.some((file) =>
        isSuspiciousEpisodeMismatch(file.path, season, episode),
      )
    )
      return null;
  }

  return [...videoFiles].sort((a, b) => b.bytes - a.bytes)[0] || null;
}

async function fetchTranscode(
  fileId: string,
  token: string,
): Promise<RDTranscodeResult | null> {
  try {
    const res = await fetch(`${RD_BASE}/streaming/transcode/${fileId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as RDTranscodeResult;
  } catch {
    return null;
  }
}

function buildStream(
  candidate: StreamCandidate,
  variant: StreamVariant,
  rank: number,
): StreamResult {
  return {
    url: variant.url,
    server: candidate.server,
    type: variant.type,
    isRealDebrid: candidate.isRealDebrid,
    quality: candidate.quality,
    label: variant.label,
    fileName: candidate.fileName,
    rdFileId: candidate.rdFileId,
    rdTorrentId: candidate.rdTorrentId,
    rdLink: candidate.rdLink,
    candidateId: candidate.id,
    variant: variant.variant,
    rank,
    infoHash: candidate.infoHash,
    fileIdx: candidate.fileIdx,
    fileSize: candidate.fileSize,
    releaseTitle: candidate.releaseTitle,
    videoCodec: candidate.videoCodec,
    audioCodec: candidate.audioCodec,
    container: candidate.container,
    originalLanguage: candidate.originalLanguage,
    audioLanguages: candidate.audioLanguages,
    audioTrackConfidence: candidate.audioTrackConfidence,
    audioTrackSource: candidate.audioTrackSource,
    isDubbed: candidate.isDubbed,
    dubPenalty: candidate.dubPenalty,
    selectedAudioLanguage: candidate.selectedAudioLanguage,
    compatibility: variant.compatibility,
    verifiedMatch: candidate.verifiedMatch,
    score: candidate.score,
    seeders: candidate.seeders,
    rdCached: candidate.rdCached,
  };
}

async function resolveCandidate(
  candidate: StreamCandidate,
  token: string,
  type: "movie" | "episode",
  season?: number,
  episode?: number,
): Promise<StreamCandidate | null> {
  if (!candidate.infoHash) return null;
  try {
    const magnet = `magnet:?xt=urn:btih:${candidate.infoHash}&dn=${encodeURIComponent(candidate.releaseTitle || "")}`;
    const addRes = await fetch(`${RD_BASE}/torrents/addMagnet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `magnet=${encodeURIComponent(magnet)}`,
      signal: AbortSignal.timeout(8000),
    });
    if (!addRes.ok) return null;
    const addData = await addRes.json();
    const torrentId = addData.id as string;

    const infoRes = await fetch(`${RD_BASE}/torrents/info/${torrentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!infoRes.ok) return null;
    const info = (await infoRes.json()) as RDInfo;
    const selectedFile = selectBestFile(
      info.files || [],
      candidate,
      type,
      season,
      episode,
    );
    if (!selectedFile) return null;

    if (!info.links || info.links.length === 0) {
      await fetch(`${RD_BASE}/torrents/selectFiles/${torrentId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `files=${selectedFile.id}`,
        signal: AbortSignal.timeout(5000),
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const info2Res = await fetch(`${RD_BASE}/torrents/info/${torrentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!info2Res.ok) return null;
    const info2 = (await info2Res.json()) as RDInfo;
    if (!info2.links || info2.links.length === 0) return null;

    const selectedFileName =
      selectedFile.path.split("/").pop() || selectedFile.path;
    if (
      type === "episode" &&
      isSuspiciousEpisodeMismatch(selectedFileName, season, episode)
    )
      return null;

    const videoLink =
      info2.links.find((link) => link.includes(selectedFileName)) ||
      info2.links.find((link) =>
        /\.(mkv|mp4|avi|mov|m4v|webm)(\?|$)/i.test(link),
      ) ||
      info2.links[0];

    const unrestrictRes = await fetch(`${RD_BASE}/unrestrict/link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `link=${encodeURIComponent(videoLink)}`,
      signal: AbortSignal.timeout(8000),
    });
    if (!unrestrictRes.ok) return null;
    const unrestricted = await unrestrictRes.json();
    if (!unrestricted.download) return null;

    const fileName = unrestricted.filename || selectedFileName;
    if (
      type === "episode" &&
      isSuspiciousEpisodeMismatch(fileName, season, episode)
    )
      return null;

    const audioSignals = computeAudioSignals(
      candidate.releaseTitle,
      fileName,
      candidate.originalLanguage,
    );

    const resolved: StreamCandidate = {
      ...candidate,
      id: `rd:${candidate.infoHash}:${selectedFile.id}`,
      rank: 0,
      score: scoreSourceText(
        `${fileName} ${candidate.releaseTitle || ""}`,
        !!candidate.rdCached,
        audioSignals.scoreBoost,
      ),
      fileIdx: selectedFile.id,
      fileName,
      fileSize: selectedFile.bytes || candidate.fileSize,
      quality: getQuality(`${fileName} ${candidate.releaseTitle || ""}`),
      videoCodec: getVideoCodec(`${fileName} ${candidate.releaseTitle || ""}`),
      audioCodec: getAudioCodec(`${fileName} ${candidate.releaseTitle || ""}`),
      container: getContainer(fileName) || candidate.container,
      originalLanguage: candidate.originalLanguage,
      audioLanguages: audioSignals.languages,
      audioTrackConfidence: audioSignals.confidence,
      audioTrackSource: audioSignals.source,
      isDubbed: audioSignals.isDubbed,
      dubPenalty: audioSignals.dubPenalty,
      selectedAudioLanguage: audioSignals.selectedLanguage,
      rdFileId: unrestricted.id as string,
      rdTorrentId: torrentId,
      rdLink: videoLink,
      rdCached: candidate.rdCached,
      verifiedMatch: true,
      variants: [],
      metadata: {
        ...(candidate.metadata || {}),
        selectedFileId: selectedFile.id,
        selectedFilePath: selectedFile.path,
        original_language: candidate.originalLanguage,
        audio_languages: audioSignals.languages,
        audio_confidence: audioSignals.confidence,
        audio_source: audioSignals.source,
        is_dubbed: audioSignals.isDubbed,
        dub_penalty: audioSignals.dubPenalty,
        selected_audio_language: audioSignals.selectedLanguage,
      },
    };

    const variants: StreamVariant[] = [];
    variants.push({
      url: unrestricted.download,
      type: unrestricted.download.includes(".m3u8") ? "hls" : "mp4",
      variant: "direct",
      label: `RD Direct ${resolved.quality}`,
      compatibility:
        resolved.container === "mp4" || resolved.container === "m4v"
          ? "universal"
          : "desktop",
    });

    if (unrestricted.streamable === 1 && resolved.rdFileId) {
      const transcode = await fetchTranscode(resolved.rdFileId, token);
      if (transcode?.liveMP4?.full) {
        variants.push({
          url: transcode.liveMP4.full,
          type: "mp4",
          variant: "liveMp4",
          label: `RD LiveMP4 ${resolved.quality}`,
          compatibility: "universal",
        });
      }
      if (transcode?.apple?.full) {
        variants.push({
          url: transcode.apple.full,
          type: "hls",
          variant: "hls",
          label: `RD HLS ${resolved.quality}`,
          compatibility: "fallback",
        });
      }
      if (transcode?.dash?.full) {
        variants.push({
          url: transcode.dash.full,
          type: "dash",
          variant: "dash",
          label: `RD DASH ${resolved.quality}`,
          compatibility: "android",
        });
      }
      if (transcode?.h264WebM?.full) {
        variants.push({
          url: transcode.h264WebM.full,
          type: "mp4",
          variant: "webm",
          label: `RD WebM ${resolved.quality}`,
          compatibility: "fallback",
        });
      }
    }

    resolved.variants = variants;
    return resolved;
  } catch {
    return null;
  }
}

function rankResolvedCandidates(
  candidates: StreamCandidate[],
): StreamCandidate[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score:
        candidate.score +
        (candidate.variants.some((v) => v.variant === "direct") ? 40 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

export function flattenCandidates(
  candidates: StreamCandidate[],
): StreamResult[] {
  const preferredVariantOrder: Record<string, number> = {
    direct: 0,
    hls: 1,
    dash: 2,
    webm: 3,
    liveMp4: 4,
    embed: 5,
  };
  return candidates.flatMap((candidate) =>
    [...candidate.variants]
      .sort(
        (a, b) =>
          (preferredVariantOrder[a.variant] ?? 99) -
          (preferredVariantOrder[b.variant] ?? 99),
      )
      .map((variant) => buildStream(candidate, variant, candidate.rank)),
  );
}

export async function resolveRealDebridCandidates(
  tmdbId: string,
  type: "movie" | "episode",
  season?: number,
  episode?: number,
  originalLanguage?: string,
): Promise<StreamCandidate[]> {
  const token = getRealDebridToken();
  if (!token) return [];

  try {
    const candidates = await fetchTorrentioCandidates(
      tmdbId,
      type,
      season,
      episode,
      originalLanguage,
    );
    if (!candidates.length) return [];
    const availability = await markInstantAvailability(candidates, token);
    const ranked = availability.sort((a, b) => b.score - a.score).slice(0, 6);

    const resolved = await Promise.all(
      ranked.map((candidate) =>
        resolveCandidate(candidate, token, type, season, episode),
      ),
    );

    return rankResolvedCandidates(
      resolved.filter(Boolean) as StreamCandidate[],
    );
  } catch (err) {
    console.error("[RealDebrid]", err);
    return [];
  }
}

export const realDebridAdapter: ServerAdapter = {
  name: "realdebrid",
  async resolve(tmdbId, type, season, episode) {
    return flattenCandidates(
      await resolveRealDebridCandidates(tmdbId, type, season, episode),
    );
  },
};
