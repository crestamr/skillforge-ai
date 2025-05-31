/**
 * SkillForge AI - Onboarding Page
 * Multi-step user onboarding process
 */

'use client';

import React from 'react';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';
import ComprehensiveOnboardingFlow from '../../src/components/onboarding/ComprehensiveOnboardingFlow';

export default function OnboardingPage() {
  return (
    <ProtectedRoute requireAuth={true} requireOnboarding={false}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <ComprehensiveOnboardingFlow />
      </div>
    </ProtectedRoute>
  );
}
