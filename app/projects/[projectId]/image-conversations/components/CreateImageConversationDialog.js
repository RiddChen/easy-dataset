'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField
} from '@mui/material';

export default function CreateImageConversationDialog({
  open,
  loading,
  images,
  initialImageName,
  onClose,
  onSubmit
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [question, setQuestion] = useState('');
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [autoGenerateFollowUp, setAutoGenerateFollowUp] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    const presetImage = images.find(item => item.imageName === initialImageName) || null;
    setSelectedImage(presetImage);
    setSystemPrompt('');
    setQuestion('');
    setFollowUpQuestion('');
    setAutoGenerateFollowUp(true);
    setError('');
  }, [open, images, initialImageName]);

  const handleSubmit = () => {
    if (!selectedImage) {
      setError('请选择图片');
      return;
    }

    if (!question.trim()) {
      setError('第一轮用户输入不能为空');
      return;
    }

    if (!autoGenerateFollowUp && !followUpQuestion.trim()) {
      setError('第二轮追问不能为空，或者启用自动生成');
      return;
    }

    setError('');
    onSubmit({
      imageName: selectedImage.imageName,
      systemPrompt,
      question,
      followUpQuestion,
      autoGenerateFollowUp
    });
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>新建图片多轮对话</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Autocomplete
          options={images}
          value={selectedImage}
          onChange={(_, value) => setSelectedImage(value)}
          getOptionLabel={option => option?.imageName || ''}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={params => <TextField {...params} label="图片" />}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="System Prompt"
          value={systemPrompt}
          onChange={event => setSystemPrompt(event.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="第一轮用户输入"
          value={question}
          onChange={event => setQuestion(event.target.value)}
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={<Checkbox checked={autoGenerateFollowUp} onChange={event => setAutoGenerateFollowUp(event.target.checked)} />}
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
          disabled={autoGenerateFollowUp}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={18} /> : '生成'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
