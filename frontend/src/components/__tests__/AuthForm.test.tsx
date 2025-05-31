/**
 * SkillForge AI - Authentication Form Component Tests
 * Comprehensive tests for login and registration forms
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { AuthForm } from '../AuthForm';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock API calls
vi.mock('../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    requestPasswordReset: vi.fn(),
  },
}));

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AuthForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Form', () => {
    it('renders login form correctly', () => {
      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('submits login form with valid data', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockResolvedValue({
        access_token: 'fake-token',
        user: { id: 1, email: 'test@example.com' }
      });
      
      vi.mocked(require('../../services/api').authAPI.login).mockImplementation(mockLogin);

      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });

    it('displays error message on login failure', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
      
      vi.mocked(require('../../services/api').authAPI.login).mockImplementation(mockLogin);

      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      const mockLogin = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      vi.mocked(require('../../services/api').authAPI.login).mockImplementation(mockLogin);

      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Registration Form', () => {
    it('renders registration form correctly', () => {
      render(
        <TestWrapper>
          <AuthForm mode="register" />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('validates password confirmation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AuthForm mode="register" />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('validates password strength', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AuthForm mode="register" />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/^password/i);
      
      await user.type(passwordInput, 'weak');
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('shows password strength indicator', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AuthForm mode="register" />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/^password/i);
      
      await user.type(passwordInput, 'WeakPass1');
      expect(screen.getByText(/weak/i)).toBeInTheDocument();
      
      await user.clear(passwordInput);
      await user.type(passwordInput, 'StrongPassword123!');
      expect(screen.getByText(/strong/i)).toBeInTheDocument();
    });

    it('submits registration form with valid data', async () => {
      const user = userEvent.setup();
      const mockRegister = vi.fn().mockResolvedValue({
        user_id: 1,
        email_verification_sent: true
      });
      
      vi.mocked(require('../../services/api').authAPI.register).mockImplementation(mockRegister);

      render(
        <TestWrapper>
          <AuthForm mode="register" />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'SecurePassword123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123!');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          password: 'SecurePassword123!',
          confirm_password: 'SecurePassword123!'
        });
      });
    });

    it('displays success message after registration', async () => {
      const user = userEvent.setup();
      const mockRegister = vi.fn().mockResolvedValue({
        user_id: 1,
        email_verification_sent: true
      });
      
      vi.mocked(require('../../services/api').authAPI.register).mockImplementation(mockRegister);

      render(
        <TestWrapper>
          <AuthForm mode="register" />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'SecurePassword123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123!');
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Reset Form', () => {
    it('renders password reset form correctly', () => {
      render(
        <TestWrapper>
          <AuthForm mode="reset" />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('submits password reset request', async () => {
      const user = userEvent.setup();
      const mockReset = vi.fn().mockResolvedValue({ message: 'Reset email sent' });
      
      vi.mocked(require('../../services/api').authAPI.requestPasswordReset).mockImplementation(mockReset);

      render(
        <TestWrapper>
          <AuthForm mode="reset" />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({ email: 'test@example.com' });
        expect(screen.getByText(/reset email sent/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label', 'Sign in form');

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('aria-required', 'true');

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('aria-required', 'true');
    });

    it('announces form errors to screen readers', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/email is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Tab through form elements
      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });

  describe('Form Mode Switching', () => {
    it('switches between login and register modes', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();

      const switchLink = screen.getByText(/create one/i);
      await user.click(switchLink);

      expect(mockNavigate).toHaveBeenCalledWith('/register');
    });

    it('preserves email when switching modes', async () => {
      const user = userEvent.setup();
      
      const { rerender } = render(
        <TestWrapper>
          <AuthForm mode="login" />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      rerender(
        <TestWrapper>
          <AuthForm mode="register" />
        </TestWrapper>
      );

      const newEmailInput = screen.getByLabelText(/email/i);
      expect(newEmailInput).toHaveValue('test@example.com');
    });
  });
});
