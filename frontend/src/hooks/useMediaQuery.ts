import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design using CSS media queries
 * Provides real-time updates when media query conditions change
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Return false during SSR
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Predefined breakpoint hooks for common responsive design patterns
 */
export const useBreakpoints = () => {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isLarge = useMediaQuery('(min-width: 1280px)');
  const isXLarge = useMediaQuery('(min-width: 1536px)');
  
  const isMobileOrTablet = useMediaQuery('(max-width: 1023px)');
  const isTabletOrDesktop = useMediaQuery('(min-width: 768px)');
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isLarge,
    isXLarge,
    isMobileOrTablet,
    isTabletOrDesktop,
    // Convenience properties
    current: isMobile ? 'mobile' : isTablet ? 'tablet' : isDesktop ? 'desktop' : 'large'
  };
};

/**
 * Hook for detecting device orientation
 */
export const useOrientation = () => {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  
  return {
    isPortrait,
    isLandscape,
    orientation: isPortrait ? 'portrait' : 'landscape'
  };
};

/**
 * Hook for detecting device capabilities
 */
export const useDeviceCapabilities = () => {
  const hasHover = useMediaQuery('(hover: hover)');
  const hasPointer = useMediaQuery('(pointer: fine)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const isHighDensity = useMediaQuery('(min-resolution: 2dppx)');
  
  return {
    hasHover,
    hasPointer,
    prefersReducedMotion,
    prefersDarkMode,
    isHighDensity,
    isTouchDevice: !hasHover && !hasPointer
  };
};

/**
 * Hook for detecting print media
 */
export const usePrintMedia = () => {
  return useMediaQuery('print');
};
