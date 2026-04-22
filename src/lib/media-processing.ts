import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

type SourceKind = 'image' | 'video';
type FfmpegErrorCode = 'ffmpeg_binary_unavailable' | 'ffmpeg_spawn_failed' | 'ffmpeg_metadata_failed';

class MediaProcessingError extends Error {
  code: FfmpegErrorCode;
  details?: Record<string, unknown>;

  constructor(code: FfmpegErrorCode, message: string, details?: Record<string, unknown>) {
    super(`${code}: ${message}`);
    this.code = code;
    this.details = details;
  }
}

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function extensionFromMime(contentType: string, fallback: string) {
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  if (normalized === 'image/jpeg') return '.jpg';
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/webp') return '.webp';
  if (normalized === 'image/gif') return '.gif';
  if (normalized === 'video/mp4') return '.mp4';
  if (normalized === 'video/quicktime') return '.mov';
  if (normalized === 'video/webm') return '.webm';
  return fallback;
}

function mimeFromOutputPath(outputPath: string) {
  const ext = path.extname(outputPath).toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? 'image/jpeg';
}

const requireFromHere = createRequire(import.meta.url);
let cachedFfmpegBinaryPath: string | null = null;

function tryResolveFfmpegStaticPath(): string | null {
  try {
    const resolved = requireFromHere('ffmpeg-static');
    if (typeof resolved === 'string' && resolved.trim()) {
      return path.resolve(resolved);
    }
  } catch {
    // ignore; we'll try fallback candidates below
  }

  return null;
}

async function resolveFfmpegBinaryPath() {
  if (cachedFfmpegBinaryPath) return cachedFfmpegBinaryPath;

  const envPath = process.env.FFMPEG_BINARY?.trim();
  const staticPath = tryResolveFfmpegStaticPath();

  if (envPath) {
    const normalizedEnvPath = path.resolve(envPath);
    try {
      await fs.access(normalizedEnvPath);
      cachedFfmpegBinaryPath = normalizedEnvPath;
      return normalizedEnvPath;
    } catch {
      throw new MediaProcessingError(
        'ffmpeg_binary_unavailable',
        `Configured FFMPEG_BINARY does not exist or is not readable: ${normalizedEnvPath}`,
        {
          dependency: 'ffmpeg',
          hint: 'Fix FFMPEG_BINARY or unset it to use ffmpeg-static / PATH fallback.',
          ffmpegPath: normalizedEnvPath,
        }
      );
    }
  }

  const candidates = [staticPath, 'ffmpeg'].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (candidate === 'ffmpeg') {
      cachedFfmpegBinaryPath = candidate;
      return candidate;
    }

    const normalized = path.resolve(candidate);
    try {
      await fs.access(normalized);
      cachedFfmpegBinaryPath = normalized;
      return normalized;
    } catch {
      // try next candidate
    }
  }

  throw new MediaProcessingError(
    'ffmpeg_binary_unavailable',
    'FFmpeg binary is unavailable. Set FFMPEG_BINARY or install ffmpeg-static.',
    {
      dependency: 'ffmpeg',
      hint: 'Set FFMPEG_BINARY to an absolute ffmpeg path or install ffmpeg on PATH.',
      candidates: [envPath, ...candidates].filter(Boolean),
    }
  );
}

async function runFfmpeg(args: string[], validExitCodes: number[] = [0]) {
  const ffmpegPath = await resolveFfmpegBinaryPath();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    let stdout = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      reject(
        new MediaProcessingError(
          'ffmpeg_spawn_failed',
          `Failed to spawn ffmpeg (${ffmpegPath}): ${error.message}`,
          {
            dependency: 'ffmpeg',
            ffmpegPath,
            hint: 'Ensure ffmpeg binary is present and executable for this runtime user.',
          }
        )
      );
    });
    child.on('close', (code) => {
      const exitCode = code ?? -1;
      if (validExitCodes.includes(exitCode)) {
        resolve();
        return;
      }
      reject(
        new MediaProcessingError(
          'ffmpeg_spawn_failed',
          `ffmpeg failed (exit ${exitCode}). ${stderr.trim() || stdout.trim() || 'No diagnostic output.'}`,
          {
            dependency: 'ffmpeg',
            ffmpegPath,
          }
        )
      );
    });
  });
}

async function getVideoDurationSeconds(inputPath: string) {
  const ffmpegPath = await resolveFfmpegBinaryPath();
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-hide_banner', '-i', inputPath], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      reject(
        new MediaProcessingError('ffmpeg_metadata_failed', `Failed to read video metadata: ${error.message}`, {
          dependency: 'ffmpeg',
          ffmpegPath,
        })
      );
    });
    child.on('close', () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
      if (!match) {
        reject(
          new MediaProcessingError(
            'ffmpeg_metadata_failed',
            'Could not determine video duration for percentage timestamp.',
            { dependency: 'ffmpeg', ffmpegPath }
          )
        );
        return;
      }
      const hours = Number(match[1] ?? 0);
      const minutes = Number(match[2] ?? 0);
      const seconds = Number(match[3] ?? 0);
      resolve(hours * 3600 + minutes * 60 + seconds);
    });
  });
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer; extension: string } {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid data URL input.');
  }

  const mimeType = (match[1] ?? 'application/octet-stream').toLowerCase();
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? '';
  const buffer = isBase64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf8');
  const extension = extensionFromMime(mimeType, '.bin');
  return { mimeType, buffer, extension };
}

async function toInputFile(sourceUrl: string, kind: SourceKind, tempDir: string) {
  if (!sourceUrl) {
    throw new Error(`${kind} source URL is required.`);
  }

  if (sourceUrl.startsWith('data:')) {
    const parsed = parseDataUrl(sourceUrl);
    const expectedPrefix = kind === 'image' ? 'image/' : 'video/';
    if (!parsed.mimeType.startsWith(expectedPrefix)) {
      throw new Error(`Expected a ${kind} data URL but received ${parsed.mimeType}.`);
    }
    const inputPath = path.join(tempDir, `input${parsed.extension}`);
    await fs.writeFile(inputPath, parsed.buffer);
    return inputPath;
  }

  if (/^https?:\/\//i.test(sourceUrl)) {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${kind} URL (${response.status}).`);
    }
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    const expectedPrefix = kind === 'image' ? 'image/' : 'video/';
    if (contentType && !contentType.startsWith(expectedPrefix)) {
      throw new Error(`Expected ${kind} content, received ${contentType}.`);
    }
    const extension = extensionFromMime(contentType, kind === 'image' ? '.jpg' : '.mp4');
    const inputPath = path.join(tempDir, `input${extension}`);
    const data = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(inputPath, data);
    return inputPath;
  }

  const filePath = sourceUrl.startsWith('/')
    ? path.join(process.cwd(), 'public', sourceUrl.replace(/^\//, ''))
    : path.resolve(sourceUrl);
  await fs.access(filePath);
  return filePath;
}

async function fileToDataUrl(filePath: string) {
  const buffer = await fs.readFile(filePath);
  const mimeType = mimeFromOutputPath(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function parseTimestamp(timestamp: string) {
  const value = timestamp.trim();
  if (!value) return { kind: 'seconds' as const, value: 0 };

  if (/^\d+(?:\.\d+)?%$/.test(value)) {
    const percentValue = Number(value.slice(0, -1));
    if (!Number.isFinite(percentValue) || percentValue < 0 || percentValue > 100) {
      throw new Error('Timestamp percentage must be between 0 and 100.');
    }
    return { kind: 'percent' as const, value: percentValue };
  }

  if (/^\d+(?:\.\d+)?(?:s)?$/i.test(value)) {
    const secondValue = Number(value.replace(/s$/i, ''));
    if (!Number.isFinite(secondValue) || secondValue < 0) {
      throw new Error('Timestamp seconds must be a positive number.');
    }
    return { kind: 'seconds' as const, value: secondValue };
  }

  throw new Error('Timestamp must be seconds (e.g. 5 or 5s) or percentage (e.g. 50%).');
}

function formatFfmpegNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}

export async function cropImageToDataUrl(params: {
  imageUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const { imageUrl, x, y, w, h } = params;

  if (x < 0 || x > 100 || y < 0 || y > 100 || w <= 0 || w > 100 || h <= 0 || h > 100) {
    throw new Error('Crop parameters must be within 0-100 and width/height must be greater than 0.');
  }
  if (x + w > 100 || y + h > 100) {
    throw new Error('Crop bounds exceed image dimensions. Ensure x+w and y+h are <= 100.');
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nextflow-crop-'));
  try {
    const inputPath = await toInputFile(imageUrl, 'image', tempDir);
    const outputPath = path.join(tempDir, 'cropped.jpg');
    const filter = `crop=iw*${formatFfmpegNumber(w)}/100:ih*${formatFfmpegNumber(h)}/100:iw*${formatFfmpegNumber(
      x
    )}/100:ih*${formatFfmpegNumber(y)}/100`;

    await runFfmpeg([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      inputPath,
      '-vf',
      filter,
      '-frames:v',
      '1',
      '-q:v',
      '2',
      outputPath,
    ]);

    return await fileToDataUrl(outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function extractFrameFromVideoToDataUrl(params: { videoUrl: string; timestamp: string }) {
  const { videoUrl, timestamp } = params;
  const parsed = parseTimestamp(timestamp);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nextflow-frame-'));
  try {
    const inputPath = await toInputFile(videoUrl, 'video', tempDir);

    let seconds = parsed.value;
    if (parsed.kind === 'percent') {
      const duration = await getVideoDurationSeconds(inputPath);
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('Video duration is not available for percentage timestamp extraction.');
      }
      seconds = (duration * parsed.value) / 100;
    }

    const safeSeconds = Math.max(0, seconds);
    const outputPath = path.join(tempDir, 'frame.jpg');
    await runFfmpeg([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      formatFfmpegNumber(safeSeconds),
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-q:v',
      '2',
      outputPath,
    ]);

    return await fileToDataUrl(outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
