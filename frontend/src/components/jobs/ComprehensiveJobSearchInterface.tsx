/**
 * SkillForge AI - Comprehensive Job Search and Matching Interface
 * Advanced job search with AI-powered matching, filters, and personalized recommendations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Avatar,
  IconButton,
  Drawer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Autocomplete,
  Pagination,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Badge,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  AttachMoney as SalaryIcon,
  Schedule as TimeIcon,
  TrendingUp as TrendingIcon,
  Psychology as AIIcon,
  Share as ShareIcon,
  GetApp as ApplyIcon,
  Close as CloseIcon,
  Tune as TuneIcon,
  Star as StarIcon,
  Business as CompanyIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { JobCard, Job } from './JobCard';
import { JobMatchScore } from './JobMatchScore';
import { SavedJobsManager } from './SavedJobsManager';

// Job interface is imported from JobCard

// API response job format
interface APIJob {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship';
  remote: boolean;
  description: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  postedDate: string;
  applicationDeadline?: string;
  matchScore?: number;
  matchReasons?: string[];
  isBookmarked: boolean;
  applicationStatus?: 'not_applied' | 'applied' | 'interviewing' | 'offered' | 'rejected';
}

// Function to convert API job to JobCard job format
const convertAPIJobToJob = (apiJob: APIJob): Job => ({
  id: apiJob.id,
  title: apiJob.title,
  company: apiJob.company,
  location: apiJob.location,
  salary: apiJob.salaryMin && apiJob.salaryMax ? {
    min: apiJob.salaryMin,
    max: apiJob.salaryMax,
    currency: '$'
  } : undefined,
  type: apiJob.employmentType === 'full_time' ? 'full-time' :
        apiJob.employmentType === 'part_time' ? 'part-time' :
        apiJob.employmentType === 'contract' ? 'contract' : 'remote',
  description: apiJob.description,
  requirements: apiJob.requirements,
  skills: apiJob.skills,
  postedDate: new Date(apiJob.postedDate),
  applicationDeadline: apiJob.applicationDeadline ? new Date(apiJob.applicationDeadline) : undefined,
  isRemote: apiJob.remote,
  experienceLevel: 'mid', // Default value, should come from API
  companyLogo: apiJob.companyLogo,
  applicationUrl: `#apply-${apiJob.id}`, // Default value
  isSaved: apiJob.isBookmarked,
  matchScore: apiJob.matchScore,
});

interface SearchFilters {
  query: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  employmentTypes: string[];
  remote: boolean;
  skills: string[];
  experienceLevel: string;
  companySize: string;
  industry: string;
  postedWithin: string;
  sortBy: 'relevance' | 'date' | 'salary' | 'match_score';
}

const ComprehensiveJobSearchInterface: React.FC = () => {
  const router = useRouter();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  // State management
  const [jobs, setJobs] = useState<APIJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<APIJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    location: '',
    salaryMin: 0,
    salaryMax: 300000,
    employmentTypes: [],
    remote: false,
    skills: [],
    experienceLevel: '',
    companySize: '',
    industry: '',
    postedWithin: '',
    sortBy: 'relevance',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJob, setSelectedJob] = useState<APIJob | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [aiRecommendations, setAIRecommendations] = useState<APIJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  // Constants
  const JOBS_PER_PAGE = 20;
  const employmentTypeOptions = [
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'internship', label: 'Internship' },
  ];

  // Search and filter jobs
  const searchJobs = useCallback(async (filters: SearchFilters, page: number = 1) => {
    setLoading(true);
    
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: JOBS_PER_PAGE.toString(),
        query: filters.query,
        location: filters.location,
        salaryMin: filters.salaryMin.toString(),
        salaryMax: filters.salaryMax.toString(),
        remote: filters.remote.toString(),
        experienceLevel: filters.experienceLevel,
        companySize: filters.companySize,
        industry: filters.industry,
        postedWithin: filters.postedWithin,
        sortBy: filters.sortBy,
        employment_types: filters.employmentTypes.join(','),
        skills: filters.skills.join(','),
      });

      const response = await fetch(`/api/v1/jobs/search?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to search jobs');
      }

      const data = await response.json();
      
      setJobs(data.jobs);
      setFilteredJobs(data.jobs);
      setTotalPages(Math.ceil(data.total / JOBS_PER_PAGE));
      setCurrentPage(page);

      // Get AI recommendations if user is authenticated
      if (user && page === 1) {
        getAIRecommendations();
      }

    } catch (error) {
      console.error('Job search error:', error);
      showToast('Failed to search jobs', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  // Get AI-powered job recommendations
  const getAIRecommendations = async () => {
    try {
      const response = await fetch('/api/v1/jobs/recommendations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const recommendations = await response.json();
        setAIRecommendations(recommendations.jobs || []);
      }
    } catch (error) {
      console.error('Failed to get AI recommendations:', error);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setSearchFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Apply filters and search
  const applyFilters = () => {
    searchJobs(searchFilters, 1);
    setShowFilters(false);
  };

  // Clear all filters
  const clearFilters = () => {
    const defaultFilters: SearchFilters = {
      query: '',
      location: '',
      salaryMin: 0,
      salaryMax: 300000,
      employmentTypes: [],
      remote: false,
      skills: [],
      experienceLevel: '',
      companySize: '',
      industry: '',
      postedWithin: '',
      sortBy: 'relevance',
    };
    setSearchFilters(defaultFilters);
    searchJobs(defaultFilters, 1);
  };

  // Toggle job bookmark
  const toggleBookmark = async (jobId: string) => {
    try {
      const isBookmarked = savedJobs.includes(jobId);
      const method = isBookmarked ? 'DELETE' : 'POST';
      
      const response = await fetch(`/api/v1/jobs/${jobId}/bookmark`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update bookmark');
      }

      setSavedJobs(prev => 
        isBookmarked 
          ? prev.filter(id => id !== jobId)
          : [...prev, jobId]
      );

      // Update job in the list
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, isBookmarked: !isBookmarked }
          : job
      ));

      showToast(
        isBookmarked ? 'Job removed from saved jobs' : 'Job saved successfully',
        'success'
      );

    } catch (error) {
      console.error('Bookmark error:', error);
      showToast('Failed to update bookmark', 'error');
    }
  };

  // Apply to job
  const applyToJob = async (job: APIJob) => {
    try {
      const response = await fetch(`/api/v1/jobs/${job.id}/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coverLetter: '', // This would come from a form
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply to job');
      }

      showToast('Application submitted successfully!', 'success');
      
      // Update job status
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { ...j, applicationStatus: 'applied' }
          : j
      ));

    } catch (error) {
      console.error('Application error:', error);
      showToast('Failed to submit application', 'error');
    }
  };

  // Initial load
  useEffect(() => {
    searchJobs(searchFilters);
  }, []);

  // Load saved jobs
  useEffect(() => {
    if (user) {
      loadSavedJobs();
    }
  }, [user]);

  const loadSavedJobs = async () => {
    try {
      const response = await fetch('/api/v1/jobs/saved', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSavedJobs(data.jobIds || []);
      }
    } catch (error) {
      console.error('Failed to load saved jobs:', error);
    }
  };

  // Memoized filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchFilters.query) count++;
    if (searchFilters.location) count++;
    if (searchFilters.employmentTypes.length > 0) count++;
    if (searchFilters.skills.length > 0) count++;
    if (searchFilters.remote) count++;
    if (searchFilters.experienceLevel) count++;
    if (searchFilters.industry) count++;
    if (searchFilters.postedWithin) count++;
    return count;
  }, [searchFilters]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Search Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search jobs, companies, or keywords..."
                value={searchFilters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Location"
                value={searchFilters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                InputProps={{
                  startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={applyFilters}
                  disabled={loading}
                  fullWidth
                >
                  Search
                </Button>
                
                <Badge badgeContent={activeFilterCount} color="primary">
                  <IconButton
                    onClick={() => setShowFilters(true)}
                    color={activeFilterCount > 0 ? 'primary' : 'default'}
                  >
                    <FilterIcon />
                  </IconButton>
                </Badge>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {aiRecommendations.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                AI Recommended Jobs
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              {aiRecommendations.slice(0, 3).map((job) => (
                <Grid item xs={12} md={4} key={job.id}>
                  <JobCard
                    job={convertAPIJobToJob(job)}
                    onSave={() => toggleBookmark(job.id)}
                    onUnsave={() => toggleBookmark(job.id)}
                    onApply={() => applyToJob(job)}
                    onViewDetails={() => {
                      setSelectedJob(job);
                      setShowJobDetails(true);
                    }}
                    showMatchScore
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Results Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {loading ? 'Searching...' : `${jobs.length} jobs found`}
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={searchFilters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            label="Sort by"
          >
            <MenuItem value="relevance">Relevance</MenuItem>
            <MenuItem value="date">Date Posted</MenuItem>
            <MenuItem value="salary">Salary</MenuItem>
            <MenuItem value="match_score">Match Score</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Job Results */}
      <Grid container spacing={3}>
        {loading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="40%" height={24} />
                  <Skeleton variant="rectangular" width="100%" height={100} sx={{ mt: 1 }} />
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Skeleton variant="rectangular" width={60} height={24} />
                    <Skeleton variant="rectangular" width={80} height={24} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : jobs.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">
              No jobs found matching your criteria. Try adjusting your search filters.
            </Alert>
          </Grid>
        ) : (
          jobs.map((job) => (
            <Grid item xs={12} md={6} lg={4} key={job.id}>
              <JobCard
                job={convertAPIJobToJob(job)}
                onSave={() => toggleBookmark(job.id)}
                onUnsave={() => toggleBookmark(job.id)}
                onApply={() => applyToJob(job)}
                onViewDetails={() => {
                  setSelectedJob(job);
                  setShowJobDetails(true);
                }}
                showMatchScore
              />
            </Grid>
          ))
        )}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => searchJobs(searchFilters, page)}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {/* Filters Drawer */}
      <Drawer
        anchor="right"
        open={showFilters}
        onClose={() => setShowFilters(false)}
        PaperProps={{ sx: { width: 400, p: 3 } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Filters</Typography>
          <IconButton onClick={() => setShowFilters(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Filter content would be implemented here */}
        <Typography variant="body2" color="text.secondary">
          Advanced filters implementation...
        </Typography>

        <Box sx={{ mt: 'auto', pt: 3 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={applyFilters}
            sx={{ mb: 1 }}
          >
            Apply Filters
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={clearFilters}
          >
            Clear All
          </Button>
        </Box>
      </Drawer>

      {/* Job Details Dialog */}
      <Dialog
        open={showJobDetails}
        onClose={() => setShowJobDetails(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedJob && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{selectedJob.title}</Typography>
                <IconButton onClick={() => setShowJobDetails(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              {/* Detailed job content would be implemented here */}
              <Typography variant="body1">
                Job details for {selectedJob.title} at {selectedJob.company}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => toggleBookmark(selectedJob.id)}>
                {selectedJob.isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
              </Button>
              <Button variant="contained" onClick={() => applyToJob(selectedJob)}>
                Apply Now
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ComprehensiveJobSearchInterface;
