/**
 * SkillForge AI - Assessments Page
 * Skill assessment dashboard and management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAppStore } from '../../src/store/useAppStore';
import { assessmentsApi, skillsApi } from '../../src/lib/api';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';
import DashboardLayout from '../../src/components/layout/DashboardLayout';
import InteractiveSkillAssessment from '../../src/components/assessments/InteractiveSkillAssessment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Badge } from '../../src/components/ui/badge';
import { Alert, AlertDescription } from '../../src/components/ui/alert';
import { 
  Brain, 
  Clock, 
  Trophy, 
  Target, 
  TrendingUp,
  Play,
  CheckCircle,
  AlertCircle,
  Star,
  BookOpen
} from 'lucide-react';

interface Assessment {
  id: string;
  skillName: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  questions: number;
  lastAttempt?: {
    score: number;
    completedAt: string;
    passed: boolean;
  };
  isCompleted: boolean;
  isRecommended: boolean;
}

export default function AssessmentsPage() {
  const { user } = useAuth();
  const { isLoading, setLoading } = useAppStore();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [userSkills, setUserSkills] = useState<any[]>([]);
  const [activeAssessment, setActiveAssessment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load assessments and user skills
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load available assessments
      const assessmentsResponse = await assessmentsApi.getAssessments().catch(() => {
        // Fallback data for development
        return {
          data: [
            {
              id: '1',
              skillName: 'JavaScript',
              difficulty: 'intermediate',
              duration: 45,
              questions: 15,
              lastAttempt: {
                score: 85,
                completedAt: '2024-01-10T10:00:00Z',
                passed: true,
              },
              isCompleted: true,
              isRecommended: false,
            },
            {
              id: '2',
              skillName: 'React',
              difficulty: 'intermediate',
              duration: 60,
              questions: 20,
              isCompleted: false,
              isRecommended: true,
            },
            {
              id: '3',
              skillName: 'Python',
              difficulty: 'beginner',
              duration: 30,
              questions: 12,
              isCompleted: false,
              isRecommended: true,
            },
            {
              id: '4',
              skillName: 'Node.js',
              difficulty: 'advanced',
              duration: 75,
              questions: 25,
              isCompleted: false,
              isRecommended: false,
            },
            {
              id: '5',
              skillName: 'SQL',
              difficulty: 'intermediate',
              duration: 40,
              questions: 18,
              lastAttempt: {
                score: 72,
                completedAt: '2024-01-08T14:30:00Z',
                passed: true,
              },
              isCompleted: true,
              isRecommended: false,
            },
          ]
        };
      });

      // Load user skills
      const skillsResponse = await skillsApi.getUserSkills().catch(() => {
        // Fallback data for development
        return [
          { id: '1', name: 'JavaScript', level: 85, verified: true },
          { id: '2', name: 'React', level: 75, verified: false },
          { id: '3', name: 'Python', level: 60, verified: false },
        ];
      });

      setAssessments(assessmentsResponse.data || assessmentsResponse);
      setUserSkills(skillsResponse);

    } catch (error: any) {
      console.error('Failed to load assessments:', error);
      setError(error.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = async (assessmentId: string) => {
    try {
      setError(null);
      await assessmentsApi.startAssessment(assessmentId);
      setActiveAssessment(assessmentId);
    } catch (error: any) {
      console.error('Failed to start assessment:', error);
      setError(error.message || 'Failed to start assessment');
    }
  };

  const handleAssessmentComplete = () => {
    setActiveAssessment(null);
    loadData(); // Refresh data
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // If assessment is active, show the assessment interface
  if (activeAssessment) {
    return (
      <ProtectedRoute requireAuth={true} requireOnboarding={true}>
        <InteractiveSkillAssessment
          assessmentId={activeAssessment}
          onComplete={handleAssessmentComplete}
          onCancel={() => setActiveAssessment(null)}
        />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAuth={true} requireOnboarding={true}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Skill Assessments
            </h1>
            <p className="text-gray-600">
              Validate your skills with AI-powered assessments and earn verified badges
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assessments.filter(a => a.isCompleted).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Assessments completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    assessments
                      .filter(a => a.lastAttempt)
                      .reduce((sum, a) => sum + (a.lastAttempt?.score || 0), 0) /
                    assessments.filter(a => a.lastAttempt).length || 0
                  )}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all assessments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified Skills</CardTitle>
                <Star className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userSkills.filter(s => s.verified).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Skills verified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recommended</CardTitle>
                <Target className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assessments.filter(a => a.isRecommended).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended for you
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recommended Assessments */}
          {assessments.filter(a => a.isRecommended && !a.isCompleted).length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2 text-purple-600" />
                Recommended for You
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assessments
                  .filter(a => a.isRecommended && !a.isCompleted)
                  .map((assessment) => (
                    <AssessmentCard
                      key={assessment.id}
                      assessment={assessment}
                      onStart={() => startAssessment(assessment.id)}
                      isRecommended={true}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* All Assessments */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-blue-600" />
              All Assessments
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  assessment={assessment}
                  onStart={() => startAssessment(assessment.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Assessment Card Component
interface AssessmentCardProps {
  assessment: Assessment;
  onStart: () => void;
  isRecommended?: boolean;
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({ 
  assessment, 
  onStart, 
  isRecommended = false 
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className={`relative ${isRecommended ? 'ring-2 ring-purple-200' : ''}`}>
      {isRecommended && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-purple-600 text-white">Recommended</Badge>
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{assessment.skillName}</CardTitle>
          {assessment.isCompleted && (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getDifficultyColor(assessment.difficulty)}>
            {assessment.difficulty}
          </Badge>
          <span className="text-sm text-gray-500">
            {assessment.questions} questions
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            {assessment.duration} minutes
          </div>
          
          {assessment.lastAttempt && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Last Score</span>
                <span className={`text-lg font-bold ${getScoreColor(assessment.lastAttempt.score)}`}>
                  {assessment.lastAttempt.score}%
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(assessment.lastAttempt.completedAt).toLocaleDateString()}
              </div>
            </div>
          )}
          
          <Button
            onClick={onStart}
            className="w-full"
            variant={assessment.isCompleted ? "outline" : "default"}
          >
            <Play className="h-4 w-4 mr-2" />
            {assessment.isCompleted ? 'Retake Assessment' : 'Start Assessment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
