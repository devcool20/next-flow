import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Transloadit as TransloaditClient } from 'transloadit';

export type SourceKind = 'image' | 'video';

type TransloaditErrorCode = 'transloadit_unavailable' | 'transloadit_upload_failed' | 'transloadit_result_missing';
type CleanupRetryableCode = 'EBUSY' | 'ENOTEMPTY' | 'EPERM' | 'EMFILE' | 'ENFILE';

class TransloaditProcessingError extends Error {
  code: TransloaditErrorCode;
  details?: Record<string, unknown>;

  constructor(code: TransloaditErrorCode, message: string, details?: Record<string, unknown>) {
    super(`${code}: ${message}`);
    this.code = code;
    this.details = details;
  }
}

let cachedTransloaditClient: TransloaditClient | null = null;

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

function getTransloaditTemplateId(kind: SourceKind) {
  const envKey = kind === 'image' ? 'TRANSLOADIT_TEMPLATE_ID_IMAGE' : 'TRANSLOADIT_TEMPLATE_ID_VIDEO';
  const templateId = process.env[envKey]?.trim();
  if (!templateId) {
    throw new TransloaditProcessingError(
      'transloadit_unavailable',
      `Missing ${envKey}. Configure Transloadit before uploading media.`,
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

  for (const value of Object.values(results as Record<string, unknown>)) {
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

export async function uploadFileToTransloadit(filePath: string, kind: SourceKind) {
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

    if (!resultUrl && Array.isArray(assemblyObj.uploads) && assemblyObj.uploads.length > 0) {
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
      return;
    }
  }
}

export async function uploadUserFileToTransloadit(params: {
  file: File;
  kind: SourceKind;
}) {
  const { file, kind } = params;
  const expectedPrefix = kind === 'image' ? 'image/' : 'video/';

  if (!file.type.toLowerCase().startsWith(expectedPrefix)) {
    throw new Error(`Expected a ${kind} file but received ${file.type || 'unknown'}.`);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `nextflow-upload-${kind}-`));
  try {
    const extension = extensionFromMime(file.type, path.extname(file.name) || (kind === 'image' ? '.jpg' : '.mp4'));
    const inputPath = path.join(tempDir, `upload${extension}`);
    await fs.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    return await uploadFileToTransloadit(inputPath, kind);
  } finally {
    await cleanupTempDir(tempDir);
  }
}
