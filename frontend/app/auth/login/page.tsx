/**
 * SkillForge AI - Login Page
 * User authentication login page
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LoginForm from '../../../src/components/auth/LoginForm';
import ProtectedRoute from '../../../src/components/auth/ProtectedRoute';

export default function LoginPage() {
  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        {/* Header */}
        <header className="p-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-sm text-gray-500">
          <p>
            © 2024 SkillForge AI. All rights reserved.
          </p>
        </footer>
      </div>
    </ProtectedRoute>
  );
}
