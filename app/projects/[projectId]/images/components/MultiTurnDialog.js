'use client';

import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography
} from '@mui/material';
import axios from 'axios';
import { toast } from 'sonner';
import { selectedModelInfoAtom } from '@/lib/store';

export default function MultiTurnDialog({ open, projectId, image, onClose, onSuccess }) {
  const selectedModel = useAtomValue(selectedModelInfoAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [question, setQuestion] = useState('');
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [autoGenerateFollowUp, setAutoGenerateFollowUp] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadDefaults = async () => {
      try {
        setConfigLoading(true);
        setLoading(false);
        setError('');

        const response = await axios.get(`/api/projects/${projectId}/tasks`);
        const config = response.data || {};
        setSystemPrompt(config.multiTurnSystemPrompt || '');
        setQuestion(config.imageMultiTurnFirstQuestion || '');
        setFollowUpQuestion(config.imageMultiTurnFollowUpQuestion || '');
        setAutoGenerateFollowUp(config.imageMultiTurnAutoFollowUp !== false);
      } catch (requestError) {
        console.error('Failed to load image multi-turn defaults:', requestError);
        setSystemPrompt('');
        setQuestion('');
        setFollowUpQuestion('');
        setAutoGenerateFollowUp(true);
      } finally {
        setConfigLoading(false);
      }
    };

    loadDefaults();
  }, [open, projectId]);

  const handleSubmit = async () => {
    if (!selectedModel) {
      setError('请先选择一个视觉模型');
      return;
    }

    if (selectedModel.type !== 'vision') {
      setError('当前模型不是视觉模型');
      return;
    }

    if (!question.trim()) {
      setError('第一轮用户输入不能为空');
      return;
    }

    if (!autoGenerateFollowUp && !followUpQuestion.trim()) {
      setError('第二轮追问不能为空，或者开启自动生成');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.post(`/api/projects/${projectId}/image-conversations`, {
        imageName: image.imageName,
        question: question.trim(),
        followUpQuestion: followUpQuestion.trim(),
        autoGenerateFollowUp,
        systemPrompt: systemPrompt.trim(),
        model: selectedModel,
        language: 'zh-CN'
      });

      toast.success('图片多轮对话已生成');
      onSuccess?.(response.data.data);
      onClose();
    } catch (requestError) {
      console.error('Failed to generate image multi-turn conversation:', requestError);
      setError(requestError.response?.data?.error || '生成图片多轮对话失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>生成图片 2 轮对话</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {image && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              当前图片
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {image.imageName}
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="System Prompt"
          value={systemPrompt}
          onChange={event => setSystemPrompt(event.target.value)}
          disabled={loading || configLoading}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="第一轮用户输入"
          value={question}
          onChange={event => setQuestion(event.target.value)}
          disabled={loading || configLoading}
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={autoGenerateFollowUp}
              onChange={event => setAutoGenerateFollowUp(event.target.checked)}
              disabled={loading || configLoading}
            />
          }
          label="自动生成第二轮追问"
          sx={{ mb: 1 }}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="第二轮追问"
          value={followUpQuestion}
          onChange={event => setFollowUpQuestion(event.target.value)}
          disabled={loading || configLoading || autoGenerateFollowUp}
          sx={{ mb: 2 }}
        />

        {selectedModel && (
          <Typography variant="caption" color="text.secondary">
            当前模型: {selectedModel.modelName}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading || configLoading}>
          取消
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || configLoading}>
          {loading ? <CircularProgress size={18} /> : '生成对话'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
