/**
 * SkillForge AI - Skills Management Page
 * Comprehensive skills tracking and development interface
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAppStore, useUserData } from '../../src/store/useAppStore';
import { skillsApi, assessmentsApi } from '../../src/lib/api';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';
import DashboardLayout from '../../src/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { Badge } from '../../src/components/ui/badge';
import { Alert, AlertDescription } from '../../src/components/ui/alert';
import { 
  Target, 
  Plus, 
  Search, 
  Star, 
  TrendingUp, 
  Award,
  BookOpen,
  Users,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Filter,
  BarChart3
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: string;
  level: number;
  verified: boolean;
  endorsements: number;
  lastAssessed?: string;
  marketDemand: 'high' | 'medium' | 'low';
  trending: boolean;
  relatedJobs: number;
}

interface SkillCategory {
  name: string;
  skills: Skill[];
  averageLevel: number;
}

export default function SkillsPage() {
  const { user } = useAuth();
  const { userSkills } = useUserData();
  const { setUserSkills, isLoading, setLoading } = useAppStore();
  
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load skills data
  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await skillsApi.getUserSkills().catch(() => {
        // Fallback data for development
        return [
          {
            id: '1',
            name: 'JavaScript',
            category: 'Programming',
            level: 85,
            verified: true,
            endorsements: 12,
            lastAssessed: '2024-01-10',
            marketDemand: 'high',
            trending: true,
            relatedJobs: 1250
          },
          {
            id: '2',
            name: 'React',
            category: 'Frontend',
            level: 80,
            verified: true,
            endorsements: 8,
            lastAssessed: '2024-01-08',
            marketDemand: 'high',
            trending: true,
            relatedJobs: 980
          },
          {
            id: '3',
            name: 'Python',
            category: 'Programming',
            level: 75,
            verified: false,
            endorsements: 5,
            marketDemand: 'high',
            trending: false,
            relatedJobs: 1500
          },
          {
            id: '4',
            name: 'Node.js',
            category: 'Backend',
            level: 70,
            verified: true,
            endorsements: 6,
            lastAssessed: '2024-01-05',
            marketDemand: 'medium',
            trending: false,
            relatedJobs: 750
          },
          {
            id: '5',
            name: 'SQL',
            category: 'Database',
            level: 65,
            verified: false,
            endorsements: 3,
            marketDemand: 'high',
            trending: false,
            relatedJobs: 890
          },
          {
            id: '6',
            name: 'TypeScript',
            category: 'Programming',
            level: 60,
            verified: false,
            endorsements: 2,
            marketDemand: 'high',
            trending: true,
            relatedJobs: 650
          }
        ];
      });

      setSkills(response);
      setUserSkills(response);

    } catch (error: any) {
      console.error('Failed to load skills:', error);
      setError(error.message || 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  const addSkill = async () => {
    if (!newSkillName.trim()) return;

    try {
      const newSkill = await skillsApi.addUserSkill({
        name: newSkillName.trim(),
        level: 50,
        category: 'Other'
      }).catch(() => {
        // Fallback for development
        return {
          id: `skill_${Date.now()}`,
          name: newSkillName.trim(),
          category: 'Other',
          level: 50,
          verified: false,
          endorsements: 0,
          marketDemand: 'medium',
          trending: false,
          relatedJobs: 0
        };
      });

      setSkills(prev => [...prev, newSkill]);
      setNewSkillName('');
      setShowAddSkill(false);
    } catch (error) {
      console.error('Failed to add skill:', error);
    }
  };

  const removeSkill = async (skillId: string) => {
    try {
      await skillsApi.deleteUserSkill(skillId);
      setSkills(prev => prev.filter(s => s.id !== skillId));
    } catch (error) {
      console.error('Failed to remove skill:', error);
    }
  };

  const takeAssessment = (skillName: string) => {
    // Navigate to assessment page for this skill
    window.location.href = `/assessments?skill=${encodeURIComponent(skillName)}`;
  };

  // Filter and categorize skills
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(skills.map(s => s.category)));
  const skillsByCategory = categories.map(category => ({
    name: category,
    skills: filteredSkills.filter(s => s.category === category),
    averageLevel: Math.round(
      filteredSkills
        .filter(s => s.category === category)
        .reduce((sum, s) => sum + s.level, 0) /
      filteredSkills.filter(s => s.category === category).length || 0
    )
  }));

  const getMarketDemandColor = (demand: string) => {
    switch (demand) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getLevelColor = (level: number) => {
    if (level >= 80) return 'text-green-600';
    if (level >= 60) return 'text-blue-600';
    if (level >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <ProtectedRoute requireAuth={true} requireOnboarding={true}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <Target className="h-8 w-8 mr-3 text-blue-600" />
              My Skills
            </h1>
            <p className="text-gray-600">
              Track, develop, and showcase your professional skills
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{skills.length}</div>
                <p className="text-xs text-muted-foreground">
                  Across {categories.length} categories
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified Skills</CardTitle>
                <Award className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {skills.filter(s => s.verified).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((skills.filter(s => s.verified).length / skills.length) * 100)}% verified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Level</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(skills.reduce((sum, s) => sum + s.level, 0) / skills.length || 0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all skills
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Endorsements</CardTitle>
                <Users className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {skills.reduce((sum, s) => sum + s.endorsements, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total endorsements
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search skills..."
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
                  
                  <Button
                    onClick={() => setShowAddSkill(true)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Skill</span>
                  </Button>
                </div>
              </div>

              {/* Add Skill Form */}
              {showAddSkill && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter skill name..."
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                      className="flex-1"
                    />
                    <Button onClick={addSkill} disabled={!newSkillName.trim()}>
                      Add
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setShowAddSkill(false);
                      setNewSkillName('');
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Skills by Category */}
          <div className="space-y-8">
            {skillsByCategory.map((category) => (
              <div key={category.name}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {category.name}
                  </h2>
                  <Badge variant="outline">
                    {category.skills.length} skills • Avg: {category.averageLevel}%
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.skills.map((skill) => (
                    <Card key={skill.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-lg">{skill.name}</h3>
                              {skill.verified && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {skill.trending && (
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                              <span className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {skill.endorsements}
                              </span>
                              <span>{skill.relatedJobs} jobs</span>
                            </div>
                          </div>
                          
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeSkill(skill.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Skill Level */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Proficiency</span>
                            <span className={`text-sm font-bold ${getLevelColor(skill.level)}`}>
                              {skill.level}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${skill.level}%` }}
                            />
                          </div>
                        </div>

                        {/* Market Demand */}
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-600">Market Demand</span>
                          <Badge className={getMarketDemandColor(skill.marketDemand)}>
                            {skill.marketDemand}
                          </Badge>
                        </div>

                        {/* Last Assessment */}
                        {skill.lastAssessed && (
                          <div className="text-xs text-gray-500 mb-4">
                            Last assessed: {new Date(skill.lastAssessed).toLocaleDateString()}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => takeAssessment(skill.name)}
                            className="flex-1"
                          >
                            <Award className="h-3 w-3 mr-1" />
                            {skill.verified ? 'Retake' : 'Verify'}
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <BookOpen className="h-3 w-3 mr-1" />
                            Learn
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredSkills.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No skills found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery ? 'Try adjusting your search criteria' : 'Start by adding your first skill'}
                </p>
                <Button onClick={() => setShowAddSkill(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Skill
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
