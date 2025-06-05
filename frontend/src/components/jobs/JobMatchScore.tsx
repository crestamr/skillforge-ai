import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  TrendingUp,
  Target,
  Award
} from 'lucide-react';

export interface MatchCriteria {
  name: string;
  weight: number;
  userScore: number;
  requiredScore: number;
  status: 'match' | 'partial' | 'missing';
  description?: string;
}

export interface JobMatchData {
  overallScore: number;
  criteria: MatchCriteria[];
  strengths: string[];
  gaps: string[];
  recommendations: string[];
}

interface JobMatchScoreProps {
  matchData: JobMatchData;
  className?: string;
}

export const JobMatchScore: React.FC<JobMatchScoreProps> = ({
  matchData,
  className = ''
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getStatusIcon = (status: MatchCriteria['status']) => {
    switch (status) {
      case 'match':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'missing':
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status: MatchCriteria['status']) => {
    switch (status) {
      case 'match':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Strong Match</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial Match</Badge>;
      case 'missing':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Gap</Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Job Match Analysis
            </CardTitle>
            <CardDescription>
              How well you match this position based on skills, experience, and requirements
            </CardDescription>
          </div>
          <div className={`text-right ${getScoreColor(matchData.overallScore)}`}>
            <div className="text-3xl font-bold">{matchData.overallScore}%</div>
            <div className="text-sm font-medium">Overall Match</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Score Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Match Score</span>
            <span className={getScoreColor(matchData.overallScore)}>
              {matchData.overallScore}%
            </span>
          </div>
          <Progress 
            value={matchData.overallScore} 
            className="h-2"
          />
        </div>

        {/* Criteria Breakdown */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Detailed Breakdown
          </h4>
          
          <div className="space-y-3">
            {matchData.criteria.map((criterion, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(criterion.status)}
                    <span className="font-medium text-sm">{criterion.name}</span>
                    <span className="text-xs text-gray-500">
                      (Weight: {criterion.weight}%)
                    </span>
                  </div>
                  {getStatusBadge(criterion.status)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Your Level: {criterion.userScore}/10</span>
                    <span>Required: {criterion.requiredScore}/10</span>
                  </div>
                  <Progress 
                    value={(criterion.userScore / 10) * 100} 
                    className="h-1"
                  />
                </div>
                
                {criterion.description && (
                  <p className="text-xs text-gray-600 mt-2">
                    {criterion.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Strengths */}
        {matchData.strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Your Strengths
            </h4>
            <div className="flex flex-wrap gap-2">
              {matchData.strengths.map((strength, index) => (
                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Skill Gaps */}
        {matchData.gaps.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-700 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Areas to Improve
            </h4>
            <div className="flex flex-wrap gap-2">
              {matchData.gaps.map((gap, index) => (
                <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                  {gap}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {matchData.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-blue-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {matchData.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
