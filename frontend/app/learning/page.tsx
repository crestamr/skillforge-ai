/**
 * SkillForge AI - Learning Paths Page
 * Comprehensive learning management and course discovery
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAppStore, useLearningData } from '../../src/store/useAppStore';
import { learningApi } from '../../src/lib/api';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';
import DashboardLayout from '../../src/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { Badge } from '../../src/components/ui/badge';
import { Alert, AlertDescription } from '../../src/components/ui/alert';
import { 
  BookOpen, 
  Play, 
  Clock, 
  Star, 
  Users,
  Target,
  TrendingUp,
  Award,
  Search,
  Filter,
  CheckCircle,
  BarChart3,
  ExternalLink,
  Plus
} from 'lucide-react';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  provider?: string;
  skills: string[];
  estimatedHours: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rating?: number;
  enrolledCount?: number;
  progress: number;
  isEnrolled: boolean;
  isRecommended?: boolean;
  price?: number;
  currency?: string;
  imageUrl?: string;
  category?: string;
}

export default function LearningPage() {
  const { user } = useAuth();
  const { learningPaths, enrolledPaths, learningRecommendations } = useLearningData();
  const { 
    setLearningPaths, 
    setEnrolledPaths, 
    setLearningRecommendations,
    enrollInPath,
    isLoading, 
    setLoading 
  } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'discover' | 'enrolled' | 'recommended'>('discover');
  const [error, setError] = useState<string | null>(null);

  // Load learning data
  useEffect(() => {
    loadLearningPaths();
    loadEnrolledPaths();
    loadRecommendations();
  }, []);

  const loadLearningPaths = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await learningApi.getLearningPaths().catch(() => {
        // Fallback data for development
        return {
          data: [
            {
              id: '1',
              title: 'Complete React Developer Course',
              description: 'Master React from basics to advanced concepts including hooks, context, and testing',
              provider: 'TechEd',
              skills: ['React', 'JavaScript', 'HTML', 'CSS'],
              estimatedHours: 40,
              difficulty: 'intermediate',
              rating: 4.8,
              enrolledCount: 15420,
              progress: 0,
              isEnrolled: false,
              isRecommended: true,
              price: 89.99,
              currency: 'USD',
              category: 'Frontend Development'
            },
            {
              id: '2',
              title: 'Python for Data Science',
              description: 'Learn Python programming with focus on data analysis, visualization, and machine learning',
              provider: 'DataCamp',
              skills: ['Python', 'Pandas', 'NumPy', 'Matplotlib'],
              estimatedHours: 60,
              difficulty: 'beginner',
              rating: 4.6,
              enrolledCount: 23100,
              progress: 75,
              isEnrolled: true,
              isRecommended: false,
              price: 129.99,
              currency: 'USD',
              category: 'Data Science'
            },
            {
              id: '3',
              title: 'Full Stack JavaScript Development',
              description: 'Build complete web applications using Node.js, Express, MongoDB, and React',
              provider: 'CodeAcademy',
              skills: ['JavaScript', 'Node.js', 'MongoDB', 'Express'],
              estimatedHours: 80,
              difficulty: 'advanced',
              rating: 4.7,
              enrolledCount: 8900,
              progress: 0,
              isEnrolled: false,
              isRecommended: true,
              price: 199.99,
              currency: 'USD',
              category: 'Full Stack'
            },
            {
              id: '4',
              title: 'AWS Cloud Practitioner',
              description: 'Get started with Amazon Web Services and cloud computing fundamentals',
              provider: 'AWS Training',
              skills: ['AWS', 'Cloud Computing', 'DevOps'],
              estimatedHours: 25,
              difficulty: 'beginner',
              rating: 4.5,
              enrolledCount: 12500,
              progress: 30,
              isEnrolled: true,
              isRecommended: false,
              price: 79.99,
              currency: 'USD',
              category: 'Cloud Computing'
            }
          ]
        };
      });

      const pathsData = (response as any)?.data || response;
      setLearningPaths(Array.isArray(pathsData) ? pathsData : []);
    } catch (error: any) {
      console.error('Failed to load learning paths:', error);
      setError(error.message || 'Failed to load learning paths');
    } finally {
      setLoading(false);
    }
  };

  const loadEnrolledPaths = async () => {
    try {
      const enrolled = await learningApi.getLearningPaths({ enrolled: true }).catch(() => {
        return { data: learningPaths.filter(p => p.isEnrolled) };
      });
      const enrolledData = (enrolled as any)?.data || enrolled;
      setEnrolledPaths(Array.isArray(enrolledData) ? enrolledData : []);
    } catch (error) {
      console.error('Failed to load enrolled paths:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const recommendations = await learningApi.getRecommendations().catch(() => {
        return (learningPaths || []).filter(p => p.isRecommended);
      });
      setLearningRecommendations(Array.isArray(recommendations) ? recommendations : []);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const handleEnroll = async (pathId: string) => {
    try {
      await learningApi.enrollInPath(pathId);
      enrollInPath(pathId);
    } catch (error) {
      console.error('Failed to enroll in path:', error);
    }
  };

  // Filter learning paths
  const getFilteredPaths = () => {
    let paths = learningPaths;
    
    if (activeTab === 'enrolled') {
      paths = enrolledPaths;
    } else if (activeTab === 'recommended') {
      paths = learningRecommendations;
    }

    return paths.filter(path => {
      const matchesSearch = path.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           path.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           path.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || path.category === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || path.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  };

  const filteredPaths = getFilteredPaths();
  const categories = Array.from(new Set(learningPaths.map(p => p.category).filter(Boolean)));

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute requireAuth={true} requireOnboarding={true}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <BookOpen className="h-8 w-8 mr-3 text-blue-600" />
              Learning Paths
            </h1>
            <p className="text-gray-600">
              Discover and track your learning journey with curated courses
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enrolledPaths.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active learning paths
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours Completed</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(enrolledPaths.reduce((sum, p) => sum + (p.estimatedHours * p.progress / 100), 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Learning hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(enrolledPaths.reduce((sum, p) => sum + p.progress, 0) / enrolledPaths.length || 0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all courses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
                <Target className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{learningRecommendations.length}</div>
                <p className="text-xs text-muted-foreground">
                  Personalized for you
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'discover', label: 'Discover', count: learningPaths.length },
                  { id: 'enrolled', label: 'My Courses', count: enrolledPaths.length },
                  { id: 'recommended', label: 'Recommended', count: learningRecommendations.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search courses, skills, or providers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Learning Paths Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4 w-2/3"></div>
                    <div className="h-20 bg-gray-200 rounded mb-4"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPaths.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery ? 'Try adjusting your search criteria' : 'No courses available in this category'}
                </p>
                <Button onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                }}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPaths.map((path) => (
                <LearningPathCard
                  key={path.id}
                  path={path}
                  onEnroll={() => handleEnroll(path.id)}
                />
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Learning Path Card Component
interface LearningPathCardProps {
  path: LearningPath;
  onEnroll: () => void;
}

const LearningPathCard: React.FC<LearningPathCardProps> = ({ path, onEnroll }) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow ${path.isRecommended ? 'ring-2 ring-blue-200' : ''}`}>
      {path.isRecommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-blue-600 text-white">Recommended</Badge>
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{path.title}</h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{path.description}</p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {path.estimatedHours}h
              </span>
              {path.rating && (
                <span className="flex items-center">
                  <Star className="h-3 w-3 mr-1 text-yellow-500" />
                  {path.rating}
                </span>
              )}
              {path.enrolledCount && (
                <span className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {path.enrolledCount.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <Badge className={getDifficultyColor(path.difficulty)}>
            {path.difficulty}
          </Badge>
          {path.price && (
            <span className="text-sm font-medium text-gray-900">
              ${path.price}
            </span>
          )}
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {path.skills.slice(0, 3).map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {path.skills.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{path.skills.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Progress (if enrolled) */}
        {path.isEnrolled && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">{path.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${path.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          {path.isEnrolled ? (
            <Button className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Continue
            </Button>
          ) : (
            <Button onClick={onEnroll} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Enroll
            </Button>
          )}
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {path.provider && (
          <div className="text-xs text-gray-500 mt-2 text-center">
            by {path.provider}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
