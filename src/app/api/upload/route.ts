import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { AppError, toAppError } from '@/lib/api-errors';
import { uploadUserFileToTransloadit, type SourceKind } from '@/lib/transloadit-upload';
import { parseRequestBody } from '@/lib/api-schemas';

export const runtime = 'nodejs';
export const maxDuration = 60;

const uploadFormSchema = z.object({
  kind: z.enum(['image', 'video']),
});

const acceptedMimeTypes: Record<SourceKind, Set<string>> = {
  image: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  video: new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']),
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError('unauthorized', 'Unauthorized', 401);
    }

    const form = await request.formData();
    const { kind } = parseRequestBody(
      uploadFormSchema,
      { kind: form.get('kind') },
      'Invalid upload payload.'
    );
    const file = form.get('file');

    if (!(file instanceof File)) {
      throw new AppError('bad_request', 'file is required', 400);
    }

    if (!acceptedMimeTypes[kind].has(file.type.toLowerCase())) {
      throw new AppError('invalid_input', `Unsupported ${kind} file type.`, 400, {
        type: file.type,
      });
    }

    const url = await uploadUserFileToTransloadit({ file, kind });

    return NextResponse.json({
      url,
      kind,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    const appError = toAppError(error, 'Failed to upload file');
    return NextResponse.json(
      {
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
        },
      },
      { status: appError.status }
    );
  }
}
