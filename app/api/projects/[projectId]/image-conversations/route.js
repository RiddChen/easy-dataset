import { NextResponse } from 'next/server';
import { getImageByName } from '@/lib/db/images';
import {
  getAllDatasetConversationIds,
  getDatasetConversationsByPagination
} from '@/lib/db/dataset-conversations';
import { ensureImageQuestion, generateMultiTurnConversation } from '@/lib/services/multi-turn/index';
import { getTaskConfig } from '@/lib/db/projects';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const getAllIds = searchParams.get('getAllIds') === 'true';

    const filters = {
      keyword: searchParams.get('keyword'),
      scoreMin: searchParams.get('scoreMin'),
      scoreMax: searchParams.get('scoreMax'),
      confirmed: searchParams.get('confirmed'),
      sourceType: 'image'
    };

    Object.keys(filters).forEach(key => {
      if (!filters[key] && filters[key] !== false) {
        delete filters[key];
      }
    });

    if (getAllIds) {
      const allConversationIds = await getAllDatasetConversationIds(projectId, filters);
      return NextResponse.json({ allConversationIds });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const result = await getDatasetConversationsByPagination(projectId, page, pageSize, filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get image conversations:', error);
    return NextResponse.json({ error: error.message || 'Failed to get image conversations' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const {
      imageName,
      question,
      followUpQuestion,
      autoGenerateFollowUp,
      systemPrompt,
      scenario,
      rounds,
      model,
      language = 'zh-CN',
      roleA,
      roleB
    } = body;

    const taskConfig = await getTaskConfig(projectId);

    if (!imageName || !String(question || '').trim()) {
      return NextResponse.json({ error: 'imageName and question are required' }, { status: 400 });
    }

    if (!model || !model.modelId) {
      return NextResponse.json({ error: 'Model config is required' }, { status: 400 });
    }

    const image = await getImageByName(projectId, imageName);
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const createdQuestion = await ensureImageQuestion(projectId, image.id, String(question).trim());
    const result = await generateMultiTurnConversation(projectId, createdQuestion.id, {
      systemPrompt: systemPrompt || taskConfig.multiTurnSystemPrompt || '',
      scenario: scenario || taskConfig.multiTurnScenario || 'image multi-turn conversation',
      rounds: Number(rounds || taskConfig.multiTurnRounds || 2),
      roleA: roleA || taskConfig.multiTurnRoleA || 'user',
      roleB: roleB || taskConfig.multiTurnRoleB || 'assistant',
      model,
      language,
      followUpQuestion: followUpQuestion || taskConfig.imageMultiTurnFollowUpQuestion || '',
      autoGenerateFollowUp:
        autoGenerateFollowUp !== undefined
          ? Boolean(autoGenerateFollowUp)
          : taskConfig.imageMultiTurnAutoFollowUp !== false
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to create image conversation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Failed to create image conversation:', error);
    return NextResponse.json({ error: error.message || 'Failed to create image conversation' }, { status: 500 });
  }
}

