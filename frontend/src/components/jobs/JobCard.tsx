import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  DollarSign, 
  Clock, 
  Building, 
  Heart,
  ExternalLink,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  type: 'full-time' | 'part-time' | 'contract' | 'remote';
  description: string;
  requirements: string[];
  skills: string[];
  postedDate: Date;
  applicationDeadline?: Date;
  isRemote: boolean;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  companyLogo?: string;
  applicationUrl?: string;
  isSaved?: boolean;
  matchScore?: number;
}

interface JobCardProps {
  job: Job;
  onSave?: (jobId: string) => void;
  onUnsave?: (jobId: string) => void;
  onApply?: (jobId: string) => void;
  onViewDetails?: (jobId: string) => void;
  showMatchScore?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onSave,
  onUnsave,
  onApply,
  onViewDetails,
  showMatchScore = false
}) => {
  const formatSalary = (salary: Job['salary']) => {
    if (!salary) return 'Salary not specified';
    const { min, max, currency } = salary;
    if (min === max) {
      return `${currency}${min.toLocaleString()}`;
    }
    return `${currency}${min.toLocaleString()} - ${currency}${max.toLocaleString()}`;
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

  const handleSaveToggle = () => {
    if (job.isSaved) {
      onUnsave?.(job.id);
    } else {
      onSave?.(job.id);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {job.companyLogo && (
                <img 
                  src={job.companyLogo} 
                  alt={`${job.company} logo`}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                          onClick={() => onViewDetails?.(job.id)}>
                  {job.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-gray-600">
                  <Building className="w-4 h-4" />
                  {job.company}
                </CardDescription>
              </div>
            </div>
            
            {showMatchScore && job.matchScore && (
              <div className="mb-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {job.matchScore}% Match
                </Badge>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveToggle}
            className="text-gray-500 hover:text-red-500"
          >
            {job.isSaved ? (
              <BookmarkCheck className="w-5 h-5" />
            ) : (
              <Bookmark className="w-5 h-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Location and Salary */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{job.location}</span>
              {job.isRemote && (
                <Badge variant="outline" className="ml-1 text-xs">
                  Remote
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span>{formatSalary(job.salary)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{getTimeAgo(job.postedDate)}</span>
            </div>
          </div>
          
          {/* Job Type and Experience Level */}
          <div className="flex gap-2">
            <Badge variant="secondary">
              {job.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
            <Badge variant="outline">
              {job.experienceLevel.replace(/\b\w/g, l => l.toUpperCase())} Level
            </Badge>
          </div>
          
          {/* Description */}
          <p className="text-sm text-gray-700 line-clamp-2">
            {job.description}
          </p>
          
          {/* Skills */}
          <div className="flex flex-wrap gap-1">
            {job.skills.slice(0, 5).map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {job.skills.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{job.skills.length - 5} more
              </Badge>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={() => onApply?.(job.id)}
              className="flex-1"
            >
              Apply Now
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onViewDetails?.(job.id)}
              className="flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              Details
            </Button>
          </div>
          
          {/* Application Deadline */}
          {job.applicationDeadline && (
            <div className="text-xs text-gray-500 border-t pt-2">
              Application deadline: {job.applicationDeadline.toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
