/**
 * SkillForge AI - Comprehensive User Onboarding Flow
 * Multi-step registration and profile setup with resume parsing and skill assessment
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Chip,
  Avatar,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  Slider,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  LinkedIn as LinkedInIcon,
  GitHub as GitHubIcon,
  CheckCircle as CheckIcon,
  School as EducationIcon,
  Work as WorkIcon,
  Star as StarIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FileUpload } from '../common/FileUpload';
import { SkillSelector } from '../skills/SkillSelector';
import { CareerGoalsSelector } from '../career/CareerGoalsSelector';
import { LinkedInIntegration } from '../integrations/LinkedInIntegration';
import { GitHubIntegration } from '../integrations/GitHubIntegration';

// Validation schemas for each step
const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  location: z.string().min(2, 'Location is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

const professionalInfoSchema = z.object({
  currentRole: z.string().min(2, 'Current role is required'),
  currentCompany: z.string().optional(),
  yearsExperience: z.number().min(0).max(50),
  industry: z.string().min(1, 'Industry is required'),
  educationLevel: z.string().min(1, 'Education level is required'),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
});

const careerGoalsSchema = z.object({
  targetRole: z.string().min(2, 'Target role is required'),
  targetIndustry: z.string().optional(),
  salaryExpectation: z.number().optional(),
  timeframe: z.string().min(1, 'Timeframe is required'),
  learningStyle: z.array(z.string()).min(1, 'Select at least one learning style'),
  availability: z.number().min(1).max(40),
});

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  validation?: z.ZodSchema;
  optional?: boolean;
}

interface OnboardingData {
  personalInfo: z.infer<typeof personalInfoSchema>;
  professionalInfo: z.infer<typeof professionalInfoSchema>;
  resume?: File;
  skills: Array<{ id: string; name: string; level: number; verified: boolean }>;
  careerGoals: z.infer<typeof careerGoalsSchema>;
  preferences: {
    notifications: boolean;
    publicProfile: boolean;
    dataSharing: boolean;
  };
}

const ComprehensiveOnboardingFlow: React.FC = () => {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [resumeParsingResults, setResumeParsingResults] = useState<any>(null);
  const [skillSuggestions, setSkillSuggestions] = useState<any[]>([]);

  // Form management
  const methods = useForm({
    mode: 'onChange',
    defaultValues: onboardingData,
  });

  const { handleSubmit, formState: { isValid, errors }, watch, setValue } = methods;

  // Onboarding steps configuration
  const steps: OnboardingStep[] = [
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Tell us about yourself',
      component: PersonalInfoStep,
      validation: personalInfoSchema,
    },
    {
      id: 'professional',
      title: 'Professional Background',
      description: 'Your current professional status',
      component: ProfessionalInfoStep,
      validation: professionalInfoSchema,
    },
    {
      id: 'resume',
      title: 'Resume Upload',
      description: 'Upload your resume for AI analysis',
      component: ResumeUploadStep,
      optional: true,
    },
    {
      id: 'skills',
      title: 'Skills Assessment',
      description: 'Select and rate your skills',
      component: SkillsStep,
    },
    {
      id: 'goals',
      title: 'Career Goals',
      description: 'Define your career objectives',
      component: CareerGoalsStep,
      validation: careerGoalsSchema,
    },
    {
      id: 'integrations',
      title: 'Connect Accounts',
      description: 'Link your professional profiles',
      component: IntegrationsStep,
      optional: true,
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Customize your experience',
      component: PreferencesStep,
    },
    {
      id: 'welcome',
      title: 'Welcome!',
      description: 'Your profile is ready',
      component: WelcomeStep,
    },
  ];

  // Progress calculation
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Handle step navigation
  const handleNext = useCallback(async () => {
    const currentStepData = steps[currentStep];
    
    if (currentStepData.validation) {
      try {
        const formData = methods.getValues();
        await currentStepData.validation.parseAsync(formData);
      } catch (error) {
        showToast('Please fix the errors before continuing', 'error');
        return;
      }
    }

    // Save current step data
    const stepData = methods.getValues();
    setOnboardingData(prev => ({ ...prev, ...stepData }));
    
    // Mark step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    // Move to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  }, [currentStep, methods, showToast]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkipStep = useCallback(() => {
    if (steps[currentStep].optional) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps]);

  // Complete onboarding process
  const completeOnboarding = async () => {
    setIsLoading(true);
    
    try {
      // Submit all onboarding data to backend
      const response = await fetch('/api/v1/users/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify(onboardingData),
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      const result = await response.json();
      
      // Update user profile
      await updateProfile(result.profile);
      
      // Show success message
      showToast('Welcome to SkillForge AI! Your profile is ready.', 'success');
      
      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Onboarding completion error:', error);
      showToast('Failed to complete onboarding. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Resume parsing handler
  const handleResumeUpload = async (file: File) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await fetch('/api/v1/ai/parse-resume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse resume');
      }

      const results = await response.json();
      setResumeParsingResults(results);
      
      // Auto-fill form fields from resume
      if (results.personalInfo) {
        Object.entries(results.personalInfo).forEach(([key, value]) => {
          setValue(key, value);
        });
      }
      
      // Set skill suggestions
      if (results.skills) {
        setSkillSuggestions(results.skills);
      }
      
      showToast('Resume parsed successfully!', 'success');
      
    } catch (error) {
      console.error('Resume parsing error:', error);
      showToast('Failed to parse resume. You can continue manually.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save progress
  useEffect(() => {
    const interval = setInterval(() => {
      const currentData = methods.getValues();
      localStorage.setItem('onboarding_progress', JSON.stringify({
        step: currentStep,
        data: { ...onboardingData, ...currentData },
        timestamp: Date.now(),
      }));
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [currentStep, onboardingData, methods]);

  // Load saved progress on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('onboarding_progress');
    if (savedProgress) {
      try {
        const { step, data, timestamp } = JSON.parse(savedProgress);
        
        // Only restore if saved within last 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setCurrentStep(step);
          setOnboardingData(data);
          methods.reset(data);
          
          showToast('Restored your previous progress', 'info');
        }
      } catch (error) {
        console.error('Failed to restore progress:', error);
      }
    }
  }, [methods, showToast]);

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <FormProvider {...methods}>
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        {/* Progress Header */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" sx={{ flexGrow: 1 }}>
                Welcome to SkillForge AI
              </Typography>
              <Chip 
                label={`${currentStep + 1} of ${steps.length}`}
                color="primary"
                variant="outlined"
              />
            </Box>
            
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ mb: 2, height: 8, borderRadius: 4 }}
            />
            
            <Typography variant="body2" color="text.secondary">
              {steps[currentStep].description}
            </Typography>
          </CardContent>
        </Card>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {steps[currentStep].title}
                </Typography>
                
                <CurrentStepComponent
                  onNext={handleNext}
                  onBack={handleBack}
                  onSkip={handleSkipStep}
                  isLoading={isLoading}
                  resumeParsingResults={resumeParsingResults}
                  skillSuggestions={skillSuggestions}
                  onResumeUpload={handleResumeUpload}
                  canSkip={steps[currentStep].optional}
                />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            onClick={handleBack}
            disabled={currentStep === 0 || isLoading}
            variant="outlined"
          >
            Back
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {steps[currentStep].optional && (
              <Button
                onClick={handleSkipStep}
                disabled={isLoading}
                variant="text"
              >
                Skip
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              disabled={isLoading || (!isValid && !steps[currentStep].optional)}
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </Box>
        </Box>

        {/* Step Indicator */}
        <Box sx={{ mt: 4 }}>
          <Stepper activeStep={currentStep} orientation="horizontal" alternativeLabel>
            {steps.map((step, index) => (
              <Step key={step.id} completed={completedSteps.has(index)}>
                <StepLabel
                  optional={step.optional ? (
                    <Typography variant="caption">Optional</Typography>
                  ) : null}
                >
                  {step.title}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Box>
    </FormProvider>
  );
};

// Individual step components implementation
const PersonalInfoStep: React.FC<any> = ({ onNext }) => {
  const { register, formState: { errors } } = useForm();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...register('firstName', { required: 'First name is required' })}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...register('lastName', { required: 'Last name is required' })}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          {...register('location', { required: 'Location is required' })}
          placeholder="San Francisco, CA"
        />
        {errors.location && (
          <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Select {...register('timezone', { required: 'Timezone is required' })}>
          <MenuItem value="America/New_York">Eastern Time</MenuItem>
          <MenuItem value="America/Chicago">Central Time</MenuItem>
          <MenuItem value="America/Denver">Mountain Time</MenuItem>
          <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
        </Select>
        {errors.timezone && (
          <p className="text-sm text-red-500 mt-1">{errors.timezone.message}</p>
        )}
      </div>
    </div>
  );
};

const ProfessionalInfoStep: React.FC<any> = ({ onNext }) => {
  const { register, formState: { errors } } = useForm();

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="currentRole">Current Role</Label>
        <Input
          id="currentRole"
          {...register('currentRole', { required: 'Current role is required' })}
          placeholder="Software Engineer"
        />
        {errors.currentRole && (
          <p className="text-sm text-red-500 mt-1">{errors.currentRole.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="currentCompany">Current Company (Optional)</Label>
        <Input
          id="currentCompany"
          {...register('currentCompany')}
          placeholder="TechCorp Inc."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="yearsExperience">Years of Experience</Label>
          <Input
            id="yearsExperience"
            type="number"
            {...register('yearsExperience', {
              required: 'Experience is required',
              min: { value: 0, message: 'Experience cannot be negative' }
            })}
            placeholder="5"
          />
          {errors.yearsExperience && (
            <p className="text-sm text-red-500 mt-1">{errors.yearsExperience.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="industry">Industry</Label>
          <Select {...register('industry', { required: 'Industry is required' })}>
            <MenuItem value="technology">Technology</MenuItem>
            <MenuItem value="finance">Finance</MenuItem>
            <MenuItem value="healthcare">Healthcare</MenuItem>
            <MenuItem value="education">Education</MenuItem>
            <MenuItem value="retail">Retail</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </Select>
          {errors.industry && (
            <p className="text-sm text-red-500 mt-1">{errors.industry.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="educationLevel">Education Level</Label>
        <Select {...register('educationLevel', { required: 'Education level is required' })}>
          <MenuItem value="high_school">High School</MenuItem>
          <MenuItem value="associate">Associate Degree</MenuItem>
          <MenuItem value="bachelor">Bachelor's Degree</MenuItem>
          <MenuItem value="master">Master's Degree</MenuItem>
          <MenuItem value="phd">PhD</MenuItem>
          <MenuItem value="bootcamp">Bootcamp</MenuItem>
          <MenuItem value="self_taught">Self-Taught</MenuItem>
        </Select>
        {errors.educationLevel && (
          <p className="text-sm text-red-500 mt-1">{errors.educationLevel.message}</p>
        )}
      </div>
    </div>
  );
};

const ResumeUploadStep: React.FC<any> = ({ onResumeUpload, resumeParsingResults, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.type.includes('document')) {
      alert('Please upload a PDF or Word document');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    await onResumeUpload(file);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Typography variant="h6" gutterBottom>
          Upload Your Resume
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Our AI will analyze your resume to extract skills and experience
        </Typography>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
        />

        <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />

        <Typography variant="h6" gutterBottom>
          Drop your resume here, or click to browse
        </Typography>

        <Typography variant="body2" color="text.secondary" className="mb-4">
          Supports PDF, DOC, and DOCX files up to 10MB
        </Typography>

        <Button
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Choose File'}
        </Button>
      </div>

      {resumeParsingResults && (
        <Alert severity="success">
          <Typography variant="subtitle2">Resume parsed successfully!</Typography>
          <Typography variant="body2">
            Found {resumeParsingResults.skills?.length || 0} skills and extracted profile information.
          </Typography>
        </Alert>
      )}
    </div>
  );
};

const SkillsStep: React.FC<any> = ({ skillSuggestions }) => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillLevels, setSkillLevels] = useState<Record<string, number>>({});
  const [customSkill, setCustomSkill] = useState('');

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );

    if (!skillLevels[skill]) {
      setSkillLevels(prev => ({ ...prev, [skill]: 50 }));
    }
  };

  const handleLevelChange = (skill: string, level: number) => {
    setSkillLevels(prev => ({ ...prev, [skill]: level }));
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      handleSkillToggle(customSkill.trim());
      setCustomSkill('');
    }
  };

  const suggestedSkills = skillSuggestions || [
    'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git',
    'HTML/CSS', 'TypeScript', 'AWS', 'Docker', 'MongoDB', 'Express.js'
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Typography variant="h6" gutterBottom>
          Select Your Skills
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose your skills and rate your proficiency level
        </Typography>
      </div>

      {/* Suggested Skills */}
      <div>
        <Typography variant="subtitle1" gutterBottom>
          Suggested Skills
        </Typography>
        <div className="flex flex-wrap gap-2">
          {suggestedSkills.map((skill) => (
            <Chip
              key={skill}
              label={skill}
              onClick={() => handleSkillToggle(skill)}
              color={selectedSkills.includes(skill) ? 'primary' : 'default'}
              variant={selectedSkills.includes(skill) ? 'filled' : 'outlined'}
              className="cursor-pointer"
            />
          ))}
        </div>
      </div>

      {/* Add Custom Skill */}
      <div>
        <Typography variant="subtitle1" gutterBottom>
          Add Custom Skill
        </Typography>
        <div className="flex gap-2">
          <TextField
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            placeholder="Enter skill name"
            size="small"
            onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
          />
          <Button onClick={addCustomSkill} variant="outlined" size="small">
            Add
          </Button>
        </div>
      </div>

      {/* Selected Skills with Levels */}
      {selectedSkills.length > 0 && (
        <div>
          <Typography variant="subtitle1" gutterBottom>
            Rate Your Proficiency
          </Typography>
          <div className="space-y-4">
            {selectedSkills.map((skill) => (
              <div key={skill} className="space-y-2">
                <div className="flex justify-between items-center">
                  <Typography variant="body2">{skill}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {skillLevels[skill] || 50}%
                  </Typography>
                </div>
                <Slider
                  value={skillLevels[skill] || 50}
                  onChange={(_, value) => handleLevelChange(skill, value as number)}
                  min={0}
                  max={100}
                  step={5}
                  marks={[
                    { value: 0, label: 'Beginner' },
                    { value: 50, label: 'Intermediate' },
                    { value: 100, label: 'Expert' }
                  ]}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CareerGoalsStep: React.FC<any> = ({ onNext }) => {
  const { register, formState: { errors }, watch } = useForm();
  const [learningStyles, setLearningStyles] = useState<string[]>([]);

  const handleLearningStyleToggle = (style: string) => {
    setLearningStyles(prev =>
      prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  const learningStyleOptions = [
    { value: 'visual', label: 'Visual Learning', icon: '👁️' },
    { value: 'hands_on', label: 'Hands-on Practice', icon: '🛠️' },
    { value: 'reading', label: 'Reading & Documentation', icon: '📚' },
    { value: 'video', label: 'Video Tutorials', icon: '🎥' },
    { value: 'interactive', label: 'Interactive Courses', icon: '💻' },
    { value: 'mentorship', label: 'Mentorship', icon: '👥' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Typography variant="h6" gutterBottom>
          Define Your Career Goals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Help us personalize your learning journey
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="targetRole">Target Role</Label>
          <Input
            id="targetRole"
            {...register('targetRole', { required: 'Target role is required' })}
            placeholder="Senior Software Engineer"
          />
          {errors.targetRole && (
            <p className="text-sm text-red-500 mt-1">{errors.targetRole.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="targetIndustry">Target Industry (Optional)</Label>
          <Input
            id="targetIndustry"
            {...register('targetIndustry')}
            placeholder="Technology"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="timeframe">Timeframe</Label>
          <Select {...register('timeframe', { required: 'Timeframe is required' })}>
            <MenuItem value="3_months">3 months</MenuItem>
            <MenuItem value="6_months">6 months</MenuItem>
            <MenuItem value="1_year">1 year</MenuItem>
            <MenuItem value="2_years">2+ years</MenuItem>
          </Select>
          {errors.timeframe && (
            <p className="text-sm text-red-500 mt-1">{errors.timeframe.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="availability">Weekly Learning Hours</Label>
          <Input
            id="availability"
            type="number"
            {...register('availability', {
              required: 'Availability is required',
              min: { value: 1, message: 'Minimum 1 hour per week' },
              max: { value: 40, message: 'Maximum 40 hours per week' }
            })}
            placeholder="10"
          />
          {errors.availability && (
            <p className="text-sm text-red-500 mt-1">{errors.availability.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label>Preferred Learning Styles</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
          {learningStyleOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => handleLearningStyleToggle(option.value)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                learningStyles.includes(option.value)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{option.icon}</div>
                <div className="text-sm font-medium">{option.label}</div>
              </div>
            </div>
          ))}
        </div>
        {learningStyles.length === 0 && (
          <p className="text-sm text-red-500 mt-1">Please select at least one learning style</p>
        )}
      </div>
    </div>
  );
};

const IntegrationsStep: React.FC<any> = ({ onNext }) => {
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);

  const integrations = [
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <LinkedInIcon className="h-6 w-6" />,
      description: 'Import your professional profile and connections',
      color: 'bg-blue-600',
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: <GitHubIcon className="h-6 w-6" />,
      description: 'Analyze your code repositories and contributions',
      color: 'bg-gray-800',
    },
  ];

  const handleConnect = async (integrationId: string) => {
    // Simulate connection process
    setConnectedAccounts(prev => [...prev, integrationId]);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Typography variant="h6" gutterBottom>
          Connect Your Accounts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect your professional accounts for a more personalized experience
        </Typography>
      </div>

      <div className="space-y-4">
        {integrations.map((integration) => (
          <Card key={integration.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${integration.color} text-white`}>
                  {integration.icon}
                </div>
                <div>
                  <Typography variant="subtitle1">{integration.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {integration.description}
                  </Typography>
                </div>
              </div>

              <Button
                variant={connectedAccounts.includes(integration.id) ? "outlined" : "contained"}
                onClick={() => handleConnect(integration.id)}
                disabled={connectedAccounts.includes(integration.id)}
                startIcon={connectedAccounts.includes(integration.id) ? <CheckIcon /> : null}
              >
                {connectedAccounts.includes(integration.id) ? 'Connected' : 'Connect'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Alert severity="info">
        <Typography variant="body2">
          These integrations are optional. You can always connect them later from your settings.
        </Typography>
      </Alert>
    </div>
  );
};

const PreferencesStep: React.FC<any> = ({ onNext }) => {
  const { register } = useForm();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Typography variant="h6" gutterBottom>
          Customize Your Experience
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Set your preferences for notifications and privacy
        </Typography>
      </div>

      <div className="space-y-4">
        <FormControlLabel
          control={<Checkbox {...register('notifications')} defaultChecked />}
          label="Email notifications for new job matches and learning recommendations"
        />

        <FormControlLabel
          control={<Checkbox {...register('publicProfile')} />}
          label="Make my profile visible to recruiters and potential employers"
        />

        <FormControlLabel
          control={<Checkbox {...register('dataSharing')} defaultChecked />}
          label="Allow anonymous usage data to improve SkillForge AI"
        />
      </div>

      <Alert severity="info">
        <Typography variant="body2">
          You can change these preferences anytime in your account settings.
        </Typography>
      </Alert>
    </div>
  );
};

const WelcomeStep: React.FC<any> = ({ onNext }) => {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
        <CheckIcon className="h-12 w-12 text-green-600" />
      </div>

      <div>
        <Typography variant="h4" gutterBottom>
          Welcome to SkillForge AI!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your profile is ready. Let's start building your future career.
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card className="p-4 text-center">
          <TrendingIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <Typography variant="subtitle2">Take Assessments</Typography>
          <Typography variant="body2" color="text.secondary">
            Validate your skills with AI-powered assessments
          </Typography>
        </Card>

        <Card className="p-4 text-center">
          <WorkIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <Typography variant="subtitle2">Find Jobs</Typography>
          <Typography variant="body2" color="text.secondary">
            Discover personalized job recommendations
          </Typography>
        </Card>

        <Card className="p-4 text-center">
          <EducationIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <Typography variant="subtitle2">Learn & Grow</Typography>
          <Typography variant="body2" color="text.secondary">
            Follow AI-curated learning paths
          </Typography>
        </Card>
      </div>
    </div>
  );
};

export default ComprehensiveOnboardingFlow;
