import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Github, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Star,
  GitFork,
  Code,
  Calendar,
  ExternalLink,
  TrendingUp
} from 'lucide-react';

interface GitHubProfile {
  id: number;
  login: string;
  name: string;
  bio: string;
  avatar_url: string;
  location: string;
  company: string;
  blog: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  topics: string[];
  html_url: string;
}

interface GitHubStats {
  totalCommits: number;
  totalStars: number;
  totalForks: number;
  languageStats: { [key: string]: number };
  contributionStreak: number;
  mostActiveRepo: string;
}

interface GitHubIntegrationProps {
  onProfileImported?: (profile: GitHubProfile) => void;
  onRepositoriesImported?: (repos: GitHubRepository[]) => void;
  onSkillsDetected?: (skills: string[]) => void;
  className?: string;
}

export const GitHubIntegration: React.FC<GitHubIntegrationProps> = ({
  onProfileImported,
  onRepositoriesImported,
  onSkillsDetected,
  className = ''
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already connected to GitHub
    checkGitHubConnection();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      const response = await fetch('/api/integrations/github/status', {
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
        if (data.repositories) {
          setRepositories(data.repositories);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
    }
  };

  const connectToGitHub = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Redirect to GitHub OAuth
      const response = await fetch('/api/integrations/github/auth', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to initiate GitHub connection');
      }
    } catch (error) {
      setError('Failed to connect to GitHub. Please try again.');
      setIsConnecting(false);
    }
  };

  const importGitHubData = async () => {
    if (!isConnected) return;

    setIsImporting(true);
    setImportProgress(0);
    setError(null);

    try {
      // Import profile data
      setImportProgress(20);
      const profileResponse = await fetch('/api/integrations/github/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to import profile data');
      }

      const profileData = await profileResponse.json();
      setProfile(profileData);
      setImportProgress(40);

      // Import repositories
      const reposResponse = await fetch('/api/integrations/github/repositories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (reposResponse.ok) {
        const reposData = await reposResponse.json();
        setRepositories(reposData);
        onRepositoriesImported?.(reposData);
      }
      setImportProgress(60);

      // Import stats and analyze skills
      const statsResponse = await fetch('/api/integrations/github/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
        
        // Extract skills from language stats
        const detectedSkills = Object.keys(statsData.languageStats);
        onSkillsDetected?.(detectedSkills);
      }
      setImportProgress(100);

      onProfileImported?.(profileData);
      
    } catch (error) {
      setError('Failed to import GitHub data. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const disconnectGitHub = async () => {
    try {
      await fetch('/api/integrations/github/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      setIsConnected(false);
      setProfile(null);
      setRepositories([]);
      setStats(null);
    } catch (error) {
      setError('Failed to disconnect GitHub. Please try again.');
    }
  };

  const getTopLanguages = () => {
    if (!stats?.languageStats) return [];
    return Object.entries(stats.languageStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const getTopRepositories = () => {
    return repositories
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 3);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          GitHub Integration
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to showcase your coding projects, analyze your programming skills, and track your development activity.
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
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Github className="w-8 h-8 text-gray-700" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Connect Your GitHub Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                Import your repositories and coding activity to showcase your technical skills and projects.
              </p>
              <Button 
                onClick={connectToGitHub}
                disabled={isConnecting}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4 mr-2" />
                    Connect GitHub
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
                  GitHub Connected
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectGitHub}
                className="text-red-600 hover:text-red-700"
              >
                Disconnect
              </Button>
            </div>

            {/* Profile Preview */}
            {profile && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Profile Overview</h4>
                
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <img 
                    src={profile.avatar_url} 
                    alt="GitHub Avatar"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {profile.name || profile.login}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">@{profile.login}</p>
                    {profile.bio && (
                      <p className="text-sm text-gray-700 mb-2">{profile.bio}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {profile.company && (
                        <span>{profile.company}</span>
                      )}
                      {profile.location && (
                        <span>{profile.location}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(profile.created_at).getFullYear()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* GitHub Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <Code className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-lg font-semibold">{profile.public_repos}</div>
                    <div className="text-xs text-gray-600">Repositories</div>
                  </div>
                  
                  <div className="text-center p-3 border rounded-lg">
                    <Star className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                    <div className="text-lg font-semibold">{stats?.totalStars || 0}</div>
                    <div className="text-xs text-gray-600">Total Stars</div>
                  </div>
                  
                  <div className="text-center p-3 border rounded-lg">
                    <GitFork className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="text-lg font-semibold">{stats?.totalForks || 0}</div>
                    <div className="text-xs text-gray-600">Total Forks</div>
                  </div>
                  
                  <div className="text-center p-3 border rounded-lg">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-lg font-semibold">{profile.followers}</div>
                    <div className="text-xs text-gray-600">Followers</div>
                  </div>
                </div>

                {/* Top Languages */}
                {stats && getTopLanguages().length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Top Programming Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      {getTopLanguages().map(([language, percentage]) => (
                        <Badge key={language} variant="secondary" className="text-xs">
                          {language} ({percentage.toFixed(1)}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Repositories */}
                {getTopRepositories().length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Top Repositories</h4>
                    <div className="space-y-2">
                      {getTopRepositories().map(repo => (
                        <div key={repo.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{repo.name}</span>
                              {repo.language && (
                                <Badge variant="outline" className="text-xs">
                                  {repo.language}
                                </Badge>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-xs text-gray-600 mt-1">{repo.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {repo.stargazers_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <GitFork className="w-3 h-3" />
                                {repo.forks_count}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(repo.html_url, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Import Actions */}
            <div className="space-y-3">
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importing GitHub data...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={importGitHubData}
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
                  onClick={() => window.open(`https://github.com/${profile?.login}`, '_blank')}
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
                  Repository information and project showcase
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Programming languages and technology stack
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Contribution activity and coding frequency
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Open source contributions and collaboration
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
