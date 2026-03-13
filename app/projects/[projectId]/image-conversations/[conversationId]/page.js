'use client';

import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography
} from '@mui/material';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import ConversationContent from '@/components/conversations/ConversationContent';
import ConversationHeader from '@/components/conversations/ConversationHeader';
import ImageAnnotationViewer from '@/components/conversations/ImageAnnotationViewer';
import ConversationMetadata from '@/components/conversations/ConversationMetadata';
import ConversationRatingSection from '@/components/conversations/ConversationRatingSection';
import useConversationDetails from '../../multi-turn/[conversationId]/useConversationDetails';

export default function ImageConversationDetailPage() {
  const { t } = useTranslation();
  const { projectId, conversationId } = useParams();
  const {
    conversation,
    messages,
    loading,
    editMode,
    saving,
    editData,
    setEditData,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleEdit,
    handleSave,
    handleCancel,
    handleDelete,
    handleNavigate,
    updateMessageContent
  } = useConversationDetails(projectId, conversationId, {
    apiBasePath: `/api/projects/${projectId}/image-conversations`,
    pageBasePath: `/projects/${projectId}/image-conversations`
  });

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <Alert severity="info">正在加载图片多轮对话...</Alert>
        </Box>
      </Container>
    );
  }

  if (!conversation) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">图片多轮对话不存在</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <ConversationHeader
        projectId={projectId}
        conversationId={conversationId}
        conversation={conversation}
        backHref={`/projects/${projectId}/image-conversations`}
        editMode={editMode}
        saving={saving}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={() => setDeleteDialogOpen(true)}
        onNavigate={handleNavigate}
      />

      <ImageAnnotationViewer messages={editMode ? editData.messages : messages} imageName={conversation.imageName} />

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: { xs: 'wrap', lg: 'nowrap' } }}>
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Paper sx={{ p: 3 }}>
            <ConversationContent
              messages={editMode ? editData.messages : messages}
              editMode={editMode}
              onMessageChange={updateMessageContent}
              conversation={conversation}
            />
          </Paper>
        </Box>

        <Box
          sx={{
            width: { xs: '100%', lg: 360 },
            position: 'sticky',
            top: 24,
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto'
          }}
        >
          <ConversationMetadata conversation={conversation} />
          <ConversationRatingSection conversation={conversation} projectId={projectId} onUpdate={() => setEditData(prev => prev)} />
        </Box>
      </Box>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('datasets.confirmDelete')}</DialogTitle>
        <DialogContent>
          <Typography>{t('datasets.confirmDeleteConversation')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button color="error" onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
