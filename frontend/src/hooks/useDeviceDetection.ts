import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  screenSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  orientation: 'portrait' | 'landscape';
  hasTouch: boolean;
  pixelRatio: number;
}

export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    screenSize: 'lg',
    orientation: 'landscape',
    hasTouch: false,
    pixelRatio: 1,
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const userAgent = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Device type detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
                      width < 768;
      const isTablet = /iPad|Android/i.test(userAgent) && width >= 768 && width < 1024;
      const isDesktop = !isMobile && !isTablet;

      // OS detection
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);

      // Browser detection
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isChrome = /Chrome/.test(userAgent);
      const isFirefox = /Firefox/.test(userAgent);

      // Screen size detection (Tailwind breakpoints)
      let screenSize: DeviceInfo['screenSize'] = 'sm';
      if (width >= 1536) screenSize = '2xl';
      else if (width >= 1280) screenSize = 'xl';
      else if (width >= 1024) screenSize = 'lg';
      else if (width >= 768) screenSize = 'md';

      // Orientation
      const orientation = height > width ? 'portrait' : 'landscape';

      // Touch support
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Pixel ratio
      const pixelRatio = window.devicePixelRatio || 1;

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isIOS,
        isAndroid,
        isSafari,
        isChrome,
        isFirefox,
        screenSize,
        orientation,
        hasTouch,
        pixelRatio,
      });
    };

    // Initial detection
    updateDeviceInfo();

    // Listen for resize and orientation changes
    const handleResize = () => updateDeviceInfo();
    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated
      setTimeout(updateDeviceInfo, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return deviceInfo;
};
