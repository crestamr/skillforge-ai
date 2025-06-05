import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Target, 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  Calendar,
  Briefcase,
  GraduationCap,
  Users,
  Building,
  Globe
} from 'lucide-react';

export interface CareerGoal {
  id: string;
  type: 'role' | 'salary' | 'location' | 'timeline' | 'industry' | 'company_size' | 'work_style' | 'skill_development';
  title: string;
  description: string;
  value?: string | number;
  priority: 'high' | 'medium' | 'low';
  timeframe?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface CareerGoalsSelectorProps {
  selectedGoals: CareerGoal[];
  onGoalsChange: (goals: CareerGoal[]) => void;
  maxGoals?: number;
  className?: string;
}

const PREDEFINED_GOALS: CareerGoal[] = [
  // Role-based goals
  {
    id: 'senior-dev',
    type: 'role',
    title: 'Senior Developer',
    description: 'Advance to a senior developer position',
    priority: 'high',
    timeframe: '1-2 years',
    icon: TrendingUp
  },
  {
    id: 'tech-lead',
    type: 'role',
    title: 'Technical Lead',
    description: 'Lead a technical team and projects',
    priority: 'high',
    timeframe: '2-3 years',
    icon: Users
  },
  {
    id: 'product-manager',
    type: 'role',
    title: 'Product Manager',
    description: 'Transition to product management',
    priority: 'medium',
    timeframe: '1-3 years',
    icon: Briefcase
  },
  {
    id: 'architect',
    type: 'role',
    title: 'Software Architect',
    description: 'Design and oversee system architecture',
    priority: 'high',
    timeframe: '3-5 years',
    icon: Building
  },

  // Salary goals
  {
    id: 'salary-100k',
    type: 'salary',
    title: 'Earn $100k+',
    description: 'Achieve a salary of $100,000 or more',
    value: 100000,
    priority: 'high',
    timeframe: '1-2 years',
    icon: DollarSign
  },
  {
    id: 'salary-150k',
    type: 'salary',
    title: 'Earn $150k+',
    description: 'Achieve a salary of $150,000 or more',
    value: 150000,
    priority: 'high',
    timeframe: '2-4 years',
    icon: DollarSign
  },

  // Location goals
  {
    id: 'remote-work',
    type: 'work_style',
    title: 'Work Remotely',
    description: 'Find a fully remote position',
    priority: 'medium',
    icon: Globe
  },
  {
    id: 'relocate-sf',
    type: 'location',
    title: 'Move to San Francisco',
    description: 'Relocate to San Francisco Bay Area',
    priority: 'medium',
    timeframe: '1-2 years',
    icon: MapPin
  },
  {
    id: 'relocate-nyc',
    type: 'location',
    title: 'Move to New York',
    description: 'Relocate to New York City',
    priority: 'medium',
    timeframe: '1-2 years',
    icon: MapPin
  },

  // Skill development
  {
    id: 'learn-ai',
    type: 'skill_development',
    title: 'Master AI/ML',
    description: 'Become proficient in AI and Machine Learning',
    priority: 'high',
    timeframe: '6-12 months',
    icon: GraduationCap
  },
  {
    id: 'learn-cloud',
    type: 'skill_development',
    title: 'Cloud Expertise',
    description: 'Gain expertise in cloud platforms (AWS, Azure, GCP)',
    priority: 'high',
    timeframe: '3-6 months',
    icon: GraduationCap
  },

  // Company goals
  {
    id: 'startup',
    type: 'company_size',
    title: 'Join a Startup',
    description: 'Work at an early-stage startup',
    priority: 'medium',
    icon: TrendingUp
  },
  {
    id: 'big-tech',
    type: 'company_size',
    title: 'Work at Big Tech',
    description: 'Join a major technology company (FAANG)',
    priority: 'high',
    timeframe: '1-3 years',
    icon: Building
  }
];

const GOAL_CATEGORIES = [
  { key: 'role', label: 'Career Roles', icon: Briefcase },
  { key: 'salary', label: 'Compensation', icon: DollarSign },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'work_style', label: 'Work Style', icon: Globe },
  { key: 'skill_development', label: 'Skills', icon: GraduationCap },
  { key: 'company_size', label: 'Company Type', icon: Building },
];

export const CareerGoalsSelector: React.FC<CareerGoalsSelectorProps> = ({
  selectedGoals,
  onGoalsChange,
  maxGoals = 10,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customGoal, setCustomGoal] = useState({
    title: '',
    description: '',
    type: 'role' as CareerGoal['type'],
    priority: 'medium' as CareerGoal['priority'],
    timeframe: ''
  });
  const [showCustomForm, setShowCustomForm] = useState(false);

  const filteredGoals = selectedCategory === 'all' 
    ? PREDEFINED_GOALS 
    : PREDEFINED_GOALS.filter(goal => goal.type === selectedCategory);

  const availableGoals = filteredGoals.filter(goal => 
    !selectedGoals.some(selected => selected.id === goal.id)
  );

  const addGoal = (goal: CareerGoal) => {
    if (selectedGoals.length >= maxGoals) return;
    onGoalsChange([...selectedGoals, goal]);
  };

  const removeGoal = (goalId: string) => {
    onGoalsChange(selectedGoals.filter(goal => goal.id !== goalId));
  };

  const updateGoalPriority = (goalId: string, priority: CareerGoal['priority']) => {
    onGoalsChange(
      selectedGoals.map(goal =>
        goal.id === goalId ? { ...goal, priority } : goal
      )
    );
  };

  const addCustomGoal = () => {
    if (!customGoal.title.trim()) return;

    const newGoal: CareerGoal = {
      id: `custom-${Date.now()}`,
      title: customGoal.title.trim(),
      description: customGoal.description.trim() || customGoal.title.trim(),
      type: customGoal.type,
      priority: customGoal.priority,
      timeframe: customGoal.timeframe || undefined,
      icon: Target
    };

    addGoal(newGoal);
    setCustomGoal({
      title: '',
      description: '',
      type: 'role',
      priority: 'medium',
      timeframe: ''
    });
    setShowCustomForm(false);
  };

  const getPriorityColor = (priority: CareerGoal['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Career Goals
        </CardTitle>
        <CardDescription>
          Define your career aspirations and objectives. Select up to {maxGoals} goals.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Goals
          </Button>
          {GOAL_CATEGORIES.map(category => {
            const Icon = category.icon;
            return (
              <Button
                key={category.key}
                variant={selectedCategory === category.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.key)}
                className="flex items-center gap-1"
              >
                <Icon className="w-3 h-3" />
                {category.label}
              </Button>
            );
          })}
        </div>

        {/* Selected Goals */}
        {selectedGoals.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">
              Your Goals ({selectedGoals.length}/{maxGoals})
            </h4>
            <div className="space-y-2">
              {selectedGoals.map(goal => {
                const Icon = goal.icon || Target;
                return (
                  <div key={goal.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{goal.title}</span>
                          {goal.timeframe && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {goal.timeframe}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{goal.description}</p>
                        
                        {/* Priority Selector */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">Priority:</span>
                          {(['high', 'medium', 'low'] as const).map(priority => (
                            <button
                              key={priority}
                              onClick={() => updateGoalPriority(goal.id, priority)}
                              className={`px-2 py-1 text-xs rounded-full border ${
                                goal.priority === priority
                                  ? getPriorityColor(priority)
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGoal(goal.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Goals */}
        {availableGoals.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Available Goals</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableGoals.map(goal => {
                const Icon = goal.icon || Target;
                return (
                  <div
                    key={goal.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => addGoal(goal)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{goal.title}</span>
                          {goal.timeframe && (
                            <Badge variant="outline" className="text-xs">
                              {goal.timeframe}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{goal.description}</p>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs mt-1 ${getPriorityColor(goal.priority)}`}
                        >
                          {goal.priority} priority
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Goal Form */}
        <div className="space-y-3">
          {!showCustomForm ? (
            <Button
              variant="outline"
              onClick={() => setShowCustomForm(true)}
              className="w-full"
            >
              Add Custom Goal
            </Button>
          ) : (
            <div className="space-y-3 p-4 border rounded-lg">
              <h4 className="font-medium">Add Custom Goal</h4>
              
              <Input
                placeholder="Goal title"
                value={customGoal.title}
                onChange={(e) => setCustomGoal(prev => ({ ...prev, title: e.target.value }))}
              />
              
              <Input
                placeholder="Goal description (optional)"
                value={customGoal.description}
                onChange={(e) => setCustomGoal(prev => ({ ...prev, description: e.target.value }))}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={customGoal.type}
                  onChange={(e) => setCustomGoal(prev => ({ ...prev, type: e.target.value as CareerGoal['type'] }))}
                  className="p-2 border rounded-md"
                >
                  {GOAL_CATEGORIES.map(category => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
                
                <select
                  value={customGoal.priority}
                  onChange={(e) => setCustomGoal(prev => ({ ...prev, priority: e.target.value as CareerGoal['priority'] }))}
                  className="p-2 border rounded-md"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              
              <Input
                placeholder="Timeframe (optional)"
                value={customGoal.timeframe}
                onChange={(e) => setCustomGoal(prev => ({ ...prev, timeframe: e.target.value }))}
              />
              
              <div className="flex gap-2">
                <Button onClick={addCustomGoal} size="sm">
                  Add Goal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCustomForm(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
