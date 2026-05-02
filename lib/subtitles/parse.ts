import { parseTimeToMs, formatMsToTime } from './offset'

export interface SubtitleCue {
  index: number
  startMs: number
  endMs: number
  text: string
}

const DEFAULT_VTT_STYLE = `STYLE\n::cue {\n  background: rgba(0,0,0,0.75);\n  color: white;\n  font-size: 1.3em;\n  line-height: 1.4;\n  padding: 4px 8px;\n  border-radius: 4px;\n}`

function formatMsToVttTime(totalMs: number): string {
  return formatMsToTime(totalMs).replace(',', '.')
}

function stripBom(input: string): string {
  if (!input) return ''
  return input.charCodeAt(0) === 0xFEFF ? input.slice(1) : input
}

export function parseSubtitleCues(content: string): SubtitleCue[] {
  const normalized = stripBom(content)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const lines = normalized.split('\n')
  const cues: SubtitleCue[] = []
  let i = 0

  while (i < lines.length) {
    let line = lines[i].trim()

    if (!line) {
      i += 1
      continue
    }

    if (line.startsWith('WEBVTT')) {
      i += 1
      continue
    }

    if (line.startsWith('NOTE') || line.startsWith('STYLE') || line.startsWith('REGION')) {
      i += 1
      while (i < lines.length && lines[i].trim() !== '') i += 1
      continue
    }

    if (/^\d+$/.test(line) && i + 1 < lines.length && lines[i + 1].includes('-->')) {
      i += 1
      line = lines[i].trim()
    }

    if (!line.includes('-->')) {
      i += 1
      continue
    }

    const [startPart, endPart] = line.split('-->')
    const startToken = startPart.trim().split(/\s+/)[0]
    const endToken = endPart.trim().split(/\s+/)[0]
    const startMs = parseTimeToMs(startToken)
    const endMs = parseTimeToMs(endToken)

    i += 1
    const textLines: string[] = []
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i])
      i += 1
    }

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue

    cues.push({
      index: cues.length + 1,
      startMs,
      endMs,
      text: textLines.join('\n').trim(),
    })
  }

  return cues
}

export function serializeCuesToVtt(
  cues: SubtitleCue[],
  options: { includeDefaultStyle?: boolean } = {}
): string {
  const includeDefaultStyle = options.includeDefaultStyle ?? true
  const header = 'WEBVTT\n'
  const style = includeDefaultStyle ? `\n${DEFAULT_VTT_STYLE}\n\n` : '\n'

  const body = cues
    .map((cue, idx) => {
      const start = formatMsToVttTime(cue.startMs)
      const end = formatMsToVttTime(cue.endMs)
      const text = cue.text ? cue.text.trim() : ''
      return `${idx + 1}\n${start} --> ${end}\n${text}\n`
    })
    .join('\n')

  return `${header}${style}${body.trim()}\n`
}
