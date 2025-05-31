/**
 * SkillForge AI - Mobile-Responsive Design System
 * Progressive Web App with advanced mobile optimizations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fab,
  Snackbar,
  Alert,
  useMediaQuery,
  SwipeableDrawer,
  BottomNavigation,
  BottomNavigationAction,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { useSwipeable } from 'react-swipeable';
import { useVirtualizer } from '@tanstack/react-virtual';

// PWA and mobile utilities
import { usePWA } from '../../hooks/usePWA';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useGestures } from '../../hooks/useGestures';
import { useSafeArea } from '../../hooks/useSafeArea';
import { useVirtualKeyboard } from '../../hooks/useVirtualKeyboard';

// Responsive breakpoints
const breakpoints = {
  mobile: '(max-width: 768px)',
  tablet: '(min-width: 769px) and (max-width: 1024px)',
  desktop: '(min-width: 1025px)',
  touch: '(pointer: coarse)',
  hover: '(hover: hover)',
};

// Mobile-optimized styled components
const MobileContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(1),
  maxWidth: '100%',
  overflow: 'hidden',
  
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(2),
  },
  
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(3),
  },
}));

const MobileAppBar = styled(AppBar)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: theme.zIndex.appBar,
  backdropFilter: 'blur(10px)',
  backgroundColor: 'rgba(25, 118, 210, 0.9)',
  
  // Handle notch and safe areas
  paddingTop: 'env(safe-area-inset-top)',
  
  '& .MuiToolbar-root': {
    minHeight: 56,
    paddingLeft: 'max(16px, env(safe-area-inset-left))',
    paddingRight: 'max(16px, env(safe-area-inset-right))',
    
    [theme.breakpoints.up('sm')]: {
      minHeight: 64,
    },
  },
}));

const MobileDrawer = styled(SwipeableDrawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: 280,
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft: 'env(safe-area-inset-left)',
    
    [theme.breakpoints.down('sm')]: {
      width: '85vw',
      maxWidth: 320,
    },
  },
}));

const MobileBottomNav = styled(BottomNavigation)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: theme.zIndex.appBar,
  paddingBottom: 'env(safe-area-inset-bottom)',
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  
  '& .MuiBottomNavigationAction-root': {
    minWidth: 'auto',
    paddingTop: theme.spacing(1),
    
    '&.Mui-selected': {
      color: theme.palette.primary.main,
    },
  },
}));

const TouchOptimizedFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(10),
  right: theme.spacing(2),
  zIndex: theme.zIndex.fab,
  
  // Larger touch target for mobile
  minHeight: 56,
  minWidth: 56,
  
  [theme.breakpoints.down('sm')]: {
    bottom: theme.spacing(12),
    right: theme.spacing(1),
  },
}));

const VirtualizedList = styled(Box)(({ theme }) => ({
  height: '100%',
  overflow: 'auto',
  WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
  
  // Hide scrollbar on mobile for cleaner look
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  scrollbarWidth: 'none',
}));

interface MobileDesignSystemProps {
  children: React.ReactNode;
  title?: string;
  showBottomNav?: boolean;
  showFab?: boolean;
  onNavigate?: (route: string) => void;
}

export const MobileDesignSystem: React.FC<MobileDesignSystemProps> = ({
  children,
  title = 'SkillForge AI',
  showBottomNav = true,
  showFab = true,
  onNavigate,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);
  const isTouch = useMediaQuery(breakpoints.touch);
  
  // PWA and mobile hooks
  const { isInstalled, canInstall, install } = usePWA();
  const { isOnline, connectionType } = useNetworkStatus();
  const { deviceType, orientation, isStandalone } = useDeviceDetection();
  const { safeAreaInsets } = useSafeArea();
  const { isVirtualKeyboardOpen, keyboardHeight } = useVirtualKeyboard();
  
  // State management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bottomNavValue, setBottomNavValue] = useState(0);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  
  // Gesture handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => isMobile && setDrawerOpen(false),
    onSwipedRight: () => isMobile && setDrawerOpen(true),
    trackMouse: false,
    trackTouch: true,
  });
  
  const gestureHandlers = useGestures({
    onPinch: (scale) => {
      // Handle pinch-to-zoom if needed
      console.log('Pinch gesture:', scale);
    },
    onRotate: (angle) => {
      // Handle rotation gestures
      console.log('Rotate gesture:', angle);
    },
  });
  
  // Navigation items
  const navigationItems = useMemo(() => [
    { label: 'Dashboard', icon: <HomeIcon />, route: '/dashboard' },
    { label: 'Learning', icon: <SchoolIcon />, route: '/learning' },
    { label: 'Jobs', icon: <WorkIcon />, route: '/jobs' },
    { label: 'Profile', icon: <PersonIcon />, route: '/profile' },
  ], []);
  
  const speedDialActions = useMemo(() => [
    { icon: <SearchIcon />, name: 'Search', action: () => onNavigate?.('/search') },
    { icon: <AddIcon />, name: 'Add Skill', action: () => onNavigate?.('/skills/add') },
    { icon: <NotificationsIcon />, name: 'Notifications', action: () => setNotifications([]) },
  ], [onNavigate]);
  
  // Handle drawer toggle
  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen(!drawerOpen);
  }, [drawerOpen]);
  
  // Handle bottom navigation
  const handleBottomNavChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setBottomNavValue(newValue);
    const route = navigationItems[newValue]?.route;
    if (route && onNavigate) {
      onNavigate(route);
    }
  }, [navigationItems, onNavigate]);
  
  // Handle orientation change
  useEffect(() => {
    const handleOrientationChange = () => {
      // Force layout recalculation on orientation change
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);
  
  // Handle network status changes
  useEffect(() => {
    if (!isOnline) {
      setNotifications(prev => [...prev, 'You are currently offline. Some features may be limited.']);
    }
  }, [isOnline]);
  
  // PWA install prompt
  useEffect(() => {
    if (canInstall && !isInstalled && isMobile) {
      setNotifications(prev => [...prev, 'Install SkillForge AI for a better experience!']);
    }
  }, [canInstall, isInstalled, isMobile]);
  
  // Render drawer content
  const renderDrawerContent = () => (
    <Box sx={{ width: 280, pt: 2 }}>
      <Typography variant="h6" sx={{ px: 2, mb: 2 }}>
        SkillForge AI
      </Typography>
      <List>
        {navigationItems.map((item, index) => (
          <ListItem
            button
            key={item.label}
            onClick={() => {
              onNavigate?.(item.route);
              setDrawerOpen(false);
            }}
            sx={{
              minHeight: 48,
              px: 2,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
        <ListItem
          button
          onClick={() => {
            onNavigate?.('/settings');
            setDrawerOpen(false);
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItem>
      </List>
      
      {/* PWA Install Button */}
      {canInstall && !isInstalled && (
        <Box sx={{ p: 2, mt: 'auto' }}>
          <button
            onClick={install}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Install App
          </button>
        </Box>
      )}
    </Box>
  );
  
  return (
    <Box
      {...swipeHandlers}
      {...gestureHandlers}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        
        // Handle safe areas
        paddingTop: isStandalone ? 'env(safe-area-inset-top)' : 0,
        paddingBottom: isStandalone ? 'env(safe-area-inset-bottom)' : 0,
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        
        // Adjust for virtual keyboard
        marginBottom: isVirtualKeyboardOpen ? `${keyboardHeight}px` : 0,
        transition: 'margin-bottom 0.3s ease',
      }}
    >
      {/* App Bar */}
      <MobileAppBar position="fixed" elevation={0}>
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          
          {/* Network status indicator */}
          {!isOnline && (
            <Typography variant="caption" sx={{ mr: 2, opacity: 0.7 }}>
              Offline
            </Typography>
          )}
          
          <IconButton color="inherit" onClick={() => setNotifications([])}>
            <NotificationsIcon />
            {notifications.length > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'error.main',
                }}
              />
            )}
          </IconButton>
        </Toolbar>
      </MobileAppBar>
      
      {/* Navigation Drawer */}
      <MobileDrawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        disableBackdropTransition={!isMobile}
        disableDiscovery={!isMobile}
        swipeAreaWidth={isMobile ? 20 : 0}
      >
        {renderDrawerContent()}
      </MobileDrawer>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 8, // Account for app bar
          pb: showBottomNav && isMobile ? 8 : 2, // Account for bottom nav
          overflow: 'hidden',
        }}
      >
        <MobileContainer maxWidth="lg">
          {children}
        </MobileContainer>
      </Box>
      
      {/* Bottom Navigation (Mobile Only) */}
      {showBottomNav && isMobile && (
        <MobileBottomNav
          value={bottomNavValue}
          onChange={handleBottomNavChange}
          showLabels
        >
          {navigationItems.map((item, index) => (
            <BottomNavigationAction
              key={item.label}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </MobileBottomNav>
      )}
      
      {/* Speed Dial FAB */}
      {showFab && (
        <SpeedDial
          ariaLabel="Quick Actions"
          sx={{
            position: 'fixed',
            bottom: isMobile ? 80 : 16,
            right: 16,
            zIndex: theme.zIndex.fab,
          }}
          icon={<SpeedDialIcon />}
          open={speedDialOpen}
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={() => {
                action.action();
                setSpeedDialOpen(false);
              }}
            />
          ))}
        </SpeedDial>
      )}
      
      {/* Notifications */}
      {notifications.map((notification, index) => (
        <Snackbar
          key={index}
          open={true}
          autoHideDuration={6000}
          onClose={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ mt: 8 }}
        >
          <Alert
            onClose={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
            severity="info"
            variant="filled"
          >
            {notification}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

// Virtualized List Component for Performance
interface VirtualizedListProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemHeight: number;
  height: number;
}

export const MobileVirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  renderItem,
  itemHeight,
  height,
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });
  
  return (
    <VirtualizedList
      ref={parentRef}
      sx={{
        height,
        overflow: 'auto',
      }}
    >
      <Box
        sx={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <Box
            key={virtualItem.key}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </Box>
        ))}
      </Box>
    </VirtualizedList>
  );
};

// Touch-optimized components
export const TouchButton = styled('button')(({ theme }) => ({
  minHeight: 44, // iOS recommended touch target
  minWidth: 44,
  padding: theme.spacing(1.5),
  border: 'none',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontSize: '16px', // Prevent zoom on iOS
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  
  '&:active': {
    transform: 'scale(0.98)',
    backgroundColor: theme.palette.primary.dark,
  },
  
  '&:disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
}));

export const TouchInput = styled('input')(({ theme }) => ({
  width: '100%',
  minHeight: 44,
  padding: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  fontSize: '16px', // Prevent zoom on iOS
  backgroundColor: theme.palette.background.paper,
  
  '&:focus': {
    outline: 'none',
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}25`,
  },
}));

export default MobileDesignSystem;
