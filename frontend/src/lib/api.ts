/**
 * SkillForge AI - API Client
 * Comprehensive API client with authentication and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: string[];
}

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 seconds

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initializeToken();
  }

  private initializeToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      if (this.token) {
        this.setAuthToken(this.token);
      }
    }
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            await this.refreshToken();
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        // Handle other errors
        return Promise.reject(this.formatError(error));
      }
    );
  }

  private formatError(error: any): ApiError {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        errors: error.response.data?.errors || [],
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Network error - please check your connection',
        status: 0,
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        status: 0,
      };
    }
  }

  private handleAuthError() {
    this.clearAuthToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/auth/login';
    }
  }

  public setAuthToken(token: string) {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  public clearAuthToken() {
    this.token = null;
    delete this.client.defaults.headers.common['Authorization'];
  }

  private async refreshToken(): Promise<void> {
    if (!this.token) {
      throw new Error('No token to refresh');
    }

    const response = await this.client.post('/api/v1/auth/refresh');
    const newToken = response.data.access_token;
    
    this.setAuthToken(newToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', newToken);
    }
  }

  // Generic HTTP methods
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  // Paginated requests
  public async getPaginated<T>(
    url: string,
    params?: Record<string, any>
  ): Promise<PaginatedResponse<T>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<T>>>(url, { params });
    return response.data.data;
  }

  // File upload
  public async uploadFile<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await this.client.post<ApiResponse<T>>(url, formData, config);
    return response.data.data;
  }

  // Batch requests
  public async batch<T>(requests: Array<() => Promise<any>>): Promise<T[]> {
    const results = await Promise.allSettled(requests.map(req => req()));
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    ).filter(Boolean);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Specific API endpoints
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/api/v1/auth/login', { email, password }),
  
  register: (userData: any) =>
    apiClient.post('/api/v1/auth/register', userData),
  
  logout: () =>
    apiClient.post('/api/v1/auth/logout'),
  
  refreshToken: () =>
    apiClient.post('/api/v1/auth/refresh'),
  
  verifyToken: () =>
    apiClient.get('/api/v1/auth/verify'),
  
  forgotPassword: (email: string) =>
    apiClient.post('/api/v1/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    apiClient.post('/api/v1/auth/reset-password', { token, password }),
};

export const userApi = {
  getProfile: () =>
    apiClient.get('/api/v1/users/profile'),
  
  updateProfile: (userData: any) =>
    apiClient.put('/api/v1/users/profile', userData),
  
  uploadAvatar: (file: File, onProgress?: (progress: number) => void) =>
    apiClient.uploadFile('/api/v1/users/avatar', file, onProgress),
  
  getStats: () =>
    apiClient.get('/api/v1/users/stats'),
  
  getActivity: (params?: any) =>
    apiClient.getPaginated('/api/v1/users/activity', params),
};

export const skillsApi = {
  getSkills: (params?: any) =>
    apiClient.getPaginated('/api/v1/skills', params),
  
  getUserSkills: () =>
    apiClient.get('/api/v1/skills/user'),
  
  addUserSkill: (skillData: any) =>
    apiClient.post('/api/v1/skills/user', skillData),
  
  updateUserSkill: (skillId: string, skillData: any) =>
    apiClient.put(`/api/v1/skills/user/${skillId}`, skillData),
  
  deleteUserSkill: (skillId: string) =>
    apiClient.delete(`/api/v1/skills/user/${skillId}`),
  
  searchSkills: (query: string) =>
    apiClient.get(`/api/v1/skills/search?q=${encodeURIComponent(query)}`),
};

export const assessmentsApi = {
  getAssessments: (params?: any) =>
    apiClient.getPaginated('/api/v1/assessments', params),
  
  startAssessment: (skillId: string) =>
    apiClient.post(`/api/v1/assessments/start/${skillId}`),
  
  submitAnswer: (assessmentId: string, answerData: any) =>
    apiClient.post(`/api/v1/assessments/${assessmentId}/answer`, answerData),
  
  completeAssessment: (assessmentId: string) =>
    apiClient.post(`/api/v1/assessments/${assessmentId}/complete`),
  
  getResults: (assessmentId: string) =>
    apiClient.get(`/api/v1/assessments/${assessmentId}/results`),
};

export const jobsApi = {
  searchJobs: (params?: any) =>
    apiClient.getPaginated('/api/v1/jobs/search', params),
  
  getJob: (jobId: string) =>
    apiClient.get(`/api/v1/jobs/${jobId}`),
  
  getRecommendations: () =>
    apiClient.get('/api/v1/jobs/recommendations'),
  
  bookmarkJob: (jobId: string) =>
    apiClient.post(`/api/v1/jobs/${jobId}/bookmark`),
  
  removeBookmark: (jobId: string) =>
    apiClient.delete(`/api/v1/jobs/${jobId}/bookmark`),
  
  getSavedJobs: () =>
    apiClient.get('/api/v1/jobs/saved'),
  
  applyToJob: (jobId: string, applicationData: any) =>
    apiClient.post(`/api/v1/jobs/${jobId}/apply`, applicationData),
  
  getApplications: (params?: any) =>
    apiClient.getPaginated('/api/v1/jobs/applications', params),
};

export const learningApi = {
  getLearningPaths: (params?: any) =>
    apiClient.getPaginated('/api/v1/learning/paths', params),
  
  getRecommendations: () =>
    apiClient.get('/api/v1/learning/recommendations'),
  
  enrollInPath: (pathId: string) =>
    apiClient.post(`/api/v1/learning/paths/${pathId}/enroll`),
  
  getProgress: (pathId: string) =>
    apiClient.get(`/api/v1/learning/paths/${pathId}/progress`),
  
  updateProgress: (pathId: string, progressData: any) =>
    apiClient.put(`/api/v1/learning/paths/${pathId}/progress`, progressData),
  
  getContent: (contentId: string) =>
    apiClient.get(`/api/v1/learning/content/${contentId}`),
};

export const aiApi = {
  parseResume: (file: File, onProgress?: (progress: number) => void) =>
    apiClient.uploadFile('/api/v1/ai/parse-resume', file, onProgress),
  
  analyzeSkills: (skillsData: any) =>
    apiClient.post('/api/v1/ai/analyze-skills', skillsData),
  
  getCareerAdvice: (query: string) =>
    apiClient.post('/api/v1/ai/career-advice', { query }),
  
  generateLearningPath: (goalData: any) =>
    apiClient.post('/api/v1/ai/generate-learning-path', goalData),
  
  chatWithAI: (message: string, conversationId?: string) =>
    apiClient.post('/api/v1/ai/chat', { message, conversationId }),
};

export const analyticsApi = {
  getDashboardStats: () =>
    apiClient.get('/api/v1/analytics/dashboard'),
  
  getSkillTrends: (params?: any) =>
    apiClient.get('/api/v1/analytics/skill-trends', { params }),
  
  getJobMarketInsights: (params?: any) =>
    apiClient.get('/api/v1/analytics/job-market', { params }),
  
  getUserInsights: () =>
    apiClient.get('/api/v1/analytics/user-insights'),
};

export default apiClient;
