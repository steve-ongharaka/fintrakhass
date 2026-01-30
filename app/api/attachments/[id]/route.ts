import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getFileUrl, deleteFile } from '@/lib/s3';

// GET - Get download URL for attachment
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: params.id },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const downloadUrl = await getFileUrl(attachment.cloudStoragePath, attachment.isPublic);

    return NextResponse.json({ ...attachment, downloadUrl });
  } catch (error) {
    console.error('Error fetching attachment:', error);
    return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 500 });
  }
}

// DELETE - Delete attachment
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (!['admin', 'operator'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: params.id },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete from S3
    try {
      await deleteFile(attachment.cloudStoragePath);
    } catch (s3Error) {
      console.error('Error deleting file from S3:', s3Error);
      // Continue to delete DB record even if S3 delete fails
    }

    // Delete from database
    await prisma.attachment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
