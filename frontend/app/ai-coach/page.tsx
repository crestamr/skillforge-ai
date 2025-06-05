/**
 * SkillForge AI - AI Coach Page
 * Comprehensive AI career coaching interface
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { useAppStore } from '../../src/store/useAppStore';
import { aiApi } from '../../src/lib/api';
import ProtectedRoute from '../../src/components/auth/ProtectedRoute';
import DashboardLayout from '../../src/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { Badge } from '../../src/components/ui/badge';
import { Alert, AlertDescription } from '../../src/components/ui/alert';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Lightbulb,
  Target,
  BookOpen,
  Briefcase,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  type?: 'text' | 'recommendation' | 'action';
}

interface CoachingSession {
  id: string;
  title: string;
  topic: string;
  startedAt: string;
  messageCount: number;
}

const COACHING_TOPICS = [
  {
    id: 'career_guidance',
    name: 'Career Guidance',
    description: 'Get advice on career paths, transitions, and growth opportunities',
    icon: <Target className="h-5 w-5" />,
    color: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 'skill_development',
    name: 'Skill Development',
    description: 'Learn about skills to develop and learning strategies',
    icon: <BookOpen className="h-5 w-5" />,
    color: 'bg-green-50 text-green-700 border-green-200'
  },
  {
    id: 'job_search',
    name: 'Job Search Strategy',
    description: 'Optimize your job search and interview preparation',
    icon: <Briefcase className="h-5 w-5" />,
    color: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'salary_negotiation',
    name: 'Salary Negotiation',
    description: 'Learn effective salary negotiation techniques',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  }
];

export default function AICoachPage() {
  const { user } = useAuth();
  const { isLoading, setLoading } = useAppStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('career_guidance');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load previous sessions
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      // Mock data for development
      setSessions([
        {
          id: '1',
          title: 'Career Transition Discussion',
          topic: 'career_guidance',
          startedAt: '2024-01-15T10:00:00Z',
          messageCount: 12
        },
        {
          id: '2',
          title: 'JavaScript Learning Path',
          topic: 'skill_development',
          startedAt: '2024-01-14T15:30:00Z',
          messageCount: 8
        }
      ]);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const startNewConversation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await aiApi.chatWithAI(
        `Hello! I'd like to discuss ${COACHING_TOPICS.find(t => t.id === selectedTopic)?.name.toLowerCase()}.`,
        undefined
      ).catch(() => {
        // Fallback response for development
        return {
          response: `Hello ${user?.firstName}! I'm your AI career coach. I'm here to help you with ${COACHING_TOPICS.find(t => t.id === selectedTopic)?.name.toLowerCase()}. What specific questions or challenges would you like to discuss today?`,
          conversationId: `conv_${Date.now()}`,
          suggestions: [
            "What skills should I focus on developing?",
            "How can I advance in my current role?",
            "What are the latest trends in my field?",
            "Help me create a career development plan"
          ]
        };
      }) as {
        response: string;
        conversationId: string;
        suggestions: string[];
      };

      const welcomeMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions,
        type: 'text'
      };

      setMessages([welcomeMessage]);
      setConversationId(response.conversationId);
      
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      setError(error.message || 'Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    setError(null);

    try {
      const response = await aiApi.chatWithAI(
        inputMessage.trim(),
        conversationId || undefined
      ).catch(() => {
        // Fallback response for development
        return {
          response: `That's a great question about ${inputMessage.trim()}. Based on your profile and current market trends, I'd recommend focusing on developing your technical skills while also building your soft skills. Here are some specific suggestions tailored to your experience level...`,
          suggestions: [
            "Tell me more about this approach",
            "What specific resources do you recommend?",
            "How long would this take to implement?",
            "What are the potential challenges?"
          ]
        };
      }) as {
        response: string;
        suggestions: string[];
      };

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions,
        type: 'text'
      };

      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError(error.message || 'Failed to send message');
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setConversationId(null);
    setInputMessage('');
    setError(null);
  };

  return (
    <ProtectedRoute requireAuth={true} requireOnboarding={true}>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <Bot className="h-8 w-8 mr-3 text-blue-600" />
              AI Career Coach
            </h1>
            <p className="text-gray-600">
              Get personalized career guidance powered by advanced AI
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Topic Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coaching Topics</CardTitle>
                  <CardDescription>Choose what you'd like to discuss</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {COACHING_TOPICS.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTopic === topic.id
                          ? topic.color
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {topic.icon}
                        <span className="font-medium text-sm">{topic.name}</span>
                      </div>
                      <p className="text-xs text-gray-600">{topic.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Previous Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="font-medium text-sm mb-1">{session.title}</div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{session.messageCount} messages</span>
                        <span>{new Date(session.startedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No previous sessions
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Chat Area */}
            <div className="lg:col-span-3">
              <Card className="h-[700px] flex flex-col">
                {/* Chat Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Bot className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">AI Career Coach</CardTitle>
                        <CardDescription>
                          {COACHING_TOPICS.find(t => t.id === selectedTopic)?.name}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {messages.length > 0 && (
                        <Button variant="outline" size="sm" onClick={resetConversation}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          New Chat
                        </Button>
                      )}
                      {messages.length === 0 && (
                        <Button onClick={startNewConversation} disabled={isLoading}>
                          <Plus className="h-4 w-4 mr-2" />
                          {isLoading ? 'Starting...' : 'Start Conversation'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Error Alert */}
                {error && (
                  <div className="p-4 border-b">
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Messages Area */}
                <CardContent className="flex-1 overflow-y-auto p-6">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Ready to start coaching?
                        </h3>
                        <p className="text-gray-500 mb-6">
                          Click "Start Conversation" to begin your AI-powered career coaching session
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                          {COACHING_TOPICS.slice(0, 4).map((topic) => (
                            <div key={topic.id} className="p-3 border rounded-lg text-center">
                              <div className="mb-2">{topic.icon}</div>
                              <div className="text-sm font-medium">{topic.name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex space-x-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              message.role === 'user' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {message.role === 'user' ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <Bot className="h-4 w-4" />
                              )}
                            </div>
                            
                            {/* Message Content */}
                            <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                              <div className={`inline-block p-4 rounded-lg ${
                                message.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                              
                              <div className={`text-xs text-gray-500 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </div>
                              
                              {/* Suggestions */}
                              {message.suggestions && message.suggestions.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs text-gray-500 flex items-center">
                                    <Lightbulb className="h-3 w-3 mr-1" />
                                    Suggested responses:
                                  </p>
                                  <div className="space-y-1">
                                    {message.suggestions.map((suggestion, index) => (
                                      <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="block w-full text-left p-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                                      >
                                        {suggestion}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Typing Indicator */}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="flex space-x-3 max-w-3xl">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Bot className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </CardContent>

                {/* Input Area */}
                {messages.length > 0 && (
                  <div className="border-t p-4">
                    <div className="flex space-x-4">
                      <Input
                        ref={inputRef}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        disabled={isTyping}
                        className="flex-1"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isTyping}
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center p-6">
              <Sparkles className="h-8 w-8 text-blue-600 mx-auto mb-4" />
              <h3 className="font-medium mb-2">AI-Powered Insights</h3>
              <p className="text-sm text-gray-600">
                Get personalized career advice based on your skills, experience, and goals
              </p>
            </Card>
            
            <Card className="text-center p-6">
              <Target className="h-8 w-8 text-green-600 mx-auto mb-4" />
              <h3 className="font-medium mb-2">Goal-Oriented Guidance</h3>
              <p className="text-sm text-gray-600">
                Receive actionable recommendations to achieve your career objectives
              </p>
            </Card>
            
            <Card className="text-center p-6">
              <Clock className="h-8 w-8 text-purple-600 mx-auto mb-4" />
              <h3 className="font-medium mb-2">24/7 Availability</h3>
              <p className="text-sm text-gray-600">
                Access career coaching anytime, anywhere with instant responses
              </p>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
