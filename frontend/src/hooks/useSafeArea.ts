import { useState, useEffect } from 'react';

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const useSafeArea = () => {
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeArea = () => {
      // Get CSS environment variables for safe area insets
      const computedStyle = getComputedStyle(document.documentElement);
      
      const top = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0', 10);
      const right = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0', 10);
      const bottom = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10);
      const left = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0', 10);

      // Fallback detection for devices that don't support env() variables
      let fallbackTop = 0;
      let fallbackBottom = 0;

      // Detect iPhone X and newer models with notch/dynamic island
      const isIPhoneX = /iPhone/.test(navigator.userAgent) && 
                       (window.screen.height === 812 || // iPhone X, XS
                        window.screen.height === 896 || // iPhone XR, XS Max
                        window.screen.height === 844 || // iPhone 12, 12 Pro
                        window.screen.height === 926 || // iPhone 12 Pro Max
                        window.screen.height === 852 || // iPhone 14 Pro
                        window.screen.height === 932);  // iPhone 14 Pro Max

      if (isIPhoneX) {
        // Check if in landscape mode
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isLandscape) {
          fallbackTop = 0;
          fallbackBottom = 21; // Home indicator
        } else {
          fallbackTop = 44; // Status bar + notch/dynamic island
          fallbackBottom = 34; // Home indicator
        }
      }

      // Detect Android devices with gesture navigation
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isAndroid) {
        // Android gesture navigation typically has bottom inset
        fallbackBottom = 24;
      }

      setSafeAreaInsets({
        top: top || fallbackTop,
        right: right,
        bottom: bottom || fallbackBottom,
        left: left,
      });
    };

    // Initial calculation
    updateSafeArea();

    // Listen for orientation changes
    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated
      setTimeout(updateSafeArea, 100);
    };

    // Listen for resize events
    const handleResize = () => updateSafeArea();

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Helper functions to get CSS values
  const getSafeAreaStyle = () => ({
    paddingTop: `${safeAreaInsets.top}px`,
    paddingRight: `${safeAreaInsets.right}px`,
    paddingBottom: `${safeAreaInsets.bottom}px`,
    paddingLeft: `${safeAreaInsets.left}px`,
  });

  const getSafeAreaClasses = () => {
    const classes = [];
    
    if (safeAreaInsets.top > 0) classes.push(`pt-[${safeAreaInsets.top}px]`);
    if (safeAreaInsets.right > 0) classes.push(`pr-[${safeAreaInsets.right}px]`);
    if (safeAreaInsets.bottom > 0) classes.push(`pb-[${safeAreaInsets.bottom}px]`);
    if (safeAreaInsets.left > 0) classes.push(`pl-[${safeAreaInsets.left}px]`);
    
    return classes.join(' ');
  };

  return {
    safeAreaInsets,
    getSafeAreaStyle,
    getSafeAreaClasses,
    hasSafeArea: Object.values(safeAreaInsets).some(value => value > 0),
  };
};
