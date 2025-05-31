/**
 * SkillForge AI - Protected Route Component
 * Route protection with authentication and role-based access control
 */

'use client';

import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireOnboarding?: boolean;
  allowedRoles?: ('user' | 'admin' | 'enterprise')[];
  redirectTo?: string;
  fallback?: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireOnboarding = false,
  allowedRoles,
  redirectTo,
  fallback,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      const loginUrl = redirectTo ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}` : '/auth/login';
      router.push(loginUrl);
      return;
    }

    // Check onboarding requirement
    if (requireOnboarding && user && !user.onboardingCompleted) {
      router.push('/onboarding');
      return;
    }

    // Check role-based access
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.push('/unauthorized');
      return;
    }

    // Redirect authenticated users away from auth pages
    if (!requireAuth && isAuthenticated) {
      if (user?.onboardingCompleted) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
      return;
    }
  }, [isAuthenticated, isLoading, user, requireAuth, requireOnboarding, allowedRoles, redirectTo, router]);

  // Show loading state
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
          <p className="text-muted-foreground">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  // Show role-based unauthorized state
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Show onboarding redirect state
  if (requireOnboarding && user && !user.onboardingCompleted) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to onboarding...</p>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
};

export default ProtectedRoute;
