import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getImageById } from '@/lib/db/images';
import { getProjectPath } from '@/lib/db/base';
import { getMimeType } from '@/lib/util/image';

export async function GET(request, { params }) {
  try {
    const { projectId, imageId } = params;
    const image = await getImageById(imageId);

    if (!image || image.projectId !== projectId) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const projectPath = await getProjectPath(projectId);
    const filePath = path.join(projectPath, 'images', image.imageName);
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': getMimeType(image.imageName),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Failed to read project image file:', error);
    return NextResponse.json({ error: error.message || 'Failed to read image' }, { status: 500 });
  }
}
