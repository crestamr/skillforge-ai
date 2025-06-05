import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Linkedin, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  User,
  Briefcase,
  GraduationCap,
  Award,
  Users,
  ExternalLink
} from 'lucide-react';

interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  profilePicture?: string;
  location: string;
  industry: string;
  connections: number;
  positions: LinkedInPosition[];
  education: LinkedInEducation[];
  skills: LinkedInSkill[];
  certifications: LinkedInCertification[];
}

interface LinkedInPosition {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  description: string;
  isCurrent: boolean;
}

interface LinkedInEducation {
  id: string;
  school: string;
  degree: string;
  field: string;
  startYear: number;
  endYear?: number;
  description?: string;
}

interface LinkedInSkill {
  id: string;
  name: string;
  endorsements: number;
}

interface LinkedInCertification {
  id: string;
  name: string;
  organization: string;
  issueDate: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

interface LinkedInIntegrationProps {
  onProfileImported?: (profile: LinkedInProfile) => void;
  onSkillsImported?: (skills: LinkedInSkill[]) => void;
  onExperienceImported?: (positions: LinkedInPosition[]) => void;
  className?: string;
}

export const LinkedInIntegration: React.FC<LinkedInIntegrationProps> = ({
  onProfileImported,
  onSkillsImported,
  onExperienceImported,
  className = ''
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already connected to LinkedIn
    checkLinkedInConnection();
  }, []);

  const checkLinkedInConnection = async () => {
    try {
      const response = await fetch('/api/integrations/linkedin/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        if (data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (error) {
      console.error('Error checking LinkedIn connection:', error);
    }
  };

  const connectToLinkedIn = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Redirect to LinkedIn OAuth
      const response = await fetch('/api/integrations/linkedin/auth', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to initiate LinkedIn connection');
      }
    } catch (error) {
      setError('Failed to connect to LinkedIn. Please try again.');
      setIsConnecting(false);
    }
  };

  const importLinkedInData = async () => {
    if (!isConnected) return;

    setIsImporting(true);
    setImportProgress(0);
    setError(null);

    try {
      // Import profile data
      setImportProgress(25);
      const profileResponse = await fetch('/api/integrations/linkedin/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to import profile data');
      }

      const profileData = await profileResponse.json();
      setProfile(profileData);
      setImportProgress(50);

      // Import skills
      const skillsResponse = await fetch('/api/integrations/linkedin/skills', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json();
        onSkillsImported?.(skillsData);
      }
      setImportProgress(75);

      // Import experience
      const experienceResponse = await fetch('/api/integrations/linkedin/experience', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (experienceResponse.ok) {
        const experienceData = await experienceResponse.json();
        onExperienceImported?.(experienceData);
      }
      setImportProgress(100);

      onProfileImported?.(profileData);
      
    } catch (error) {
      setError('Failed to import LinkedIn data. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const disconnectLinkedIn = async () => {
    try {
      await fetch('/api/integrations/linkedin/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      setIsConnected(false);
      setProfile(null);
    } catch (error) {
      setError('Failed to disconnect LinkedIn. Please try again.');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Linkedin className="w-5 h-5 text-blue-600" />
          LinkedIn Integration
        </CardTitle>
        <CardDescription>
          Connect your LinkedIn profile to automatically import your professional information, skills, and experience.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {!isConnected ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <Linkedin className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Connect Your LinkedIn Profile</h3>
              <p className="text-sm text-gray-600 mb-4">
                Import your professional information to quickly set up your SkillForge profile.
              </p>
              <Button 
                onClick={connectToLinkedIn}
                disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Linkedin className="w-4 h-4 mr-2" />
                    Connect LinkedIn
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">
                  LinkedIn Connected
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectLinkedIn}
                className="text-red-600 hover:text-red-700"
              >
                Disconnect
              </Button>
            </div>

            {/* Profile Preview */}
            {profile && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Profile Preview</h4>
                
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  {profile.profilePicture ? (
                    <img 
                      src={profile.profilePicture} 
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {profile.firstName} {profile.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{profile.headline}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {profile.industry}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {profile.connections} connections
                      </span>
                    </div>
                  </div>
                </div>

                {/* Data Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <Briefcase className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-lg font-semibold">{profile.positions.length}</div>
                    <div className="text-xs text-gray-600">Positions</div>
                  </div>
                  
                  <div className="text-center p-3 border rounded-lg">
                    <GraduationCap className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="text-lg font-semibold">{profile.education.length}</div>
                    <div className="text-xs text-gray-600">Education</div>
                  </div>
                  
                  <div className="text-center p-3 border rounded-lg">
                    <Award className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-lg font-semibold">{profile.skills.length}</div>
                    <div className="text-xs text-gray-600">Skills</div>
                  </div>
                  
                  <div className="text-center p-3 border rounded-lg">
                    <CheckCircle className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                    <div className="text-lg font-semibold">{profile.certifications.length}</div>
                    <div className="text-xs text-gray-600">Certifications</div>
                  </div>
                </div>
              </div>
            )}

            {/* Import Actions */}
            <div className="space-y-3">
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importing LinkedIn data...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={importLinkedInData}
                  disabled={isImporting}
                  className="flex-1"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Import Data
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open('https://linkedin.com/in/me', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Profile
                </Button>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">What gets imported:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Professional experience and job history
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Skills and endorsements
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Education and certifications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Professional summary and headline
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
