'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MobileNavigation } from '@/components/mobile/MobileNavigation';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { cn } from '@/lib/utils';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface ViewportInfo {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  hasNotch: boolean;
  isStandalone: boolean;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className = ""
}) => {
  const [viewportInfo, setViewportInfo] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    orientation: 'portrait',
    deviceType: 'desktop',
    hasNotch: false,
    isStandalone: false
  });
  
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [initialViewportHeight, setInitialViewportHeight] = useState(0);

  // Media queries for responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const isLandscape = useMediaQuery('(orientation: landscape)');

  // Detect device capabilities and viewport changes
  const updateViewportInfo = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation = width > height ? 'landscape' : 'portrait';
    
    // Detect device type based on screen size and user agent
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (width <= 768) {
      deviceType = 'mobile';
    } else if (width <= 1024) {
      deviceType = 'tablet';
    }
    
    // Detect notch/safe area
    const hasNotch = CSS.supports('padding-top: env(safe-area-inset-top)') &&
                     parseInt(getComputedStyle(document.documentElement)
                       .getPropertyValue('--safe-area-inset-top') || '0') > 0;
    
    // Detect standalone mode (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;
    
    setViewportInfo({
      width,
      height,
      orientation,
      deviceType,
      hasNotch,
      isStandalone
    });
  }, []);

  // Detect virtual keyboard on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialHeight = window.innerHeight;
    setInitialViewportHeight(initialHeight);

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialHeight - currentHeight;
      
      // Keyboard is likely visible if height decreased by more than 150px
      setIsKeyboardVisible(heightDifference > 150);
      updateViewportInfo();
    };

    const handleOrientationChange = () => {
      // Delay to allow orientation change to complete
      setTimeout(() => {
        updateViewportInfo();
        setInitialViewportHeight(window.innerHeight);
      }, 100);
    };

    // Initial setup
    updateViewportInfo();

    // Event listeners
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Visual viewport API for better keyboard detection
    if ('visualViewport' in window) {
      const visualViewport = window.visualViewport!;
      
      const handleViewportChange = () => {
        const heightDifference = window.innerHeight - visualViewport.height;
        setIsKeyboardVisible(heightDifference > 150);
      };
      
      visualViewport.addEventListener('resize', handleViewportChange);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
        visualViewport.removeEventListener('resize', handleViewportChange);
      };
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateViewportInfo]);

  // Set CSS custom properties for responsive design
  useEffect(() => {
    const root = document.documentElement;
    
    root.style.setProperty('--viewport-width', `${viewportInfo.width}px`);
    root.style.setProperty('--viewport-height', `${viewportInfo.height}px`);
    root.style.setProperty('--device-type', viewportInfo.deviceType);
    root.style.setProperty('--orientation', viewportInfo.orientation);
    
    // Safe area insets
    if (viewportInfo.hasNotch) {
      root.classList.add('has-notch');
    } else {
      root.classList.remove('has-notch');
    }
    
    // Standalone mode
    if (viewportInfo.isStandalone) {
      root.classList.add('standalone');
    } else {
      root.classList.remove('standalone');
    }
    
    // Keyboard visibility
    if (isKeyboardVisible) {
      root.classList.add('keyboard-visible');
    } else {
      root.classList.remove('keyboard-visible');
    }
  }, [viewportInfo, isKeyboardVisible]);

  // Handle touch gestures for mobile
  useEffect(() => {
    if (!isMobile) return;

    let startY = 0;
    let startX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = startY - currentY;
      const deltaX = startX - currentX;

      // Prevent pull-to-refresh on iOS
      if (deltaY < 0 && window.scrollY === 0) {
        e.preventDefault();
      }

      // Handle horizontal swipe gestures
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        // Could implement swipe navigation here
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isMobile]);

  // Layout configuration based on device type
  const getLayoutConfig = () => {
    if (isMobile) {
      return {
        showMobileNav: true,
        showDesktopSidebar: false,
        contentPadding: 'pt-16 pb-20', // Account for top header and bottom nav
        maxWidth: 'max-w-full',
        spacing: 'px-4'
      };
    } else if (isTablet) {
      return {
        showMobileNav: false,
        showDesktopSidebar: true,
        contentPadding: 'pt-4',
        maxWidth: 'max-w-6xl',
        spacing: 'px-6'
      };
    } else {
      return {
        showMobileNav: false,
        showDesktopSidebar: true,
        contentPadding: 'pt-6',
        maxWidth: 'max-w-7xl',
        spacing: 'px-8'
      };
    }
  };

  const layoutConfig = getLayoutConfig();

  return (
    <div 
      className={cn(
        "min-h-screen bg-gray-50 transition-all duration-300",
        {
          'pb-safe-bottom': viewportInfo.hasNotch && isMobile,
          'pt-safe-top': viewportInfo.hasNotch && viewportInfo.isStandalone,
          'keyboard-adjusted': isKeyboardVisible
        },
        className
      )}
    >
      {/* Mobile Navigation */}
      {layoutConfig.showMobileNav && <MobileNavigation />}
      
      {/* Desktop Sidebar */}
      {layoutConfig.showDesktopSidebar && <DesktopSidebar />}
      
      {/* Main Content Area */}
      <main 
        className={cn(
          "transition-all duration-300",
          layoutConfig.contentPadding,
          {
            'ml-0': isMobile,
            'ml-64': isDesktop && layoutConfig.showDesktopSidebar,
            'ml-16': isTablet && layoutConfig.showDesktopSidebar
          }
        )}
      >
        <div 
          className={cn(
            "mx-auto",
            layoutConfig.maxWidth,
            layoutConfig.spacing
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "transition-all duration-300",
              {
                'pb-4': !isKeyboardVisible,
                'pb-0': isKeyboardVisible
              }
            )}
          >
            {children}
          </motion.div>
        </div>
      </main>
      
      {/* Viewport Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded z-50 font-mono">
          <div>Device: {viewportInfo.deviceType}</div>
          <div>Size: {viewportInfo.width}x{viewportInfo.height}</div>
          <div>Orientation: {viewportInfo.orientation}</div>
          <div>Keyboard: {isKeyboardVisible ? 'Visible' : 'Hidden'}</div>
          <div>Notch: {viewportInfo.hasNotch ? 'Yes' : 'No'}</div>
          <div>PWA: {viewportInfo.isStandalone ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveLayout;
