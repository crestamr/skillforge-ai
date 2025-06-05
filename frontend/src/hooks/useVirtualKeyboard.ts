import { useState, useEffect } from 'react';

interface VirtualKeyboardState {
  isVisible: boolean;
  height: number;
  overlayHeight: number;
}

export const useVirtualKeyboard = () => {
  const [keyboardState, setKeyboardState] = useState<VirtualKeyboardState>({
    isVisible: false,
    height: 0,
    overlayHeight: 0,
  });

  useEffect(() => {
    // Store initial viewport height
    const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    let currentViewportHeight = initialViewportHeight;

    const updateKeyboardState = () => {
      const viewport = window.visualViewport;
      const newViewportHeight = viewport?.height || window.innerHeight;
      
      // Calculate keyboard height
      const heightDifference = initialViewportHeight - newViewportHeight;
      const isKeyboardVisible = heightDifference > 150; // Threshold for keyboard detection
      
      // Calculate overlay height (how much content is covered)
      const overlayHeight = isKeyboardVisible ? heightDifference : 0;

      setKeyboardState({
        isVisible: isKeyboardVisible,
        height: isKeyboardVisible ? heightDifference : 0,
        overlayHeight,
      });

      currentViewportHeight = newViewportHeight;
    };

    // Fallback method for older browsers
    const fallbackUpdateKeyboardState = () => {
      const newHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - newHeight;
      const isKeyboardVisible = heightDifference > 150;

      setKeyboardState({
        isVisible: isKeyboardVisible,
        height: isKeyboardVisible ? heightDifference : 0,
        overlayHeight: isKeyboardVisible ? heightDifference : 0,
      });
    };

    // Use Visual Viewport API if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateKeyboardState);
      
      // Initial check
      updateKeyboardState();
      
      return () => {
        window.visualViewport?.removeEventListener('resize', updateKeyboardState);
      };
    } else {
      // Fallback for older browsers
      let resizeTimeout: NodeJS.Timeout;
      
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(fallbackUpdateKeyboardState, 100);
      };

      window.addEventListener('resize', handleResize);
      
      // Also listen for focus/blur events on input elements
      const handleFocusIn = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          setTimeout(fallbackUpdateKeyboardState, 300);
        }
      };

      const handleFocusOut = () => {
        setTimeout(fallbackUpdateKeyboardState, 300);
      };

      document.addEventListener('focusin', handleFocusIn);
      document.addEventListener('focusout', handleFocusOut);

      // Initial check
      fallbackUpdateKeyboardState();

      return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('focusin', handleFocusIn);
        document.removeEventListener('focusout', handleFocusOut);
        clearTimeout(resizeTimeout);
      };
    }
  }, []);

  // Helper function to get styles for keyboard-aware layouts
  const getKeyboardAwareStyle = (options: {
    adjustForKeyboard?: boolean;
    maintainViewport?: boolean;
  } = {}) => {
    const { adjustForKeyboard = true, maintainViewport = false } = options;

    if (!adjustForKeyboard || !keyboardState.isVisible) {
      return {};
    }

    if (maintainViewport) {
      // Maintain viewport by adding bottom padding
      return {
        paddingBottom: `${keyboardState.height}px`,
      };
    } else {
      // Shrink content area
      return {
        height: `calc(100vh - ${keyboardState.height}px)`,
        maxHeight: `calc(100vh - ${keyboardState.height}px)`,
      };
    }
  };

  // Helper function to scroll element into view when keyboard appears
  const scrollIntoView = (element: HTMLElement, options: {
    offset?: number;
    behavior?: ScrollBehavior;
  } = {}) => {
    if (!keyboardState.isVisible) return;

    const { offset = 20, behavior = 'smooth' } = options;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    
    // Check if element is hidden behind keyboard
    if (rect.bottom > viewportHeight - offset) {
      const scrollTop = window.pageYOffset + rect.bottom - viewportHeight + offset;
      window.scrollTo({
        top: scrollTop,
        behavior,
      });
    }
  };

  return {
    ...keyboardState,
    getKeyboardAwareStyle,
    scrollIntoView,
  };
};
