/**
 * Multi-turn conversation dataset generation service.
 */

import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { getChunkById } from '@/lib/db/chunks';
import { createDatasetConversation } from '@/lib/db/dataset-conversations';
import { getImageById } from '@/lib/db/images';
import { findImageQuestion, getQuestionById } from '@/lib/db/questions';
import { getProjectPath } from '@/lib/db/base';
import LLMClient from '@/lib/llm/core/index';
import { extractJsonFromLLMOutput } from '@/lib/llm/common/util';
import { getAssistantReplyPrompt, getNextQuestionPrompt } from '@/lib/llm/prompts/multiTurnConversation';
import { getMimeType } from '@/lib/util/image';

export async function generateMultiTurnConversation(projectId, questionId, config) {
  try {
    const question = await getQuestionById(questionId);
    if (!question) {
      throw new Error('Question does not exist');
    }

    if (question.projectId !== projectId) {
      throw new Error('Question does not belong to the project');
    }

    const normalizedConfig = {
      systemPrompt: config.systemPrompt || '',
      scenario: config.scenario || '',
      rounds: Math.max(1, parseInt(config.rounds || 3, 10)),
      roleA: config.roleA || 'User',
      roleB: config.roleB || 'Assistant',
      model: config.model,
      language: config.language || 'zh-CN',
      followUpQuestion: config.followUpQuestion || '',
      autoGenerateFollowUp: Boolean(config.autoGenerateFollowUp)
    };

    if (!normalizedConfig.model) {
      throw new Error('Model config is required');
    }

    if (question.imageId) {
      return await generateImageMultiTurnConversation(projectId, question, normalizedConfig);
    }

    return await generateTextMultiTurnConversation(projectId, question, normalizedConfig);
  } catch (error) {
    console.error('Failed to generate multi-turn conversation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function generateTextMultiTurnConversation(projectId, question, config) {
  const { systemPrompt, scenario, rounds, roleA, roleB, model, language } = config;
  const chunk = await getChunkById(question.chunkId);
  if (!chunk) {
    throw new Error('Chunk does not exist');
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  const llmClient = new LLMClient(model);
  let currentRound = 0;
  let userMessage = question.question;

  while (currentRound < rounds) {
    messages.push({
      role: 'user',
      content: userMessage
    });

    const assistantResponse = await generateAssistantResponse(
      llmClient,
      messages.slice(),
      chunk.content,
      scenario,
      roleA,
      roleB,
      currentRound + 1,
      rounds,
      projectId,
      language
    );

    messages.push({
      role: 'assistant',
      content: assistantResponse
    });

    currentRound += 1;

    if (currentRound < rounds) {
      userMessage = await generateNextUserMessage(
        llmClient,
        messages.slice(),
        chunk.content,
        scenario,
        roleA,
        roleB,
        currentRound + 1,
        rounds,
        projectId,
        language
      );
    }
  }

  const result = await createDatasetConversation({
    id: nanoid(),
    projectId,
    questionId: question.id,
    question: question.question,
    chunkId: question.chunkId,
    sourceType: 'text',
    systemPrompt,
    model: typeof model === 'string' ? model : model.modelName || 'unknown',
    questionLabel: question.label || '',
    scenario,
    roleA,
    roleB,
    turnCount: currentRound,
    maxTurns: rounds,
    rawMessages: JSON.stringify(messages),
    confirmed: false,
    score: 0,
    aiEvaluation: '',
    tags: '',
    note: `Generated from question "${question.question}"`
  });

  return {
    success: true,
    data: result
  };
}

async function generateImageMultiTurnConversation(projectId, question, config) {
  const { systemPrompt, scenario, rounds, roleA, roleB, model, followUpQuestion, autoGenerateFollowUp } = config;
  const image = await getImageById(question.imageId);
  if (!image || image.projectId !== projectId) {
    throw new Error('Image does not exist');
  }

  const { dataUrl, imagePath } = await getProjectImageData(projectId, image.imageName);
  const llmClient = new LLMClient(model);
  const runtimeMessages = [];
  const storedMessages = [];

  if (systemPrompt) {
    runtimeMessages.push({ role: 'system', content: systemPrompt });
    storedMessages.push({ role: 'system', content: systemPrompt });
  }

  runtimeMessages.push({
    role: 'user',
    content: [
      { type: 'text', text: question.question },
      { type: 'image_url', image_url: { url: dataUrl } }
    ]
  });
  storedMessages.push({
    role: 'user',
    content: [
      { type: 'text', text: question.question },
      { type: 'image_url', image_url: { url: `/api/projects/${projectId}/images/${image.id}/file` } }
    ]
  });

  let assistantReply = await llmClient.getResponse(runtimeMessages);
  assistantReply = normalizeLLMText(assistantReply);
  runtimeMessages.push({ role: 'assistant', content: assistantReply });
  storedMessages.push({ role: 'assistant', content: assistantReply });

  let currentRound = 1;
  let nextQuestion = followUpQuestion.trim();

  while (currentRound < rounds) {
    if (!nextQuestion) {
      if (!autoGenerateFollowUp) {
        throw new Error('Follow-up question is required for image conversations');
      }
      nextQuestion = await generateImageFollowUpQuestion(llmClient, runtimeMessages, roleA, roleB, currentRound + 1);
    }

    runtimeMessages.push({ role: 'user', content: nextQuestion });
    storedMessages.push({ role: 'user', content: nextQuestion });

    let nextAnswer = await llmClient.getResponse(runtimeMessages);
    nextAnswer = normalizeLLMText(nextAnswer);

    runtimeMessages.push({ role: 'assistant', content: nextAnswer });
    storedMessages.push({ role: 'assistant', content: nextAnswer });

    currentRound += 1;
    nextQuestion = '';
  }

  const result = await createDatasetConversation({
    id: nanoid(),
    projectId,
    questionId: question.id,
    question: question.question,
    chunkId: question.chunkId,
    sourceType: 'image',
    imageId: image.id,
    imageName: image.imageName,
    systemPrompt,
    model: typeof model === 'string' ? model : model.modelName || 'unknown',
    questionLabel: question.label || 'image',
    scenario: scenario || 'image multi-turn conversation',
    roleA,
    roleB,
    turnCount: currentRound,
    maxTurns: rounds,
    rawMessages: JSON.stringify(storedMessages),
    confirmed: false,
    score: 0,
    aiEvaluation: '',
    tags: '',
    note: `Generated from image "${image.imageName}" (${imagePath})`
  });

  return {
    success: true,
    data: result
  };
}

export async function ensureImageQuestion(projectId, imageId, questionText) {
  const existingQuestion = await findImageQuestion(projectId, imageId, questionText);
  if (existingQuestion) {
    return existingQuestion;
  }

  const { getImageChunk } = await import('@/lib/db/images');
  const { saveQuestions } = await import('@/lib/db/questions');
  const image = await getImageById(imageId);
  if (!image) {
    throw new Error('Image does not exist');
  }

  const imageChunk = await getImageChunk(projectId);
  await saveQuestions(projectId, [
    {
      question: questionText,
      label: 'image',
      imageId,
      imageName: image.imageName,
      chunkId: imageChunk.id
    }
  ]);

  const createdQuestion = await findImageQuestion(projectId, imageId, questionText);
  if (!createdQuestion) {
    throw new Error('Failed to create image question');
  }

  return createdQuestion;
}

async function getProjectImageData(projectId, imageName) {
  const projectPath = await getProjectPath(projectId);
  const imagePath = path.join(projectPath, 'images', imageName);
  const imageBuffer = await fs.readFile(imagePath);
  const mimeType = getMimeType(imageName);

  return {
    imagePath,
    dataUrl: `data:${mimeType};base64,${imageBuffer.toString('base64')}`
  };
}

async function generateAssistantResponse(
  llmClient,
  conversationHistory,
  chunkContent,
  scenario,
  roleA,
  roleB,
  currentRound,
  totalRounds,
  projectId,
  language
) {
  const prompt = await getAssistantReplyPrompt(
    language,
    {
      scenario,
      roleA,
      roleB,
      chunkContent,
      conversationHistory: formatConversationHistory(conversationHistory, roleA, roleB),
      currentRound,
      totalRounds
    },
    projectId
  );

  const response = await llmClient.getResponse(prompt);
  const assistantReply = extractJsonFromLLMOutput(response);
  return assistantReply?.content ? assistantReply.content : normalizeLLMText(response);
}

async function generateNextUserMessage(
  llmClient,
  conversationHistory,
  chunkContent,
  scenario,
  roleA,
  roleB,
  nextRound,
  totalRounds,
  projectId,
  language
) {
  const prompt = await getNextQuestionPrompt(
    language,
    {
      scenario,
      roleA,
      roleB,
      chunkContent,
      conversationHistory: formatConversationHistory(conversationHistory, roleA, roleB),
      nextRound,
      totalRounds
    },
    projectId
  );

  const response = await llmClient.getResponse(prompt);
  const nextQuestion = extractJsonFromLLMOutput(response);
  return nextQuestion?.question ? nextQuestion.question : normalizeLLMText(response);
}

async function generateImageFollowUpQuestion(llmClient, runtimeMessages, roleA, roleB, round) {
  const promptMessages = runtimeMessages.concat({
    role: 'user',
    content: `Generate exactly one concise follow-up question for round ${round}. The question must keep discussing the same image. Reply with the question only.`
  });

  const response = await llmClient.getResponse(promptMessages);
  return normalizeLLMText(response).replace(/^["']|["']$/g, '');
}

function normalizeLLMText(value) {
  return String(value || '').trim();
}

function formatConversationHistory(messages, roleA, roleB) {
  return messages
    .filter(message => message.role !== 'system')
    .map(message => {
      const roleName = message.role === 'user' ? roleA : roleB;
      return `${roleName}: ${getMessageText(message)}`;
    })
    .join('\n\n');
}

function getMessageText(message) {
  if (typeof message?.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message?.content)) {
    return message.content
      .filter(item => item?.type === 'text')
      .map(item => item.text)
      .join('\n');
  }

  return '';
}

export async function batchGenerateMultiTurnConversations(projectId, questionIds, config, progressCallback) {
  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (let index = 0; index < questionIds.length; index += 1) {
    const questionId = questionIds[index];

    try {
      const result = await generateMultiTurnConversation(projectId, questionId, config);
      if (result.success) {
        successCount += 1;
        results.push({ questionId, success: true, data: result.data });
      } else {
        failedCount += 1;
        results.push({ questionId, success: false, error: result.error });
      }
    } catch (error) {
      failedCount += 1;
      results.push({ questionId, success: false, error: error.message });
    }

    if (progressCallback) {
      await progressCallback(index + 1, questionIds.length);
    }

    if (index < questionIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    results
  };
}
