import { useRef, useEffect } from 'react';

interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

interface GestureOptions {
  threshold?: number;
  preventScroll?: boolean;
  enablePinch?: boolean;
}

export const useGestures = (
  handlers: GestureHandlers,
  options: GestureOptions = {}
) => {
  const elementRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number>(0);

  const {
    threshold = 50,
    preventScroll = false,
    enablePinch = false,
  } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const getTouchPoint = (e: TouchEvent) => {
      return {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    };

    const getDistance = (touch1: Touch, touch2: Touch) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault();
      }

      if (e.touches.length === 1) {
        touchStartRef.current = getTouchPoint(e);
        
        // Start long press timer
        if (handlers.onLongPress) {
          longPressTimerRef.current = setTimeout(() => {
            handlers.onLongPress?.();
          }, 500);
        }
      } else if (e.touches.length === 2 && enablePinch) {
        initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault();
      }

      // Cancel long press if finger moves
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (e.touches.length === 2 && enablePinch && initialDistanceRef.current > 0) {
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const ratio = currentDistance / initialDistanceRef.current;
        
        if (ratio > 1.2) {
          handlers.onPinchOut?.();
          initialDistanceRef.current = currentDistance;
        } else if (ratio < 0.8) {
          handlers.onPinchIn?.();
          initialDistanceRef.current = currentDistance;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (preventScroll) {
        e.preventDefault();
      }

      // Cancel long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (!touchStartRef.current) return;

      if (e.changedTouches.length === 1) {
        touchEndRef.current = {
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY,
          time: Date.now(),
        };

        const deltaX = touchEndRef.current.x - touchStartRef.current.x;
        const deltaY = touchEndRef.current.y - touchStartRef.current.y;
        const deltaTime = touchEndRef.current.time - touchStartRef.current.time;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Check for tap/double tap
        if (distance < 10 && deltaTime < 300) {
          const now = Date.now();
          const timeSinceLastTap = now - lastTapRef.current;
          
          if (timeSinceLastTap < 300 && handlers.onDoubleTap) {
            handlers.onDoubleTap();
            lastTapRef.current = 0; // Reset to prevent triple tap
          } else {
            lastTapRef.current = now;
            // Delay single tap to check for double tap
            setTimeout(() => {
              if (lastTapRef.current === now) {
                handlers.onTap?.();
              }
            }, 300);
          }
        }
        // Check for swipe
        else if (distance > threshold) {
          const absDeltaX = Math.abs(deltaX);
          const absDeltaY = Math.abs(deltaY);

          if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (deltaX > 0) {
              handlers.onSwipeRight?.();
            } else {
              handlers.onSwipeLeft?.();
            }
          } else {
            // Vertical swipe
            if (deltaY > 0) {
              handlers.onSwipeDown?.();
            } else {
              handlers.onSwipeUp?.();
            }
          }
        }
      }

      touchStartRef.current = null;
      touchEndRef.current = null;
      initialDistanceRef.current = 0;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventScroll });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [handlers, threshold, preventScroll, enablePinch]);

  return elementRef;
};
