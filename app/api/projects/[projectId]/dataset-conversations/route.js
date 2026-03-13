/**
 * Multi-turn conversation dataset APIs.
 */

import { NextResponse } from 'next/server';
import { getImageByName } from '@/lib/db/images';
import { getAllDatasetConversationIds, getDatasetConversationsByPagination } from '@/lib/db/dataset-conversations';
import { ensureImageQuestion, generateMultiTurnConversation } from '@/lib/services/multi-turn/index';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const getAllIds = searchParams.get('getAllIds') === 'true';

    const filters = {
      keyword: searchParams.get('keyword'),
      roleA: searchParams.get('roleA'),
      roleB: searchParams.get('roleB'),
      scenario: searchParams.get('scenario'),
      scoreMin: searchParams.get('scoreMin'),
      scoreMax: searchParams.get('scoreMax'),
      confirmed: searchParams.get('confirmed')
    };

    Object.keys(filters).forEach(key => {
      if (!filters[key]) {
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

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Failed to get multi-turn conversations:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const {
      questionId: inputQuestionId,
      imageName,
      question,
      followUpQuestion,
      autoGenerateFollowUp,
      systemPrompt,
      scenario,
      rounds,
      roleA,
      roleB,
      model,
      language = 'zh-CN'
    } = body;

    if (!model || !model.modelId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Model config is required'
        },
        { status: 400 }
      );
    }

    let questionId = inputQuestionId;

    if (!questionId && imageName && question) {
      const image = await getImageByName(projectId, imageName);
      if (!image) {
        return NextResponse.json(
          {
            success: false,
            message: 'Image not found'
          },
          { status: 404 }
        );
      }

      const createdQuestion = await ensureImageQuestion(projectId, image.id, String(question).trim());
      questionId = createdQuestion.id;
    }

    if (!questionId) {
      return NextResponse.json(
        {
          success: false,
          message: 'questionId is required'
        },
        { status: 400 }
      );
    }

    const result = await generateMultiTurnConversation(projectId, questionId, {
      systemPrompt: systemPrompt || '',
      scenario: scenario || '',
      rounds: rounds || 3,
      roleA: roleA || 'User',
      roleB: roleB || 'Assistant',
      model,
      language,
      followUpQuestion: followUpQuestion || '',
      autoGenerateFollowUp: Boolean(autoGenerateFollowUp)
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Failed to create multi-turn conversation:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}
