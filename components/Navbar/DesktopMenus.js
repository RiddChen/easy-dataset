'use client';

import React from 'react';
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageIcon from '@mui/icons-material/Image';
import DatasetOutlinedIcon from '@mui/icons-material/DatasetOutlined';
import ChatIcon from '@mui/icons-material/Chat';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import StorageIcon from '@mui/icons-material/Storage';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import VisibilityIcon from '@mui/icons-material/Visibility';
import * as styles from './styles';

export default function DesktopMenus({
  theme,
  menuState,
  isMenuOpen,
  handleMenuClose,
  currentProject,
  onNavigateStart
}) {
  const { t } = useTranslation();

  const navigateProps = href => ({
    component: Link,
    href,
    onClick: () => {
      onNavigateStart?.();
      handleMenuClose();
    }
  });

  return (
    <>
      <Menu
        anchorEl={menuState.anchorEl}
        open={isMenuOpen('source')}
        onClose={handleMenuClose}
        hideBackdrop
        disableScrollLock
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
          elevation: 8,
          sx: {
            ...styles.getMenuPaperStyles(theme),
            pointerEvents: 'auto'
          },
          onMouseLeave: handleMenuClose
        }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        MenuListProps={{
          dense: false,
          onMouseLeave: handleMenuClose,
          sx: styles.menuListStyles,
          role: 'menu'
        }}
        transitionDuration={200}
      >
        <MenuItem {...navigateProps(`/projects/${currentProject}/text-split`)} role="menuitem" sx={styles.getMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.listItemIconStyles}>
            <DescriptionOutlinedIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('textSplit.title')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
        <Divider sx={{ my: 0.75, mx: 1.5 }} />
        <MenuItem {...navigateProps(`/projects/${currentProject}/images`)} role="menuitem" sx={styles.getMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.listItemIconStyles}>
            <ImageIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('images.title')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={menuState.anchorEl}
        open={isMenuOpen('dataset')}
        onClose={handleMenuClose}
        hideBackdrop
        disableScrollLock
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
          elevation: 8,
          sx: {
            ...styles.getSimpleMenuPaperStyles(theme),
            pointerEvents: 'auto'
          },
          onMouseLeave: handleMenuClose
        }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        MenuListProps={{
          dense: true,
          onMouseLeave: handleMenuClose,
          sx: styles.simpleMenuListStyles
        }}
      >
        <MenuItem {...navigateProps(`/projects/${currentProject}/datasets`)} sx={styles.getSimpleMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.smallListItemIconStyles}>
            <DatasetOutlinedIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('datasets.singleTurn', '单轮问答数据集')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
        <Divider sx={{ my: 0.5, mx: 1 }} />
        <MenuItem {...navigateProps(`/projects/${currentProject}/multi-turn`)} sx={styles.getSimpleMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.smallListItemIconStyles}>
            <ChatIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('datasets.multiTurn', '多轮对话数据集')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
        <Divider sx={{ my: 0.5, mx: 1 }} />
        <MenuItem {...navigateProps(`/projects/${currentProject}/image-datasets`)} sx={styles.getSimpleMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.smallListItemIconStyles}>
            <ImageIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('datasets.imageQA', '图片问答数据集')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
        <Divider sx={{ my: 0.5, mx: 1 }} />
        <MenuItem {...navigateProps(`/projects/${currentProject}/image-conversations`)} sx={styles.getSimpleMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.smallListItemIconStyles}>
            <ChatIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary="图片多轮对话数据集" primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={menuState.anchorEl}
        open={isMenuOpen('eval')}
        onClose={handleMenuClose}
        hideBackdrop
        disableScrollLock
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
          elevation: 8,
          sx: {
            ...styles.getSimpleMenuPaperStyles(theme),
            pointerEvents: 'auto'
          },
          onMouseLeave: handleMenuClose
        }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        MenuListProps={{
          dense: true,
          onMouseLeave: handleMenuClose,
          sx: styles.simpleMenuListStyles
        }}
      >
        <MenuItem {...navigateProps(`/projects/${currentProject}/eval-datasets`)} sx={styles.getSimpleMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.smallListItemIconStyles}>
            <AssessmentOutlinedIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('eval.datasets')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
        <Divider sx={{ my: 0.5, mx: 1 }} />
        <MenuItem {...navigateProps(`/projects/${currentProject}/eval-tasks`)} sx={styles.getSimpleMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.smallListItemIconStyles}>
            <PlaylistPlayIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('eval.tasks')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
        <Divider sx={{ my: 0.5, mx: 1 }} />
        <MenuItem {...navigateProps(`/projects/${currentProject}/blind-test-tasks`)} sx={styles.getSimpleMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.smallListItemIconStyles}>
            <VisibilityIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('blindTest.title')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={menuState.anchorEl}
        open={isMenuOpen('more')}
        onClose={handleMenuClose}
        hideBackdrop
        disableScrollLock
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
          elevation: 8,
          sx: {
            ...styles.getSimpleMenuPaperStyles(theme),
            pointerEvents: 'auto'
          },
          onMouseLeave: handleMenuClose
        }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        MenuListProps={{
          dense: true,
          onMouseLeave: handleMenuClose,
          sx: styles.simpleMenuListStyles
        }}
      >
        <MenuItem {...navigateProps(`/projects/${currentProject}/settings`)} sx={styles.getSimpleMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.smallListItemIconStyles}>
            <SettingsOutlinedIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('settings.title')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
        <Divider sx={{ my: 0.5, mx: 1 }} />
        <MenuItem {...navigateProps(`/projects/${currentProject}/playground`)} sx={styles.getSimpleMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.smallListItemIconStyles}>
            <ScienceOutlinedIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('playground.title')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
        <Divider sx={{ my: 0.5, mx: 1 }} />
        <MenuItem {...navigateProps('/dataset-square')} sx={styles.getSimpleMenuItemStyles(theme)}>
          <ListItemIcon sx={styles.smallListItemIconStyles}>
            <StorageIcon fontSize="small" sx={styles.getPrimaryIconColorStyles(theme)} />
          </ListItemIcon>
          <ListItemText primary={t('datasetSquare.title')} primaryTypographyProps={styles.smallListItemTextStyles} />
        </MenuItem>
      </Menu>
    </>
  );
}
