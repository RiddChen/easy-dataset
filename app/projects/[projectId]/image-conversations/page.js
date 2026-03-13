'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { alpha } from '@mui/material/styles';
import { useAtomValue } from 'jotai';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { selectedModelInfoAtom } from '@/lib/store';
import CreateImageConversationDialog from './components/CreateImageConversationDialog';

function ExportDialog({ open, onClose, onConfirm, loading }) {
  const [confirmedOnly, setConfirmedOnly] = useState(true);
  const [fileFormat, setFileFormat] = useState('json');
  const [includeSystem, setIncludeSystem] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }

    setConfirmedOnly(true);
    setFileFormat('json');
    setIncludeSystem(true);
  }, [open]);

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>导出图片多轮对话</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>导出范围</InputLabel>
          <Select value={confirmedOnly ? 'confirmed' : 'all'} label="导出范围" onChange={event => setConfirmedOnly(event.target.value === 'confirmed')}>
            <MenuItem value="confirmed">仅已确认</MenuItem>
            <MenuItem value="all">全部</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>文件格式</InputLabel>
          <Select value={fileFormat} label="文件格式" onChange={event => setFileFormat(event.target.value)}>
            <MenuItem value="json">ShareGPT JSON</MenuItem>
            <MenuItem value="jsonl">ShareGPT JSONL</MenuItem>
            <MenuItem value="zip">按图片拆分 ZIP</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ mt: 2 }}>
          <Button
            variant={includeSystem ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setIncludeSystem(prev => !prev)}
          >
            {includeSystem ? '包含 system prompt' : '不包含 system prompt'}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button onClick={() => onConfirm({ confirmedOnly, fileFormat, includeSystem })} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={18} /> : '导出'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ImageConversationsPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetImageName = searchParams.get('imageName') || '';
  const selectedModel = useAtomValue(selectedModelInfoAtom);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [confirmedFilter, setConfirmedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(Boolean(presetImageName));
  const [creating, setCreating] = useState(false);
  const [images, setImages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const visibleIds = useMemo(() => rows.map(row => row.id), [rows]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  const fetchRows = async (pageIndex = page, currentKeyword = keyword, currentConfirmed = confirmedFilter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pageIndex + 1),
        pageSize: String(rowsPerPage)
      });

      if (currentKeyword) {
        params.append('keyword', currentKeyword);
      }

      if (currentConfirmed !== 'all') {
        params.append('confirmed', currentConfirmed === 'confirmed' ? 'true' : 'false');
      }

      const response = await axios.get(`/api/projects/${projectId}/image-conversations?${params.toString()}`);
      setRows(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch image conversations:', error);
      toast.error(error.response?.data?.error || '获取图片多轮对话失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/images?simple=true`);
      setImages(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch images for image conversations:', error);
      toast.error('获取图片列表失败');
    }
  };

  useEffect(() => {
    if (!projectId) {
      return;
    }

    fetchRows();
    fetchImages();
  }, [projectId, page, rowsPerPage, confirmedFilter]);

  useEffect(() => {
    if (presetImageName) {
      setDialogOpen(true);
    }
  }, [presetImageName]);

  useEffect(() => {
    setSelectedIds([]);
  }, [rows]);

  const handleCreate = async payload => {
    if (!selectedModel) {
      toast.error('请先选择一个视觉模型');
      return;
    }

    if (selectedModel.type !== 'vision') {
      toast.error('当前选择的不是视觉模型');
      return;
    }

    try {
      setCreating(true);
      const response = await axios.post(`/api/projects/${projectId}/image-conversations`, {
        ...payload,
        model: selectedModel,
        language: 'zh-CN'
      });

      const conversation = response.data.data;
      toast.success('图片多轮对话已生成');
      setDialogOpen(false);
      router.push(`/projects/${projectId}/image-conversations/${conversation.id}`);
    } catch (error) {
      console.error('Failed to create image conversation:', error);
      toast.error(error.response?.data?.error || '生成图片多轮对话失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async conversationId => {
    if (!confirm('确定要删除这条图片多轮对话吗？')) {
      return;
    }

    try {
      await axios.delete(`/api/projects/${projectId}/image-conversations/${conversationId}`);
      toast.success('删除成功');
      fetchRows();
    } catch (error) {
      console.error('Failed to delete image conversation:', error);
      toast.error(error.response?.data?.error || '删除失败');
    }
  };

  const handleBatchConfirm = async () => {
    if (selectedIds.length === 0) {
      toast.error('请先选择要确认的数据');
      return;
    }

    try {
      setBatchConfirming(true);
      const results = await Promise.allSettled(
        selectedIds.map(id => axios.put(`/api/projects/${projectId}/image-conversations/${id}`, { confirmed: true }))
      );
      const successCount = results.filter(item => item.status === 'fulfilled').length;
      const failCount = results.length - successCount;
      toast.success(failCount > 0 ? `已确认 ${successCount} 条，失败 ${failCount} 条` : `已确认 ${successCount} 条`);
      fetchRows();
    } catch (error) {
      console.error('Failed to batch confirm image conversations:', error);
      toast.error('批量确认失败');
    } finally {
      setBatchConfirming(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error('请先选择要删除的数据');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedIds.length} 条图片多轮对话吗？`)) {
      return;
    }

    try {
      setBatchDeleting(true);
      const results = await Promise.allSettled(selectedIds.map(id => axios.delete(`/api/projects/${projectId}/image-conversations/${id}`)));
      const successCount = results.filter(item => item.status === 'fulfilled').length;
      const failCount = results.length - successCount;
      toast.success(failCount > 0 ? `已删除 ${successCount} 条，失败 ${failCount} 条` : `已删除 ${successCount} 条`);
      fetchRows();
    } catch (error) {
      console.error('Failed to batch delete image conversations:', error);
      toast.error('批量删除失败');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleExport = async ({ confirmedOnly, fileFormat, includeSystem }) => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (confirmedOnly) {
        params.append('confirmed', 'true');
      }
      params.append('includeSystem', includeSystem ? 'true' : 'false');
      const response = await axios.get(`/api/projects/${projectId}/image-conversations/export?${params.toString()}`);
      const data = response.data || [];

      if (fileFormat === 'zip') {
        const zip = new JSZip();
        data.forEach((item, index) => {
          const safeImageName = String(item.imageName || `conversation-${index + 1}`).replace(/[<>:"/\\|?*]+/g, '_');
          const fileName = `${String(index + 1).padStart(4, '0')}_${safeImageName}.json`;
          zip.file(
            fileName,
            JSON.stringify(
              {
                image: item.imageName,
                messages: item.messages
              },
              null,
              2
            )
          );
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const zipLink = document.createElement('a');
        zipLink.href = zipUrl;
        zipLink.download = `image-multi-turn-${confirmedOnly ? 'confirmed-' : ''}${projectId}.zip`;
        zipLink.click();
        URL.revokeObjectURL(zipUrl);
      } else {
        const payload =
          fileFormat === 'jsonl' ? data.map(item => JSON.stringify({ messages: item.messages })).join('\n') : JSON.stringify(data, null, 2);
        const blob = new Blob([payload], { type: fileFormat === 'jsonl' ? 'application/x-ndjson' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `image-multi-turn-${confirmedOnly ? 'confirmed-' : ''}${projectId}.${fileFormat}`;
        link.click();
        URL.revokeObjectURL(url);
      }

      setExportDialogOpen(false);
    } catch (error) {
      console.error('Failed to export image conversations:', error);
      toast.error(error.response?.data?.error || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const toggleSelectAllVisible = checked => {
    if (checked) {
      setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
      return;
    }

    setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
  };

  const toggleSelection = conversationId => {
    setSelectedIds(prev => (prev.includes(conversationId) ? prev.filter(id => id !== conversationId) : [...prev, conversationId]));
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      <Card
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: theme => alpha(theme.palette.primary.light, 0.05),
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <TextField
            placeholder="搜索图片名或首轮问题"
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                setPage(0);
                fetchRows(0, event.currentTarget.value, confirmedFilter);
              }
            }}
            sx={{ minWidth: 320, flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>确认状态</InputLabel>
            <Select value={confirmedFilter} label="确认状态" onChange={event => {
              setPage(0);
              setConfirmedFilter(event.target.value);
            }}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="confirmed">已确认</MenuItem>
              <MenuItem value="unconfirmed">未确认</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={() => setExportDialogOpen(true)}>
              导出
            </Button>
            <Button variant="outlined" startIcon={<CheckCircleIcon />} onClick={handleBatchConfirm} disabled={selectedIds.length === 0 || batchConfirming}>
              {batchConfirming ? '确认中...' : `批量确认 (${selectedIds.length})`}
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleBatchDelete} disabled={selectedIds.length === 0 || batchDeleting}>
              {batchDeleting ? '删除中...' : `批量删除 (${selectedIds.length})`}
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              新建图片多轮对话
            </Button>
          </Box>
        </Box>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox checked={allVisibleSelected} indeterminate={!allVisibleSelected && selectedIds.some(id => visibleIds.includes(id))} onChange={event => toggleSelectAllVisible(event.target.checked)} />
              </TableCell>
              <TableCell>图片</TableCell>
              <TableCell>首轮问题</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>评分</TableCell>
              <TableCell>轮数</TableCell>
              <TableCell>模型</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">暂无图片多轮对话数据</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableRow key={row.id} hover selected={selectedIds.includes(row.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedIds.includes(row.id)} onChange={() => toggleSelection(row.id)} />
                  </TableCell>
                  <TableCell>{row.imageName || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 420 }}>{row.question}</TableCell>
                  <TableCell>
                    {row.confirmed ? <Chip size="small" color="success" label="已确认" /> : <Chip size="small" label="未确认" />}
                  </TableCell>
                  <TableCell>{typeof row.score === 'number' ? row.score.toFixed(1) : '0.0'}</TableCell>
                  <TableCell>
                    {row.turnCount}/{row.maxTurns}
                  </TableCell>
                  <TableCell>{row.model}</TableCell>
                  <TableCell>{new Date(row.createAt).toLocaleString('zh-CN')}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="查看详情">
                      <IconButton onClick={() => router.push(`/projects/${projectId}/image-conversations/${row.id}`)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    {!row.confirmed && (
                      <Tooltip title="确认">
                        <IconButton color="success" onClick={() => axios.put(`/api/projects/${projectId}/image-conversations/${row.id}`, { confirmed: true }).then(() => { toast.success('已确认'); fetchRows(); }).catch(error => { console.error('Failed to confirm image conversation:', error); toast.error(error.response?.data?.error || '确认失败'); })}>
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="删除">
                      <IconButton color="error" onClick={() => handleDelete(row.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, value) => setPage(value)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[20, 50, 100]}
          onRowsPerPageChange={event => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      <CreateImageConversationDialog
        open={dialogOpen}
        loading={creating}
        images={images}
        initialImageName={presetImageName}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />

      <ExportDialog open={exportDialogOpen} loading={exporting} onClose={() => setExportDialogOpen(false)} onConfirm={handleExport} />
    </Container>
  );
}

