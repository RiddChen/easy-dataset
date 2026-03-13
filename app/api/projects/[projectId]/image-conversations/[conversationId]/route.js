import { NextResponse } from 'next/server';
import {
  deleteDatasetConversation,
  getConversationNavigationItems,
  getDatasetConversationById,
  updateDatasetConversation
} from '@/lib/db/dataset-conversations';

function ensureImageConversation(conversation, projectId) {
  if (!conversation) {
    return { ok: false, response: NextResponse.json({ error: 'Conversation not found' }, { status: 404 }) };
  }

  if (conversation.projectId !== projectId) {
    return { ok: false, response: NextResponse.json({ error: 'Conversation does not belong to this project' }, { status: 403 }) };
  }

  if (conversation.sourceType !== 'image') {
    return { ok: false, response: NextResponse.json({ error: 'Conversation is not an image conversation' }, { status: 400 }) };
  }

  return { ok: true };
}

export async function GET(request, { params }) {
  try {
    const { projectId, conversationId } = params;
    const { searchParams } = new URL(request.url);
    const operateType = searchParams.get('operateType');

    if (operateType) {
      const data = await getConversationNavigationItems(projectId, conversationId, operateType);
      if (data && data.sourceType !== 'image') {
        return NextResponse.json(null);
      }
      return NextResponse.json(data);
    }

    const conversation = await getDatasetConversationById(conversationId);
    const validation = ensureImageConversation(conversation, projectId);
    if (!validation.ok) {
      return validation.response;
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Failed to get image conversation detail:', error);
    return NextResponse.json({ error: error.message || 'Failed to get image conversation detail' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { projectId, conversationId } = params;
    const conversation = await getDatasetConversationById(conversationId);
    const validation = ensureImageConversation(conversation, projectId);
    if (!validation.ok) {
      return validation.response;
    }

    const body = await request.json();
    const allowedFields = ['score', 'tags', 'note', 'confirmed', 'aiEvaluation', 'messages'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updateData[field === 'messages' ? 'rawMessages' : field] =
          field === 'messages' ? JSON.stringify(body[field]) : body[field];
      }
    });

    const updated = await updateDatasetConversation(conversationId, updateData);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update image conversation:', error);
    return NextResponse.json({ error: error.message || 'Failed to update image conversation' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { projectId, conversationId } = params;
    const conversation = await getDatasetConversationById(conversationId);
    const validation = ensureImageConversation(conversation, projectId);
    if (!validation.ok) {
      return validation.response;
    }

    await deleteDatasetConversation(conversationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete image conversation:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete image conversation' }, { status: 500 });
  }
}
