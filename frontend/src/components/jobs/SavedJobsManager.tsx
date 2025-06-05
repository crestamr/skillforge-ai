import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bookmark, 
  BookmarkCheck, 
  Trash2, 
  ExternalLink,
  Filter,
  Search,
  Calendar,
  MapPin,
  Building
} from 'lucide-react';
import { Job } from './JobCard';

interface SavedJob extends Job {
  savedDate: Date;
  notes?: string;
  applicationStatus?: 'not_applied' | 'applied' | 'interviewing' | 'rejected' | 'offered';
}

interface SavedJobsManagerProps {
  savedJobs: SavedJob[];
  onUnsaveJob: (jobId: string) => void;
  onApplyToJob: (jobId: string) => void;
  onUpdateApplicationStatus: (jobId: string, status: SavedJob['applicationStatus']) => void;
  onAddNotes: (jobId: string, notes: string) => void;
  className?: string;
}

export const SavedJobsManager: React.FC<SavedJobsManagerProps> = ({
  savedJobs,
  onUnsaveJob,
  onApplyToJob,
  onUpdateApplicationStatus,
  onAddNotes,
  className = ''
}) => {
  const [filteredJobs, setFilteredJobs] = useState<SavedJob[]>(savedJobs);
  const [filterStatus, setFilterStatus] = useState<SavedJob['applicationStatus'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let filtered = savedJobs;

    // Filter by application status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => job.applicationStatus === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  }, [savedJobs, filterStatus, searchTerm]);

  const getStatusBadge = (status: SavedJob['applicationStatus']) => {
    switch (status) {
      case 'not_applied':
        return <Badge variant="outline">Not Applied</Badge>;
      case 'applied':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Applied</Badge>;
      case 'interviewing':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Interviewing</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'offered':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Offered</Badge>;
      default:
        return <Badge variant="outline">Not Applied</Badge>;
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const statusCounts = {
    all: savedJobs.length,
    not_applied: savedJobs.filter(j => j.applicationStatus === 'not_applied' || !j.applicationStatus).length,
    applied: savedJobs.filter(j => j.applicationStatus === 'applied').length,
    interviewing: savedJobs.filter(j => j.applicationStatus === 'interviewing').length,
    rejected: savedJobs.filter(j => j.applicationStatus === 'rejected').length,
    offered: savedJobs.filter(j => j.applicationStatus === 'offered').length,
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5" />
              Saved Jobs ({savedJobs.length})
            </CardTitle>
            <CardDescription>
              Manage your saved job opportunities and track application progress
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters and Search */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search saved jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              All ({statusCounts.all})
            </Button>
            <Button
              variant={filterStatus === 'not_applied' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('not_applied')}
            >
              Not Applied ({statusCounts.not_applied})
            </Button>
            <Button
              variant={filterStatus === 'applied' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('applied')}
            >
              Applied ({statusCounts.applied})
            </Button>
            <Button
              variant={filterStatus === 'interviewing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('interviewing')}
            >
              Interviewing ({statusCounts.interviewing})
            </Button>
            <Button
              variant={filterStatus === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('rejected')}
            >
              Rejected ({statusCounts.rejected})
            </Button>
            <Button
              variant={filterStatus === 'offered' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('offered')}
            >
              Offered ({statusCounts.offered})
            </Button>
          </div>
        </div>

        {/* Saved Jobs List */}
        <div className="space-y-3">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bookmark className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No saved jobs found</p>
              <p className="text-sm">Start saving jobs to track them here</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <Card key={job.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {job.companyLogo && (
                          <img 
                            src={job.companyLogo} 
                            alt={`${job.company} logo`}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">{job.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {job.company}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Saved {getTimeAgo(job.savedDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        {getStatusBadge(job.applicationStatus)}
                        <Badge variant="outline" className="text-xs">
                          {job.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                      
                      {job.notes && (
                        <p className="text-sm text-gray-600 mb-3 italic">
                          "{job.notes}"
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {(!job.applicationStatus || job.applicationStatus === 'not_applied') && (
                        <Button
                          size="sm"
                          onClick={() => onApplyToJob(job.id)}
                        >
                          Apply
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(job.applicationUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUnsaveJob(job.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
