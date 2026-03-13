'use client';

import { useState } from 'react';
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Pagination,
  Tooltip,
  Dialog,
  DialogContent,
  IconButton,
  Button
} from '@mui/material';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import DatasetIcon from '@mui/icons-material/Dataset';
import ForumIcon from '@mui/icons-material/Forum';
import DeleteIcon from '@mui/icons-material/Delete';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { useTranslation } from 'react-i18next';
import { imageStyles } from '../styles/imageStyles';

export default function ImageGrid({
  images,
  total,
  page,
  pageSize,
  onPageChange,
  onGenerateQuestions,
  onGenerateDataset,
  onGenerateMultiTurn,
  onDelete,
  onAnnotate
}) {
  const { t } = useTranslation();
  const [previewImage, setPreviewImage] = useState(null);

  if (!images || images.length === 0) {
    return (
      <Box sx={imageStyles.emptyState}>
        <Box sx={imageStyles.emptyIcon}>
          <PhotoLibraryIcon sx={{ fontSize: 60, color: 'primary.main' }} />
        </Box>
        <Typography variant="h5" sx={imageStyles.emptyTitle}>
          {t('images.noImages', { defaultValue: '还没有图片' })}
        </Typography>
        <Typography variant="body2" sx={imageStyles.emptyDescription}>
          {t('images.noImagesDescription', { defaultValue: '开始导入图片，创建你的第一个图片数据集' })}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {images.map(image => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
            <Card sx={imageStyles.imageCard}>
              <Box sx={imageStyles.imageWrapper}>
                <CardMedia
                  component="img"
                  image={image.base64 || image.path}
                  alt={image.imageName}
                  sx={imageStyles.imageMedia}
                  onClick={() => setPreviewImage(image)}
                />

                <Box sx={imageStyles.imageOverlay} />

                <Box sx={imageStyles.statusChipsContainer}>
                  <Chip
                    label={`${image.questionCount || 0} ${t('images.questions', { defaultValue: '问题' })}`}
                    size="small"
                    color={image.questionCount > 0 ? 'primary' : 'default'}
                    sx={imageStyles.statusChip}
                  />
                  <Chip
                    label={`${image.datasetCount || 0} ${t('images.datasets', { defaultValue: '数据集' })}`}
                    size="small"
                    color={image.datasetCount > 0 ? 'success' : 'default'}
                    sx={imageStyles.statusChip}
                  />
                </Box>

                <Box sx={imageStyles.imageNameContainer}>
                  <Tooltip title={image.imageName}>
                    <Chip label={image.imageName} size="small" sx={imageStyles.imageNameChip} />
                  </Tooltip>
                </Box>
              </Box>

              <CardContent sx={{ display: 'none' }} />

              <CardActions sx={imageStyles.cardActions}>
                <Button
                  size="small"
                  startIcon={<EditNoteIcon />}
                  onClick={() => onAnnotate(image)}
                  variant="contained"
                  color="primary"
                  sx={imageStyles.primaryActionButton}
                >
                  {t('images.annotate', { defaultValue: '标注' })}
                </Button>
                <Tooltip title={t('images.generateQuestions', { defaultValue: '生成问题' })}>
                  <IconButton size="small" onClick={() => onGenerateQuestions(image)} sx={imageStyles.actionIconButton}>
                    <QuestionMarkIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('images.generateDataset', { defaultValue: '生成数据集' })}>
                  <IconButton size="small" onClick={() => onGenerateDataset(image)} sx={imageStyles.actionIconButton}>
                    <DatasetIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="生成 2 轮对话">
                  <IconButton size="small" onClick={() => onGenerateMultiTurn(image)} sx={imageStyles.actionIconButton}>
                    <ForumIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('common.delete', { defaultValue: '删除' })}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(image.id)}
                    sx={imageStyles.actionIconButton}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {total > pageSize && (
        <Box sx={imageStyles.pagination}>
          <Pagination
            count={Math.ceil(total / pageSize)}
            page={page}
            onChange={(_, newPage) => onPageChange(newPage)}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden'
          }
        }}
      >
        <DialogContent
          sx={{ p: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {previewImage && (
            <Box sx={{ width: '100%', textAlign: 'center' }}>
              <img
                src={previewImage.base64 || previewImage.path}
                alt={previewImage.imageName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  objectFit: 'contain'
                }}
              />
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 2, color: 'white', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
              >
                {previewImage.imageName}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
