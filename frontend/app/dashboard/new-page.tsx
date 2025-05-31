/**
 * SkillForge AI - Comprehensive Dashboard
 * Real dashboard with API integration and state management
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAppStore, useUserData, useJobsData, useLearningData } from '../../src/store/useAppStore';
import { userApi, jobsApi, learningApi, analyticsApi } from '../../src/lib/api';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Alert, AlertDescription } from '../../src/components/ui/alert';
import { 
  Loader2, 
  RefreshCw, 
  Award, 
  Clock, 
  Briefcase, 
  TrendingUp,
  BookOpen,
  Target,
  Star,
  ChevronRight,
  Plus
} from 'lucide-react';

export default function ComprehensiveDashboard() {
  const { user } = useAuth();
  const { userSkills, userStats } = useUserData();
  const { jobRecommendations } = useJobsData();
  const { enrolledPaths, learningRecommendations } = useLearningData();
  
  const {
    setUserSkills,
    setUserStats,
    setJobRecommendations,
    setEnrolledPaths,
    setLearningRecommendations,
    shouldRefresh,
    updateLastUpdated,
    isLoading,
    setLoading,
  } = useAppStore();

  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load dashboard data
  const loadDashboardData = async (force = false) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const promises = [];

      // Load user skills if needed
      if (force || shouldRefresh('userSkills')) {
        promises.push(
          userApi.getUserSkills().then((skills) => {
            setUserSkills(skills);
            updateLastUpdated('userSkills');
          }).catch(() => {
            // Fallback data for development
            setUserSkills([
              { id: '1', name: 'JavaScript', category: 'Programming', level: 85, verified: true, endorsements: 12 },
              { id: '2', name: 'React', category: 'Frontend', level: 80, verified: true, endorsements: 8 },
              { id: '3', name: 'Python', category: 'Programming', level: 75, verified: false, endorsements: 5 },
              { id: '4', name: 'Node.js', category: 'Backend', level: 70, verified: true, endorsements: 6 },
            ]);
          })
        );
      }

      // Load user stats
      promises.push(
        userApi.getStats().then((stats) => {
          setUserStats(stats);
        }).catch(() => {
          // Fallback data for development
          setUserStats({
            totalSkills: 24,
            assessmentsCompleted: 8,
            learningHours: 127,
            jobApplications: 5,
            skillsImproved: 3,
          });
        })
      );

      // Load job recommendations
      promises.push(
        jobsApi.getRecommendations().then((jobs) => {
          setJobRecommendations(jobs);
        }).catch(() => {
          // Fallback data for development
          setJobRecommendations([
            {
              id: '1',
              title: 'Senior Frontend Developer',
              company: 'TechCorp',
              location: 'San Francisco, CA',
              remote: true,
              matchScore: 95,
              isBookmarked: false,
              postedDate: '2024-01-15',
            },
            {
              id: '2',
              title: 'Full Stack Engineer',
              company: 'StartupXYZ',
              location: 'New York, NY',
              remote: false,
              matchScore: 88,
              isBookmarked: true,
              postedDate: '2024-01-14',
            },
          ]);
        })
      );

      // Load enrolled learning paths
      if (force || shouldRefresh('learningPaths')) {
        promises.push(
          learningApi.getLearningPaths({ enrolled: true }).then((response) => {
            setEnrolledPaths(response.data);
            updateLastUpdated('learningPaths');
          }).catch(() => {
            // Fallback data for development
            setEnrolledPaths([
              {
                id: '1',
                title: 'React Development Mastery',
                description: 'Complete React development course',
                skills: ['React', 'JavaScript', 'Redux'],
                estimatedHours: 40,
                difficulty: 'intermediate',
                progress: 75,
                isEnrolled: true,
              },
              {
                id: '2',
                title: 'Machine Learning Fundamentals',
                description: 'Introduction to ML concepts',
                skills: ['Python', 'TensorFlow', 'Data Science'],
                estimatedHours: 60,
                difficulty: 'advanced',
                progress: 45,
                isEnrolled: true,
              },
            ]);
          })
        );
      }

      // Load learning recommendations
      promises.push(
        learningApi.getRecommendations().then((paths) => {
          setLearningRecommendations(paths);
        }).catch(() => {
          // Fallback data for development
          setLearningRecommendations([
            {
              id: '3',
              title: 'TypeScript for JavaScript Developers',
              description: 'Learn TypeScript to enhance your JavaScript skills',
              skills: ['TypeScript', 'JavaScript'],
              estimatedHours: 20,
              difficulty: 'intermediate',
              progress: 0,
              isEnrolled: false,
            },
          ]);
        })
      );

      await Promise.all(promises);
      setLastRefresh(new Date());

    } catch (error: any) {
      console.error('Dashboard data loading error:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAuth={true} requireOnboarding={true}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {user.firstName}!
                </h1>
                <p className="text-gray-600">
                  Here's what's happening with your career development
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button size="sm">
                  Download Report
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                {error}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="ml-2"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              <span className="text-lg text-gray-600">Loading dashboard data...</span>
            </div>
          )}

          {/* Dashboard Content */}
          {!isLoading && (
            <div className="space-y-8">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Skills Mastered</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userStats?.totalSkills || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      +{userStats?.skillsImproved || 0} from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Learning Hours</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userStats?.learningHours || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      This month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Job Matches</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{jobRecommendations.length}</div>
                    <p className="text-xs text-muted-foreground">
                      New recommendations
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userStats?.assessmentsCompleted || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Completed
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Learning Progress */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Learning Progress</CardTitle>
                      <CardDescription>
                        Your current learning paths and progress
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {enrolledPaths.map((path) => (
                        <div key={path.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{path.title}</span>
                            <span className="text-sm text-muted-foreground">{path.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${path.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{path.difficulty} • {path.estimatedHours}h</span>
                            <span>{path.skills.join(', ')}</span>
                          </div>
                        </div>
                      ))}
                      
                      {enrolledPaths.length === 0 && (
                        <div className="text-center py-8">
                          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No learning paths enrolled yet</p>
                          <Button className="mt-4" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Browse Learning Paths
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="outline" className="w-full justify-start">
                        <Target className="h-4 w-4 mr-2" />
                        Take Skill Assessment
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Briefcase className="h-4 w-4 mr-2" />
                        Browse Jobs
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Start Learning
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Completed Python Assessment</p>
                          <p className="text-xs text-muted-foreground">2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">New job match found</p>
                          <p className="text-xs text-muted-foreground">5 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Started new learning path</p>
                          <p className="text-xs text-muted-foreground">1 day ago</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Skills and Job Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Top Skills</CardTitle>
                    <CardDescription>
                      Skills you've mastered and their market demand
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {userSkills.slice(0, 5).map((skill) => (
                      <div key={skill.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{skill.name}</span>
                            {skill.verified && <Star className="h-3 w-3 text-yellow-500" />}
                          </div>
                          <span className="text-xs text-muted-foreground">{skill.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{skill.level}%</div>
                          <div className="text-xs text-muted-foreground">{skill.endorsements} endorsements</div>
                        </div>
                      </div>
                    ))}
                    
                    {userSkills.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-gray-500">No skills added yet</p>
                        <Button className="mt-2" size="sm">Add Skills</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Job Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Job Recommendations</CardTitle>
                    <CardDescription>
                      AI-powered job matches based on your skills
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {jobRecommendations.slice(0, 3).map((job) => (
                      <div key={job.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{job.title}</h4>
                            <p className="text-sm text-muted-foreground">{job.company}</p>
                            <p className="text-xs text-muted-foreground">{job.location}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-600">
                              {job.matchScore}% match
                            </div>
                            {job.remote && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Remote
                              </span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="mt-3 w-full">
                          View Details
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    ))}
                    
                    {jobRecommendations.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-gray-500">No job recommendations yet</p>
                        <Button className="mt-2" size="sm">Browse Jobs</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Last Updated */}
              <div className="text-center text-sm text-muted-foreground">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
