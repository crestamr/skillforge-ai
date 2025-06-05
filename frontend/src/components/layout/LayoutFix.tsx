'use client';

import React, { useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface LayoutFixProps {
  children: React.ReactNode;
}

export const LayoutFix: React.FC<LayoutFixProps> = ({ children }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    // Fix viewport height on mobile devices
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial value
    setVH();

    // Update on resize and orientation change
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', () => {
      setTimeout(setVH, 100);
    });

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  useEffect(() => {
    // Fix iOS Safari bottom bar issue
    if (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      const fixIOSViewport = () => {
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
          );
        }
      };
      
      fixIOSViewport();
    }
  }, []);

  useEffect(() => {
    // Prevent zoom on input focus for iOS
    if (isMobile && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      const inputs = document.querySelectorAll('input, select, textarea');
      
      const preventZoom = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
          target.style.fontSize = '16px';
        }
      };

      inputs.forEach(input => {
        input.addEventListener('focus', preventZoom);
      });

      return () => {
        inputs.forEach(input => {
          input.removeEventListener('focus', preventZoom);
        });
      };
    }
  }, [isMobile]);

  useEffect(() => {
    // Fix scroll behavior on mobile
    if (isMobile) {
      document.body.style.overscrollBehavior = 'none';
      document.body.style.touchAction = 'pan-x pan-y';
      
      return () => {
        document.body.style.overscrollBehavior = '';
        document.body.style.touchAction = '';
      };
    }
  }, [isMobile]);

  useEffect(() => {
    // Add layout classes to body
    const bodyClasses = ['layout-fixed'];
    
    if (isMobile) {
      bodyClasses.push('mobile-layout');
    } else {
      bodyClasses.push('desktop-layout');
    }

    bodyClasses.forEach(className => {
      document.body.classList.add(className);
    });

    return () => {
      bodyClasses.forEach(className => {
        document.body.classList.remove(className);
      });
    };
  }, [isMobile]);

  return (
    <div 
      className="layout-wrapper"
      style={{
        minHeight: isMobile ? 'calc(var(--vh, 1vh) * 100)' : '100vh',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  );
};
