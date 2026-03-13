import { NextResponse } from 'next/server';
import { getAllDatasetConversations } from '@/lib/db/dataset-conversations';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const includeSystem = searchParams.get('includeSystem') !== 'false';
    const filters = {
      confirmed: searchParams.get('confirmed'),
      sourceType: 'image'
    };

    Object.keys(filters).forEach(key => {
      if (!filters[key] && filters[key] !== false) {
        delete filters[key];
      }
    });

    const conversations = await getAllDatasetConversations(projectId, filters);
    const exported = [];

    for (const conversation of conversations) {
      try {
        const messages = JSON.parse(conversation.rawMessages || '[]');
        if (messages.length === 0) {
          continue;
        }

        const normalizedMessages = messages
          .map(message => normalizeExportMessage(message, projectId, conversation))
          .filter(message => includeSystem || message.role !== 'system');

        exported.push({
          id: conversation.id,
          imageName: conversation.imageName,
          messages: normalizedMessages
        });
      } catch (error) {
        console.error(`Failed to parse image conversation ${conversation.id}:`, error);
      }
    }

    return NextResponse.json(exported);
  } catch (error) {
    console.error('Failed to export image conversations:', error);
    return NextResponse.json({ error: error.message || 'Failed to export image conversations' }, { status: 500 });
  }
}

function normalizeExportMessage(message, projectId, conversation) {
  if (!Array.isArray(message?.content)) {
    return message;
  }

  const internalImageUrl =
    conversation?.sourceType === 'image' && conversation?.imageId
      ? `/api/projects/${projectId}/images/${conversation.imageId}/file`
      : null;

  return {
    ...message,
    content: message.content.map(item => {
      if (item?.type !== 'image_url' || !item?.image_url?.url) {
        return item;
      }

      if (internalImageUrl && item.image_url.url === internalImageUrl && conversation.imageName) {
        return {
          ...item,
          image_url: {
            ...item.image_url,
            url: `/images/${conversation.imageName}`
          }
        };
      }

      return item;
    })
  };
}

