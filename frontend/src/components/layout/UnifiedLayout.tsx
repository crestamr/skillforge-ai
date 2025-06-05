'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import DashboardLayout from './DashboardLayout';
import { ResponsiveLayout } from './ResponsiveLayout';
import { MobileDesignSystem } from '@/components/mobile/MobileDesignSystem';

interface UnifiedLayoutProps {
  children: React.ReactNode;
}

export const UnifiedLayout: React.FC<UnifiedLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [layoutType, setLayoutType] = useState<'auth' | 'dashboard' | 'responsive' | 'mobile'>('auth');

  useEffect(() => {
    // Determine which layout to use based on route and device
    if (!isAuthenticated) {
      setLayoutType('auth');
    } else if (pathname.startsWith('/dashboard')) {
      setLayoutType('dashboard');
    } else if (isMobile) {
      setLayoutType('mobile');
    } else {
      setLayoutType('responsive');
    }
  }, [pathname, isAuthenticated, isMobile]);

  // Auth pages (login, register, landing) - minimal layout
  if (layoutType === 'auth') {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  // Dashboard pages - use DashboardLayout
  if (layoutType === 'dashboard') {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  // Mobile-specific layout with mobile design system
  if (layoutType === 'mobile') {
    return (
      <MobileDesignSystem>
        {children}
      </MobileDesignSystem>
    );
  }

  // Default responsive layout for other authenticated pages
  return (
    <ResponsiveLayout>
      {children}
    </ResponsiveLayout>
  );
};
