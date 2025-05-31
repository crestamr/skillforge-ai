/**
 * SkillForge AI - Login Form Component
 * Comprehensive login form with validation and OAuth integration
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Eye, EyeOff, Github, Linkedin, Mail } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchToRegister?: () => void;
  redirectTo?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister, redirectTo }) => {
  const { login, loginWithOAuth, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await login(data.email, data.password);
      reset();
    } catch (error) {
      // Error is handled by the auth context
      console.error('Login error:', error);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github' | 'linkedin') => {
    try {
      clearError();
      await loginWithOAuth(provider);
    } catch (error) {
      console.error('OAuth login error:', error);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Welcome back
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to your SkillForge AI account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* OAuth Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant="outline"
            onClick={() => handleOAuthLogin('google')}
            disabled={isLoading}
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleOAuthLogin('github')}
            disabled={isLoading}
            className="w-full"
          >
            <Github className="mr-2 h-4 w-4" />
            Continue with GitHub
          </Button>
          
          <Button
            variant="outline"
            onClick={() => handleOAuthLogin('linkedin')}
            disabled={isLoading}
            className="w-full"
          >
            <Linkedin className="mr-2 h-4 w-4" />
            Continue with LinkedIn
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                {...register('password')}
                className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="rememberMe"
                type="checkbox"
                {...register('rememberMe')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="rememberMe" className="text-sm">
                Remember me
              </Label>
            </div>
            
            <Link
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        {/* Switch to Register */}
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          {onSwitchToRegister ? (
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign up
            </button>
          ) : (
            <Link
              href="/auth/register"
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign up
            </Link>
          )}
        </div>

        {/* Terms and Privacy */}
        <div className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-primary">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
