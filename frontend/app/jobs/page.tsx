/**
 * SkillForge AI - Jobs Page
 * Job search and matching interface
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAppStore, useJobsData, useUserData } from '../../src/store/useAppStore';
import { jobsApi, skillsApi } from '../../src/lib/api';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';
import DashboardLayout from '../../src/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { Badge } from '../../src/components/ui/badge';
import { Alert, AlertDescription } from '../../src/components/ui/alert';
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Clock, 
  Building, 
  Heart,
  Star,
  Filter,
  Briefcase,
  TrendingUp,
  Target,
  BookOpen,
  X,
  ChevronRight,
  Play
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: { min: number; max: number };
  remote: boolean;
  description?: string;
  requiredSkills?: string[];
  matchScore?: number;
  isBookmarked: boolean;
  applicationStatus?: string;
  postedDate: string;
  companyRating?: number;
  urgent?: boolean;
}

export default function JobsPage() {
  const { user } = useAuth();
  const { userSkills } = useUserData();
  const { jobs, savedJobs, jobRecommendations, jobSearchFilters } = useJobsData();
  const { 
    setJobs, 
    setSavedJobs, 
    setJobRecommendations, 
    updateJobSearchFilters,
    toggleJobBookmark,
    isLoading, 
    setLoading 
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState(jobSearchFilters.query);
  const [locationQuery, setLocationQuery] = useState(jobSearchFilters.location);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load jobs data
  useEffect(() => {
    loadJobs();
    loadRecommendations();
    loadSavedJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await jobsApi.searchJobs(jobSearchFilters).catch(() => {
        // Fallback data for development
        return {
          data: [
            {
              id: '1',
              title: 'Senior Frontend Developer',
              company: 'TechCorp',
              location: 'San Francisco, CA',
              salary: { min: 120000, max: 180000 },
              remote: true,
              description: 'We are looking for a senior frontend developer to join our team...',
              requiredSkills: ['React', 'TypeScript', 'JavaScript', 'CSS'],
              matchScore: 95,
              isBookmarked: false,
              postedDate: '2024-01-15',
              companyRating: 4.5,
            },
            {
              id: '2',
              title: 'Full Stack Engineer',
              company: 'StartupXYZ',
              location: 'New York, NY',
              salary: { min: 100000, max: 150000 },
              remote: false,
              description: 'Join our fast-growing startup as a full stack engineer...',
              requiredSkills: ['Node.js', 'React', 'MongoDB', 'AWS'],
              matchScore: 88,
              isBookmarked: true,
              postedDate: '2024-01-14',
              companyRating: 4.2,
            },
            {
              id: '3',
              title: 'Python Developer',
              company: 'DataCorp',
              location: 'Austin, TX',
              salary: { min: 90000, max: 130000 },
              remote: true,
              description: 'Looking for a Python developer to work on data processing...',
              requiredSkills: ['Python', 'Django', 'PostgreSQL', 'Docker'],
              matchScore: 82,
              isBookmarked: false,
              postedDate: '2024-01-13',
              urgent: true,
            },
            {
              id: '4',
              title: 'DevOps Engineer',
              company: 'CloudTech',
              location: 'Seattle, WA',
              salary: { min: 110000, max: 160000 },
              remote: true,
              description: 'DevOps engineer needed for cloud infrastructure...',
              requiredSkills: ['AWS', 'Kubernetes', 'Docker', 'Terraform'],
              matchScore: 75,
              isBookmarked: false,
              postedDate: '2024-01-12',
              companyRating: 4.8,
            },
          ]
        };
      });

      const jobsData = (response as any)?.data || response;
      const normalizedJobs = Array.isArray(jobsData) ? jobsData.map((job: any) => ({
        ...job,
        description: job.description || 'No description available',
        requiredSkills: job.requiredSkills || []
      })) : [];
      setJobs(normalizedJobs);
    } catch (error: any) {
      console.error('Failed to load jobs:', error);
      setError(error.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const recommendations = await jobsApi.getRecommendations().catch(() => {
        // Fallback data
        return [
          {
            id: '5',
            title: 'React Developer',
            company: 'WebCorp',
            location: 'Remote',
            salary: { min: 85000, max: 120000 },
            remote: true,
            description: 'React developer for modern web applications...',
            requiredSkills: ['React', 'JavaScript', 'HTML', 'CSS'],
            matchScore: 92,
            isBookmarked: false,
            postedDate: '2024-01-16',
          },
        ];
      });

      const normalizedRecommendations = Array.isArray(recommendations) ? recommendations.map((job: any) => ({
        ...job,
        description: job.description || 'No description available',
        requiredSkills: job.requiredSkills || []
      })) : [];
      setJobRecommendations(normalizedRecommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const loadSavedJobs = async () => {
    try {
      const saved = await jobsApi.getSavedJobs().catch(() => {
        // Fallback data
        return [
          {
            id: '2',
            title: 'Full Stack Engineer',
            company: 'StartupXYZ',
            location: 'New York, NY',
            salary: { min: 100000, max: 150000 },
            remote: false,
            description: 'Join our fast-growing startup...',
            requiredSkills: ['Node.js', 'React', 'MongoDB'],
            isBookmarked: true,
            postedDate: '2024-01-14',
          },
        ];
      });

      const normalizedSaved = Array.isArray(saved) ? saved.map((job: any) => ({
        ...job,
        description: job.description || 'No description available',
        requiredSkills: job.requiredSkills || []
      })) : [];
      setSavedJobs(normalizedSaved);
    } catch (error) {
      console.error('Failed to load saved jobs:', error);
    }
  };

  const handleSearch = () => {
    const filters = {
      ...jobSearchFilters,
      query: searchQuery,
      location: locationQuery,
    };
    updateJobSearchFilters(filters);
    loadJobs();
  };

  const handleBookmark = async (jobId: string) => {
    try {
      await jobsApi.bookmarkJob(jobId);
      toggleJobBookmark(jobId);
    } catch (error) {
      console.error('Failed to bookmark job:', error);
    }
  };

  const handleApply = async (job: Job) => {
    try {
      await jobsApi.applyToJob(job.id, {
        coverLetter: 'Generated cover letter based on user profile...',
      });
      // Update job status in store
      // This would be handled by the store action
    } catch (error) {
      console.error('Failed to apply to job:', error);
    }
  };

  const formatSalary = (salary: any) => {
    if (!salary) return 'Salary not specified';
    if (salary.min && salary.max) {
      return `$${(salary.min / 1000).toFixed(0)}k - $${(salary.max / 1000).toFixed(0)}k`;
    }
    if (salary.min) return `$${(salary.min / 1000).toFixed(0)}k+`;
    return 'Competitive salary';
  };

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-blue-600 bg-blue-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getSkillMatch = (job: Job) => {
    if (!job.requiredSkills || !userSkills) return 0;
    const userSkillNames = userSkills.map(s => s.name.toLowerCase());
    const requiredSkillNames = job.requiredSkills.map(s => s.toLowerCase());
    const matches = requiredSkillNames.filter(skill => userSkillNames.includes(skill));
    return Math.round((matches.length / requiredSkillNames.length) * 100);
  };

  return (
    <ProtectedRoute requireAuth={true} requireOnboarding={true}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Job Search
            </h1>
            <p className="text-gray-600">
              Find your next opportunity with AI-powered job matching
            </p>
          </div>

          {/* Search Bar */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search jobs, companies, or keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Location"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? 'Searching...' : 'Search'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
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

          {/* AI Recommendations */}
          {jobRecommendations.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2 text-purple-600" />
                Recommended for You
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobRecommendations.slice(0, 3).map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    userSkills={userSkills}
                    onBookmark={handleBookmark}
                    onApply={handleApply}
                    onViewDetails={setSelectedJob}
                    isRecommended={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Job Results */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {isLoading ? 'Searching...' : `${jobs.length} jobs found`}
              </h2>
              <div className="text-sm text-gray-500">
                Sorted by relevance
              </div>
            </div>

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
            ) : jobs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
                  <p className="text-gray-500 mb-4">
                    Try adjusting your search criteria or filters
                  </p>
                  <Button onClick={() => {
                    setSearchQuery('');
                    setLocationQuery('');
                    handleSearch();
                  }}>
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    userSkills={userSkills}
                    onBookmark={handleBookmark}
                    onApply={handleApply}
                    onViewDetails={setSelectedJob}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Job Card Component
interface JobCardProps {
  job: Job;
  userSkills: any[];
  onBookmark: (jobId: string) => void;
  onApply: (job: Job) => void;
  onViewDetails: (job: Job) => void;
  isRecommended?: boolean;
}

const JobCard: React.FC<JobCardProps> = ({ 
  job, 
  userSkills, 
  onBookmark, 
  onApply, 
  onViewDetails, 
  isRecommended = false 
}) => {
  const formatSalary = (salary: any) => {
    if (!salary) return 'Salary not specified';
    if (salary.min && salary.max) {
      return `$${(salary.min / 1000).toFixed(0)}k - $${(salary.max / 1000).toFixed(0)}k`;
    }
    if (salary.min) return `$${(salary.min / 1000).toFixed(0)}k+`;
    return 'Competitive salary';
  };

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-blue-600 bg-blue-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getSkillMatch = () => {
    if (!job.requiredSkills || !userSkills) return 0;
    const userSkillNames = userSkills.map(s => s.name.toLowerCase());
    const requiredSkillNames = job.requiredSkills.map(s => s.toLowerCase());
    const matches = requiredSkillNames.filter(skill => userSkillNames.includes(skill));
    return Math.round((matches.length / requiredSkillNames.length) * 100);
  };

  const skillMatch = getSkillMatch();

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${isRecommended ? 'ring-2 ring-purple-200' : ''}`}>
      {isRecommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-purple-600 text-white">Recommended</Badge>
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
              {job.remote && (
                <Badge variant="secondary" className="text-xs">Remote</Badge>
              )}
              {job.urgent && (
                <Badge variant="destructive" className="text-xs">Urgent</Badge>
              )}
            </div>
            
            <div className="flex items-center text-gray-600 mb-2">
              <Building className="h-4 w-4 mr-2" />
              <span className="font-medium">{job.company}</span>
              {job.companyRating && (
                <div className="flex items-center ml-2">
                  <Star className="h-3 w-3 text-yellow-500 mr-1" />
                  <span className="text-sm">{job.companyRating}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center text-gray-600 mb-3">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{job.location}</span>
            </div>
            
            <div className="flex items-center text-gray-600 mb-3">
              <DollarSign className="h-4 w-4 mr-2" />
              <span>{formatSalary(job.salary)}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            {job.matchScore && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchColor(job.matchScore)}`}>
                {job.matchScore}% match
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onBookmark(job.id)}
              className={job.isBookmarked ? 'text-red-500' : 'text-gray-400'}
            >
              <Heart className={`h-4 w-4 ${job.isBookmarked ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
        
        {job.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {job.description}
          </p>
        )}
        
        {job.requiredSkills && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Required Skills</span>
              {skillMatch > 0 && (
                <span className="text-xs text-gray-500">{skillMatch}% match</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {job.requiredSkills.slice(0, 4).map((skill, index) => {
                const hasSkill = userSkills?.some(s => 
                  s.name.toLowerCase() === skill.toLowerCase()
                );
                return (
                  <Badge
                    key={index}
                    variant={hasSkill ? "default" : "outline"}
                    className="text-xs"
                  >
                    {skill}
                  </Badge>
                );
              })}
              {job.requiredSkills.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{job.requiredSkills.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            <span>{new Date(job.postedDate).toLocaleDateString()}</span>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(job)}
            >
              View Details
            </Button>
            <Button
              size="sm"
              onClick={() => onApply(job)}
              disabled={job.applicationStatus === 'applied'}
            >
              {job.applicationStatus === 'applied' ? 'Applied' : 'Apply Now'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
