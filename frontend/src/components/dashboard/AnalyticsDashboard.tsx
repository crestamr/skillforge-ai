'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  SkillRadarChart, 
  JobMarketTrendsChart, 
  SalaryBenchmarkChart, 
  LearningProgressChart, 
  SkillGapAnalysisChart 
} from '@/components/charts';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  BookOpen, 
  Target,
  RefreshCw,
  Download,
  Share2
} from 'lucide-react';

// Mock data generators for demonstration
const generateSkillData = () => [
  { skill: 'React', userLevel: 8, requiredLevel: 9, category: 'Frontend', maxLevel: 10 },
  { skill: 'TypeScript', userLevel: 7, requiredLevel: 8, category: 'Language', maxLevel: 10 },
  { skill: 'Node.js', userLevel: 6, requiredLevel: 8, category: 'Backend', maxLevel: 10 },
  { skill: 'Python', userLevel: 5, requiredLevel: 7, category: 'Language', maxLevel: 10 },
  { skill: 'AWS', userLevel: 4, requiredLevel: 7, category: 'Cloud', maxLevel: 10 },
  { skill: 'Docker', userLevel: 6, requiredLevel: 6, category: 'DevOps', maxLevel: 10 },
  { skill: 'GraphQL', userLevel: 3, requiredLevel: 6, category: 'API', maxLevel: 10 },
  { skill: 'MongoDB', userLevel: 7, requiredLevel: 7, category: 'Database', maxLevel: 10 }
];

const generateTrendData = () => {
  const skills = ['React', 'Vue.js', 'Angular', 'Python', 'TypeScript', 'Go'];
  const locations = ['San Francisco', 'New York', 'Seattle', 'Austin'];
  const industries = ['Tech', 'Finance', 'Healthcare', 'E-commerce'];
  const data: any[] = [];
  
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    skills.forEach(skill => {
      data.push({
        date,
        skill,
        demand: Math.random() * 80 + 20,
        growth: (Math.random() - 0.5) * 30,
        location: locations[Math.floor(Math.random() * locations.length)],
        industry: industries[Math.floor(Math.random() * industries.length)]
      });
    });
  }
  
  return data;
};

const generateSalaryData = () => [
  {
    role: 'Software Engineer',
    experience: 'Entry',
    location: 'San Francisco',
    minSalary: 120000,
    maxSalary: 160000,
    medianSalary: 140000,
    percentile25: 130000,
    percentile75: 150000,
    sampleSize: 245,
    yearOverYearGrowth: 8.5
  },
  {
    role: 'Software Engineer',
    experience: 'Mid',
    location: 'San Francisco',
    minSalary: 150000,
    maxSalary: 220000,
    medianSalary: 185000,
    percentile25: 165000,
    percentile75: 205000,
    sampleSize: 189,
    yearOverYearGrowth: 12.3
  },
  {
    role: 'Software Engineer',
    experience: 'Senior',
    location: 'San Francisco',
    minSalary: 200000,
    maxSalary: 350000,
    medianSalary: 275000,
    percentile25: 240000,
    percentile75: 310000,
    sampleSize: 156,
    yearOverYearGrowth: 15.7
  }
];

const generateLearningMilestones = () => [
  {
    id: '1',
    title: 'Master React Hooks',
    description: 'Deep dive into useState, useEffect, and custom hooks',
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    completedDate: new Date(),
    progress: 100,
    category: 'Frontend',
    difficulty: 'intermediate' as const,
    estimatedHours: 40,
    actualHours: 35,
    skills: ['React', 'JavaScript', 'State Management']
  },
  {
    id: '2',
    title: 'AWS Certification',
    description: 'Complete AWS Solutions Architect Associate certification',
    targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    progress: 65,
    category: 'Cloud',
    difficulty: 'advanced' as const,
    estimatedHours: 120,
    skills: ['AWS', 'Cloud Architecture', 'DevOps']
  },
  {
    id: '3',
    title: 'TypeScript Fundamentals',
    description: 'Learn TypeScript basics and advanced patterns',
    targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    progress: 30,
    category: 'Language',
    difficulty: 'beginner' as const,
    estimatedHours: 60,
    skills: ['TypeScript', 'JavaScript', 'Type Safety']
  }
];

const generateSkillGaps = () => [
  {
    skill: 'Kubernetes',
    currentLevel: 2,
    requiredLevel: 7,
    marketDemand: 85,
    salaryImpact: 25,
    timeToAcquire: 16,
    priority: 'high' as const,
    category: 'DevOps',
    learningResources: 45,
    jobOpportunities: 234
  },
  {
    skill: 'Machine Learning',
    currentLevel: 1,
    requiredLevel: 6,
    marketDemand: 90,
    salaryImpact: 35,
    timeToAcquire: 24,
    priority: 'high' as const,
    category: 'AI/ML',
    learningResources: 78,
    jobOpportunities: 189
  },
  {
    skill: 'GraphQL',
    currentLevel: 3,
    requiredLevel: 6,
    marketDemand: 65,
    salaryImpact: 15,
    timeToAcquire: 8,
    priority: 'medium' as const,
    category: 'API',
    learningResources: 32,
    jobOpportunities: 156
  }
];

interface AnalyticsDashboardProps {
  className?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className = ""
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setLastUpdated(new Date());
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleSkillSelect = (skill: string) => {
    console.log('Selected skill for learning path:', skill);
    // Navigate to learning path or show modal
  };

  const skillData = generateSkillData();
  const trendData = generateTrendData();
  const salaryData = generateSalaryData();
  const milestones = generateLearningMilestones();
  const skillGaps = generateSkillGaps();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive insights into your career development progress
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Updated {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Skill Score</p>
                <p className="text-2xl font-bold text-gray-900">85%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">+5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Market Demand</p>
                <p className="text-2xl font-bold text-gray-900">92%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">High demand skills</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Salary Potential</p>
                <p className="text-2xl font-bold text-gray-900">$185k</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">+15% with skill gaps filled</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Learning Progress</p>
                <p className="text-2xl font-bold text-gray-900">67%</p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">3 milestones active</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkillRadarChart 
              data={skillData}
              isLoading={isLoading}
              title="Skill Assessment Overview"
              description="Your current skills vs. market requirements"
            />
            <SkillGapAnalysisChart
              gaps={skillGaps}
              isLoading={isLoading}
              onSkillSelect={handleSkillSelect}
              title="Priority Skill Gaps"
              description="Focus areas for maximum career impact"
            />
          </div>
          <LearningProgressChart
            milestones={milestones}
            isLoading={isLoading}
            title="Current Learning Journey"
            description="Track your progress towards career goals"
          />
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <SkillRadarChart 
            data={skillData}
            isLoading={isLoading}
            title="Detailed Skill Analysis"
            description="Comprehensive breakdown of your technical abilities"
          />
          <SkillGapAnalysisChart
            gaps={skillGaps}
            isLoading={isLoading}
            onSkillSelect={handleSkillSelect}
            title="Skill Gap Analysis"
            description="Strategic recommendations for skill development"
          />
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <JobMarketTrendsChart
            data={trendData}
            isLoading={isLoading}
            title="Job Market Intelligence"
            description="Real-time trends in skill demand and growth"
          />
        </TabsContent>

        <TabsContent value="salary" className="space-y-6">
          <SalaryBenchmarkChart
            data={salaryData}
            userSalary={165000}
            isLoading={isLoading}
            title="Salary Benchmarking"
            description="Compare your compensation with market standards"
          />
        </TabsContent>

        <TabsContent value="learning" className="space-y-6">
          <LearningProgressChart
            milestones={milestones}
            isLoading={isLoading}
            title="Learning Path Progress"
            description="Detailed view of your educational journey"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
