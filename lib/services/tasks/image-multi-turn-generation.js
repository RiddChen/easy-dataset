import { PrismaClient } from '@prisma/client';
import { processInParallel } from '@/lib/util/async';
import { updateTask } from './index';
import { getTaskConfig } from '@/lib/db/projects';
import { ensureImageQuestion, generateMultiTurnConversation } from '@/lib/services/multi-turn/index';

const prisma = new PrismaClient();

function parseTaskImageIds(note) {
  if (!note) return [];

  try {
    const parsed = typeof note === 'string' ? JSON.parse(note) : note;
    if (!Array.isArray(parsed?.imageIds)) return [];
    return [...new Set(parsed.imageIds.map(id => String(id)).filter(Boolean))];
  } catch {
    return [];
  }
}

export async function processImageMultiTurnGenerationTask(task) {
  try {
    let modelInfo;
    try {
      modelInfo = JSON.parse(task.modelInfo);
    } catch (error) {
      throw new Error(`Failed to parse model info: ${error.message}`);
    }

    const projectId = task.projectId;
    const taskConfig = await getTaskConfig(projectId);
    const targetImageIds = parseTaskImageIds(task.note);
    const firstQuestion = String(taskConfig.imageMultiTurnFirstQuestion || '').trim();

    if (!firstQuestion) {
      throw new Error('Image multi-turn first question is not configured');
    }

    const imageWhere = {
      projectId,
      ...(targetImageIds.length > 0 ? { id: { in: targetImageIds } } : {})
    };

    const allImages = await prisma.images.findMany({
      where: imageWhere,
      select: {
        id: true,
        imageName: true
      }
    });

    if (allImages.length === 0) {
      await updateTask(task.id, {
        status: 1,
        completedCount: 0,
        totalCount: 0,
        detail: 'No images to process',
        note: ''
      });
      return;
    }

    const existingConversations = await prisma.datasetConversations.findMany({
      where: {
        projectId,
        sourceType: 'image',
        ...(targetImageIds.length > 0 ? { imageId: { in: targetImageIds } } : {})
      },
      select: {
        imageId: true
      }
    });

    const existingImageIds = new Set(existingConversations.map(item => item.imageId).filter(Boolean));
    const imagesToProcess = allImages.filter(image => !existingImageIds.has(image.id));

    if (imagesToProcess.length === 0) {
      await updateTask(task.id, {
        status: 1,
        completedCount: 0,
        totalCount: 0,
        detail: 'All images already have image multi-turn conversations',
        note: ''
      });
      return;
    }

    const concurrencyLimit = taskConfig.visionConcurrencyLimit || taskConfig.concurrencyLimit || 2;
    const totalCount = imagesToProcess.length;

    await updateTask(task.id, {
      totalCount,
      detail: `Images to process: ${totalCount}`,
      note: ''
    });

    let successCount = 0;
    let errorCount = 0;
    let latestTaskStatus = 0;

    const processImage = async image => {
      try {
        const latestTask = await prisma.task.findUnique({ where: { id: task.id } });
        if (latestTask.status === 2 || latestTask.status === 3) {
          latestTaskStatus = latestTask.status;
          return;
        }

        const imageQuestion = await ensureImageQuestion(projectId, image.id, firstQuestion);
        const result = await generateMultiTurnConversation(projectId, imageQuestion.id, {
          systemPrompt: taskConfig.multiTurnSystemPrompt || '',
          scenario: taskConfig.multiTurnScenario || 'image multi-turn conversation',
          rounds: Number(taskConfig.multiTurnRounds || 2),
          roleA: taskConfig.multiTurnRoleA || 'user',
          roleB: taskConfig.multiTurnRoleB || 'assistant',
          model: modelInfo,
          language: task.language || 'zh-CN',
          followUpQuestion: taskConfig.imageMultiTurnFollowUpQuestion || '',
          autoGenerateFollowUp: taskConfig.imageMultiTurnAutoFollowUp !== false
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to generate image multi-turn conversation');
        }

        successCount++;
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}`
        });

        return { success: true, imageId: image.id };
      } catch (error) {
        errorCount++;
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}`
        });

        return { success: false, imageId: image.id, error: error.message };
      }
    };

    await processInParallel(imagesToProcess, processImage, concurrencyLimit, async () => {});

    if (!latestTaskStatus) {
      const finalStatus = errorCount > 0 && successCount === 0 ? 2 : 1;
      await updateTask(task.id, {
        status: finalStatus,
        completedCount: successCount + errorCount,
        detail: '',
        note: `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}`,
        endTime: new Date()
      });
    }
  } catch (error) {
    await updateTask(task.id, {
      status: 2,
      detail: `Processing failed: ${error.message}`,
      note: `Processing failed: ${error.message}`,
      endTime: new Date()
    });
  }
}

