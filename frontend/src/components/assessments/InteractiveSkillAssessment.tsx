/**
 * SkillForge AI - Interactive Skill Assessment Interface
 * Comprehensive assessment system with multiple question types and adaptive difficulty
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Checkbox,
  TextField,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Lightbulb as HintIcon,
  Code as CodeIcon,
  Quiz as QuizIcon,
  Psychology as BrainIcon,
  TrendingUp as ProgressIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Refresh as RetryIcon,
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Editor from '@monaco-editor/react';

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface Question {
  id: string;
  type: 'multiple_choice' | 'coding' | 'matching' | 'drag_drop' | 'short_answer';
  skill: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  question: string;
  description?: string;
  timeLimit?: number; // in seconds
  points: number;
  options?: string[];
  correctAnswer?: string | string[];
  codeTemplate?: string;
  language?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
  hints?: string[];
  explanation?: string;
  matchingPairs?: Array<{ left: string; right: string }>;
}

interface AssessmentResult {
  questionId: string;
  userAnswer: any;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
  score: number;
}

interface AssessmentSession {
  id: string;
  skill: string;
  questions: Question[];
  currentQuestionIndex: number;
  results: AssessmentResult[];
  startTime: number;
  timeRemaining?: number;
  adaptiveDifficulty: boolean;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
}

const InteractiveSkillAssessment: React.FC<{
  skillId: string;
  onComplete: (results: any) => void;
  onCancel: () => void;
}> = ({ skillId, onComplete, onCancel }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State management
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [codeOutput, setCodeOutput] = useState<string>('');
  const [isRunningCode, setIsRunningCode] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTime = useRef<number>(Date.now());

  // Initialize assessment
  useEffect(() => {
    initializeAssessment();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [skillId]);

  const initializeAssessment = async () => {
    try {
      const response = await fetch(`/api/v1/assessments/start/${skillId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adaptiveDifficulty: true,
          questionCount: 10,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start assessment');
      }

      const assessmentData = await response.json();
      setSession({
        ...assessmentData,
        currentQuestionIndex: 0,
        results: [],
        startTime: Date.now(),
        status: 'in_progress',
      });

      questionStartTime.current = Date.now();
      startTimer(assessmentData.questions[0]);

    } catch (error) {
      console.error('Assessment initialization error:', error);
      showToast('Failed to start assessment', 'error');
      onCancel();
    }
  };

  const startTimer = (question: Question) => {
    if (question.timeLimit) {
      setTimeRemaining(question.timeLimit);
      
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev && prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 1000);
    }
  };

  const handleTimeUp = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    showToast('Time is up for this question!', 'warning');
    submitAnswer(true); // Auto-submit with timeout flag
  };

  const submitAnswer = async (isTimeout = false) => {
    if (!session || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const currentQuestion = session.questions[session.currentQuestionIndex];
      const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);

      // Evaluate answer
      const evaluation = await evaluateAnswer(currentQuestion, currentAnswer);
      
      const result: AssessmentResult = {
        questionId: currentQuestion.id,
        userAnswer: currentAnswer,
        isCorrect: evaluation.isCorrect,
        timeSpent: isTimeout ? currentQuestion.timeLimit || timeSpent : timeSpent,
        hintsUsed,
        score: evaluation.score,
      };

      // Update session with result
      const updatedResults = [...session.results, result];
      const nextQuestionIndex = session.currentQuestionIndex + 1;

      setSession(prev => prev ? {
        ...prev,
        results: updatedResults,
        currentQuestionIndex: nextQuestionIndex,
      } : null);

      // Show explanation if available
      if (currentQuestion.explanation) {
        setShowExplanation(true);
        setTimeout(() => {
          setShowExplanation(false);
          proceedToNext(nextQuestionIndex, updatedResults);
        }, 3000);
      } else {
        proceedToNext(nextQuestionIndex, updatedResults);
      }

    } catch (error) {
      console.error('Answer submission error:', error);
      showToast('Failed to submit answer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const proceedToNext = (nextIndex: number, results: AssessmentResult[]) => {
    if (!session) return;

    if (nextIndex >= session.questions.length) {
      // Assessment completed
      completeAssessment(results);
    } else {
      // Move to next question
      const nextQuestion = session.questions[nextIndex];
      
      // Reset question state
      setCurrentAnswer(null);
      setHintsUsed(0);
      setShowHint(false);
      setCodeOutput('');
      questionStartTime.current = Date.now();
      
      // Start timer for next question
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      startTimer(nextQuestion);
    }
  };

  const evaluateAnswer = async (question: Question, answer: any) => {
    try {
      const response = await fetch('/api/v1/assessments/evaluate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: question.id,
          answer,
          questionType: question.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate answer');
      }

      return await response.json();
    } catch (error) {
      console.error('Answer evaluation error:', error);
      // Fallback evaluation
      return { isCorrect: false, score: 0 };
    }
  };

  const completeAssessment = async (results: AssessmentResult[]) => {
    try {
      const response = await fetch(`/api/v1/assessments/complete/${session?.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results,
          totalTime: Date.now() - (session?.startTime || 0),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete assessment');
      }

      const completionData = await response.json();
      onComplete(completionData);

    } catch (error) {
      console.error('Assessment completion error:', error);
      showToast('Failed to complete assessment', 'error');
    }
  };

  const runCode = async () => {
    if (!session || !currentAnswer) return;

    setIsRunningCode(true);
    
    try {
      const currentQuestion = session.questions[session.currentQuestionIndex];
      
      const response = await fetch('/api/v1/assessments/run-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: currentAnswer,
          language: currentQuestion.language,
          testCases: currentQuestion.testCases,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run code');
      }

      const result = await response.json();
      setCodeOutput(result.output);

    } catch (error) {
      console.error('Code execution error:', error);
      setCodeOutput('Error: Failed to execute code');
    } finally {
      setIsRunningCode(false);
    }
  };

  const useHint = () => {
    if (!session) return;
    
    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (currentQuestion.hints && hintsUsed < currentQuestion.hints.length) {
      setHintsUsed(prev => prev + 1);
      setShowHint(true);
    }
  };

  if (!session) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentQuestion = session.questions[session.currentQuestionIndex];
  const progress = ((session.currentQuestionIndex + 1) / session.questions.length) * 100;

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      {/* Assessment Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <BrainIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              {session.skill} Assessment
            </Typography>
            
            {timeRemaining !== null && (
              <Chip
                icon={<TimerIcon />}
                label={`${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`}
                color={timeRemaining < 30 ? 'error' : 'primary'}
                variant="outlined"
              />
            )}
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ mb: 1, height: 8, borderRadius: 4 }}
          />
          
          <Typography variant="body2" color="text.secondary">
            Question {session.currentQuestionIndex + 1} of {session.questions.length}
          </Typography>
        </CardContent>
      </Card>

      {/* Question Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={session.currentQuestionIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip
                  label={currentQuestion.difficulty}
                  color={
                    currentQuestion.difficulty === 'beginner' ? 'success' :
                    currentQuestion.difficulty === 'intermediate' ? 'warning' :
                    currentQuestion.difficulty === 'advanced' ? 'error' : 'secondary'
                  }
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={`${currentQuestion.points} points`}
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Typography variant="h6" gutterBottom>
                {currentQuestion.question}
              </Typography>

              {currentQuestion.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {currentQuestion.description}
                </Typography>
              )}

              {/* Question Type Specific Rendering */}
              {renderQuestionContent(currentQuestion)}

              {/* Hint Section */}
              {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Button
                    startIcon={<HintIcon />}
                    onClick={useHint}
                    disabled={hintsUsed >= currentQuestion.hints.length}
                    variant="outlined"
                    size="small"
                  >
                    Use Hint ({hintsUsed}/{currentQuestion.hints.length})
                  </Button>
                  
                  {showHint && hintsUsed > 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {currentQuestion.hints[hintsUsed - 1]}
                    </Alert>
                  )}
                </Box>
              )}

              {/* Code Output */}
              {currentQuestion.type === 'coding' && codeOutput && (
                <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Output:
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                    {codeOutput}
                  </Typography>
                </Paper>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          color="error"
          startIcon={<CancelIcon />}
        >
          Cancel Assessment
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {currentQuestion.type === 'coding' && (
            <Button
              onClick={runCode}
              disabled={!currentAnswer || isRunningCode}
              variant="outlined"
              startIcon={isRunningCode ? <CircularProgress size={20} /> : <CodeIcon />}
            >
              Run Code
            </Button>
          )}
          
          <Button
            onClick={() => submitAnswer()}
            disabled={!currentAnswer || isSubmitting}
            variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            Submit Answer
          </Button>
        </Box>
      </Box>

      {/* Explanation Dialog */}
      <Dialog open={showExplanation} maxWidth="md" fullWidth>
        <DialogTitle>Explanation</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {currentQuestion.explanation}
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );

  function renderQuestionContent(question: Question) {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={currentAnswer || ''}
              onChange={(e) => setCurrentAnswer(e.target.value)}
            >
              {question.options?.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'coding':
        return (
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Editor
              height="300px"
              language={question.language || 'javascript'}
              value={currentAnswer || question.codeTemplate || ''}
              onChange={(value) => setCurrentAnswer(value)}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </Box>
        );

      case 'short_answer':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            value={currentAnswer || ''}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Enter your answer here..."
            variant="outlined"
          />
        );

      default:
        return <Typography>Question type not implemented</Typography>;
    }
  }
};

export default InteractiveSkillAssessment;
