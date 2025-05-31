/**
 * SkillForge AI - Authentication Context
 * Comprehensive authentication state management with JWT and session handling
 */

'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: 'user' | 'admin' | 'enterprise';
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  isEmailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  lastLoginAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  clearError: () => void;
  loginWithOAuth: (provider: 'google' | 'github' | 'linkedin') => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  agreeToTerms: boolean;
}

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Auth Provider
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');

      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          
          // Verify token is still valid
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user, token },
            });
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and user data
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(data.user));

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: data.user,
          token: data.access_token,
        },
      });

      // Redirect based on onboarding status
      if (!data.user.onboardingCompleted) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Login failed',
      });
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Store token and user data
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(data.user));

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: data.user,
          token: data.access_token,
        },
      });

      // Redirect to onboarding
      router.push('/onboarding');
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  };

  // OAuth login function
  const loginWithOAuth = async (provider: 'google' | 'github' | 'linkedin'): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      // Redirect to OAuth provider
      window.location.href = `${API_BASE_URL}/api/v1/auth/oauth/${provider}`;
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'OAuth login failed',
      });
    }
  };

  // Logout function
  const logout = (): void => {
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');

    // Clear auth state
    dispatch({ type: 'LOGOUT' });

    // Redirect to home
    router.push('/');
  };

  // Refresh token function
  const refreshToken = async (): Promise<void> => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      logout();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      // Update token
      localStorage.setItem('auth_token', data.access_token);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: state.user!,
          token: data.access_token,
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
    }
  };

  // Update profile function
  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    if (!state.token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`,
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }

      // Update local storage
      localStorage.setItem('user_data', JSON.stringify(data.user));

      dispatch({
        type: 'UPDATE_USER',
        payload: data.user,
      });
    } catch (error) {
      throw error;
    }
  };

  // Clear error function
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Context value
  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    clearError,
    loginWithOAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
