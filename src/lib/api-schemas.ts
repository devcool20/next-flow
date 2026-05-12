import { z } from 'zod';
import { AppError } from '@/lib/api-errors';

const positionSchema = z
  .object({
    x: z.number(),
    y: z.number(),
  })
  .passthrough();

export const reactFlowNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().optional(),
    position: positionSchema,
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const reactFlowEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    sourceHandle: z.string().nullable().optional(),
    targetHandle: z.string().nullable().optional(),
  })
  .passthrough();

export const workflowPutSchema = z.object({
  workflowId: z.string().min(1),
  nodes: z.array(reactFlowNodeSchema),
  edges: z.array(reactFlowEdgeSchema),
});

export const workflowPatchSchema = z.object({
  workflowId: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

export const runBodySchema = z.object({
  workflowId: z.string().min(1),
  nodes: z.array(reactFlowNodeSchema),
  edges: z.array(reactFlowEdgeSchema),
  selectedNodeIds: z.array(z.string().min(1)).optional(),
  scope: z.enum(['full', 'partial', 'single']),
});

export const runsQuerySchema = z.object({
  workflowId: z.string().min(1),
});

export function zodIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function parseRequestBody<T>(schema: z.ZodSchema<T>, value: unknown, message = 'Invalid request payload.'): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError('bad_request', message, 400, { issues: zodIssues(result.error) });
  }
  return result.data;
}
