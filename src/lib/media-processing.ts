import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import type { Transloadit as TransloaditClient } from 'transloadit';

type SourceKind = 'image' | 'video';
type FfmpegErrorCode = 'ffmpeg_binary_unavailable' | 'ffmpeg_spawn_failed' | 'ffmpeg_metadata_failed';
type TransloaditErrorCode = 'transloadit_unavailable' | 'transloadit_upload_failed' | 'transloadit_result_missing';
type CleanupRetryableCode = 'EBUSY' | 'ENOTEMPTY' | 'EPERM' | 'EMFILE' | 'ENFILE';

class MediaProcessingError extends Error {
  code: FfmpegErrorCode;
  details?: Record<string, unknown>;

  constructor(code: FfmpegErrorCode, message: string, details?: Record<string, unknown>) {
    super(`${code}: ${message}`);
    this.code = code;
    this.details = details;
  }
}

class TransloaditProcessingError extends Error {
  code: TransloaditErrorCode;
  details?: Record<string, unknown>;

  constructor(code: TransloaditErrorCode, message: string, details?: Record<string, unknown>) {
    super(`${code}: ${message}`);
    this.code = code;
    this.details = details;
  }
}

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

const requireFromHere = createRequire(import.meta.url);
let cachedFfmpegBinaryPath: string | null = null;
let cachedTransloaditClient: TransloaditClient | null = null;

type FfmpegProbeFailure = {
  candidate: string;
  reason: string;
};

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

function normalizeFfmpegCandidate(candidate: string): string {
  if (candidate === 'ffmpeg') {
    return candidate;
  }

  return path.isAbsolute(candidate) ? candidate : path.resolve(candidate);
}

async function canAccessCandidate(candidate: string): Promise<boolean> {
  if (candidate === 'ffmpeg') {
    return true;
  }

  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

function probeFfmpegCandidate(candidate: string): FfmpegProbeFailure | null {
  const probe = spawnSync(candidate, ['-version'], {
    windowsHide: true,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
  });

  if (probe.error) {
    return {
      candidate,
      reason: probe.error.message,
    };
  }

  if (probe.status === 0) {
    return null;
  }

  const output = `${probe.stderr ?? ''} ${probe.stdout ?? ''}`.trim();
  return {
    candidate,
    reason: output || `exit code ${probe.status ?? 'unknown'}`,
  };
}

async function resolveFfmpegBinaryPath() {
  if (cachedFfmpegBinaryPath) return cachedFfmpegBinaryPath;

  const envPath = process.env.FFMPEG_BINARY?.trim();
  const envManagedPath = process.env.FFMPEG_PATH?.trim();
  const staticPath = tryResolveFfmpegStaticPath();

  if (envPath) {
    const normalizedEnvPath = normalizeFfmpegCandidate(envPath);
    const isAccessible = await canAccessCandidate(normalizedEnvPath);
    if (!isAccessible) {
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

    const probeFailure = probeFfmpegCandidate(normalizedEnvPath);
    if (!probeFailure) {
      cachedFfmpegBinaryPath = normalizedEnvPath;
      return normalizedEnvPath;
    }

    throw new MediaProcessingError(
      'ffmpeg_binary_unavailable',
      `Configured FFMPEG_BINARY is not executable: ${normalizedEnvPath}. ${probeFailure.reason}`,
      {
        dependency: 'ffmpeg',
        hint: 'Fix FFMPEG_BINARY or unset it to use FFMPEG_PATH / ffmpeg-static / PATH fallback.',
        ffmpegPath: normalizedEnvPath,
      }
    );
  }

  const candidates = [envManagedPath, staticPath, 'ffmpeg'].filter((candidate): candidate is string =>
    Boolean(candidate)
  );
  const failedCandidates: FfmpegProbeFailure[] = [];

  for (const rawCandidate of candidates) {
    const candidate = normalizeFfmpegCandidate(rawCandidate);
    const isAccessible = await canAccessCandidate(candidate);
    if (!isAccessible) {
      failedCandidates.push({
        candidate,
        reason: 'not found or not readable',
      });
      continue;
    }

    const probeFailure = probeFfmpegCandidate(candidate);
    if (!probeFailure) {
      cachedFfmpegBinaryPath = candidate;
      return candidate;
    }

    failedCandidates.push(probeFailure);
  }

  throw new MediaProcessingError(
    'ffmpeg_binary_unavailable',
    'FFmpeg binary is unavailable. Set FFMPEG_BINARY / FFMPEG_PATH or install ffmpeg.',
    {
      dependency: 'ffmpeg',
      hint: 'Set FFMPEG_BINARY to an executable path, or ensure ffmpeg is available on PATH.',
      candidates: [envPath, envManagedPath, ...candidates].filter(Boolean),
      probeFailures: failedCandidates,
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

function getTransloaditTemplateId(kind: SourceKind) {
  const envKey = kind === 'image' ? 'TRANSLOADIT_TEMPLATE_ID_IMAGE' : 'TRANSLOADIT_TEMPLATE_ID_VIDEO';
  const templateId = process.env[envKey]?.trim();
  if (!templateId) {
    throw new TransloaditProcessingError(
      'transloadit_unavailable',
      `Missing ${envKey}. Configure Transloadit before uploading processed media.`,
      { envKey }
    );
  }
  return templateId;
}

async function getTransloaditClient() {
  if (cachedTransloaditClient) {
    return cachedTransloaditClient;
  }

  const authKey = process.env.TRANSLOADIT_KEY?.trim();
  const authSecret = process.env.TRANSLOADIT_SECRET?.trim();
  if (!authKey || !authSecret) {
    throw new TransloaditProcessingError(
      'transloadit_unavailable',
      'Missing TRANSLOADIT_KEY or TRANSLOADIT_SECRET.',
      { dependency: 'transloadit' }
    );
  }

  const { Transloadit } = await import('transloadit');
  cachedTransloaditClient = new Transloadit({
    authKey,
    authSecret,
  }) as TransloaditClient;
  return cachedTransloaditClient;
}

function pickTransloaditResultUrl(results: unknown): string | null {
  if (!results || typeof results !== 'object' || Array.isArray(results)) {
    return null;
  }

  // Debug: Log the result keys to help identify structure if it fails
  console.log('[Transloadit] Result keys:', Object.keys(results as Record<string, unknown>));

  for (const [key, value] of Object.entries(results as Record<string, unknown>)) {
    const entries = Array.isArray(value) ? value : [value];
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const candidate = entry as Record<string, unknown>;
      const url = candidate.ssl_url ?? candidate.url ?? candidate.websocket_url;
      if (typeof url === 'string' && url.trim() && !url.includes('websocket')) {
        return url.trim();
      }
    }
  }

  return null;
}

async function uploadProcessedFileToTransloadit(filePath: string, kind: SourceKind) {
  const client = await getTransloaditClient();
  const templateId = getTransloaditTemplateId(kind);

  try {
    const assembly = await client.createAssembly({
      files: { file1: filePath },
      params: { template_id: templateId },
      waitForCompletion: true,
    });

    const assemblyObj = assembly as unknown as { results?: unknown; uploads?: unknown[] };
    let resultUrl = pickTransloaditResultUrl(assemblyObj.results);

    // Fallback: If no processed results, look at the direct uploads
    if (!resultUrl && Array.isArray(assemblyObj.uploads) && assemblyObj.uploads.length > 0) {
      console.log('[Transloadit] Falling back to uploads array');
      const firstUpload = assemblyObj.uploads[0] as Record<string, unknown>;
      resultUrl = (firstUpload.ssl_url ?? firstUpload.url) as string | null;
    }

    if (!resultUrl) {
      throw new TransloaditProcessingError(
        'transloadit_result_missing',
        `Transloadit finished but did not return a result URL for ${kind}.`,
        { templateId, filePath, results: assemblyObj.results }
      );
    }

    return resultUrl;
  } catch (error) {
    if (error instanceof TransloaditProcessingError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown Transloadit upload error';
    throw new TransloaditProcessingError('transloadit_upload_failed', message, {
      templateId,
      filePath,
      kind,
    });
  }
}

function isCleanupRetryable(code: string): code is CleanupRetryableCode {
  return code === 'EBUSY' || code === 'ENOTEMPTY' || code === 'EPERM' || code === 'EMFILE' || code === 'ENFILE';
}

async function cleanupTempDir(tempDir: string) {
  try {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 250,
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code && isCleanupRetryable(code)) {
      // Non-fatal on Windows when file handles release slightly after processing.
      return;
    }
    // Cleanup should never fail a completed media task.
  }
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

    return await uploadProcessedFileToTransloadit(outputPath, 'image');
  } finally {
    await cleanupTempDir(tempDir);
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

    return await uploadProcessedFileToTransloadit(outputPath, 'image');
  } finally {
    await cleanupTempDir(tempDir);
  }
}
