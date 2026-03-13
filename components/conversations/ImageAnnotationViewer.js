'use client';

import { useMemo, useState } from 'react';
import { Box, Chip, Paper, Typography } from '@mui/material';

function getImageUrl(messages) {
  for (const message of messages || []) {
    if (!Array.isArray(message?.content)) {
      continue;
    }

    const imageItem = message.content.find(item => item?.type === 'image_url' && item?.image_url?.url);
    if (imageItem?.image_url?.url) {
      return imageItem.image_url.url;
    }
  }

  return '';
}

function getMessageText(message) {
  if (!message) {
    return '';
  }

  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter(item => item?.type === 'text')
      .map(item => item.text)
      .join('\n');
  }

  return '';
}

function createBoxFromCorners(x1, y1, x2, y2, meta = {}) {
  const left = Math.min(Number(x1), Number(x2));
  const top = Math.min(Number(y1), Number(y2));
  const right = Math.max(Number(x1), Number(x2));
  const bottom = Math.max(Number(y1), Number(y2));

  if (![left, top, right, bottom].every(Number.isFinite)) {
    return null;
  }

  return { x1: left, y1: top, x2: right, y2: bottom, ...meta };
}

function createBoxFromXYWH(x, y, width, height, meta = {}) {
  const left = Number(x);
  const top = Number(y);
  const w = Number(width);
  const h = Number(height);

  if (![left, top, w, h].every(Number.isFinite)) {
    return null;
  }

  return {
    x1: left,
    y1: top,
    x2: left + w,
    y2: top + h,
    ...meta
  };
}

function parseObjectsFromText(text) {
  const boxes = [];
  let match;

  const privacyItemRegex =
    /privacy\s+item\s*(\d+)\s*:\s*([^|\n\r]+?)\s*(?:\|\s*score\s*=\s*[\d.]+\s*)?\|\s*bbox\s*[:=]\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/gi;
  while ((match = privacyItemRegex.exec(text)) !== null) {
    const box = createBoxFromXYWH(match[3], match[4], match[5], match[6], {
      itemIndex: Number(match[1]),
      itemName: String(match[2] || '').trim()
    });
    if (box) boxes.push(box);
  }

  const cornerObjectRegex =
    /\{[^{}]*?(?:"?x1"?|"?left"?)\s*:\s*([\d.]+)[^{}]*?(?:"?y1"?|"?top"?)\s*:\s*([\d.]+)[^{}]*?(?:"?x2"?|"?right"?)\s*:\s*([\d.]+)[^{}]*?(?:"?y2"?|"?bottom"?)\s*:\s*([\d.]+)[^{}]*?\}/gi;
  while ((match = cornerObjectRegex.exec(text)) !== null) {
    const box = createBoxFromCorners(match[1], match[2], match[3], match[4]);
    if (box) boxes.push(box);
  }

  const xywhObjectRegex =
    /\{[^{}]*?(?:"?x"?|"?left"?)\s*:\s*([\d.]+)[^{}]*?(?:"?y"?|"?top"?)\s*:\s*([\d.]+)[^{}]*?(?:"?w"?|"?width"?)\s*:\s*([\d.]+)[^{}]*?(?:"?h"?|"?height"?)\s*:\s*([\d.]+)[^{}]*?\}/gi;
  while ((match = xywhObjectRegex.exec(text)) !== null) {
    const box = createBoxFromXYWH(match[1], match[2], match[3], match[4]);
    if (box) boxes.push(box);
  }

  const bboxArrayRegex = /"?bbox"?\s*[:=]\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/gi;
  while ((match = bboxArrayRegex.exec(text)) !== null) {
    const box = createBoxFromXYWH(match[1], match[2], match[3], match[4]);
    if (box) boxes.push(box);
  }

  const plainArrayRegex = /(?<!bbox\s*[:=]\s*)\[\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/gi;
  while ((match = plainArrayRegex.exec(text)) !== null) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    const c = Number(match[3]);
    const d = Number(match[4]);
    const box = c > a && d > b ? createBoxFromCorners(a, b, c, d) : createBoxFromXYWH(a, b, c, d);
    if (box) boxes.push(box);
  }

  const deduped = [];
  const seen = new Set();
  for (const box of boxes) {
    const key = `${box.x1}-${box.y1}-${box.x2}-${box.y2}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(box);
    }
  }

  return deduped;
}

function detectBoxes(messages) {
  const assistantMessages = (messages || []).filter(message => message?.role === 'assistant');
  const preferredMessages = assistantMessages.slice(1).concat(assistantMessages.slice(0, 1));

  for (const message of preferredMessages) {
    const text = getMessageText(message);
    const boxes = parseObjectsFromText(text);
    if (boxes.length > 0) {
      return {
        sourceText: text,
        boxes
      };
    }
  }

  return {
    sourceText: '',
    boxes: []
  };
}

function normalizeBox(box, naturalWidth, naturalHeight) {
  const maxValue = Math.max(box.x1, box.y1, box.x2, box.y2);

  if (maxValue <= 1) {
    return {
      left: `${box.x1 * 100}%`,
      top: `${box.y1 * 100}%`,
      width: `${Math.max((box.x2 - box.x1) * 100, 0.8)}%`,
      height: `${Math.max((box.y2 - box.y1) * 100, 0.8)}%`
    };
  }

  if (maxValue <= 1000 && (naturalWidth > 1000 || naturalHeight > 1000)) {
    return {
      left: `${(box.x1 / 1000) * 100}%`,
      top: `${(box.y1 / 1000) * 100}%`,
      width: `${Math.max(((box.x2 - box.x1) / 1000) * 100, 0.8)}%`,
      height: `${Math.max(((box.y2 - box.y1) / 1000) * 100, 0.8)}%`
    };
  }

  return {
    left: `${(box.x1 / naturalWidth) * 100}%`,
    top: `${(box.y1 / naturalHeight) * 100}%`,
    width: `${Math.max(((box.x2 - box.x1) / naturalWidth) * 100, 0.8)}%`,
    height: `${Math.max(((box.y2 - box.y1) / naturalHeight) * 100, 0.8)}%`
  };
}

export default function ImageAnnotationViewer({ messages, imageName }) {
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const imageUrl = useMemo(() => getImageUrl(messages), [messages]);
  const { boxes, sourceText } = useMemo(() => detectBoxes(messages), [messages]);

  if (!imageUrl) {
    return null;
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6">图片预览</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {imageName ? <Chip size="small" label={imageName} /> : null}
          <Chip size="small" color={boxes.length > 0 ? 'warning' : 'default'} label={boxes.length > 0 ? `检测到 ${boxes.length} 个坐标框` : '未检测到坐标框'} />
        </Box>
      </Box>

      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          overflow: 'auto',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: '#0b1020',
          p: 1
        }}
      >
        <Box sx={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
          <Box
            component="img"
            src={imageUrl}
            alt={imageName || 'conversation image'}
            onLoad={event => {
              setNaturalSize({
                width: event.currentTarget.naturalWidth || 1,
                height: event.currentTarget.naturalHeight || 1
              });
            }}
            sx={{
              display: 'block',
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              maxHeight: '72vh',
              borderRadius: 1
            }}
          />

          {boxes.map((box, index) => {
            const normalized = normalizeBox(box, naturalSize.width, naturalSize.height);
            return (
              <Box
                key={`${box.x1}-${box.y1}-${box.x2}-${box.y2}-${index}`}
                sx={{
                  position: 'absolute',
                  ...normalized,
                  border: '2px solid #ff5252',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.35) inset',
                  backgroundColor: 'rgba(255, 82, 82, 0.10)',
                  pointerEvents: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    transform: 'translate(0, -100%)',
                    px: 0.35,
                    py: 0.05,
                    fontSize: 9,
                    fontWeight: 600,
                    lineHeight: 1.1,
                    color: '#fff',
                    backgroundColor: '#ff5252',
                    borderTopLeftRadius: 3,
                    borderTopRightRadius: 3,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {box.itemIndex ? `#${box.itemIndex}` : `#${index + 1}`}
                  {box.itemName ? `: ${box.itemName}` : ''}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {boxes.length > 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          坐标来源：{sourceText}
        </Typography>
      ) : null}
    </Paper>
  );
}
