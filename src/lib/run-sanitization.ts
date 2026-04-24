import type { Node } from '@xyflow/react';

const DATA_URL_PATTERN = /^data:([^;,]+)?(;base64)?,/i;
const MAX_DATA_URL_CHARS_FOR_DB = Number(process.env.NEXTFLOW_MAX_DATA_URL_CHARS_FOR_DB ?? 100_000);
const MAX_STRING_CHARS_FOR_DB = Number(process.env.NEXTFLOW_MAX_STRING_CHARS_FOR_DB ?? 8_000);

function isFinitePositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function safeLimit(value: number, fallback: number) {
  return isFinitePositive(value) ? Math.floor(value) : fallback;
}

const dataUrlCharLimit = safeLimit(MAX_DATA_URL_CHARS_FOR_DB, 100_000);
const stringCharLimit = safeLimit(MAX_STRING_CHARS_FOR_DB, 8_000);

export function isDataUrl(value: string): boolean {
  return DATA_URL_PATTERN.test(value.trim());
}

export function redactDataUrl(value: string): string {
  const trimmed = value.trim();
  const match = DATA_URL_PATTERN.exec(trimmed);
  const mime = (match?.[1] ?? 'application/octet-stream').toLowerCase();
  const sizeKb = Math.max(1, Math.round(trimmed.length / 1024));
  return `data:${mime};base64,[omitted:${sizeKb}kb]`;
}

function sanitizeString(value: string): string {
  const trimmed = value.trim();

  if (isDataUrl(trimmed) && trimmed.length > dataUrlCharLimit) {
    return redactDataUrl(trimmed);
  }

  if (trimmed.length > stringCharLimit) {
    const extra = trimmed.length - stringCharLimit;
    return `${trimmed.slice(0, stringCharLimit)}...[truncated:${extra}chars]`;
  }

  return value;
}

function sanitizeWorkflowNodeString(value: string): string {
  const trimmed = value.trim();
  if (isDataUrl(trimmed)) {
    // Preserve original node media payloads for backward compatibility.
    return value;
  }
  if (trimmed.length > stringCharLimit) {
    const extra = trimmed.length - stringCharLimit;
    return `${trimmed.slice(0, stringCharLimit)}...[truncated:${extra}chars]`;
  }
  return value;
}

export function sanitizeForPersistence(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForPersistence(item));
  }

  if (typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      next[key] = sanitizeForPersistence(item);
    }
    return next;
  }

  return value;
}

function sanitizeForWorkflowPersistence(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return sanitizeWorkflowNodeString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeForWorkflowPersistence(item));
  if (typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      next[key] = sanitizeForWorkflowPersistence(item);
    }
    return next;
  }
  return value;
}

function pruneNodeDataForPersistence(nodeType: string, rawData: Record<string, unknown>) {
  const data = { ...rawData };

  // Runtime-only keys should not be written back to the workflow graph.
  delete data.status;
  delete data.highlighted;
  delete data.error;

  // Outputs are execution artifacts, not workflow configuration.
  delete data.output;
  delete data.image_url;
  delete data.video_url;
  delete data.frame_url;
  delete data.cropped_url;

  // LLM execution artifacts.
  if (nodeType === 'llm') {
    delete data.response;
  }

  return data;
}

function pruneNodeDataForExecution(nodeType: string, rawData: Record<string, unknown>) {
  const data = { ...rawData };
  delete data.status;
  delete data.highlighted;
  delete data.error;

  if (nodeType !== 'image' && nodeType !== 'video') {
    delete data.imageUrl;
    delete data.videoUrl;
  }

  return data;
}

export function sanitizeNodesForWorkflowPersistence(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    const rawData = (node.data ?? {}) as Record<string, unknown>;
    const nextData = pruneNodeDataForPersistence(node.type ?? 'unknown', rawData);

    return {
      ...node,
      selected: false,
      data: sanitizeForWorkflowPersistence(nextData) as Record<string, unknown>,
    };
  });
}

export function stripRuntimeNodeDataForExecution(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    const rawData = (node.data ?? {}) as Record<string, unknown>;
    const nextData = pruneNodeDataForExecution(node.type ?? 'unknown', rawData);

    return {
      ...node,
      selected: false,
      data: nextData,
    };
  });
}
