import { Prisma } from '@prisma/client';

export type RunErrorCode =
  | 'dependency_unavailable'
  | 'invalid_input'
  | 'task_failed'
  | 'execution_failed'
  | 'unauthorized'
  | 'not_found'
  | 'bad_request';

export class AppError extends Error {
  code: RunErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(code: RunErrorCode, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P1001' || error.code === 'P1002';
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Can\'t reach database server') || message.includes('P1001');
}

export function toAppError(error: unknown, fallbackMessage = 'Unexpected server error'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isDatabaseUnavailableError(error)) {
    return new AppError('dependency_unavailable', 'Database is currently unavailable. Please try again shortly.', 503, {
      dependency: 'database',
    });
  }

  const message = error instanceof Error ? error.message : fallbackMessage;

  if (typeof message === 'string' && message.includes('ffmpeg_binary_unavailable')) {
    return new AppError('dependency_unavailable', 'FFmpeg binary is unavailable for media processing.', 503, {
      dependency: 'ffmpeg',
      hint: 'Set FFMPEG_BINARY or ensure ffmpeg-static is available to the Node runtime.',
      raw: message,
    });
  }

  if (typeof message === 'string' && (message.includes('ffmpeg_spawn_failed') || message.includes('ffmpeg_metadata_failed'))) {
    return new AppError('task_failed', 'Media processing failed while running FFmpeg.', 502, {
      dependency: 'ffmpeg',
      hint: 'Verify ffmpeg binary permissions and media input validity.',
      raw: message,
    });
  }

  return new AppError('execution_failed', message || fallbackMessage, 500);
}
