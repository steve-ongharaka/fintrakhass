import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generatePresignedUploadUrl, getFileUrl, deleteFile } from '@/lib/s3';
import { z } from 'zod';

const uploadRequestSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  entityType: z.enum([
    'well', 'facility', 'production', 'well_test', 'allocation',
    'meter', 'tank', 'custody_transfer', 'nomination', 'lifting',
    'loss_event', 'regulatory_report', 'injection_well'
  ]),
  entityId: z.string(),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

// GET - Fetch attachments
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { entityType: entityType as any, entityId },
      orderBy: { createdAt: 'desc' },
    });

    // Generate URLs for each attachment
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (att: any) => ({
        ...att,
        downloadUrl: await getFileUrl(att.cloudStoragePath, att.isPublic),
      }))
    );

    return NextResponse.json(attachmentsWithUrls);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
  }
}

// POST - Get presigned upload URL
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (!['admin', 'operator'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const data = uploadRequestSchema.parse(body);

    // Generate presigned URL
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      data.fileName,
      data.contentType,
      data.isPublic
    );

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        fileName: cloud_storage_path.split('/').pop() || data.fileName,
        originalName: data.fileName,
        mimeType: data.contentType,
        fileSize: data.fileSize,
        cloudStoragePath: cloud_storage_path,
        isPublic: data.isPublic,
        entityType: data.entityType as any,
        entityId: data.entityId,
        description: data.description,
        uploadedById: (session.user as any)?.id,
        uploadedBy: session.user?.email,
      },
    });

    return NextResponse.json({
      attachment,
      uploadUrl,
      cloud_storage_path,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Error creating attachment:', error);
    return NextResponse.json({ error: 'Failed to create attachment' }, { status: 500 });
  }
}
