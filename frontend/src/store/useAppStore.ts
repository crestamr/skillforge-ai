/**
 * SkillForge AI - Global App Store
 * Zustand-based state management for the application
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export interface User {
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
  token?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: number;
  verified: boolean;
  endorsements: number;
  lastAssessed?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: { min: number; max: number };
  remote: boolean;
  matchScore?: number;
  isBookmarked: boolean;
  applicationStatus?: string;
  postedDate: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  skills: string[];
  estimatedHours: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  progress: number;
  isEnrolled: boolean;
  isRecommended?: boolean;
  category?: string;
  provider?: string;
  rating?: number;
  enrolledCount?: number;
  price?: number;
  currency?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface AppState {
  // UI State
  isLoading: boolean;
  isSidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  
  // User Data
  user: User | null;
  userSkills: Skill[];
  userStats: {
    totalSkills: number;
    assessmentsCompleted: number;
    learningHours: number;
    jobApplications: number;
    skillsImproved: number;
  } | null;
  
  // Jobs Data
  jobs: Job[];
  savedJobs: Job[];
  jobRecommendations: Job[];
  jobSearchFilters: {
    query: string;
    location: string;
    remote: boolean;
    salaryMin: number;
    salaryMax: number;
    employmentTypes: string[];
  };
  
  // Learning Data
  learningPaths: LearningPath[];
  enrolledPaths: LearningPath[];
  learningRecommendations: LearningPath[];
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Cache timestamps
  lastUpdated: {
    userSkills?: string;
    jobs?: string;
    learningPaths?: string;
    notifications?: string;
  };
}

export interface AppActions {
  // UI Actions
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // User Actions
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setUserSkills: (skills: Skill[]) => void;
  addUserSkill: (skill: Skill) => void;
  updateUserSkill: (skillId: string, updates: Partial<Skill>) => void;
  removeUserSkill: (skillId: string) => void;
  setUserStats: (stats: AppState['userStats']) => void;
  
  // Jobs Actions
  setJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  setSavedJobs: (jobs: Job[]) => void;
  toggleJobBookmark: (jobId: string) => void;
  setJobRecommendations: (jobs: Job[]) => void;
  updateJobSearchFilters: (filters: Partial<AppState['jobSearchFilters']>) => void;
  
  // Learning Actions
  setLearningPaths: (paths: LearningPath[]) => void;
  setEnrolledPaths: (paths: LearningPath[]) => void;
  enrollInPath: (pathId: string) => void;
  updateLearningProgress: (pathId: string, progress: number) => void;
  setLearningRecommendations: (paths: LearningPath[]) => void;
  
  // Notification Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (notificationId: string) => void;
  
  // Cache Actions
  updateLastUpdated: (key: keyof AppState['lastUpdated']) => void;
  shouldRefresh: (key: keyof AppState['lastUpdated'], maxAge?: number) => boolean;
  
  // Reset Actions
  resetUserData: () => void;
  resetJobsData: () => void;
  resetLearningData: () => void;
  resetAll: () => void;
}

type AppStore = AppState & AppActions;

// Initial state
const initialState: AppState = {
  // UI State
  isLoading: false,
  isSidebarOpen: true,
  theme: 'system',
  
  // User Data
  user: null,
  userSkills: [],
  userStats: null,
  
  // Jobs Data
  jobs: [],
  savedJobs: [],
  jobRecommendations: [],
  jobSearchFilters: {
    query: '',
    location: '',
    remote: false,
    salaryMin: 0,
    salaryMax: 300000,
    employmentTypes: [],
  },
  
  // Learning Data
  learningPaths: [],
  enrolledPaths: [],
  learningRecommendations: [],
  
  // Notifications
  notifications: [],
  unreadCount: 0,
  
  // Cache timestamps
  lastUpdated: {},
};

// Create store
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // UI Actions
        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),
        
        toggleSidebar: () =>
          set((state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
          }),
        
        setTheme: (theme) =>
          set((state) => {
            state.theme = theme;
          }),
        
        // User Actions
        setUser: (user) =>
          set((state) => {
            state.user = user;
          }),
        
        updateUser: (updates) =>
          set((state) => {
            if (state.user) {
              Object.assign(state.user, updates);
            }
          }),
        
        setUserSkills: (skills) =>
          set((state) => {
            state.userSkills = skills;
            state.lastUpdated.userSkills = new Date().toISOString();
          }),
        
        addUserSkill: (skill) =>
          set((state) => {
            state.userSkills.push(skill);
            state.lastUpdated.userSkills = new Date().toISOString();
          }),
        
        updateUserSkill: (skillId, updates) =>
          set((state) => {
            const skillIndex = state.userSkills.findIndex(s => s.id === skillId);
            if (skillIndex !== -1) {
              Object.assign(state.userSkills[skillIndex], updates);
              state.lastUpdated.userSkills = new Date().toISOString();
            }
          }),
        
        removeUserSkill: (skillId) =>
          set((state) => {
            state.userSkills = state.userSkills.filter(s => s.id !== skillId);
            state.lastUpdated.userSkills = new Date().toISOString();
          }),
        
        setUserStats: (stats) =>
          set((state) => {
            state.userStats = stats;
          }),
        
        // Jobs Actions
        setJobs: (jobs) =>
          set((state) => {
            state.jobs = jobs;
            state.lastUpdated.jobs = new Date().toISOString();
          }),
        
        addJob: (job) =>
          set((state) => {
            state.jobs.push(job);
            state.lastUpdated.jobs = new Date().toISOString();
          }),
        
        updateJob: (jobId, updates) =>
          set((state) => {
            const jobIndex = state.jobs.findIndex(j => j.id === jobId);
            if (jobIndex !== -1) {
              Object.assign(state.jobs[jobIndex], updates);
            }
            
            // Also update in saved jobs if present
            const savedJobIndex = state.savedJobs.findIndex(j => j.id === jobId);
            if (savedJobIndex !== -1) {
              Object.assign(state.savedJobs[savedJobIndex], updates);
            }
            
            state.lastUpdated.jobs = new Date().toISOString();
          }),
        
        setSavedJobs: (jobs) =>
          set((state) => {
            state.savedJobs = jobs;
          }),
        
        toggleJobBookmark: (jobId) =>
          set((state) => {
            // Update in jobs list
            const jobIndex = state.jobs.findIndex(j => j.id === jobId);
            if (jobIndex !== -1) {
              state.jobs[jobIndex].isBookmarked = !state.jobs[jobIndex].isBookmarked;
              
              if (state.jobs[jobIndex].isBookmarked) {
                // Add to saved jobs
                state.savedJobs.push(state.jobs[jobIndex]);
              } else {
                // Remove from saved jobs
                state.savedJobs = state.savedJobs.filter(j => j.id !== jobId);
              }
            }
          }),
        
        setJobRecommendations: (jobs) =>
          set((state) => {
            state.jobRecommendations = jobs;
          }),
        
        updateJobSearchFilters: (filters) =>
          set((state) => {
            Object.assign(state.jobSearchFilters, filters);
          }),
        
        // Learning Actions
        setLearningPaths: (paths) =>
          set((state) => {
            state.learningPaths = paths;
            state.lastUpdated.learningPaths = new Date().toISOString();
          }),
        
        setEnrolledPaths: (paths) =>
          set((state) => {
            state.enrolledPaths = paths;
          }),
        
        enrollInPath: (pathId) =>
          set((state) => {
            const pathIndex = state.learningPaths.findIndex(p => p.id === pathId);
            if (pathIndex !== -1) {
              state.learningPaths[pathIndex].isEnrolled = true;
              state.enrolledPaths.push(state.learningPaths[pathIndex]);
            }
          }),
        
        updateLearningProgress: (pathId, progress) =>
          set((state) => {
            const pathIndex = state.enrolledPaths.findIndex(p => p.id === pathId);
            if (pathIndex !== -1) {
              state.enrolledPaths[pathIndex].progress = progress;
            }
            
            // Also update in learning paths
            const learningPathIndex = state.learningPaths.findIndex(p => p.id === pathId);
            if (learningPathIndex !== -1) {
              state.learningPaths[learningPathIndex].progress = progress;
            }
          }),
        
        setLearningRecommendations: (paths) =>
          set((state) => {
            state.learningRecommendations = paths;
          }),
        
        // Notification Actions
        setNotifications: (notifications) =>
          set((state) => {
            state.notifications = notifications;
            state.unreadCount = notifications.filter(n => !n.read).length;
            state.lastUpdated.notifications = new Date().toISOString();
          }),
        
        addNotification: (notification) =>
          set((state) => {
            const newNotification: Notification = {
              ...notification,
              id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              read: false,
            };
            
            state.notifications.unshift(newNotification);
            state.unreadCount += 1;
          }),
        
        markNotificationRead: (notificationId) =>
          set((state) => {
            const notificationIndex = state.notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex !== -1 && !state.notifications[notificationIndex].read) {
              state.notifications[notificationIndex].read = true;
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
          }),
        
        markAllNotificationsRead: () =>
          set((state) => {
            state.notifications.forEach(notification => {
              notification.read = true;
            });
            state.unreadCount = 0;
          }),
        
        removeNotification: (notificationId) =>
          set((state) => {
            const notificationIndex = state.notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex !== -1) {
              const wasUnread = !state.notifications[notificationIndex].read;
              state.notifications.splice(notificationIndex, 1);
              if (wasUnread) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
            }
          }),
        
        // Cache Actions
        updateLastUpdated: (key) =>
          set((state) => {
            state.lastUpdated[key] = new Date().toISOString();
          }),
        
        shouldRefresh: (key, maxAge = 5 * 60 * 1000) => { // 5 minutes default
          const lastUpdated = get().lastUpdated[key];
          if (!lastUpdated) return true;
          
          const now = new Date().getTime();
          const lastUpdatedTime = new Date(lastUpdated).getTime();
          return (now - lastUpdatedTime) > maxAge;
        },
        
        // Reset Actions
        resetUserData: () =>
          set((state) => {
            state.user = null;
            state.userSkills = [];
            state.userStats = null;
            delete state.lastUpdated.userSkills;
          }),
        
        resetJobsData: () =>
          set((state) => {
            state.jobs = [];
            state.savedJobs = [];
            state.jobRecommendations = [];
            state.jobSearchFilters = initialState.jobSearchFilters;
            delete state.lastUpdated.jobs;
          }),
        
        resetLearningData: () =>
          set((state) => {
            state.learningPaths = [];
            state.enrolledPaths = [];
            state.learningRecommendations = [];
            delete state.lastUpdated.learningPaths;
          }),
        
        resetAll: () =>
          set(() => ({ ...initialState })),
      })),
      {
        name: 'skillforge-app-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          theme: state.theme,
          isSidebarOpen: state.isSidebarOpen,
          jobSearchFilters: state.jobSearchFilters,
        }),
      }
    ),
    {
      name: 'SkillForge App Store',
    }
  )
);

// Selectors for common state combinations
export const useUserData = () => useAppStore((state) => ({
  user: state.user,
  userSkills: state.userSkills,
  userStats: state.userStats,
}));

export const useJobsData = () => useAppStore((state) => ({
  jobs: state.jobs,
  savedJobs: state.savedJobs,
  jobRecommendations: state.jobRecommendations,
  jobSearchFilters: state.jobSearchFilters,
}));

export const useLearningData = () => useAppStore((state) => ({
  learningPaths: state.learningPaths,
  enrolledPaths: state.enrolledPaths,
  learningRecommendations: state.learningRecommendations,
}));

export const useNotifications = () => useAppStore((state) => ({
  notifications: state.notifications,
  unreadCount: state.unreadCount,
}));

export const useUIState = () => useAppStore((state) => ({
  isLoading: state.isLoading,
  isSidebarOpen: state.isSidebarOpen,
  theme: state.theme,
}));
