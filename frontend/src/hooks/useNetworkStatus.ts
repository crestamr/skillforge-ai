import { useState, useEffect } from 'react';

interface NetworkState {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

export const useNetworkStatus = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
  });

  useEffect(() => {
    const updateNetworkState = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      const isOnline = navigator.onLine;
      let isSlowConnection = false;
      let connectionType = 'unknown';
      let effectiveType = 'unknown';
      let downlink = 0;
      let rtt = 0;

      if (connection) {
        connectionType = connection.type || 'unknown';
        effectiveType = connection.effectiveType || 'unknown';
        downlink = connection.downlink || 0;
        rtt = connection.rtt || 0;
        
        // Consider connection slow if effective type is 2g or 3g, or downlink is very low
        isSlowConnection = effectiveType === '2g' || 
                          effectiveType === 'slow-2g' || 
                          (effectiveType === '3g' && downlink < 1);
      }

      setNetworkState({
        isOnline,
        isSlowConnection,
        connectionType,
        effectiveType,
        downlink,
        rtt,
      });
    };

    // Initial check
    updateNetworkState();

    // Listen for online/offline events
    const handleOnline = () => updateNetworkState();
    const handleOffline = () => updateNetworkState();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkState);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkState);
      }
    };
  }, []);

  return networkState;
};
