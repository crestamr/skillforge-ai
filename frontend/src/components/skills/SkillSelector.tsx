import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  X, 
  Star,
  TrendingUp,
  Award,
  Target,
  Filter
} from 'lucide-react';

export interface Skill {
  id: string;
  name: string;
  category: string;
  level?: number; // 1-10 scale
  isEndorsed?: boolean;
  popularity?: number;
  demandScore?: number;
  description?: string;
  relatedSkills?: string[];
}

interface SkillSelectorProps {
  selectedSkills: Skill[];
  onSkillsChange: (skills: Skill[]) => void;
  maxSkills?: number;
  categories?: string[];
  showLevels?: boolean;
  showSuggestions?: boolean;
  placeholder?: string;
  className?: string;
}

const SKILL_CATEGORIES = [
  'Programming Languages',
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Machine Learning',
  'Cloud Computing',
  'DevOps',
  'Database',
  'Design',
  'Project Management',
  'Marketing',
  'Sales',
  'Finance',
  'Communication',
  'Leadership',
  'Other'
];

const POPULAR_SKILLS: Skill[] = [
  { id: '1', name: 'JavaScript', category: 'Programming Languages', popularity: 95, demandScore: 90 },
  { id: '2', name: 'Python', category: 'Programming Languages', popularity: 92, demandScore: 88 },
  { id: '3', name: 'React', category: 'Web Development', popularity: 88, demandScore: 85 },
  { id: '4', name: 'Node.js', category: 'Web Development', popularity: 82, demandScore: 80 },
  { id: '5', name: 'TypeScript', category: 'Programming Languages', popularity: 78, demandScore: 82 },
  { id: '6', name: 'AWS', category: 'Cloud Computing', popularity: 85, demandScore: 90 },
  { id: '7', name: 'Docker', category: 'DevOps', popularity: 75, demandScore: 78 },
  { id: '8', name: 'SQL', category: 'Database', popularity: 90, demandScore: 85 },
  { id: '9', name: 'Git', category: 'DevOps', popularity: 95, demandScore: 70 },
  { id: '10', name: 'Machine Learning', category: 'Machine Learning', popularity: 70, demandScore: 88 },
];

export const SkillSelector: React.FC<SkillSelectorProps> = ({
  selectedSkills,
  onSkillsChange,
  maxSkills = 20,
  categories = SKILL_CATEGORIES,
  showLevels = true,
  showSuggestions = true,
  placeholder = "Search for skills...",
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customSkillName, setCustomSkillName] = useState('');
  const [customSkillCategory, setCustomSkillCategory] = useState('Other');

  useEffect(() => {
    let filtered = POPULAR_SKILLS;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(skill =>
        skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(skill => skill.category === selectedCategory);
    }

    // Remove already selected skills
    filtered = filtered.filter(skill => 
      !selectedSkills.some(selected => selected.id === skill.id)
    );

    setFilteredSkills(filtered);
  }, [searchTerm, selectedCategory, selectedSkills]);

  const addSkill = (skill: Skill) => {
    if (selectedSkills.length >= maxSkills) return;
    
    const newSkill = { ...skill, level: showLevels ? 5 : undefined };
    onSkillsChange([...selectedSkills, newSkill]);
  };

  const removeSkill = (skillId: string) => {
    onSkillsChange(selectedSkills.filter(skill => skill.id !== skillId));
  };

  const updateSkillLevel = (skillId: string, level: number) => {
    onSkillsChange(
      selectedSkills.map(skill =>
        skill.id === skillId ? { ...skill, level } : skill
      )
    );
  };

  const addCustomSkill = () => {
    if (!customSkillName.trim()) return;

    const customSkill: Skill = {
      id: `custom-${Date.now()}`,
      name: customSkillName.trim(),
      category: customSkillCategory,
      level: showLevels ? 5 : undefined,
    };

    addSkill(customSkill);
    setCustomSkillName('');
    setShowAddCustom(false);
  };

  const getSuggestions = () => {
    // Simple suggestion logic based on selected skills
    const selectedCategories = Array.from(new Set(selectedSkills.map(s => s.category)));
    return POPULAR_SKILLS
      .filter(skill => 
        selectedCategories.includes(skill.category) &&
        !selectedSkills.some(selected => selected.id === skill.id)
      )
      .slice(0, 5);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Select Your Skills
        </CardTitle>
        <CardDescription>
          Choose skills that represent your expertise. You can select up to {maxSkills} skills.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'All' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('All')}
            >
              All Categories
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Selected Skills */}
        {selectedSkills.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">
              Selected Skills ({selectedSkills.length}/{maxSkills})
            </h4>
            <div className="space-y-2">
              {selectedSkills.map(skill => (
                <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{skill.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {skill.category}
                      </Badge>
                    </div>
                    
                    {showLevels && skill.level && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Level:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                              <button
                                key={level}
                                onClick={() => updateSkillLevel(skill.id, level)}
                                className={`w-6 h-6 rounded-full text-xs ${
                                  level <= skill.level!
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSkill(skill.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Skills */}
        {filteredSkills.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Available Skills</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredSkills.map(skill => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => addSkill(skill)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{skill.name}</span>
                      {skill.popularity && skill.popularity > 80 && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                      {skill.demandScore && skill.demandScore > 85 && (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {skill.category}
                      </Badge>
                      {skill.popularity && (
                        <span className="text-xs text-gray-500">
                          {skill.popularity}% popular
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && selectedSkills.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Suggested Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {getSuggestions().map(skill => (
                <Button
                  key={skill.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addSkill(skill)}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {skill.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Skill */}
        <div className="space-y-3">
          {!showAddCustom ? (
            <Button
              variant="outline"
              onClick={() => setShowAddCustom(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Skill
            </Button>
          ) : (
            <div className="space-y-3 p-3 border rounded-lg">
              <Input
                placeholder="Enter skill name"
                value={customSkillName}
                onChange={(e) => setCustomSkillName(e.target.value)}
              />
              <select
                value={customSkillCategory}
                onChange={(e) => setCustomSkillCategory(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button onClick={addCustomSkill} size="sm">
                  Add Skill
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddCustom(false);
                    setCustomSkillName('');
                  }}
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
